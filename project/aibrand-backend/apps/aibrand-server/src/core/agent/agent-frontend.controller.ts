import { Body, Controller, Get, Logger, Param, Put } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { GetToken, TokenInfo } from '@yikart/aibrand-auth'
import { ApiDoc } from '@yikart/common'
import { QuickConfigDto } from './agent-registry.dto'
import { AgentRegistryService } from './agent-registry.service'

/**
 * Agent 前端页面控制器 —— 与前端调用路径对齐。
 *
 * 现有 AgentRegistryController 挂在 `/agent/*` 下，而前端页面调用的是 `/agents/*`，
 * 二者路径命名不一致导致走代理 `/api/agents/*` 时 404。
 * 这里补一组与前端完全一致的入口，复用同一个 AgentRegistryService，避免行为分叉。
 */
@ApiTags('Agent/Frontend')
@Controller('agents')
export class AgentFrontendController {
  private readonly logger = new Logger(AgentFrontendController.name)

  constructor(private readonly registry: AgentRegistryService) {}

  @ApiDoc({ summary: '获取 Agent 详情（前端 GET /api/agents/:id）' })
  @Get(':id')
  getAgent(@GetToken() token: TokenInfo, @Param('id') id: string) {
    return this.registry.getAgent(id)
  }

  @ApiDoc({ summary: '快速配置 Agent（前端 PUT /api/agents/:id/quick-config）' })
  @Put(':id/quick-config')
  quickConfig(
    @GetToken() token: TokenInfo,
    @Param('id') id: string,
    @Body() body: QuickConfigDto,
  ) {
    return this.registry.quickConfig(id, token.id, body)
  }
}
