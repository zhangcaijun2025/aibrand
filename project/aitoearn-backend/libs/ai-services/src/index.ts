/**
 * ai-services — AI 服务集成库
 *
 * 提供 Dify（AI 知识库/Agent）、n8n（自动化工作流）
 * 和 One API（LLM 网关）的 NestJS 集成服务
 */

export { AiServicesModule } from './ai-services.module'
export type { AiServicesModuleOptions } from './ai-services.module'
export { DifyServiceConfig, N8nServiceConfig, OneApiServiceConfig } from './ai-services.module'
export { DifyService } from './dify.service'
export { N8nService } from './n8n.service'
export { OneApiService } from './one-api.service'
export type { OneApiConfig, ChatMessage, ChatCompletionParams, ChatCompletionResult } from './one-api.service'
