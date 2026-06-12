/**
 * AiBrand Extension WebSocket Gateway
 *
 * Handles real-time WebSocket connections from AiBrand Chrome Extensions.
 *
 * Protocol:
 * - Extension connects with JWT token as query param (?token=xxx)
 * - Server authenticates and registers the extension
 * - Bidirectional JSON messages (see shared/types.ts in extension-v3)
 *
 * Message Flow:
 *   Extension → REGISTER → Server → REGISTERED
 *   Extension → PING → Server → PONG
 *   Server → NEW_TASK → Extension
 *   Extension → TASK_PROGRESS → Server
 *   Extension → TASK_COMPLETE → Server
 *   Server → CONFIG_UPDATE → Extension
 *   Server → COMMAND → Extension
 */

import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, WebSocket } from 'ws';
import { ExtensionService } from './extension.service';

// ─── Types ────────────────────────────────────────────────────────────────

interface WsMessage<T = unknown> {
  type: string;
  payload: T;
  traceId?: string;
  ts: string;
}

interface RegisterPayload {
  extensionVersion: string;
  clientId: string;
  platformCapabilities: string[];
}

interface PingPayload {
  ts: number;
}

interface TaskProgressPayload {
  taskId: string;
  platform: string;
  status: string;
  progress: number;
  message?: string;
  resultUrl?: string;
}

interface TaskCompletePayload {
  taskId: string;
  results: { platform: string; success: boolean; url?: string; error?: string }[];
}

interface RegisteredExtension {
  ws: WebSocket;
  clientId: string;
  version: string;
  platforms: string[];
  connectedAt: Date;
  lastPing: Date;
  userId: string;
}

// ─── Gateway ──────────────────────────────────────────────────────────────

@WebSocketGateway({
  path: '/ws',
  // Allow all origins in development; restrict in production
  cors: { origin: '*' },
  // Use raw WebSocket (not Socket.io)
  transports: ['websocket'],
})
export class ExtensionGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ExtensionGateway.name);

  /** Connected extensions indexed by clientId */
  private extensions = new Map<string, RegisteredExtension>();

  /** Heartbeat interval reference */
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(private readonly extensionService: ExtensionService) {}

  // ─── Lifecycle ──────────────────────────────────────────────────────────

  afterInit(): void {
    this.logger.log('WebSocket Gateway initialized on /ws');

    // Start heartbeat checker
    this.heartbeatTimer = setInterval(() => {
      this.checkHeartbeats();
    }, 45_000);
  }

  onModuleDestroy(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
  }

  /**
   * Handle new WebSocket connection.
   * Authenticates via JWT token in query params.
   */
  async handleConnection(client: WebSocket, request: Request): Promise<void> {
    try {
      // Extract token from URL query params
      const url = new URL(request.url, 'http://localhost');
      const token = url.searchParams.get('token');

      if (!token) {
        this.logger.warn('Connection rejected: No token');
        this.sendError(client, 'AUTH_REQUIRED', 'No token provided');
        client.close(4001, 'Authentication required');
        return;
      }

      // Verify JWT token
      const payload = await this.extensionService.verifyToken(token);
      if (!payload) {
        this.logger.warn('Connection rejected: Invalid token');
        this.sendError(client, 'AUTH_INVALID', 'Invalid or expired token');
        client.close(4001, 'Invalid token');
        return;
      }

      // Store the auth info on the client for later use
      (client as any).userId = payload.id;
      (client as any).authToken = token;

      this.logger.log(`WebSocket authenticated for user: ${payload.id}`);

      // Don't register yet — wait for REGISTER message
    } catch (err) {
      this.logger.error('Connection error:', err);
      client.close(4000, 'Internal error');
    }
  }

  /**
   * Handle WebSocket disconnection.
   */
  handleDisconnect(client: WebSocket): void {
    // Find and remove the extension
    for (const [clientId, ext] of this.extensions.entries()) {
      if (ext.ws === client) {
        this.extensions.delete(clientId);
        this.logger.log(`Extension disconnected: ${clientId}`);
        break;
      }
    }
  }

  // ─── Message Handlers ───────────────────────────────────────────────────

  @SubscribeMessage('REGISTER')
  handleRegister(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() message: WsMessage<RegisterPayload>,
  ): void {
    const userId = (client as any).userId;
    if (!userId) {
      this.sendError(client, 'AUTH_REQUIRED', 'Not authenticated', message.traceId);
      return;
    }

    const { clientId, extensionVersion, platformCapabilities } = message.payload;

    const registered: RegisteredExtension = {
      ws: client,
      clientId,
      version: extensionVersion,
      platforms: platformCapabilities ?? [],
      connectedAt: new Date(),
      lastPing: new Date(),
      userId,
    };

    this.extensions.set(clientId, registered);
    this.logger.log(
      `Extension registered: ${clientId} v${extensionVersion} ` +
      `(platforms: ${platformCapabilities?.length ?? 0})`,
    );

    // Confirm registration
    this.send(client, {
      type: 'REGISTERED',
      payload: {
        clientId,
        serverTime: new Date().toISOString(),
      },
    });

    // Send latest platform configs
    this.extensionService.getPlatformConfigs().then((configs) => {
      if (Object.keys(configs).length > 0) {
        this.send(client, {
          type: 'CONFIG_UPDATE',
          payload: { platforms: configs },
        });
      }
    });
  }

  @SubscribeMessage('PING')
  handlePing(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() message: WsMessage<PingPayload>,
  ): void {
    // Update last ping time
    for (const ext of this.extensions.values()) {
      if (ext.ws === client) {
        ext.lastPing = new Date();
        break;
      }
    }

    this.send(client, {
      type: 'PONG',
      payload: {
        ts: message.payload.ts,
        serverTime: new Date().toISOString(),
      },
      traceId: message.traceId,
    });
  }

  @SubscribeMessage('TASK_PROGRESS')
  handleTaskProgress(
    @ConnectedSocket() _client: WebSocket,
    @MessageBody() message: WsMessage<TaskProgressPayload>,
  ): void {
    const { taskId, platform, status, progress, message: msg, resultUrl } = message.payload;
    this.logger.log(
      `Task progress: ${taskId}/${platform} — ${status} ${progress}%`,
    );

    // Forward to task service for persistence
    this.extensionService.updateTaskProgress(taskId, platform, {
      status,
      progress,
      message: msg,
      resultUrl,
    });
  }

  @SubscribeMessage('TASK_COMPLETE')
  handleTaskComplete(
    @ConnectedSocket() _client: WebSocket,
    @MessageBody() message: WsMessage<TaskCompletePayload>,
  ): void {
    const { taskId, results } = message.payload;
    const successCount = results.filter((r) => r.success).length;
    this.logger.log(
      `Task complete: ${taskId} — ${successCount}/${results.length} success`,
    );

    this.extensionService.completeTask(taskId, results);
  }

  /**
   * Quality Check Request — Extension asks backend Quality Agent to review content.
   * The Agent (质量总监) performs the review and streams results back.
   */
  @SubscribeMessage('QUALITY_CHECK_REQUEST')
  async handleQualityCheckRequest(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() message: WsMessage<{
      taskId: string;
      content: { title: string; content: string; type: string; tags?: string[] };
      platforms: string[];
      recheck?: boolean;
    }>,
  ): Promise<void> {
    const userId = (client as any).userId;
    if (!userId) {
      this.sendError(client, 'AUTH_REQUIRED', 'Not authenticated', message.traceId);
      return;
    }

    const { taskId, content, platforms, recheck } = message.payload;
    this.logger.log(
      `Quality check requested: ${taskId} (recheck=${recheck ?? false}) for ${platforms.length} platforms`,
    );

    // Phase 3: This will delegate to the Quality Director Agent (agent-quality-001)
    // via Dify/n8n workflow. For Phase 2, we run an inline check.

    await this.extensionService.runQualityCheck(client, taskId, content, platforms);
  }

  // ─── Server → Client Methods ────────────────────────────────────────────

  /**
   * Push a new publish task to a specific extension.
   */
  async pushTask(clientId: string, task: {
    taskId: string;
    priority: 'low' | 'normal' | 'high';
    platforms: string[];
    content: unknown;
    config: unknown;
  }): Promise<boolean> {
    const ext = this.extensions.get(clientId);
    if (!ext || ext.ws.readyState !== WebSocket.OPEN) {
      this.logger.warn(`Cannot push task — extension ${clientId} not connected`);
      return false;
    }

    this.send(ext.ws, {
      type: 'NEW_TASK',
      payload: task,
    });

    this.logger.log(`Task ${task.taskId} dispatched to ${clientId}`);
    return true;
  }

  /**
   * Push a config update to all connected extensions.
   */
  broadcastConfigUpdate(configs: Record<string, unknown>): void {
    let count = 0;
    for (const ext of this.extensions.values()) {
      if (ext.ws.readyState === WebSocket.OPEN) {
        this.send(ext.ws, {
          type: 'CONFIG_UPDATE',
          payload: { platforms: configs },
        });
        count++;
      }
    }
    this.logger.log(`Config update broadcast to ${count} extensions`);
  }

  /**
   * Send a command to a specific extension.
   */
  sendCommand(clientId: string, command: string, data?: unknown): boolean {
    const ext = this.extensions.get(clientId);
    if (!ext || ext.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    this.send(ext.ws, {
      type: 'COMMAND',
      payload: { command, data },
    });
    return true;
  }

  /**
   * Check if an extension is connected.
   */
  isConnected(clientId: string): boolean {
    const ext = this.extensions.get(clientId);
    return ext !== undefined && ext.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get all connected extension IDs.
   */
  getConnectedExtensions(): { clientId: string; version: string; userId: string; connectedAt: Date }[] {
    return Array.from(this.extensions.values()).map((ext) => ({
      clientId: ext.clientId,
      version: ext.version,
      userId: ext.userId,
      connectedAt: ext.connectedAt,
    }));
  }

  /**
   * Get connected extensions for a specific user.
   */
  getExtensionsForUser(userId: string): RegisteredExtension[] {
    return Array.from(this.extensions.values()).filter(
      (ext) => ext.userId === userId,
    );
  }

  // ─── Private Helpers ────────────────────────────────────────────────────

  private send(client: WebSocket, message: Partial<WsMessage> & { type: string; payload: unknown }): void {
    if (client.readyState !== WebSocket.OPEN) return;

    const fullMessage: WsMessage = {
      type: message.type,
      payload: message.payload,
      traceId: message.traceId,
      ts: new Date().toISOString(),
    };

    client.send(JSON.stringify(fullMessage));
  }

  private sendError(client: WebSocket, code: string, message: string, traceId?: string): void {
    this.send(client, {
      type: 'ERROR',
      payload: { code, message },
      traceId,
    });
  }

  /**
   * Check all connected extensions for heartbeat timeout.
   * Disconnect any that haven't pinged within the timeout window.
   */
  private checkHeartbeats(): void {
    const now = Date.now();
    const timeout = 90_000; // 90 seconds without ping → disconnect

    for (const [clientId, ext] of this.extensions.entries()) {
      if (now - ext.lastPing.getTime() > timeout) {
        this.logger.warn(`Heartbeat timeout — disconnecting ${clientId}`);
        this.sendError(ext.ws, 'HEARTBEAT_TIMEOUT', 'Heartbeat timeout — please reconnect');
        ext.ws.close(4002, 'Heartbeat timeout');
        this.extensions.delete(clientId);
      }
    }
  }
}
