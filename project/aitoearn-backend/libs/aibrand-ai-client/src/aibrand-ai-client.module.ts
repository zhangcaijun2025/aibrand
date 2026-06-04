import { DynamicModule, Module } from '@nestjs/common'
import { aibrandAiClientConfig } from './aibrand-ai-client.config'
import { aibrandAiClientService } from './aibrand-ai-client.service'
import { AgentService } from './clients/agent.service'
import { AiService } from './clients/ai.service'

@Module({})
export class aibrandAiClientModule {
  static forRoot(options: aibrandAiClientConfig): DynamicModule {
    return {
      global: true,
      module: aibrandAiClientModule,
      providers: [
        {
          provide: aibrandAiClientConfig,
          useValue: options,
        },
        AiService,
        AgentService,
        aibrandAiClientService,
      ],
      exports: [aibrandAiClientService, AiService, AgentService],
    }
  }
}
