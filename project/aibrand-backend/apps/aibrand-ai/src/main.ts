import { startApplication } from '@yikart/common'
import { AppModule } from './app.module'
import { config } from './config'

const ALLOWED_ORIGINS = [
  'http://localhost:3001',
  'http://localhost:3099',
  'http://localhost:8080',
  'https://aibrand.local',
]

startApplication(AppModule, config, {
  setupApp: (app) => {
    app.enableCors({
      origin: ALLOWED_ORIGINS,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
      maxAge: 86400,
    })
  },
})
