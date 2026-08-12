import { Module } from '@nestjs/common'
import { ModelsConfigModule } from '../models-config'
import { GeminiVideoModule } from './gemini'
import { GrokVideoModule } from './grok'
import { OpenAIVideoModule } from './openai'
import { UnifiedGatewayVideoModule } from './unified-gateway'
import { VideoTaskStatusScheduler } from './video-task-status.scheduler'
import { VideoController } from './video.controller'
import { VideoService } from './video.service'
import { VolcengineVideoModule } from './volcengine'

@Module({
  imports: [
    ModelsConfigModule,
    VolcengineVideoModule,
    OpenAIVideoModule,
    GeminiVideoModule,
    GrokVideoModule,
    UnifiedGatewayVideoModule,
  ],
  controllers: [VideoController],
  providers: [VideoService, VideoTaskStatusScheduler],
  exports: [VideoService, VolcengineVideoModule, OpenAIVideoModule, GeminiVideoModule, GrokVideoModule, UnifiedGatewayVideoModule],
})
export class VideoModule {}
