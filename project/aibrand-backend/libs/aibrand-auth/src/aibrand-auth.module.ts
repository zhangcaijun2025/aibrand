import { DynamicModule, Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { aibrandAuthConfig } from './aibrand-auth.config'
import { aibrandAuthGuard } from './aibrand-auth.guard'
import { aibrandAuthService } from './aibrand-auth.service'

@Module({})
export class aibrandAuthModule {
  static forRoot(config: aibrandAuthConfig): DynamicModule {
    return {
      global: true,
      module: aibrandAuthModule,
      imports: [
        JwtModule.register({
          secret: config.secret,
          signOptions: { expiresIn: config.expiresIn },
        }),
      ],
      providers: [
        {
          provide: aibrandAuthConfig,
          useValue: config,
        },
        aibrandAuthService,
        {
          provide: APP_GUARD,
          useClass: aibrandAuthGuard,
        },
      ],
      exports: [aibrandAuthService],
    }
  }
}
