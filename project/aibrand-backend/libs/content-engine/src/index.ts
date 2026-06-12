/**
 * content-engine — 内容智造引擎库
 *
 * 提供以下 NestJS 集成服务：
 * - ContentEngineService：智能路由 + 动态采访 + Brief 生命周期管理
 * - BrandKnowledgeService：品牌知识库 + URL 自动抓取 + 自动沉淀
 */

export { ContentEngineModule } from './content-engine.module'
export type { ContentEngineModuleOptions } from './content-engine.module'
export { ContentEngineService } from './content-engine.service'
export { BrandKnowledgeService } from './brand-knowledge.service'
