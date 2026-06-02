/**
 * AiAssistantWidget — 右下角悬浮 AI 助理
 * 参照 growthman.cn 设计：品牌渐变按钮组 + 弹出面板
 *
 * 功能：
 * - AI 助理：展开 AI 对话面板（FAQ 知识库匹配）
 * - 获取方案：跳转定价页
 * - 微信咨询：展开微信扫码 + 联系方式面板
 * - 回顶部：滚动到页面顶部
 */

'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUp, FileText, MessageSquare, QrCode } from 'lucide-react'
import { AiChatPanel } from './AiChatPanel'
import { AiContactPanel } from './AiContactPanel'
import s from './AiAssistantWidget.module.scss'

type PanelType = 'chat' | 'contact' | null

export function AiAssistantWidget() {
  const [activePanel, setActivePanel] = useState<PanelType>(null)
  const router = useRouter()

  const handleTogglePanel = useCallback((panel: PanelType) => {
    setActivePanel(prev => (prev === panel ? null : panel))
  }, [])

  const handleClosePanel = useCallback(() => {
    setActivePanel(null)
  }, [])

  const handleScrollTop = useCallback(() => {
    const mainContent = document.getElementById('main-content')
    if (mainContent) {
      mainContent.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [])

  return (
    <>
      {/* ── 遮罩层 ── */}
      {activePanel && (
        <div className={s.overlay} onClick={handleClosePanel} />
      )}

      {/* ── 弹出面板 ── */}
      {activePanel === 'chat' && (
        <div className={s.panel}>
          <AiChatPanel onClose={handleClosePanel} />
        </div>
      )}

      {activePanel === 'contact' && (
        <div className={s.panel}>
          <AiContactPanel onClose={handleClosePanel} />
        </div>
      )}

      {/* ── 悬浮按钮组（右下角）── */}
      <div className={s.widget}>
        {/* 主按钮 — AI 助理（品牌渐变 + 脉冲动画）*/}
        <button
          type="button"
          className={`${s.primaryBtn} ${activePanel !== 'chat' ? s.pulse : ''}`}
          style={{ background: 'var(--brand-gradient)' }}
          onClick={() => handleTogglePanel('chat')}
          title="AI 助理"
        >
          <MessageSquare size={24} />
          <span>AI 助理</span>
        </button>

        {/* 获取方案 */}
        <button
          type="button"
          className={s.actionBtn}
          style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
          onClick={() => router.push('/pricing')}
          title="获取方案"
        >
          <FileText size={20} />
          <span>获取方案</span>
        </button>

        {/* 微信咨询 */}
        <button
          type="button"
          className={s.actionBtn}
          style={{ background: 'linear-gradient(135deg, #07C160, #06AD56)' }}
          onClick={() => handleTogglePanel('contact')}
          title="微信咨询"
        >
          <QrCode size={20} />
          <span>微信咨询</span>
        </button>

        {/* 回顶部 */}
        <button
          type="button"
          className={s.actionBtn}
          style={{
            background: '#6b7280',
            opacity: 0.7,
          }}
          onClick={handleScrollTop}
          title="回顶部"
        >
          <ArrowUp size={20} />
          <span>回顶部</span>
        </button>
      </div>
    </>
  )
}
