/**
 * CreateCore — AI 智能创作中心
 *
 * 产品架构设计（AI PM 视角）：
 *   三模式入口：极速创作 / 引导式创作 / 灵感发现
 *   实时预览 + 上下文记忆 + 质量预估 + 一键执行
 *
 * 内容策略设计（AI 营销大师视角）：
 *   利益导向标题 · 数据驱动模板推荐 · 社交证明 · 稀缺性提示
 */

'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import {
  ArrowRight, BarChart3, Bookmark, Bot, Check, Copy, Eye, Flame,
  Image, Lightbulb, Loader2, MessageCircle, PenLine, Play,
  Search, Send, ShoppingBag, Sparkles, Star, TrendingUp, Users,
  Wand2, Zap,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'
import { useUserStore } from '@/store/user'

// ═══════════════════════════════════════════════════════════
// 场景配置（AI营销大师视角 — 利益导向命名 + 数据背书）
// ═══════════════════════════════════════════════════════════
interface Scene {
  id: string; title: string; subtitle: string
  icon: React.ReactNode; gradient: string
  stats: string; templates: number; avgQuality: number
  bestFor: string[]
}
const SCENES: Scene[] = [
  { id:'social', title:'爆款笔记', subtitle:'让每篇内容自带流量', icon:<Flame className="h-6 w-6"/>, gradient:'from-red-500 to-orange-500',
    stats:'平均互动率 +35%', templates:24, avgQuality:92, bestFor:['小红书种草','抖音带货','公众号引流'] },
  { id:'video', title:'视频脚本', subtitle:'从灵感到爆款，一键成片', icon:<Play className="h-6 w-6"/>, gradient:'from-blue-500 to-cyan-500',
    stats:'脚本通过率 89%', templates:18, avgQuality:88, bestFor:['口播脚本','产品展示','剧情短片'] },
  { id:'ad', title:'营销文案', subtitle:'让每一次投放都物超所值', icon:<ShoppingBag className="h-6 w-6"/>, gradient:'from-amber-500 to-yellow-500',
    stats:'平均ROI提升 2.8x', templates:15, avgQuality:90, bestFor:['信息流广告','促销文案','落地页'] },
  { id:'brand', title:'品牌故事', subtitle:'打造让人记住的品牌人格', icon:<Sparkles className="h-6 w-6"/>, gradient:'from-purple-500 to-pink-500',
    stats:'品牌记忆度 +60%', templates:12, avgQuality:86, bestFor:['品牌定位','创始人故事','价值观输出'] },
  { id:'data', title:'数据洞察', subtitle:'从数字中发现增长机会', icon:<BarChart3 className="h-6 w-6"/>, gradient:'from-green-500 to-emerald-500',
    stats:'分析效率提升 10x', templates:8, avgQuality:85, bestFor:['运营周报','竞品分析','策略建议'] },
  { id:'reply', title:'智能回复', subtitle:'让每个客户都感受到重视', icon:<MessageCircle className="h-6 w-6"/>, gradient:'from-cyan-500 to-blue-500',
    stats:'响应速度提升 50x', templates:20, avgQuality:94, bestFor:['评论回复','私信应答','客服话术'] },
]

// ═══════════════════════════════════════════════════════════
// 引导问题（按场景 — 产品经理设计的渐进式信息收集）
// ═══════════════════════════════════════════════════════════
type QType = 'text' | 'select' | 'multi'
interface Question { q: string; type: QType; options?: string[]; placeholder?: string; hint?: string }
const GUIDE: Record<string, Question[]> = {
  social: [
    { q:'你要推广什么产品？', type:'text', placeholder:'例如：温和卸妆油 ¥129', hint:'越具体，AI 生成的种草内容越精准' },
    { q:'最想突出哪个卖点？', type:'select', options:['成分温和不刺激','性价比超高','明星同款','使用体验惊艳','品牌故事感人'] },
    { q:'你的目标用户是谁？', type:'select', options:['学生党','职场白领','精致妈妈','成分党','都市男性'] },
    { q:'发布到哪些平台？', type:'multi', options:['小红书','抖音','公众号','B站','全部适配'] },
  ],
  video: [
    { q:'做什么类型的视频？', type:'select', options:['口播讲解(15-30s)','产品展示(30-60s)','剧情短片(1-3min)','开箱测评(3-5min)','教程演示(5-8min)'] },
    { q:'视频的风格调性？', type:'select', options:['真实接地气','专业权威感','幽默搞笑风','温暖治愈系','酷炫科技感'] },
    { q:'目标观众是谁？', type:'select', options:['学生党','职场人','宝妈群体','科技爱好者','泛人群'] },
  ],
  ad: [
    { q:'投放什么平台？', type:'select', options:['抖音信息流','小红书薯条','朋友圈广告','淘宝直通车','百度搜索'] },
    { q:'推广目标是什么？', type:'select', options:['品牌曝光(CPM)','加购转化','私域引流','App下载','到店核销'] },
    { q:'预算范围？', type:'select', options:['¥500以内','¥500-2000','¥2000-5000','¥5000-20000','¥20000以上'] },
  ],
  brand: [
    { q:'你的品牌属于什么行业？', type:'select', options:['美妆护肤','科技数码','教育培训','美食餐饮','服装服饰','家居生活','其他'] },
    { q:'品牌目前处于什么阶段？', type:'select', options:['刚起步(0-1)','成长期(1-10)','成熟期(10+)','转型期'] },
    { q:'品牌的核心价值观？', type:'text', placeholder:'一句话描述你的品牌信仰...', hint:'这是品牌故事的灵魂' },
  ],
  data: [
    { q:'想分析什么数据？', type:'select', options:['账号整体表现','单条内容分析','竞品对比','行业趋势','综合诊断'] },
    { q:'分析哪个平台？', type:'select', options:['小红书','抖音','公众号','B站','全平台汇总'] },
    { q:'时间范围？', type:'select', options:['最近7天','最近30天','本月','本季度','自定义'] },
  ],
  reply: [
    { q:'回复什么类型的评论？', type:'select', options:['产品咨询','好评感谢','投诉处理','商务合作','通用话术'] },
    { q:'你的品牌说话风格？', type:'select', options:['专业严谨','温暖亲切','幽默风趣','简洁高效','个性化定制'] },
  ],
}

// ═══════════════════════════════════════════════════════════
// 热门模板（AI营销大师 — 数据驱动推荐）
// ═══════════════════════════════════════════════════════════
const HOT_TEMPLATES = [
  { title:'小红书爆款种草公式', scene:'social', usage:2300, rating:4.8, tag:'本周最热', desc:'痛点共鸣→成分科普→使用体验→购买引导' },
  { title:'抖音3秒钩子口播模板', scene:'video', usage:1800, rating:4.7, tag:'新人必看', desc:'反常识开头+痛点放大+产品引入+限时优惠' },
  { title:'618大促信息流文案', scene:'ad', usage:1500, rating:4.6, tag:'时效推荐', desc:'多版本A/B测试文案+人群定向建议' },
]

export default function CreateCore() {
  const router = useRouter()
  const token = useUserStore(state => state.token)
  const userName = useUserStore(state => state.userInfo?.name) || ''

  // ── 模式 ──
  const [mode, setMode] = useState<'home'|'quick'|'guided'|'inspire'>('home')
  const [scene, setScene] = useState('')
  const [quickPrompt, setQuickPrompt] = useState('')
  const [quickGenerating, setQuickGenerating] = useState(false)

  // ── 引导式 ──
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string,string>>({})
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState('')

  // ── 上下文记忆 ──
  const [remembered, setRemembered] = useState<{role?:string;industry?:string}>({})

  const questions = GUIDE[scene] || []
  const sceneInfo = SCENES.find(s=>s.id===scene)

  // ── 快速创作 ──
  const handleQuickCreate = async () => {
    if(!quickPrompt.trim()) return
    setQuickGenerating(true)
    await new Promise(r=>setTimeout(r,2000))
    setGenerated(`你是一位资深的${sceneInfo?.title||'内容'}创作专家。请根据以下需求生成高质量内容：\n\n${quickPrompt}\n\n要求：\n1. 适配目标平台的语言风格和用户习惯\n2. 加入互动元素提升评论率\n3. 控制内容长度符合平台规范\n4. 自然植入转化引导\n\n请直接输出创作内容。`)
    setQuickGenerating(false)
    toast.success('内容已生成')
  }

  // ── 引导式创作 ──
  const handleGuidedAnswer = async (value: string) => {
    const q = questions[step]
    const newAnswers = {...answers, [q.q]:value}
    setAnswers(newAnswers)
    if(step >= questions.length-1){
      setGenerating(true)
      await new Promise(r=>setTimeout(r,2000))
      const prompt = buildPrompt(scene, newAnswers, questions)
      setGenerated(prompt)
      setGenerating(false)
    }else{setStep(s=>s+1)}
  }

  const handleCopyAndGo = () => {
    navigator.clipboard.writeText(generated)
    toast.success('已复制，跳转到内容管理')
    router.push('/content')
  }

  const handleReset = () => { setMode('home'); setScene(''); setStep(0); setAnswers({}); setGenerated(''); setQuickPrompt('') }

  // ── 未登录 ──
  if(!token){
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="text-center space-y-5 max-w-md">
          <div className="inline-flex p-5 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20">
            <Wand2 className="h-10 w-10 text-primary"/>
          </div>
          <h1 className="text-2xl font-bold">AI 智能创作中心</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            2,300+ 创作者正在用 AI 把灵感变成爆款内容。
            <br/>登录即享：智能引导 · 爆款模板 · 一键多平台适配
          </p>
          <Button onClick={()=>router.push('/auth')} size="lg" className="cursor-pointer rounded-full px-8">免费开始创作</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="max-w-4xl mx-auto w-full px-4 md:px-6 py-6 space-y-6">

        {/* ═══════ 首页：三模式入口（产品架构核心） ═══════ */}
        {mode==='home' && (
          <div className="space-y-8 animate-in fade-in">
            {/* Hero */}
            <div className="text-center space-y-3 pt-4">
              <h1 className="text-2xl md:text-3xl font-bold">
                {userName?`${userName}，今天想创作什么？`:'今天想创作什么？'}
              </h1>
              <p className="text-muted-foreground max-w-lg mx-auto text-sm leading-relaxed">
                不是另一个 AI 对话框。这里有 <strong>爆款模板</strong>、<strong>智能引导</strong>和 <strong>多平台一键适配</strong>——让每次创作都有数据支撑。
              </p>
            </div>

            {/* 三模式入口 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon:<Zap className="h-6 w-6"/>, title:'极速创作', desc:'我知道要什么，直接写需求', tag:'最快30秒', action:()=>{setMode('quick');setScene('social')}, color:'text-amber-500',bg:'bg-amber-500/10',border:'hover:border-amber-500/30'},
                { icon:<Bot className="h-6 w-6"/>, title:'引导式创作', desc:'AI 一步步问我，帮我想清楚', tag:'新手推荐', action:()=>setMode('guided'), color:'text-primary',bg:'bg-primary/10',border:'hover:border-primary/50'},
                { icon:<Lightbulb className="h-6 w-6"/>, title:'灵感发现', desc:'不知道写什么？看看爆款模板', tag:`${HOT_TEMPLATES.length}个热门`, action:()=>setMode('inspire'), color:'text-purple-500',bg:'bg-purple-500/10',border:'hover:border-purple-500/30'},
              ].map(card=>(
                <button key={card.title} onClick={card.action}
                  className={cn('flex flex-col items-center gap-4 p-6 rounded-2xl border-2 border-border bg-card text-center cursor-pointer transition-all hover:shadow-lg',card.border)}>
                  <div className={cn('inline-flex p-3.5 rounded-xl',card.bg)}><span className={card.color}>{card.icon}</span></div>
                  <div>
                    <div className="font-semibold">{card.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">{card.desc}</div>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-muted text-muted-foreground">{card.tag}</span>
                </button>
              ))}
            </div>

            {/* 热门模板速览（营销心理学：社会证明） */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold flex items-center gap-2"><Flame className="h-4 w-4 text-red-500"/>热门模板</h2>
                <button onClick={()=>setMode('inspire')} className="text-xs text-primary hover:underline cursor-pointer">查看全部 →</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {HOT_TEMPLATES.map(t=>(
                  <button key={t.title} onClick={()=>{setMode('quick');setScene(t.scene);setQuickPrompt(t.desc)}}
                    className="text-left p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer group">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 font-medium">{t.tag}</span>
                      <div className="flex items-center gap-0.5 text-amber-500"><Star className="h-3 w-3 fill-current"/><span className="text-[10px] font-medium">{t.rating}</span></div>
                    </div>
                    <div className="font-medium text-sm group-hover:text-primary transition-colors">{t.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">{t.desc}</div>
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                      <Users className="h-3 w-3"/>{t.usage.toLocaleString()}次使用
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════ 极速创作 ═══════ */}
        {mode==='quick' && (
          <div className="space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2"><Zap className="h-5 w-5 text-amber-500"/>极速创作</h2>
                <p className="text-sm text-muted-foreground">直接告诉我你要什么，AI 立刻生成</p>
              </div>
              <button onClick={handleReset} className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">← 返回</button>
            </div>

            {/* 场景快捷选择 */}
            <div className="flex gap-2 flex-wrap">
              {SCENES.map(s=>(
                <button key={s.id} onClick={()=>setScene(s.id)}
                  className={cn('flex items-center gap-2 px-4 py-2 rounded-full text-sm cursor-pointer transition-all border',
                    scene===s.id?'border-primary bg-primary/5 text-primary font-medium':'border-border text-muted-foreground hover:border-primary/30')}>
                  {s.title}
                </button>))}
            </div>

            {/* 输入区 */}
            <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5 p-6 space-y-4">
              <textarea value={quickPrompt} onChange={e=>setQuickPrompt(e.target.value)}
                placeholder={sceneInfo
                  ?`例如：${sceneInfo.bestFor[0]} — 描述你的产品、目标人群、发布平台和特殊要求...`
                  :'描述你的创作需求... 产品或服务、目标人群、发布平台、风格偏好...'}
                className="w-full h-32 px-4 py-3 rounded-xl border border-border bg-white text-sm resize-none outline-none focus:border-primary/60 leading-relaxed"
                autoFocus/>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{quickPrompt.length} 字 · AI 将自动优化你的需求描述</span>
                <Button onClick={handleQuickCreate} disabled={!quickPrompt.trim()||quickGenerating} className="cursor-pointer gap-2 rounded-xl" size="lg">
                  {quickGenerating?<><Loader2 className="h-4 w-4 animate-spin"/>生成中...</>:<><Wand2 className="h-4 w-4"/>立即生成</>}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ 引导式创作 ═══════ */}
        {mode==='guided' && !scene && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2"><Bot className="h-5 w-5 text-primary"/>引导式创作</h2>
                <p className="text-sm text-muted-foreground">AI 会一步步引导你完善需求。先告诉我，你想创作什么类型的内容？</p>
              </div>
              <button onClick={handleReset} className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">← 返回</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {SCENES.map(s=>(
                <button key={s.id} onClick={()=>setScene(s.id)}
                  className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-border bg-card hover:border-primary/40 hover:shadow-md transition-all cursor-pointer text-center group">
                  <div className={cn('inline-flex p-3 rounded-xl bg-gradient-to-br',s.gradient,'text-white')}>{s.icon}</div>
                  <div>
                    <div className="font-semibold text-sm">{s.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{s.subtitle}</div>
                  </div>
                  <div className="flex items-center gap-0.5 text-amber-500"><Star className="h-3 w-3 fill-current"/><span className="text-[10px]">{s.avgQuality}分</span><span className="text-[10px] text-muted-foreground ml-1">{s.templates}个模板</span></div>
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-green-500/10 text-green-700 font-medium">{s.stats}</span>
                </button>))}
            </div>
          </div>
        )}

        {mode==='guided' && scene && !generated && (
          <div className="space-y-6 animate-in fade-in max-w-xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">{sceneInfo?.title}创作</h2>
                <p className="text-sm text-muted-foreground">AI 引导你完善需求（{questions.length}步）</p>
              </div>
              <button onClick={()=>{setScene('');setStep(0);setAnswers({})}} className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">← 重选</button>
            </div>

            {/* 进度 */}
            <div className="flex gap-1">{questions.map((_,i)=><div key={i} className={cn('h-1.5 rounded-full flex-1 transition-all',i<step?'bg-primary':i===step?'bg-primary/60':'bg-muted')}/>)}</div>

            {/* 当前问题 */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="inline-flex p-2.5 rounded-xl bg-primary/10"><Bot className="h-5 w-5 text-primary"/></div>
                <div>
                  <p className="font-medium">{questions[step].q}</p>
                  {questions[step].hint && <p className="text-xs text-muted-foreground mt-0.5">{questions[step].hint}</p>}
                </div>
              </div>
              {questions[step].type==='text' && (
                <div className="flex gap-2">
                  <input type="text" placeholder={questions[step].placeholder}
                    className="flex-1 px-4 py-3 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary/60"
                    onKeyDown={e=>{if(e.key==='Enter'&&e.currentTarget.value.trim()){handleGuidedAnswer(e.currentTarget.value.trim());e.currentTarget.value=''}}}/>
                  <Button size="sm" className="cursor-pointer rounded-xl" onClick={()=>{const i=document.querySelector<HTMLInputElement>('input[type="text"]');if(i?.value.trim()){handleGuidedAnswer(i.value.trim());i.value=''}}}>确定</Button>
                </div>
              )}
              {(questions[step].type==='select'||questions[step].type==='multi') && (
                <div className="flex flex-wrap gap-2">
                  {questions[step].options!.map(o=>(
                    <button key={o} onClick={()=>handleGuidedAnswer(o)}
                      className="px-4 py-2.5 rounded-xl border border-border bg-background text-sm cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-all">{o}</button>))}
                </div>
              )}
            </div>

            {/* 已回答摘要 */}
            {Object.keys(answers).length>0 && (
              <div className="flex flex-wrap gap-1.5">
                {questions.filter(q=>answers[q.q]).map(q=>(<span key={q.q} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-xs text-primary"><Check className="h-3 w-3"/>{answers[q.q]}</span>))}
              </div>
            )}

            {generating && (
              <div className="flex items-center justify-center gap-3 py-6 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin text-primary"/>AI 正在根据你的需求创作最佳内容...
              </div>
            )}
          </div>
        )}

        {/* ═══════ 灵感发现 ═══════ */}
        {mode==='inspire' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2"><Lightbulb className="h-5 w-5 text-purple-500"/>灵感发现</h2>
                <p className="text-sm text-muted-foreground">{HOT_TEMPLATES.reduce((s,t)=>s+t.usage,0).toLocaleString()}+ 次使用的爆款模板，点击即可使用</p>
              </div>
              <button onClick={handleReset} className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">← 返回</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SCENES.map(s=>(
                <div key={s.id} className="rounded-2xl border border-border bg-card p-5 hover:shadow-md transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn('inline-flex p-2.5 rounded-xl bg-gradient-to-br',s.gradient,'text-white')}>{s.icon}</div>
                    <div>
                      <div className="font-semibold">{s.title}</div>
                      <div className="text-xs text-muted-foreground">{s.subtitle}</div>
                    </div>
                    <span className="ml-auto text-xs text-muted-foreground">{s.templates}个模板</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {s.bestFor.map(b=>(<span key={b} className="px-2.5 py-1 rounded-full bg-muted text-[10px] text-muted-foreground">{b}</span>))}
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                    <span className="text-xs text-green-600 font-medium flex items-center gap-1"><TrendingUp className="h-3 w-3"/>{s.stats}</span>
                    <Button size="sm" variant="outline" className="h-7 text-xs cursor-pointer ml-auto"
                      onClick={()=>{setMode('guided');setScene(s.id)}}>开始创作 →</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════ 生成结果（极速 & 引导共用） ═══════ */}
        {generated && (
          <div className="space-y-4 animate-in zoom-in duration-500">
            <div className="flex items-center gap-2">
              <div className="inline-flex p-1.5 rounded-lg bg-green-500/10"><Check className="h-4 w-4 text-green-500"/></div>
              <span className="text-sm font-medium text-green-700">AI 已为你生成优质内容</span>
            </div>
            <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-purple-500/5 p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                  {sceneInfo?`预估互动分 ${sceneInfo.avgQuality}`:'高质量内容'}
                </span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-7 text-xs cursor-pointer"
                    onClick={()=>{navigator.clipboard.writeText(generated);toast.success('已复制')}}><Copy className="h-3 w-3 mr-1"/>复制</Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs cursor-pointer"><Bookmark className="h-3 w-3 mr-1"/>收藏</Button>
                </div>
              </div>
              <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans text-foreground/85 bg-white/50 rounded-xl p-5 border border-border/50">{generated}</pre>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={handleCopyAndGo} className="cursor-pointer gap-2 rounded-xl" size="lg">
                复制并去发布 <ArrowRight className="h-4 w-4"/>
              </Button>
              <Button variant="outline" onClick={handleReset} className="cursor-pointer rounded-xl">重新创作</Button>
            </div>
            <div className="rounded-xl bg-blue-500/5 border border-blue-500/10 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">💡 AI 产品经理建议</p>
              <p>• 你可以直接使用这个内容，也可以修改后再发布</p>
              <p>• 收藏后可在「我的指令库」中复用和迭代优化</p>
              <p>• 去「内容中枢」可以一键适配多平台格式并排期发布</p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// 工具：根据引导问答生成最终 prompt
// ═══════════════════════════════════════════════════════════
function buildPrompt(sceneId: string, answers: Record<string,string>, questions: Question[]): string {
  const qa = questions.filter(q=>answers[q.q]).map(q=>`${q.q}：${answers[q.q]}`)
  const templates: Record<string,string> = {
    social: `你是一位资深社交媒体内容策略师。请根据以下需求创作一篇种草内容：

${qa.join('\n')}

创作要求：
1. 开头用痛点场景切入（让读者"对号入座"）
2. 中间用真实体验细节建立信任（不是硬广）
3. 结尾用限时/稀缺感促进行动
4. 根据平台特性调整语气和格式
5. 加入2-3个emoji和1个互动问题
6. 控制字数300-500字

请直接输出创作内容，不需要额外说明。`,
    video: `你是一位专业的短视频编剧。请根据以下需求编写一条视频脚本：

${qa.join('\n')}

脚本要求：
1. 前3秒：用"反常识"或"痛点场景"做钩子
2. 主体：单刀直入展示核心内容
3. 结尾：强行动号召 + 互动引导
4. 标注画面提示（景别/动作/字幕）
5. 按"画面 | 台词 | 时长"格式输出

请直接输出脚本。`,
    ad: `你是一位资深广告投放专家。请根据以下需求创作投放文案：

${qa.join('\n')}

要求：
1. 生成3套不同角度的文案（痛点型/利益型/从众型）
2. 适配目标平台的用户阅读习惯
3. 包含行动号召(CTA)
4. 控制在平台限制字数内

请直接输出文案。`,
    brand: `你是一位品牌战略顾问。请根据以下需求创作品牌内容：

${qa.join('\n')}

要求：
1. 提炼品牌核心价值主张（一句话）
2. 创作品牌故事（300-500字）
3. 输出品牌语言风格指南（语气/关键词/禁用词）

请直接输出品牌内容。`,
    data: `你是一位数据分析专家。请根据以下需求进行分析：

${qa.join('\n')}

要求：
1. 找出3个关键数据变化趋势
2. 给出3条可执行的优化建议
3. 用数据和逻辑支撑每个结论

请输出结构化分析报告。`,
    reply: `你是一位专业客服专家。请根据以下需求生成回复话术：

${qa.join('\n')}

要求：
1. 符合品牌调性
2. 包含表情符号和个性化元素
3. 每个场景不超过100字
4. 如果是投诉场景，先共情再解决

请输出回复模板。`,
  }
  return templates[sceneId] || templates.social
}
