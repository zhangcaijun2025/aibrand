import { Module, OnModuleInit } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { ScheduleModule } from '@nestjs/schedule'
import { ModelController } from './model.controller'
import { ModelCallLog, ModelCallLogSchema, ModelConfig, ModelConfigSchema } from './model.schema'
import { ModelService } from './model.service'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ModelConfig.name, schema: ModelConfigSchema },
      { name: ModelCallLog.name, schema: ModelCallLogSchema },
    ]),
    ScheduleModule,
  ],
  controllers: [ModelController],
  providers: [ModelService],
  exports: [ModelService],
})
export class ModelModule implements OnModuleInit {
  constructor(private readonly modelService: ModelService) {}
  async onModuleInit() { await this.modelService.seedDefaults() }
}
