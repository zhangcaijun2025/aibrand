/**
 * AnalyticsPage - 数据分析引擎
 * 全平台数据看板 + AI洞察 + 自动周报
 */

import dynamic from 'next/dynamic'
import type { Metadata } from 'next'
import { getMetadata } from '@/utils/general'

export async function generateMetadata(): Promise<Metadata> {
  return getMetadata(
    { title: '数据分析 - 全域运营数据引擎', description: '跨平台数据聚合看板：粉丝趋势、内容排行、互动分析、竞品对比。AI自动生成运营周报和优化建议。', keywords: '数据分析,运营数据,数据看板,粉丝分析,内容分析' },
    'zh-CN', '/analytics',
  )
}

const AnalyticsCore = dynamic(() => import('./AnalyticsCore'), { ssr: false })
export default function AnalyticsPage() { return <AnalyticsCore /> }
