/**
 * WorkflowModule — 6 步内容工作流引擎
 *
 * 提供:
 * - WorkflowController: REST endpoints
 * - WorkflowGateway: SSE 实时推送
 * - StepRegistry: 可插拔步骤注册表
 * - WorkflowExecutor: 递归步骤执行器
 * - 6 个预置步骤: 意图分析/策略研究/选题生成/内容生成/质量检测/发布策略
 */

import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { AiServicesModule } from '@yikart/ai-services'
import { WorkflowExecution, WorkflowExecutionSchema } from './workflow.schema'
import { WorkflowRepository } from './workflow.repository'
import { WorkflowService } from './workflow.service'
import { WorkflowController } from './workflow.controller'
import { WorkflowGateway } from './workflow.gateway'
import { StepRegistry } from './engine/registry'
import { WorkflowExecutor } from './engine/executor'

// 6 个步骤
import { IntentAnalysisStep } from './steps/intent-analysis.step'
import { StrategyResearchStep } from './steps/strategy-research.step'
import { TopicGeneratorStep } from './steps/topic-generator.step'
import { ContentGenerationStep } from './steps/content-generation.step'
import { QualityCheckStep } from './steps/quality-check.step'
import { PublishStrategyStep } from './steps/publish-strategy.step'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WorkflowExecution.name, schema: WorkflowExecutionSchema },
    ]),
    AiServicesModule, // DifyService, N8nService, OneApiService
  ],
  controllers: [WorkflowController, WorkflowGateway],
  providers: [
    // 数据层
    WorkflowRepository,
    WorkflowService,

    // 引擎
    StepRegistry,
    WorkflowExecutor,

    // 6 个步骤
    IntentAnalysisStep,
    StrategyResearchStep,
    TopicGeneratorStep,
    ContentGenerationStep,
    QualityCheckStep,
    PublishStrategyStep,

    // 步骤注册 (在模块初始化时执行)
    {
      provide: 'STEP_INIT',
      useFactory: (
        registry: StepRegistry,
        ...steps: any[]
      ) => {
        registry.registerAll(steps)
        return null
      },
      inject: [
        StepRegistry,
        IntentAnalysisStep,
        StrategyResearchStep,
        TopicGeneratorStep,
        ContentGenerationStep,
        QualityCheckStep,
        PublishStrategyStep,
      ],
    },
  ],
  exports: [WorkflowService],
})
export class WorkflowModule {}
