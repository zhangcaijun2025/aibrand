import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common'

const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/

/**
 * ParseObjectIdPipe — 校验 MongoDB ObjectId 参数
 *
 * 用于 @Param('id') 等路由参数，防止无效 ObjectId
 * 导致 Mongoose CastError → 500 内部错误。
 *
 * @example
 * ```ts
 * @Get(':id')
 * async getById(@Param('id', ParseObjectIdPipe) id: string) {
 *   return this.service.findById(id)
 * }
 * ```
 */
@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!value || !OBJECT_ID_REGEX.test(value)) {
      throw new BadRequestException({
        code: 10002,
        message: `Invalid ID format: "${value}" is not a valid MongoDB ObjectId`,
      })
    }
    return value
  }
}
