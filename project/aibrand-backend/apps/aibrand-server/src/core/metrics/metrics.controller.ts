/**
 * GET /metrics — Prometheus scrape 端点
 */
import { Controller, Get, Header } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { MetricsService } from './metrics.service'

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async metrics(): Promise<string> {
    return this.metricsService.metrics()
  }
}
