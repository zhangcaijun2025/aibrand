/**
 * AiBrand Extension v3 — Background Service Worker
 */
import { defineBackground } from 'wxt/sandbox';
import { WebSocketManager } from '@/core/websocket';
import { getAuthService } from '@/core/auth';
import { getConfigService } from '@/core/config';
import { getAccountDetector } from '@/platforms/account-detector';
import { registerConsoleCommands } from '@/core/mock-auth';

import type {
  NewTaskPayload,
  TaskProgressPayload,
  TaskCompletePayload,
  CommandPayload,
  CommentTask,
  QuickActionTask,
} from '@/shared/types';

// ─── Logger Utility ────────────────────────────────────────────────────────

const LOG_PREFIX = '[AiBrand:BG]';
const LOG_LEVEL = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

function log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: unknown): void {
  const levels = { debug: 0, info: 1, warn: 2, error: 3 };
  if (levels[level] < levels[LOG_LEVEL as keyof typeof levels]) return;

  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} ${LOG_PREFIX} [${level.toUpperCase()}] ${message}`;
  
  if (data) {
    try {
      const sanitized = sanitizeLogData(data);
      console[level](logMessage, sanitized);
    } catch {
      console[level](logMessage, data);
    }
  } else {
    console[level](logMessage);
  }
}

function sanitizeLogData(data: unknown): unknown {
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (/token|secret|password|api[_-]?key|cookie/i.test(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string' && value.length > 150) {
        sanitized[key] = value.substring(0, 150) + '...';
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
  return data;
}

// ─── Bootstrap ────────────────────────────────────────────────────────────

let ws: WebSocketManager | null = null;

async function bootstrap(): Promise<void> {
  log('info', '═══════════════════════════════════════════════════════════');
  log('info', 'Extension v3.0.0 bootstrapping...');
  log('info', '───────────────────────────────────────────────────────────');

  // 1. Init Auth
  log('debug', 'Initializing Auth Service...');
  const auth = getAuthService();
  await auth.init();
  log('debug', `Auth initialized: ${auth.isAuthenticated ? 'authenticated' : 'not authenticated'}`);

  // 2. Init Config
  log('debug', 'Initializing Config Service...');
  const config = getConfigService();
  await config.init();
  log('debug', 'Config initialized');

  // 3. Generate stable client ID
  log('debug', 'Generating client ID...');
  let { aibrand_client_id: clientId } = await chrome.storage.session.get('aibrand_client_id');
  if (!clientId) {
    clientId = crypto.randomUUID();
    await chrome.storage.session.set({ aibrand_client_id: clientId });
    log('debug', `Generated new client ID: ${clientId.substring(0, 8)}...`);
  } else {
    log('debug', `Using existing client ID: ${clientId.substring(0, 8)}...`);
  }

  // 4. Init WebSocket Manager
  log('debug', 'Initializing WebSocket Manager...');
  ws = new WebSocketManager({
    clientId: clientId as string,
    getToken: () => auth.getToken(),
  });

  // Wire up WebSocket events
  ws.on('connected', () => {
    log('info', '═══════════════════════════════════════════════════════════');
    log('info', 'WebSocket connected — ready for tasks');
    log('info', '───────────────────────────────────────────────────────────');
  });

  ws.on('disconnected', (e) => {
    log('warn', `WebSocket disconnected: code=${e.detail.code}, reason=${e.detail.reason || 'unknown'}`);
  });

  ws.on('reconnecting', (e) => {
    log('info', `Reconnecting (attempt ${e.detail.attempt}/20) in ${e.detail.delay}ms`);
  });

  ws.on('task:new', (e) => {
    log('info', 'New task received from backend', { taskId: e.detail.taskId });
    handleNewTask(e.detail);
  });

  ws.on('config:update', (e) => {
    log('debug', 'Config update received', {
      platforms: Object.keys(e.detail.platforms || {}).length,
      featureFlags: Object.keys(e.detail.featureFlags || {}).length
    });
    config.applyUpdate(
      e.detail.platforms,
      e.detail.featureFlags,
    );
  });

  // Quality events — relay from WS to Side Panel via chrome.runtime
  ws.on('quality:started', (e) => {
    log('debug', 'Quality check started');
    chrome.runtime.sendMessage({
      action: 'AIBRAND_QUALITY_STARTED',
      data: e.detail,
    }).catch(() => {});
  });

  ws.on('quality:dim_result', (e) => {
    log('debug', 'Quality dimension result', { dimension: e.detail.dimension });
    chrome.runtime.sendMessage({
      action: 'AIBRAND_QUALITY_DIM_RESULT',
      data: e.detail,
    }).catch(() => {});
  });

  ws.on('quality:verdict', (e) => {
    log('debug', 'Quality verdict received', { passed: e.detail.passed });
    chrome.runtime.sendMessage({
      action: 'AIBRAND_QUALITY_VERDICT',
      data: e.detail,
    }).catch(() => {});
  });

  ws.on('command', (e) => {
    log('debug', 'Command received', { command: e.detail.command });
    handleCommand(e.detail);
  });

  ws.on('error', (e) => {
    log('error', `WebSocket error: ${e.detail.message}`, e.detail);
  });

  // 5. Connect (if authenticated)
  if (auth.isAuthenticated) {
    log('info', 'User authenticated — connecting WebSocket');
    await ws.connect();
  } else {
    log('info', 'User not authenticated — WebSocket connection deferred');
  }

  // 6. Re-connect when auth state changes
  auth.on('authenticated', async () => {
    log('info', 'Auth acquired — connecting WebSocket');
    if (ws && !ws.connected) {
      await ws.connect();
    }
  });

  auth.on('unauthenticated', () => {
    log('info', 'Auth cleared — disconnecting WebSocket');
    ws?.disconnect();
  });

  auth.on('expired', () => {
    log('warn', 'Token expired — disconnecting WebSocket');
    ws?.disconnect();
  });

  log('info', '═══════════════════════════════════════════════════════════');
  log('info', 'Bootstrap complete — extension ready');
  log('info', '───────────────────────────────────────────────────────────');

  // Register mock auth commands for local development
  // Only register in browser context (not during build)
  if (typeof chrome !== 'undefined' && chrome.runtime && process.env.WXT_ENV !== 'production') {
    try {
      registerConsoleCommands();
      log('info', 'Mock auth commands registered for development');
    } catch (e) {
      log('debug', 'Failed to register mock auth commands (expected during build)');
    }
  }
}

// ─── Message Handlers ─────────────────────────────────────────────────────

/**
 * Handle incoming NEW_TASK from backend.
 * Opens the publish workflow for the user.
 */
async function handleNewTask(task: NewTaskPayload): Promise<void> {
  log('info', '═══════════════════════════════════════════════════════════');
  log('info', 'New publish task received', { 
    taskId: task.taskId, 
    platforms: task.platforms,
    autoPublish: task.config.autoPublish 
  });
  log('info', '───────────────────────────────────────────────────────────');

  try {
    // Notify any open side panels
    log('debug', 'Notifying side panel about new task');
    chrome.runtime.sendMessage({
      action: 'AIBRAND_NEW_TASK',
      data: task,
    }).catch(() => {
      log('debug', 'No side panel listener — that\'s OK');
    });

    // If auto-publish is enabled, start execution immediately
    if (task.config.autoPublish) {
      log('info', 'Auto-publish enabled — task will execute immediately');
    } else {
      log('debug', 'Task requires user confirmation');
    }
  } catch (err) {
    log('error', 'Failed to handle new task', err);
  }
}

/**
 * Handle comment task from AiBrand.
 */
async function handleCommentTask(task: CommentTask): Promise<void> {
  console.log('[AiBrand] New comment task:', task.taskId);
  try {
    const executor = await import('@/core/task-executor').then((m) => m.getTaskExecutor());
    executor.executeComment(task);
  } catch (err) {
    console.error('[AiBrand] Failed to execute comment task:', err);
  }
}

/**
 * Handle quick action from AiBrand.
 */
async function handleQuickAction(task: QuickActionTask): Promise<void> {
  console.log('[AiBrand] New quick action:', task.action, task.taskId);
  try {
    const executor = await import('@/core/task-executor').then((m) => m.getTaskExecutor());
    executor.executeQuickAction(task);
  } catch (err) {
    console.error('[AiBrand] Failed to execute quick action:', err);
  }
}

/**
 * Handle backend commands.
 */
function handleCommand(cmd: CommandPayload): void {
  console.log('[AiBrand] Command received:', cmd.command);

  switch (cmd.command) {
    case 'SYNC_ACCOUNTS':
      // Trigger platform account sync
      chrome.runtime.sendMessage({
        action: 'AIBRAND_COMMAND_SYNC_ACCOUNTS',
        data: cmd.data,
      }).catch(() => {});
      break;

    case 'REFRESH_PLATFORMS':
      // Reload platform configs
      getConfigService().init();
      break;

    case 'CLEAR_AUTH':
      getAuthService().clear();
      break;

    case 'RESTART':
      // Force reconnect
      ws?.disconnect();
      setTimeout(() => ws?.connect(), 1000);
      break;

    default:
      console.warn('[AiBrand] Unknown command:', cmd.command);
  }
}

// ─── Extension Message Handlers ───────────────────────────────────────────

/**
 * Handle messages from content scripts, popup, sidepanel, and web pages.
 *
 * ACTIONS:
 * - AIBRAND_EXTENSION_SET_TOKEN     → Auth (from Web App login)
 * - AIBRAND_EXTENSION_CLEAR_AUTH    → Auth (from Web App logout)
 * - AIBRAND_WS_SEND                 → Relay message to WebSocket
 * - AIBRAND_GET_STATE               → Return current state snapshot
 * - AIBRAND_REPORT_PROGRESS         → Relay progress to backend
 * - AIBRAND_COMPLETE_TASK           → Relay completion to backend
 */
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  // Auth messages — handled by AuthService directly
  if (
    request.action === 'AIBRAND_EXTENSION_SET_TOKEN' ||
    request.action === 'AIBRAND_EXTENSION_CLEAR_AUTH'
  ) {
    // AuthService has its own listener — just acknowledge
    sendResponse({ success: true });
    return true;
  }

  // Scan browser accounts (no OAuth needed)
  if (request.action === 'AIBRAND_SCAN_ACCOUNTS') {
    scanAccounts().then((accounts) => {
      sendResponse({ success: true, data: accounts });
    }).catch((err) => {
      sendResponse({ success: false, message: String(err) });
    });
    return true;
  }

  // Relay message to WebSocket
  if (request.action === 'AIBRAND_WS_SEND') {
    const { type, payload, traceId } = request.data ?? {};
    if (ws && type) {
      const sent = ws.send(type, payload, traceId);
      sendResponse({ success: sent });
    } else {
      sendResponse({ success: false, message: 'WebSocket not connected or missing type' });
    }
    return true;
  }

  // Get current state
  if (request.action === 'AIBRAND_GET_STATE') {
    const auth = getAuthService();
    sendResponse({
      success: true,
      data: {
        auth: auth.state,
        wsConnected: ws?.connected ?? false,
      },
    });
    return true;
  }

  // Report publish progress
  if (request.action === 'AIBRAND_REPORT_PROGRESS') {
    const progress = request.data as TaskProgressPayload;
    ws?.send<TaskProgressPayload>('TASK_PROGRESS', progress);
    sendResponse({ success: true });
    return true;
  }

  // Complete publish task
  if (request.action === 'AIBRAND_COMPLETE_TASK') {
    const result = request.data as TaskCompletePayload;
    ws?.send<TaskCompletePayload>('TASK_COMPLETE', result);
    sendResponse({ success: true });
    return true;
  }

  // Execute a publish task (from Side Panel confirm)
  if (request.action === 'AIBRAND_EXECUTE_TASK') {
    const task = request.data as NewTaskPayload;
    handleNewTask(task);
    sendResponse({ success: true });
    return true;
  }

  // Execute a comment task
  if (request.action === 'AIBRAND_EXECUTE_COMMENT_TASK') {
    const task = request.data as CommentTask;
    handleCommentTask(task);
    sendResponse({ success: true });
    return true;
  }

  // Execute a quick action task
  if (request.action === 'AIBRAND_EXECUTE_QUICK_ACTION') {
    const task = request.data as QuickActionTask;
    handleQuickAction(task);
    sendResponse({ success: true });
    return true;
  }

  // Complete comment task
  if (request.action === 'AIBRAND_COMPLETE_COMMENT') {
    const { taskId, success, commentId, error } = request.data ?? {};
    ws?.send('TASK_COMPLETE', {
      taskId,
      results: [{ platform: '', success, url: commentId ?? undefined, error }],
    });
    sendResponse({ success: true });
    return true;
  }

  // Complete quick action
  if (request.action === 'AIBRAND_COMPLETE_QUICK_ACTION') {
    const { taskId, success, error } = request.data ?? {};
    ws?.send('TASK_COMPLETE', {
      taskId,
      results: [{ platform: '', success, error }],
    });
    sendResponse({ success: true });
    return true;
  }

  // Get page context for Agent
  if (request.action === 'AIBRAND_GET_PAGE_CONTEXT') {
    sendResponse({ success: true });
    return true;
  }

  // Open platform tab
  if (request.action === 'AIBRAND_OPEN_PLATFORM_TAB') {
    const { platformId } = request.data ?? {};
    const platformUrls: Record<string, string> = {
      weibo: 'https://weibo.com/newlogin',
      douyin: 'https://creator.douyin.com/',
      xhs: 'https://creator.xiaohongshu.com/',
      bilibili: 'https://member.bilibili.com/',
      zhihu: 'https://zhuanlan.zhihu.com/',
      wechat: 'https://mp.weixin.qq.com/',
      toutiao: 'https://mp.toutiao.com/',
    };
    const url = platformUrls[platformId];
    if (url) {
      chrome.tabs.create({ url, active: true });
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'Unknown platform' });
    }
    return true;
  }

  return false;
});

// ─── Extension Lifecycle ──────────────────────────────────────────────────

// Handle extension install/update
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[AiBrand] Extension', details.reason);

  if (details.reason === 'install') {
    // Open welcome page
    chrome.tabs.create({ url: 'https://aibrand.ai/welcome' });
  }

  // Configure side panel
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
});

// Keep service worker alive while WebSocket is connected
// (Manifest V3 SW lifecycle management)

/** Scan all platforms for logged-in accounts using browser cookies */
async function scanAccounts() {
  const detector = getAccountDetector();
  const accounts = await detector.scanAll();
  return accounts;
}

// Export for testing
export { bootstrap, ws };

export default defineBackground(() => {
  bootstrap().catch((err) => {
    console.error('[AiBrand] Bootstrap failed:', err);
  });
});
