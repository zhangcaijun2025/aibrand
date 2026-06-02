/**
 * WorkflowsPage - 工作流模板库
 * 预设自动化工作流，一键启用
 */

import dynamic from 'next/dynamic'
import type { Metadata } from 'next'
import { getMetadata } from '@/utils/general'

export async function generateMetadata(): Promise<Metadata> {
  return getMetadata(
    {
      title: '工作流模板 - AI 自动化流水线',
      description: '预设工作流模板，一键启用。内容自动化、客户互动、竞品监测、数据报告自动生成。让你从重复劳动中解放。',
      keywords: '工作流,自动化,AI流水线,内容自动化,运营自动化',
    },
    'zh-CN',
    '/knowledge/workflows',
  )
}

const WorkflowsCore = dynamic(() => import('./WorkflowsCore'), { ssr: false })

export default function WorkflowsPage() {
  return <WorkflowsCore />
}
