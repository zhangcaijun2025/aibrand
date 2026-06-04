/**
 * WorkflowStore — Create Agent 工作流状态管理
 */

import { create } from 'zustand'
import type { WorkflowProgress, TopicOption } from '@/api/workflow'
import { executeWorkflowWithSSE, confirmTopics, cancelWorkflow } from '@/api/workflow'

export type WorkflowStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

interface WorkflowStep {
  name: string
  label: string
  status: WorkflowStepStatus
  summary?: string
  error?: string
  data?: any
}

interface WorkflowState {
  // 工作流状态
  executionId: string | null
  status: 'idle' | 'running' | 'waiting_confirm' | 'completed' | 'failed' | 'cancelled'
  steps: WorkflowStep[]

  // 选题
  topics: TopicOption[]
  selectedTopicIds: string[]

  // 进度
  currentStep: string
  error: string | null
  controller: AbortController | null

  // Actions
  execute: (params: {
    query: string
    platforms: string[]
    industry?: string
    brand?: string
    contentType?: 'video' | 'image_text' | 'all'
    count?: number
  }) => Promise<void>
  onProgress: (event: WorkflowProgress) => void
  onTopicSelect: (topicId: string) => void
  onTopicConfirm: () => Promise<void>
  cancel: () => Promise<void>
  reset: () => void
}

const STEP_LABELS: Record<string, string> = {
  intent_analysis: '意图分析',
  strategy_research: '策略研究',
  topic_generator: '选题生成',
  content_generation: '内容生成',
  quality_check: '质量检测',
  publish_strategy: '发布策略',
}

const INITIAL_STEPS: WorkflowStep[] = Object.entries(STEP_LABELS).map(([name, label]) => ({
  name,
  label,
  status: 'pending',
}))

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  executionId: null,
  status: 'idle',
  steps: INITIAL_STEPS,
  topics: [],
  selectedTopicIds: [],
  currentStep: '',
  error: null,
  controller: null,

  execute: async (params) => {
    // 重置状态
    set({
      status: 'running',
      executionId: null,
      steps: INITIAL_STEPS.map(s => ({ ...s })),
      topics: [],
      selectedTopicIds: [],
      currentStep: '',
      error: null,
    })

    const updateStep = (name: string, updates: Partial<WorkflowStep>) => {
      set(state => ({
        steps: state.steps.map(s => (s.name === name ? { ...s, ...updates } : s)),
      }))
    }

    const controller = await executeWorkflowWithSSE(
      params,
      (event) => {
        set({ currentStep: event.currentStep })

        switch (event.event) {
          case 'step_started':
            updateStep(event.step!, { status: 'running' })
            break
          case 'step_completed':
            updateStep(event.step!, {
              status: 'completed',
              summary: event.summary,
              data: event,
            })

            // 如果是 topic_generator 完成，解析选题数据
            if (event.step === 'topic_generator' && event.summary) {
              // topics 从 SSE data 中提取
              set({ status: 'waiting_confirm' })
            }
            break
          case 'step_failed':
            updateStep(event.step!, {
              status: 'failed',
              error: event.error,
            })
            break
          case 'workflow_completed':
            set({ status: 'completed' })
            break
          case 'workflow_failed':
            set({ status: 'failed', error: event.error || '工作流执行失败' })
            break
          case 'workflow_cancelled':
            set({ status: 'cancelled' })
            break
        }
      },
      (error) => {
        set({ status: 'failed', error: error.message })
      },
      (executionId) => {
        set({ executionId })
      },
    )

    set({ controller })
  },

  onProgress: (event) => {
    get().onProgress(event)
  },

  onTopicSelect: (topicId) => {
    set(state => ({
      selectedTopicIds: state.selectedTopicIds.includes(topicId)
        ? state.selectedTopicIds.filter(id => id !== topicId)
        : [...state.selectedTopicIds, topicId],
    }))
  },

  onTopicConfirm: async () => {
    const { executionId, selectedTopicIds } = get()
    if (!executionId) return

    await confirmTopics(executionId, selectedTopicIds)
    set({ status: 'running' })
  },

  cancel: async () => {
    const { executionId, controller } = get()
    if (controller) controller.abort()
    if (executionId) await cancelWorkflow(executionId).catch(() => {})
    set({ status: 'cancelled' })
  },

  reset: () => {
    const { controller } = get()
    if (controller) controller.abort()
    set({
      executionId: null,
      status: 'idle',
      steps: INITIAL_STEPS,
      topics: [],
      selectedTopicIds: [],
      currentStep: '',
      error: null,
      controller: null,
    })
  },
}))
