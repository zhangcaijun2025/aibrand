/**
 * AdminPage - 后台管理首页
 * 订单管理、系统概览等管理功能入口
 */

import { redirect } from 'next/navigation'
import { fallbackLng } from '@/lib/i18n/languageConfig'

interface AdminPageProps {
  params: Promise<{ lng: string }>
}

export default async function AdminPage({ params }: AdminPageProps) {
  const { lng } = await params
  redirect(`/${lng || fallbackLng}/admin/orders`)
}
