/**
 * DraftBoxPage — AI 内容草稿管理与创作
 * MVP 核心功能：AI 批量创作 + 草稿管理
 */

import dynamic from 'next/dynamic'
import type { Metadata } from 'next'
import { getMetadata } from '@/utils/general'

export async function generateMetadata(): Promise<Metadata> {
  return getMetadata(
    {
      title: '内容创作 — AI 智能文案与素材管理',
      description: 'AI 驱动的批量内容创作平台，支持小红书、抖音、公众号等多平台。智能生成、素材管理、草稿编辑一站式完成。',
      keywords: 'AI内容创作,AI文案生成,社交媒体素材,草稿管理,多平台发布,AiBrand',
    },
    'zh-CN',
    '/draft-box',
  )
}

const DraftBoxCore = dynamic(() => import('./DraftBoxCore'), { ssr: false })

export default function DraftBoxPage() {
  return <DraftBoxCore />
}
