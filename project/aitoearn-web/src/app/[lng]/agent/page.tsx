/**
 * Agent 问候页 — AiBrand 苏醒仪式
 * "不是在加载网页，是在叫醒一个等着你的伙伴"
 */

import type { Metadata } from 'next'
import { getMetadata } from '@/utils/general'
import dynamic from 'next/dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return getMetadata(
    {
      title: 'AiBrand — 你的 AI 运营伙伴',
      description: 'AI 全域运营伙伴，主动问候、智能分析、持续守护',
      keywords: 'AI运营,Agent,智能助手,内容创作,竞品分析,AiBrand',
    },
    'zh-CN',
    '/agent',
  )
}

const AgentGreetingCore = dynamic(() => import('./AgentGreetingCore'), { ssr: false })

export default function AgentPage() {
  return <AgentGreetingCore />
}
