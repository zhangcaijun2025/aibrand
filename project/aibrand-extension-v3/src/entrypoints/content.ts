/**
 * AiBrand Extension v3 — Content Script Bridge
 *
 * Bridges window.postMessage (from web pages) ↔ chrome.runtime.sendMessage (to background SW).
 *
 * This is the ONLY content script. No more separate extension.ts / helper.ts / scraper.ts.
 *
 * Responsibilities:
 * 1. Relay messages from AiBrand Web App → Extension Background
 * 2. Relay messages from Extension Background → AiBrand Web App
 * 3. Publish page DOM observation (for AI-assisted content injection)
 */
import { defineContentScript } from 'wxt/sandbox';

// ─── Logger Utility ────────────────────────────────────────────────────────

const LOG_PREFIX = '[AiBrand:CS]';
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
      } else if (typeof value === 'string' && value.length > 100) {
        sanitized[key] = value.substring(0, 100) + '...';
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
  return data;
}

export default defineContentScript({
  matches: [
    // Local Development
    'http://localhost:*/*',
    'http://127.0.0.1:*/*',
    'https://aibrand.local/*',
    // Production
    'https://*.aibrand.com/*',
    // Platform domains
    'https://weibo.com/*',
    'https://creator.douyin.com/*',
    'https://creator.xiaohongshu.com/*',
    'https://*.bilibili.com/*',
    'https://zhuanlan.zhihu.com/*',
    'https://mp.weixin.qq.com/*',
    'https://*.toutiao.com/*',
    'https://*.kuaishou.com/*',
  ],
  runAt: 'document_start',

  main() {
    log('info', '═══════════════════════════════════════════════════════════');
    log('info', 'Content Script loaded');
    log('info', `URL: ${window.location.href}`);
    log('info', '───────────────────────────────────────────────────────────');

    // ─── Configuration ──────────────────────────────────────────────────

    const TRUSTLESS_ACTIONS = [
      'AIBRAND_EXTENSION_REQUEST_TRUST_DOMAIN',
      'AIBRAND_GET_EXTENSION_STATUS',
      'AIBRAND_GET_PLATFORMS',
    ];

    const ACTION_PREFIXES = ['AIBRAND'] as const;

    const EXTENSION_VERSION = '3.0.0';

    const AVAILABLE_PLATFORMS = [
      { id: 'weibo', name: '微博', icon: '📱' },
      { id: 'douyin', name: '抖音', icon: '🎵' },
      { id: 'xhs', name: '小红书', icon: '📕' },
      { id: 'bilibili', name: 'B站', icon: '📺' },
      { id: 'zhihu', name: '知乎', icon: '💡' },
      { id: 'wechat', name: '微信公众号', icon: '💬' },
      { id: 'toutiao', name: '今日头条', icon: '📰' },
    ];

    // ─── Message Validation ─────────────────────────────────────────────

    interface ExternalRequest<T = unknown> {
      type: 'request';
      action: string;
      traceId: string;
      data: T;
    }

    interface ExternalResponse<T = unknown> {
      type: 'response';
      traceId: string;
      action: string;
      code: number;
      message: string;
      data: T | null;
    }

    function isSupportedAction(action: string): boolean {
      return ACTION_PREFIXES.some((prefix) => action.startsWith(prefix));
    }

    async function isOriginTrusted(origin: string, action: string): Promise<boolean> {
      if (TRUSTLESS_ACTIONS.includes(action)) return true;
      const trustedDomains: string[] = [
        'localhost', '127.0.0.1', 'aibrand.local', 'aibrand.com', '*.aibrand.com',
      ];
      return trustedDomains.some((domain) => {
        if (domain.startsWith('*.')) {
          return origin.endsWith(domain.slice(2));
        }
        return origin === domain;
      });
    }

    // ─── Main Listener ──────────────────────────────────────────────────

    window.addEventListener('message', async (event: MessageEvent) => {
      const request = event.data as ExternalRequest;
      
      if (request.type !== 'request' || !isSupportedAction(request.action)) {
        log('debug', `Ignored non-request message: ${request.type}`);
        return;
      }

      log('info', '───────────────────────────────────────────────────────────');
      log('info', `Received message from web page`, { 
        action: request.action, 
        traceId: request.traceId,
        origin: event.origin 
      });

      const hostname = new URL(event.origin).hostname;
      const isTrusted = await isOriginTrusted(hostname, request.action);

      if (!isTrusted) {
        log('warn', `Untrusted origin rejected: ${hostname}`);
        event.source?.postMessage({
          type: 'response', traceId: request.traceId, action: request.action,
          code: 403, message: `Untrusted origin: ${hostname}`, data: null,
        } as ExternalResponse, { targetOrigin: event.origin });
        return;
      }

      try {
        log('debug', 'Relaying message to background service');
        const bgResponse = await chrome.runtime.sendMessage(request);
        log('debug', 'Received response from background', { response: bgResponse ? 'success' : 'null' });
        
        event.source?.postMessage({
          type: 'response', traceId: request.traceId, action: request.action,
          code: 0, message: 'success', data: bgResponse ?? null,
        } as ExternalResponse, { targetOrigin: event.origin });
        
        log('info', `Message handled successfully: ${request.action}`);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        log('error', `Failed to handle message: ${errorMsg}`, err);
        
        event.source?.postMessage({
          type: 'response', traceId: request.traceId, action: request.action,
          code: 500, message: errorMsg, data: null,
        } as ExternalResponse, { targetOrigin: event.origin });
      }
    });

    // ─── DOM Observation for Publishing ─────────────────────────────────

    function isPublishPage(): boolean {
      const publishUrls = ['weibo.com', 'creator.douyin.com', 'creator.xiaohongshu.com',
        'bilibili.com', 'zhuanlan.zhihu.com', 'mp.weixin.qq.com', 'toutiao.com'];
      return publishUrls.some((url) => window.location.hostname.includes(url));
    }

    if (isPublishPage()) {
      document.documentElement.setAttribute('data-aibrand-extension', '3.0.0');

      chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
        // ─── AiBrand Web Integration ────────────────────────────────────
        if (request.action === 'AIBRAND_GET_EXTENSION_STATUS') {
          sendResponse({
            available: true,
            version: EXTENSION_VERSION,
            connected: true,
          });
          return true;
        }

        if (request.action === 'AIBRAND_GET_PLATFORMS') {
          sendResponse(AVAILABLE_PLATFORMS);
          return true;
        }

        if (request.action === 'AIBRAND_OPEN_PLATFORM') {
          const { platformId } = request.data ?? {};
          const platform = AVAILABLE_PLATFORMS.find(p => p.id === platformId);
          if (platform) {
            chrome.runtime.sendMessage({
              action: 'AIBRAND_OPEN_PLATFORM_TAB',
              data: { platformId },
            });
          }
          sendResponse({ success: !!platform });
          return true;
        }

        // ─── Publishing & DOM Operations ────────────────────────────────
        if (request.action === 'AIBRAND_DOM_QUERY') {
          const { selector, aiHint } = request.data ?? {};
          if (selector) {
            const el = document.querySelector(selector);
            sendResponse({ found: !!el, selector, tagName: el?.tagName });
            return true;
          }
          if (aiHint) {
            const candidates = findElementByHint(aiHint);
            sendResponse({
              found: candidates.length > 0,
              candidates: candidates.map((el) => ({
                selector: getUniqueSelector(el), tagName: el.tagName,
                text: el.textContent?.slice(0, 50),
                placeholder: (el as HTMLInputElement).placeholder,
              })),
            });
            return true;
          }
          sendResponse({ found: false });
          return true;
        }

        if (request.action === 'AIBRAND_EXECUTE_STEP') {
          const { stepId, selector, value, type } = request.data ?? {};
          try {
            executeStep(type, selector, value);
            sendResponse({ success: true, stepId });
          } catch (err) {
            sendResponse({ success: false, stepId, error: err instanceof Error ? err.message : 'Unknown' });
          }
          return true;
        }

        if (request.action === 'AIBRAND_EXECUTE_COMMENT') {
          const { content, replyTo } = request.data ?? {};
          executeComment(content, replyTo).then((commentId) => {
            sendResponse({ success: true, commentId });
          }).catch((err) => {
            sendResponse({ success: false, error: err instanceof Error ? err.message : 'Unknown' });
          });
          return true;
        }

        if (request.action === 'AIBRAND_EXECUTE_QUICK_ACTION') {
          const { action, targetUserId } = request.data ?? {};
          executeQuickAction(action, targetUserId).then((success) => {
            sendResponse({ success });
          }).catch((err) => {
            sendResponse({ success: false, error: err instanceof Error ? err.message : 'Unknown' });
          });
          return true;
        }

        if (request.action === 'AIBRAND_GET_PAGE_CONTEXT') {
          const context = getPageContext();
          sendResponse({ success: true, context });
          return true;
        }
        return false;
      });
    }

    // ─── Comment & Quick Action Functions ──────────────────────────────

    async function executeComment(content: string, replyTo?: string): Promise<string> {
      const platform = detectPlatform();
      const selectors = getPlatformSelectors(platform);

      if (!selectors.commentInput) {
        throw new Error(`Comment input selector not found for ${platform}`);
      }

      const input = document.querySelector(selectors.commentInput);
      if (!input) {
        throw new Error('Comment input element not found');
      }

      if (replyTo) {
        const replyBtn = document.querySelector(`[data-comment-id="${replyTo}"]`) || 
                        document.querySelector(`button[class*="reply"], .reply-btn`);
        if (replyBtn) {
          (replyBtn as HTMLElement).click();
          await sleep(500);
        }
      }

      (input as HTMLInputElement | HTMLTextAreaElement).value = content;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));

      await sleep(500);

      const submitBtn = document.querySelector(selectors.commentSubmit);
      if (!submitBtn) {
        throw new Error('Comment submit button not found');
      }

      (submitBtn as HTMLElement).click();
      await sleep(2000);

      return generateCommentId();
    }

    async function executeQuickAction(action: string, _targetUserId?: string): Promise<boolean> {
      const platform = detectPlatform();
      const selectors = getPlatformSelectors(platform);

      let selector = '';
      switch (action) {
        case 'like':
          selector = selectors.likeButton;
          break;
        case 'favorite':
          selector = selectors.favoriteButton;
          break;
        case 'follow':
          selector = selectors.followButton;
          break;
        case 'share':
          selector = selectors.shareButton;
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      if (!selector) {
        throw new Error(`${action} selector not found for ${platform}`);
      }

      const buttons = document.querySelectorAll(selector);
      if (buttons.length === 0) {
        throw new Error(`${action} button not found`);
      }

      const button = buttons[0] as HTMLElement;
      button.click();
      await sleep(1000);

      return true;
    }

    function getPageContext(): any {
      return {
        url: window.location.href,
        title: document.title,
        platform: detectPlatform(),
        selectedText: window.getSelection()?.toString() || undefined,
        domSnapshot: document.body.innerText.substring(0, 2000),
      };
    }

    function detectPlatform(): string {
      const hostname = window.location.hostname;
      if (hostname.includes('weibo.com')) return 'weibo';
      if (hostname.includes('douyin.com') || hostname.includes('amemv.com')) return 'douyin';
      if (hostname.includes('xiaohongshu.com') || hostname.includes('xiaohongshu.app')) return 'xhs';
      if (hostname.includes('bilibili.com')) return 'bilibili';
      if (hostname.includes('zhihu.com')) return 'zhihu';
      if (hostname.includes('weixin.qq.com') || hostname.includes('mp.weixin.qq.com')) return 'wechat';
      if (hostname.includes('toutiao.com')) return 'toutiao';
      return 'unknown';
    }

    function getPlatformSelectors(platform: string): Record<string, string> {
      const selectors: Record<string, Record<string, string>> = {
        weibo: {
          commentInput: 'textarea[placeholder*="评论"], .woo-input textarea',
          commentSubmit: 'button[class*="submit"], span.woo-button-content',
          likeButton: '[action-type="like"], .woo-like-icon',
          favoriteButton: '[action-type="favorite"], .woo-favorite-icon',
          followButton: '[action-type="follow"], .woo-follow-btn',
          shareButton: '[action-type="share"], .woo-share-icon',
        },
        douyin: {
          commentInput: 'textarea[placeholder*="评论"], .comment-input textarea',
          commentSubmit: 'button[class*="submit"], button:has-text("发送")',
          likeButton: '[class*="like"], .like-btn',
          favoriteButton: '[class*="favorite"], .collect-btn',
          followButton: '[class*="follow"], .follow-btn',
          shareButton: '[class*="share"], .share-btn',
        },
        xhs: {
          commentInput: 'textarea[placeholder*="评论"], .comment-textarea',
          commentSubmit: 'button:has-text("发送"), button[class*="submit"]',
          likeButton: '[class*="like"], .like-icon',
          favoriteButton: '[class*="favorite"], .bookmark-icon',
          followButton: '[class*="follow"], .follow-btn',
          shareButton: '[class*="share"], .share-icon',
        },
        bilibili: {
          commentInput: 'textarea[placeholder*="发表评论"], #comment-textarea',
          commentSubmit: 'button[class*="submit"], button:has-text("发布")',
          likeButton: '[class*="like"], .like',
          favoriteButton: '[class*="favorite"], .collect',
          followButton: '[class*="follow"], .relation-action',
          shareButton: '[class*="share"], .share-btn',
        },
        zhihu: {
          commentInput: 'textarea[placeholder*="写下你的评论"], .CommentEditor-content',
          commentSubmit: 'button[class*="submit"], button:has-text("发送")',
          likeButton: '[class*="LikeButton"], .VoteButton',
          favoriteButton: '[class*="FavoriteButton"], .BookmarkButton',
          followButton: '[class*="FollowButton"], .UserLink-follow',
          shareButton: '[class*="ShareButton"], .ContentItem-action',
        },
        wechat: {
          commentInput: 'textarea[placeholder*="评论"], #js_reply_text',
          commentSubmit: 'button:has-text("发送"), .btn_send',
          likeButton: '[class*="like"], .like-btn',
          favoriteButton: '[class*="favorite"], .favorite-btn',
          followButton: '[class*="follow"], .follow-btn',
          shareButton: '[class*="share"], .share-btn',
        },
        toutiao: {
          commentInput: 'textarea[placeholder*="评论"], .comment-input',
          commentSubmit: 'button:has-text("发送"), .submit-btn',
          likeButton: '[class*="like"], .like-icon',
          favoriteButton: '[class*="favorite"], .collect-btn',
          followButton: '[class*="follow"], .follow-btn',
          shareButton: '[class*="share"], .share-btn',
        },
      };
      return selectors[platform] || selectors.weibo;
    }

    function generateCommentId(): string {
      return `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    function sleep(ms: number): Promise<void> {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // ─── Helpers ────────────────────────────────────────────────────────

    function findElementByHint(hint: string): Element[] {
      const hintLower = hint.toLowerCase();
      const allInputs = document.querySelectorAll('input, textarea, select, [contenteditable="true"]');
      return Array.from(allInputs).filter((el) => {
        const placeholder = (el as HTMLInputElement).placeholder?.toLowerCase() ?? '';
        const ariaLabel = el.getAttribute('aria-label')?.toLowerCase() ?? '';
        const name = (el as HTMLInputElement).name?.toLowerCase() ?? '';
        const id = el.id?.toLowerCase() ?? '';
        const label = el.closest('label')?.textContent?.toLowerCase() ?? '';
        return [placeholder, ariaLabel, name, id, label].some((text) =>
          hintLower.split(' ').some((word) => text.includes(word)));
      });
    }

    function getUniqueSelector(el: Element): string {
      if (el.id) return `#${el.id}`;
      const parts: string[] = [];
      let current: Element | null = el;
      while (current && current !== document.body) {
        const tag = current.tagName.toLowerCase();
        const parent: Element | null = current.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter((c: Element) => c.tagName === current!.tagName);
          if (siblings.length > 1) {
            parts.unshift(`${tag}:nth-of-type(${siblings.indexOf(current) + 1})`);
          } else {
            parts.unshift(tag);
          }
        } else {
          parts.unshift(tag);
        }
        current = parent;
      }
      return parts.join(' > ');
    }

    function executeStep(type: string, selector: string, value: string): void {
      const el = document.querySelector(selector);
      if (!el) throw new Error(`Element not found: ${selector}`);
      switch (type) {
        case 'input': {
          const input = el as HTMLInputElement;
          input.value = value;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          break;
        }
        case 'click':
          (el as HTMLElement).click();
          break;
        case 'select':
          (el as HTMLSelectElement).value = value;
          el.dispatchEvent(new Event('change', { bubbles: true }));
          break;
        case 'upload':
          throw new Error('Upload step handled by injector');
        default:
          throw new Error(`Unknown step type: ${type}`);
      }
    }
  },
});
