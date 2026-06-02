/**
 * AiServicesModule — AI 服务集成模块
 *
 * 全局模块 (global: true)，提供 Dify + n8n 服务注入
 */

import { HttpModule, HttpService } from '@nestjs/axios'
import { DynamicModule, Module } from '@nestjs/common'
import { DifyConfig, DifyService } from './dify.service'
import { N8nConfig, N8nService } from './n8n.service'

export interface AiServicesModuleOptions {
  dify: DifyConfig
  n8n: N8nConfig
}

/** Dify 配置注入 token (class-based, 类型安全) */
export class DifyServiceConfig {
  constructor(readonly value: DifyConfig) {}
}

/** n8n 配置注入 token (class-based, 类型安全) */
export class N8nServiceConfig {
  constructor(readonly value: N8nConfig) {}
}

@Module({})
export class AiServicesModule {
  static forRoot(options: AiServicesModuleOptions): DynamicModule {
    return {
      global: true,
      module: AiServicesModule,
      imports: [HttpModule],
      providers: [
        {
          provide: DifyServiceConfig,
          useValue: new DifyServiceConfig(options.dify),
        },
        {
          provide: N8nServiceConfig,
          useValue: new N8nServiceConfig(options.n8n),
        },
        {
          provide: DifyService,
          useFactory: (http: HttpService, cfg: DifyServiceConfig) =>
            new DifyService(http, cfg.value),
          inject: [HttpService, DifyServiceConfig],
        },
        {
          provide: N8nService,
          useFactory: (http: HttpService, cfg: N8nServiceConfig) =>
            new N8nService(http, cfg.value),
          inject: [HttpService, N8nServiceConfig],
        },
      ],
      exports: [DifyService, N8nService],
    }
  }
}
