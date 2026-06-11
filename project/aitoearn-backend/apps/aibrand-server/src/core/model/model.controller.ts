import { Controller, Get, Post, Body, Query } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { ModelService } from './model.service'

@ApiTags('Models')
@Controller('api/models')
export class ModelController {
  constructor(private readonly modelService: ModelService) {}

  @Get()
  @ApiOperation({ summary: '模型配置列表' })
  async getConfigs() {
    const configs = await this.modelService.getConfigs()
    return { code: 0, data: configs, total: configs.length }
  }

  @Get('metrics')
  @ApiOperation({ summary: '模型调用指标' })
  async getMetrics(@Query('window') window?: string) {
    const ms = window === '24h' ? 86400000 : 3600000
    const metrics = await this.modelService.getMetrics(ms)
    return { code: 0, data: metrics, window: window || '1h' }
  }

  @Post('log')
  @ApiOperation({ summary: '记录模型调用' })
  async logCall(@Body() body: any) {
    await this.modelService.logCall({ ...body, timestamp: new Date() })
    return { code: 0, message: 'logged' }
  }

  @Post('health')
  @ApiOperation({ summary: '更新模型健康状态' })
  async updateHealth(@Body() body: { name: string; healthy: boolean; error?: string }) {
    await this.modelService.updateHealth(body.name, body.healthy, body.error)
    return { code: 0, message: 'updated' }
  }

  @Post('seed')
  @ApiOperation({ summary: '种子默认模型配置' })
  async seed() {
    await this.modelService.seedDefaults()
    return { code: 0, message: 'seeded' }
  }
}
