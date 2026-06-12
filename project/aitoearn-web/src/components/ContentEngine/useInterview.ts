/**
 * useInterview — 引导式采访状态管理 Hook
 *
 * 管理采访的完整生命周期：
 * 1. 发起采访会话
 * 2. 逐轮获取问题卡片
 * 3. 提交回答 / 跳过
 * 4. 完成 → 获取结构化 Brief
 * 5. 确认 Brief
 */

'use client'

import { useCallback, useState } from 'react'
import type { InterviewCardData } from './InterviewCard'

// ── Types ──

export interface InterviewStateData {
  briefId: string
  currentStep: number
  totalSteps: number
  completedFields: string[]
  skippedFields: Array<{ field: string; reason: string }>
  remainingFields: string[]
  isComplete: boolean
}

export interface ContentBrief {
  id: string
  clarityScore: number
  status: 'draft' | 'confirmed' | 'in_progress' | 'completed'
  intent: {
    industry: { primary: string; secondary?: string }
    targetAudience: { segments: string[]; painPoints: string[] }
    contentType: string
    goal: string
  }
  style: {
    tone: string
    visualStyle: string
    colorPreference: string[]
  }
  platforms: Array<{ code: string; format: string }>
  product: {
    name: string
    category: string
    usps: string[]
    cta: string
  }
  brand: {
    voice: string
    forbiddenWords: string[]
    fixedPhrases: string[]
  }
}

// ── API Response Types ──

interface StartInterviewResponse {
  brief: { id: string }
  state: InterviewStateData
}

interface NextCardResponse {
  card: InterviewCardData | null
  state: InterviewStateData
}

interface AnswerResponse {
  nextCard: InterviewCardData | null
  state: InterviewStateData
}

// ── Default API base ──

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? '/api'

// ── Hook ──

export function useInterview() {
  const [currentCard, setCurrentCard] = useState<InterviewCardData | null>(null)
  const [state, setState] = useState<InterviewStateData | null>(null)
  const [brief, setBrief] = useState<ContentBrief | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * 发起采访会话
   */
  const startInterview = useCallback(async (userId: string, brandId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE}/content/interview/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, brandId }),
      })

      if (!response.ok) {
        throw new Error(`Failed to start interview: ${response.status}`)
      }

      const data: StartInterviewResponse = await response.json()
      setState(data.state)

      // Fetch first card
      const cardResponse = await fetch(
        `${API_BASE}/content/interview/${data.brief.id}/next-card`,
      )
      const cardData: NextCardResponse = await cardResponse.json()
      setCurrentCard(cardData.card ?? null)

      return data.brief.id
    } catch (err: any) {
      setError(err.message ?? 'Failed to start interview')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * 提交回答
   */
  const submitAnswer = useCallback(async (answer: string | string[], skipped = false) => {
    if (!state?.briefId) return

    setIsLoading(true)
    setError(null)
    setCurrentCard(null) // Clear current card while loading

    try {
      const response = await fetch(
        `${API_BASE}/content/interview/${state.briefId}/answer`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            briefId: state.briefId,
            cardIndex: state.currentStep,
            answer,
            skipped,
          }),
        },
      )

      if (!response.ok) {
        throw new Error(`Failed to submit answer: ${response.status}`)
      }

      const data: AnswerResponse = await response.json()
      setState(data.state)

      if (data.nextCard) {
        setCurrentCard(data.nextCard)
      } else if (data.state.isComplete) {
        // Interview complete — fetch the brief
        setCurrentCard(null)
        await fetchBrief(state.briefId)
      }
    } catch (err: any) {
      setError(err.message ?? 'Failed to submit answer')
    } finally {
      setIsLoading(false)
    }
  }, [state?.briefId, state?.currentStep])

  /**
   * 跳过当前卡片
   */
  const skipCard = useCallback(async () => {
    await submitAnswer([], true)
  }, [submitAnswer])

  /**
   * 获取完整 Brief
   */
  const fetchBrief = useCallback(async (briefId: string) => {
    try {
      const response = await fetch(`${API_BASE}/content/brief/${briefId}`)
      if (!response.ok) throw new Error(`Failed to fetch brief: ${response.status}`)
      const data = await response.json()
      setBrief(data)
      return data as ContentBrief
    } catch (err: any) {
      setError(err.message ?? 'Failed to fetch brief')
      return null
    }
  }, [])

  /**
   * 确认 Brief
   */
  const confirmBrief = useCallback(async (briefId: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE}/content/brief/${briefId}/confirm`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error(`Failed to confirm brief: ${response.status}`)
      const data = await response.json()
      setBrief(data)
      return data as ContentBrief
    } catch (err: any) {
      setError(err.message ?? 'Failed to confirm brief')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    setCurrentCard(null)
    setState(null)
    setBrief(null)
    setIsLoading(false)
    setError(null)
  }, [])

  return {
    /** 当前采访卡片（null 表示已完成或无卡片） */
    currentCard,
    /** 采访状态 */
    state,
    /** 生成的 Brief（采访完成后可用） */
    brief,
    /** 加载中 */
    isLoading,
    /** 错误信息 */
    error,
    /** 发起采访 */
    startInterview,
    /** 提交回答 */
    submitAnswer,
    /** 跳过当前卡片 */
    skipCard,
    /** 确认 Brief */
    confirmBrief,
    /** 重置 */
    reset,
  }
}
