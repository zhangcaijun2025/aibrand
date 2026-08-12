import { Module } from '@nestjs/common'
import { ModelsConfigModule } from '../../models-config'
import { UnifiedGatewayVideoService } from './unified-gateway.service'

@Module({
  imports: [ModelsConfigModule],
  providers: [UnifiedGatewayVideoService],
  exports: [UnifiedGatewayVideoService],
})
export class UnifiedGatewayVideoModule {}
