/**
 * HeroSection - AiBrand 首页 Hero 区块
 * "AI 全域运营，一人顶一个团队"
 */

'use client'

import { ArrowRight, Sparkles, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useGetClientLng } from '@/hooks/useSystem'
import { useUserStore } from '@/store/user'

export function HeroSection() {
  const router = useRouter()
  const lng = useGetClientLng()
  const token = useUserStore(state => state.token)

  const handleCTA = () => {
    if (token) {
      router.push(`/${lng}/chat`)
    } else {
      router.push(`/${lng}/auth`)
    }
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-(--brand-gradient-subtle) to-white pt-20 pb-16 md:pt-28 md:pb-24">
      {/* 背景装饰 — 动态光晕 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-br from-(--brand-purple)/8 via-(--brand-cyan)/5 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute top-0 right-0 w-[400px] h-[300px] bg-gradient-to-bl from-(--brand-cyan)/6 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 text-center">
        {/* Badge — 品牌渐变背景 */}
        <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-white mb-6 shadow-(--brand-shadow-sm)" style={{ background: 'var(--brand-gradient)' }}>
          <Sparkles className="h-3.5 w-3.5" />
          AI 驱动 · 全域运营 · 私有化部署
        </div>

        {/* 主标题 */}
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
          AI 全域运营
          <br />
          <span className="bg-gradient-to-r from-(--brand-purple) to-(--brand-cyan) bg-clip-text text-transparent">
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
          <Button onClick={handleCTA} size="lg" className="cursor-pointer rounded-full px-8 text-base font-medium shadow-(--brand-shadow-md) hover:shadow-(--brand-shadow-lg) hover:-translate-y-0.5" style={{ background: 'var(--brand-gradient)' }}>
            免费开始
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="outline" size="lg" className="cursor-pointer rounded-full px-8 text-base border-(--brand-purple)/30 text-(--brand-purple) hover:bg-(--brand-gradient-glow) hover:border-(--brand-purple)/50"
            onClick={() => router.push(`/${lng}/pricing`)}>
            查看定价
          </Button>
        </div>

        {/* 信任标识 */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-(--brand-purple)/5 px-3 py-1">
            <Check className="h-3.5 w-3.5 text-(--brand-purple)" /> 14 天免费试用
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-(--brand-purple)/5 px-3 py-1">
            <Check className="h-3.5 w-3.5 text-(--brand-purple)" /> 无需信用卡
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-(--brand-purple)/5 px-3 py-1">
            <Check className="h-3.5 w-3.5 text-(--brand-purple)" /> 随时取消
          </span>
        </div>

        {/* 数字证明 */}
        <div className="mt-12 grid grid-cols-3 gap-8 rounded-2xl border border-(--brand-purple)/15 bg-card/80 p-6 shadow-(--brand-shadow-sm) backdrop-blur max-w-lg mx-auto">
          {[
            { value: '14+', label: '主流平台覆盖' },
            { value: '10x', label: '内容产出效率' },
            { value: '5min', label: '平均发布耗时' },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-bold bg-gradient-to-r from-(--brand-purple) to-(--brand-cyan) bg-clip-text text-transparent">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
