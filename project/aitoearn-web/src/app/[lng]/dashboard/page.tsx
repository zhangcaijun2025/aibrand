/**
 * DashboardPage - 全域运营仪表盘
 * 用户登录后的首页工作台
 */

import dynamic from 'next/dynamic'
import type { Metadata } from 'next'
import { useTranslation } from '@/app/i18n'
import { fallbackLng, languages } from '@/lib/i18n/languageConfig'
import { getMetadata } from '@/utils/general'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lng: string }>
}): Promise<Metadata> {
  let { lng } = await params
  if (!languages.includes(lng))
    lng = fallbackLng

  const { t } = await useTranslation(lng, 'common')

  return getMetadata(
    {
      title: '工作台 - 全域运营仪表盘',
      description: '一目了然你的全域运营数据：粉丝趋势、内容表现、AI 策略建议、今日待办',
      keywords: '运营仪表盘,数据看板,AI运营,内容日历,数据分析',
    },
    lng,
    '/dashboard',
  )
}

const DashboardCore = dynamic(() => import('./DashboardCore'), {
  ssr: false,
})

export default function DashboardPage() {
  return <DashboardCore />
}
