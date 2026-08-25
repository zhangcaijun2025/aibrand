import type { NextFunction, Request, Response } from 'express'
/**
 * MetricsService — Prometheus 指标（Phase 4.1 可观测性）
 *
 * - collectDefaultMetrics：Node/事件循环默认指标
 * - http_requests_total：按 method/status 统计请求
 * - aibrand_publish_total / aibrand_credits_total：业务计数（发布/计费）
 */
import { Injectable, Logger } from '@nestjs/common'
import { collectDefaultMetrics, Counter, Registry } from 'prom-client'

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name)
  readonly registry = new Registry()

  readonly httpRequests = new Counter({
    name: 'aibrand_http_requests_total',
    help: 'Total HTTP requests by method and status',
    labelNames: ['method', 'status'] as const,
    registers: [this.registry],
  })

  readonly publishCounter = new Counter({
    name: 'aibrand_publish_total',
    help: 'Total publish operations by result',
    labelNames: ['result'] as const,
    registers: [this.registry],
  })

  readonly creditsCounter = new Counter({
    name: 'aibrand_credits_operations_total',
    help: 'Total credits operations by type (add/deduct)',
    labelNames: ['type'] as const,
    registers: [this.registry],
  })

  constructor() {
    collectDefaultMetrics({ register: this.registry })
    this.logger.log('Prometheus metrics initialized')
  }

  /** HTTP 请求计数中间件（Nest 会按类实例化注入） */
  use(req: Request, res: Response, next: NextFunction) {
    res.on('finish', () => {
      try {
        this.httpRequests.inc({ method: req.method, status: String(res.statusCode) })
      }
      catch {
        /* 指标异常不影响业务 */
      }
    })
    next()
  }

  async metrics(): Promise<string> {
    return this.registry.metrics()
  }

  incPublish(result: 'published' | 'failed') {
    this.publishCounter.inc({ result })
  }

  incCredits(type: 'add' | 'deduct') {
    this.creditsCounter.inc({ type })
  }
}
