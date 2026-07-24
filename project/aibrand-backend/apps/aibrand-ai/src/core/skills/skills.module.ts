import { Module } from '@nestjs/common'
import { AgentModule } from '../agent/agent.module'
import { SkillsController } from './skills.controller'
import { SkillsService } from './skills.service'

@Module({
  imports: [AgentModule], // 注入 AgentService
  controllers: [SkillsController],
  providers: [SkillsService],
  exports: [SkillsService],
})
export class SkillsModule {}
