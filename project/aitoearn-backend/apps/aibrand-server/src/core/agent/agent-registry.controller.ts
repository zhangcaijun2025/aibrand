import { Controller, Get, Post, Put, Delete, Body, Query, Param, Logger } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { GetToken, TokenInfo } from '@yikart/aibrand-auth'
import { ApiDoc } from '@yikart/common'
import { AgentRegistryService, ComponentSearchParams } from './agent-registry.service'
import { CreateAgentDto, UpdateAgentDto, QuickConfigDto } from './agent-registry.dto'

@ApiTags('Agent/Registry')
@Controller('agent')
export class AgentRegistryController {
  private readonly logger = new Logger(AgentRegistryController.name)

  constructor(private readonly registry: AgentRegistryService) {}

  // ── 预设浏览器 ──

  @ApiDoc({ summary: '获取预置 Agent 模板列表', description: '浏览所有可用的预置 Agent 模板' })
  @Get('presets')
  getPresets() {
    return this.registry.getPresets()
  }

  // ── Agent 列表 + CRUD ──

  @ApiDoc({ summary: '列出我的 Agent', description: '获取用户的所有 Agent（首次调用自动安装预设）' })
  @Get('agents')
  async listAgents(@GetToken() token: TokenInfo) {
    await this.registry.ensureDefaultAgents(token.id)
    return this.registry.listUserAgents(token.id)
  }

  @ApiDoc({ summary: 'Agent 定制摘要', description: '查看哪些 Agent 已被定制过' })
  @Get('agents/summary')
  async getSummary(@GetToken() token: TokenInfo) {
    await this.registry.ensureDefaultAgents(token.id)
    return this.registry.getCustomizationSummary(token.id)
  }

  @ApiDoc({ summary: '创建 Agent', description: '从零创建一个全新的自定义 Agent' })
  @Post('agents')
  async createAgent(@GetToken() token: TokenInfo, @Body() body: CreateAgentDto) {
    return this.registry.createAgent(token.id, body)
  }

  @ApiDoc({ summary: '获取 Agent 详情' })
  @Get('agents/:id')
  async getAgent(@GetToken() token: TokenInfo, @Param('id') id: string) {
    return this.registry.getAgent(id)
  }

  @ApiDoc({ summary: '定制 Agent', description: '修改 Agent 的任何属性，自动标记为「已定制」' })
  @Put('agents/:id')
  async updateAgent(
    @GetToken() token: TokenInfo,
    @Param('id') id: string,
    @Body() body: UpdateAgentDto,
  ) {
    return this.registry.customizeAgent(id, token.id, body)
  }

  @ApiDoc({ summary: '快速配置 Agent', description: '在一个请求中调整名称/形象/性格/唤醒词/能力范围' })
  @Put('agents/:id/quick-config')
  async quickConfig(
    @GetToken() token: TokenInfo,
    @Param('id') id: string,
    @Body() body: QuickConfigDto,
  ) {
    return this.registry.quickConfig(id, token.id, body)
  }

  @ApiDoc({ summary: '重置 Agent', description: '将 Agent 恢复为预设默认值，撤销所有自定义' })
  @Post('agents/:id/reset')
  async resetAgent(
    @GetToken() token: TokenInfo,
    @Param('id') id: string,
  ) {
    return this.registry.resetAgentToPreset(id, token.id)
  }

  @ApiDoc({ summary: '删除 Agent' })
  @Delete('agents/:id')
  async deleteAgent(@GetToken() token: TokenInfo, @Param('id') id: string) {
    await this.registry.deleteAgent(id, token.id)
  }

  @ApiDoc({ summary: '排序 Agent', description: '拖拽调整 Agent 显示顺序' })
  @Put('agents/reorder')
  async reorderAgents(
    @GetToken() token: TokenInfo,
    @Body() body: { orderedIds: string[] },
  ) {
    await this.registry.reorderAgents(token.id, body.orderedIds)
  }

  // ── Agent 路由 ──

  @ApiDoc({ summary: '匹配 Agent', description: '根据用户输入匹配最合适的 Agent。支持唤醒词和意图匹配。' })
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

  @ApiDoc({ summary: '初始化', description: '一键创建所有预设 Agent 和内置组件（幂等）' })
  @Post('init')
  async initialize(@GetToken() token: TokenInfo) {
    const [agents] = await Promise.all([
      this.registry.ensureDefaultAgents(token.id),
      this.registry.ensureBuiltinComponents(),
    ])
    return {
      success: true,
      agentsCreated: agents.length,
      message: `已为你准备好 ${agents.length} 个 Agent`,
    }
  }
}
