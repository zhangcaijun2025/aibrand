import { Body, Controller, Delete, Get, Post, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { GetToken, TokenInfo } from '@yikart/aibrand-auth'
import { ApiDoc } from '@yikart/common'
import { RateLimit, RateLimitGuard } from '../../common/guards'
import { SubscribeDto } from './subscription.dto'
import { SubscriptionService } from './subscription.service'
import { MySubscriptionVo, PlanListVo, PlanVo, SubscribeResponseVo } from './subscription.vo'

@ApiTags('Me/Subscription')
@Controller('user/subscription')
@UseGuards(RateLimitGuard)
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @ApiDoc({
    summary: '获取所有订阅计划',
    response: PlanListVo,
  })
  @Get('plans')
  @RateLimit({ ttl: 60, limit: 30, keyGenerator: (req: any) => `sub:plans:${req.user?.id || req.ip}` })
  async listPlans() {
    const plans = await this.subscriptionService.listPlans()
    return { plans: plans.map(p => PlanVo.create(p)) }
  }

  @ApiDoc({
    summary: '获取我的订阅状态',
    response: MySubscriptionVo,
  })
  @Get()
  async getMySubscription(@GetToken() token: TokenInfo) {
    const sub = await this.subscriptionService.getMySubscription(token.id)
    return MySubscriptionVo.create(sub)
  }

  @ApiDoc({
    summary: '订阅 / 升级计划',
    description: '选择付费计划并获取支付链接',
    body: SubscribeDto.schema,
    response: SubscribeResponseVo,
  })
  @Post('subscribe')
  @RateLimit({ ttl: 3600, limit: 5, keyGenerator: (req: any) => `sub:subscribe:${req.user?.id}` })
  async subscribe(@GetToken() token: TokenInfo, @Body() dto: SubscribeDto) {
    const result = await this.subscriptionService.subscribe(token.id, dto)
    return SubscribeResponseVo.create(result)
  }

  @ApiDoc({
    summary: '取消当前订阅',
  })
  @Delete()
  async cancelSubscription(@GetToken() token: TokenInfo) {
    await this.subscriptionService.cancelSubscription(token.id)
  }
}
