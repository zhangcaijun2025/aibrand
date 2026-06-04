/**
 * OneApiService — One API 网关接入
 *
 * 统一的 LLM API 调用入口，替代直接调 Dify 或 DeepSeek。
 * 所有模型调用经过 One API → 自动计费 + 路由 + 限流。
 */

import { Injectable, Logger } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
import { catchError, map } from 'rxjs/operators'
import { AppException, ResponseCode, retry } from '@yikart/common'

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

  // ── 非流式聊天补全 ──

  /** 非流式聊天补全 */
  async chatCompletion(params: ChatCompletionParams): Promise<ChatCompletionResult> {
    // 输入验证
    if (!params.messages?.length) {
      throw new AppException(ResponseCode.AiCallFailed, {
        service: 'one-api',
        action: 'chatCompletion',
        message: 'Messages array must not be empty',
      })
    }
    if (params.messages.length > 100) {
      throw new AppException(ResponseCode.AiCallFailed, {
        service: 'one-api',
        action: 'chatCompletion',
        message: `Messages array exceeds maximum of 100 (got ${params.messages.length})`,
      })
    }

    const url = `${this.config.baseUrl}/v1/chat/completions`
    const body = {
      model: params.model || 'deepseek-chat',
      messages: params.messages,
      max_tokens: params.maxTokens ?? 2048,
      temperature: params.temperature ?? 0.7,
      stream: false,
    }

    this.logger.debug(`Calling ${body.model} via One API`)

    try {
      const res = await retry(
        () => firstValueFrom(
          this.http.post(url, body, {
            headers: {
              Authorization: `Bearer ${this.config.token}`,
              'Content-Type': 'application/json',
            },
            timeout: 60000,
          }),
        ),
        { maxRetries: 2, delayMs: 500, backoff: 'exponential' },
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
    } catch (error) {
      this.logger.error(
        `[OneApi] chatCompletion failed — ${error instanceof Error ? error.message : String(error)}`,
        (error as Error).stack,
      )
      throw new AppException(ResponseCode.AiCallFailed, {
        service: 'one-api',
        action: 'chatCompletion',
        model: body.model,
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  // ── 流式聊天补全 ──

  /** 流式聊天补全 — 返回 Observable，错误通过 Observable error channel 传播 */
  chatCompletionStream(params: ChatCompletionParams) {
    const url = `${this.config.baseUrl}/v1/chat/completions`
    const body = {
      model: params.model || 'deepseek-chat',
      messages: params.messages,
      max_tokens: params.maxTokens ?? 4096,
      temperature: params.temperature ?? 0.7,
      stream: true,
    }

    this.logger.debug(`Streaming ${body.model} via One API`)

    return this.http.post(url, body, {
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      responseType: 'stream',
      timeout: 120000,
    }).pipe(
      catchError((error) => {
        this.logger.error(
          `[OneApi] chatCompletionStream failed — ${error instanceof Error ? error.message : String(error)}`,
          (error as Error).stack,
        )
        throw new AppException(ResponseCode.AiCallFailed, {
          service: 'one-api',
          action: 'chatCompletionStream',
          model: body.model,
          message: error instanceof Error ? error.message : String(error),
        })
      }),
    )
  }

  // ── 内容诊断 ──

  /** 内容诊断 — 多维度评分 */
  async diagnose(content: string, category?: string): Promise<{
    overallScore: number
    dimensions: Array<{ name: string; score: number; suggestion: string }>
  }> {
    const prompt = `你是一个专业的内容质量诊断师。请分析以下${category || ''}内容，按5个维度评分(0-100)：标题质量、内容质量、视觉建议、标签策略、互动潜力。对每个维度给出简短建议。

内容：
${content.slice(0, 3000)}

请以JSON格式回复：{"overallScore":80,"dimensions":[{"name":"标题质量","score":75,"suggestion":"建议突出用户痛点"},...]}`

    try {
      const result = await this.chatCompletion({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 1024,
        temperature: 0.3,
      })

      // Extract JSON from response
      const jsonMatch = result.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }

      this.logger.warn(
        `[OneApi] diagnose — LLM response is not valid JSON, returning zero scores. Raw: "${result.content.slice(0, 200)}"`,
      )
    } catch (error) {
      // Distinguish network/API errors from JSON parse errors
      if (error instanceof AppException) {
        throw error // re-throw API call failures
      }
      this.logger.warn(
        `[OneApi] diagnose — JSON parse failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }

    return {
      overallScore: 0,
      dimensions: [],
    }
  }

  // ── 健康检查 ──

  /** 健康检查 */
  async healthCheck(): Promise<boolean> {
    try {
      const res = await firstValueFrom(
        this.http.get(`${this.config.baseUrl}/api/status`, { timeout: 5000 }),
      )
      return res.status === 200
    } catch (error) {
      this.logger.warn(
        `[OneApi] healthCheck failed — ${error instanceof Error ? error.message : String(error)}`,
      )
      return false
    }
  }
}
