import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common'
import { IS_INTERNAL_KEY, IS_PUBLIC_KEY } from './aibrand-auth.constants'

export const GetToken = createParamDecorator(
  (_data: string, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest()
    return req['user']
  },
)

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
export const Internal = () => SetMetadata(IS_INTERNAL_KEY, true)
