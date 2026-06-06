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

export const BRIDGE_PLATFORMS: BridgePlatform[] = [
  // Keep existing platform definitions as static fallback
  // These are used when the extension is not available to fetch dynamic platforms
  {
    id: 'zhihu', name: '知乎', icon: 'zhihu', type: 'article', color: '#0084FF',
    description: '发布文章到知乎专栏', multipostId: 'ARTICLE_ZHIHU',
    injectUrl: 'https://zhuanlan.zhihu.com/write', enabled: true,
  },
  {
    id: 'rednote', name: '小红书', icon: 'rednote', type: 'dynamic', color: '#FF2442',
    description: '发布图文/视频到小红书（支持深度互动）', multipostId: 'DYNAMIC_REDNOTE',
    injectUrl: 'https://creator.xiaohongshu.com/publish/publish?target=image', enabled: true,
  },
  {
    id: 'douyin', name: '抖音', icon: 'douyin', type: 'video', color: '#000000',
    description: '发布视频到抖音（支持深度互动）', multipostId: 'DYNAMIC_DOUYIN',
    injectUrl: 'https://creator.douyin.com/creator-micro/content/upload?default-tab=3', enabled: true,
  },
  {
    id: 'weibo', name: '微博', icon: 'weibo', type: 'dynamic', color: '#FF8200',
    description: '发布动态到微博', multipostId: 'DYNAMIC_WEIBO',
    injectUrl: 'https://weibo.com/', enabled: true,
  },
  {
    id: 'bilibili', name: 'Bilibili', icon: 'bilibili', type: 'video', color: '#FB7299',
    description: '发布视频到B站', multipostId: 'DYNAMIC_BILIBILI',
    injectUrl: 'https://t.bilibili.com/', enabled: true,
  },
  {
    id: 'x', name: 'X (Twitter)', icon: 'x', type: 'dynamic', color: '#1DA1F2',
    description: '发布到 X/Twitter', multipostId: 'DYNAMIC_X',
    injectUrl: 'https://x.com/home', enabled: true,
  },
  {
    id: 'youtube', name: 'YouTube', icon: 'youtube', type: 'video', color: '#FF0000',
    description: '发布视频到 YouTube', multipostId: 'VIDEO_YOUTUBE',
    injectUrl: 'https://studio.youtube.com/', enabled: true,
  },
  {
    id: 'instagram', name: 'Instagram', icon: 'instagram', type: 'dynamic', color: '#E4405F',
    description: '发布到 Instagram', multipostId: 'DYNAMIC_INSTAGRAM',
    injectUrl: 'https://www.instagram.com/', enabled: true,
  },
  {
    id: 'linkedin', name: 'LinkedIn', icon: 'linkedin', type: 'dynamic', color: '#0A66C2',
    description: '发布到 LinkedIn', multipostId: 'DYNAMIC_LINKEDIN',
    injectUrl: 'https://www.linkedin.com/feed/', enabled: true,
  },
  {
    id: 'facebook', name: 'Facebook', icon: 'facebook', type: 'dynamic', color: '#1877F2',
    description: '发布到 Facebook', multipostId: 'DYNAMIC_FACEBOOK',
    injectUrl: 'https://www.facebook.com/', enabled: true,
  },
  {
    id: 'tiktok', name: 'TikTok', icon: 'tiktok', type: 'video', color: '#69C9D0',
    description: '发布视频到 TikTok', multipostId: 'VIDEO_TIKTOK',
    injectUrl: 'https://www.tiktok.com/upload/', enabled: true,
  },
];

// ===== Helpers =====

export function getAvailableBridgePlatforms(): BridgePlatform[] {
  return BRIDGE_PLATFORMS.filter((p) => p.enabled);
}

export function getBridgePlatformsByType(): Record<string, BridgePlatform[]> {
  const groups: Record<string, BridgePlatform[]> = {};
  BRIDGE_PLATFORMS.filter((p) => p.enabled).forEach((p) => {
    if (!groups[p.type]) groups[p.type] = [];
    groups[p.type].push(p);
  });
  return groups;
}
