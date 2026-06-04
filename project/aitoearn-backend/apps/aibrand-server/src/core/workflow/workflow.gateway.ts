/**
 * WorkflowGateway — SSE 实时推送
 *
 * 客户端订阅 GET /workflow/:id/stream
 * 服务端通过 EventEmitter2 推送工作流进度事件
 */

import { Controller, Get, Param, Req, Res } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import type { Response } from 'express'
import { Subject, filter, takeUntil } from 'rxjs'

@Controller('workflow')
export class WorkflowGateway {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  @Get(':id/stream')
  async stream(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    const destroy$ = new Subject<void>()

    // 客户端断开时清理
    req.on('close', () => {
      destroy$.next()
      destroy$.complete()
    })

    // 发送初始连接确认
    res.write(`event: connected\ndata: ${JSON.stringify({ executionId: id })}\n\n`)

    // 监听工作流事件
    this.eventEmitter.on(`workflow.${id}`, (payload: Record<string, any>) => {
      res.write(`event: ${payload['event']}\ndata: ${JSON.stringify(payload)}\n\n`)
    })

    // 心跳保活 (每 30 秒)
    const heartbeat = setInterval(() => {
      res.write(`:heartbeat\n\n`)
    }, 30000)

    req.on('close', () => {
      clearInterval(heartbeat)
      this.eventEmitter.removeAllListeners(`workflow.${id}`)
    })
  }
}
