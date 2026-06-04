/**
 * AssetsTabView — 资产 Tab
 *
 * 平台账号列表 + 竞品监控 + 客户管理。
 * 交互模式：类微信通讯录（列表→详情）。
 */

'use client'

import { useRouter } from 'next/navigation'
import { Tv, Eye, Users as UsersIcon, Plus } from 'lucide-react'
import { useGetClientLng } from '@/hooks/useSystem'

export function AssetsTabView() {
  const router = useRouter()
  const lng = useGetClientLng()

  const sections = [
    {
      title: '我的平台账号',
      icon: Tv,
      desc: '管理已连接的社交平台账号',
      path: '/accounts',
      count: '0 个已连接',
    },
    {
      title: '竞品监控',
      icon: Eye,
      desc: '追踪竞品动态，获取实时提醒',
      path: '/chat?agent=competitor-analyst',
      count: '添加竞品',
    },
    {
      title: '客户管理',
      icon: UsersIcon,
      desc: '查看客户互动记录与画像',
      path: '/customers',
      count: '查看',
    },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-4 py-3 border-b border-border/50">
        <h1 className="text-lg font-semibold text-foreground">资产</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          平台账号 · 竞品 · 客户
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sections.map((s) => (
          <button
            key={s.title}
            onClick={() => router.push(`/${lng}${s.path}`)}
            className="flex items-center gap-4 w-full px-4 py-4 border-b border-border/30
                       hover:bg-muted/30 transition-colors text-left"
          >
            <span className="shrink-0 p-2.5 rounded-xl bg-muted">
              <s.icon className="h-5 w-5 text-muted-foreground" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground">{s.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.desc}</div>
            </div>
            <span className="text-xs text-muted-foreground/70">{s.count}</span>
          </button>
        ))}

        {/* Add account button */}
        <button
          onClick={() => router.push(`/${lng}/accounts`)}
          className="flex items-center gap-3 w-full px-4 py-4 hover:bg-muted/30 transition-colors"
        >
          <span className="shrink-0 p-2.5 rounded-xl bg-(--brand-purple)/10">
            <Plus className="h-5 w-5 text-(--brand-purple)" />
          </span>
          <span className="text-sm text-(--brand-purple) font-medium">添加平台账号</span>
        </button>
      </div>
    </div>
  )
}
