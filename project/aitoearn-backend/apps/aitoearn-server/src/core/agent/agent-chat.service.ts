import { Injectable, Logger } from '@nestjs/common'
import { DifyService } from '@yikart/ai-services'
import { N8nService } from '@yikart/ai-services'
import { AgentService } from './agent.service'
import { Observable } from 'rxjs'

// ── 类型定义 ──

export interface AgentChatRequest {
  message: string
  conversationId?: string
}

/**
 * 前端友好的 SSE 事件类型
 */
export type ChatSSEEvent =
  | { type: 'step_start'; label: string; position: number }
  | { type: 'step_done'; label: string; position: number; detail: string }
  | { type: 'message'; content: string }
  | { type: 'done'; conversationId: string }
  | { type: 'error'; message: string }

/**
 * Dify streaming 事件类型
 */
interface DifyStreamEvent {
  event: string
  message_id?: string
  conversation_id?: string
  answer?: string
  // agent_thought 事件
  id?: string
  thought?: string
  tool?: string
  tool_input?: string
  observation?: string
  position?: number
}

/**
 * 工具名称 → 中文标签映射
 */
const TOOL_LABELS: Record<string, string> = {
  knowledge_retrieval: '搜索知识库',
  api_call: '调用外部服务',
  web_search: '搜索网络',
  generate_content: '生成内容',
  analyze_data: '分析数据',
  trigger_workflow: '触发自动化工作流',
  competitor_analysis: '竞品分析',
  trending_topics: '热搜话题抓取',
  publish_tracking: '发布追踪',
  account_health: '账号健康检查',
}

@Injectable()
export class AgentChatService {
  private readonly logger = new Logger(AgentChatService.name)

  constructor(
    private readonly dify: DifyService,
    private readonly n8n: N8nService,
    private readonly agentService: AgentService,
  ) {}

  /**
   * 发起 Agent 对话，返回 SSE 事件流
   */
  async chat(
    userId: string,
    request: AgentChatRequest,
  ): Promise<Observable<ChatSSEEvent>> {
    const { message, conversationId } = request

    // 异步记录用户行为（fire-and-forget）
    this.agentService.trackBehavior(userId, 'agent_chat', {
      messageLength: message.length,
      hasConversationId: !!conversationId,
    })

    // 调用 Dify Agent 流式 API
    const difyStream = await this.callDifyStream(message, conversationId)

    // 翻译 Dify 事件为前端友好事件
    return this.translateStream(difyStream)
  }

  // ── 私有方法 ──

  /**
   * 调用 Dify Agent 的流式 API
   *
   * Dify streaming 响应格式:
   * data: {"event": "agent_thought", ...}
   * data: {"event": "message", "answer": "..."}
   * data: {"event": "message_end", ...}
   */
  private async callDifyStream(
    query: string,
    conversationId?: string,
  ): Promise<Observable<DifyStreamEvent>> {
    const url = `${this.dify['config'].apiBase}/v1/chat-messages`

    const body: Record<string, any> = {
      inputs: {},
      query,
      user: 'aibrand-user',
      response_mode: 'streaming',
    }

    if (conversationId) {
      body['conversation_id'] = conversationId
    }

    this.logger.log(`Calling Dify stream: ${url}`)

    return new Observable<DifyStreamEvent>((subscriber) => {
      // 用 raw http 请求处理 SSE stream
      const http = require('http')
      const https = require('https')

      const parsedUrl = new URL(url)
      const client = parsedUrl.protocol === 'https:' ? https : http

      const postData = JSON.stringify(body)
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.dify['config'].appApiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
      }

      const req = client.request(options, (res: any) => {
        let buffer = ''

        res.on('data', (chunk: Buffer) => {
          buffer += chunk.toString()

          // 解析 SSE 数据行
          const lines = buffer.split('\n')
          buffer = lines.pop() || '' // 保留未完成的行

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || !trimmed.startsWith('data: ')) continue

            const dataStr = trimmed.slice(6) // 去掉 "data: "
            try {
              const event = JSON.parse(dataStr) as DifyStreamEvent
              subscriber.next(event)

              // message_end 表示流结束
              if (event.event === 'message_end') {
                subscriber.complete()
              }
            } catch {
              // 跳过无法解析的行
            }
          }
        })

        res.on('end', () => {
          subscriber.complete()
        })

        res.on('error', (err: Error) => {
          subscriber.error(err)
        })
      })

      req.on('error', (err: Error) => {
        subscriber.error(err)
      })

      req.write(postData)
      req.end()
    })
  }

  /**
   * 翻译 Dify 事件流 → 前端友好事件流
   */
  private translateStream(
    difyStream: Observable<DifyStreamEvent>,
  ): Observable<ChatSSEEvent> {
    const seenSteps = new Set<number>()

    return new Observable<ChatSSEEvent>((subscriber) => {
      difyStream.subscribe({
        next: (event: DifyStreamEvent) => {
          switch (event.event) {
            case 'agent_thought': {
              const position = event.position ?? 0
              const label = event.tool
                ? (TOOL_LABELS[event.tool] || event.tool)
                : event.thought?.slice(0, 30) || '思考中...'

              // 首次出现的步骤 → 发送 step_start
              if (!seenSteps.has(position)) {
                seenSteps.add(position)
                subscriber.next({
                  type: 'step_start',
                  label,
                  position,
                })
              }

              // 有 observation 表示步骤完成
              if (event.observation) {
                subscriber.next({
                  type: 'step_done',
                  label,
                  position,
                  detail: event.observation.slice(0, 200),
                })
              }
              break
            }

            case 'message': {
              if (event.answer) {
                subscriber.next({
                  type: 'message',
                  content: event.answer,
                })
              }
              break
            }

            case 'message_end': {
              subscriber.next({
                type: 'done',
                conversationId: event.conversation_id || '',
              })
              subscriber.complete()
              break
            }

            case 'error': {
              subscriber.next({
                type: 'error',
                message: 'AI 服务暂时不可用，请稍后重试',
              })
              subscriber.complete()
              break
            }

            // 忽略其他事件类型
          }
        },
        error: (err: Error) => {
          this.logger.error(`Dify stream error: ${err.message}`)
          subscriber.next({
            type: 'error',
            message: '对话服务异常，请稍后重试',
          })
          subscriber.complete()
        },
        complete: () => {
          subscriber.complete()
        },
      })
    })
  }
}
