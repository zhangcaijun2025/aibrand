/**
 * Workflow API — Create Agent 内容工厂 6 步工作流
 */

import { fetchEventSource } from '@microsoft/fetch-event-source'
import http from '@/utils/request'

export interface ExecuteWorkflowParams {
  query: string
  platforms: string[]
  industry?: string
  brand?: string
  contentType?: 'video' | 'image_text' | 'all'
  count?: number
}

export interface WorkflowProgress {
  event: string
  executionId: string
  currentStep: string
  timestamp: number
  step?: string
  summary?: string
  error?: string
  steps?: string[]
  progress?: Array<{ step: string; success: boolean; summary?: string }>
}

export interface TopicOption {
  id: string
  title: string
  angle: string
  hook: string
  outline: string[]
  platforms: string[]
}

/**
 * 启动工作流并通过 SSE 流式接收进度
 */
export async function executeWorkflowWithSSE(
  params: ExecuteWorkflowParams,
  onProgress: (event: WorkflowProgress) => void,
  onError: (error: Error) => void,
  onComplete: (executionId: string) => void,
): Promise<AbortController> {
  const controller = new AbortController()
  const token = (await import('@/store/user')).useUserStore.getState().token

  // 先 POST 获取 executionId
  const res = await http.post<{ executionId: string }>('/workflow/execute', params)
  const executionId = res?.data?.executionId

  if (!executionId) {
    onError(new Error('Failed to create workflow'))
    return controller
  }

  // 通过 SSE 订阅进度
  fetchEventSource(`/api/workflow/${executionId}/stream`, {
    signal: controller.signal,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    onmessage(event) {
      if (event.data) {
        const data = JSON.parse(event.data) as WorkflowProgress
        onProgress(data)

        if (data.event === 'workflow_completed' || data.event === 'workflow_failed' || data.event === 'workflow_cancelled') {
          onComplete(executionId)
          controller.abort()
        }
      }
    },
    onerror(err) {
      onError(err instanceof Error ? err : new Error(String(err)))
      controller.abort()
    },
  })

  return controller
}

/** 确认选题 (Step 3 callback) */
export async function confirmTopics(executionId: string, selectedTopics: string[]): Promise<void> {
  await http.post('/workflow/confirm', { executionId, selectedTopics })
}

/** 重试失败步骤 */
export async function retryStep(executionId: string, stepName: string): Promise<void> {
  await http.post('/workflow/retry', { executionId, stepName })
}

/** 取消工作流 */
export async function cancelWorkflow(executionId: string): Promise<void> {
  await http.delete(`/workflow/${executionId}`)
}

/** 获取工作流历史 */
export async function getWorkflowHistory(limit = 20, skip = 0): Promise<any[]> {
  return http.get<any[]>('/workflow/history', { params: { limit, skip } }).then(r => r?.data ?? [])
}
