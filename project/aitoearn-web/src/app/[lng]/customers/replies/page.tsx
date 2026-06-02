/**
 * RepliesPage - 对外客服（帮用户回复客户）
 * 跨平台评论聚合 + AI 智能回复 + 品牌知识库 RAG
 */

import dynamic from 'next/dynamic'
import type { Metadata } from 'next'
import { getMetadata } from '@/utils/general'

export async function generateMetadata(): Promise<Metadata> {
  return getMetadata(
    {
      title: '客户回复助手 - AI 帮你管理跨平台互动',
      description: '跨平台评论和私信聚合管理。AI 基于你的品牌知识库自动生成个性化回复，学习你的风格，让每次互动都恰到好处。',
      keywords: '评论回复,私信管理,AI回复,客户互动,跨平台',
    },
    'zh-CN',
    '/customers/replies',
  )
}

const RepliesCore = dynamic(() => import('./RepliesCore'), { ssr: false })

export default function RepliesPage() {
  return <RepliesCore />
}
