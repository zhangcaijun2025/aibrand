import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { SubscriptionModule } from '../subscription/subscription.module'
import { AgentController } from './agent.controller'
import { AgentChatController } from './agent-chat.controller'
import { AgentChatService } from './agent-chat.service'
import { AgentRegistryController } from './agent-registry.controller'
import { AgentRegistryService } from './agent-registry.service'
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
import {
  AgentDefinition,
  AgentDefinitionSchema,
  ComponentDefinition,
  ComponentDefinitionSchema,
  UserInstalledComponent,
  UserInstalledComponentSchema,
} from './agent-registry.schema'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SystemEvent.name, schema: SystemEventSchema },
      { name: UserContext.name, schema: UserContextSchema },
      { name: UserProfile.name, schema: UserProfileSchema },
      { name: UserBehavior.name, schema: UserBehaviorSchema },
      { name: AgentDefinition.name, schema: AgentDefinitionSchema },
      { name: ComponentDefinition.name, schema: ComponentDefinitionSchema },
      { name: UserInstalledComponent.name, schema: UserInstalledComponentSchema },
    ]),
    SubscriptionModule,
  ],
  controllers: [AgentController, AgentChatController, AgentRegistryController],
  providers: [AgentService, AgentChatService, EvolutionService, AgentRegistryService],
  exports: [AgentService, AgentChatService, EvolutionService, AgentRegistryService],
})
export class AgentModule {}
