/**
 * VideoCreateModal — AI 视频制作弹窗
 *
 * 集成 OpenMontage Bridge API，在内容管理板块中提供一键视频制作入口。
 * 选择流水线 → 填写脚本 → 提交异步任务 → 轮询状态
 */
'use client'

import {
  CheckCircle2,
  Film,
  Loader2,
  X,
} from 'lucide-react'
import { memo, useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

// ==================== Types ====================

interface VideoCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (taskId: string) => void
}

interface VideoTask {
  id: string
  pipeline: string
  status: string
  progress: number
  result?: { playbook?: { shots?: any[]; estimated_cost_usd?: number }; output?: { resolution?: string; duration?: number } }
  error?: string
}

// ==================== Pipeline Options ====================

const PIPELINES = [
  { value: 'animated-explainer', label: '动画解说 — 教学/科普/产品介绍' },
  { value: 'talking-head', label: '真人出镜 — Vlog/口播/观点分享' },
  { value: 'clip-factory', label: '长视频拆短视频 — 批量社媒片段' },
  { value: 'cinematic', label: '电影品牌短片 — 宣传片/预告片' },
  { value: 'documentary-montage', label: '纪录片风格 — 档案素材剪辑' },
  { value: 'avatar-spokesperson', label: '虚拟主播 — AI角色出镜播报' },
  { value: 'screen-demo', label: '屏幕录制 — 软件教程/Demo' },
  { value: 'podcast-repurpose', label: '播客转视频 — 音频视觉化' },
]

const STYLES = [
  { value: 'modern', label: '现代简约' },
  { value: 'tech', label: '科技感' },
  { value: 'cinematic', label: '电影感' },
  { value: 'warm', label: '温馨生活' },
  { value: 'bold', label: '年轻潮流' },
]

const PLATFORMS = [
  { value: 'xiaohongshu', label: '小红书' },
  { value: 'douyin', label: '抖音' },
  { value: 'bilibili', label: 'B站' },
  { value: 'weibo', label: '微博' },
]

// ==================== Component ====================

const VideoCreateModal = memo(({ open, onOpenChange, onCreated }: VideoCreateModalProps) => {
  const [pipeline, setPipeline] = useState('animated-explainer')
  const [title, setTitle] = useState('')
  const [script, setScript] = useState('')
  const [style, setStyle] = useState('modern')
  const [duration, setDuration] = useState(60)
  const [platform, setPlatform] = useState('xiaohongshu')

  // Task state
  const [submitting, setSubmitting] = useState(false)
  const [task, setTask] = useState<VideoTask | null>(null)

  const handleSubmit = useCallback(async () => {
    setSubmitting(true)
    setTask(null)
    try {
      const res = await fetch('/api/openmontage/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pipeline,
          title: title || 'AI 生成视频',
          script: script || '',
          style,
          duration_seconds: duration,
          platform,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: VideoTask = await res.json()
      setTask(data)

      // Poll until done
      const poll = setInterval(async () => {
        try {
          const r = await fetch(`/api/openmontage/tasks/${data.id}`)
          const d: VideoTask = await r.json()
          setTask(d)
          if (d.status === 'completed' || d.status === 'failed') {
            clearInterval(poll)
            setSubmitting(false)
            if (d.status === 'completed') onCreated?.(d.id)
          }
        } catch {
          clearInterval(poll)
          setSubmitting(false)
        }
      }, 1000)
    } catch {
      setSubmitting(false)
    }
  }, [pipeline, title, script, style, duration, platform, onCreated])

  const handleClose = () => {
    if (!submitting) {
      setTask(null)
      onOpenChange(false)
    }
  }

  const isRunning = task && task.status !== 'completed' && task.status !== 'failed'
  const isDone = task?.status === 'completed'
  const isFailed = task?.status === 'failed'

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film size={20} className="text-pink-500" />
            AI 视频制作
          </DialogTitle>
          <DialogDescription>
            OpenMontage 智能制片 · 选择流水线，AI 自动编排制作
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Pipeline */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">制作流水线</label>
            <select
              value={pipeline}
              onChange={e => setPipeline(e.target.value)}
              disabled={submitting || !!isRunning}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {PIPELINES.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">视频主题</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="一句话描述视频主题..."
              disabled={submitting || !!isRunning}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Script */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">脚本/文案（可选）</label>
            <textarea
              value={script}
              onChange={e => setScript(e.target.value)}
              placeholder="输入详细脚本或核心要点，留空则 AI 自动生成..."
              rows={4}
              disabled={submitting || !!isRunning}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-vertical"
            />
          </div>

          {/* Config Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">风格</label>
              <select
                value={style}
                onChange={e => setStyle(e.target.value)}
                disabled={submitting || !!isRunning}
                className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-xs"
              >
                {STYLES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">时长</label>
              <select
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                disabled={submitting || !!isRunning}
                className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-xs"
              >
                {[15, 30, 45, 60, 90, 120, 180].map(d => (
                  <option key={d} value={d}>{d}秒</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">平台</label>
              <select
                value={platform}
                onChange={e => setPlatform(e.target.value)}
                disabled={submitting || !!isRunning}
                className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-xs"
              >
                {PLATFORMS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Task Status */}
          {task && (
            <div className={cn(
              'p-4 rounded-xl border',
              isDone ? 'border-green-500/20 bg-green-500/5' :
              isFailed ? 'border-red-500/20 bg-red-500/5' :
              'border-primary/20 bg-primary/5',
            )}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">
                  {isDone ? '制作完成' : isFailed ? '制作失败' : '制作中...'}
                </span>
                <Badge variant="outline" className="text-[10px]">{task.id}</Badge>
              </div>
              {isRunning && (
                <div className="space-y-1">
                  <div className="h-2 rounded-full bg-primary/10 overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-500"
                         style={{ width: `${task.progress}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground text-right">{task.progress}%</p>
                </div>
              )}
              {isDone && task.result && (
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="flex items-center gap-1"><CheckCircle2 size={12} className="text-green-500" />
                    镜头 {task.result.playbook?.shots?.length || 0} 个 · 成本 ${task.result.playbook?.estimated_cost_usd || 0}
                  </p>
                  <p>{task.result.output?.resolution} @ {task.result.output?.duration}s</p>
                </div>
              )}
              {isFailed && (
                <p className="text-xs text-red-500">{task.error || '未知错误'}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={handleClose} disabled={!!isRunning}>
            取消
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={submitting || !!isRunning}
            className="gap-2"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Film size={14} />}
            {submitting ? '提交中...' : isDone ? '重新制作' : '开始制作'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
})

VideoCreateModal.displayName = 'VideoCreateModal'

export { VideoCreateModal }
