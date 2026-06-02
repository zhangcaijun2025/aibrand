/**
 * CasesPage - 案例拆解室
 * 展示 AI 协作思考过程的完整案例
 */

import dynamic from 'next/dynamic'
import type { Metadata } from 'next'
import { getMetadata } from '@/utils/general'

export async function generateMetadata(): Promise<Metadata> {
  return getMetadata(
    {
      title: '案例拆解室 - AI 协作实战复盘',
      description: '不只是展示结果，更展示"思考过程+指令迭代+工作流设计"的完整链路。学习同行如何用 AI 拿到好结果。',
      keywords: 'AI案例,实战复盘,指令迭代,运营案例,内容创作案例',
    },
    'zh-CN',
    '/knowledge/cases',
  )
}

const CasesCore = dynamic(() => import('./CasesCore'), { ssr: false })

export default function CasesPage() {
  return <CasesCore />
}
