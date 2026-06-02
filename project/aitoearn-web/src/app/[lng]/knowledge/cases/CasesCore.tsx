/**
 * CasesCore - 案例拆解室主组件
 * 展示"思考过程+指令迭代+效果数据"的完整案例
 */

'use client'

import { useState } from 'react'
import { ArrowRight, Copy, Check, Lightbulb, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'
import { CASE_STUDIES } from '@/lib/knowledge/seed-data'

export default function CasesCore() {
  const [expandedId, setExpandedId] = useState<string | null>(CASE_STUDIES[0]?.id || null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    toast.success('指令已复制')
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="max-w-4xl mx-auto w-full px-4 md:px-6 py-6 space-y-6">

        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            案例拆解室
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            不只是展示结果，更是完整的"需求→思考→迭代→成果"链路复盘
          </p>
        </div>

        <div className="space-y-6">
          {CASE_STUDIES.map(kase => {
            const isExpanded = expandedId === kase.id
            return (
              <div key={kase.id} className="rounded-xl border border-border bg-card overflow-hidden">
                {/* 案列摘要 */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : kase.id)}
                  className="w-full p-5 text-left hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-[10px] text-amber-700 font-medium">
                          {kase.industry}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-[10px] text-blue-700">
                          {kase.scenario}
                        </span>
                      </div>
                      <h3 className="font-semibold text-sm">{kase.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{kase.originalNeed}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-lg font-bold text-primary">
                        {kase.results.find(r => r.metric === 'ROI')?.value || kase.results[0]?.value}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {kase.results.find(r => r.metric === 'ROI')?.metric || kase.results[0]?.metric}
                      </div>
                    </div>
                  </div>
                </button>

                {/* 展开详情 */}
                {isExpanded && (
                  <div className="border-t border-border p-5 space-y-5 bg-muted/20 animate-in fade-in duration-300">

                    {/* 原始需求 */}
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">📋 原始需求</div>
                      <p className="text-sm">{kase.originalNeed}</p>
                    </div>

                    {/* 协作过程 */}
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-3">🧠 AI 协作过程（核心看点）</div>
                      <div className="space-y-3">
                        {kase.collaborationRounds.map((round, i) => (
                          <div key={i} className="relative pl-8">
                            {/* 时间线 */}
                            <div className="absolute left-3 top-5 bottom-0 w-px bg-border" />
                            <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                              {round.round}
                            </div>
                            <div className="text-xs font-medium mb-0.5">第 {round.round} 轮</div>
                            <div className="text-xs text-muted-foreground space-y-1">
                              <p>👤 <span className="font-medium text-foreground/70">做了什么：</span>{round.action}</p>
                              <p>💡 <span className="font-medium text-foreground/70">结果：</span>{round.result}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 最终指令 */}
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium">📝 最终指令（可直接复用）</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs cursor-pointer"
                          onClick={() => handleCopy(kase.id, kase.finalPrompt)}
                        >
                          {copiedId === kase.id ? <><Check className="h-3 w-3 mr-1" />已复制</> : <><Copy className="h-3 w-3 mr-1" />复制</>}
                        </Button>
                      </div>
                      <pre className="text-xs whitespace-pre-wrap font-sans text-foreground/80">
                        {kase.finalPrompt}
                      </pre>
                    </div>

                    {/* 效果数据 */}
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> 效果数据
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        {kase.results.map(r => (
                          <div key={r.metric} className="text-center p-3 rounded-lg bg-background border border-border/50">
                            <div className="text-lg font-bold text-primary">{r.value}</div>
                            <div className="text-[10px] text-muted-foreground">{r.metric}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 核心经验 */}
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-2">💡 核心经验（值得记住）</div>
                      <div className="space-y-1.5">
                        {kase.keyLessons.map((lesson, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <ArrowRight className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                            <span className="text-foreground/80">{lesson}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {kase.contributor && (
                      <div className="text-[10px] text-muted-foreground text-right">
                        贡献者：{kase.contributor}
                      </div>
                    )}
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
