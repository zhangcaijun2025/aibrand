/**
 * AdminPage — 后台管理仪表板
 * MVP 精简版：订阅概览 + 内容统计 + 快捷入口
 */

import type { Metadata } from 'next'
import { getMetadata } from '@/utils/general'

export async function generateMetadata(): Promise<Metadata> {
  return getMetadata(
    {
      title: '管理后台 — 数据概览与系统管理',
      description: 'AiBrand 管理后台：订阅状态、内容统计、订单管理、账号管理',
      keywords: '管理后台,数据概览,订阅管理,内容统计,AiBrand',
    },
    'zh-CN',
    '/admin',
  )
}

import dynamic from 'next/dynamic'

const AdminDashboard = dynamic(() => import('./AdminDashboard'), { ssr: false })

export default function AdminPage() {
  return <AdminDashboard />
}
