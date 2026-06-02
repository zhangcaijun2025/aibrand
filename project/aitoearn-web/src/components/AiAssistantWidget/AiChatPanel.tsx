/**
 * AiChatPanel — AI 对话面板（内嵌版）
 * 复用 FAQ 知识库匹配逻辑，紧凑的卡片式对话
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Sparkles, X } from 'lucide-react'
import { FAQ_DATABASE } from '@/lib/knowledge/customer-service-data'
import s from './AiAssistantWidget.module.scss'

interface Message {
  role: 'user' | 'agent'
  text: string
}

const WELCOME_MSG = 'Hi！我是 AiBrand AI 助手 🤖 关于平台的任何问题都可以问我～'

const QUICK_ACTIONS = [
  '如何注册？',
  '免费版和会员版区别',
  '发布失败怎么办',
  '怎么升级会员',
]

interface AiChatPanelProps {
  onClose: () => void
}

export function AiChatPanel({ onClose }: AiChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'agent', text: WELCOME_MSG },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (text?: string) => {
    const msg = text || input.trim()
    if (!msg) return

    setMessages(prev => [...prev, { role: 'user', text: msg }])
    setInput('')
    setIsTyping(true)

    setTimeout(() => {
      const match = FAQ_DATABASE.find(f =>
        f.keywords.some(k => msg.includes(k)) || f.question.includes(msg.slice(0, 6)),
      )

      const reply = match
        ? `${match.answer}\n\n还有其他问题吗？我随时为你解答～`
        : `好的，我理解你的问题了。"${msg.slice(0, 30)}..."——这个问题比较特殊，建议扫码添加企业微信，客服专员会为你详细解答。`

      setMessages(prev => [...prev, { role: 'agent', text: reply }])
      setIsTyping(false)
    }, 800)
  }

  return (
    <>
      {/* 面板头部 */}
      <div className={s.panelHeader}>
        <div className={s.panelHeaderLeft}>
          <div className={s.panelAvatar} style={{ background: 'var(--brand-gradient)' }}>
            <Bot size={20} />
          </div>
          <div>
            <div className={s.panelTitle}>AI 智能助理</div>
            <div className={s.panelStatus}>在线 · 秒级响应</div>
          </div>
        </div>
        <button className={s.closeBtn} onClick={onClose} type="button">
          <X size={16} />
        </button>
      </div>

      {/* 对话区域 */}
      <div className={s.panelBody}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 mb-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'agent' && (
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'var(--brand-gradient)' }}>
                <Bot size={14} className="text-white" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'text-white'
                  : 'bg-gray-50 border border-gray-100 text-gray-700'
              }`}
              style={msg.role === 'user' ? { background: 'var(--brand-gradient)' } : undefined}
            >
              <div className="whitespace-pre-wrap">{msg.text}</div>
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                <User size={14} className="text-gray-500" />
              </div>
            )}
          </div>
        ))}

        {/* 打字动画 */}
        {isTyping && (
          <div className="flex gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--brand-gradient)' }}>
              <Bot size={14} className="text-white" />
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0.15s' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 快捷操作（首次） */}
      {messages.length <= 1 && (
        <div className="px-4 pb-1">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_ACTIONS.map(a => (
              <button
                key={a}
                onClick={() => handleSend(a)}
                className="px-2.5 py-1 rounded-full border border-gray-200 bg-white text-[11px] cursor-pointer hover:border-purple-300 hover:bg-purple-50 transition-all flex items-center gap-1"
              >
                <Sparkles size={11} className="text-purple-500" />
                {a}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 输入区 */}
      <div className={s.panelFooter}>
        <input
          type="text"
          placeholder="输入你的问题..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          className={s.panelInput}
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim()}
          className={s.panelSendBtn}
          style={{ background: input.trim() ? 'var(--brand-gradient)' : '#e8e8e8' }}
          type="button"
        >
          <Send size={16} />
        </button>
      </div>
    </>
  )
}
