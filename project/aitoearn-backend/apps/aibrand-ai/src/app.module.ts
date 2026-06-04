import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { aibrandAuthModule } from '@yikart/aibrand-auth'
import { aibrandQueueModule } from '@yikart/aibrand-queue'
import { aibrandServerClientModule } from '@yikart/aibrand-server-client'
import { AssetsModule } from '@yikart/assets'
import { HelpersModule } from '@yikart/helpers'
import { MongodbModule } from '@yikart/mongodb'
import { RedlockModule } from '@yikart/redlock'
import { config } from './config'
import { AgentModule } from './core/agent/agent.module'
import { AiModule } from './core/ai/ai.module'
import { DraftGenerationModule } from './core/draft-generation'
import { InternalModule } from './core/internal'
import { MaterialAdaptationModule } from './core/material-adaptation'

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongodbModule.forRoot(config.mongodb),
    aibrandQueueModule.forRoot({
      redis: config.redis,
      prefix: '{bull}',
    }),
    RedlockModule.forRoot(config.redlock),
    aibrandAuthModule.forRoot(config.auth),
    aibrandServerClientModule.forRoot(config.serverClient),
    AssetsModule.forRoot(config.assets),
    HelpersModule,
    AiModule,
    AgentModule,
    InternalModule,
    MaterialAdaptationModule,
    DraftGenerationModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
