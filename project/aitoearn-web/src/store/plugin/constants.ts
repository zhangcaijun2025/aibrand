/**
 * 浏览器插件相关常量定义
 */

/**
 * 默认轮询间隔（毫秒）
 */
export const DEFAULT_POLLING_INTERVAL = 2000

/**
 * 插件下载链接配置
 */
export const PLUGIN_DOWNLOAD_LINKS = {
  chrome:
    'https://chromewebstore.google.com/detail/aibrand-extension/hnmocdhmnfgcjnedmdgfefcobideaeja',
  china: 'https://aibrand.oss-cn-beijing.aliyuncs.com/extension/aibrand-extension.crx',
} as const

/**
 * 小红书创作者后台地址
 */
export const XHS_CREATOR_URL = 'https://creator.xiaohongshu.com/'

/**
 * 抖音 API 端点（通过插件代理请求）
 */
export const DOUYIN_API = {
  /** 首页推荐 Feed */
  FEED: 'https://www.douyin.com/aweme/v2/web/module/feed/',
  /** 用户主页 */
  USER_PROFILE: 'https://www.douyin.com/user/',
  /** 精选搜索 */
  SEARCH: 'https://www.douyin.com/jingxuan/search/',
} as const

/**
 * 插件状态国际化 key 映射
 */
export const PLUGIN_STATUS_I18N_KEY = {
  UNKNOWN: 'plugin:status.unknown',
  CHECKING: 'plugin:status.checking',
  READY: 'plugin:status.ready',
  INSTALLED_NO_PERMISSION: 'plugin:status.installedNoPermission',
  NOT_INSTALLED: 'plugin:status.notInstalled',
  // 兼容旧代码
  CONNECTED: 'plugin:status.ready',
} as const

/**
 * 发布阶段国际化 key 映射
 */
export const PUBLISH_STAGE_I18N_KEY = {
  download: 'plugin:stage.download',
  upload: 'plugin:stage.upload',
  publish: 'plugin:stage.publish',
  complete: 'plugin:stage.complete',
  error: 'plugin:stage.error',
} as const

/**
 * 错误消息国际化 key
 */
export const ERROR_MESSAGE_I18N_KEY = {
  PLUGIN_NOT_INSTALLED: 'plugin:error.pluginNotInstalled',
  PUBLISHING_IN_PROGRESS: 'plugin:error.publishingInProgress',
  LOGIN_FAILED: 'plugin:error.loginFailed',
  PUBLISH_FAILED: 'plugin:error.publishFailed',
} as const

/**
 * 任务状态国际化 key 映射
 */
export const TASK_STATUS_I18N_KEY = {
  pending: 'plugin:common.pending',
  publishing: 'plugin:common.publishing',
  completed: 'plugin:common.completed',
  error: 'plugin:common.error',
} as const
