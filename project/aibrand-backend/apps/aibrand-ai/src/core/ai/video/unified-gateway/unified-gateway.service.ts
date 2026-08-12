/**
 * 统一模型网关渠道 — P4 收敛
 *
 * 后端不再直连 MiniMax 等视频模型，统一转发到 aibrand-web 的
 * /api/models/unified/generate + query（x-internal-token 服务间鉴权）。
 * 积分体系已停用（BILLING_ENABLED 默认关闭）：本渠道不再查余额/扣费，
 * 保证模型直接调用。
 */
import { Injectable, Logger } from '@nestjs/common'
import { AppException, ResponseCode } from '@yikart/common'
import { AiLog, AiLogChannel, AiLogRepository, AiLogStatus, AiLogType } from '@yikart/mongodb'
import { TaskStatus } from '../../../../common'
import { UserVideoGenerationRequestDto } from '../video.dto'

export interface UnifiedGatewayVideoPoll {
  status: string
  videoUrl?: string
  error?: { message: string }
}

@Injectable()
export class UnifiedGatewayVideoService {
  private readonly logger = new Logger(UnifiedGatewayVideoService.name)
  private readonly baseUrl = (process.env['UNIFIED_GATEWAY_URL'] || 'http://aibrand-web:3000').replace(/\/+$/, '')
  private readonly internalToken = process.env['INTERNAL_TOKEN'] || 'change-this-secret-token'

  constructor(
    private readonly aiLogRepo: AiLogRepository,
  ) {}

  private headers(): Record<string, string> {
    return { 'Content-Type': 'application/json', 'x-internal-token': this.internalToken }
  }

  /**
   * 创建视频任务：转发到统一网关（MiniMax H3 等）
   */
  async createVideo(request: UserVideoGenerationRequestDto) {
    const { userId, userType, model, prompt, image, image_tail, duration, size } = request

    const startedAt = new Date()
    const firstFrame = Array.isArray(image) ? image[0] : image

    const res = await fetch(`${this.baseUrl}/api/models/unified/generate`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        modality: 'video',
        prompt,
        preferModel: model,
        videoParams: {
          resolution: size,
          duration,
          startImageUrl: firstFrame,
          endImageUrl: image_tail,
        },
      }),
    })
    const raw = await res.text()
    const json = (() => {
      try {
        return JSON.parse(raw)
      }
      catch {
        return {}
      }
    })() as { data?: { taskId?: string }, message?: string }
    if (!res.ok || !json.data?.taskId) {
      this.logger.error({ status: res.status, raw: raw.slice(0, 300) }, '统一网关视频提交失败')
      throw new AppException(ResponseCode.AiCallFailed)
    }
    const gatewayTaskId = json.data.taskId

    const aiLog = await this.aiLogRepo.create({
      userId,
      userType,
      taskId: gatewayTaskId,
      model,
      channel: AiLogChannel.UnifiedGateway,
      startedAt,
      type: AiLogType.Video,
      points: 0,
      request: { prompt, image: firstFrame, image_tail, duration, size },
      status: AiLogStatus.Generating,
    })
    return { id: aiLog.id, status: TaskStatus.Submitted, points: 0 }
  }

  /** 查询统一网关任务状态 */
  async getTask(taskId: string): Promise<UnifiedGatewayVideoPoll> {
    const res = await fetch(`${this.baseUrl}/api/models/unified/query/${encodeURIComponent(taskId)}`, {
      headers: { 'x-internal-token': this.internalToken },
    })
    const raw = await res.text()
    const json = (() => {
      try {
        return JSON.parse(raw)
      }
      catch {
        return {}
      }
    })() as { data?: { status?: string, resultUrls?: string[], error?: string }, message?: string }
    if (!res.ok) {
      return { status: TaskStatus.Failure, error: { message: json.message || `HTTP ${res.status}` } }
    }
    const data = json.data || {}
    if (data.status === 'completed') {
      return { status: TaskStatus.Success, videoUrl: data.resultUrls?.[0] }
    }
    if (data.status === 'failed') {
      return { status: TaskStatus.Failure, error: { message: data.error || '视频生成失败' } }
    }
    return { status: TaskStatus.InProgress }
  }

  /** 回调：把网关状态写入 AiLog */
  async callback(poll: UnifiedGatewayVideoPoll, aiLog: AiLog): Promise<void> {
    if (aiLog.status !== AiLogStatus.Generating)
      return
    const elapsedMs = Date.now() - aiLog.startedAt.getTime()
    if (poll.status === TaskStatus.Success && poll.videoUrl) {
      await this.aiLogRepo.updateById(aiLog.id, {
        status: AiLogStatus.Success,
        response: { status: TaskStatus.Success, videoUrl: poll.videoUrl },
        duration: elapsedMs,
      })
      return
    }
    if (poll.status === TaskStatus.Failure) {
      await this.aiLogRepo.updateById(aiLog.id, {
        status: AiLogStatus.Failed,
        response: { status: TaskStatus.Failure, error: poll.error || { message: '视频生成失败' } },
        duration: elapsedMs,
      })
    }
  }

  /** 统一任务结果视图（transformToCommonResponse 用） */
  getTaskResult(poll: UnifiedGatewayVideoPoll) {
    return {
      status: poll.status === TaskStatus.Success ? TaskStatus.Success : TaskStatus.Failure,
      videoUrl: poll.videoUrl,
      error: poll.error,
    }
  }
}
