/**
 * 桥接平台类型定义
 */

/**
 * 桥接平台配置
 */
export interface BridgePlatform {
  /** 平台唯一标识 */
  id: string;
  /** 平台显示名称 */
  name: string;
  /** 平台图标标识 */
  icon: string;
  /** 内容类型 */
  type: 'article' | 'dynamic' | 'video' | 'podcast';
  /** 主题色 */
  color: string;
  /** 描述 */
  description: string;
  /** 对应 MultiPost 的适配器 ID */
  multipostId: string;
  /** 注入 URL（扩展打开哪个页面进行发布） */
  injectUrl: string | null;
  /** 是否启用 */
  enabled: boolean;
}

/**
 * 发布内容数据
 */
export interface BridgePublishData {
  title?: string;
  content: string;
  htmlContent?: string;
  images?: FileData[];
  videos?: FileData[];
  tags?: string[];
  scheduledPublishTime?: number;
}

export interface FileData {
  name: string;
  url: string;
  type?: string;
  size?: number;
}

/**
 * 发布结果
 */
export interface BridgePublishResult {
  success: boolean;
  message: string;
  platformId?: string;
}
