/**
 * AiBrand Extension v3 — Background Service Worker
 */
import { defineBackground } from 'wxt/sandbox';
import { WebSocketManager } from '@/core/websocket';
import { getAuthService } from '@/core/auth';
import { getConfigService } from '@/core/config';
import { getAccountDetector } from '@/platforms/account-detector';

import type {
  NewTaskPayload,
  TaskProgressPayload,
  TaskCompletePayload,
  ConfigUpdatePayload,
  CommandPayload,
} from '@/shared/types';

// ─── Bootstrap ────────────────────────────────────────────────────────────

let ws: WebSocketManager | null = null;

async function bootstrap(): Promise<void> {
  console.log('[AiBrand] Extension v3 bootstrapping...');

  // 1. Init Auth
  const auth = getAuthService();
  await auth.init();

  // 2. Init Config
  const config = getConfigService();
  await config.init();

  // 3. Generate stable client ID
  let { aibrand_client_id: clientId } = await chrome.storage.session.get('aibrand_client_id');
  if (!clientId) {
    clientId = crypto.randomUUID();
    await chrome.storage.session.set({ aibrand_client_id: clientId });
  }

  // 4. Init WebSocket Manager
  ws = new WebSocketManager({
    clientId: clientId as string,
    getToken: () => auth.getToken(),
  });

  // Wire up WebSocket events
  ws.on('connected', () => {
    console.log('[AiBrand] WebSocket connected — ready for tasks');
  });

  ws.on('disconnected', (e) => {
    console.log(`[AiBrand] WebSocket disconnected: ${e.detail.code}`);
  });

  ws.on('reconnecting', (e) => {
    console.log(`[AiBrand] Reconnecting (${e.detail.attempt}) in ${e.detail.delay}ms`);
  });

  ws.on('task:new', (e) => {
    handleNewTask(e.detail);
  });

  ws.on('config:update', (e) => {
    config.applyUpdate(
      e.detail.platforms,
      e.detail.featureFlags,
    );
  });

  // Quality events — relay from WS to Side Panel via chrome.runtime
  ws.on('quality:started', (e) => {
    chrome.runtime.sendMessage({
      action: 'AIBRAND_QUALITY_STARTED',
      data: e.detail,
    }).catch(() => {});
  });

  ws.on('quality:dim_result', (e) => {
    chrome.runtime.sendMessage({
      action: 'AIBRAND_QUALITY_DIM_RESULT',
      data: e.detail,
    }).catch(() => {});
  });

  ws.on('quality:verdict', (e) => {
    chrome.runtime.sendMessage({
      action: 'AIBRAND_QUALITY_VERDICT',
      data: e.detail,
    }).catch(() => {});
  });

  ws.on('command', (e) => {
    handleCommand(e.detail);
  });

  ws.on('error', (e) => {
    console.error('[AiBrand] WebSocket error:', e.detail.message);
  });

  // 5. Connect (if authenticated)
  if (auth.isAuthenticated) {
    await ws.connect();
  }

  // 6. Re-connect when auth state changes
  auth.on('authenticated', async () => {
    console.log('[AiBrand] Auth acquired — connecting WebSocket');
    if (ws && !ws.connected) {
      await ws.connect();
    }
  });

  auth.on('unauthenticated', () => {
    console.log('[AiBrand] Auth cleared — disconnecting WebSocket');
    ws?.disconnect();
  });

  auth.on('expired', () => {
    console.log('[AiBrand] Token expired — disconnecting');
    ws?.disconnect();
  });

  console.log('[AiBrand] Bootstrap complete');
}

// ─── Message Handlers ─────────────────────────────────────────────────────

/**
 * Handle incoming NEW_TASK from backend.
 * Opens the publish workflow for the user.
 */
async function handleNewTask(task: NewTaskPayload): Promise<void> {
  console.log('[AiBrand] New task:', task.taskId, task.platforms);

  // Open the side panel for the user to review
  // The side panel will show task details and manage the publish flow
  try {
    // Notify any open side panels
    chrome.runtime.sendMessage({
      action: 'AIBRAND_NEW_TASK',
      data: task,
    }).catch(() => {
      // No listener — side panel not open, that's fine
    });

    // If auto-publish is enabled, start execution immediately
    if (task.config.autoPublish) {
      console.log('[AiBrand] Auto-publish enabled — executing task');
      // Task execution will be handled by the Side Panel UI
    }
  } catch (err) {
    console.error('[AiBrand] Failed to handle new task:', err);
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
  ws?.send('TASK_PROGRESS', { type: 'ACCOUNTS_SCANNED', accounts });
  return accounts;
}

// Start the extension
bootstrap().catch((err) => {
  console.error('[AiBrand] Bootstrap failed:', err);
});

// Export for testing
export { bootstrap, ws };

export default defineBackground(() => {
  bootstrap().catch((err) => {
    console.error('[AiBrand] Bootstrap failed:', err);
  });
});
