/**
 * WorkflowController — REST API
 */

import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common'
import { WorkflowService } from './workflow.service'
import { executeWorkflowSchema, confirmTopicsSchema, retryStepSchema } from './workflow.dto'
import { RateLimit, RateLimitGuard } from '../../common/guards'
import { QuotaGuard, RequireQuota } from '../../core/subscription/guards/quota.guard'

@Controller('workflow')
export class WorkflowController {
  constructor(private readonly service: WorkflowService) {}

  /** 启动工作流 — 已添加速率限制和配额保护 */
  @Post('execute')
  @UseGuards(RateLimitGuard, QuotaGuard)
  @RateLimit({ ttl: 60, limit: 5, keyGenerator: (req: any) => `workflow:execute:${req.user?.id}` })
  @RequireQuota({ feature: 'aiWorkflow', cost: 1 })
  async execute(@Req() req: any, @Body() body: unknown) {
    const dto = executeWorkflowSchema.parse(body)
    return this.service.execute(req.user.id, dto)
  }

  /** 用户确认选题 (Step 3 callback) */
  @Post('confirm')
  @HttpCode(200)
  async confirmTopics(@Req() req: any, @Body() body: unknown) {
    const dto = confirmTopicsSchema.parse(body)
    await this.service.confirmTopics(req.user.id, dto)
    return { ok: true }
  }

  /** 重试失败步骤 */
  @Post('retry')
  @HttpCode(200)
  async retryStep(@Req() req: any, @Body() body: unknown) {
    const dto = retryStepSchema.parse(body)
    await this.service.retryStep(req.user.id, dto)
    return { ok: true }
  }

  /** 取消工作流 */
  @Delete(':id')
  @HttpCode(200)
  async cancel(@Req() req: any, @Param('id') id: string) {
    await this.service.cancel(id, req.user.id)
    return { ok: true }
  }

  /** 工作流历史 */
  @Get('history')
  async getHistory(
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    return this.service.getHistory(
      req.user.id,
      limit ? parseInt(limit) : 20,
      skip ? parseInt(skip) : 0,
    )
  }
}
