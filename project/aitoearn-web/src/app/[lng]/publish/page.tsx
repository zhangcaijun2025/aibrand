/**
 * PublishPage - 统一分发中控
 * 一条内容 → AI适配多平台 → 预览 → 排期 → 发布
 */

import dynamic from 'next/dynamic'
import type { Metadata } from 'next'
import { getMetadata } from '@/utils/general'

export async function generateMetadata(): Promise<Metadata> {
  return getMetadata(
    { title: '统一分发中控 - 一键多平台发布', description: '一条核心内容，AI自动适配小红书、抖音、B站、公众号等多平台格式。并排预览、智能排期、一键发布。', keywords: '多平台发布,内容分发,定时发布,跨平台,一键发布' },
    'zh-CN', '/publish',
  )
}

const PublishCore = dynamic(() => import('./PublishCore'), { ssr: false })
export default function PublishPage() { return <PublishCore /> }
