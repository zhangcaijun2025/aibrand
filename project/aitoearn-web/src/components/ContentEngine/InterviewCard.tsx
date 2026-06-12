/**
 * InterviewCard — 引导式采访对话卡片组件
 *
 * 嵌入 AI 对话流中，代替传统表单。支持三种模式：
 * - single_select: 单选卡片（默认）
 * - multi_select: 多选卡片
 * - text_input: 文本输入
 *
 * 对应后端 InterviewCard 接口 (from @yikart/common)
 */

'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Check, ChevronRight, ImageIcon, SkipForward } from 'lucide-react'

// ── Types ──

export interface InterviewCardOption {
  label: string
  value: string
  thumbnail?: string
  preselected?: boolean
  hint?: string
}

export type InterviewCardMode = 'single_select' | 'multi_select' | 'text_input'

export interface InterviewCardData {
  /** 卡片模式 */
  mode: InterviewCardMode
  /** 问题文本 */
  question: string
  /** 副标题/提示 */
  subtitle?: string
  /** 选项列表（选择模式） */
  options?: InterviewCardOption[]
  /** 输入占位符（文本模式） */
  placeholder?: string
  /** 输入示例（文本模式） */
  examples?: string[]
  /** 步骤进度指示 */
  stepIndicator?: string
  /** 是否允许跳过 */
  allowSkip?: boolean
  /** 目标字段 */
  targetField?: string
}

export interface InterviewCardProps {
  /** 卡片数据 */
  card: InterviewCardData
  /** 提交回答 */
  onAnswer: (value: string | string[]) => void
  /** 跳过 */
  onSkip?: () => void
  /** 是否正在处理中 */
  isLoading?: boolean
  /** 附加类名 */
  className?: string
}

// ── Animations ──

const cardVariants = {
  initial: { opacity: 0, y: 20, scale: 0.97 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 260, damping: 26 },
  },
  exit: { opacity: 0, y: -10, scale: 0.97, transition: { duration: 0.2 } },
}

const optionVariants = {
  initial: { opacity: 0, x: -10 },
  animate: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.05, duration: 0.25 },
  }),
}

// ── Component ──

export function InterviewCard({
  card,
  onAnswer,
  onSkip,
  isLoading = false,
  className,
}: InterviewCardProps) {
  const { mode, question, subtitle, options, placeholder, examples, stepIndicator, allowSkip } = card

  // Single select state
  const [selectedSingle, setSelectedSingle] = React.useState<string | null>(null)
  // Multi select state
  const [selectedMulti, setSelectedMulti] = React.useState<Set<string>>(new Set())
  // Text input state
  const [textValue, setTextValue] = React.useState('')

  // Pre-select options marked as preselected
  React.useEffect(() => {
    if (options) {
      const preselected = options.filter(o => o.preselected).map(o => o.value)
      if (preselected.length > 0) {
        if (mode === 'single_select') {
          setSelectedSingle(preselected[0])
        } else if (mode === 'multi_select') {
          setSelectedMulti(new Set(preselected))
        }
      }
    }
  }, [options, mode])

  const handleSingleSelect = (value: string) => {
    setSelectedSingle(value)
  }

  const handleMultiToggle = (value: string) => {
    setSelectedMulti(prev => {
      const next = new Set(prev)
      if (next.has(value)) {
        next.delete(value)
      } else {
        next.add(value)
      }
      return next
    })
  }

  const handleSubmit = () => {
    if (mode === 'single_select') {
      if (selectedSingle) onAnswer(selectedSingle)
    } else if (mode === 'multi_select') {
      if (selectedMulti.size > 0) onAnswer(Array.from(selectedMulti))
    } else {
      if (textValue.trim()) onAnswer(textValue.trim())
    }
  }

  const canSubmit = mode === 'single_select'
    ? selectedSingle !== null
    : mode === 'multi_select'
      ? selectedMulti.size > 0
      : textValue.trim().length > 0

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={card.stepIndicator ?? 'card'}
        variants={cardVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={cn('w-full max-w-lg', className)}
      >
        <Card className="border-2 border-primary/10 bg-gradient-to-b from-card to-primary/5 shadow-lg">
          {/* Header */}
          <CardHeader className="pb-3">
            {stepIndicator && (
              <div className="mb-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  {stepIndicator}
                </span>
              </div>
            )}
            <CardTitle className="text-lg leading-relaxed">{question}</CardTitle>
            {subtitle && (
              <CardDescription className="text-sm text-muted-foreground/80">
                {subtitle}
              </CardDescription>
            )}
          </CardHeader>

          {/* Content */}
          <CardContent className="space-y-2 pb-4">
            {/* Single Select */}
            {mode === 'single_select' && options && (
              <div className="grid gap-2">
                {options.map((option, i) => (
                  <motion.button
                    key={option.value}
                    custom={i}
                    variants={optionVariants}
                    initial="initial"
                    animate="animate"
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleSingleSelect(option.value)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all',
                      'hover:border-primary/40 hover:bg-primary/5',
                      'focus:outline-none focus:ring-2 focus:ring-primary/20',
                      'disabled:cursor-not-allowed disabled:opacity-50',
                      selectedSingle === option.value
                        ? 'border-primary bg-primary/10 ring-2 ring-primary/20 shadow-sm'
                        : 'border-border bg-card',
                    )}
                  >
                    {option.thumbnail && (
                      <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                        <img
                          src={option.thumbnail}
                          alt={option.label}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    {!option.thumbnail && (
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-muted">
                        <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{option.label}</div>
                      {option.hint && (
                        <div className="text-xs text-muted-foreground">{option.hint}</div>
                      )}
                    </div>
                    {selectedSingle === option.value && (
                      <Check className="h-4 w-4 flex-shrink-0 text-primary" />
                    )}
                  </motion.button>
                ))}
              </div>
            )}

            {/* Multi Select */}
            {mode === 'multi_select' && options && (
              <div className="grid gap-2">
                {options.map((option, i) => (
                  <motion.label
                    key={option.value}
                    custom={i}
                    variants={optionVariants}
                    initial="initial"
                    animate="animate"
                    className={cn(
                      'flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all',
                      'hover:border-primary/40 hover:bg-primary/5',
                      selectedMulti.has(option.value)
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/10'
                        : 'border-border bg-card',
                    )}
                  >
                    <Checkbox
                      checked={selectedMulti.has(option.value)}
                      onCheckedChange={() => handleMultiToggle(option.value)}
                      disabled={isLoading}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{option.label}</div>
                      {option.hint && (
                        <div className="text-xs text-muted-foreground">{option.hint}</div>
                      )}
                    </div>
                  </motion.label>
                ))}
              </div>
            )}

            {/* Text Input */}
            {mode === 'text_input' && (
              <div className="space-y-3">
                <Textarea
                  value={textValue}
                  onChange={e => setTextValue(e.target.value)}
                  placeholder={placeholder ?? '请输入...'}
                  disabled={isLoading}
                  className="min-h-[80px] resize-none"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSubmit()
                    }
                  }}
                />
                {examples && examples.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-xs text-muted-foreground">试试：</span>
                    {examples.map((example, i) => (
                      <button
                        key={i}
                        type="button"
                        disabled={isLoading}
                        onClick={() => setTextValue(example)}
                        className="rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs text-muted-foreground
                                   transition-colors hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>

          {/* Footer */}
          <CardFooter className="flex items-center justify-between pt-2">
            {allowSkip && onSkip ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSkip}
                disabled={isLoading}
                className="text-muted-foreground hover:text-foreground"
              >
                <SkipForward className="mr-1 h-3.5 w-3.5" />
                跳过
              </Button>
            ) : (
              <div />
            )}
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || isLoading}
              size="sm"
              className="gap-1.5"
            >
              {isLoading ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  处理中...
                </>
              ) : (
                <>
                  确认
                  <ChevronRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}

// ── Skeleton Loading State ──

export function InterviewCardSkeleton() {
  return (
    <div className="w-full max-w-lg">
      <Card className="border-2 border-primary/5">
        <CardHeader className="pb-3">
          <div className="mb-2 h-5 w-20 animate-pulse rounded-full bg-muted" />
          <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent className="space-y-2 pb-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
              <div className="h-10 w-10 animate-pulse rounded-md bg-muted" />
              <div className="flex-1">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </CardContent>
        <CardFooter className="flex justify-end pt-2">
          <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
        </CardFooter>
      </Card>
    </div>
  )
}

export default InterviewCard
