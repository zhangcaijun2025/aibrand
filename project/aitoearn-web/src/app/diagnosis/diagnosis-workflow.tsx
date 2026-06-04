/**
 * 全链路工作流服务层
 *
 * 统一封装 N8N 工作流触发、Dify 知识库同步、状态轮询。
 * 不影响主业务流程（非阻塞），所有 N8N 调用 5s 超时，Dify 调用 10s 超时。
 */

// ==================== 类型定义 ====================

export type WorkflowType = 'diagnosis' | 'optimize' | 'review' | 'account' | 'daily_briefing' | 'weekly_report'

export interface WorkflowPayload {
  title?: string
  content?: string
  category?: string
  score?: number
  grade?: string
  [key: string]: unknown
}

export interface N8nExecutionStatus {
  execution_id: string
  found: boolean
  status: 'running' | 'completed' | 'failed'
  workflow_type?: string
  started_at?: string
  completed_at?: string
  result?: Record<string, unknown>
  dify_doc_id?: string
  error?: string
}

export interface WorkflowResult {
  n8n: {
    triggered: boolean
    execution_id: string
    status: string
  }
  dify: {
    synced: boolean
    doc_id?: string
  }
  timestamp: string
}

// ==================== 配置 ====================

const N8N_TIMEOUT = 5000 // 5 秒超时
const DIFY_TIMEOUT = 10000 // 10 秒超时
const N8N_API_BASE = '/api/n8n'
const DIFY_API_BASE = '/api/dify'

// ==================== N8N 工作流触发 ====================

/**
 * 触发 N8N 工作流（非阻塞，5s 超时）
 * @param type 工作流类型
 * @param data 载荷数据
 * @returns 触发结果，含 execution_id
 */
export async function triggerN8nWorkflow(
  type: WorkflowType,
  data: WorkflowPayload,
): Promise<{
  success: boolean
  execution_id: string
  status: string
  error?: string
}> {
  const webhookId = getWebhookId(type)

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), N8N_TIMEOUT)

    const res = await fetch(`${N8N_API_BASE}/trigger-workflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webhook_id: webhookId,
        payload: {
          workflow_type: type,
          ...data,
          timestamp: new Date().toISOString(),
        },
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!res.ok) {
      return {
        success: false,
        execution_id: '',
        status: 'failed',
        error: `HTTP ${res.status}`,
      }
    }

    const result = await res.json()
    return {
      success: result.success ?? true,
      execution_id: result.execution_id || '',
      status: result.status || 'running',
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[Workflow] N8N trigger ${type} failed:`, msg)
    return { success: false, execution_id: '', status: 'unreachable', error: msg }
  }
}

/**
 * 查询 N8N 工作流执行状态
 */
export async function getN8nWorkflowStatus(
  executionId: string,
): Promise<N8nExecutionStatus | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), N8N_TIMEOUT)

    const res = await fetch(`${N8N_API_BASE}/workflow-status/${executionId}`, {
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/**
 * 轮询 N8N 工作流状态直到完成
 * @param executionId 执行 ID
 * @param maxRetries 最大轮询次数（默认 6 次，间隔 2s ≈ 12s）
 */
export async function pollN8nWorkflowStatus(
  executionId: string,
  maxRetries = 6,
): Promise<N8nExecutionStatus | null> {
  for (let i = 0; i < maxRetries; i++) {
    const status = await getN8nWorkflowStatus(executionId)
    if (!status) return null
    if (status.status === 'completed' || status.status === 'failed') {
      return status
    }
    await new Promise(r => setTimeout(r, 2000))
  }
  // 超时返回当前状态
  return await getN8nWorkflowStatus(executionId)
}

// ==================== Dify 知识库同步 ====================

/**
 * 同步数据到 Dify 知识库
 * @param type 数据类型
 * @param data 同步数据
 */
export async function syncToDify(
  type: WorkflowType,
  data: Record<string, unknown>,
): Promise<{
  synced: boolean
  doc_id?: string
  error?: string
}> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), DIFY_TIMEOUT)

    const payload = buildDifyPayload(type, data)

    const res = await fetch(`${DIFY_API_BASE}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!res.ok) {
      const text = await res.text()
      return { synced: false, error: `HTTP ${res.status}: ${text.slice(0, 100)}` }
    }

    const result = await res.json()
    const docId = result?.dify_response?.data?.document?.id || result?.dify_response?.data?.id || ''
    return {
      synced: result.ok ?? false,
      doc_id: docId,
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[Workflow] Dify sync ${type} failed:`, msg)
    return { synced: false, error: msg }
  }
}

// ==================== 全链路执行 ====================

/**
 * 全链路执行：诊断/优化/复诊/体检完成后，同时触发 N8N + 同步 Dify
 *
 * 这是一个 fire-and-forget 调用，不影响主流程。
 * 返回触发状态，可在 UI 中展示 N8N/Dify 状态指示器。
 */
export async function runFullWorkflow(
  type: WorkflowType,
  data: WorkflowPayload,
): Promise<WorkflowResult> {
  const timestamp = new Date().toISOString()

  // 1. 触发 N8N 工作流（非阻塞，5s 超时）
  const n8nResult = await triggerN8nWorkflow(type, data)

  // 2. 同步到 Dify 知识库（10s 超时）
  const difyResult = await syncToDify(type, {
    ...data,
    workflow_type: type,
    n8n_execution_id: n8nResult.execution_id,
  })

  return {
    n8n: {
      triggered: n8nResult.success,
      execution_id: n8nResult.execution_id,
      status: n8nResult.status,
    },
    dify: {
      synced: difyResult.synced,
      doc_id: difyResult.doc_id,
    },
    timestamp,
  }
}

// ==================== 内部工具函数 ====================

function getWebhookId(type: WorkflowType): string {
  const map: Partial<Record<WorkflowType, string>> = {
    diagnosis: 'noterx-diagnosis-completed',
    optimize: 'noterx-optimize-completed',
    review: 'noterx-review-completed',
    account: 'noterx-account-check',
  }
  return map[type] ?? ''
}

function buildDifyPayload(
  type: WorkflowType,
  data: Record<string, unknown>,
): Record<string, unknown> {
  const base = {
    title: (data.title as string) || '',
    category: (data.category as string) || 'lifestyle',
    overall_score: (data.score as number) || 0,
    grade: (data.grade as string) || '',
    analysis_summary: '',
    issues: [] as unknown[],
    suggestions: [] as unknown[],
    metadata: {
      workflow_type: type,
      source: 'AiBrand-diagnosis',
    },
  }

  switch (type) {
    case 'diagnosis':
      return {
        ...base,
        analysis_summary: `内容诊断评分 ${data.score}/100（${data.grade}）`,
        metadata: { ...base.metadata, type: 'diagnosis_record' },
      }
    case 'optimize':
      return {
        ...base,
        analysis_summary: (data as any).plans
          ? `生成 ${(data as any).plans.length} 个优化方案，最高分 ${data.score}/100`
          : `处方优化评分 ${data.score}/100`,
        metadata: { ...base.metadata, type: 'optimize_record' },
      }
    case 'review':
      return {
        ...base,
        analysis_summary: `智能复诊: ${(data as any).url || ''} 评分 ${data.score}/100（${data.level || data.grade}）`,
        metadata: {
          ...base.metadata,
          type: 'review_record',
          url: (data as any).url || '',
          platform: (data as any).platform || '',
        },
      }
    case 'account':
      return {
        ...base,
        analysis_summary: `账号体检: ${(data as any).nickname || ''} 五维健康评分 ${JSON.stringify((data as any).scores || {})}`,
        metadata: {
          ...base.metadata,
          type: 'account_check',
          nickname: (data as any).nickname || '',
          platform: (data as any).platform || '',
          level: data.grade || '',
        },
      }
    default:
      return base
  }
}

// ==================== React 组件：N8N/Dify 状态指示器 ====================

export interface WorkflowStatusIndicatorProps {
  result?: WorkflowResult
}

/**
 * N8N / Dify 同步状态显示组件
 * 在诊断结果区域底部显示两个状态指示灯
 */
export function WorkflowStatusIndicator({ result }: WorkflowStatusIndicatorProps) {
  if (!result) return null

  return (
    <div style={{
      display: 'flex',
      gap: 12,
      marginTop: 12,
      padding: '8px 12px',
      background: '#f8f9fa',
      borderRadius: 8,
      fontSize: 11,
      color: '#666',
    }}>
      <StatusItem
        label="N8N 工作流"
        ok={result.n8n.triggered}
        detail={result.n8n.status}
      />
      <StatusItem
        label="Dify 知识库"
        ok={result.dify.synced}
        detail={result.dify.doc_id ? `ID: ${result.dify.doc_id.slice(0, 12)}...` : ''}
      />
    </div>
  )
}

// ==================== DeepSeek AI 集成 ====================

/** DeepSeek 诊断结果 */
export interface DeepSeekDiagnosisResult {
  success: boolean
  model: string
  analysis: {
    overall_score?: number
    grade?: string
    analysis?: { topic: string; sentiment: string; target_audience: string }
    dimension_analysis?: Record<string, { score: number; strength: string; weakness: string; suggestion: string }>
    platform_adaptation?: Record<string, { score: number; tip: string }>
    summary?: string
    raw?: string
  }
}

/** 调用 DeepSeek 进行内容诊断 */
export async function triggerDeepSeekDiagnosis(
  title: string,
  content: string,
  category: string,
  platforms: string[],
  deep = false,
): Promise<DeepSeekDiagnosisResult | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), deep ? 60000 : 30000)
    const res = await fetch('/api/ai/diagnosis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content, category, platforms, deep }),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!res.ok) return null
    return await res.json()
  } catch (err: any) {
    if (err.name !== 'AbortError') console.warn('[DeepSeek Diagnosis]', err.message)
    return null
  }
}

/** 调用 DeepSeek R1 生成优化方案 */
export async function triggerDeepSeekOptimize(
  title: string,
  content: string,
  category: string,
  diagnosisScore: number,
  weaknesses: string[],
  platforms: string[],
): Promise<{ success: boolean; plans: any[] } | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 60000)
    const res = await fetch('/api/ai/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content, category, diagnosisScore, weaknesses, platforms }),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!res.ok) return null
    return await res.json()
  } catch (err: any) {
    if (err.name !== 'AbortError') console.warn('[DeepSeek Optimize]', err.message)
    return null
  }
}

function StatusItem({
  label,
  ok,
  detail,
}: {
  label: string
  ok: boolean
  detail?: string
}) {
  const icon = ok ? '✅' : '⏳'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span>{icon}</span>
      <span style={{ fontWeight: 500 }}>{label}</span>
      {detail && <span style={{ color: '#999' }}>({detail})</span>}
    </div>
  )
}
