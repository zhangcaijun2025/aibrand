import type { SkillKey, SkillKeyStatus, SkillKeyType } from './skill-keys.data'
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { UserType } from '@yikart/common'
import { Request, Response } from 'express'
import { CreateContentGenerationTaskDto } from '../agent/agent.dto'
import { AgentService } from '../agent/agent.service'
import {
  ALL_SKILL_KEYS,
  EXECUTABLE_SKILL_KEYS,
  getSkillByKey,

} from './skill-keys.data'

@Injectable()
export class SkillsService {
  private readonly logger = new Logger(SkillsService.name)

  constructor(private readonly agentService: AgentService) {}

  /** 列出所有 skillKey(支持 type/status 过滤) */
  listSkills(type?: SkillKeyType, status?: SkillKeyStatus): SkillKey[] {
    let result = ALL_SKILL_KEYS
    if (type) {
      result = result.filter(k => k.type === type)
    }
    if (status) {
      result = result.filter(k => k.status === status)
    }
    return result
  }

  /** 查询单个 skillKey */
  getSkill(key: string): SkillKey {
    const skill = getSkillByKey(key)
    if (!skill) {
      throw new NotFoundException(`skillKey '${key}' not found`)
    }
    return skill
  }

  /**
   * 执行 skillKey(仅 expert 类支持)
   *
   * 内部调用 AgentService.createContentGenerationTask(),
   * 将 skill 的 name/description 作为系统提示注入 prompt。
   *
   * 返回 RxJS Observable(SSE 流),与 POST /agent/tasks 格式一致。
   */
  executeSkill(
    key: string,
    userId: string,
    dto: { prompt: string, model?: string, taskId?: string },
    abortController: AbortController,
    req: Request,
    res: Response,
  ) {
    const skill = getSkillByKey(key)

    if (!skill) {
      throw new NotFoundException(`skillKey '${key}' not found`)
    }

    if (skill.type !== 'expert') {
      throw new BadRequestException(
        `skillKey '${key}' (type: ${skill.type}) is not executable. Only expert type is supported.`,
      )
    }

    // 构造增强提示词:将 skill 的身份和能力注入 prompt
    const enhancedPrompt = this.enhancePrompt(skill, dto.prompt)

    // 构造 CreateContentGenerationTaskDto
    const createDto = {
      prompt: enhancedPrompt,
      model: dto.model || skill.model,
      includePartialMessages: true,
      taskId: dto.taskId,
    } as CreateContentGenerationTaskDto

    this.logger.log(
      `Executing skill '${key}' for user ${userId}, model=${createDto.model}`,
    )

    // 调用 AgentService,返回 SSE Observable
    return this.agentService.createContentGenerationTask(
      userId,
      UserType.User,
      createDto,
      abortController,
      req,
      res,
    )
  }

  /** 将 skill 身份注入 prompt */
  private enhancePrompt(skill: SkillKey, userPrompt: string): string {
    return [
      `You are acting as ${skill.name}, an AI expert specialized in: ${skill.description}`,
      ``,
      `Skill Key: ${skill.key}`,
      `Output Format: ${skill.outputFormat || 'text'}`,
      ``,
      `User Request:`,
      userPrompt,
    ].join('\n')
  }

  /** 获取可执行的 skillKey 列表(仅 expert 类) */
  listExecutableSkills(): SkillKey[] {
    return EXECUTABLE_SKILL_KEYS
  }
}
