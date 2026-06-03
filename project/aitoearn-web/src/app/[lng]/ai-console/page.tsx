/**
 * AiConsole — AI 控制台
 * 展示五层架构、系统健康、Agent 对话、进化指数
 */

import type { Metadata } from 'next'
import { getMetadata } from '@/utils/general'

export async function generateMetadata(): Promise<Metadata> {
  return getMetadata(
    {
      title: 'AI 控制台 — 五层智能运维中心',
      description: 'AI 控制台：五层架构健康监控、Agent 对话、工作流调度、进化指数、Skill 管理',
      keywords: 'AI控制台,智能运维,Agent,工作流,系统健康,进化引擎,AiBrand',
    },
    'zh-CN',
    '/ai-console',
  )
}

import dynamic from 'next/dynamic'

const AiConsoleCore = dynamic(() => import('./AiConsoleCore'), { ssr: false })

export default function AiConsolePage() {
  return <AiConsoleCore />
}
