/**
 * 订阅中心 - 灵活的AI积分与订阅计划
 * 完整还原 AiBrand.cn 定价方案页面
 */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Coins, ChevronDown, ChevronUp, Check, HelpCircle, Wallet, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/lib/toast'
import { useUserStore } from '@/store/user'
import { cn } from '@/lib/utils'
import { getCurrencySymbol } from '@/utils/currency'
import { createCreditOrderApi } from '@/api/payment'
import { PaymentDialog } from '@/components/PaymentDialog'
import { NumberInput } from '@/components/ui/number-input'
import { useGetClientLng } from '@/hooks/useSystem'

const cnySymbol = getCurrencySymbol('CNY')

// ===== 积分套餐 =====
const CREDIT_PLANS = [
  { credits: 1000, price: 70, popular: false, gen: { seedance: '111s', grok: '67s' } },
  { credits: 5000, price: 350, popular: true, gen: { seedance: '555s', grok: '333s' } },
  { credits: 10000, price: 700, popular: false, gen: { seedance: '1110s', grok: '667s' } },
]

// ===== 支持功能 =====
const FEATURES = [
  '长视频生成（数分钟）','AI自适应发布多平台','影视解说','直播切片',
  '短视频生成（10秒）','视频编辑','图片生成','图片编辑',
  '视频翻译','AI内容版权检测','AI内容质量分析','文本内容安全审查',
  '图片内容安全审查','视频内容安全审查',
]

// ===== FAQ =====
const FAQS = [
  { q: '你们支持哪些支付方式？', a: '我们支持多种支付方式，包括主要的信用卡（Visa、MasterCard、American Express）以及支付宝等。' },
  { q: '图片和视频生成时，积分是如何扣除的？', a: '我们的图片和视频生成定价与官方渠道保持一致。通常情况下，如果官方渠道有大额采购折扣，我们也会同步将这些优惠让利给您。' },
  { q: '我的积分会过期吗？', a: '我们的积分过期机制非常宽松。积分自获取之日起 12 个自然月后才会过期。' },
  { q: '如果我需要更多积分怎么办？', a: '您可以通过每天发布内容来获取免费积分，也可以直接购买积分包获得更多积分。' },
  { q: '如何查看我的积分情况？', a: '点击您的积分余额，即可查看积分的变更明细。' },
  { q: '是否存在隐藏费用？', a: '没有。您所看到的价格就是您最终支付的价格，不会有任何额外的隐性收费。' },
  { q: '有退款政策吗？', a: '我们提供7天无理由退款保证。如果您对服务不满意，可以在购买后7天内申请全额退款。' },
]

// ===== LLM 模型定价 =====
const LLM_MODELS = [
  { name: 'gpt-5', input: '9元', output: '72元', notes: '', channel: 'yun' },
  { name: 'gpt-5-mini', input: '1.8元', output: '14.4元', notes: '', channel: 'yun' },
  { name: 'gpt-5-nano', input: '0.36元', output: '2.88元', notes: '', channel: 'yun' },
  { name: 'gemini-2.5-pro', input: '9元', output: '72元', notes: '支持视频', channel: 'yun' },
  { name: 'gemini-2.5-flash', input: '2.16元', output: '18元', notes: '支持视频', channel: 'yun' },
  { name: 'chatgpt-4o-latest', input: '36元', output: '108元', notes: '', channel: 'yun' },
  { name: 'qwen-vl-max-latest', input: '1.6元', output: '4元', notes: '', channel: 'yun' },
]

// ===== 图片模型定价 =====
const IMAGE_MODELS = [
  { name: 'gemini-2.5-flash-image', credits: '1', price: '0.27元', notes: 'Nano Banana Pro，多图像输入', channel: 'yun' },
  { name: 'seedream-3.0', credits: '2.6', price: '0.26元', notes: '', channel: '官方' },
  { name: 'seededit-3.0', credits: '3', price: '0.3元', notes: '图片编辑', channel: '官方' },
  { name: 'gpt-image-1', credits: '促销', price: '$0.011-0.25', notes: '支持图片编辑', channel: 'yun' },
  { name: 'FLUX.1 Kontext [max]', credits: '1.5', price: '0.6元', notes: '', channel: 'yun' },
  { name: 'FLUX.1 Kontext [pro]', credits: '1', price: '0.3元', notes: '', channel: 'yun' },
  { name: 'Flux 1.1 pro ultra', credits: '4.5', price: '0.45元', notes: '', channel: '官方' },
  { name: 'Flux1.1 pro', credits: '3', price: '0.3元', notes: '', channel: '官方' },
]

// ===== 视频生成定价 =====
const VIDEO_MODELS = [
  { name: 'midjourney relax', dur: '5秒', res: '', credits: '免费', price: '', channel: 'yun' },
  { name: 'midjourney fast/turbo', dur: '5秒', res: '', credits: '4', price: '', channel: 'yun' },
  { name: 'kling1.5/1.6/2.1', dur: '5秒', res: '720p', credits: '20', price: '2元', channel: 'yun' },
  { name: 'kling1.5/1.6/2.1', dur: '10秒', res: '720p', credits: '40', price: '4元', channel: 'yun' },
  { name: 'kling1.5/1.6/2.1', dur: '5秒', res: '1080p', credits: '35', price: '3.5元', channel: 'yun' },
  { name: 'kling1.5/1.6/2.1', dur: '10秒', res: '1080p', credits: '70', price: '7元', channel: 'yun' },
  { name: 'wan2.2-plus', dur: '5秒', res: '480p', credits: '70', price: '0.7元', channel: 'yun' },
  { name: 'wan2.2-plus', dur: '5秒', res: '1080p', credits: '35', price: '3.5元', channel: 'yun' },
]

export default function PricingPage() {
  const lng = useGetClientLng()
  const router = useRouter()
  const [tab, setTab] = useState<'subscription' | 'credits' | 'balance'>('subscription')
  const [customAmount, setCustomAmount] = useState(10)
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  const [showPriceTable, setShowPriceTable] = useState(false)
  const [buyingIndex, setBuyingIndex] = useState<number | null>(null)
  const [customLoading, setCustomLoading] = useState(false)
  const [balanceLoading, setBalanceLoading] = useState(false)
  const token = useUserStore(state => state.token)
  const [payDialog, setPayDialog] = useState<{ open: boolean; amount: number; credits: number } | null>(null)

  const calcCustomCredits = (amount: number) => Math.round(amount / 7 * 100)

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* 顶部标题 */}
      <div className="border-b border-border bg-background px-6 py-5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20">
            <Coins className="h-6 w-6 text-amber-500" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">订阅中心</h1>
            <p className="text-xs text-muted-foreground">灵活的 AI 积分与订阅计划</p>
          </div>
        </div>
      </div>

      {/* Tab 切换 - 订阅计划 / 按量付费 / 积分充值 */}
      <div className="border-b border-border shrink-0">
        <div className="flex px-6 gap-0">
          {[
            { key: 'subscription', label: '订阅计划', icon: Coins },
            { key: 'balance', label: '按量付费', icon: Wallet },
            { key: 'credits', label: '积分充值', icon: Coins },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
              className={cn('flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all cursor-pointer',
                tab === t.key ? 'text-foreground' : 'border-transparent text-muted-foreground'
              )}
              style={tab === t.key ? { borderBottomColor: 'var(--brand-purple)', borderBottomWidth: '2px' } : undefined}>
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-5">
        {/* ====== 订阅计划 ====== */}
        {tab === 'subscription' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  planId: 'free', name: '免费版', price: 0, popular: false,
                  accounts: 3, content: 10, platforms: 3,
                  features: ['AI 内容生成', '基础发布', '基础数据看板'],
                },
                {
                  planId: 'pro', name: 'Pro 版', price: 299, popular: true,
                  accounts: 10, content: 100, platforms: 6,
                  features: ['AI 内容生成', '高级发布排期', 'AI 自动回复', '高级数据分析', '优先支持'],
                },
                {
                  planId: 'enterprise', name: '企业版', price: 999, popular: false,
                  accounts: 30, content: 500, platforms: 14,
                  features: ['全部 Pro 功能', '线索识别', '知识库 RAG', '全域数据看板', '白标定制', '专属支持'],
                },
              ].map((plan, i) => (
                <div key={i} className={cn('relative rounded-xl border-2 p-6 flex flex-col transition-all duration-300',
                  plan.popular ? 'shadow-(--brand-shadow-md) bg-(--brand-gradient-glow)' : 'border-border bg-card hover:border-(--brand-purple)/30 hover:shadow-md hover:-translate-y-0.5'
                )}
                  style={plan.popular ? { borderColor: 'var(--brand-purple)' } : undefined}>
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-white text-xs font-medium shadow-(--brand-shadow-sm)" style={{ background: 'var(--brand-gradient)' }}>推荐</span>
                  )}
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <div className="mt-3">
                    <span className="text-3xl font-bold">{cnySymbol}{plan.price}</span>
                    <span className="text-sm text-muted-foreground">/月</span>
                  </div>
                  <div className="mt-4 space-y-2 text-xs text-muted-foreground flex-1">
                    <div className="flex items-center gap-2"><Check className="h-3 w-3 text-green-500 shrink-0" /> {plan.accounts} 个社交账号</div>
                    <div className="flex items-center gap-2"><Check className="h-3 w-3 text-green-500 shrink-0" /> 月 {plan.content} 条 AI 内容</div>
                    <div className="flex items-center gap-2"><Check className="h-3 w-3 text-green-500 shrink-0" /> {plan.platforms} 个平台</div>
                    {plan.features.map(f => (
                      <div key={f} className="flex items-center gap-2"><Check className="h-3 w-3 text-green-500 shrink-0" /> {f}</div>
                    ))}
                  </div>
                  <Button
                    className={cn('w-full mt-4 cursor-pointer', plan.popular ? '' : 'bg-transparent border border-input hover:bg-accent hover:text-accent-foreground')}
                    onClick={() => {
                      if (!token) { toast.error('请先登录'); return }
                      if (plan.price === 0) {
                        router.push(`/${lng}/auth`)
                      } else {
                        setPayDialog({ open: true, amount: plan.price, credits: 0 })
                      }
                    }}
                  >
                    {plan.price === 0 ? '免费开始' : `订阅 ${cnySymbol}${plan.price}/月`}
                  </Button>
                </div>
              ))}
            </div>

            {/* 年付优惠 */}
            <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 to-purple-500/10 p-6 text-center">
              <p className="text-sm">
                <span className="font-semibold text-primary">年付省 2 个月</span>
                <span className="text-muted-foreground"> — Pro 版 {cnySymbol}2,999/年，企业版 {cnySymbol}9,999/年，联系客服开通</span>
              </p>
            </div>
          </div>
        )}

        {/* ====== 按量付费 ====== */}
        {tab === 'balance' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* 介绍卡片 */}
            <div className="rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 p-6">
              <h2 className="text-lg font-semibold mb-3">按量付费</h2>
              <div className="text-sm text-muted-foreground space-y-2 leading-relaxed">
                <p>AiBrand 不止是一家软件公司，更是一家结果交付公司。</p>
                <p>我们的目标是为一人公司交付运营结果。</p>
                <p>您所购买的 AiBrand 积分（代充值 token 费用）都将用于支付 Google、OpenAI、xAI、Anthropic 等公司的模型费用。</p>
                <p className="font-medium text-foreground">我们向您承诺，我们的使用价格不会高于所有模型的官方价格。</p>
                <p>同时，如果我们的使用量增长，可以从大公司这里享受到一些折扣时，我们也会将折扣的优惠传递给您。</p>
              </div>
            </div>

            {/* 余额信息 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-border bg-card p-5 text-center">
                <div className="text-xs text-muted-foreground mb-1">当前余额</div>
                <div className="text-2xl font-bold text-amber-500">{cnySymbol}0.00</div>
                <Button
                  variant="outline" size="sm" className="mt-3 cursor-pointer w-full"
                  onClick={async () => {
                    if (!token) { toast.error('请先登录'); return }
                    setBalanceLoading(true)
                    try {
                      const res = await createCreditOrderApi({ amount: 10 })
                      if (res?.data?.paymentUrl) { window.location.href = res.data.paymentUrl }
                      else { toast.success('订单已创建') }
                    } catch { toast.error('充值功能暂不可用，请联系客服') }
                    finally { setBalanceLoading(false) }
                  }}
                  disabled={balanceLoading}
                >
                  {balanceLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Wallet className="h-3 w-3 mr-1" />}
                  {balanceLoading ? '处理中...' : '充值'}
                </Button>
              </div>
              <div className="rounded-xl border border-border bg-card p-5 text-center">
                <div className="text-xs text-muted-foreground mb-1">当前积分</div>
                <div className="text-2xl font-bold text-primary">0</div>
                <div className="text-xs text-muted-foreground mt-1">100 积分 = 1 美元</div>
              </div>
              <div className="rounded-xl border border-border bg-card p-5 text-center">
                <div className="text-xs text-muted-foreground mb-1">余额特点</div>
                <div className="text-xs text-left space-y-1 mt-2">
                  <div className="flex items-center gap-2"><Check className="h-3 w-3 text-green-500" /> 用于推广任务投放</div>
                  <div className="flex items-center gap-2"><Check className="h-3 w-3 text-green-500" /> 余额永不过期</div>
                </div>
              </div>
            </div>

            {/* 价格表切换 */}
            <button onClick={() => setShowPriceTable(!showPriceTable)}
              className="flex items-center gap-2 text-sm font-medium text-primary cursor-pointer">
              {showPriceTable ? '收起' : '展开'}价格表
              {showPriceTable ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showPriceTable && (
              <div className="space-y-6">
                {/* LLM 模型定价 */}
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="p-4 border-b border-border bg-muted/30 font-medium text-sm">大语言模型（每百万 tokens）</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="text-left p-3">模型</th><th className="text-right p-3">输入</th><th className="text-right p-3">输出</th><th className="text-left p-3">备注</th>
                      </tr></thead>
                      <tbody>{LLM_MODELS.map((m,i)=>(
                        <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="p-3 font-medium">{m.name}</td>
                          <td className="p-3 text-right">{m.input}</td>
                          <td className="p-3 text-right">{m.output}</td>
                          <td className="p-3 text-xs text-muted-foreground">{m.notes}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>

                {/* 图片生成 */}
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="p-4 border-b border-border bg-muted/30 font-medium text-sm">图片生成模型</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="text-left p-3">模型</th><th className="text-right p-3">积分</th><th className="text-right p-3">价格</th><th className="text-left p-3">备注</th>
                      </tr></thead>
                      <tbody>{IMAGE_MODELS.map((m,i)=>(
                        <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="p-3 font-medium">{m.name}</td>
                          <td className="p-3 text-right">{m.credits}</td>
                          <td className="p-3 text-right">{m.price}</td>
                          <td className="p-3 text-xs text-muted-foreground">{m.notes}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>

                {/* 视频生成 */}
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="p-4 border-b border-border bg-muted/30 font-medium text-sm">视频生成模型</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="text-left p-3">模型</th><th className="text-right p-3">时长</th><th className="text-right p-3">分辨率</th><th className="text-right p-3">积分</th><th className="text-right p-3">价格</th>
                      </tr></thead>
                      <tbody>{VIDEO_MODELS.map((m,i)=>(
                        <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="p-3 font-medium text-xs">{m.name}</td>
                          <td className="p-3 text-right text-xs">{m.dur}</td>
                          <td className="p-3 text-right text-xs">{m.res}</td>
                          <td className="p-3 text-right text-xs">{m.credits}</td>
                          <td className="p-3 text-right text-xs">{m.price}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ====== 积分充值 ====== */}
        {tab === 'credits' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* 积分套餐卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {CREDIT_PLANS.map((plan, i) => (
                <div key={i} className={cn('relative rounded-xl border-2 p-6 transition-all duration-300',
                  plan.popular ? 'shadow-(--brand-shadow-md) bg-(--brand-gradient-glow)' : 'border-border bg-card hover:border-(--brand-purple)/30 hover:shadow-md hover:-translate-y-0.5'
                )}
                  style={plan.popular ? { borderColor: 'var(--brand-purple)' } : undefined}>
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-white text-xs font-medium shadow-(--brand-shadow-sm)" style={{ background: 'var(--brand-gradient)' }}>推荐</span>
                  )}
                  <div className="text-3xl font-bold">{cnySymbol}{plan.price}</div>
                  <div className="text-lg font-semibold mt-2">{plan.credits.toLocaleString()} 积分</div>
                  <div className="text-xs text-muted-foreground mt-1">100 积分 = 1 美元</div>
                  <div className="mt-4 text-xs text-muted-foreground space-y-1">
                    <div>≈ 可生成 seedance-2.0 {plan.gen.seedance}</div>
                    <div>≈ 可生成 grok-imagine-video {plan.gen.grok}</div>
                  </div>
                  <Button
                    className={cn('w-full mt-4 cursor-pointer', plan.popular ? '' : 'bg-transparent border border-input hover:bg-accent hover:text-accent-foreground')}
                    onClick={() => {
                      if (!token) { toast.error('请先登录'); return }
                      setPayDialog({ open: true, amount: plan.price, credits: plan.credits })
                    }}
                  >
                    购买 {cnySymbol}{plan.price}
                  </Button>
                </div>
              ))}
            </div>

            {/* 自定义充值 */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-base font-semibold mb-2">自定义充值</h3>
              <p className="text-xs text-muted-foreground mb-4">按需输入充值金额，最低 {cnySymbol}10 CNY 起充。</p>
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{cnySymbol}</span>
                  <NumberInput value={customAmount} min={10}
                    onValueChange={v => setCustomAmount(Math.max(10, v || 0))}
                    className="w-full pl-8 pr-4 py-2.5 rounded-lg border border-border bg-background text-sm outline-none focus:border-primary/60" />
                </div>
                <Button
                  className="cursor-pointer shrink-0"
                  onClick={() => {
                    if (!token) { toast.error('请先登录'); return }
                    if (customAmount < 10) { toast.error(`最低充值 ${cnySymbol}10`); return }
                    setPayDialog({
                      open: true,
                      amount: customAmount,
                      credits: Math.round(customAmount / 7 * 100),
                    })
                  }}
                >
                  充值 {cnySymbol}{customAmount}
                </Button>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                预计到账：<span className="text-primary font-semibold">{calcCustomCredits(customAmount).toLocaleString()}</span> 积分
              </div>
            </div>

            {/* 支持功能 */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-sm font-semibold mb-3">支持的功能</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {FEATURES.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground p-2 rounded-lg bg-background border border-border/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" /> {f}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ====== FAQ（两者都显示）====== */}
        <div className="max-w-4xl mx-auto mt-8 mb-6">
          <h3 className="text-base font-semibold mb-4">常见问题</h3>
          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                <button onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-sm font-medium cursor-pointer hover:bg-accent/50">
                  <span className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-primary shrink-0" />
                    {faq.q}
                  </span>
                  {expandedFaq === i ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {expandedFaq === i && (
                  <div className="px-4 pb-4 border-t border-border pt-3">
                    <p className="text-xs text-muted-foreground leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 积分说明 */}
          <div className="mt-6 rounded-xl bg-gradient-to-r from-primary/5 to-amber-500/5 border border-primary/20 p-5 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">积分使用说明</p>
            <p>积分主要用于两类消耗：LLM Tokens（用于任务规划、决策和生成输出）和第三方 API（用于访问图片模型、视频模型、视频编辑/处理等外部服务）。</p>
            <p>任务的实际积分消耗取决于其复杂度、时长和外部调用次数。</p>
            <p>任务完成后，存储、托管、展示或部署其输出不会消耗额外积分。</p>
            <p>如果任务因 AiBrand 技术问题失败，将全额退还该任务消耗的积分。</p>
            <p className="text-primary font-medium mt-2">100 积分 = 1 美元</p>
          </div>
        </div>
      </div>

      {/* 支付弹窗 */}
      {payDialog && (
        <PaymentDialog
          open={payDialog.open}
          onClose={() => setPayDialog(null)}
          amount={payDialog.amount}
          credits={payDialog.credits}
        />
      )}
    </div>
  )
}
