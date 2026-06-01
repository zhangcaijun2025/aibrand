/**
 * HeroSection - AiBrand 首页 Hero 区块
 * "AI 全域运营，一人顶一个团队"
 */

'use client'

import { ArrowRight, Sparkles, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useUserStore } from '@/store/user'

export function HeroSection() {
  const router = useRouter()
  const token = useUserStore(state => state.token)

  const handleCTA = () => {
    if (token) {
      router.push('/zh-CN/draft-box' in window?.location?.pathname ? '/' : '/zh-CN/chat')
    } else {
      router.push('/zh-CN/auth')
    }
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-blue-50/30 to-white pt-20 pb-16 md:pt-28 md:pb-24">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-medium text-blue-700 mb-6">
          <Sparkles className="h-3.5 w-3.5" />
          AI 驱动 · 全域运营 · 私有化部署
        </div>

        {/* 主标题 */}
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
          AI 全域运营
          <br />
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            一人顶一个团队
          </span>
        </h1>

        {/* 副标题 */}
        <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg leading-relaxed">
          AI 批量创作 + 多平台一键发布 + 智能客户互动管理。
          覆盖 14 个主流社交平台，让一个人运营出团队的效果。
        </p>

        {/* CTA 按钮 */}
        <div className="mt-8 flex items-center justify-center gap-4">
          <Button onClick={handleCTA} size="lg" className="cursor-pointer rounded-full px-8 text-base">
            免费开始
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="outline" size="lg" className="cursor-pointer rounded-full px-8 text-base"
            onClick={() => router.push('/zh-CN/pricing')}>
            查看定价
          </Button>
        </div>

        {/* 信任标识 */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-green-500" /> 14 天免费试用
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-green-500" /> 无需信用卡
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-green-500" /> 随时取消
          </span>
        </div>

        {/* 数字证明 */}
        <div className="mt-12 grid grid-cols-3 gap-8 rounded-2xl border border-border bg-card/50 p-6 backdrop-blur max-w-lg mx-auto">
          {[
            { value: '14+', label: '主流平台覆盖' },
            { value: '10x', label: '内容产出效率' },
            { value: '5min', label: '平均发布耗时' },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-bold text-primary">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
