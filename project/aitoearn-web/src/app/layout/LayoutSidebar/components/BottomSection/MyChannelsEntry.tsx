/**
 * MyChannelsEntry - 我的频道入口（优化版）
 * 显示已连接平台状态，一键管理多平台账号
 */

'use client'

import type { SidebarCommonProps } from '../../types'
import { Tv, CheckCircle, XCircle, Plus, ExternalLink } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTransClient } from '@/app/i18n/client'
import { useChannelManagerStore } from '@/components/ChannelManager'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import Link from 'next/link'

// 平台配置
const PLATFORMS = [
  { id: 'douyin', name: '抖音', icon: '🎵', color: '#000' },
  { id: 'xiaohongshu', name: '小红书', icon: '📕', color: '#ff4d6a' },
  { id: 'kuaishou', name: '快手', icon: '🎬', color: '#ff6f00' },
  { id: 'bilibili', name: 'B站', icon: '📺', color: '#fb7299' },
  { id: 'weixin', name: '视频号', icon: '💬', color: '#07c160' },
  { id: 'wechat', name: '公众号', icon: '📰', color: '#07c160' },
  { id: 'tiktok', name: 'TikTok', icon: '🌍', color: '#000' },
  { id: 'youtube', name: 'YouTube', icon: '▶️', color: '#ff0000' },
  { id: 'instagram', name: 'Instagram', icon: '📷', color: '#e1306c' },
  { id: 'facebook', name: 'Facebook', icon: '👍', color: '#1877f2' },
  { id: 'twitter', name: 'Twitter/X', icon: '🐦', color: '#1da1f2' },
  { id: 'pinterest', name: 'Pinterest', icon: '📌', color: '#e60023' },
  { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: '#0a66c2' },
  { id: 'threads', name: 'Threads', icon: '🧵', color: '#000' },
]

export function MyChannelsEntry({ collapsed }: SidebarCommonProps) {
  const { t } = useTransClient('account')
  const openModal = useChannelManagerStore(state => state.openModal)
  const [connected, setConnected] = useState<string[]>([])
  const [showPanel, setShowPanel] = useState(false)

  // 尝试从 store 获取已连接平台状态
  useEffect(() => {
    try {
      const state = useChannelManagerStore.getState()
      if (state.accounts) {
        const connectedPlatforms = state.accounts
          .filter((a: any) => a.status === 'connected' || a.status === 'active')
          .map((a: any) => a.platform)
        setConnected([...new Set(connectedPlatforms)] as string[])
      }
    } catch {}
  }, [])

  const handleClick = () => {
    openModal()
  }

  const connectedCount = connected.length
  const totalPlatforms = PLATFORMS.length

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            <button
              type="button"
              onClick={handleClick}
              onMouseEnter={() => !collapsed && setShowPanel(true)}
              onMouseLeave={() => setShowPanel(false)}
              data-testid="sidebar-my-channels"
              className={cn(
                'flex flex-1 cursor-pointer items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
                collapsed ? 'h-9 w-9 justify-center' : 'justify-between px-3 py-2',
              )}
            >
              <div className="flex items-center gap-2">
                <Tv size={18} className="text-primary" />
                {!collapsed && (
                  <span className="text-sm">{t('channelManager.myChannels')}</span>
                )}
              </div>
              {!collapsed && connectedCount > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  {connectedCount}
                </span>
              )}
            </button>

            {/* 展开面板 - 平台连接概览 */}
            {!collapsed && showPanel && (
              <div
                onMouseEnter={() => setShowPanel(true)}
                onMouseLeave={() => setShowPanel(false)}
                className="absolute bottom-full left-0 right-0 mb-1 bg-popover border border-border rounded-xl shadow-lg p-3 z-50"
              >
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  {t('channelManager.myChannels')} ({connectedCount}/{totalPlatforms})
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {PLATFORMS.slice(0, 9).map(p => {
                    const isConnected = connected.includes(p.id)
                    return (
                      <div
                        key={p.id}
                        className={cn(
                          'flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-all',
                          isConnected
                            ? 'bg-primary/5 text-foreground'
                            : 'text-muted-foreground/50',
                        )}
                      >
                        <span className="text-sm">{p.icon}</span>
                        {isConnected ? (
                          <CheckCircle size={10} className="text-green-500 shrink-0" />
                        ) : (
                          <Plus size={10} className="text-muted-foreground/30 shrink-0" />
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* 展开更多 + 管理入口 */}
                <div className="mt-2 pt-2 border-t border-border flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    共支持 {totalPlatforms} 个平台
                  </span>
                  <Link
                    href="/zh-CN/accounts"
                    className="text-[11px] text-primary hover:underline flex items-center gap-1"
                    onClick={e => e.stopPropagation()}
                  >
                    管理 <ExternalLink size={10} />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </TooltipTrigger>
        {collapsed && (
          <TooltipContent side="right">
            <p>
              {t('channelManager.myChannels')}
              {connectedCount > 0 && ` (${connectedCount})`}
            </p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  )
}
