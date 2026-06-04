/**
 * MultiPost 扩展桥接层
 * 
 * 功能：通过 MultiPost 浏览器扩展，发布内容到 AiBrand 尚未直连的平台
 * 
 * 工作流程：
 * 1. 检测 MultiPost 扩展是否已安装
 * 2. 通过扩展 API 或 RESTful API 发送发布请求
 * 3. 扩展在浏览器中打开目标平台页面，自动填充并发布
 */

import { BridgePlatform } from './types';

// 支持的桥接平台列表
export const BRIDGE_PLATFORMS: BridgePlatform[] = [
  // ===== 文章平台 =====
  {
    id: 'zhihu',
    name: '知乎',
    icon: 'zhihu',
    type: 'article',
    color: '#0084FF',
    description: '发布文章到知乎专栏',
    multipostId: 'article-zhihu',
    injectUrl: 'https://zhuanlan.zhihu.com/write',
    enabled: true,
  },
  {
    id: 'weixin',
    name: '微信公众号',
    icon: 'weixin',
    type: 'article',
    color: '#07C160',
    description: '发布文章到微信公众号',
    multipostId: 'article-weixin',
    injectUrl: 'https://mp.weixin.qq.com/',
    enabled: true,
  },
  {
    id: 'csdn',
    name: 'CSDN',
    icon: 'csdn',
    type: 'article',
    color: '#FC5531',
    description: '发布文章到 CSDN 博客',
    multipostId: 'article-csdn',
    injectUrl: 'https://blog.csdn.net/',
    enabled: true,
  },
  {
    id: 'juejin',
    name: '掘金',
    icon: 'juejin',
    type: 'article',
    color: '#1E80FF',
    description: '发布文章到掘金社区',
    multipostId: 'article-juejin',
    injectUrl: 'https://juejin.cn/',
    enabled: true,
  },
  {
    id: 'jianshu',
    name: '简书',
    icon: 'jianshu',
    type: 'article',
    color: '#EA6F5A',
    description: '发布文章到简书',
    multipostId: 'article-jianshu',
    injectUrl: 'https://www.jianshu.com/',
    enabled: true,
  },
  {
    id: 'wordpress',
    name: 'WordPress',
    icon: 'wordpress',
    type: 'article',
    color: '#21759B',
    description: '发布到自建 WordPress 站点',
    multipostId: 'article-wordpress',
    injectUrl: null,
    enabled: true,
  },
  {
    id: 'substack',
    name: 'Substack',
    icon: 'substack',
    type: 'article',
    color: '#FF6719',
    description: '发布到 Substack  Newsletter',
    multipostId: 'article-substack',
    injectUrl: 'https://substack.com/',
    enabled: true,
  },
  {
    id: 'baijiahao',
    name: '百家号',
    icon: 'baijiahao',
    type: 'article',
    color: '#FE2D4A',
    description: '发布文章到百度百家号',
    multipostId: 'article-baijiahao',
    injectUrl: 'https://baijiahao.baidu.com/',
    enabled: true,
  },
  {
    id: 'toutiao',
    name: '今日头条',
    icon: 'toutiao',
    type: 'article',
    color: '#FF6B6B',
    description: '发布文章到今日头条',
    multipostId: 'article-toutiao',
    injectUrl: 'https://mp.toutiao.com/',
    enabled: true,
  },
  {
    id: 'xueqiu',
    name: '雪球',
    icon: 'xueqiu',
    type: 'article',
    color: '#E03940',
    description: '发布投资分析到雪球',
    multipostId: 'article-xueqiu',
    injectUrl: 'https://xueqiu.com/',
    enabled: true,
  },
  // ===== 动态/帖子平台 =====
  {
    id: 'rednote',
    name: '小红书',
    icon: 'rednote',
    type: 'dynamic',
    color: '#FF2442',
    description: '发布图文/视频到小红书',
    multipostId: 'dynamic-rednote',
    injectUrl: 'https://www.xiaohongshu.com/',
    enabled: true,
  },
  {
    id: 'weibo',
    name: '微博',
    icon: 'weibo',
    type: 'dynamic',
    color: '#FF8200',
    description: '发布动态到微博',
    multipostId: 'dynamic-weibo',
    injectUrl: 'https://weibo.com/',
    enabled: true,
  },
  {
    id: 'douban',
    name: '豆瓣',
    icon: 'douban',
    type: 'dynamic',
    color: '#319532',
    description: '发布动态到豆瓣',
    multipostId: 'dynamic-douban',
    injectUrl: 'https://www.douban.com/',
    enabled: true,
  },
  {
    id: 'reddit',
    name: 'Reddit',
    icon: 'reddit',
    type: 'dynamic',
    color: '#FF4500',
    description: '发布到 Reddit',
    multipostId: 'dynamic-reddit',
    injectUrl: 'https://www.reddit.com/',
    enabled: true,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: 'linkedin',
    type: 'dynamic',
    color: '#0A66C2',
    description: '发布动态到 LinkedIn',
    multipostId: 'dynamic-linkedin',
    injectUrl: 'https://www.linkedin.com/',
    enabled: true,
  },
  {
    id: 'facebook',
    name: 'Facebook(桥接)',
    icon: 'facebook',
    type: 'dynamic',
    color: '#1877F2',
    description: '通过扩展发布到 Facebook',
    multipostId: 'dynamic-facebook',
    injectUrl: 'https://www.facebook.com/',
    enabled: true,
  },
  {
    id: 'bluesky',
    name: 'Bluesky',
    icon: 'bluesky',
    type: 'dynamic',
    color: '#0085FF',
    description: '发布到 Bluesky 社交',
    multipostId: 'dynamic-bluesky',
    injectUrl: 'https://bsky.app/',
    enabled: true,
  },
  {
    id: 'threads',
    name: 'Threads(桥接)',
    icon: 'threads',
    type: 'dynamic',
    color: '#000000',
    description: '通过扩展发布到 Threads',
    multipostId: 'dynamic-threads',
    injectUrl: 'https://www.threads.net/',
    enabled: true,
  },
  // ===== 视频平台 =====
  {
    id: 'kuaishou',
    name: '快手(桥接)',
    icon: 'kuaishou',
    type: 'video',
    color: '#FF4906',
    description: '通过扩展发布视频到快手',
    multipostId: 'video-kuaishou',
    injectUrl: 'https://www.kuaishou.com/',
    enabled: true,
  },
  {
    id: 'weixinchannel',
    name: '微信视频号',
    icon: 'weixinchannel',
    type: 'video',
    color: '#07C160',
    description: '发布视频到微信视频号',
    multipostId: 'video-weixinchannel',
    injectUrl: 'https://channels.weixin.qq.com/',
    enabled: true,
  },
];

/**
 * 检测 MultiPost 扩展是否已安装
 */
export async function detectMultiPostExtension(): Promise<boolean> {
  try {
    // 方式 1: 通过 window 自定义事件检测
    const detail = await new Promise<any>((resolve) => {
      const handler = (e: Event) => resolve((e as CustomEvent).detail);
      window.addEventListener('multipost-detected', handler, { once: true });
      window.dispatchEvent(new CustomEvent('multipost-ping'));
      setTimeout(() => {
        window.removeEventListener('multipost-detected', handler);
        resolve(null);
      }, 500);
    });
    if (detail) return true;

    // 方式 2: 检查 chrome.runtime (仅限扩展环境)
    if (typeof (window as any).chrome !== 'undefined' && (window as any).chrome.runtime?.id) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * 通过 MultiPost 扩展 API 发布内容
 * 浏览器扩展注入模式：扩展在目标平台页面中自动填充内容
 */
export async function publishViaExtension(
  platform: BridgePlatform,
  content: {
    title?: string;
    content: string;
    images?: File[];
    videos?: File[];
    htmlContent?: string;
  }
): Promise<{ success: boolean; message: string }> {
  // 收集所有 blob URL，完成后释放
  const blobUrls: string[] = []

  try {
    // 构造发送给 MultiPost 扩展的数据
    const images = content.images?.map((f) => {
      const url = URL.createObjectURL(f)
      blobUrls.push(url)
      return { name: f.name, url, type: f.type, size: f.size }
    }) || []

    const videos = content.videos?.map((f) => {
      const url = URL.createObjectURL(f)
      blobUrls.push(url)
      return { name: f.name, url, type: f.type, size: f.size }
    }) || []

    const publishData = {
      platforms: [{ name: platform.multipostId }],
      isAutoPublish: true,
      data: {
        title: content.title || '',
        content: content.content,
        images,
        videos,
        htmlContent: content.htmlContent || content.content,
      },
    }

    // 释放 blob URL 的辅助函数
    const cleanup = () => blobUrls.forEach(url => URL.revokeObjectURL(url))

    // 通过扩展消息 API 发送
    if (typeof (window as any).chrome !== 'undefined' && (window as any).chrome.runtime?.id) {
      return new Promise((resolve) => {
        (window as any).chrome.runtime.sendMessage(
          { type: 'MULTIPOST_PUBLISH', data: publishData },
          (response: { success?: boolean; error?: string }) => {
            cleanup()
            if (response?.success) {
              resolve({ success: true, message: '发布成功' })
            } else {
              resolve({ success: false, message: response?.error || '发布失败' })
            }
          },
        )
        setTimeout(() => {
          cleanup()
          resolve({ success: false, message: '扩展响应超时' })
        }, 30000)
      })
    }

    // 降级：打开平台发布页面，让用户手动操作
    if (platform.injectUrl) {
      window.open(platform.injectUrl, '_blank');
      return {
        success: true,
        message: `已打开 ${platform.name} 发布页面，请手动完成发布`,
      };
    }

    return { success: false, message: 'MultiPost 扩展未安装' };
  } catch (error: any) {
    return { success: false, message: `发布异常: ${error.message}` };
  }
}

/**
 * 获取可用的桥接平台（过滤已禁用的）
 */
export function getAvailableBridgePlatforms(): BridgePlatform[] {
  return BRIDGE_PLATFORMS.filter((p) => p.enabled);
}

/**
 * 按类型分组获取桥接平台
 */
export function getBridgePlatformsByType(): Record<string, BridgePlatform[]> {
  const groups: Record<string, BridgePlatform[]> = {};
  BRIDGE_PLATFORMS.filter((p) => p.enabled).forEach((p) => {
    if (!groups[p.type]) groups[p.type] = [];
    groups[p.type].push(p);
  });
  return groups;
}
