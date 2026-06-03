import { Controller, Get, Post, Put, Delete, Body, Query, Param, Logger } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { GetToken, TokenInfo } from '@yikart/aitoearn-auth'
import { ApiDoc } from '@yikart/common'
import { AgentRegistryService, ComponentSearchParams } from './agent-registry.service'

@ApiTags('Agent/Registry')
@Controller('agent')
export class AgentRegistryController {
  private readonly logger = new Logger(AgentRegistryController.name)

  constructor(private readonly registry: AgentRegistryService) {}

  // ── Agent CRUD ──

  @ApiDoc({ summary: '列出我的 Agent', description: '获取用户创建和安装的所有 Agent' })
  @Get('agents')
  async listAgents(@GetToken() token: TokenInfo) {
    // 确保有默认 Agent
    await this.registry.ensureDefaultAgents(token.id)
    return this.registry.listUserAgents(token.id)
  }

  @ApiDoc({ summary: '创建 Agent', description: '创建一个自定义 Agent 精灵' })
  @Post('agents')
  async createAgent(@GetToken() token: TokenInfo, @Body() body: Record<string, any>) {
    return this.registry.createAgent(token.id, body)
  }

  @ApiDoc({ summary: '获取 Agent 详情' })
  @Get('agents/:id')
  async getAgent(@GetToken() token: TokenInfo, @Param('id') id: string) {
    return this.registry.getAgent(id)
  }

  @ApiDoc({ summary: '更新 Agent', description: '修改 Agent 的名称、形象、性格等' })
  @Put('agents/:id')
  async updateAgent(
    @GetToken() token: TokenInfo,
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.registry.updateAgent(id, token.id, body)
  }

  @ApiDoc({ summary: '删除 Agent' })
  @Delete('agents/:id')
  async deleteAgent(@GetToken() token: TokenInfo, @Param('id') id: string) {
    await this.registry.deleteAgent(id, token.id)
  }

  // ── Agent 路由 ──

  @ApiDoc({ summary: '匹配 Agent', description: '根据用户输入匹配最合适的 Agent' })
  @Post('agents/match')
  async matchAgent(@GetToken() token: TokenInfo, @Body() body: { input: string }) {
    return this.registry.matchAgent(token.id, body.input)
  }

  // ── 组件市场 ──

  @ApiDoc({ summary: '搜索组件', description: '组件市场浏览，支持分类/来源/价格/搜索' })
  @Get('marketplace/search')
  async searchComponents(@Query() query: ComponentSearchParams) {
    return this.registry.searchComponents(query)
  }

  // ── 用户组件管理 ──

  @ApiDoc({ summary: '我的组件', description: '列出我已安装的组件' })
  @Get('components/installed')
  async listInstalledComponents(@GetToken() token: TokenInfo) {
    return this.registry.listUserInstalledComponents(token.id)
  }

  @ApiDoc({ summary: '安装组件' })
  @Post('components/install')
  async installComponent(
    @GetToken() token: TokenInfo,
    @Body() body: { componentId: string; config?: Record<string, any> },
  ) {
    return this.registry.installComponent(token.id, body.componentId, body.config ?? {})
  }

  @ApiDoc({ summary: '卸载组件' })
  @Delete('components/:componentId')
  async uninstallComponent(
    @GetToken() token: TokenInfo,
    @Param('componentId') componentId: string,
  ) {
    await this.registry.uninstallComponent(token.id, componentId)
  }

  @ApiDoc({ summary: '启用/禁用组件' })
  @Put('components/:componentId/toggle')
  async toggleComponent(
    @GetToken() token: TokenInfo,
    @Param('componentId') componentId: string,
    @Body() body: { enabled: boolean },
  ) {
    await this.registry.toggleComponent(token.id, componentId, body.enabled)
  }

  // ── 初始化 ──

  @ApiDoc({ summary: '初始化默认配置', description: '创建默认 Agent 和内置组件（幂等）' })
  @Post('init')
  async initialize(@GetToken() token: TokenInfo) {
    await Promise.all([
      this.registry.ensureDefaultAgents(token.id),
      this.registry.ensureBuiltinComponents(),
    ])
    return { success: true }
  }
}
