/**
 * AiBrand Unified Extension Bridge
 *
 * Communicates with the AiBrand Extension (forked from MultiPost) via the
 * standard window.postMessage protocol with traceId-based message correlation.
 *
 * Supports both MULTIPOST_* (upstream compat) and AIBRAND_* (new) action prefixes.
 *
 * Protocol:
 *   Web App → window.postMessage → Extension Content Script → Background SW
 *   Background SW → Content Script → window.postMessage → Web App
 *
 * v2.0: Rewritten to use correct postMessage protocol with full API coverage.
 */

import { BridgePlatform } from './types';

// ===== Message Protocol Types =====

interface ExtensionRequest<T = any> {
  type: 'request';
  traceId: string;
  action: string;
  data: T;
}

interface ExtensionResponse<T = any> {
  type: 'response';
  traceId: string;
  action: string;
  code: number;
  message: string;
  data: T;
}

// ===== Extension API =====

function sendToExtension<T = any>(action: string, data: any = {}, timeout = 10000): Promise<T> {
  return new Promise((resolve, reject) => {
    const traceId = crypto.randomUUID();

    const handler = (event: MessageEvent) => {
      const response = event.data as ExtensionResponse<T>;
      if (response?.type === 'response' && response.traceId === traceId) {
        window.removeEventListener('message', handler);
        clearTimeout(timer);

        if (response.code === 403) {
          reject(new Error('域名未授权: 请在扩展设置中将此网站添加为信任域名'));
          return;
        }
        if (response.code !== 0) {
          reject(new Error(response.message || 'Extension error'));
          return;
        }
        resolve(response.data);
      }
    };

    window.addEventListener('message', handler);

    const timer = setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('扩展响应超时'));
    }, timeout);

    window.postMessage(
      {
        type: 'request',
        traceId,
        action,
        data,
      } as ExtensionRequest,
      '*',
    );
  });
}

// ===== Detection =====

/**
 * Detect if the AiBrand/MultiPost extension is installed and ready
 */
export async function detectMultiPostExtension(): Promise<boolean> {
  try {
    const result = await sendToExtension<{ extensionId: string }>(
      'AIBRAND_EXTENSION_CHECK_SERVICE_STATUS',
    );
    return !!result?.extensionId;
  } catch {
    // Also try MULTIPOST prefix for upstream compat
    try {
      const result = await sendToExtension<{ extensionId: string }>(
        'MULTIPOST_EXTENSION_CHECK_SERVICE_STATUS',
      );
      return !!result?.extensionId;
    } catch {
      return false;
    }
  }
}

// ===== Platforms =====

/**
 * Get the full list of available platforms from the extension (dynamic, not hardcoded)
 */
export async function getExtensionPlatforms(): Promise<any[]> {
  try {
    const result = await sendToExtension<{ platforms: any[] }>(
      'AIBRAND_EXTENSION_PLATFORMS',
      {},
      15000,
    );
    return result?.platforms || [];
  } catch {
    // Fallback to MULTIPOST prefix
    try {
      const result = await sendToExtension<{ platforms: any[] }>(
        'MULTIPOST_EXTENSION_PLATFORMS',
        {},
        15000,
      );
      return result?.platforms || [];
    } catch {
      console.warn('[ExtensionBridge] Failed to get platforms');
      return [];
    }
  }
}

// ===== Accounts =====

/**
 * Get all platform account info from the extension
 */
export async function getExtensionAccounts(): Promise<any[]> {
  try {
    const result = await sendToExtension<{ accountInfo: any[] }>(
      'AIBRAND_EXTENSION_GET_ACCOUNT_INFOS',
    );
    return result?.accountInfo || [];
  } catch {
    try {
      const result = await sendToExtension<{ accountInfo: any[] }>(
        'MULTIPOST_EXTENSION_GET_ACCOUNT_INFOS',
      );
      return result?.accountInfo || [];
    } catch {
      return [];
    }
  }
}

/**
 * Refresh account info for all platforms
 */
export async function refreshExtensionAccounts(isFocused = false): Promise<void> {
  try {
    await sendToExtension('AIBRAND_EXTENSION_REFRESH_ACCOUNT_INFOS', { isFocused });
  } catch {
    await sendToExtension('MULTIPOST_EXTENSION_REFRESH_ACCOUNT_INFOS', { isFocused });
  }
}

// ===== Publishing =====

/**
 * Publish content via the extension (opens publish popup or executes directly)
 */
export async function publishViaExtension(
  platform: BridgePlatform,
  content: {
    title?: string;
    content: string;
    images?: File[];
    videos?: File[];
    htmlContent?: string;
    tags?: string[];
  },
): Promise<{ success: boolean; message: string }> {
  const blobUrls: string[] = [];

  try {
    // Convert File objects to FileData (blob URLs)
    const images = (content.images || []).map((f) => {
      const url = URL.createObjectURL(f);
      blobUrls.push(url);
      return { name: f.name, url, type: f.type, size: f.size };
    });

    const videos = (content.videos || []).map((f) => {
      const url = URL.createObjectURL(f);
      blobUrls.push(url);
      return { name: f.name, url, type: f.type, size: f.size };
    });

    const syncData = {
      platforms: [{ name: platform.multipostId }],
      isAutoPublish: true,
      data: {
        title: content.title || '',
        content: content.content,
        images,
        videos,
        tags: content.tags || [],
      },
    };

    // Try AIBRAND prefix first
    const action = platform.multipostId?.startsWith('DYNAMIC_')
      ? 'AIBRAND_EXTENSION_PUBLISH_NOW'
      : 'MULTIPOST_EXTENSION_PUBLISH_NOW';

    await sendToExtension(action, syncData, 120000);

    return { success: true, message: `已发送到 ${platform.name}` };
  } catch (error: any) {
    // Fallback: open platform URL directly
    if (platform.injectUrl) {
      window.open(platform.injectUrl, '_blank');
      return {
        success: true,
        message: `已打开 ${platform.name} 发布页面，请手动完成发布`,
      };
    }
    return { success: false, message: `发布失败: ${error.message}` };
  } finally {
    // Cleanup blob URLs
    blobUrls.forEach((url) => URL.revokeObjectURL(url));
  }
}

// ===== Interaction (AiBrand Exclusive) =====

/**
 * Like/unlike a work on a platform
 */
export async function likeWork(
  platformType: string,
  workId: string,
  isLike: boolean,
): Promise<{ success: boolean; message: string }> {
  try {
    return await sendToExtension('AIBRAND_EXTENSION_INTERACTION_LIKE', {
      platformType,
      workId,
      isLike,
    });
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Comment on a work
 */
export async function commentWork(
  platformType: string,
  params: { workId: string; content: string; replyToCommentId?: string },
): Promise<{ success: boolean; message: string }> {
  try {
    return await sendToExtension('AIBRAND_EXTENSION_INTERACTION_COMMENT', {
      platformType,
      ...params,
    });
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Favorite/unfavorite a work
 */
export async function favoriteWork(
  platformType: string,
  workId: string,
  isFavorite: boolean,
): Promise<{ success: boolean; message: string }> {
  try {
    return await sendToExtension('AIBRAND_EXTENSION_INTERACTION_FAVORITE', {
      platformType,
      workId,
      isFavorite,
    });
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Get home feed from a platform
 */
export async function getHomeFeed(
  platformType: string,
  page = 1,
  size = 20,
): Promise<{ success: boolean; items: any[]; hasMore: boolean }> {
  try {
    return await sendToExtension('AIBRAND_EXTENSION_INTERACTION_FEED', {
      platformType,
      page,
      size,
    });
  } catch (error: any) {
    return { success: false, items: [], hasMore: false };
  }
}

/**
 * Get work detail from a platform
 */
export async function getWorkDetail(
  platformType: string,
  params: { workId: string; xsecToken?: string; xsecSource?: string },
): Promise<{ success: boolean; detail?: any; message?: string }> {
  try {
    return await sendToExtension('AIBRAND_EXTENSION_INTERACTION_WORK_DETAIL', {
      platformType,
      ...params,
    });
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// ===== Legacy Bridge Platform List (static fallback) =====

// Static fallback platform list — used when extension is not installed.
// Primary source is dynamic getExtensionPlatforms() which returns 100+ platforms.
// Sorted by type: article | dynamic | video | podcast

export const BRIDGE_PLATFORMS: BridgePlatform[] = [
  // ── Article platforms (~20) ──
  { id: 'zhihu', name: '知乎', icon: 'zhihu', type: 'article', color: '#0084FF', description: '发布文章到知乎专栏', multipostId: 'ARTICLE_ZHIHU', injectUrl: 'https://zhuanlan.zhihu.com/write', enabled: true },
  { id: 'csdn', name: 'CSDN', icon: 'csdn', type: 'article', color: '#FC5531', description: '发布技术文章到 CSDN', multipostId: 'ARTICLE_CSDN', injectUrl: 'https://mp.csdn.net/mp_blog/creation/editor', enabled: true },
  { id: 'juejin', name: '掘金', icon: 'juejin', type: 'article', color: '#1E80FF', description: '发布文章到掘金社区', multipostId: 'ARTICLE_JUEJIN', injectUrl: 'https://juejin.cn/editor/drafts/new', enabled: true },
  { id: 'jianshu', name: '简书', icon: 'jianshu', type: 'article', color: '#EA6F5A', description: '发布文章到简书', multipostId: 'ARTICLE_JIANSHU', injectUrl: 'https://www.jianshu.com/writer', enabled: true },
  { id: 'weixin_article', name: '微信公众号', icon: 'wechat', type: 'article', color: '#07C160', description: '发布文章到微信公众号', multipostId: 'ARTICLE_WEIXIN', injectUrl: 'https://mp.weixin.qq.com/', enabled: true },
  { id: 'toutiao', name: '今日头条', icon: 'toutiao', type: 'article', color: '#E5332B', description: '发布文章到今日头条', multipostId: 'ARTICLE_TOUTIAO', injectUrl: 'https://mp.toutiao.com/', enabled: true },
  { id: 'medium', name: 'Medium', icon: 'medium', type: 'article', color: '#000000', description: 'Publish article on Medium', multipostId: 'ARTICLE_MEDIUM', injectUrl: 'https://medium.com/new-story', enabled: true },
  { id: 'devto', name: 'Dev.to', icon: 'devto', type: 'article', color: '#0A0A0A', description: 'Publish on Dev.to', multipostId: 'ARTICLE_DEVTO', injectUrl: 'https://dev.to/new', enabled: true },
  { id: 'wordpress', name: 'WordPress', icon: 'wordpress', type: 'article', color: '#21759B', description: 'Publish to WordPress blog', multipostId: 'ARTICLE_WORDPRESS', injectUrl: 'https://wordpress.com/post', enabled: true },
  { id: 'segmentfault', name: '思否', icon: 'sf', type: 'article', color: '#009A61', description: '发布文章到 SegmentFault', multipostId: 'ARTICLE_SEGMENTFAULT', injectUrl: 'https://segmentfault.com/write', enabled: true },
  { id: 'baijiahao', name: '百家号', icon: 'baidu', type: 'article', color: '#2932E1', description: '发布到百度百家号', multipostId: 'ARTICLE_BAIJIAHAO', injectUrl: 'https://baijiahao.baidu.com/', enabled: true },
  { id: 'wangyihao', name: '网易号', icon: 'netease', type: 'article', color: '#E60012', description: '发布到网易号', multipostId: 'ARTICLE_WANGYIHAO', injectUrl: 'https://mp.163.com/', enabled: true },
  { id: 'sohuhao', name: '搜狐号', icon: 'sohu', type: 'article', color: '#FFD100', description: '发布到搜狐号', multipostId: 'ARTICLE_SOHUHAO', injectUrl: 'https://mp.sohu.com/', enabled: true },
  { id: 'substack', name: 'Substack', icon: 'substack', type: 'article', color: '#FF6719', description: 'Publish newsletter on Substack', multipostId: 'ARTICLE_SUBSTACK', injectUrl: 'https://substack.com/publish', enabled: true },

  // ── Dynamic platforms (~20) ──
  { id: 'rednote', name: '小红书', icon: 'rednote', type: 'dynamic', color: '#FF2442', description: '发布图文/视频到小红书', multipostId: 'DYNAMIC_REDNOTE', injectUrl: 'https://creator.xiaohongshu.com/publish/publish?target=image', enabled: true },
  { id: 'weibo', name: '微博', icon: 'weibo', type: 'dynamic', color: '#FF8200', description: '发布动态到微博', multipostId: 'DYNAMIC_WEIBO', injectUrl: 'https://weibo.com/', enabled: true },
  { id: 'douyin_dynamic', name: '抖音动态', icon: 'douyin', type: 'dynamic', color: '#000000', description: '发布图文动态到抖音', multipostId: 'DYNAMIC_DOUYIN', injectUrl: 'https://creator.douyin.com/', enabled: true },
  { id: 'x', name: 'X (Twitter)', icon: 'x', type: 'dynamic', color: '#1DA1F2', description: '发布推文到 X/Twitter', multipostId: 'DYNAMIC_X', injectUrl: 'https://x.com/home', enabled: true },
  { id: 'instagram', name: 'Instagram', icon: 'instagram', type: 'dynamic', color: '#E4405F', description: '发布到 Instagram Feed', multipostId: 'DYNAMIC_INSTAGRAM', injectUrl: 'https://www.instagram.com/', enabled: true },
  { id: 'linkedin', name: 'LinkedIn', icon: 'linkedin', type: 'dynamic', color: '#0A66C2', description: '发布到 LinkedIn', multipostId: 'DYNAMIC_LINKEDIN', injectUrl: 'https://www.linkedin.com/feed/', enabled: true },
  { id: 'facebook', name: 'Facebook', icon: 'facebook', type: 'dynamic', color: '#1877F2', description: '发布到 Facebook', multipostId: 'DYNAMIC_FACEBOOK', injectUrl: 'https://www.facebook.com/', enabled: true },
  { id: 'bilibili_dynamic', name: 'B站动态', icon: 'bilibili', type: 'dynamic', color: '#FB7299', description: '发布动态到B站', multipostId: 'DYNAMIC_BILIBILI', injectUrl: 'https://t.bilibili.com/', enabled: true },
  { id: 'threads', name: 'Threads', icon: 'threads', type: 'dynamic', color: '#000000', description: '发布到 Threads', multipostId: 'DYNAMIC_THREADS', injectUrl: 'https://www.threads.net/', enabled: true },
  { id: 'bluesky', name: 'Bluesky', icon: 'bluesky', type: 'dynamic', color: '#1083FE', description: '发布到 Bluesky', multipostId: 'DYNAMIC_BLUESKY', injectUrl: 'https://bsky.app/', enabled: true },
  { id: 'quora', name: 'Quora', icon: 'quora', type: 'dynamic', color: '#B92B27', description: '发布到 Quora', multipostId: 'DYNAMIC_QUORA', injectUrl: 'https://www.quora.com/', enabled: true },
  { id: 'reddit', name: 'Reddit', icon: 'reddit', type: 'dynamic', color: '#FF4500', description: '发布到 Reddit', multipostId: 'DYNAMIC_REDDIT', injectUrl: 'https://www.reddit.com/submit', enabled: true },
  { id: 'pinterest', name: 'Pinterest', icon: 'pinterest', type: 'dynamic', color: '#BD081C', description: '发布 Pin 到 Pinterest', multipostId: 'DYNAMIC_PINTEREST', injectUrl: 'https://www.pinterest.com/pin-builder/', enabled: true },
  { id: 'zhihu_dynamic', name: '知乎想法', icon: 'zhihu', type: 'dynamic', color: '#0084FF', description: '发布想法到知乎', multipostId: 'DYNAMIC_ZHIHU', injectUrl: 'https://www.zhihu.com/', enabled: true },

  // ── Video platforms (~15) ──
  { id: 'douyin', name: '抖音', icon: 'douyin', type: 'video', color: '#000000', description: '发布视频到抖音', multipostId: 'VIDEO_DOUYIN', injectUrl: 'https://creator.douyin.com/creator-micro/content/upload', enabled: true },
  { id: 'bilibili', name: 'Bilibili', icon: 'bilibili', type: 'video', color: '#FB7299', description: '发布视频到B站', multipostId: 'VIDEO_BILIBILI', injectUrl: 'https://member.bilibili.com/platform/upload/video/frame', enabled: true },
  { id: 'youtube', name: 'YouTube', icon: 'youtube', type: 'video', color: '#FF0000', description: '发布视频到 YouTube', multipostId: 'VIDEO_YOUTUBE', injectUrl: 'https://studio.youtube.com/', enabled: true },
  { id: 'tiktok', name: 'TikTok', icon: 'tiktok', type: 'video', color: '#69C9D0', description: '发布视频到 TikTok', multipostId: 'VIDEO_TIKTOK', injectUrl: 'https://www.tiktok.com/upload/', enabled: true },
  { id: 'kuaishou', name: '快手', icon: 'kuaishou', type: 'video', color: '#FF4906', description: '发布视频到快手', multipostId: 'VIDEO_KUAISHOU', injectUrl: 'https://cp.kuaishou.com/', enabled: true },
  { id: 'weishi', name: '微视', icon: 'weishi', type: 'video', color: '#FF5A00', description: '发布视频到腾讯微视', multipostId: 'VIDEO_WEISHI', injectUrl: 'https://weishi.qq.com/', enabled: true },
  { id: 'xigua', name: '西瓜视频', icon: 'xigua', type: 'video', color: '#F0412A', description: '发布视频到西瓜视频', multipostId: 'VIDEO_XIGUA', injectUrl: 'https://studio.ixigua.com/', enabled: true },
  { id: 'iqiyi', name: '爱奇艺号', icon: 'iqiyi', type: 'video', color: '#00BE00', description: '发布视频到爱奇艺号', multipostId: 'VIDEO_IQIYI', injectUrl: 'https://mp.iqiyi.com/', enabled: true },
  { id: 'youku', name: '优酷号', icon: 'youku', type: 'video', color: '#00A7E0', description: '发布视频到优酷号', multipostId: 'VIDEO_YOUKU', injectUrl: 'https://mp.youku.com/', enabled: true },
  { id: 'youtube_shorts', name: 'YouTube Shorts', icon: 'youtube', type: 'video', color: '#FF0000', description: '发布短视频到 YouTube Shorts', multipostId: 'VIDEO_YOUTUBE_SHORTS', injectUrl: 'https://studio.youtube.com/', enabled: true },
  { id: 'instagram_reels', name: 'Instagram Reels', icon: 'instagram', type: 'video', color: '#E4405F', description: '发布 Reels 到 Instagram', multipostId: 'VIDEO_INSTAGRAM_REELS', injectUrl: 'https://www.instagram.com/', enabled: true },

  // ── Podcast platforms (7) ──
  { id: 'xiaoyuzhou', name: '小宇宙', icon: 'podcast', type: 'podcast', color: '#6C5CE7', description: '发布播客到小宇宙', multipostId: 'PODCAST_XIAOYUZHOU', injectUrl: 'https://podcast-admin.xiaoyuzhoufm.com/', enabled: true },
  { id: 'ximalaya', name: '喜马拉雅', icon: 'podcast', type: 'podcast', color: '#FC5531', description: '发布音频到喜马拉雅', multipostId: 'PODCAST_XIMALAYA', injectUrl: 'https://www.ximalaya.com/upload/', enabled: true },
  { id: 'lizhi', name: '荔枝', icon: 'podcast', type: 'podcast', color: '#D82C2C', description: '发布播客到荔枝FM', multipostId: 'PODCAST_LIZHI', injectUrl: 'https://www.lizhi.fm/', enabled: true },
  { id: 'qingting', name: '蜻蜓FM', icon: 'podcast', type: 'podcast', color: '#0099FF', description: '发布播客到蜻蜓FM', multipostId: 'PODCAST_QINGTING', injectUrl: 'https://www.qingting.fm/', enabled: true },
  { id: 'spotify_podcast', name: 'Spotify', icon: 'spotify', type: 'podcast', color: '#1DB954', description: 'Publish podcast to Spotify', multipostId: 'PODCAST_SPOTIFY', injectUrl: 'https://podcasters.spotify.com/', enabled: true },
  { id: 'apple_podcast', name: 'Apple Podcasts', icon: 'apple', type: 'podcast', color: '#872EC4', description: 'Publish to Apple Podcasts', multipostId: 'PODCAST_APPLE', injectUrl: 'https://podcastsconnect.apple.com/', enabled: true },
];

// ===== Helpers =====

export function getAvailableBridgePlatforms(): BridgePlatform[] {
  return BRIDGE_PLATFORMS.filter((p) => p.enabled);
}

export function getBridgePlatformsByType(): Record<'article' | 'dynamic' | 'video' | 'podcast', BridgePlatform[]> {
  const groups: Record<string, BridgePlatform[]> = { article: [], dynamic: [], video: [], podcast: [] };
  BRIDGE_PLATFORMS.filter((p) => p.enabled).forEach((p) => {
    if (!groups[p.type]) groups[p.type] = [];
    groups[p.type].push(p);
  });
  return groups as Record<'article' | 'dynamic' | 'video' | 'podcast', BridgePlatform[]>;
}
