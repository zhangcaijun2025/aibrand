import { Controller, Post, Body, Res, Logger, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { GetToken, TokenInfo } from '@yikart/aibrand-auth'
import { Response } from 'express'
import type { Subscription } from 'rxjs'
import { RateLimit, RateLimitGuard } from '../../common/guards'
import { QuotaGuard, RequireQuota } from '../../core/subscription/guards/quota.guard'
import { AgentChatService, AgentChatRequest, ChatSSEEvent } from './agent-chat.service'

/**
 * Agent 对话控制器 — POST + SSE 流式响应
 *
 * 代理 Dify Agent 的 streaming 事件，翻译为前端友好的步骤事件。
 *
 * SSE 事件类型 (每个事件一行 JSON):
 * - { type: "step_start", label: "...", position: N }
 * - { type: "step_done",  label: "...", position: N, detail: "..." }
 * - { type: "message",   content: "..." }
 * - { type: "done",      conversationId: "..." }
 * - { type: "error",     message: "..." }
 */
@ApiTags('Agent')
@Controller('agent')
export class AgentChatController {
  private readonly logger = new Logger(AgentChatController.name)

  constructor(private readonly chatService: AgentChatService) {}

  @Post('chat')
  @UseGuards(RateLimitGuard, QuotaGuard)
  @RateLimit({ ttl: 60, limit: 10, keyGenerator: (req: any) => `agent:chat:${req.user?.id}` })
  @RequireQuota('ai_chat')
  async chat(
    @GetToken() token: TokenInfo,
    @Body() body: AgentChatRequest,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(
      `Agent chat: userId=${token.id}, query="${body.message.slice(0, 50)}..."`,
    )

    // 设置 SSE headers
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    let subscription: Subscription | undefined

    try {
      const observable = await this.chatService.chat(token.id, body)

      subscription = observable.subscribe({
        next: (event: ChatSSEEvent) => {
          res.write(`data: ${JSON.stringify(event)}\n\n`)
        },
        error: (err: Error) => {
          this.logger.error(`Agent chat error: ${err.message}`)
          res.write(`data: ${JSON.stringify({ type: 'error' as const, message: err.message })}\n\n`)
          res.end()
        },
        complete: () => {
          res.write(`data: ${JSON.stringify({ type: 'done' as const })}\n\n`)
          res.end()
        },
      })
    } catch (err: any) {
      this.logger.error(`Failed to start agent chat: ${err.message}`)
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`)
      res.end()
    }

    // 客户端断开时取消订阅
    res.on('close', () => {
      subscription?.unsubscribe()
    })
  }
}
