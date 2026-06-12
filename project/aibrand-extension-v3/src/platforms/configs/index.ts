/**
 * AiBrand Platform Configs — Top 5 Chinese Social Platforms
 *
 * Each platform config is ready to be served by the backend API.
 * CSS selectors are extracted from the old MultiPost-based extension.
 * AI hints provide fallback for when platform UIs change.
 */

import type { PlatformConfig } from '@/shared/types';

// ─── Weibo (微博) ─────────────────────────────────────────────────────────

export const weiboConfig: PlatformConfig = {
  id: 'weibo',
  name: '微博',
  type: 'dynamic',
  icon: 'weibo',
  publishUrl: 'https://weibo.com',
  loginUrl: 'https://weibo.com/login',

  pipeline: [
    {
      id: 'wait_editor',
      type: 'wait',
      target: { selector: '.woo-publish-main, textarea[class*="Form"]', aiHint: '微博内容输入框，多行文本区域，位于页面中部' },
      value: '3000',
      waitAfter: 0,
    },
    {
      id: 'fill_content',
      type: 'input',
      target: { selector: 'textarea[class*="Form"], textarea[placeholder*="发布"], .woo-box-flex .woo-box-col textarea', aiHint: '微博内容输入框，placeholder 包含"有什么新鲜事"或"发布"' },
      value: { template: '{{content}}' },
      waitAfter: 1000,
    },
    {
      id: 'upload_images',
      type: 'upload',
      target: { selector: 'input[type="file"]', aiHint: '图片上传按钮，通常在输入框下方工具栏' },
      optional: true,
      waitAfter: 3000,
    },
    {
      id: 'fill_tags',
      type: 'input',
      target: { selector: 'input[placeholder*="话题"]', aiHint: '话题标签输入框' },
      value: { template: '{{tags}}' },
      optional: true,
      waitAfter: 500,
    },
    {
      id: 'click_publish',
      type: 'click',
      target: { selector: 'span.woo-button-content', aiHint: '发布按钮，蓝色，位于页面右下角或输入框下方' },
      value: '',
      waitAfter: 3000,
    },
  ],

  aiInjection: {
    enabled: true,
    prompt: '你在微博发布页面。找到内容输入框、图片上传按钮和发布按钮。输入框是一个大的多行文本区域。发布按钮文字为"发布"。',
    fallbackSelectors: {
      content: ['textarea[class*="Form"]', '.woo-publish-main textarea', 'textarea[placeholder*="发布"]'],
      imageUpload: ['input[type="file"]'],
      publishButton: ['span.woo-button-content', 'button[class*="publish"]'],
    },
  },

  mediaConstraints: {
    images: { max: 18, formats: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'], maxSize: 20 * 1024 * 1024 },
    videos: { max: 1, formats: ['video/mp4'], maxDuration: 900 },
  },

  contentConstraints: {
    titleMaxLength: 0,
    contentMaxLength: 2000,
    hashtagMaxCount: 10,
    supportedFeatures: ['schedule'],
  },

  loginDetection: {
    cookieName: 'WBPSESS',
    domIndicator: { selector: '.woo-publish-main', text: '' },
  },
};

// ─── Douyin (抖音) ────────────────────────────────────────────────────────

export const douyinConfig: PlatformConfig = {
  id: 'douyin',
  name: '抖音',
  type: 'video',
  icon: 'douyin',
  publishUrl: 'https://creator.douyin.com/creator-micro/content/upload',
  loginUrl: 'https://creator.douyin.com/',

  pipeline: [
    {
      id: 'wait_uploader',
      type: 'wait',
      target: { selector: 'input[type="file"]', aiHint: '视频上传区域，支持拖拽或点击上传' },
      value: '2000',
      waitAfter: 0,
    },
    {
      id: 'upload_video',
      type: 'upload',
      target: { selector: 'input[type="file"]', aiHint: '视频文件选择输入，页面中央上传区域' },
      waitAfter: 5000,
    },
    {
      id: 'fill_title',
      type: 'input',
      target: { selector: 'input[placeholder*="标题"], .semi-input', aiHint: '视频标题输入框，placeholder 包含"添加标题"或"标题"' },
      value: { template: '{{title}}' },
      waitAfter: 500,
    },
    {
      id: 'fill_content',
      type: 'input',
      target: { selector: 'textarea, .semi-input-textarea', aiHint: '视频描述文本区域，用于输入更多视频介绍' },
      value: { template: '{{content}}' },
      optional: true,
      waitAfter: 500,
    },
    {
      id: 'fill_tags',
      type: 'input',
      target: { selector: 'input[placeholder*="话题"], input[placeholder*="#"]]', aiHint: '话题标签输入框' },
      value: { template: '{{tags}}' },
      optional: true,
      waitAfter: 500,
    },
    {
      id: 'click_publish',
      type: 'click',
      target: { selector: 'button[class*="publish"], button:has-text("发布")', aiHint: '发布按钮，通常是蓝色或红色，位于页面底部' },
      value: '',
      waitAfter: 3000,
    },
  ],

  aiInjection: {
    enabled: true,
    prompt: '你在抖音创作者平台发布页面。找到视频上传区域、标题输入框和发布按钮。',
    fallbackSelectors: {
      content: ['input[placeholder*="标题"]', '.semi-input'],
      imageUpload: ['input[type="file"]'],
      publishButton: ['button[class*="publish"]', 'button:has-text("发布")'],
    },
  },

  mediaConstraints: {
    images: { max: 0, formats: [], maxSize: 0 },
    videos: { max: 1, formats: ['video/mp4', 'video/mov'], maxDuration: 900 },
  },

  contentConstraints: {
    titleMaxLength: 55,
    contentMaxLength: 500,
    hashtagMaxCount: 10,
    supportedFeatures: ['schedule', 'cover'],
  },

  loginDetection: {
    cookieName: 'sessionid',
    domIndicator: { selector: 'input[type="file"]', text: '' },
  },
};

// ─── Xiaohongshu (小红书) ─────────────────────────────────────────────────

export const xhsConfig: PlatformConfig = {
  id: 'xhs',
  name: '小红书',
  type: 'dynamic',
  icon: 'rednote',
  publishUrl: 'https://creator.xiaohongshu.com/publish/publish',
  loginUrl: 'https://creator.xiaohongshu.com/',

  pipeline: [
    {
      id: 'wait_editor',
      type: 'wait',
      target: { selector: 'input[type="file"], #post-textarea', aiHint: '小红书发布页面加载完成，出现上传区域或文本输入框' },
      value: '2000',
      waitAfter: 0,
    },
    {
      id: 'upload_images',
      type: 'upload',
      target: { selector: 'input[type="file"][accept*="image"]', aiHint: '图片上传按钮，通常在页面左上角区域' },
      waitAfter: 3000,
    },
    {
      id: 'fill_title',
      type: 'input',
      target: { selector: 'input[placeholder*="标题"], #title', aiHint: '标题输入框，placeholder 包含"标题"二字，最多20字' },
      value: { template: '{{title}}' },
      waitAfter: 500,
    },
    {
      id: 'fill_content',
      type: 'input',
      target: { selector: '#post-textarea, textarea[placeholder*="正文"]', aiHint: '正文输入框，大文本区域，placeholder 包含"正文"或"分享"或"写下" ' },
      value: { template: '{{content}}' },
      waitAfter: 1000,
    },
    {
      id: 'fill_tags',
      type: 'input',
      target: { selector: 'input[placeholder*="话题"], input[placeholder*="#"]', aiHint: '话题标签输入框，用于添加#标签' },
      value: { template: '{{tags}}' },
      optional: true,
      waitAfter: 500,
    },
    {
      id: 'click_publish',
      type: 'click',
      target: { selector: 'button:has-text("发布"), button[class*="publish"]', aiHint: '发布按钮，红色或粉色，通常位于页面右下角' },
      value: '',
      waitAfter: 3000,
    },
  ],

  aiInjection: {
    enabled: true,
    prompt: '你在小红书创作者平台发布页面。找到图片上传区域、标题输入框(最多20字)、正文输入框和发布按钮(红色)。',
    fallbackSelectors: {
      content: ['#post-textarea', 'textarea[placeholder*="正文"]', 'textarea[placeholder*="分享"]'],
      title: ['input[placeholder*="标题"]', '#title'],
      imageUpload: ['input[type="file"][accept*="image"]'],
      publishButton: ['button:has-text("发布")', 'button[class*="publish"]'],
    },
  },

  mediaConstraints: {
    images: { max: 18, formats: ['image/png', 'image/jpeg', 'image/webp'], maxSize: 20 * 1024 * 1024 },
    videos: { max: 1, formats: ['video/mp4', 'video/mov'], maxDuration: 600 },
  },

  contentConstraints: {
    titleMaxLength: 20,
    contentMaxLength: 1000,
    hashtagMaxCount: 10,
    supportedFeatures: ['schedule', 'location'],
  },

  loginDetection: {
    cookieName: 'web_session',
    domIndicator: { selector: '#post-textarea', text: '' },
  },
};

// ─── Bilibili (哔哩哔哩) ──────────────────────────────────────────────────

export const bilibiliConfig: PlatformConfig = {
  id: 'bilibili',
  name: '哔哩哔哩',
  type: 'video',
  icon: 'bilibili',
  publishUrl: 'https://member.bilibili.com/platform/upload/video/frame',
  loginUrl: 'https://member.bilibili.com/',

  pipeline: [
    {
      id: 'wait_uploader',
      type: 'wait',
      target: { selector: 'input[type="file"]', aiHint: '视频上传区域，B站创作中心页面' },
      value: '2000',
      waitAfter: 0,
    },
    {
      id: 'upload_video',
      type: 'upload',
      target: { selector: 'input[type="file"][accept*="video"]', aiHint: '视频文件选择器，页面中央上传区' },
      waitAfter: 10000,
    },
    {
      id: 'fill_title',
      type: 'input',
      target: { selector: 'input[placeholder*="标题"], input[class*="title"]', aiHint: '视频标题输入框，placeholder 包含"标题"或"请输入标题"' },
      value: { template: '{{title}}' },
      waitAfter: 500,
    },
    {
      id: 'fill_content',
      type: 'input',
      target: { selector: 'textarea[placeholder*="简介"], textarea[class*="desc"]', aiHint: '视频简介文本框，用于写视频描述' },
      value: { template: '{{content}}' },
      waitAfter: 500,
    },
    {
      id: 'fill_tags',
      type: 'input',
      target: { selector: 'input[placeholder*="标签"], input[placeholder*="tag"]', aiHint: '视频标签输入框，用于添加标签' },
      value: { template: '{{tags}}' },
      optional: true,
      waitAfter: 500,
    },
    {
      id: 'click_submit',
      type: 'click',
      target: { selector: 'button[class*="submit"], button:has-text("提交"), button:has-text("发布")', aiHint: '提交/发布按钮，粉色，位于页面下方' },
      value: '',
      waitAfter: 3000,
    },
  ],

  aiInjection: {
    enabled: true,
    prompt: '你在B站创作中心上传页面。找到视频上传区、标题输入框、简介文本框、标签输入框和提交按钮。',
    fallbackSelectors: {
      content: ['textarea[placeholder*="简介"]', 'textarea[class*="desc"]'],
      title: ['input[placeholder*="标题"]', 'input[class*="title"]'],
      videoUpload: ['input[type="file"][accept*="video"]'],
      publishButton: ['button[class*="submit"]', 'button:has-text("提交")'],
    },
  },

  mediaConstraints: {
    images: { max: 1, formats: ['image/png', 'image/jpeg'], maxSize: 5 * 1024 * 1024 },
    videos: { max: 1, formats: ['video/mp4', 'video/flv', 'video/mkv'], maxDuration: 3600 },
  },

  contentConstraints: {
    titleMaxLength: 80,
    contentMaxLength: 2000,
    hashtagMaxCount: 10,
    supportedFeatures: ['cover', 'schedule', 'collection'],
  },

  loginDetection: {
    cookieName: 'SESSDATA',
    domIndicator: { selector: 'input[type="file"]', text: '' },
  },
};

// ─── Zhihu (知乎) ─────────────────────────────────────────────────────────

export const zhihuConfig: PlatformConfig = {
  id: 'zhihu',
  name: '知乎',
  type: 'article',
  icon: 'zhihu',
  publishUrl: 'https://zhuanlan.zhihu.com/write',
  loginUrl: 'https://www.zhihu.com/signin',

  pipeline: [
    {
      id: 'wait_editor',
      type: 'wait',
      target: { selector: '.public-DraftEditor-content, .RichText', aiHint: '知乎编辑器内容区域，富文本编辑器' },
      value: '2000',
      waitAfter: 0,
    },
    {
      id: 'fill_title',
      type: 'input',
      target: { selector: 'input[placeholder*="标题"], .WriteIndex-titleInput input', aiHint: '文章标题输入框，placeholder 为"请输入标题"' },
      value: { template: '{{title}}' },
      waitAfter: 500,
    },
    {
      id: 'fill_content',
      type: 'input',
      target: { selector: '.public-DraftEditor-content, .RichText div[contenteditable]', aiHint: '文章正文编辑区域，富文本编辑器，支持粘贴HTML' },
      value: { template: '{{htmlContent}}' },
      waitAfter: 1000,
    },
    {
      id: 'click_publish',
      type: 'click',
      target: { selector: 'button[class*="publish"], button:has-text("发布")', aiHint: '发布按钮，蓝色，位于页面右上角' },
      value: '',
      waitAfter: 500,
    },
    {
      id: 'confirm_publish',
      type: 'click',
      target: { selector: 'button:has-text("确认"), button:has-text("确定")', aiHint: '确认发布弹窗中的确认按钮' },
      value: '',
      optional: true,
      waitAfter: 2000,
    },
  ],

  aiInjection: {
    enabled: true,
    prompt: '你在知乎专栏写文章页面。找到标题输入框、富文本编辑器和发布按钮。',
    fallbackSelectors: {
      title: ['input[placeholder*="标题"]', '.WriteIndex-titleInput input'],
      content: ['.public-DraftEditor-content', '.RichText div[contenteditable]'],
      publishButton: ['button[class*="publish"]', 'button:has-text("发布")'],
    },
  },

  mediaConstraints: {
    images: { max: 100, formats: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'], maxSize: 10 * 1024 * 1024 },
    videos: { max: 1, formats: ['video/mp4'], maxDuration: 1800 },
  },

  contentConstraints: {
    titleMaxLength: 100,
    contentMaxLength: 50000,
    hashtagMaxCount: 0,
    supportedFeatures: ['cover', 'schedule', 'column'],
  },

  loginDetection: {
    cookieName: 'z_c0',
    domIndicator: { selector: '.public-DraftEditor-content', text: '' },
  },
};

// ─── All Configs ──────────────────────────────────────────────────────────

export const ALL_PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  weibo: weiboConfig,
  douyin: douyinConfig,
  xhs: xhsConfig,
  bilibili: bilibiliConfig,
  zhihu: zhihuConfig,
};
