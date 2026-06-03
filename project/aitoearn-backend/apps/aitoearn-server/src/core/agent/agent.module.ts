import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { SubscriptionModule } from '../subscription/subscription.module'
import { AgentController } from './agent.controller'
import { AgentChatController } from './agent-chat.controller'
import { AgentChatService } from './agent-chat.service'
import { AgentService } from './agent.service'
import { EvolutionService } from './evolution.service'
import {
  SystemEvent,
  SystemEventSchema,
  UserContext,
  UserContextSchema,
  UserProfile,
  UserProfileSchema,
  UserBehavior,
  UserBehaviorSchema,
} from './agent.schema'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SystemEvent.name, schema: SystemEventSchema },
      { name: UserContext.name, schema: UserContextSchema },
      { name: UserProfile.name, schema: UserProfileSchema },
      { name: UserBehavior.name, schema: UserBehaviorSchema },
    ]),
    SubscriptionModule,
  ],
  controllers: [AgentController, AgentChatController],
  providers: [AgentService, AgentChatService, EvolutionService],
  exports: [AgentService, AgentChatService, EvolutionService],
})
export class AgentModule {}
