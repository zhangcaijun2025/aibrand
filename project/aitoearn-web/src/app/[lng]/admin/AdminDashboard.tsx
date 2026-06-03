'use client'

/**
 * AdminDashboard — 后台管理仪表板
 * MVP 精简版概览面板
 */

import {
  BarChart3,
  CreditCard,
  FileText,
  Image,
  Package,
  Settings,
  TrendingUp,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { useTransClient } from '@/app/i18n/client'

/** 快捷入口卡片 */
function QuickLink({
  href,
  icon: Icon,
  label,
  description,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-6 transition-all hover:border-brand-primary/50 hover:shadow-md hover:shadow-brand-primary/5"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary transition-colors group-hover:bg-brand-primary group-hover:text-white">
          <Icon className="h-5 w-5" />
        </div>
        <span className="font-semibold text-foreground">{label}</span>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Link>
  )
}

/** 统计卡片 */
function StatCard({
  icon: Icon,
  label,
  value,
  trend,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  trend?: string
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-brand-primary/20 to-brand-secondary/20">
        <Icon className="h-6 w-6 text-brand-primary" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
      {trend && (
        <span className="ml-auto text-xs font-medium text-emerald-500">{trend}</span>
      )}
    </div>
  )
}

export default function AdminDashboard() {
  const { t } = useTransClient('common')

  const quickLinks = [
    {
      href: '/admin/orders',
      icon: Package,
      label: '订单管理',
      description: '查看积分订单与订阅记录',
    },
    {
      href: '/accounts',
      icon: Users,
      label: '平台账号',
      description: '管理已绑定的社交媒体账号',
    },
    {
      href: '/content',
      icon: FileText,
      label: '内容管理',
      description: '查看和编辑已发布内容',
    },
    {
      href: '/pricing',
      icon: CreditCard,
      label: '订阅计划',
      description: '升级订阅获取更多配额',
    },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">管理后台</h1>
        <p className="mt-1 text-muted-foreground">系统概览与快捷管理</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={FileText}
          label="今日内容生成"
          value="--"
          trend=""
        />
        <StatCard
          icon={TrendingUp}
          label="本月发布"
          value="--"
          trend=""
        />
        <StatCard
          icon={Users}
          label="已绑定平台"
          value="--"
          trend=""
        />
        <StatCard
          icon={BarChart3}
          label="内容曝光"
          value="--"
          trend=""
        />
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">快捷入口</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {quickLinks.map((link) => (
            <QuickLink key={link.href} {...link} />
          ))}
        </div>
      </div>
    </div>
  )
}
