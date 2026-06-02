/**
 * N8nService — n8n 自动化工作流引擎集成
 *
 * 功能：
 * - 触发 n8n Webhook 工作流
 * - 工作流执行状态查询
 * - 定时任务管理
 *
 * 使用场景：
 * - 定时抓取竞品内容 → 写入 Dify 知识库
 * - 定时拉取热搜话题 → 更新选题库
 * - 发布后 48h 拉取平台数据 → 触发效果报告
 * - OAuth 健康检查 → 提醒重连
 */

import { HttpService } from '@nestjs/axios'
import { Injectable, Logger } from '@nestjs/common'
import { AppException, ResponseCode } from '@yikart/common'
import { firstValueFrom } from 'rxjs'

// ── 配置接口 ──

export interface N8nConfig {
  /** n8n 服务地址，如 http://localhost:5678 */
  baseUrl: string
  /** n8n API Key (可选，用于认证的 Webhook) */
  apiKey?: string
  /** 默认超时 ms */
  timeout?: number
}

// ── 工作流执行 ──

export interface TriggerWorkflowParams {
  /** n8n Webhook 路径，如 "content-research/competitor-analysis" */
  webhookPath: string
  /** 传递给工作流的参数 */
  payload?: Record<string, any>
  /** 等待工作流完成的超时 ms (默认 60000) */
  waitTimeout?: number
}

export interface WorkflowExecution {
  executionId: string
  workflowName: string
  status: 'running' | 'completed' | 'failed' | 'waiting'
  startedAt: Date
  completedAt?: Date
  result?: any
  error?: string
}

// ── 工作流管理 ──

export interface N8nWorkflow {
  id: string
  name: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}

interface N8nWorkflowRaw {
  id: string
  name: string
  active: boolean
  createdAt: string
  updatedAt: string
}

// ── 服务实现 ──

@Injectable()
export class N8nService {
  private readonly logger = new Logger(N8nService.name)

  constructor(
    private readonly http: HttpService,
    private readonly config: N8nConfig,
  ) {}

  // ── Webhook 触发 ──

  /**
   * 触发 n8n 工作流（通过 Webhook）
   *
   * n8n 工作流需要在 Webhook 节点设置路径，
   * 然后通过 POST /webhook/{path} 触发
   */
  async triggerWorkflow(params: TriggerWorkflowParams): Promise<any> {
    const url = `${this.config.baseUrl}/webhook/${params.webhookPath}`

    try {
      const { data } = await firstValueFrom(
        this.http.post(url, params.payload ?? {}, {
          headers: this.getHeaders(),
          timeout: params.waitTimeout ?? this.config.timeout ?? 60000,
        }),
      )

      this.logger.log(
        `n8n webhook '${params.webhookPath}' triggered successfully`,
      )
      return data
    } catch (error: any) {
      this.logger.error(
        `n8n webhook '${params.webhookPath}' failed: ${error.message}`,
        error.stack,
      )
      throw new AppException(ResponseCode.AiCallFailed, {
        service: 'n8n',
        action: 'triggerWorkflow',
        webhookPath: params.webhookPath,
      })
    }
  }

  /**
   * 触发 n8n 工作流（非阻塞，fire-and-forget）
   * 用于不需要等待结果的自动化任务
   */
  async triggerWorkflowAsync(params: TriggerWorkflowParams): Promise<void> {
    const url = `${this.config.baseUrl}/webhook/${params.webhookPath}`

    try {
      // 使用短超时实现 fire-and-forget
      await firstValueFrom(
        this.http.post(url, params.payload ?? {}, {
          headers: this.getHeaders(),
          timeout: 5000,
        }),
      )
    } catch (error: any) {
      if (error.code === 'ECONNABORTED') {
        this.logger.warn(
          `n8n async trigger '${params.webhookPath}' timed out after 5s — workflow may still be executing`,
        )
      } else {
        this.logger.error(
          `n8n async trigger '${params.webhookPath}' failed: ${error.message}`,
        )
      }
    }
  }

  // ── 工作流管理 ──

  /** 获取所有工作流列表 */
  async listWorkflows(): Promise<N8nWorkflow[]> {
    const url = `${this.config.baseUrl}/rest/workflows`
    try {
      const { data } = await firstValueFrom(
        this.http.get<{ data?: N8nWorkflowRaw[] }>(url, {
          headers: this.getHeaders(),
          timeout: this.config.timeout ?? 30000,
        }),
      )
      return (data.data ?? []).map((w) => ({
        id: w.id,
        name: w.name,
        active: w.active,
        createdAt: new Date(w.createdAt),
        updatedAt: new Date(w.updatedAt),
      }))
    } catch (error: any) {
      this.logger.error(`n8n listWorkflows failed: ${error.message}`)
      throw new AppException(ResponseCode.AiCallFailed, {
        service: 'n8n',
        action: 'listWorkflows',
      })
    }
  }

  /** 激活/停用工作流 */
  async toggleWorkflow(id: string, active: boolean): Promise<void> {
    const url = `${this.config.baseUrl}/rest/workflows/${id}/${active ? 'activate' : 'deactivate'}`
    try {
      await firstValueFrom(
        this.http.post(url, {}, {
          headers: this.getHeaders(),
          timeout: this.config.timeout ?? 30000,
        }),
      )
    } catch (error: any) {
      this.logger.error(`n8n toggleWorkflow failed: ${error.message}`)
      throw new AppException(ResponseCode.AiCallFailed, {
        service: 'n8n',
        action: 'toggleWorkflow',
      })
    }
  }

  // ── 便捷方法：预置工作流 ──

  /** 触发"竞品内容抓取"工作流 */
  async triggerCompetitorAnalysis(keywords: string[]): Promise<void> {
    await this.triggerWorkflowAsync({
      webhookPath: 'content-research/competitor-analysis',
      payload: { keywords, source: 'aibrand-workflow' },
    })
  }

  /** 触发"热搜话题拉取"工作流 */
  async triggerTrendingTopics(industry: string): Promise<void> {
    await this.triggerWorkflowAsync({
      webhookPath: 'content-research/trending-topics',
      payload: { industry, source: 'aibrand-workflow' },
    })
  }

  /** 触发"发布后数据回收"工作流 */
  async triggerPostPublishTracking(contentIds: string[]): Promise<void> {
    await this.triggerWorkflowAsync({
      webhookPath: 'analytics/post-publish-tracking',
      payload: { contentIds, source: 'aibrand-workflow' },
    })
  }

  /** 触发"账号健康检查"工作流 */
  async triggerAccountHealthCheck(accountIds: string[]): Promise<void> {
    await this.triggerWorkflowAsync({
      webhookPath: 'account/health-check',
      payload: { accountIds, source: 'aibrand-workflow' },
    })
  }

  // ── 健康检查 ──

  async healthCheck(): Promise<boolean> {
    try {
      await firstValueFrom(
        this.http.get(`${this.config.baseUrl}/healthz`, { timeout: 5000 }),
      )
      return true
    } catch {
      return false
    }
  }

  // ── 私有方法 ──

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (this.config.apiKey) {
      headers['X-N8N-API-KEY'] = this.config.apiKey
    }
    return headers
  }
}
