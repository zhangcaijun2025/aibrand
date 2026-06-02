/**
 * AgentAssetsHeader - Agent 素材页顶部组件
 * 包含返回按钮、标题、分类筛选器
 */

'use client'

import { ArrowLeft, Bot } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { useTransClient } from '@/app/i18n/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AgentAssetsHeaderProps {
  /** 总数量 */
  total: number
  /** 当前选中的分类 */
  activeCategory: string
  /** 分类切换回调 */
  onCategoryChange: (category: string) => void
}

/** 预设分类列表 */
const CATEGORIES = [
  { key: 'all', label: '全部' },
  { key: 'aiImage', label: '图片' },
  { key: 'aiVideo', label: '视频' },
  { key: 'aiCard', label: '卡片' },
]

export function AgentAssetsHeader({ total, activeCategory, onCategoryChange }: AgentAssetsHeaderProps) {
  const { t } = useTransClient('material')
  const router = useRouter()

  // 返回内容管理
  const handleBack = useCallback(() => {
    router.push('/')
  }, [router])

  return (
    <header className="sticky top-0 z-10 bg-card border-b border-border">
      {/* 顶部行 */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBack} className="w-8 h-8 cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-semibold text-foreground">{t('agentAssets.title')}</h1>
          </div>

          {total > 0 && (
            <span className="text-sm text-muted-foreground">
              (
              {total}
              )
            </span>
          )}
        </div>
      </div>

      {/* 分类筛选栏 */}
      <div className="flex items-center gap-1 px-4 pb-3 overflow-x-auto">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => onCategoryChange(cat.key)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer',
              activeCategory === cat.key
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </header>
  )
}
