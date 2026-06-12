/**
 * AiBrand Extension Module
 *
 * Provides real-time WebSocket communication between the NestJS backend
 * and AiBrand Chrome Extensions.
 */

import { Module } from '@nestjs/common';
import { ExtensionGateway } from './extension.gateway';
import { ExtensionService } from './extension.service';

@Module({
  providers: [ExtensionGateway, ExtensionService],
  exports: [ExtensionService, ExtensionGateway],
})
export class ExtensionModule {}
