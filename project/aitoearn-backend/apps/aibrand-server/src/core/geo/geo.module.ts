import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { ScheduleModule } from '@nestjs/schedule'
import { GeoController } from './geo.controller'
import { GeoService } from './geo.service'
import {
  GeoRegion, GeoRegionSchema,
  GeoAccountBinding, GeoAccountBindingSchema,
  GeoTemplate, GeoTemplateSchema,
  GeoScoreRecord, GeoScoreRecordSchema,
  GeoCitationEvent, GeoCitationEventSchema,
  GeoSentimentEvent, GeoSentimentEventSchema,
  GeoPlatformRule, GeoPlatformRuleSchema,
  GeoCanaryDeploy, GeoCanaryDeploySchema,
  GeoHealthSnapshot, GeoHealthSnapshotSchema,
} from './geo.schema'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GeoRegion.name, schema: GeoRegionSchema },
      { name: GeoAccountBinding.name, schema: GeoAccountBindingSchema },
      { name: GeoTemplate.name, schema: GeoTemplateSchema },
      { name: GeoScoreRecord.name, schema: GeoScoreRecordSchema },
      { name: GeoCitationEvent.name, schema: GeoCitationEventSchema },
      { name: GeoSentimentEvent.name, schema: GeoSentimentEventSchema },
      { name: GeoPlatformRule.name, schema: GeoPlatformRuleSchema },
      { name: GeoCanaryDeploy.name, schema: GeoCanaryDeploySchema },
      { name: GeoHealthSnapshot.name, schema: GeoHealthSnapshotSchema },
    ]),
    ScheduleModule,
  ],
  controllers: [GeoController],
  providers: [GeoService],
  exports: [GeoService],
})
export class GeoModule {}
