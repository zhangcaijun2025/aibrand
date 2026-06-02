/**
 * AiServicesModule — AI 服务集成模块
 *
 * 全局模块，提供 Dify + n8n 服务注入
 */

import { HttpModule, HttpService } from '@nestjs/axios'
import { DynamicModule, Global, Module } from '@nestjs/common'
import { DifyConfig, DifyService } from './dify.service'
import { N8nConfig, N8nService } from './n8n.service'

export interface AiServicesModuleOptions {
  dify: DifyConfig
  n8n: N8nConfig
}

@Global()
@Module({})
export class AiServicesModule {
  static forRoot(options: AiServicesModuleOptions): DynamicModule {
    return {
      module: AiServicesModule,
      imports: [HttpModule],
      providers: [
        { provide: 'DIFY_CONFIG', useValue: options.dify },
        { provide: 'N8N_CONFIG', useValue: options.n8n },
        {
          provide: DifyService,
          useFactory: (http: HttpService, config: DifyConfig) =>
            new DifyService(http, config),
          inject: [HttpService, 'DIFY_CONFIG'],
        },
        {
          provide: N8nService,
          useFactory: (http: HttpService, config: N8nConfig) =>
            new N8nService(http, config),
          inject: [HttpService, 'N8N_CONFIG'],
        },
      ],
      exports: [DifyService, N8nService],
    }
  }
}
