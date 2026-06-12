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

export default defineContentScript({
  matches: [
    'https://weibo.com/*',
    'https://creator.douyin.com/*',
    'https://creator.xiaohongshu.com/*',
    'https://*.bilibili.com/*',
    'https://zhuanlan.zhihu.com/*',
    'https://mp.weixin.qq.com/*',
    'https://*.toutiao.com/*',
    'https://aibrand.local/*',
    'https://*.aibrand.com/*',
    'http://localhost:*/*',
  ],
  runAt: 'document_start',

  main() {
    // ─── Configuration ──────────────────────────────────────────────────

    const TRUSTLESS_ACTIONS = [
      'AIBRAND_EXTENSION_REQUEST_TRUST_DOMAIN',
    ];

    const ACTION_PREFIXES = ['AIBRAND'] as const;

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
      if (request.type !== 'request' || !isSupportedAction(request.action)) return;

      const hostname = new URL(event.origin).hostname;
      const isTrusted = await isOriginTrusted(hostname, request.action);

      if (!isTrusted) {
        event.source?.postMessage({
          type: 'response', traceId: request.traceId, action: request.action,
          code: 403, message: `Untrusted origin: ${hostname}`, data: null,
        } as ExternalResponse, { targetOrigin: event.origin });
        return;
      }

      try {
        const bgResponse = await chrome.runtime.sendMessage(request);
        event.source?.postMessage({
          type: 'response', traceId: request.traceId, action: request.action,
          code: 0, message: 'success', data: bgResponse ?? null,
        } as ExternalResponse, { targetOrigin: event.origin });
      } catch (err) {
        event.source?.postMessage({
          type: 'response', traceId: request.traceId, action: request.action,
          code: 500, message: err instanceof Error ? err.message : 'Unknown error', data: null,
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
        return false;
      });
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
        const parent = current.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter((c) => c.tagName === current!.tagName);
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
