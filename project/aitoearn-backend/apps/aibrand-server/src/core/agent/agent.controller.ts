import { Controller, Get, Logger, Post, Body, Query } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { GetToken, TokenInfo } from '@yikart/aibrand-auth'
import { ApiDoc } from '@yikart/common'
import { AgentGreeting, AgentService } from './agent.service'
import { EvolutionService, EvolutionReport, ModuleWeight, LayoutReorgSuggestion } from './evolution.service'

@ApiTags('Agent')
@Controller('agent')
export class AgentController {
  private readonly logger = new Logger(AgentController.name)

  constructor(
    private readonly agentService: AgentService,
    private readonly evolutionService: EvolutionService,
  ) {}

  // ── 问候 ──

  @ApiDoc({
    summary: 'Agent 主动问候',
    description: '返回用户打开应用时的个性化问候：系统状态、今日简报、建议下一步、夜间事件',
  })
  @Get('greeting')
  async getGreeting(@GetToken() token: TokenInfo): Promise<AgentGreeting> {
    return this.agentService.generateGreeting(token.id)
  }

  // ── 事件 ──

  @ApiDoc({
    summary: '获取未读事件',
    description: '获取用户未读的系统事件（自愈、洞察、里程碑）',
  })
  @Get('events')
  async getUnreadEvents(@GetToken() token: TokenInfo) {
    return this.agentService.getUnreadEvents(token.id)
  }

  // ── 上下文 ──

  @ApiDoc({
    summary: '获取用户上下文',
    description: '获取用户当前的上下文信息（竞品关注、项目、偏好）',
  })
  @Get('context')
  async getContext(@GetToken() token: TokenInfo) {
    return this.agentService.getContext(token.id)
  }

  @ApiDoc({
    summary: '更新用户上下文',
    description: '更新竞品关注列表、项目、偏好等',
  })
  @Post('context')
  async updateContext(
    @GetToken() token: TokenInfo,
    @Body() body: Record<string, any>,
  ) {
    return this.agentService.updateContext(token.id, body)
  }

  // ── 画像 ──

  @ApiDoc({
    summary: '获取用户画像',
    description: '获取用户长期画像（行业、成长曲线、里程碑）',
  })
  @Get('profile')
  async getProfile(@GetToken() token: TokenInfo) {
    return this.agentService.getProfile(token.id)
  }

  // ── 行为 ──

  @ApiDoc({
    summary: '记录用户行为',
    description: '前端埋点：用户点击/查看/操作事件',
  })
  @Post('behavior')
  async trackBehavior(
    @GetToken() token: TokenInfo,
    @Body() body: { action: string; context?: Record<string, any> },
  ): Promise<void> {
    await this.agentService.trackBehavior(token.id, body.action, body.context ?? {})
  }

  // ── 进化 ──

  @ApiDoc({
    summary: '生成进化报告',
    description: '分析用户行为数据，生成"我学会了N件事"报告。periodDays 默认 7 天。',
  })
  @Get('evolution/report')
  async getEvolutionReport(
    @GetToken() token: TokenInfo,
    @Query('periodDays') periodDays?: string,
  ): Promise<EvolutionReport> {
    const days = periodDays ? parseInt(periodDays, 10) : 7
    return this.evolutionService.generateEvolutionReport(token.id, days)
  }

  @ApiDoc({
    summary: '计算模块排序权重',
    description: '基于用户行为数据，计算各模块的个性化排序权重',
  })
  @Post('evolution/module-weights')
  async getModuleWeights(
    @GetToken() token: TokenInfo,
    @Body() body: { moduleIds: string[] },
  ): Promise<ModuleWeight[]> {
    return this.evolutionService.calculateModuleWeights(token.id, body.moduleIds)
  }

  @ApiDoc({
    summary: '检查是否需要调整布局',
    description: '比较当前排序和基于行为数据的最优排序，判断是否需要提示用户调整',
  })
  @Post('evolution/layout-check')
  async checkLayoutReorg(
    @GetToken() token: TokenInfo,
    @Body() body: { currentOrder: string[] },
  ): Promise<LayoutReorgSuggestion | null> {
    return this.evolutionService.shouldSuggestReorg(token.id, body.currentOrder)
  }

  @ApiDoc({
    summary: '触发画像更新',
    description: '强制从近期行为数据更新用户画像（通常由 n8n 定时调用）',
  })
  @Post('evolution/sync-profile')
  async syncProfile(@GetToken() token: TokenInfo): Promise<void> {
    await this.evolutionService.updateUserProfileFromBehavior(token.id)
  }
}
