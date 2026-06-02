/**
 * CalendarPage - 内容日历
 * 月/周视图 · 拖拽排期 · 冲突检测 · 平台标记
 */

import dynamic from 'next/dynamic'
import type { Metadata } from 'next'
import { getMetadata } from '@/utils/general'

export async function generateMetadata(): Promise<Metadata> {
  return getMetadata(
    { title: '内容日历 - 智能排期与冲突检测', description: '可视化内容排期日历，支持月/周视图切换。AI推荐最佳发布时间，自动检测平台冲突。拖拽调整，灵活便捷。', keywords: '内容日历,排期,发布时间,内容规划,社媒日历' },
    'zh-CN', '/content/calendar',
  )
}

const CalendarCore = dynamic(() => import('./CalendarCore'), { ssr: false })
export default function CalendarPage() { return <CalendarCore /> }
