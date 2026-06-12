import { DynamicModule, Module } from '@nestjs/common'
import { aibrandServerClientConfig } from './aibrand-server-client.config'
import { aibrandServerClientService } from './aibrand-server-client.service'
import { AccountService, BrandLibService, ContentService, NotificationService, PlatformService, PublishingService, PublishRecordService, ShortLinkService, TaskService, UserService } from './clients'

@Module({})
export class aibrandServerClientModule {
  static forRoot(options: aibrandServerClientConfig): DynamicModule {
    return {
      global: true,
      module: aibrandServerClientModule,
      imports: [
      ],
      providers: [
        {
          provide: aibrandServerClientConfig,
          useValue: options,
        },
        AccountService,
        BrandLibService,
        ContentService,
        NotificationService,
        PlatformService,
        PublishingService,
        TaskService,
        UserService,
        PublishRecordService,
        ShortLinkService,
        aibrandServerClientService,
      ],
      exports: [aibrandServerClientService],
    }
  }
}
