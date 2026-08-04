import type { DynamicModule, Provider, Type } from '@nestjs/common'
import type { NestApplication } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface'
import type { Request, Response } from 'express'
import type { StreamEntry } from 'pino'
import type { BaseConfig } from './config'
import { HttpStatus, Logger, Module } from '@nestjs/common'
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE, NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { apiReference } from '@scalar/nestjs-api-reference'
import { customAlphabet } from 'nanoid'
import { LoggerModule, Logger as PinoLogger } from 'nestjs-pino'
import pino from 'pino'
import client from 'prom-client'
import { z } from 'zod'
import { REDIS_SERVICE } from './constants'
import { GlobalExceptionFilter } from './filters'
import { PropagationInterceptor, RequestContextInterceptor, ResponseInterceptor } from './interceptors'
import { CloudWatchLogger, ConsoleLogger, FeishuLogger, MongoDBLogger } from './loggers'
import { ZodValidationPipe } from './pipes'
import { patchNestJsSwagger, zodToJsonSchemaOptions } from './utils'

import './utils/load-file-from-env.util'

z.config(z.locales.zhCN())

patchNestJsSwagger()

const logger = new Logger('Bootstrap')

function setupMetrics(app: NestApplication & NestExpressApplication) {
  client.collectDefaultMetrics()
  app.use('/metrics', async (_req: Request, res: Response) => {
    res.set('Content-Type', client.register.contentType)
    const metrics = await client.register.metrics()
    res.end(metrics)
  })
}

@Module({})
class RootModule {
  static setup(args: Omit<DynamicModule, 'module'>): DynamicModule {
    return {
      module: RootModule,
      ...args,
    }
  }
}

export interface StartApplicationOptions {
  setupOpenapi?: (builder: DocumentBuilder) => DocumentBuilder
  setupApp?: (app: NestApplication) => void
}
export async function startApplication(Module: Type<unknown>, config: BaseConfig, options: StartApplicationOptions = {}) {
  if (config.enableConfigLogging) {
    logger.log(JSON.stringify(config, null, 2))
  }
  const loggers: StreamEntry[] = []

  if (config.logger?.console?.enable) {
    loggers.push({
      level: config.logger.console.level,
      stream: new ConsoleLogger(config.logger.console),
    })
  }

  if (config.logger?.cloudWatch?.enable) {
    loggers.push({
      level: config.logger.cloudWatch.level,
      stream: new CloudWatchLogger(config.logger.cloudWatch),
    })
  }

  if (config.logger?.feishu?.enable) {
    loggers.push({
      level: config.logger.feishu.level,
      stream: new FeishuLogger(config.logger.feishu),
    })
  }

  if (config.logger?.mongodb?.enable) {
    loggers.push({
      level: config.logger.mongodb.level,
      stream: new MongoDBLogger(config.logger.mongodb),
    })
  }

  const reqIdGenerator = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 21)

  const imports: DynamicModule[] = [
    LoggerModule.forRoot({
      pinoHttp: [
        {
          level: 'trace',
          genReqId: (req, res) => {
            const requestId = req.headers['x-request-id'] || reqIdGenerator()
            req.headers['x-request-id'] = requestId
            if (!res.headersSent) {
              res.setHeader('x-request-id', requestId)
            }
            return requestId
          },
        },
        pino.multistream(loggers),
      ],
    }),
  ]
  const providers: Provider[] = [
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestContextInterceptor,
    },
    /**
     * 传播上下文
     */
    {
      provide: APP_INTERCEPTOR,
      useClass: PropagationInterceptor,
    },
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_FILTER,
      useValue: new GlobalExceptionFilter({
        returnBadRequestDetails: config.enableBadRequestDetails,
      }),
    },
  ]

  const app = await NestFactory.create<
    NestApplication & NestExpressApplication
  >(RootModule.setup({
    imports: [...imports, Module],
    providers,
  }), {
    cors: true,
  })

  app.useLogger(app.get(PinoLogger))

  if (config.globalPrefix)
    app.setGlobalPrefix(config.globalPrefix, { exclude: ['/'] })

  if (options.setupApp) {
    options.setupApp(app)
  }

  if (config.openapi?.enable) {
    const builder = new DocumentBuilder()
      .setTitle(config.openapi.title)
      .setDescription(config.openapi.description)
      .setOpenAPIVersion('3.0.0')
      .addBearerAuth()

    if (options.setupOpenapi) {
      options.setupOpenapi(builder)
    }

    const openApiDocument = SwaggerModule.createDocument(
      app,
      builder.build(),
    )

    if (openApiDocument.components?.schemas) {
      const zodSchemas = z.toJSONSchema(z.globalRegistry, { ...zodToJsonSchemaOptions, io: 'input' }).schemas
      Object.keys(zodSchemas).forEach((key) => {
        const schema = zodSchemas[key]
        delete schema.$id
      })
      openApiDocument.components.schemas = {
        ...openApiDocument.components.schemas,
        ...zodSchemas as Record<string, SchemaObject>,
      }
    }
    app.use(
      `${config.openapi.path}/openapi.json`,
      (_req: Request, res: Response) => { res.json(openApiDocument) },
    )

    app.use(
      config.openapi.path,
      apiReference({
        persistAuth: true,
        content: openApiDocument,
      }),
    )
  }

  app.enableShutdownHooks()

  // ── Health Check (with dependency verification) ──
  app.getHttpAdapter().get('/health', async (_req: Request, res: Response) => {
    const checks: Record<string, string> = {}

    // MongoDB check (if MongooseModule is loaded)
    try {
      // @ts-ignore @nestjs/mongoose is an optional peer dependency
      const { getConnectionToken } = await import('@nestjs/mongoose')
      const conn = app.get(getConnectionToken(), { strict: false })
      checks['mongodb'] = conn?.readyState === 1 ? 'ok' : 'error'
    } catch {
      checks['mongodb'] = 'unknown'
    }

    // Redis check (if RedisModule is loaded)
    try {
      const redis: { client: { ping(): Promise<string> } } = app.get(REDIS_SERVICE, { strict: false })
      const pong = await Promise.race([
        redis.client.ping(),
        new Promise<string>((_, rej) => setTimeout(() => rej(new Error('timeout')), 2000)),
      ])
      checks['redis'] = pong === 'PONG' ? 'ok' : 'error'
    } catch {
      checks['redis'] = 'unknown'
    }

    const hasError = Object.values(checks).some(v => v === 'error')
    const status = hasError ? 'degraded' : 'ok'

    res.status(hasError ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.OK).json({
      status,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      services: checks,
    })
  })
  setupMetrics(app)

  let closing: Promise<void> | undefined
  app.getHttpAdapter().all('/_shutdown', async (_req: Request, res: Response) => {
    res.status(HttpStatus.OK).send('Shutting down...')
    if (closing)
      return
    closing = app.close()
    await closing
    process.exit(0)
  })

  app.useBodyParser('json', { limit: '50mb' })
  app.useBodyParser('urlencoded', { limit: '50mb', extended: true })
  app.set('query parser', 'extended')

  app.disable('x-powered-by')

  app.enable('trust proxy')

  // ── Global request timeout (30s) ──
  app.use((_req: Request, res: Response, next: () => void) => {
    res.setTimeout(30_000, () => {
      if (!res.headersSent) {
        res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
          code: 503,
          message: 'Request timeout',
          timestamp: Date.now(),
        })
      }
    })
    next()
  })

  process.on('uncaughtException', (reason) => {
    logger.error({ err: reason }, 'UNCAUGHT_EXCEPTION — exiting in 1s')
    setTimeout(() => process.exit(1), 1000).unref()
  })
  process.on('exit', (code) => {
    logger.log(`app exiting with code ${code}`)
  })

  await app.startAllMicroservices()
  await app.listen(config.port, () => {
    logger.log(`app started at port ${config.port}`)
    if (config.openapi?.enable)
      logger.log(`swagger docs: http://localhost:${config.port}${config.openapi.path}`)
  })
}
