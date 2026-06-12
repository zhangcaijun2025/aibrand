/**
 * AiBrand Extension v3 — Plugin Bridge (MAIN world)
 * Injects window.AiBrandPlugin into the page's JS context.
 */
import { defineContentScript } from 'wxt/sandbox'

export default defineContentScript({
  matches: [
    'https://aibrand.local/*',
    'https://*.aibrand.com/*',
    'http://localhost:*/*',
    'http://127.0.0.1:*/*',
  ],
  runAt: 'document_start',
  world: 'MAIN',

  main() {
    // Plugin API — functions are strings because MAIN world can't access extension APIs
    const plugin = {
      version: '3.0.0',

      checkPermission: () => {
        return new Promise((resolve) => {
          const traceId = Math.random().toString(36).slice(2)
          const handler = (e: MessageEvent) => {
            if (e.data?.type === 'response' && e.data?.traceId === traceId) {
              window.removeEventListener('message', handler)
              resolve(e.data?.data || { granted: false })
            }
          }
          window.addEventListener('message', handler)
          window.postMessage({ type: 'request', action: 'AIBRAND_EXTENSION_CHECK_SERVICE_STATUS', traceId }, '*')
          setTimeout(() => { window.removeEventListener('message', handler); resolve({ granted: false }) }, 5000)
        })
      },

      getAccounts: () => {
        return new Promise((resolve) => {
          const traceId = Math.random().toString(36).slice(2)
          const handler = (e: MessageEvent) => {
            if (e.data?.type === 'response' && e.data?.traceId === traceId) {
              window.removeEventListener('message', handler)
              resolve(e.data?.data?.accountInfo || e.data?.data || {})
            }
          }
          window.addEventListener('message', handler)
          window.postMessage({ type: 'request', action: 'AIBRAND_EXTENSION_GET_ACCOUNT_INFOS', traceId }, '*')
          setTimeout(() => { window.removeEventListener('message', handler); resolve({}) }, 10000)
        })
      },
    }

    Object.defineProperty(window, 'AiBrandPlugin', {
      value: plugin,
      writable: false,
      configurable: false,
    })

    console.log('[AiBrand v3] Plugin bridge ready — window.AiBrandPlugin')
  },
})
