/**
 * SupportCore - 对内客服主组件
 * AI Agent 对话 + FAQ 知识库 + 工单提交
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Search, HelpCircle, FileText, ArrowRight, Sparkles, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FAQ_DATABASE } from '@/lib/knowledge/customer-service-data'

interface Message {
  role: 'user' | 'agent' | 'human'
  text: string
  time: Date
}

const WELCOME_MSG = 'Hi！我是 AiBrand 的 AI 助手小 A 👋 关于平台的任何问题都可以问我。你可以直接描述遇到的问题，或者从下方快捷菜单选择～'

const QUICK_ACTIONS = [
  { label: '如何注册？', query: '如何注册' },
  { label: '免费版和会员版区别', query: '免费版和会员版区别' },
  { label: '发布失败怎么办', query: '发布失败怎么办' },
  { label: '怎么升级会员', query: '如何升级会员' },
]

export default function SupportCore() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'agent', text: WELCOME_MSG, time: new Date() },
  ])
  const [input, setInput] = useState('')
  const [searchFAQ, setSearchFAQ] = useState('')
  const [showFAQ, setShowFAQ] = useState(true)
  const [isTyping, setIsTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const modules = [...new Set(FAQ_DATABASE.map(f => f.module))]

  const filteredFAQ = searchFAQ
    ? FAQ_DATABASE.filter(f =>
        f.question.includes(searchFAQ) || f.keywords.some(k => k.includes(searchFAQ)))
    : FAQ_DATABASE

  const handleSend = (text?: string) => {
    const msg = text || input.trim()
    if (!msg) return

    const userMsg: Message = { role: 'user', text: msg, time: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    // 搜索 FAQ 匹配
    setTimeout(() => {
      const match = FAQ_DATABASE.find(f =>
        f.keywords.some(k => msg.includes(k)) || f.question.includes(msg.slice(0, 6)),
      )

      const reply: Message = {
        role: 'agent',
        text: match
          ? `${match.answer}${match.relatedLinks ? `\n\n📎 相关页面：${match.relatedLinks.join(' · ')}` : ''}\n\n还有其他问题吗？我随时为你解答～`
          : `好的，我理解你的问题了。"${msg.slice(0, 30)}..."——这个问题比较特殊，我帮你转接人工客服处理。请稍等片刻，客服专员会马上接入。\n\n在此期间，你可以查看"帮助中心"获取更多信息。`,
        time: new Date(),
      }
      setMessages(prev => [...prev, reply])
      setIsTyping(false)
    }, 800)
  }

  return (
    <div className="flex flex-col h-full">
      {/* 顶部 */}
      <div className="border-b border-border bg-background px-4 md:px-6 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex p-2 rounded-lg bg-blue-500/10">
              <Bot className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h1 className="text-sm font-semibold">AI 智能客服</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> 在线 · 1 秒响应
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-xs cursor-pointer" onClick={() => setShowFAQ(!showFAQ)}>
              <HelpCircle className="h-4 w-4 mr-1" /> {showFAQ ? '收起FAQ' : '展开FAQ'}
            </Button>
            <Button variant="outline" size="sm" className="text-xs cursor-pointer gap-1">
              <Phone className="h-3 w-3" /> 转人工
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* FAQ 侧边栏 */}
        {showFAQ && (
          <div className="hidden md:block w-72 border-r border-border bg-card overflow-auto shrink-0">
            <div className="p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="搜索常见问题..."
                  value={searchFAQ}
                  onChange={e => setSearchFAQ(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-xs outline-none focus:border-primary/60"
                />
              </div>

              <div className="space-y-4">
                {modules.map(mod => {
                  const items = filteredFAQ.filter(f => f.module === mod)
                  if (items.length === 0) return null
                  return (
                    <div key={mod}>
                      <div className="text-xs font-medium text-muted-foreground mb-2">{mod}</div>
                      <div className="space-y-1">
                        {items.map(faq => (
                          <button
                            key={faq.id}
                            onClick={() => handleSend(faq.question)}
                            className="w-full text-left text-xs p-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer leading-relaxed"
                          >
                            {faq.question}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* 对话区域 */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-auto px-4 py-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : '')}>
                {msg.role !== 'user' && (
                  <div className={cn(
                    'inline-flex p-1.5 rounded-lg shrink-0 mt-0.5',
                    msg.role === 'agent' ? 'bg-blue-500/10' : 'bg-amber-500/10',
                  )}>
                    {msg.role === 'agent' ? <Bot className="h-4 w-4 text-blue-500" /> : <User className="h-4 w-4 text-amber-500" />}
                  </div>
                )}
                <div className={cn(
                  'max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 border border-border',
                )}>
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                  <div className={cn('text-[10px] mt-1', msg.role === 'user' ? 'text-primary-foreground/60' : 'text-muted-foreground')}>
                    {msg.time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {msg.role === 'user' && (
                  <div className="inline-flex p-1.5 rounded-lg bg-primary/10 shrink-0 mt-0.5">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-3">
                <div className="inline-flex p-1.5 rounded-lg bg-blue-500/10 shrink-0">
                  <Bot className="h-4 w-4 text-blue-500" />
                </div>
                <div className="bg-muted/50 border border-border rounded-xl px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/30 animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/30 animate-bounce" style={{ animationDelay: '0.15s' }} />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/30 animate-bounce" style={{ animationDelay: '0.3s' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* 快捷操作 + 输入 */}
          <div className="border-t border-border px-4 py-4 bg-background">
            {messages.length <= 1 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {QUICK_ACTIONS.map(a => (
                  <button
                    key={a.label}
                    onClick={() => handleSend(a.query)}
                    className="px-3 py-1.5 rounded-full border border-border bg-card text-xs cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all flex items-center gap-1"
                  >
                    <Sparkles className="h-3 w-3 text-primary" />
                    {a.label}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="描述你的问题..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary/60"
              />
              <Button
                onClick={() => handleSend()}
                disabled={!input.trim()}
                className="cursor-pointer shrink-0 rounded-xl"
                size="sm"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
