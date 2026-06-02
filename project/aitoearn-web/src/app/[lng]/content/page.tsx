/**
 * ContentPage - 内容中枢
 * AI批量创作 + 多平台适配 + 内容版本管理
 */

import dynamic from 'next/dynamic'
import type { Metadata } from 'next'
import { getMetadata } from '@/utils/general'

export async function generateMetadata(): Promise<Metadata> {
  return getMetadata(
    { title: '内容中枢 - AI批量创作与多平台适配', description: 'AI批量生成内容，自动适配小红书、抖音、公众号等多平台格式。内容版本管理与智能排期。', keywords: '内容创作,批量生成,多平台适配,内容管理,AI写作' },
    'zh-CN', '/content',
  )
}

const ContentCore = dynamic(() => import('./ContentCore'), { ssr: false })
export default function ContentPage() { return <ContentCore /> }
