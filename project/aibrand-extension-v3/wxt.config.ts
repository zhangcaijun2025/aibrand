import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',

  manifest: {
    name: 'AiBrand',
    description: 'AI-Native Multi-Platform Publishing Extension',
    version: '3.0.0',
    author: { email: 'dev@aibrand.ai' },
    homepage_url: 'https://aibrand.com',

    permissions: [
      'storage',
      'sidePanel',
      'tabs',
      'scripting',
      'alarms',
    ],

    host_permissions: [
      // Local Development
      'http://localhost:*/*',
      'http://127.0.0.1:*/*',
      'https://aibrand.local/*',
      // AiBrand Production Domain
      'https://*.aibrand.com/*',
      // Platform domains (for browser session detection and content injection)
      'https://*.douyin.com/*',
      'https://*.weibo.com/*',
      'https://*.xiaohongshu.com/*',
      'https://*.bilibili.com/*',
      'https://*.zhihu.com/*',
      'https://*.toutiao.com/*',
      'https://*.kuaishou.com/*',
      'https://mp.weixin.qq.com/*',
    ],

    action: {
      default_title: 'AiBrand',
      default_popup: 'popup.html',
    },

    side_panel: {
      default_path: 'sidepanel.html',
    },

    options_ui: {
      page: 'options.html',
      open_in_tab: true,
    },

    web_accessible_resources: [
      {
        resources: ['icon.svg', '*.svg'],
        matches: [
          'http://localhost:*/*',
          'http://127.0.0.1:*/*',
          'https://aibrand.local/*',
          'https://*.aibrand.com/*',
          'https://*.douyin.com/*',
          'https://*.weibo.com/*',
          'https://*.xiaohongshu.com/*',
          'https://*.bilibili.com/*',
          'https://*.zhihu.com/*',
          'https://*.toutiao.com/*',
          'https://*.kuaishou.com/*',
          'https://mp.weixin.qq.com/*',
        ],
      },
    ],
  },

  runner: {
    disabled: true,
  },
});
