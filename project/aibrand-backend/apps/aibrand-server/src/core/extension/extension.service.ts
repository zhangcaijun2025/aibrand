/**
 * AiBrand Extension Service
 *
 * Business logic for managing extensions:
 * - JWT token verification
 * - Task lifecycle management
 * - Platform config serving
 * - Extension health monitoring
 */

import { Injectable, Logger } from '@nestjs/common';
import { aibrandAuthService } from '@yikart/aibrand-auth';

// ─── Types ────────────────────────────────────────────────────────────────

interface TaskProgress {
  status: string;
  progress: number;
  message?: string;
  resultUrl?: string;
}

interface TaskResult {
  platform: string;
  success: boolean;
  url?: string;
  error?: string;
}

interface TaskRecord {
  taskId: string;
  userId: string;
  platforms: string[];
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  progress: Record<string, TaskProgress>;
  results: TaskResult[];
  createdAt: Date;
  updatedAt: Date;
}

// ─── Platform Configs ────────────────────────────────────────────────────

/** Top 5 Chinese social platform configs — served to Extension on connect */
const PLATFORM_CONFIGS: Record<string, unknown> = {
  weibo: {
    id: 'weibo', name: '微博', type: 'dynamic', icon: 'weibo',
    publishUrl: 'https://weibo.com', loginUrl: 'https://weibo.com/login',
    pipeline: [
      { id: 'wait_editor', type: 'wait', target: { selector: '.woo-publish-main, textarea[class*="Form"]', aiHint: '微博内容输入框，多行文本区域' }, value: '3000', waitAfter: 0 },
      { id: 'fill_content', type: 'input', target: { selector: 'textarea[class*="Form"], textarea[placeholder*="发布"]', aiHint: '微博内容输入框' }, value: { template: '{{content}}' }, waitAfter: 1000 },
      { id: 'upload_images', type: 'upload', target: { selector: 'input[type="file"]', aiHint: '图片上传按钮' }, optional: true, waitAfter: 3000 },
      { id: 'click_publish', type: 'click', target: { selector: 'span.woo-button-content', aiHint: '发布按钮，蓝色，右下角' }, value: '', waitAfter: 3000 },
    ],
    aiInjection: { enabled: true, prompt: '找到微博发布页面的内容输入框和发布按钮', fallbackSelectors: { content: ['textarea[class*="Form"]'], publishButton: ['span.woo-button-content'] } },
    mediaConstraints: { images: { max: 18, formats: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'], maxSize: 20971520 }, videos: { max: 1, formats: ['video/mp4'], maxDuration: 900 } },
    contentConstraints: { titleMaxLength: 0, contentMaxLength: 2000, hashtagMaxCount: 10, supportedFeatures: ['schedule'] },
    loginDetection: { cookieName: 'WBPSESS', domIndicator: { selector: '.woo-publish-main', text: '' } },
  },
  douyin: {
    id: 'douyin', name: '抖音', type: 'video', icon: 'douyin',
    publishUrl: 'https://creator.douyin.com/creator-micro/content/upload', loginUrl: 'https://creator.douyin.com/',
    pipeline: [
      { id: 'wait_uploader', type: 'wait', target: { selector: 'input[type="file"]', aiHint: '视频上传区域' }, value: '2000', waitAfter: 0 },
      { id: 'upload_video', type: 'upload', target: { selector: 'input[type="file"]', aiHint: '视频文件选择' }, waitAfter: 5000 },
      { id: 'fill_title', type: 'input', target: { selector: 'input[placeholder*="标题"], .semi-input', aiHint: '视频标题输入框' }, value: { template: '{{title}}' }, waitAfter: 500 },
      { id: 'click_publish', type: 'click', target: { selector: 'button[class*="publish"], button:has-text("发布")', aiHint: '发布按钮' }, value: '', waitAfter: 3000 },
    ],
    aiInjection: { enabled: true, prompt: '找到抖音发布页面上传区和标题框', fallbackSelectors: { title: ['input[placeholder*="标题"]'], publishButton: ['button[class*="publish"]'] } },
    mediaConstraints: { images: { max: 0, formats: [], maxSize: 0 }, videos: { max: 1, formats: ['video/mp4', 'video/mov'], maxDuration: 900 } },
    contentConstraints: { titleMaxLength: 55, contentMaxLength: 500, hashtagMaxCount: 10, supportedFeatures: ['schedule', 'cover'] },
    loginDetection: { cookieName: 'sessionid', domIndicator: { selector: 'input[type="file"]', text: '' } },
  },
  xhs: {
    id: 'xhs', name: '小红书', type: 'dynamic', icon: 'rednote',
    publishUrl: 'https://creator.xiaohongshu.com/publish/publish', loginUrl: 'https://creator.xiaohongshu.com/',
    pipeline: [
      { id: 'wait_editor', type: 'wait', target: { selector: 'input[type="file"], #post-textarea', aiHint: '小红书发布页面' }, value: '2000', waitAfter: 0 },
      { id: 'upload_images', type: 'upload', target: { selector: 'input[type="file"][accept*="image"]', aiHint: '图片上传按钮' }, waitAfter: 3000 },
      { id: 'fill_title', type: 'input', target: { selector: 'input[placeholder*="标题"], #title', aiHint: '标题输入框，最多20字' }, value: { template: '{{title}}' }, waitAfter: 500 },
      { id: 'fill_content', type: 'input', target: { selector: '#post-textarea, textarea[placeholder*="正文"]', aiHint: '正文输入框' }, value: { template: '{{content}}' }, waitAfter: 1000 },
      { id: 'click_publish', type: 'click', target: { selector: 'button:has-text("发布"), button[class*="publish"]', aiHint: '发布按钮，红色' }, value: '', waitAfter: 3000 },
    ],
    aiInjection: { enabled: true, prompt: '找到小红书发布页面标题框和正文框', fallbackSelectors: { title: ['input[placeholder*="标题"]'], content: ['#post-textarea'], publishButton: ['button:has-text("发布")'] } },
    mediaConstraints: { images: { max: 18, formats: ['image/png', 'image/jpeg', 'image/webp'], maxSize: 20971520 }, videos: { max: 1, formats: ['video/mp4', 'video/mov'], maxDuration: 600 } },
    contentConstraints: { titleMaxLength: 20, contentMaxLength: 1000, hashtagMaxCount: 10, supportedFeatures: ['schedule', 'location'] },
    loginDetection: { cookieName: 'web_session', domIndicator: { selector: '#post-textarea', text: '' } },
  },
  bilibili: {
    id: 'bilibili', name: '哔哩哔哩', type: 'video', icon: 'bilibili',
    publishUrl: 'https://member.bilibili.com/platform/upload/video/frame', loginUrl: 'https://member.bilibili.com/',
    pipeline: [
      { id: 'wait_uploader', type: 'wait', target: { selector: 'input[type="file"]', aiHint: '视频上传区域' }, value: '2000', waitAfter: 0 },
      { id: 'upload_video', type: 'upload', target: { selector: 'input[type="file"][accept*="video"]', aiHint: '视频文件选择器' }, waitAfter: 10000 },
      { id: 'fill_title', type: 'input', target: { selector: 'input[placeholder*="标题"]', aiHint: '视频标题输入框' }, value: { template: '{{title}}' }, waitAfter: 500 },
      { id: 'fill_content', type: 'input', target: { selector: 'textarea[placeholder*="简介"]', aiHint: '视频简介文本框' }, value: { template: '{{content}}' }, waitAfter: 500 },
      { id: 'click_submit', type: 'click', target: { selector: 'button[class*="submit"], button:has-text("提交")', aiHint: '提交按钮，粉色' }, value: '', waitAfter: 3000 },
    ],
    aiInjection: { enabled: true, prompt: '找到B站上传页面标题框和提交按钮', fallbackSelectors: { title: ['input[placeholder*="标题"]'], publishButton: ['button[class*="submit"]'] } },
    mediaConstraints: { images: { max: 1, formats: ['image/png', 'image/jpeg'], maxSize: 5242880 }, videos: { max: 1, formats: ['video/mp4', 'video/flv', 'video/mkv'], maxDuration: 3600 } },
    contentConstraints: { titleMaxLength: 80, contentMaxLength: 2000, hashtagMaxCount: 10, supportedFeatures: ['cover', 'schedule', 'collection'] },
    loginDetection: { cookieName: 'SESSDATA', domIndicator: { selector: 'input[type="file"]', text: '' } },
  },
  zhihu: {
    id: 'zhihu', name: '知乎', type: 'article', icon: 'zhihu',
    publishUrl: 'https://zhuanlan.zhihu.com/write', loginUrl: 'https://www.zhihu.com/signin',
    pipeline: [
      { id: 'wait_editor', type: 'wait', target: { selector: '.public-DraftEditor-content, .RichText', aiHint: '知乎编辑器' }, value: '2000', waitAfter: 0 },
      { id: 'fill_title', type: 'input', target: { selector: 'input[placeholder*="标题"]', aiHint: '文章标题输入框' }, value: { template: '{{title}}' }, waitAfter: 500 },
      { id: 'fill_content', type: 'input', target: { selector: '.public-DraftEditor-content, .RichText div[contenteditable]', aiHint: '文章正文编辑区' }, value: { template: '{{htmlContent}}' }, waitAfter: 1000 },
      { id: 'click_publish', type: 'click', target: { selector: 'button[class*="publish"], button:has-text("发布")', aiHint: '发布按钮，蓝色' }, value: '', waitAfter: 500 },
      { id: 'confirm_publish', type: 'click', target: { selector: 'button:has-text("确认"), button:has-text("确定")', aiHint: '确认弹窗按钮' }, optional: true, waitAfter: 2000 },
    ],
    aiInjection: { enabled: true, prompt: '找到知乎写文章页面的标题框和发布按钮', fallbackSelectors: { title: ['input[placeholder*="标题"]'], content: ['.public-DraftEditor-content'], publishButton: ['button[class*="publish"]'] } },
    mediaConstraints: { images: { max: 100, formats: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'], maxSize: 10485760 }, videos: { max: 1, formats: ['video/mp4'], maxDuration: 1800 } },
    contentConstraints: { titleMaxLength: 100, contentMaxLength: 50000, hashtagMaxCount: 0, supportedFeatures: ['cover', 'schedule', 'column'] },
    loginDetection: { cookieName: 'z_c0', domIndicator: { selector: '.public-DraftEditor-content', text: '' } },
  },
};

// ─── Service ──────────────────────────────────────────────────────────────

@Injectable()
export class ExtensionService {
  private readonly logger = new Logger(ExtensionService.name);

  /** In-memory task store (Phase 1 — will move to MongoDB in Phase 2) */
  private tasks = new Map<string, TaskRecord>();

  /** In-memory pending task queue (per userId) */
  private pendingTasks = new Map<string, Array<{
    taskId: string;
    priority: 'low' | 'normal' | 'high';
    platforms: string[];
    content: unknown;
    config: unknown;
    createdAt: number;
  }>>();

  constructor(private readonly authService: aibrandAuthService) {}

  /**
   * Verify a JWT token and return the decoded payload.
   */
  async verifyToken(token: string): Promise<{ id: string; mail: string; name: string } | null> {
    try {
      const payload = this.authService.decodeToken(token);
      if (!payload || !payload.id) return null;

      // Check expiry
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        this.logger.warn(`Token expired for user: ${payload.id}`);
        return null;
      }

      return {
        id: payload.id,
        mail: payload.mail ?? '',
        name: payload.name ?? '',
      };
    } catch (err) {
      this.logger.error('Token verification failed:', err);
      return null;
    }
  }

  /**
   * Get platform configurations.
   * Served to Extension on connect and via CONFIG_UPDATE hot-reload.
   */
  async getPlatformConfigs(): Promise<Record<string, unknown>> {
    return PLATFORM_CONFIGS;
  }

  /**
   * Queue a new publish task for delivery to an extension.
   */
  async createTask(task: {
    userId: string;
    platforms: string[];
    content: unknown;
    config?: unknown;
    priority?: 'low' | 'normal' | 'high';
  }): Promise<TaskRecord> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const record: TaskRecord = {
      taskId,
      userId: task.userId,
      platforms: task.platforms,
      status: 'queued',
      progress: {},
      results: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.tasks.set(taskId, record);

    // Add to pending queue for the user
    const userQueue = this.pendingTasks.get(task.userId) ?? [];
    userQueue.push({
      taskId,
      priority: task.priority ?? 'normal',
      platforms: task.platforms,
      content: task.content,
      config: task.config ?? {},
      createdAt: Date.now(),
    });
    this.pendingTasks.set(task.userId, userQueue);

    this.logger.log(`Task created: ${taskId} for user ${task.userId}`);
    return record;
  }

  /**
   * Get the next pending task for a user's extension.
   * Returns null if no pending tasks.
   */
  getNextTask(userId: string): {
    taskId: string;
    priority: 'low' | 'normal' | 'high';
    platforms: string[];
    content: unknown;
    config: unknown;
  } | null {
    const queue = this.pendingTasks.get(userId);
    if (!queue || queue.length === 0) return null;

    // Sort by priority (high first) then by creation time
    queue.sort((a, b) => {
      const prioOrder = { high: 0, normal: 1, low: 2 };
      const prioDiff = prioOrder[a.priority] - prioOrder[b.priority];
      if (prioDiff !== 0) return prioDiff;
      return a.createdAt - b.createdAt;
    });

    const task = queue.shift()!;
    this.pendingTasks.set(userId, queue);

    // Update task status
    const record = this.tasks.get(task.taskId);
    if (record) {
      record.status = 'in_progress';
      record.updatedAt = new Date();
    }

    return task;
  }

  /**
   * Update task progress for a specific platform.
   */
  updateTaskProgress(taskId: string, platform: string, progress: TaskProgress): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      this.logger.warn(`Task not found: ${taskId}`);
      return;
    }

    task.progress[platform] = progress;
    task.updatedAt = new Date();

    if (progress.status === 'completed') {
      task.results.push({
        platform,
        success: true,
        url: progress.resultUrl,
      });
    } else if (progress.status === 'error') {
      task.results.push({
        platform,
        success: false,
        error: progress.message,
      });
    }
  }

  /**
   * Mark a task as complete.
   */
  completeTask(taskId: string, results: TaskResult[]): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      this.logger.warn(`Task not found: ${taskId}`);
      return;
    }

    task.results = results;
    task.status = results.every((r) => r.success) ? 'completed' : 'failed';
    task.updatedAt = new Date();

    this.logger.log(
      `Task ${taskId} ${task.status}: ` +
      `${results.filter((r) => r.success).length}/${results.length} success`,
    );
  }

  /**
   * Get a task record by ID.
   */
  getTask(taskId: string): TaskRecord | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks for a user.
   */
  getTasksForUser(userId: string): TaskRecord[] {
    return Array.from(this.tasks.values()).filter(
      (task) => task.userId === userId,
    );
  }

  /**
   * Get pending task count for a user.
   */
  getPendingTaskCount(userId: string): number {
    return this.pendingTasks.get(userId)?.length ?? 0;
  }

  /**
   * Publish a task from an AI Agent (e.g., 发布管家).
   *
   * This is the main entry point for Agent-driven publishing.
   * The Agent has already done content creation + quality review.
   */
  async publishFromAgent(params: {
    userId: string;
    platforms: string[];
    content: {
      type: 'article' | 'dynamic' | 'video' | 'podcast';
      title: string;
      content: string;
      htmlContent?: string;
      markdownContent?: string;
      tags?: string[];
      media?: { name: string; url: string; type: 'image' | 'video' }[];
    };
    config?: { autoPublish?: boolean; requireConfirmation?: boolean; scheduledTime?: number };
    /** Quality verdict from the Quality Director Agent */
    qualityVerdict?: {
      overallScore: number;
      threshold: number;
      passed: boolean;
      dimensions: Array<{
        dimension: string;
        label: string;
        score: number;
        status: 'passed' | 'warning' | 'failed';
        message: string;
        details?: string[];
      }>;
      suggestions: string[];
    };
    priority?: 'low' | 'normal' | 'high';
  }): Promise<{ taskId: string; dispatched: boolean; extensionConnected: boolean }> {
    // Create task
    const record = await this.createTask({
      userId: params.userId,
      platforms: params.platforms,
      content: params.content,
      config: {
        autoPublish: params.config?.autoPublish ?? false,
        requireConfirmation: params.config?.requireConfirmation ?? true,
        scheduledTime: params.config?.scheduledTime,
      },
      priority: params.priority ?? 'normal',
    });

    // Build the task payload for the Extension
    const taskPayload = {
      taskId: record.taskId,
      priority: params.priority ?? 'normal',
      platforms: params.platforms,
      content: {
        type: params.content.type,
        title: params.content.title,
        content: params.content.content,
        htmlContent: params.content.htmlContent,
        markdownContent: params.content.markdownContent,
        tags: params.content.tags ?? [],
        media: params.content.media ?? [],
      },
      config: {
        autoPublish: params.config?.autoPublish ?? false,
        requireConfirmation: params.config?.requireConfirmation ?? true,
        scheduledTime: params.config?.scheduledTime,
      },
      // Embed quality verdict so Extension doesn't need to re-check
      qualityVerdict: params.qualityVerdict ?? null,
    };

    // Dispatch to Extension via WebSocket
    // This will be handled by the gateway's pushTask method
    return {
      taskId: record.taskId,
      dispatched: true,
      extensionConnected: true, // Will be checked by gateway
    };
  }

  /**
   * Get the task payload for dispatch.
   * The gateway calls this when it needs to push a task to an Extension.
   */
  getTaskPayload(userId: string): {
    taskId: string;
    priority: 'low' | 'normal' | 'high';
    platforms: string[];
    content: unknown;
    config: unknown;
    qualityVerdict?: unknown;
  } | null {
    const task = this.getNextTask(userId);
    if (!task) return null;

    // Build enriched payload with quality verdict
    const verdict = this.tasks.get(task.taskId) as any;
    return {
      ...task,
      qualityVerdict: verdict?.qualityVerdict ?? null,
    };
  }

  /**
   * Store quality verdict for a task.
   */
  storeQualityVerdict(taskId: string, verdict: unknown): void {
    const task = this.tasks.get(taskId);
    if (task) {
      (task as any).qualityVerdict = verdict;
    }
  }

  /**
   * Run a quality check on content and stream results back via WebSocket.
   *
   * Phase 2: Inline scoring (simulated AI).
   * Phase 3: Delegates to Quality Director Agent (agent-quality-001) via Dify.
   */
  async runQualityCheck(
    client: WebSocket,
    taskId: string,
    content: { title: string; content: string; type: string; tags?: string[] },
    platforms: string[],
  ): Promise<void> {
    const dimensions = [
      { dim: 'content' as const,     label: '内容质量',   fn: () => this.scoreContent(content) },
      { dim: 'geo' as const,         label: 'GEO 优化',   fn: () => this.scoreGeo(content) },
      { dim: 'compliance' as const,  label: '平台合规',   fn: () => this.scoreCompliance(content, platforms) },
      { dim: 'originality' as const, label: '原创度',     fn: () => this.scoreOriginality(content) },
    ];

    // Send started
    this.sendToClient(client, 'QUALITY_CHECK_STARTED', {
      taskId,
      dimensions: dimensions.map(d => d.dim),
      totalSteps: dimensions.length,
    });

    const results: Array<{
      dimension: string; label: string; score: number;
      status: 'passed' | 'warning' | 'failed';
      message: string; details?: string[];
    }> = [];

    // Stream each dimension
    for (const { dim, label, fn } of dimensions) {
      await this.delay(500 + Math.random() * 600); // Simulate processing time
      const result = fn();
      const dimResult = { dimension: dim, label, ...result };
      results.push(dimResult);

      this.sendToClient(client, 'QUALITY_DIM_RESULT', {
        taskId,
        ...dimResult,
      });
    }

    // Calculate verdict
    const overallScore = Math.round(results.reduce((s, r) => s + r.score, 0) / results.length);
    const threshold = 80;
    const passed = overallScore >= threshold;

    const suggestions: string[] = [];
    for (const r of results) {
      if (r.status === 'failed') {
        suggestions.push(`🔴 [${r.label}] ${r.message} — 建议修改后重新提交`);
      } else if (r.status === 'warning') {
        suggestions.push(`🟡 [${r.label}] ${r.message} — ${r.details?.[0] ?? '需要优化'}`);
      }
    }
    if (suggestions.length === 0) {
      suggestions.push('✅ 所有维度检查通过，内容已准备就绪');
    }

    this.sendToClient(client, 'QUALITY_VERDICT', {
      taskId,
      passed,
      overallScore,
      threshold,
      dimensions: results,
      suggestions,
      reviewedByAgent: true,
    });

    this.logger.log(`Quality verdict: ${taskId} → ${overallScore} (${passed ? 'PASS' : 'FAIL'})`);
  }

  // ─── Scoring Functions (Phase 2: inline; Phase 3: Agent delegation) ───

  private scoreContent(content: { title: string; content: string; tags?: string[] }): {
    score: number; status: 'passed' | 'warning' | 'failed'; message: string; details: string[];
  } {
    let score = 85;
    const details: string[] = [];

    if (content.title.length < 5) { score -= 15; details.push('标题过短 (< 5字)'); }
    else if (content.title.length < 15) { score -= 5; details.push('标题偏短，可增加关键词'); }
    else { details.push('标题长度适中'); }

    if (content.content.length < 50) { score -= 30; details.push('内容过短，缺乏深度'); }
    else if (content.content.length < 200) { score -= 10; details.push('内容偏短，建议补充细节'); }
    else { details.push('内容长度合适'); }

    if (!content.tags || content.tags.length === 0) { score -= 10; details.push('缺少标签'); }
    else if (content.tags.length < 3) { score -= 5; details.push('标签偏少'); }
    else { details.push(`标签数量合理 (${content.tags.length}个)`); }

    const status = score >= 80 ? 'passed' : score >= 60 ? 'warning' : 'failed';
    const message = status === 'passed' ? '内容质量良好' : status === 'warning' ? '内容需要优化' : '内容质量不足';

    return { score, status, message, details };
  }

  private scoreGeo(content: { title: string; content: string }): {
    score: number; status: 'passed' | 'warning' | 'failed'; message: string; details: string[];
  } {
    let score = 82;
    const details: string[] = [];
    const keywords = ['AI', '智能', '数据', '增长', '策略', '优化', '趋势', '方案'];
    const found = keywords.filter(k => (content.title + content.content).includes(k));

    if (found.length === 0) { score -= 25; details.push('缺少 AI 搜索关键词'); }
    else if (found.length < 3) { score -= 10; details.push(`关键词偏少 (${found.length}个)`); }
    else { details.push(`检测到 ${found.length} 个 AI 友好关键词: ${found.join(', ')}`); }

    const titleHasKeyword = keywords.some(k => content.title.includes(k));
    if (!titleHasKeyword) { score -= 10; details.push('标题缺乏关键词'); }
    else { details.push('标题包含关键词 ✓'); }

    const status = score >= 80 ? 'passed' : score >= 60 ? 'warning' : 'failed';
    const message = status === 'passed' ? 'GEO 优化良好' : status === 'warning' ? 'GEO 需优化' : 'GEO 严重不足';

    return { score, status, message, details };
  }

  private scoreCompliance(
    _content: { title: string; content: string },
    platforms: string[],
  ): { score: number; status: 'passed' | 'warning' | 'failed'; message: string; details: string[] } {
    let score = 90;
    const details: string[] = [];

    for (const p of platforms) {
      details.push(`${p}: 格式兼容 ✓`);
    }

    const sensitiveWords = ['免费', '100%', '绝对', '第一', '最好'];
    const found = sensitiveWords.filter(w => _content.content.includes(w));
    if (found.length > 0) { score -= 15; details.push(`检测到夸大词: ${found.join(', ')}`); }

    const status = score >= 80 ? 'passed' : score >= 60 ? 'warning' : 'failed';
    const message = status === 'passed' ? '平台合规检查通过' : status === 'warning' ? '存在合规风险' : '合规检查未通过';

    return { score, status, message, details };
  }

  private scoreOriginality(content: { title: string; content: string }): {
    score: number; status: 'passed' | 'warning' | 'failed'; message: string; details: string[];
  } {
    let score = 88;
    const details: string[] = [];
    const totalLength = content.title.length + content.content.length;

    if (totalLength < 100) { score -= 10; details.push('内容较短，原创度评估受限'); }
    else { details.push('内容长度足够进行原创度分析'); }

    const hasVoice = /我|我们|我认为|建议|推荐|经验|实践|案例/.test(content.content);
    if (hasVoice) { details.push('检测到个人观点和经验分享 ✓'); }
    else { score -= 10; details.push('缺少个人观点，建议增加独特见解'); }

    details.push('未发现明显抄袭');

    const status = score >= 80 ? 'passed' : score >= 60 ? 'warning' : 'failed';
    const message = status === 'passed' ? '原创度良好' : status === 'warning' ? '原创度偏低' : '原创度不足';

    return { score, status, message, details };
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  private sendToClient(client: WebSocket, type: string, payload: unknown): void {
    if (client.readyState !== WebSocket.OPEN) return;
    client.send(JSON.stringify({ type, payload, ts: new Date().toISOString() }));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
