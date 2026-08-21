/**
 * ContentEngineModule — 内容智造引擎模块
 *
 * ⚠️ R17 决策（ADR-010）：本模块为「采编上游」可选增强，当前**未接线**
 *   （app.module 未引入 forRoot）。与智创中心 intent-parser 不同层：
 *   采编 = 提问引导产出结构化 Brief；意图 = 自然语言→创作参数。
 *   保留作可选上游；studio 意图链路已自足，无需强制启用。
 *
 * 全局模块 (global: true)，提供：
 * - ContentEngineService：智能路由 + 动态采访 + Brief 管理
 * - BrandKnowledgeService：品牌知识库 + URL 提取
 *
 * 依赖：AiServicesModule（DifyService, N8nService）必须先初始化
 */

import { HttpModule, HttpService } from '@nestjs/axios'
import { DynamicModule, Module } from '@nestjs/common'
import { DifyService, N8nService } from '@yikart/ai-services'
import { BrandKnowledgeService } from './brand-knowledge.service'
import { ContentEngineService } from './content-engine.service'

export interface ContentEngineModuleOptions {
  /** 启用品牌知识库 URL 自动抓取 */
  enableUrlExtraction?: boolean
}

@Module({})
export class ContentEngineModule {
  static forRoot(options: ContentEngineModuleOptions = {}): DynamicModule {
    const providers: any[] = [
      {
        provide: ContentEngineService,
        useFactory: (difyService: DifyService, n8nService: N8nService) =>
          new ContentEngineService(difyService, n8nService),
        inject: [DifyService, N8nService],
      },
    ]

    const exports: any[] = [
      ContentEngineService,
    ]

    // BrandKnowledgeService (always included — used for smart skip logic)
    providers.push({
      provide: BrandKnowledgeService,
      useFactory: (difyService: DifyService, http: HttpService) =>
        new BrandKnowledgeService(difyService, http),
      inject: [DifyService, HttpService],
    })
    exports.push(BrandKnowledgeService)

    return {
      global: true,
      module: ContentEngineModule,
      imports: [HttpModule],
      providers,
      exports,
    }
  }
}
