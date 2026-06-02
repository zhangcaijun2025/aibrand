/**
 * AiAssistantWidgetWrapper — 条件渲染悬浮 AI 助理
 * 在 welcome 和 auth 页面不显示，其他页面均显示
 */

'use client'

import { usePathname } from 'next/navigation'
import { AiAssistantWidget } from './index'

const HIDDEN_PATTERNS = ['/welcome', '/auth']

export function AiAssistantWidgetWrapper() {
  const pathname = usePathname()

  // 在 welcome 和 auth 页不显示
  if (HIDDEN_PATTERNS.some(p => pathname.includes(p))) {
    return null
  }

  return <AiAssistantWidget />
}
