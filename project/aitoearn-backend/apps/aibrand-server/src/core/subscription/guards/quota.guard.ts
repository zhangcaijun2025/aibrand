import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { SubscriptionService } from '../subscription.service'

/** 配额操作类型 */
export const QUOTA_ACTION_KEY = 'quota_action'

/**
 * 声明接口所需的配额操作类型
 *
 * @example
 * ```ts
 * @RequireQuota('create_content')
 * @Post()
 * async create() { ... }
 * ```
 */
export const RequireQuota = (action: string) => SetMetadata(QUOTA_ACTION_KEY, action)

/**
 * QuotaGuard — 配额检查守卫
 *
 * 在请求处理前检查用户配额，超限返回 403
 *
 * 使用方式:
 * ```ts
 * @UseGuards(QuotaGuard)
 * @RequireQuota('create_content')
 * export class MaterialController { ... }
 * ```
 *
 * 配额判断逻辑:
 * 1. 从 ExecutionContext 提取用户 ID (token.id)
 * 2. 从 @RequireQuota 装饰器获取配额操作类型
 * 3. 调用 SubscriptionService.checkQuota() 检查是否超限
 * 4. 超限 → 抛出 ForbiddenException (403)
 * 5. 未超限 → 放行，控制器负责调用 incrementQuota()
 */
@Injectable()
export class QuotaGuard implements CanActivate {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. 获取配额操作类型
    const action = this.reflector.getAllAndOverride<string>(QUOTA_ACTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    // 如果没有 @RequireQuota 装饰器，跳过配额检查
    if (!action) {
      return true
    }

    // 2. 从请求中获取用户信息
    const request = context.switchToHttp().getRequest()
    const token = request.user

    if (!token?.id) {
      // 没有用户上下文 — AuthGuard 应该在 QuotaGuard 之前运行
      // 如果到这里还没有用户信息，说明 AuthGuard 未正确配置，拒绝请求
      throw new UnauthorizedException({
        code: 10401,
        message: '未认证请求，配额检查需要用户上下文',
      })
    }

    // 3. 检查配额
    const hasQuota = await this.subscriptionService.checkQuota(token.id, action)

    if (!hasQuota) {
      throw new ForbiddenException({
        code: 10001,
        message: '本月配额已用完，请升级订阅以获取更多配额',
        action,
      })
    }

    return true
  }
}
