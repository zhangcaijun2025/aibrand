/**
 * /ai — AI-Native 主入口 (WeChat 风格底部 4 Tab)
 */

import type { Metadata } from 'next'
import { AiTabPageClient } from './page.client'

export const metadata: Metadata = {
  title: 'AiBrand — 你的 AI 运营伙伴',
  description: 'AI 全域运营伙伴，主动问候、智能分析、持续守护',
  keywords: 'AI运营,Agent,智能助手,内容创作,竞品分析,AiBrand',
}

export default function AiPage() {
  return <AiTabPageClient />
}
