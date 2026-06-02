/**
 * CustomersPage - 智能客服中心
 * AI+真人融合双模式：对内平台客服 + 对外帮用户回复客户
 */

import dynamic from 'next/dynamic'
import type { Metadata } from 'next'
import { getMetadata } from '@/utils/general'

export async function generateMetadata(): Promise<Metadata> {
  return getMetadata(
    {
      title: '智能客服中心 - AI+真人24小时服务',
      description: '双模式智能客服：对内 AI Agent 解答平台问题，对外 AI 帮你回复客户评论。24小时秒级响应，70%问题自动解决。',
      keywords: '智能客服,AI客服,自动回复,客户管理,工单系统',
    },
    'zh-CN',
    '/customers',
  )
}

const CustomersCore = dynamic(() => import('./CustomersCore'), { ssr: false })

export default function CustomersPage() {
  return <CustomersCore />
}
