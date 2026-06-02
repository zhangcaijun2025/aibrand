/**
 * SupportPage - 对内客服（平台服务）
 * AI Agent + FAQ 知识库 + 工单提交 + 智能转人工
 */

import dynamic from 'next/dynamic'
import type { Metadata } from 'next'
import { getMetadata } from '@/utils/general'

export async function generateMetadata(): Promise<Metadata> {
  return getMetadata(
    {
      title: '平台客服 - AI Agent 1秒响应',
      description: 'AI Agent 智能客服，1秒响应。覆盖注册、付费、故障、教程等常见问题。70%问题自动解决，复杂问题一键转人工。',
      keywords: '在线客服,AI客服,帮助中心,问题解答,工单',
    },
    'zh-CN',
    '/customers/support',
  )
}

const SupportCore = dynamic(() => import('./SupportCore'), { ssr: false })

export default function SupportPage() {
  return <SupportCore />
}
