/**
 * OneApiService — One API 网关接入
 *
 * 统一的 LLM API 调用入口，替代直接调 Dify 或 DeepSeek。
 * 所有模型调用经过 One API → 自动计费 + 路由 + 限流。
 */

import { Injectable, Logger } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'

// ─── Types ──────────────────────────────────────

export interface OneApiConfig {
  /** One API 地址，如 http://localhost:4012 */
  baseUrl: string
  /** AiBrand 系统令牌 */
  token: string
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatCompletionParams {
  model?: string
  messages: ChatMessage[]
  maxTokens?: number
  temperature?: number
  stream?: boolean
}

export interface ChatCompletionResult {
  content: string
  model: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

// ─── Service ────────────────────────────────────

@Injectable()
export class OneApiService {
  private readonly logger = new Logger(OneApiService.name)

  constructor(
    private readonly http: HttpService,
    private readonly config: OneApiConfig,
  ) {}

  /** 非流式聊天补全 */
  async chatCompletion(params: ChatCompletionParams): Promise<ChatCompletionResult> {
    const url = `${this.config.baseUrl}/v1/chat/completions`
    const body = {
      model: params.model || 'deepseek-chat',
      messages: params.messages,
      max_tokens: params.maxTokens ?? 2048,
      temperature: params.temperature ?? 0.7,
      stream: false,
    }

    this.logger.debug(`Calling ${body.model} via One API`)

    const res = await firstValueFrom(
      this.http.post(url, body, {
        headers: {
          Authorization: `Bearer ${this.config.token}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      }),
    )

    const data = res.data
    const choice = data.choices?.[0]

    return {
      content: choice?.message?.content || '',
      model: data.model || body.model,
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
    }
  }

  /** 流式聊天补全 — 返回 Observable */
  chatCompletionStream(params: ChatCompletionParams) {
    const url = `${this.config.baseUrl}/v1/chat/completions`
    const body = {
      model: params.model || 'deepseek-chat',
      messages: params.messages,
      max_tokens: params.maxTokens ?? 4096,
      temperature: params.temperature ?? 0.7,
      stream: true,
    }

    return this.http.post(url, body, {
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      responseType: 'stream',
      timeout: 120000,
    })
  }

  /** 内容诊断 — 多维度评分 */
  async diagnose(content: string, category?: string): Promise<{
    overallScore: number
    dimensions: Array<{ name: string; score: number; suggestion: string }>
  }> {
    const prompt = `你是一个专业的内容质量诊断师。请分析以下${category || ''}内容，按5个维度评分(0-100)：标题质量、内容质量、视觉建议、标签策略、互动潜力。对每个维度给出简短建议。

内容：
${content.slice(0, 3000)}

请以JSON格式回复：{"overallScore":80,"dimensions":[{"name":"标题质量","score":75,"suggestion":"建议突出用户痛点"},...]}`

    const result = await this.chatCompletion({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 1024,
      temperature: 0.3,
    })

    try {
      // Extract JSON from response
      const jsonMatch = result.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch {}

    return {
      overallScore: 0,
      dimensions: [],
    }
  }

  /** 健康检查 */
  async healthCheck(): Promise<boolean> {
    try {
      const res = await firstValueFrom(
        this.http.get(`${this.config.baseUrl}/api/status`, { timeout: 5000 }),
      )
      return res.status === 200
    } catch {
      return false
    }
  }
}
