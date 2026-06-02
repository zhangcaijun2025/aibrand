/**
 * CommandsPage - 实战指令库
 * 分类浏览 + 搜索 + 一键复制 + 收藏
 */

import dynamic from 'next/dynamic'
import type { Metadata } from 'next'
import { getMetadata } from '@/utils/general'

export async function generateMetadata(): Promise<Metadata> {
  return getMetadata(
    {
      title: '实战指令库 - AI 提示词模板',
      description: '结构化、可预览、一键复制的提示词模板库。按行业、场景、平台分类，支持收藏和共创上传。',
      keywords: 'AI提示词,指令模板,内容创作,prompt,小红书,抖音,公众号',
    },
    'zh-CN',
    '/knowledge/commands',
  )
}

const CommandsCore = dynamic(() => import('./CommandsCore'), { ssr: false })

export default function CommandsPage() {
  return <CommandsCore />
}
