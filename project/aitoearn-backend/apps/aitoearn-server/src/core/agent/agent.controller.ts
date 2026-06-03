import { Controller, Get, Logger, Post, Body } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { GetToken, TokenInfo } from '@yikart/aitoearn-auth'
import { ApiDoc } from '@yikart/common'
import { AgentGreeting, AgentService } from './agent.service'

@ApiTags('Agent')
@Controller('agent')
export class AgentController {
  private readonly logger = new Logger(AgentController.name)

  constructor(private readonly agentService: AgentService) {}

  @ApiDoc({
    summary: 'Agent 主动问候',
    description: '返回用户打开应用时的个性化问候：系统状态、今日简报、建议下一步、夜间事件',
  })
  @Get('greeting')
  async getGreeting(@GetToken() token: TokenInfo): Promise<AgentGreeting> {
    this.logger.log(`Generating greeting for userId=${token.id}`)
    return this.agentService.generateGreeting(token.id)
  }

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

  @ApiDoc({
    summary: '获取未读事件',
    description: '获取用户未读的系统事件（自愈、洞察、里程碑）',
  })
  @Get('events')
  async getUnreadEvents(@GetToken() token: TokenInfo) {
    return this.agentService.getUnreadEvents(token.id)
  }

  @ApiDoc({
    summary: '获取用户上下文',
    description: '获取用户当前的上下文信息（竞品关注、项目、偏好）',
  })
  @Get('context')
  async getContext(@GetToken() token: TokenInfo) {
    return this.agentService.getContext(token.id)
  }

  @ApiDoc({
    summary: '获取用户画像',
    description: '获取用户长期画像（行业、成长曲线、里程碑）',
  })
  @Get('profile')
  async getProfile(@GetToken() token: TokenInfo) {
    return this.agentService.getProfile(token.id)
  }
}
