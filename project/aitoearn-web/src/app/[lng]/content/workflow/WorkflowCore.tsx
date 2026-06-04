'use client'

/**
 * WorkflowCore — 6 步内容工作流主界面
 */

import { useState, useCallback } from 'react'
import { Send, Sparkles, CheckCircle2, Circle, AlertCircle, XCircle, Loader2, RefreshCw, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkflowStore } from '@/store/workflow'

const PLATFORM_OPTIONS = [
  { id: 'xhs', label: '小红书', color: '#FF2442' },
  { id: 'douyin', label: '抖音', color: '#000' },
  { id: 'bilibili', label: 'B站', color: '#FB7299' },
  { id: 'gzh', label: '公众号', color: '#07C160' },
  { id: 'weibo', label: '微博', color: '#E6162D' },
  { id: 'zhihu', label: '知乎', color: '#0084FF' },
]

const STEP_LABELS: Record<string, string> = {
  intent_analysis: '意图分析',
  strategy_research: '策略研究',
  topic_generator: '选题生成',
  content_generation: '内容生成',
  quality_check: '质量检测',
  publish_strategy: '发布策略',
}

export function WorkflowCore() {
  const {
    status, steps, error, currentStep, topics, selectedTopicIds,
    execute, onTopicSelect, onTopicConfirm, cancel, reset,
  } = useWorkflowStore()

  const [query, setQuery] = useState('')
  const [platforms, setPlatforms] = useState<string[]>(['xhs'])
  const [industry, setIndustry] = useState('')
  const [contentType, setContentType] = useState<'video' | 'image_text' | 'all'>('all')

  const togglePlatform = useCallback((id: string) => {
    setPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id],
    )
  }, [])

  const handleExecute = useCallback(() => {
    if (!query.trim()) return
    execute({ query: query.trim(), platforms, industry: industry || undefined, contentType })
  }, [query, platforms, industry, contentType, execute])

  const statusIcon = (stepStatus: string) => {
    switch (stepStatus) {
      case 'completed': return <CheckCircle2 className="w-5 h-5 text-green-500" />
      case 'running': return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
      case 'failed': return <XCircle className="w-5 h-5 text-red-500" />
      case 'skipped': return <Circle className="w-5 h-5 text-gray-300" />
      default: return <Circle className="w-5 h-5 text-gray-300" />
    }
  }

  const isIdle = status === 'idle'
  const isRunning = status === 'running'
  const isWaitingConfirm = status === 'waiting_confirm'
  const isTerminal = ['completed', 'failed', 'cancelled'].includes(status)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Sparkles className="w-6 h-6 text-purple-500" />
          AI 智能内容工厂
        </h1>
        <p className="text-sm text-muted-foreground">
          从选题到发布，AI 全链路自动化内容创作
        </p>
      </div>

      {/* Input Panel */}
      {isIdle && (
        <div className="border rounded-xl p-6 space-y-4 bg-card">
          {/* Query */}
          <div>
            <label className="text-sm font-medium mb-2 block">你想做什么内容？</label>
            <textarea
              className="w-full border rounded-lg p-3 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="例如：帮我做 3 条科技类小红书内容，目标用户是 25-35 岁的产品经理..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>

          {/* Industry */}
          <div>
            <label className="text-sm font-medium mb-2 block">行业/领域（可选）</label>
            <input
              className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="如：科技、美妆、教育"
              value={industry}
              onChange={e => setIndustry(e.target.value)}
            />
          </div>

          {/* Platforms */}
          <div>
            <label className="text-sm font-medium mb-2 block">目标平台</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_OPTIONS.map(p => (
                <button
                  key={p.id}
                  onClick={() => togglePlatform(p.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                    platforms.includes(p.id)
                      ? 'border-transparent text-white'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300',
                  )}
                  style={platforms.includes(p.id) ? { backgroundColor: p.color } : {}}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content Type */}
          <div>
            <label className="text-sm font-medium mb-2 block">内容类型</label>
            <div className="flex gap-2">
              {[
                { id: 'all', label: '全部' },
                { id: 'video', label: '视频' },
                { id: 'image_text', label: '图文' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setContentType(t.id as any)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                    contentType === t.id
                      ? 'bg-purple-100 border-purple-300 text-purple-700'
                      : 'border-gray-200 text-gray-600',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Execute Button */}
          <button
            onClick={handleExecute}
            disabled={!query.trim() || platforms.length === 0}
            className="w-full py-3 rounded-lg font-medium text-white bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            开始创作
          </button>
        </div>
      )}

      {/* Progress Panel */}
      {!isIdle && (
        <div className="border rounded-xl p-6 space-y-4 bg-card">
          {/* Steps Progress */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              {isRunning && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
              {isWaitingConfirm && <AlertCircle className="w-4 h-4 text-amber-500" />}
              {status === 'completed' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
              {status === 'failed' && <XCircle className="w-4 h-4 text-red-500" />}
              {isWaitingConfirm ? '请确认选题方向' : isTerminal ? '工作流已结束' : 'AI 工作中...'}
            </h3>

            <div className="space-y-2">
              {steps.map((step, i) => (
                <div
                  key={step.name}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                    step.status === 'running' && 'border-blue-200 bg-blue-50',
                    step.status === 'completed' && 'border-green-200 bg-green-50',
                    step.status === 'failed' && 'border-red-200 bg-red-50',
                    step.status === 'pending' && 'border-gray-100 bg-gray-50',
                  )}
                >
                  <span className="text-xs font-mono text-gray-400 w-6">{i + 1}</span>
                  {statusIcon(step.status)}
                  <span className={cn('text-sm flex-1', step.status === 'failed' && 'text-red-600')}>
                    {STEP_LABELS[step.name] || step.name}
                  </span>
                  {step.summary && (
                    <span className="text-xs text-gray-500 truncate max-w-[200px]">
                      {step.summary}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Topic Selection (Step 3 waiting) */}
          {isWaitingConfirm && topics.length > 0 && (
            <div className="space-y-3 border-t pt-4">
              <h4 className="text-sm font-semibold">选择你感兴趣的选题方向</h4>
              {topics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => onTopicSelect(topic.id)}
                  className={cn(
                    'w-full text-left p-3 rounded-lg border transition-colors',
                    selectedTopicIds.includes(topic.id)
                      ? 'border-purple-300 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300',
                  )}
                >
                  <div className="font-medium text-sm">{topic.title}</div>
                  <div className="text-xs text-gray-500 mt-1">{topic.angle}</div>
                </button>
              ))}
              <button
                onClick={onTopicConfirm}
                disabled={selectedTopicIds.length === 0}
                className="w-full py-2 rounded-lg text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认选题 ({selectedTopicIds.length} 个) → 继续生成
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Actions */}
          {!isTerminal && (
            <div className="flex gap-2 pt-2">
              <button
                onClick={cancel}
                className="flex-1 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1"
              >
                <X className="w-4 h-4" />
                取消
              </button>
            </div>
          )}
          {isTerminal && (
            <button
              onClick={reset}
              className="w-full py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1"
            >
              <RefreshCw className="w-4 h-4" />
              重新开始
            </button>
          )}
        </div>
      )}
    </div>
  )
}
