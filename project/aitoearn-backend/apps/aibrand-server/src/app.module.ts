import path from 'node:path'
import { Module } from '@nestjs/common'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { ScheduleModule } from '@nestjs/schedule'
import { AiServicesModule } from '@yikart/ai-services'
import { aibrandAiClientModule } from '@yikart/aibrand-ai-client'
import { aibrandAuthModule } from '@yikart/aibrand-auth'
import { aibrandQueueModule } from '@yikart/aibrand-queue'
import { AliSmsModule } from '@yikart/ali-sms'
import { ChannelDbModule } from '@yikart/channel-db'
import { MailModule } from '@yikart/mail'
import { MongodbModule } from '@yikart/mongodb'
import { RedlockModule } from '@yikart/redlock'
import { config } from './config'
import { AccountModule } from './core/account/account.module'
import { AgentModule } from './core/agent/agent.module'
import { ApiKeyModule } from './core/api-key/api-key.module'
import { AssetsModule } from './core/assets/assets.module'
import { ChannelModule } from './core/channel/channel.module'
import { ContentModule } from './core/content/content.module'
import { CreditsModule } from './core/credits/credits.module'
import { DashboardModule } from './core/dashboard/dashboard.module'
import { InternalModule } from './core/internal/internal.module'
import { NotificationModule } from './core/notification/notification.module'
import { PublishModule } from './core/publish-record/publish-record.module'
import { RelayModule } from './core/relay/relay.module'
import { ShortLinkModule } from './core/short-link/short-link.module'
import { SubscriptionModule } from './core/subscription/subscription.module'
import { ToolsModule } from './core/tools/tools.module'
import { UnifiedMcpModule } from './core/unified-mcp/unified-mcp.module'
import { UserModule } from './core/user/user.module'
import { WorkflowModule } from './core/workflow/workflow.module'
import { GeoModule } from './core/geo/geo.module'

@Module({
  imports: [
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    MongodbModule.forRoot(config.mongodb),
    ChannelDbModule.forRoot(config.channel.channelDb),
    aibrandQueueModule.forRoot({
      redis: config.redis,
      prefix: '{bull}',
    }),
    MailModule.forRoot({
      ...config.mail,
      template: {
        dir: path.join(__dirname, 'views'),
      },
    }),
    aibrandAuthModule.forRoot(config.auth),
    RedlockModule.forRoot(config.redlock),
    aibrandAiClientModule.forRoot(config.aiClient),
    AliSmsModule.forRoot(config.aliSms),
    AiServicesModule.forRoot({
      dify: config.dify,
      n8n: config.n8n,
      oneApi: config.newApi ? { baseUrl: config.newApi.baseUrl, token: config.newApi.token } : undefined,
    }),
    AssetsModule,
    NotificationModule,
    AccountModule,
    UserModule,
    CreditsModule,
    ContentModule,
    ChannelModule,
    PublishModule,
    InternalModule,
    ShortLinkModule,
    SubscriptionModule,
    AgentModule,
    DashboardModule,
    ToolsModule,
    ApiKeyModule,
    RelayModule,
    UnifiedMcpModule,
    WorkflowModule,
    GeoModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
