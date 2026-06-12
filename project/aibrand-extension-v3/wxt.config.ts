import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',

  manifest: {
    name: 'AiBrand',
    description: 'AI-Native Multi-Platform Publishing Extension',
    version: '3.0.0',
    author: 'AiBrand <dev@aibrand.ai>',
    homepage_url: 'https://aibrand.ai',

    permissions: [
      'storage',
      'sidePanel',
      'tabs',
      'scripting',
      'alarms',
    ],

    host_permissions: [
      'https://aibrand.local/*',
      'https://*.aibrand.com/*',
      'http://localhost:*/*',
      'http://127.0.0.1:*/*',
      // Platform domains (for browser session detection)
      'https://*.douyin.com/*',
      'https://*.weibo.com/*',
      'https://*.xiaohongshu.com/*',
      'https://*.bilibili.com/*',
      'https://*.zhihu.com/*',
      'https://*.toutiao.com/*',
      'https://*.kuaishou.com/*',
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
        resources: ['assets/*'],
        matches: ['<all_urls>'],
      },
    ],
  },

  runner: {
    disabled: true,
  },
});
