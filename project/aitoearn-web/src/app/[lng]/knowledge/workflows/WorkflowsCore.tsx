/**
 * WorkflowsCore - 工作流模板库主组件
 * 预设自动化工作流，一键查看详情
 */

'use client'

import { useState } from 'react'
import { Zap, Clock, ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { WORKFLOW_TEMPLATES } from '@/lib/knowledge/seed-data'

const DIFFICULTY_COLORS: Record<string, string> = {
  '简单': 'bg-green-500/10 text-green-700',
  '中等': 'bg-amber-500/10 text-amber-700',
  '高级': 'bg-red-500/10 text-red-700',
}

export default function WorkflowsCore() {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter, setFilter] = useState('全部')

  const categories = ['全部', ...new Set(WORKFLOW_TEMPLATES.map(w => w.category))]
  const filtered = filter === '全部' ? WORKFLOW_TEMPLATES : WORKFLOW_TEMPLATES.filter(w => w.category === filter)

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="max-w-4xl mx-auto w-full px-4 md:px-6 py-6 space-y-6">

        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            工作流模板
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            预设自动化流水线，一键查看详情，把重复劳动交给 AI
          </p>
        </div>

        {/* 分类筛选 */}
        <div className="flex gap-2 flex-wrap">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs cursor-pointer transition-all',
                filter === c ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70 text-muted-foreground',
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {filtered.map(wf => {
            const isExpanded = expandedId === wf.id
            return (
              <div key={wf.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : wf.id)}
                  className="w-full p-5 text-left hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="text-3xl shrink-0">{wf.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm">{wf.title}</h3>
                        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium', DIFFICULTY_COLORS[wf.difficulty])}>
                          {wf.difficulty}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{wf.description}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="h-3 w-3" /> {wf.estimatedTime}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{wf.steps.length} 个步骤</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0 mt-1">{wf.trigger}</span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border p-5 space-y-4 bg-muted/20 animate-in fade-in duration-300">
                    {/* 触发条件 */}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-xs font-medium text-muted-foreground">触发条件：</span>
                      <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-xs text-blue-700">{wf.trigger}</span>
                    </div>

                    {/* 步骤流程图 */}
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-3">执行步骤</div>
                      <div className="space-y-0">
                        {wf.steps.map((step, i) => (
                          <div key={i} className="relative flex items-start gap-3 pb-4">
                            {/* 连线 */}
                            {i < wf.steps.length - 1 && (
                              <div className="absolute left-[14px] top-7 bottom-0 w-px bg-border" />
                            )}
                            {/* 步骤号 */}
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0 mt-0.5">
                              {i + 1}
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                              <div className="text-sm font-medium">{step.name}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">{step.description}</div>
                            </div>
                            {i < wf.steps.length - 1 && (
                              <ArrowRight className="h-3 w-3 text-muted-foreground/30 mt-2 shrink-0 hidden sm:block" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 结构总结 */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border">
                      <span>⏱️ {wf.estimatedTime}</span>
                      <span>📊 共 {wf.steps.length} 个自动化步骤</span>
                      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium', DIFFICULTY_COLORS[wf.difficulty])}>
                        难度：{wf.difficulty}
                      </span>
                    </div>

                    <Button size="sm" className="cursor-pointer text-xs">
                      <Check className="h-3 w-3 mr-1" /> 一键启用此工作流
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
