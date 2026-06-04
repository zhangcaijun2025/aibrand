/**
 * AiServicesModule — AI 服务集成模块
 *
 * 全局模块 (global: true)，提供 Dify + n8n + OneApi 服务注入
 */

import { HttpModule, HttpService } from '@nestjs/axios'
import { DynamicModule, Module } from '@nestjs/common'
import { DifyConfig, DifyService } from './dify.service'
import { N8nConfig, N8nService } from './n8n.service'
import { OneApiConfig, OneApiService } from './one-api.service'

export interface AiServicesModuleOptions {
  dify: DifyConfig
  n8n: N8nConfig
  oneApi?: OneApiConfig
}

/** Dify 配置注入 token (class-based, 类型安全) */
export class DifyServiceConfig {
  constructor(readonly value: DifyConfig) {}
}

/** n8n 配置注入 token (class-based, 类型安全) */
export class N8nServiceConfig {
  constructor(readonly value: N8nConfig) {}
}

/** OneApi 配置注入 token (class-based, 类型安全) */
export class OneApiServiceConfig {
  constructor(readonly value: OneApiConfig) {}
}

@Module({})
export class AiServicesModule {
  static forRoot(options: AiServicesModuleOptions): DynamicModule {
    const providers: any[] = [
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
    ]

    const exports: any[] = [
      DifyService,
      N8nService,
    ]

    // ── OneApiService (optional — only if oneApi config is provided) ──
    if (options.oneApi) {
      providers.push(
        {
          provide: OneApiServiceConfig,
          useValue: new OneApiServiceConfig(options.oneApi),
        },
        {
          provide: OneApiService,
          useFactory: (http: HttpService, cfg: OneApiServiceConfig) =>
            new OneApiService(http, cfg.value),
          inject: [HttpService, OneApiServiceConfig],
        },
      )
      exports.push(OneApiService)
    }

    return {
      global: true,
      module: AiServicesModule,
      imports: [HttpModule],
      providers,
      exports,
    }
  }
}
