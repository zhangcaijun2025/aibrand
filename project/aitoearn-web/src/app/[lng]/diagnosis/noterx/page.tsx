/**
 * 薯医 NoteRx 整合诊断页
 *
 * 三层诊断能力：
 * 1. Model A 即时评分（纯数据驱动，无需 API Key）
 * 2. Baseline 品类对比
 * 3. 完整诊断报告（需配置 LLM API Key）
 */
'use client'

import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  ExternalLink,
  Loader2,
  MessageSquare,
  QrCode,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Upload,
  Zap,
} from 'lucide-react'
import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { preScore, getCategoryList, type ModelAResult } from '@/app/diagnosis/model-a'

// ==================== Types ====================

interface DiagnosisResult {
  model_a: ModelAResult
  insights: string[]
  suggestions: string[]
  grade: string
  gradeColor: string
}

// ==================== Constants ====================

const CATEGORIES = getCategoryList().map(c => ({
  key: c.key,
  label: c.nameCn,
  samples: c.sampleSize,
}))

const AGENT_INFO = [
  { name: '内容分析师', emoji: '📝', desc: '标题吸引力、正文结构、钩子使用', color: '#3b82f6' },
  { name: '视觉诊断师', emoji: '🎨', desc: '封面设计、图片质量、色彩搭配', color: '#8b5cf6' },
  { name: '增长策略师', emoji: '📈', desc: '标签策略、发布时段、平台适配', color: '#10b981' },
  { name: '用户模拟器', emoji: '👤', desc: '模拟浏览体验、互动预测', color: '#f59e0b' },
  { name: '综合裁判', emoji: '⚖️', desc: '交叉验证、最终评分、优化方案', color: '#ef4444' },
]

// ==================== Utils ====================

function generateInsights(result: ModelAResult, title: string, content: string, tagCount: number): string[] {
  const insights: string[] = []
  const d = result.dimensions

  if (d.title_quality < 60) insights.push('标题强度不足：缺少数字、感叹词或情绪钩子')
  else if (d.title_quality >= 80) insights.push('标题表现优秀：长度适中，包含有效的吸引力元素')
  else insights.push('标题基础尚可：可增加情绪词或数字进一步提升吸引力')

  const contentLen = content.length
  const p = result.baseline
  if (contentLen === 0) insights.push('正文为空：建议添加描述性内容以提升信息密度')
  else if (contentLen < 50) insights.push('正文过短：建议扩展到 100-300 字以提升互动潜力')
  else insights.push(`正文长度 ${contentLen} 字，在有效范围内`)

  if (tagCount === 0) insights.push('未添加标签：建议使用 4-8 个品类相关的热门标签')
  else if (tagCount >= 4 && tagCount <= 8) insights.push(`标签 ${tagCount} 个，数量在最优范围`)
  else insights.push(`标签 ${tagCount} 个：建议调整到 4-8 个`)

  insights.push(`品类基线：平均互动 ${p.avg_engagement.toLocaleString()}，爆款线 ${p.viral_threshold.toLocaleString()}`)

  return insights
}

function generateSuggestions(result: ModelAResult, title: string, category: string): string[] {
  const suggestions: string[] = []
  const d = result.dimensions
  const cat = CATEGORIES.find(c => c.key === category)
  const catName = cat?.label || category

  if (d.title_quality < 70) suggestions.push(`优化 ${catName} 标题：增加数字、情绪词或悬念钩子`)
  if (d.tag_strategy < 70) suggestions.push(`完善标签策略：使用 ${catName} 赛道热门标签 4-8 个`)
  if (d.engagement_potential < 60) suggestions.push('提升互动潜力：在文中加入提问或互动引导')
  if (d.visual_quality < 60) suggestions.push('增加视觉素材：配图数量在最优范围内')

  if (suggestions.length === 0) suggestions.push(`内容整体表现良好，可尝试 A/B 测试不同标题/封面组合`)

  return suggestions
}

function calcGrade(score: number): { grade: string; color: string } {
  if (score >= 90) return { grade: 'S', color: '#ffd700' }
  if (score >= 75) return { grade: 'A', color: '#4caf50' }
  if (score >= 60) return { grade: 'B', color: '#2196f3' }
  if (score >= 40) return { grade: 'C', color: '#ff9800' }
  return { grade: 'D', color: '#f44336' }
}

// ==================== Component ====================

export default function NoteRxPage() {
  // 输入表单状态
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('food')
  const [tagCount, setTagCount] = useState(4)
  const [imageCount, setImageCount] = useState(3)

  // 诊断状态
  const [diagnosing, setDiagnosing] = useState(false)
  const [result, setResult] = useState<DiagnosisResult | null>(null)

  // Tab
  const [activeTab, setActiveTab] = useState<'input' | 'result' | 'agents'>('input')
  const [agentExpanded, setAgentExpanded] = useState<number | null>(null)

  // 品类选择面板
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)

  // 执行诊断
  const runDiagnosis = useCallback(async () => {
    if (!title.trim()) return
    setDiagnosing(true)
    setActiveTab('result')

    // 模拟延迟以展示加载状态
    await new Promise(r => setTimeout(r, 600))

    const modelA = preScore(title, content, category, tagCount, imageCount)
    const insights = generateInsights(modelA, title, content, tagCount)
    const suggestions = generateSuggestions(modelA, title, category)
    const { grade, color } = calcGrade(modelA.total_score)

    setResult({ model_a: modelA, insights, suggestions, grade, gradeColor: color })
    setDiagnosing(false)
  }, [title, content, category, tagCount, imageCount])

  // 选中品类
  const selectCategory = (key: string) => {
    setCategory(key)
    setShowCategoryPicker(false)
  }

  const selectedCat = CATEGORIES.find(c => c.key === category)

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* 顶部栏 */}
      <div className="border-b border-border bg-background px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#c565ef]/20 to-[#55D9ED]/20">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">薯医 NoteRx 诊断</h1>
              <p className="text-xs text-muted-foreground">数据驱动 · 5 Agent 辩论 · AI 优化闭环</p>
            </div>
          </div>
          <a href="https://noterx.muran.tech/app/report" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="cursor-pointer gap-2">
              <ExternalLink className="h-4 w-4" />
              完整诊断版
            </Button>
          </a>
        </div>
      </div>

      {/* 统计横幅 */}
      <div className="px-6 py-3 bg-gradient-to-r from-background via-primary/5 to-background border-b border-border shrink-0">
        <div className="flex gap-6 text-sm">
          {[
            { value: '874', label: '训练笔记' },
            { value: '2,465', label: '评论分析' },
            { value: '5', label: '品类基线' },
            { value: '<50ms', label: 'Model A 评分' },
          ].map((stat, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-lg font-bold text-primary">{stat.value}</span>
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tab 栏 */}
      <div className="border-b border-border shrink-0">
        <div className="flex px-6 gap-0">
          {[
            { key: 'input', label: '诊断输入', icon: Upload },
            { key: 'result', label: '诊断报告', icon: Activity },
            { key: 'agents', label: '诊断体系', icon: Brain },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={cn(
                'flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all cursor-pointer',
                activeTab === tab.key
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-auto px-6 py-5">
        {/* ======= 诊断输入 ======= */}
        {activeTab === 'input' && (
          <div className="max-w-3xl mx-auto space-y-5">
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-base font-semibold mb-4">输入笔记信息</h3>

              {/* 品类选择 */}
              <div className="mb-4">
                <label className="text-xs text-muted-foreground mb-2 block">品类</label>
                <div className="relative">
                  <button
                    onClick={() => setShowCategoryPicker(!showCategoryPicker)}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-border bg-background text-sm cursor-pointer hover:border-primary/40 transition-colors"
                  >
                    <span>{selectedCat?.label}（{selectedCat?.samples} 条样本）</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </button>
                  {showCategoryPicker && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-10 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                      {CATEGORIES.map(cat => (
                        <button
                          key={cat.key}
                          onClick={() => selectCategory(cat.key)}
                          className={cn(
                            'w-full text-left px-4 py-2.5 text-sm hover:bg-accent cursor-pointer transition-colors',
                            category === cat.key && 'bg-primary/10 text-primary font-medium',
                          )}
                        >
                          {cat.label}
                          <span className="text-xs text-muted-foreground ml-2">{cat.samples}条样本</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 标题 */}
              <div className="mb-4">
                <label className="text-xs text-muted-foreground mb-2 block">笔记标题 *</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="例如：有幸在亲戚家吃过一回，被惊艳到了！！"
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm outline-none focus:border-primary/60 transition-colors"
                  maxLength={200}
                />
                <div className="text-right text-[11px] text-muted-foreground mt-1">{title.length}/200</div>
              </div>

              {/* 正文 */}
              <div className="mb-4">
                <label className="text-xs text-muted-foreground mb-2 block">正文内容</label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="粘贴笔记正文..."
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm outline-none focus:border-primary/60 transition-colors resize-none"
                  maxLength={5000}
                />
                <div className="text-right text-[11px] text-muted-foreground mt-1">{content.length}/5000</div>
              </div>

              {/* 参数 */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">标签数量</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={20}
                      value={tagCount}
                      onChange={e => setTagCount(Number(e.target.value))}
                      className="flex-1 accent-primary"
                    />
                    <span className="text-sm font-mono w-6 text-center">{tagCount}</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">图片数量</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={20}
                      value={imageCount}
                      onChange={e => setImageCount(Number(e.target.value))}
                      className="flex-1 accent-primary"
                    />
                    <span className="text-sm font-mono w-6 text-center">{imageCount}</span>
                  </div>
                </div>
              </div>

              {/* 诊断按钮 */}
              <Button
                onClick={runDiagnosis}
                disabled={!title.trim() || diagnosing}
                className="w-full cursor-pointer gap-2 h-11 text-base"
              >
                {diagnosing ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> 诊断中...</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> 开始 Model A 数据诊断</>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                基于 874 条真实笔记数据，纯数学评分，无需 AI 模型
              </p>
            </div>

            {/* 诊断说明 */}
            <div className="bg-gradient-to-r from-blue-500/5 to-purple-500/5 border border-blue-500/20 rounded-xl p-5">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-500" />
                关于 Model A 评分
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Model A 是 NoteRx 的量化预测引擎，基于 874 条真实小红书笔记的 Spearman 相关 + 线性回归分析训练得出。5个品类各有独立的评分权重（如美食：标题质量占 57.3%，穿搭：视觉质量占 25%）。无需调用 LLM，50ms 内完成评分。
              </p>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                如需 5 Agent 多轮深度诊断（含 LLM 分析），请点击右上角「完整诊断版」跳转到 NoteRx 官网。
              </p>
            </div>
          </div>
        )}

        {/* ======= 诊断报告 ======= */}
        {activeTab === 'result' && (
          <div className="max-w-3xl mx-auto space-y-5">
            {!result ? (
              <div className="text-center py-16 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-sm">请在「诊断输入」Tab 中输入内容并开始诊断</p>
              </div>
            ) : diagnosing ? (
              <div className="text-center py-16">
                <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-sm text-muted-foreground">正在分析...</p>
              </div>
            ) : (
              <>
                {/* 总分卡片 */}
                <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-sm text-gray-400">Model A 综合评分</div>
                      <div className="text-4xl font-bold mt-1" style={{ color: result.gradeColor }}>
                        {result.model_a.total_score}
                        <span className="text-lg ml-2">/ 100</span>
                      </div>
                    </div>
                    <div
                      className="text-5xl font-bold opacity-60"
                      style={{ color: result.gradeColor }}
                    >
                      {result.grade}
                    </div>
                  </div>
                  <div className="text-sm text-gray-300">
                    {result.model_a.level}
                  </div>
                </div>

                {/* 五维雷达 */}
                <div className="bg-card border border-border rounded-xl p-6">
                  <h3 className="text-sm font-semibold mb-4">五维评分</h3>
                  <div className="grid grid-cols-5 gap-3">
                    {[
                      { key: 'title_quality', label: '标题质量', color: '#3b82f6' },
                      { key: 'content_quality', label: '内容质量', color: '#8b5cf6' },
                      { key: 'visual_quality', label: '视觉表现', color: '#10b981' },
                      { key: 'tag_strategy', label: '标签策略', color: '#f59e0b' },
                      { key: 'engagement_potential', label: '互动潜力', color: '#ef4444' },
                    ].map(dim => {
                      const score = result.model_a.dimensions[dim.key as keyof typeof result.model_a.dimensions]
                      return (
                        <div key={dim.key} className="text-center">
                          <div className="text-xs text-muted-foreground mb-2">{dim.label}</div>
                          <div
                            className="w-full rounded-full h-1.5 bg-gray-200 mb-2"
                            style={{ background: `${dim.color}20` }}
                          >
                            <div
                              className="h-full rounded-full transition-all duration-1000"
                              style={{ width: `${score}%`, background: dim.color }}
                            />
                          </div>
                          <div className="text-sm font-bold font-mono" style={{ color: dim.color }}>
                            {Math.round(score)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* 基线对比 */}
                <div className="bg-card border border-border rounded-xl p-6">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    品类基线对比
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 rounded-lg border border-border bg-background">
                      <div className="text-xs text-muted-foreground">平均互动</div>
                      <div className="text-lg font-bold">{result.model_a.baseline.avg_engagement.toLocaleString()}</div>
                    </div>
                    <div className="p-3 rounded-lg border border-border bg-background">
                      <div className="text-xs text-muted-foreground">中位数互动</div>
                      <div className="text-lg font-bold">{result.model_a.baseline.median.toLocaleString()}</div>
                    </div>
                    <div className="p-3 rounded-lg border border-border bg-background">
                      <div className="text-xs text-muted-foreground">爆款线</div>
                      <div className="text-lg font-bold text-yellow-500">{result.model_a.baseline.viral_threshold.toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                {/* 洞察 */}
                <div className="bg-card border border-border rounded-xl p-6">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    数据洞察
                  </h3>
                  <ul className="space-y-2">
                    {result.insights.map((insight, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-primary mt-1 shrink-0">•</span>
                        <span className="text-muted-foreground">{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 优化建议 */}
                <div className="bg-card border border-border rounded-xl p-6">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    优化建议
                  </h3>
                  <ul className="space-y-3">
                    {result.suggestions.map((sug, i) => (
                      <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                        <span className="text-primary mt-0.5 shrink-0">→</span>
                        <span className="text-sm">{sug}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 再诊断 */}
                <div className="text-center pb-6">
                  <Button
                    variant="outline"
                    onClick={() => { setActiveTab('input'); setResult(null) }}
                    className="cursor-pointer"
                  >
                    重新诊断
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ======= 诊断体系 ======= */}
        {activeTab === 'agents' && (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* 5 Agent */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                5 Agent 多轮辩论体系
              </h3>
              <div className="space-y-3">
                {AGENT_INFO.map((agent, i) => (
                  <div key={i} className="border border-border rounded-lg overflow-hidden">
                    <button
                      onClick={() => setAgentExpanded(agentExpanded === i ? null : i)}
                      className="w-full flex items-center justify-between p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
                          style={{ background: `${agent.color}15` }}
                        >
                          {agent.emoji}
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-medium">{agent.name}</div>
                          <div className="text-xs text-muted-foreground">{agent.desc}</div>
                        </div>
                      </div>
                      {agentExpanded === i ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                    {agentExpanded === i && (
                      <div className="px-4 pb-3 border-t border-border pt-2">
                        <div className="text-xs text-muted-foreground leading-relaxed">
                          {i === 0 && 'Spearman 相关分析标题特征 → 线性回归计算 β 权重 → 输出标题优化建议。数据驱动：标题质量占美食 57.3%、穿搭 39.5%。'}
                          {i === 1 && '多模态分析封面图 → 色调/构图评分 → 对比品类最佳实践 → 输出视觉优化方向。穿搭品类视觉权重 25%，文字几乎无效（R²=0.017）。'}
                          {i === 2 && '发布时段分析（17:00 黄金时间）→ 标签策略评估（最优 4-8 个）→ 平台算法匹配 → 输出增长建议。'}
                          {i === 3 && '模拟用户浏览路径 → 预测互动行为 → 生成模拟评论区（含种草型/经验型/调侃型等 6 种用户画像）。'}
                          {i === 4 && '汇总 4 Agent 诊断 → 交叉验证辩论 → 输出最终 5 维雷达评分 + 可执行优化方案 + 自动生成 3 个高分改写版本。'}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 双轨分析 */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                双轨分析机制
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                  <h4 className="font-medium text-sm mb-2 text-blue-500">传统统计</h4>
                  <ul className="text-xs text-muted-foreground space-y-1.5">
                    <li>• Spearman 相关（识别显著特征）</li>
                    <li>• 线性回归（量化 β 权重）</li>
                    <li>• Kruskal-Wallis 检验（品类差异）</li>
                    <li>• K-Means 聚类 + PCA 可视化</li>
                    <li>• 35 组分析 × 5 品类</li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg bg-purple-500/5 border border-purple-500/20">
                  <h4 className="font-medium text-sm mb-2 text-purple-500">LLM 深度分析</h4>
                  <ul className="text-xs text-muted-foreground space-y-1.5">
                    <li>• MiMo-v2-Pro：内容模式分析</li>
                    <li>• MiMo-v2-Omni：封面视觉理解</li>
                    <li>• MiMo-v2-Flash：评论分类</li>
                    <li>• 3 模型 × 3 维度 × 5 品类</li>
                    <li>• 结合统计结论做深度解读</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 整合架构图 */}
            <div className="bg-gradient-to-r from-primary/5 to-purple-500/5 border border-primary/20 rounded-xl p-6">
              <h3 className="text-sm font-semibold mb-3">AiToEarn + NoteRx 整合架构</h3>
              <div className="flex flex-col items-center gap-3 text-xs">
                <div className="flex gap-4">
                  <div className="px-4 py-2 rounded-lg border bg-card shadow-sm">前端诊断页</div>
                  <div className="flex items-center text-muted-foreground">→</div>
                  <div className="px-4 py-2 rounded-lg border bg-card shadow-sm">Model A (TS 移植)</div>
                  <div className="flex items-center text-muted-foreground">↕</div>
                  <div className="px-4 py-2 rounded-lg border bg-card shadow-sm">NoteRx 后端 API</div>
                </div>
                <div className="flex gap-4 text-muted-foreground">
                  <span className="px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">无需 API Key</span>
                  <span className="px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">874 条真实数据</span>
                  <span className="px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20">5 品类基线</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
