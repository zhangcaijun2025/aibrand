/**
 * CommandsCore - 实战指令库主组件
 * 分类浏览 + 搜索 + 一键复制 + 收藏 + 贡献入口
 */

'use client'

import { useState, useMemo } from 'react'
import { Bookmark, Check, Copy, Search, Sparkles, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'
import { COMMAND_TEMPLATES, type CommandTemplate } from '@/lib/knowledge/seed-data'

// ── 分类选项 ──

const CATEGORIES = ['全部', '美妆护肤', '科技数码', '教育培训', '美食餐饮', '服装服饰', '通用']
const SCENARIOS = ['全部', '产品种草', '获客引流', '品牌建设', '销售转化', '私域转化', '客户维护', '知识付费']
const PLATFORMS = ['全部', '小红书', '抖音', 'B站', '公众号', '微信', '淘宝', '通用']
const CONTENT_TYPES = ['全部', '图文', '短视频', '长视频', '文本']

export default function CommandsCore() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('全部')
  const [scenario, setScenario] = useState('全部')
  const [platform, setPlatform] = useState('全部')
  const [contentType, setContentType] = useState('全部')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    return COMMAND_TEMPLATES.filter(cmd => {
      if (search && !cmd.title.includes(search) && !cmd.prompt.includes(search) && !cmd.tags.some(t => t.includes(search)))
        return false
      if (category !== '全部' && cmd.category !== category)
        return false
      if (scenario !== '全部' && cmd.scenario !== scenario)
        return false
      if (platform !== '全部' && cmd.platform !== platform)
        return false
      if (contentType !== '全部' && cmd.contentType !== contentType)
        return false
      return true
    })
  }, [search, category, scenario, platform, contentType])

  const handleCopy = (cmd: CommandTemplate) => {
    navigator.clipboard.writeText(cmd.prompt)
    setCopiedId(cmd.id)
    toast.success('已复制到剪贴板')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        toast.success('已取消收藏')
      } else {
        next.add(id)
        toast.success('已加入收藏')
      }
      return next
    })
  }

  const FilterBar = ({ options, value, onChange, label }: {
    options: string[]; value: string; onChange: (v: string) => void; label: string
  }) => (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <div className="flex gap-1 flex-wrap">
        {options.map(o => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={cn(
              'px-2.5 py-1 rounded-full text-xs cursor-pointer transition-all',
              value === o ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70 text-muted-foreground',
            )}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="max-w-5xl mx-auto w-full px-4 md:px-6 py-6 space-y-6">

        {/* 标题 + 搜索 */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              实战指令库
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {COMMAND_TEMPLATES.length} 个精选指令模板 · 一键复制使用
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索指令..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:border-primary/60"
            />
          </div>
        </div>

        {/* 筛选栏 */}
        <div className="space-y-2 p-4 rounded-xl border border-border bg-card">
          <FilterBar options={CATEGORIES} value={category} onChange={setCategory} label="行业" />
          <FilterBar options={SCENARIOS} value={scenario} onChange={setScenario} label="场景" />
          <FilterBar options={PLATFORMS} value={platform} onChange={setPlatform} label="平台" />
          <FilterBar options={CONTENT_TYPES} value={contentType} onChange={setContentType} label="形态" />
        </div>

        {/* 结果 */}
        <div className="text-xs text-muted-foreground">
          找到 {filtered.length} 个指令
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(cmd => {
            const isExpanded = expandedId === cmd.id
            return (
              <div key={cmd.id} className="rounded-xl border border-border bg-card hover:shadow-sm transition-shadow overflow-hidden">
                {/* 卡片头 */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate">{cmd.title}</h3>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex items-center gap-0.5 text-amber-500">
                          <Star className="h-3 w-3 fill-current" />
                          <span className="text-xs font-medium">{cmd.rating}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{cmd.usageCount.toLocaleString()} 次使用</span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 cursor-pointer"
                        onClick={() => handleFavorite(cmd.id)}
                      >
                        <Bookmark className={cn('h-4 w-4', favorites.has(cmd.id) ? 'fill-primary text-primary' : 'text-muted-foreground')} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 cursor-pointer"
                        onClick={() => handleCopy(cmd)}
                      >
                        {copiedId === cmd.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                    </div>
                  </div>

                  {/* 标签 */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {cmd.tags.map(t => (
                      <span key={t} className="px-2 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground">{t}</span>
                    ))}
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-[10px] text-primary">{cmd.category}</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-[10px] text-blue-600">{cmd.platform}</span>
                  </div>

                  {/* 展开/收起 */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : cmd.id)}
                    className="text-xs text-primary mt-2 cursor-pointer hover:underline"
                  >
                    {isExpanded ? '收起指令' : '展开指令'}
                  </button>
                </div>

                {/* 展开的指令内容 */}
                {isExpanded && (
                  <div className="border-t border-border px-4 py-3 bg-muted/30">
                    <pre className="text-xs leading-relaxed whitespace-pre-wrap font-sans text-foreground/80 max-h-64 overflow-auto">
                      {cmd.prompt}
                    </pre>
                    <div className="flex items-center justify-between mt-3">
                      {cmd.contributor && (
                        <span className="text-[10px] text-muted-foreground">
                          贡献者：{cmd.contributor}
                        </span>
                      )}
                      <div className="flex gap-2 ml-auto">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs cursor-pointer"
                          onClick={() => handleCopy(cmd)}
                        >
                          {copiedId === cmd.id ? <><Check className="h-3 w-3 mr-1" />已复制</> : <><Copy className="h-3 w-3 mr-1" />复制指令</>}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">没有找到匹配的指令</p>
            <p className="text-xs mt-1">试试调整筛选条件</p>
          </div>
        )}

        {/* 贡献入口 */}
        <div className="text-center pb-6">
          <p className="text-xs text-muted-foreground mb-2">
            有你常用的好指令？分享给社区，帮更多人提升 AI 使用效率
          </p>
          <Button variant="outline" size="sm" className="cursor-pointer text-xs">
            上传我的指令
          </Button>
        </div>
      </div>
    </div>
  )
}
