/**
 * CustomersCore - 智能客服中心总览
 * AI+真人融合双模式入口 + 服务数据看板
 */

'use client'

import { ArrowRight, BarChart3, Bot, Clock, Headphones, MessageSquare, QrCode, Shield, TrendingUp, Users } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function CustomersCore() {
  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="max-w-5xl mx-auto w-full px-4 md:px-6 py-6 space-y-6">

        {/* 标题 */}
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Headphones className="h-5 w-5 text-primary" />
            智能客服中心
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI + 真人融合，24 小时秒级响应。对内解答平台问题，对外帮您回复客户
          </p>
        </div>

        {/* 三模式入口 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 对内客服 */}
          <Link href="/customers/support" className="group block">
            <div className="rounded-xl border-2 border-border bg-card p-6 hover:border-primary/50 hover:shadow-md transition-all h-full">
              <div className="flex items-start justify-between mb-4">
                <div className="inline-flex p-3 rounded-xl bg-blue-500/10">
                  <Bot className="h-7 w-7 text-blue-500" />
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <h2 className="text-lg font-semibold mb-2">平台客服</h2>
              <p className="text-sm text-muted-foreground mb-4">
                AI Agent 1 秒响应，自动解答注册、付费、故障、教程等常见问题。70%+ 问题自动解决，复杂问题无缝转接人工。
              </p>
              <div className="flex flex-wrap gap-2">
                {['注册登录', '会员计费', '故障排查', '功能教程', '投诉建议'].map(t => (
                  <span key={t} className="px-2.5 py-1 rounded-full bg-blue-500/10 text-xs text-blue-700">{t}</span>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> 24h 在线</span>
                <span className="flex items-center gap-1"><Bot className="h-3 w-3" /> 1秒响应</span>
              </div>
            </div>
          </Link>

          {/* 对外客服 */}
          <Link href="/customers/replies" className="group block">
            <div className="rounded-xl border-2 border-border bg-card p-6 hover:border-green-500/50 hover:shadow-md transition-all h-full">
              <div className="flex items-start justify-between mb-4">
                <div className="inline-flex p-3 rounded-xl bg-green-500/10">
                  <MessageSquare className="h-7 w-7 text-green-500" />
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-green-500 group-hover:translate-x-1 transition-all" />
              </div>
              <h2 className="text-lg font-semibold mb-2">客户回复助手</h2>
              <p className="text-sm text-muted-foreground mb-4">
                AI 帮你管理跨平台评论和私信。基于你的品牌知识库自动生成专业回复，学习你的风格，越来越像你。
              </p>
              <div className="flex flex-wrap gap-2">
                {['跨平台聚合', 'AI智能回复', '品牌知识库', '风格学习', '情感分析'].map(t => (
                  <span key={t} className="px-2.5 py-1 rounded-full bg-green-500/10 text-xs text-green-700">{t}</span>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> 多平台统一</span>
                <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> 提升回复效率</span>
              </div>
            </div>
          </Link>

          {/* 企业微信接入 */}
          <Link href="/customers/wework" className="group block">
            <div className="rounded-xl border-2 border-border bg-card p-6 hover:border-(--brand-purple)/50 hover:shadow-md transition-all h-full">
              <div className="flex items-start justify-between mb-4">
                <div className="inline-flex p-3 rounded-xl bg-(--brand-gradient-glow)">
                  <QrCode className="h-7 w-7 text-(--brand-purple)" />
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-(--brand-purple) group-hover:translate-x-1 transition-all" />
              </div>
              <h2 className="text-lg font-semibold mb-2">企业微信接入</h2>
              <p className="text-sm text-muted-foreground mb-4">
                接入企业微信，AI 机器人自动回复 + 复杂问题无缝转接真人客服。扫码授权、关键词规则、情感检测智能转接。
              </p>
              <div className="flex flex-wrap gap-2">
                {['扫码接入', 'AI机器人', '关键词回复', '智能转人工', '情感检测'].map(t => (
                  <span key={t} className="px-2.5 py-1 rounded-full bg-(--brand-gradient-glow) text-xs text-(--brand-purple)">{t}</span>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Bot className="h-3 w-3" /> AI+真人混合</span>
                <span className="flex items-center gap-1"><QrCode className="h-3 w-3" /> 一键扫码</span>
              </div>
            </div>
          </Link>
        </div>

        {/* 服务数据看板 */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            服务数据概览
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'AI 响应速度', value: '< 1s', desc: '秒级响应', color: 'text-blue-500', bg: 'bg-blue-500/10' },
              { label: 'AI 解决率', value: '73%', desc: '自动闭环', color: 'text-green-500', bg: 'bg-green-500/10' },
              { label: '用户满意度', value: '4.6/5', desc: '好评率', color: 'text-amber-500', bg: 'bg-amber-500/10' },
              { label: '日均咨询', value: '186', desc: '持续增长', color: 'text-purple-500', bg: 'bg-purple-500/10' },
            ].map(stat => (
              <div key={stat.label} className="text-center p-4 rounded-xl border border-border/50">
                <div className={cn('inline-flex p-2 rounded-lg mb-2', stat.bg)}>
                  <span className={cn('text-lg font-bold', stat.color)}>{stat.value}</span>
                </div>
                <div className="text-sm font-medium">{stat.label}</div>
                <div className="text-xs text-muted-foreground">{stat.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 服务承诺 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: <Clock className="h-5 w-5" />, title: '24h 全天候', desc: '白班真人值守 + 夜班 AI 值班，全年无休' },
            { icon: <Shield className="h-5 w-5" />, title: '数据安全', desc: '会话加密存储，敏感信息自动拦截，合规可靠' },
            { icon: <TrendingUp className="h-5 w-5" />, title: '持续优化', desc: '每日更新知识库，每周优化话术，效果越来越好' },
          ].map(item => (
            <div key={item.title} className="flex items-start gap-3 p-4 rounded-xl bg-muted/30">
              <div className="inline-flex p-2 rounded-lg bg-background shrink-0 text-primary">
                {item.icon}
              </div>
              <div>
                <div className="text-sm font-medium">{item.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
