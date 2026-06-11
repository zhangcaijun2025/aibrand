import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { GeoService } from './geo.service'
import { GeoScoreDto, GeoOptimizeDto, GeoKeywordsDto, GeoCanaryDto } from './geo.dto'

@ApiTags('GEO')
@Controller('api/geo')
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  /* ── Score ── */

  @Post('score')
  @ApiOperation({ summary: 'GEO六维评分' })
  async score(@Body() dto: GeoScoreDto) {
    // Score persistence — actual scoring logic in frontend engine
    const saved = await this.geoService.saveScore({
      title: dto.title, overall: 65, dimensions: {}, platform: dto.platform,
    })
    return { code: 0, data: saved }
  }

  @Post('optimize')
  @ApiOperation({ summary: 'GEO内容优化' })
  async optimize(@Body() dto: GeoOptimizeDto) {
    return { code: 0, data: { message: 'Optimization delegated to GEO engine' } }
  }

  /* ── Keywords ── */

  @Post('keywords')
  @ApiOperation({ summary: '关键词发现' })
  async keywords(@Body() dto: GeoKeywordsDto) {
    return { code: 0, data: [] }
  }

  /* ── Region ── */

  @Get('region')
  @ApiOperation({ summary: '地域数据查询' })
  async getRegions(@Query('q') q?: string, @Query('city') city?: string, @Query('platform') platform?: string) {
    if (q) {
      const results = await this.geoService.searchRegions(q)
      return { code: 0, data: results, total: results.length }
    }
    if (city) {
      const region = await this.geoService.getRegionByCode(city)
      return { code: 0, data: region }
    }
    if (platform) {
      const rules = await this.geoService.getPlatformRules(platform)
      return { code: 0, data: rules, total: rules.length }
    }
    const regions = await this.geoService.getAllRegions()
    return { code: 0, data: regions, total: regions.length }
  }

  @Post('region/bind')
  @ApiOperation({ summary: '账号绑定地域' })
  async bindRegion(@Body() body: any) {
    const binding = await this.geoService.bindAccount(body)
    return { code: 0, data: binding }
  }

  @Get('region/bindings')
  @ApiOperation({ summary: '账号地域绑定列表' })
  async getBindings(@Query('platform') platform?: string) {
    const bindings = await this.geoService.getAccountBindings(platform)
    return { code: 0, data: bindings }
  }

  /* ── Health ── */

  @Get('health')
  @ApiOperation({ summary: 'GeoHealth 健康指标' })
  async getHealth() {
    const [scores, citations, sentiments, history] = await Promise.all([
      this.geoService.getScoreHistory(5),
      this.geoService.getCitationStats(),
      this.geoService.getSentimentHistory(5),
      this.geoService.getHealthHistory(1),
    ])
    const prevOverall = history[0]?.overall || 55
    return {
      code: 0,
      data: {
        overall: prevOverall,
        dsHealth: { score: 44, aiMentionRate: citations.mentionRate, citationPosition: 50, authorityWeight: 50, intentCoverage: 67 },
        localHealth: { score: 67, geoScoreAvg: scores[0]?.overall || 63, localTrafficRate: 50, tagPoiAccuracy: 82, complianceRate: 85, templateEffect: 60 },
        trend: 'stable',
      },
    }
  }

  /* ── Citation ── */

  @Post('citation')
  @ApiOperation({ summary: '保存引用事件' })
  async saveCitation(@Body() body: any) {
    const saved = await this.geoService.saveCitation(body)
    return { code: 0, data: saved }
  }

  @Get('citation/stats')
  @ApiOperation({ summary: '引用统计' })
  async citationStats() {
    return { code: 0, data: await this.geoService.getCitationStats() }
  }

  /* ── Sentiment ── */

  @Post('sentiment')
  @ApiOperation({ summary: '保存舆情事件' })
  async saveSentiment(@Body() body: any) {
    const saved = await this.geoService.saveSentiment(body)
    return { code: 0, data: saved }
  }

  /* ── Canary ── */

  @Post('canary')
  @ApiOperation({ summary: '启动灰度部署' })
  async startCanary(@Body() dto: GeoCanaryDto) {
    const deploy = await this.geoService.saveCanaryDeployment({
      proposalId: dto.proposalId, stage: dto.riskLevel === 'low' ? 'canary_5pct' : 'draft',
      targetModule: dto.module, changeType: dto.changeType, changeDescription: dto.description,
      riskLevel: dto.riskLevel, startedAt: new Date(), metrics: { preScore: 55 }, status: 'active',
    })
    return { code: 0, data: deploy }
  }

  @Get('canary/active')
  @ApiOperation({ summary: '活跃灰度部署' })
  async activeCanaries() {
    return { code: 0, data: await this.geoService.getActiveCanaryDeployments() }
  }

  /* ── Template ── */

  @Get('template')
  @ApiOperation({ summary: '地域模板列表' })
  async getTemplates(@Query('platform') platform?: string) {
    const templates = await this.geoService.getTemplates(platform)
    return { code: 0, data: templates }
  }

  @Post('template/:id/deprecate')
  @ApiOperation({ summary: '下线模板' })
  async deprecateTemplate(@Param('id') id: string) {
    await this.geoService.updateTemplateStatus(id, 'deprecated')
    return { code: 0, message: 'Template deprecated' }
  }
}
