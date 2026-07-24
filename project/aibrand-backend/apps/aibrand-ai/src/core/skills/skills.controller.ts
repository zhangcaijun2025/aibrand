import {
  Body,
  Controller,
  Get,
  Header,
  Logger,
  Param,
  Post,
  Query,
  Req,
  Res,
  SetMetadata,
} from '@nestjs/common'
import { SSE_METADATA } from '@nestjs/common/constants'
import { ApiTags } from '@nestjs/swagger'
import { GetToken, TokenInfo } from '@yikart/aibrand-auth'
import { ApiDoc } from '@yikart/common'
import { Request, Response } from 'express'
import { ExecuteSkillDto, ExecuteSkillSchema } from './skills.dto'
import { SkillsService } from './skills.service'

@ApiTags('Skills')
@Controller('skills')
export class SkillsController {
  private readonly logger = new Logger(SkillsController.name)

  constructor(private readonly skillsService: SkillsService) {}

  /** GET /skills/list — 列出所有 skillKey(支持 type/status 过滤) */
  @ApiDoc({
    summary: 'List all skillKeys',
    description:
      'Returns all 29 skillKeys, optionally filtered by type (expert|enterprise|tool) or status (active|beta|deprecated).',
  })
  @Get('list')
  listSkills(
    @Query('type') type?: 'expert' | 'enterprise' | 'tool',
    @Query('status') status?: 'active' | 'beta' | 'deprecated',
  ) {
    return this.skillsService.listSkills(type, status)
  }

  /** GET /skills/:key — 查询单个 skillKey */
  @ApiDoc({
    summary: 'Get skillKey by key',
    description: 'Returns a single skillKey by its key.',
  })
  @Get(':key')
  getSkill(@Param('key') key: string) {
    return this.skillsService.getSkill(key)
  }

  /** POST /skills/:key/execute — 执行 skillKey(仅 expert 类,SSE 流) */
  @ApiDoc({
    summary: 'Execute skillKey',
    description:
      'Execute an expert-type skillKey. Returns SSE stream (same format as POST /agent/tasks).',
    body: ExecuteSkillSchema,
  })
  @SetMetadata(SSE_METADATA, true)
  @Header('Cache-Control', 'no-cache, no-transform')
  @Header('Connection', 'keep-alive')
  @Header('X-Accel-Buffering', 'no')
  @Header('Content-Encoding', 'none')
  @Post(':key/execute')
  executeSkill(
    @GetToken() token: TokenInfo | undefined,
    @Param('key') key: string,
    @Body() body: ExecuteSkillDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const abortController = new AbortController()
    // internal token (服务间调用) 不设置 req.user,使用 'system' 作为 userId 兜底
    const userId = token?.id ?? 'system'

    res.on('close', () => {
      this.logger.debug(`User ${userId} closed connection for skill '${key}'`)
    })

    return this.skillsService.executeSkill(
      key,
      userId,
      body,
      abortController,
      req,
      res,
    )
  }
}
