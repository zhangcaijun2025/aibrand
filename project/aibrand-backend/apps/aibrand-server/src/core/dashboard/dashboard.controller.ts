import { Controller, Get, Logger } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { GetToken, TokenInfo } from '@yikart/aibrand-auth'
import { ApiDoc } from '@yikart/common'
import { DashboardService, DashboardResponse } from './dashboard.service'

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name)

  constructor(private readonly dashboardService: DashboardService) {}

  @ApiDoc({
    summary: 'Get Dashboard Data',
    description: '返回看板全部数据：问候、指标卡、趋势图、渠道分布、转化对比、最近记录、热门排行、AI 洞察',
  })
  @Get()
  async getDashboard(@GetToken() token: TokenInfo): Promise<DashboardResponse> {
    this.logger.log(`Dashboard requested by userId=${token.id}`)
    return this.dashboardService.getDashboard(token.id)
  }
}
