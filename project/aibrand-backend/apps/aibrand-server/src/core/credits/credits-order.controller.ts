/**
 * CreditsOrderController - 积分购买订单 API
 */
import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { GetToken, TokenInfo } from '@yikart/aibrand-auth'
import { ApiDoc } from '@yikart/common'
import { RateLimit, RateLimitGuard } from '../../common/guards'
import { CreateOrderDto } from './credits-order.dto'
import { CreditsOrderService } from './credits-order.service'

@ApiTags('Me/Credits/Orders')
@Controller('user/credits')
@UseGuards(RateLimitGuard)
export class CreditsOrderController {
  constructor(private readonly orderService: CreditsOrderService) {}

  @ApiDoc({
    summary: 'Create Credit Purchase Order',
    description: '创建积分购买订单，返回支付链接',
  })
  @Post('orders')
  @RateLimit({ ttl: 3600, limit: 10, keyGenerator: (req: any) => `credits:order:${req.user?.id}` })
  async createOrder(
    @GetToken() token: TokenInfo,
    @Body() dto: CreateOrderDto,
  ) {
    return this.orderService.createOrder(token.id, dto)
  }

  @ApiDoc({
    summary: 'Get Order Status',
    description: '查询订单支付状态',
  })
  @Get('orders/:orderNo')
  async getOrderStatus(@Param('orderNo') orderNo: string) {
    return this.orderService.getOrderStatus(orderNo)
  }

  @ApiDoc({
    summary: 'Get My Orders',
    description: '获取当前用户的购买订单列表',
  })
  @Get('orders')
  async getMyOrders(
    @GetToken() token: TokenInfo,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
  ) {
    return this.orderService.getUserOrders(token.id, Number(page), Number(pageSize))
  }
}
