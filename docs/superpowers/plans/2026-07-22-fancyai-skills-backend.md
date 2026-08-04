# FancyAI Skills 后端模块实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在后端 aibrand-ai 新建 skills 模块,提供 CRUD + execute 端点,接入 AgentService 实现 expert 类 skillKey 的真实任务执行,前端 /api/skills/* 改为代理转发到后端 :3010。

**Architecture:** 后端新建 `apps/aibrand-ai/src/core/skills/` 模块,包含数据层(29 个 skillKey 静态数据)、DTO(Zod)、Service(注入 AgentService)、Controller(`/skills/*`)。Execute 端点仅支持 expert 类 12 个,内部调用 `AgentService.createContentGenerationTask()`,将 skillKey 作为系统提示注入。前端 `/api/skills/*` 改为代理转发到后端 `:3010`,保持前端 API 路径不变。

**Tech Stack:** NestJS + Zod + RxJS Observable(SSE) + Next.js 16 API Routes(代理转发)

---

## File Structure

### 后端新建文件(aibrand-ai)
| 文件 | 职责 |
|------|------|
| `apps/aibrand-ai/src/core/skills/skill-keys.data.ts` | 29 个 skillKey 静态数据 + 类型定义 + 查询函数 |
| `apps/aibrand-ai/src/core/skills/skills.dto.ts` | Zod DTO(ExecuteSkillDto) |
| `apps/aibrand-ai/src/core/skills/skills.service.ts` | 业务服务(CRUD + execute 接入 AgentService) |
| `apps/aibrand-ai/src/core/skills/skills.controller.ts` | REST 控制器(GET /skills/list, GET /skills/:key, POST /skills/:key/execute) |
| `apps/aibrand-ai/src/core/skills/skills.module.ts` | 模块定义(imports AgentModule) |

### 后端修改文件
| 文件 | 改动 |
|------|------|
| `apps/aibrand-ai/src/app.module.ts` | 注册 SkillsModule |

### 前端修改文件(aibrand-studio)
| 文件 | 改动 |
|------|------|
| `src/app/api/skills/list/route.ts` | 改为代理转发到后端 GET /skills/list |
| `src/app/api/skills/[key]/route.ts` | 改为代理转发到后端 GET /skills/:key |
| `src/app/api/skills/[key]/execute/route.ts` | 新增,代理转发 POST /skills/:key/execute(SSE 透传) |
| `src/app/api/skills/stream/route.ts` | 保留前端 mock,添加 deprecated 注释 |
| `src/lib/env.ts` | 新增 AIBRAND_AI_URL 环境变量 |

---

## Task 1: 后端 skills 数据层

**Files:**
- Create: `apps/aibrand-ai/src/core/skills/skill-keys.data.ts`

**数据来源:** 复制前端 `d:\king2046\project\aibrand-studio\src\lib\fancyai\skill-keys.ts` 的 `ALL_SKILL_KEYS` 数组(29 项),移除前端特定的注释格式,保持数据内容完全一致。

- [ ] **Step 1: 读取前端 skill-keys.ts 完整内容**

读取 `d:\king2046\project\aibrand-studio\src\lib\fancyai\skill-keys.ts` 全文(约 450 行),提取 `ALL_SKILL_KEYS` 数组、`SkillKey` 接口、`SkillKeyType`/`SkillKeyStatus` 类型、`SKILL_KEYS_BY_TYPE` 分组、`getSkillByKey()` 函数。

- [ ] **Step 2: 创建后端 skill-keys.data.ts**

创建 `apps/aibrand-ai/src/core/skills/skill-keys.data.ts`,内容包含:

```typescript
/**
 * FancyAI 29 skillKey 静态数据 — 后端副本
 *
 * 数据来源:前端 src/lib/fancyai/skill-keys.ts(100% 复刻 FancyAI 企业平台 API 层)
 * 同步策略:前端为权威源,后端为副本。修改时需同步两端。
 */

/** SkillKey 类型 */
export type SkillKeyType = 'expert' | 'enterprise' | 'tool'

/** SkillKey 状态 */
export type SkillKeyStatus = 'active' | 'beta' | 'deprecated'

export interface SkillKey {
  key: string
  name: string
  description: string
  type: SkillKeyType
  status: SkillKeyStatus
  model: string
  runDuration: number
  appId: string
  parentSkillId?: string
  connectorIds?: string[]
  aibrandRoute: string
  requireEnterprise?: boolean
  inputSchema?: Record<string, unknown>
  outputFormat?: 'image' | 'video' | 'text' | 'json' | 'stream'
}

/**
 * 29 skillKey — 从前端 skill-keys.ts 复制
 * 按 type 分三组:expert(12) / enterprise(8) / tool(9)
 */
export const ALL_SKILL_KEYS: SkillKey[] = [
  // ═══ 此处粘贴前端 ALL_SKILL_KEYS 数组的 29 个对象 ═══
  // 完整复制,保持字段和顺序一致
]

/** 按 type 分组 */
export const SKILL_KEYS_BY_TYPE: Record<SkillKeyType, SkillKey[]> = {
  expert: ALL_SKILL_KEYS.filter((k) => k.type === 'expert'),
  enterprise: ALL_SKILL_KEYS.filter((k) => k.type === 'enterprise'),
  tool: ALL_SKILL_KEYS.filter((k) => k.type === 'tool'),
}

/** 按 key 查询 */
export function getSkillByKey(key: string): SkillKey | undefined {
  return ALL_SKILL_KEYS.find((k) => k.key === key)
}

/** 仅 expert 类 skillKey(支持真实执行) */
export const EXECUTABLE_SKILL_KEYS: SkillKey[] = SKILL_KEYS_BY_TYPE.expert
```

- [ ] **Step 3: 验证数据完整性**

```bash
# 在后端目录执行
cd d:\king2046\project\aibrand-backend
npx tsc --noEmit -p apps/aibrand-ai/tsconfig.app.json
```
Expected: 0 errors(如果报错,检查 ALL_SKILL_KEYS 数组是否完整复制了 29 项)

---

## Task 2: 后端 skills DTO

**Files:**
- Create: `apps/aibrand-ai/src/core/skills/skills.dto.ts`

- [ ] **Step 1: 创建 skills.dto.ts**

```typescript
import { createZodDto } from '@yikart/common'
import { z } from 'zod'

/**
 * POST /skills/:key/execute 请求 DTO
 *
 * 仅 expert 类 skillKey 支持执行。
 * prompt 会与 skill 的 name/description 组合成增强提示词。
 */
export const ExecuteSkillSchema = z.object({
  prompt: z.string().min(1).max(4000).describe('用户提示词'),
  model: z
    .enum([
      'claude-opus-4-6',
      'claude-haiku-4-5-20251001-thinking',
      'claude-opus-4-5-20251101-thinking',
      'claude-opus-4-5-20251101',
      'claude-sonnet-4-5-20250929-thinking',
      'claude-haiku-4-5-20251001',
      'claude-opus-4-1-20250805',
      'claude-opus-4-1-20250805-thinking',
      'claude-sonnet-4-5-20250929',
      'claude-opus-4-6',
      'claude-opus-4-6-thinking',
    ])
    .optional()
    .describe('模型(可选,默认使用 skill 配置的 model)'),
  taskId: z
    .string()
    .transform((val) => (val.trim() === '' ? undefined : val))
    .optional()
    .describe('任务ID(恢复对话时使用)'),
})
export class ExecuteSkillDto extends createZodDto(ExecuteSkillSchema, 'ExecuteSkillDto') {}
```

- [ ] **Step 2: 验证编译**

```bash
cd d:\king2046\project\aibrand-backend
npx tsc --noEmit -p apps/aibrand-ai/tsconfig.app.json
```
Expected: 0 errors

---

## Task 3: 后端 skills service

**Files:**
- Create: `apps/aibrand-ai/src/core/skills/skills.service.ts`

**关键设计:** 注入 `AgentService`(从 AgentModule exports),execute 时构造 `CreateContentGenerationTaskDto` 调用 `agentService.createContentGenerationTask()`,将 skillKey 的 name/description 作为系统提示注入 prompt。

- [ ] **Step 1: 创建 skills.service.ts**

```typescript
import { Injectable, Logger } from '@nestjs/common'
import { ResponseCode, UserType } from '@yikart/common'
import { Request, Response } from 'express'
import { AgentService } from '../agent/agent.service'
import { CreateContentGenerationTaskDto } from '../agent/agent.dto'
import {
  ALL_SKILL_KEYS,
  EXECUTABLE_SKILL_KEYS,
  getSkillByKey,
  type SkillKey,
  type SkillKeyStatus,
  type SkillKeyType,
} from './skill-keys.data'

@Injectable()
export class SkillsService {
  private readonly logger = new Logger(SkillsService.name)

  constructor(private readonly agentService: AgentService) {}

  /** 列出所有 skillKey(支持 type/status 过滤) */
  listSkills(type?: SkillKeyType, status?: SkillKeyStatus): SkillKey[] {
    let result = ALL_SKILL_KEYS
    if (type) {
      result = result.filter((k) => k.type === type)
    }
    if (status) {
      result = result.filter((k) => k.status === status)
    }
    return result
  }

  /** 查询单个 skillKey */
  getSkill(key: string): SkillKey | undefined {
    return getSkillByKey(key)
  }

  /**
   * 执行 skillKey(仅 expert 类支持)
   *
   * 内部调用 AgentService.createContentGenerationTask(),
   * 将 skill 的 name/description 作为系统提示注入 prompt。
   *
   * 返回 RxJS Observable(SSE 流),与 POST /agent/tasks 格式一致。
   */
  executeSkill(
    key: string,
    userId: string,
    dto: { prompt: string; model?: string; taskId?: string },
    abortController: AbortController,
    req: Request,
    res: Response,
  ) {
    const skill = getSkillByKey(key)

    if (!skill) {
      throw { code: ResponseCode.NotFound, message: `skillKey '${key}' not found` }
    }

    if (skill.type !== 'expert') {
      throw {
        code: ResponseCode.BadRequest,
        message: `skillKey '${key}' (type: ${skill.type}) is not executable. Only expert type is supported.`,
      }
    }

    // 构造增强提示词:将 skill 的身份和能力注入 prompt
    const enhancedPrompt = this.enhancePrompt(skill, dto.prompt)

    // 构造 CreateContentGenerationTaskDto
    const createDto = {
      prompt: enhancedPrompt,
      model: dto.model || skill.model,
      includePartialMessages: true,
      taskId: dto.taskId,
    } as CreateContentGenerationTaskDto

    this.logger.log(
      `Executing skill '${key}' for user ${userId}, model=${createDto.model}`,
    )

    // 调用 AgentService,返回 SSE Observable
    return this.agentService.createContentGenerationTask(
      userId,
      UserType.User,
      createDto,
      abortController,
      req,
      res,
    )
  }

  /** 将 skill 身份注入 prompt */
  private enhancePrompt(skill: SkillKey, userPrompt: string): string {
    return [
      `You are acting as ${skill.name}, an AI expert specialized in: ${skill.description}`,
      ``,
      `Skill Key: ${skill.key}`,
      `Output Format: ${skill.outputFormat || 'text'}`,
      ``,
      `User Request:`,
      userPrompt,
    ].join('\n')
  }

  /** 获取可执行的 skillKey 列表(仅 expert 类) */
  listExecutableSkills(): SkillKey[] {
    return EXECUTABLE_SKILL_KEYS
  }
}
```

- [ ] **Step 2: 验证编译**

```bash
cd d:\king2046\project\aibrand-backend
npx tsc --noEmit -p apps/aibrand-ai/tsconfig.app.json
```
Expected: 0 errors(如果 AgentService 类型不匹配,检查 `agent.service.ts` 的 `createContentGenerationTask` 签名)

---

## Task 4: 后端 skills controller

**Files:**
- Create: `apps/aibrand-ai/src/core/skills/skills.controller.ts`

**关键设计:** 参考 `agent.controller.ts` 的 SSE 实现模式(用 `@SetMetadata(SSE_METADATA, true)` + `@Header` 手动设置 SSE 响应头,返回 Observable)。

- [ ] **Step 1: 创建 skills.controller.ts**

```typescript
import {
  Body,
  Controller,
  Get,
  Header,
  Logger,
  Param,
  Post,
  Query,
  Req,
  Res,
  SetMetadata,
} from '@nestjs/common'
import { SSE_METADATA } from '@nestjs/common/constants'
import { ApiTags } from '@nestjs/swagger'
import { GetToken, TokenInfo } from '@yikart/aibrand-auth'
import { ApiDoc, AppException, ResponseCode } from '@yikart/common'
import { Request, Response } from 'express'
import { ExecuteSkillDto, ExecuteSkillSchema } from './skills.dto'
import { SkillsService } from './skills.service'

@ApiTags('Skills')
@Controller('skills')
export class SkillsController {
  private readonly logger = new Logger(SkillsController.name)

  constructor(private readonly skillsService: SkillsService) {}

  /** GET /skills/list — 列出所有 skillKey */
  @ApiDoc({
    summary: 'List all skillKeys',
    description: 'Returns all 29 skillKeys, optionally filtered by type/status.',
  })
  @Get('list')
  listSkills(
    @Query('type') type?: 'expert' | 'enterprise' | 'tool',
    @Query('status') status?: 'active' | 'beta' | 'deprecated',
  ) {
    const data = this.skillsService.listSkills(type, status)
    return { code: ResponseCode.Success, message: 'success', data }
  }

  /** GET /skills/:key — 查询单个 skillKey */
  @ApiDoc({
    summary: 'Get skillKey by key',
    description: 'Returns a single skillKey by its key.',
  })
  @Get(':key')
  getSkill(@Param('key') key: string) {
    const data = this.skillsService.getSkill(key)
    if (!data) {
      throw new AppException(
        ResponseCode.NotFound,
        `skillKey '${key}' not found`,
      )
    }
    return { code: ResponseCode.Success, message: 'success', data }
  }

  /** POST /skills/:key/execute — 执行 skillKey(仅 expert 类,SSE 流) */
  @ApiDoc({
    summary: 'Execute skillKey',
    description:
      'Execute an expert-type skillKey. Returns SSE stream (same format as POST /agent/tasks).',
    body: ExecuteSkillSchema,
  })
  @SetMetadata(SSE_METADATA, true)
  @Header('Cache-Control', 'no-cache, no-transform')
  @Header('Connection', 'keep-alive')
  @Header('X-Accel-Buffering', 'no')
  @Header('Content-Encoding', 'none')
  @Post(':key/execute')
  executeSkill(
    @GetToken() token: TokenInfo,
    @Param('key') key: string,
    @Body() body: ExecuteSkillDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const abortController = new AbortController()

    res.on('close', () => {
      this.logger.debug(`User ${token.id} closed connection for skill '${key}'`)
    })

    return this.skillsService.executeSkill(
      key,
      token.id,
      body,
      abortController,
      req,
      res,
    )
  }
}
```

- [ ] **Step 2: 验证编译**

```bash
cd d:\king2046\project\aibrand-backend
npx tsc --noEmit -p apps/aibrand-ai/tsconfig.app.json
```
Expected: 0 errors

---

## Task 5: 后端 skills module + 注册

**Files:**
- Create: `apps/aibrand-ai/src/core/skills/skills.module.ts`
- Modify: `apps/aibrand-ai/src/app.module.ts`

- [ ] **Step 1: 创建 skills.module.ts**

```typescript
import { Module } from '@nestjs/common'
import { AgentModule } from '../agent/agent.module'
import { SkillsController } from './skills.controller'
import { SkillsService } from './skills.service'

@Module({
  imports: [AgentModule], // 注入 AgentService
  controllers: [SkillsController],
  providers: [SkillsService],
  exports: [SkillsService],
})
export class SkillsModule {}
```

- [ ] **Step 2: 修改 app.module.ts 注册 SkillsModule**

在 `apps/aibrand-ai/src/app.module.ts` 的 imports 数组中,在 `AgentModule` 之后添加 `SkillsModule`:

```typescript
// 在文件顶部 import 区添加:
import { SkillsModule } from './core/skills/skills.module'

// 在 @Module imports 数组中,AgentModule 之后添加:
@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongodbModule.forRoot(config.mongodb),
    aibrandQueueModule.forRoot({ redis: config.redis, prefix: '{bull}' }),
    RedlockModule.forRoot(config.redlock),
    aibrandAuthModule.forRoot(config.auth),
    aibrandServerClientModule.forRoot(config.serverClient),
    AssetsModule.forRoot(config.assets),
    HelpersModule,
    AiModule,
    AgentModule,
    SkillsModule, // ← 新增
    InternalModule,
    MaterialAdaptationModule,
    DraftGenerationModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

- [ ] **Step 3: 验证编译**

```bash
cd d:\king2046\project\aibrand-backend
npx tsc --noEmit -p apps/aibrand-ai/tsconfig.app.json
```
Expected: 0 errors

---

## Task 6: 后端启动 + API 端点验证

- [ ] **Step 1: 启动后端 aibrand-ai**

```bash
cd d:\king2046\project\aibrand-backend
npx nx serve aibrand-ai
```
Expected: NestJS 启动成功,监听端口 3010,日志显示 `SkillsController` 已注册

- [ ] **Step 2: 验证 GET /skills/list**

```bash
curl -s http://localhost:3010/skills/list -H "Authorization: Bearer test"
```
Expected: `{"code":1000,"message":"success","data":[...29 项...]}`

- [ ] **Step 3: 验证 GET /skills/list?type=expert**

```bash
curl -s "http://localhost:3010/skills/list?type=expert" -H "Authorization: Bearer test"
```
Expected: `data` 数组长度为 12

- [ ] **Step 4: 验证 GET /skills/:key**

```bash
curl -s http://localhost:3010/skills/fashion-campaign-director -H "Authorization: Bearer test"
```
Expected: `{"code":1000,"message":"success","data":{"key":"fashion-campaign-director","name":"AI Fashion Creative Director",...}}`

- [ ] **Step 5: 验证 404**

```bash
curl -s http://localhost:3010/skills/nonexistent -H "Authorization: Bearer test"
```
Expected: 404 + `skillKey 'nonexistent' not found`

- [ ] **Step 6: 验证 POST /skills/:key/execute(非 expert 类拒绝)**

```bash
curl -s -X POST http://localhost:3010/skills/crm-workflows/execute -H "Authorization: Bearer test" -H "Content-Type: application/json" -d '{"prompt":"test"}'
```
Expected: 400 + `skillKey 'crm-workflows' (type: enterprise) is not executable`

---

## Task 7: 前端代理转发 — list + [key]

**Files:**
- Modify: `src/app/api/skills/list/route.ts`
- Modify: `src/app/api/skills/[key]/route.ts`
- Modify: `src/lib/env.ts`(新增 AIBRAND_AI_URL)

**关键设计:** 前端 API route 改为代理转发,保持前端 API 路径(`/api/skills/*`)不变,前端组件零改动。后端 URL 从环境变量 `AIBRAND_AI_URL` 读取(默认 `http://localhost:3010`)。

- [ ] **Step 1: 检查前端 env.ts 是否存在**

读取 `d:\king2046\project\aibrand-studio\src\lib\env.ts`(如果存在),确认环境变量集中管理模式。如果不存在,在 `src/lib/env.ts` 创建(根据 project_memory: "环境变量必须集中在 dedicated env.ts files")。

- [ ] **Step 2: 新增 AIBRAND_AI_URL 环境变量**

在 `src/lib/env.ts` 中添加:

```typescript
// 如果 env.ts 已存在,在合适位置添加:
export const AIBRAND_AI_URL =
  process.env.AIBRAND_AI_URL || 'http://localhost:3010'
```

同时在 `.env.local` 中添加:

```
AIBRAND_AI_URL=http://localhost:3010
```

- [ ] **Step 3: 改写 /api/skills/list/route.ts 为代理转发**

```typescript
/**
 * GET /api/skills/list
 *
 * 代理转发到后端 aibrand-ai GET /skills/list
 *
 * 查询参数:
 *   - type: filter by type (expert | enterprise | tool)
 *   - status: filter by status (active | beta | deprecated)
 */

import { NextRequest, NextResponse } from 'next/server'
import { AIBRAND_AI_URL } from '@/lib/env'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const queryString = searchParams.toString()
    const url = `${AIBRAND_AI_URL}/skills/list${queryString ? `?${queryString}` : ''}`

    // 透传认证 header
    const authHeader = request.headers.get('authorization')
    const headers: Record<string, string> = {}
    if (authHeader) headers['authorization'] = authHeader

    const backendRes = await fetch(url, { headers })

    const data = await backendRes.json()
    return NextResponse.json(data, { status: backendRes.status })
  } catch (err) {
    return NextResponse.json(
      {
        code: 500,
        message: err instanceof Error ? err.message : 'Internal server error',
        data: null,
      },
      { status: 500 },
    )
  }
}
```

- [ ] **Step 4: 改写 /api/skills/[key]/route.ts 为代理转发**

```typescript
/**
 * GET /api/skills/[key]
 *
 * 代理转发到后端 aibrand-ai GET /skills/:key
 */

import { NextRequest, NextResponse } from 'next/server'
import { AIBRAND_AI_URL } from '@/lib/env'

export const dynamic = 'force-dynamic'

export async function generateStaticParams() {
  // 预生成 29 个 skillKey 的静态路径(保持 SSG 兼容)
  const { ALL_SKILL_KEYS } = await import('@/lib/fancyai/skill-keys')
  return ALL_SKILL_KEYS.map((k) => ({ key: k.key }))
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  try {
    const { key } = await params
    const url = `${AIBRAND_AI_URL}/skills/${key}`

    const authHeader = request.headers.get('authorization')
    const headers: Record<string, string> = {}
    if (authHeader) headers['authorization'] = authHeader

    const backendRes = await fetch(url, { headers })

    const data = await backendRes.json()
    return NextResponse.json(data, { status: backendRes.status })
  } catch (err) {
    return NextResponse.json(
      {
        code: 500,
        message: err instanceof Error ? err.message : 'Internal server error',
        data: null,
      },
      { status: 500 },
    )
  }
}
```

- [ ] **Step 5: 创建 /api/skills/[key]/execute/route.ts(SSE 代理)**

```typescript
/**
 * POST /api/skills/[key]/execute
 *
 * 代理转发到后端 aibrand-ai POST /skills/:key/execute
 * SSE 流透传(与 POST /agent/tasks 格式一致)
 */

import { NextRequest } from 'next/server'
import { AIBRAND_AI_URL } from '@/lib/env'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  try {
    const { key } = await params
    const url = `${AIBRAND_AI_URL}/skills/${key}/execute`

    // 透传认证 header + body
    const authHeader = request.headers.get('authorization')
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    }
    if (authHeader) headers['authorization'] = authHeader

    const body = await request.text()

    const backendRes = await fetch(url, {
      method: 'POST',
      headers,
      body,
    })

    if (!backendRes.ok || !backendRes.body) {
      const errorData = await backendRes.json().catch(() => ({}))
      return new Response(JSON.stringify(errorData), {
        status: backendRes.status,
        headers: { 'content-type': 'application/json' },
      })
    }

    // SSE 流透传
    return new Response(backendRes.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({
        code: 500,
        message: err instanceof Error ? err.message : 'Internal server error',
        data: null,
      }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    )
  }
}
```

- [ ] **Step 6: 修改 /api/skills/stream/route.ts 添加 deprecated 注释**

在文件顶部注释中添加:

```typescript
/**
 * GET /api/skills/stream
 *
 * @deprecated 此端点为演示用 mock,实际执行请使用 POST /api/skills/[key]/execute
 * 保留此端点仅为向后兼容,后续版本将移除。
 *
 * Server-Sent Events (SSE) 端点 — 实时 skill 执行流(mock)
 * ...
 */
```

- [ ] **Step 7: 验证前端编译**

```bash
cd d:\king2046\project\aibrand-studio
npx tsc --noEmit
npx eslint "src/app/api/skills/**/*.ts" "src/lib/env.ts"
```
Expected: 0 errors / 0 warnings

---

## Task 8: 端到端验证

- [ ] **Step 1: 确认后端 aibrand-ai 运行(端口 3010)**

```bash
curl -s http://localhost:3010/skills/list -H "Authorization: Bearer test" | head -c 100
```
Expected: `{"code":1000,...}`

- [ ] **Step 2: 确认前端 dev server 运行(端口 3099)**

```bash
curl -s http://localhost:3099/api/health | head -c 50
```
Expected: `{"code":0,"data":{"status":"healthy"...}}`

- [ ] **Step 3: 验证前端代理 — /api/skills/list**

```bash
curl -s http://localhost:3099/api/skills/list | ConvertFrom-Json | Select-Object code,@{n='count';e={$_.data.Count}}
```
Expected: `code=1000, count=29`(如果后端未运行,返回 500 + error message)

- [ ] **Step 4: 验证前端代理 — /api/skills/list?type=expert**

```bash
curl -s "http://localhost:3099/api/skills/list?type=expert" | ConvertFrom-Json | Select-Object code,@{n='count';e={$_.data.Count}}
```
Expected: `code=1000, count=12`

- [ ] **Step 5: 验证前端代理 — /api/skills/[key]**

```bash
curl -s http://localhost:3099/api/skills/fashion-campaign-director | ConvertFrom-Json | Select-Object code,@{n='name';e={$_.data.name}}
```
Expected: `code=1000, name=AI Fashion Creative Director`

- [ ] **Step 6: 验证前端代理 — 404**

```bash
curl -s http://localhost:3099/api/skills/nonexistent -w "\n%{http_code}"
```
Expected: 404 + `skillKey 'nonexistent' not found`

- [ ] **Step 7: 验证 (fancyai) 页面仍正常(/experts /gallery /apps /platform)**

```bash
$pages = @('/experts','/gallery','/apps','/platform','/pricing','/about')
foreach ($p in $pages) {
  $r = Invoke-WebRequest "http://localhost:3099$p" -UseBasicParsing -TimeoutSec 15
  "$p => $($r.StatusCode)"
}
```
Expected: 全部 200

- [ ] **Step 8: 验证 next build**

```bash
cd d:\king2046\project\aibrand-studio
npx next build
```
Expected: build 成功,/experts /gallery /apps 等路由正常生成

---

## Self-Review

### Spec coverage
- ✅ 后端新建 skills 模块 — Task 1-5
- ✅ 接入 aibrand-ai/agent — Task 3(executeSkill 调用 AgentService)
- ✅ 前端代理转发 — Task 7
- ✅ 端到端验证 — Task 8

### Placeholder scan
- Task 1 Step 2:`ALL_SKILL_KEYS` 数组需从前端文件复制(已说明数据来源和复制方式)
- 其余任务代码完整

### Type consistency
- `SkillKey` 接口前后端一致(字段名、类型)
- `ExecuteSkillDto` 与 `CreateContentGenerationTaskDto` 的 model enum 一致(从 agent.dto.ts 复制)
- `AgentService.createContentGenerationTask` 签名与 agent.controller.ts 调用方式一致
