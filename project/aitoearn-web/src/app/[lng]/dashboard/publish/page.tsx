/**
 * Dashboard Publish — Extension-based publishing page
 * Route: /dashboard/publish
 */

import type { Metadata } from 'next'
import { fallbackLng, languages } from '@/lib/i18n/languageConfig'
import { getMetadata } from '@/utils/general'
import { DashboardPublishCore } from './DashboardPublishCore'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lng: string }>
}): Promise<Metadata> {
  let { lng } = await params
  if (!languages.includes(lng)) lng = fallbackLng
  return getMetadata(
    { title: '扩展发布 - AiBrand', description: '通过浏览器扩展一键发布到 30+ 平台' },
    lng,
    '/dashboard/publish',
  )
}

export default function DashboardPublishPage() {
  return <DashboardPublishCore />
}
