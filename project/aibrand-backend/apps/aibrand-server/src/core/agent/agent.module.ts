import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { SubscriptionModule } from '../subscription/subscription.module'
import { AgentChatController } from './agent-chat.controller'
import { AgentChatService } from './agent-chat.service'
import { AgentFrontendController } from './agent-frontend.controller'
import { AgentRegistryController } from './agent-registry.controller'
import {
  AgentDefinition,
  AgentDefinitionSchema,
  ComponentDefinition,
  ComponentDefinitionSchema,
  UserInstalledComponent,
  UserInstalledComponentSchema,
} from './agent-registry.schema'
import { AgentRegistryService } from './agent-registry.service'
import { AgentController } from './agent.controller'
import {
  SystemEvent,
  SystemEventSchema,
  UserBehavior,
  UserBehaviorSchema,
  UserContext,
  UserContextSchema,
  UserProfile,
  UserProfileSchema,
} from './agent.schema'
import { AgentService } from './agent.service'
import { EvolutionService } from './evolution.service'

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
  controllers: [AgentController, AgentChatController, AgentRegistryController, AgentFrontendController],
  providers: [AgentService, AgentChatService, EvolutionService, AgentRegistryService],
  exports: [AgentService, AgentChatService, EvolutionService, AgentRegistryService],
})
export class AgentModule {}
