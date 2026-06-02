/**
 * WeWorkCore — 企业微信接入配置与管理
 * 功能：扫码接入、机器人配置、人工转接规则、数据看板
 */

'use client'

import { useState } from 'react'
import {
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  MessageSquare,
  Plus,
  QrCode,
  Settings,
  Smartphone,
  Trash2,
  Users,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'

// ── 类型定义 ──

interface KeywordRule {
  id: string
  keywords: string
  reply: string
}

interface WeWorkAccount {
  id: string
  name: string
  corpName: string
  status: 'online' | 'offline' | 'error'
  botEnabled: boolean
  lastActive: string
}

// ── 初始数据 ──

const DEFAULT_WELCOME = '您好！我是 AiBrand 智能助手 🤖 有任何问题随时问我，复杂问题我会帮您转接真人客服。'

const DEFAULT_KEYWORD_RULES: KeywordRule[] = [
  { id: '1', keywords: '价格,多少钱,收费,费用', reply: '我们的定价方案非常灵活：免费版支持 3 个社交账号和 10 条/月 AI 内容，Pro 版 ¥199/月支持 10 个账号和 100 条内容。详细方案可以查看定价页～' },
  { id: '2', keywords: '注册,登录,账号', reply: '注册非常简单！访问 aibrand.cn 点击"免费开始"，输入邮箱和密码即可。也支持手机号注册。遇到问题随时找我～' },
  { id: '3', keywords: '退款,退费,不满意', reply: '我们提供 7 天无理由退款保障。如果不满意，请联系客服处理退款，款项将在 3-5 个工作日内原路退回。' },
]

const MOCK_ACCOUNTS: WeWorkAccount[] = [
  {
    id: 'ww1',
    name: 'AiBrand官方客服',
    corpName: '艾布兰德科技',
    status: 'online',
    botEnabled: true,
    lastActive: '2 分钟前',
  },
]

// ── 子组件 ──

/** 数据统计卡片 */
function StatCard({ label, value, icon, color }: {
  label: string
  value: string
  icon: React.ReactNode
  color: string
}) {
  return (
    <div className="text-center p-4 rounded-xl border border-border/50">
      <div className={cn('inline-flex p-2 rounded-lg mb-2', `bg-${color}-500/10`)}>
        {icon}
      </div>
      <div className={cn('text-lg font-bold', `text-${color}-500`)}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

/** 关键词规则行 */
function KeywordRuleRow({
  rule,
  onChange,
  onDelete,
}: {
  rule: KeywordRule
  onChange: (r: KeywordRule) => void
  onDelete: () => void
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_40px] gap-2 items-start p-3 rounded-lg bg-muted/30 border border-border/50">
      <Input
        placeholder="关键词，用逗号分隔"
        value={rule.keywords}
        onChange={e => onChange({ ...rule, keywords: e.target.value })}
        className="text-xs h-9"
      />
      <Input
        placeholder="自动回复内容"
        value={rule.reply}
        onChange={e => onChange({ ...rule, reply: e.target.value })}
        className="text-xs h-9"
      />
      <Button
        variant="ghost"
        size="sm"
        className="h-9 w-9 p-0 cursor-pointer text-muted-foreground hover:text-red-500"
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

// ── 主组件 ──

export default function WeWorkCore() {
  const [connected, setConnected] = useState(true)
  const [showQR, setShowQR] = useState(false)
  const [botEnabled, setBotEnabled] = useState(true)
  const [autoReply, setAutoReply] = useState(true)
  const [keywordMatch, setKeywordMatch] = useState(true)
  const [workHoursOnly, setWorkHoursOnly] = useState(false)
  const [welcomeMsg, setWelcomeMsg] = useState(DEFAULT_WELCOME)
  const [keywordRules, setKeywordRules] = useState<KeywordRule[]>(DEFAULT_KEYWORD_RULES)
  const [accounts] = useState<WeWorkAccount[]>(MOCK_ACCOUNTS)
  const [expandedSection, setExpandedSection] = useState<'bot' | 'transfer' | null>('bot')

  // 转接规则
  const [transferKeywordMiss, setTransferKeywordMiss] = useState(true)
  const [transferUserRequest, setTransferUserRequest] = useState(true)
  const [transferNegativeSentiment, setTransferNegativeSentiment] = useState(true)

  const handleAddKeywordRule = () => {
    const newRule: KeywordRule = {
      id: Date.now().toString(),
      keywords: '',
      reply: '',
    }
    setKeywordRules(prev => [...prev, newRule])
  }

  const handleUpdateKeywordRule = (id: string, updated: KeywordRule) => {
    setKeywordRules(prev => prev.map(r => (r.id === id ? updated : r)))
  }

  const handleDeleteKeywordRule = (id: string) => {
    setKeywordRules(prev => prev.filter(r => r.id !== id))
  }

  const handleGenerateQR = () => {
    setShowQR(true)
    toast.success('接入二维码已生成，请使用企业微信管理员扫码授权')
  }

  const handleSaveConfig = () => {
    toast.success('配置已保存')
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="max-w-5xl mx-auto w-full px-4 md:px-6 py-6 space-y-6">

        {/* ── 标题 + 接入状态 ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-(--brand-purple)" />
              企业微信接入
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              接入企业微信，AI 机器人 + 真人客服混合服务
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={cn(
              'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full',
              connected ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground',
            )}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full', connected ? 'bg-green-500' : 'bg-muted-foreground')} />
              {connected ? '已接入' : '未接入'}
            </span>
            <Button
              className="cursor-pointer"
              size="sm"
              style={!connected ? { background: 'var(--brand-gradient)' } : undefined}
              variant={connected ? 'outline' : undefined}
              onClick={() => setConnected(!connected)}
            >
              {connected ? '断开连接' : '立即接入'}
            </Button>
          </div>
        </div>

        {/* ── 数据看板 ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="AI 接待数" value="1,286" icon={<Bot className="h-4 w-4 text-blue-500" />} color="blue" />
          <StatCard label="转人工数" value="42" icon={<Users className="h-4 w-4 text-amber-500" />} color="amber" />
          <StatCard label="平均响应" value="3s" icon={<Zap className="h-4 w-4 text-green-500" />} color="green" />
          <StatCard label="满意度" value="4.8/5" icon={<Check className="h-4 w-4 text-(--brand-purple)" />} color="(var(--brand-purple))" />
        </div>

        {/* ── 机器人配置 ── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <button
            onClick={() => setExpandedSection(expandedSection === 'bot' ? null : 'bot')}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-blue-500" />
              <span className="font-medium text-sm">机器人配置</span>
            </div>
            {expandedSection === 'bot' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {expandedSection === 'bot' && (
            <div className="border-t border-border px-4 py-4 space-y-4 animate-in fade-in">
              {/* 开关行 */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">启用 AI 机器人</div>
                  <div className="text-xs text-muted-foreground">开启后自动回复客户消息</div>
                </div>
                <Switch checked={botEnabled} onCheckedChange={setBotEnabled} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">自动回复</div>
                  <div className="text-xs text-muted-foreground">根据关键词匹配自动回复</div>
                </div>
                <Switch checked={autoReply} onCheckedChange={setAutoReply} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">关键词匹配</div>
                  <div className="text-xs text-muted-foreground">识别用户消息中的关键词并回复</div>
                </div>
                <Switch checked={keywordMatch} onCheckedChange={setKeywordMatch} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">仅工作时间</div>
                  <div className="text-xs text-muted-foreground">非工作时间自动回复"已下班"消息</div>
                </div>
                <Switch checked={workHoursOnly} onCheckedChange={setWorkHoursOnly} />
              </div>

              {/* 欢迎语 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">欢迎语</label>
                <textarea
                  value={welcomeMsg}
                  onChange={e => setWelcomeMsg(e.target.value)}
                  className="w-full h-20 px-3 py-2 rounded-xl border border-border bg-background text-sm resize-none outline-none focus:border-(--brand-purple)/60"
                />
              </div>

              {/* 关键词规则 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">关键词回复规则</label>
                  <Button variant="ghost" size="sm" className="h-7 text-xs cursor-pointer gap-1" onClick={handleAddKeywordRule}>
                    <Plus className="h-3 w-3" /> 添加规则
                  </Button>
                </div>
                <div className="space-y-2">
                  {keywordRules.map(rule => (
                    <KeywordRuleRow
                      key={rule.id}
                      rule={rule}
                      onChange={updated => handleUpdateKeywordRule(rule.id, updated)}
                      onDelete={() => handleDeleteKeywordRule(rule.id)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── 人工转接规则 ── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <button
            onClick={() => setExpandedSection(expandedSection === 'transfer' ? null : 'transfer')}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-500" />
              <span className="font-medium text-sm">人工转接规则</span>
            </div>
            {expandedSection === 'transfer' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {expandedSection === 'transfer' && (
            <div className="border-t border-border px-4 py-4 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">关键词无法匹配时转人工</div>
                  <div className="text-xs text-muted-foreground">机器人无法识别问题自动转接</div>
                </div>
                <Switch checked={transferKeywordMiss} onCheckedChange={setTransferKeywordMiss} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">用户主动请求转接</div>
                  <div className="text-xs text-muted-foreground">发送"人工""客服"等关键词时转接</div>
                </div>
                <Switch checked={transferUserRequest} onCheckedChange={setTransferUserRequest} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">负面情绪自动转接</div>
                  <div className="text-xs text-muted-foreground">AI 检测到用户愤怒/失望情绪时转接</div>
                </div>
                <Switch checked={transferNegativeSentiment} onCheckedChange={setTransferNegativeSentiment} />
              </div>
            </div>
          )}
        </div>

        {/* ── 扫码接入 ── */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
            <QrCode className="h-4 w-4 text-(--brand-purple)" />
            接入方式
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 扫码接入 */}
            <div className="rounded-xl border-2 border-dashed border-border p-8 text-center hover:border-(--brand-purple)/40 transition-colors">
              <div className="inline-flex p-4 rounded-2xl bg-(--brand-gradient-glow) mb-4">
                <Smartphone className="h-10 w-10 text-(--brand-purple)" />
              </div>
              <h4 className="font-medium mb-2">扫码接入企业微信</h4>
              <p className="text-xs text-muted-foreground mb-4">
                使用企业微信管理员扫描二维码，一键授权接入
              </p>
              {showQR ? (
                <div className="space-y-3">
                  <div className="mx-auto w-40 h-40 rounded-xl bg-muted flex items-center justify-center border-2 border-(--brand-purple)/30">
                    <QrCode className="h-24 w-24 text-(--brand-purple)/40" />
                  </div>
                  <p className="text-[10px] text-muted-foreground">请使用企业微信扫码</p>
                </div>
              ) : (
                <Button
                  onClick={handleGenerateQR}
                  className="cursor-pointer"
                  style={{ background: 'var(--brand-gradient)' }}
                >
                  <QrCode className="h-4 w-4 mr-1" /> 生成接入二维码
                </Button>
              )}
            </div>

            {/* 配置说明 */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">接入步骤</h4>
              <div className="space-y-3">
                {[
                  { step: '01', title: '生成二维码', desc: '点击左侧按钮生成专属接入二维码' },
                  { step: '02', title: '管理员扫码', desc: '企业微信管理员扫码授权应用权限' },
                  { step: '03', title: '配置机器人', desc: '设置欢迎语、关键词规则和转接逻辑' },
                  { step: '04', title: '启用服务', desc: '开启 AI 机器人，开始智能客服服务' },
                ].map(s => (
                  <div key={s.step} className="flex items-start gap-3">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-(--brand-gradient-glow) text-xs font-bold text-(--brand-purple) shrink-0">
                      {s.step}
                    </span>
                    <div>
                      <div className="text-sm font-medium">{s.title}</div>
                      <div className="text-xs text-muted-foreground">{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── 已接入账号列表 ── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">已接入账号</span>
            <span className="text-xs text-muted-foreground ml-1">({accounts.length})</span>
          </div>
          <div className="divide-y divide-border">
            {accounts.map(acc => (
              <div key={acc.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="inline-flex p-2.5 rounded-xl bg-green-500/10">
                    <MessageSquare className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{acc.name}</div>
                    <div className="text-xs text-muted-foreground">{acc.corpName}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {acc.lastActive}
                  </div>
                  <span className={cn(
                    'flex items-center gap-1 text-xs px-2 py-1 rounded-full',
                    acc.status === 'online' ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground',
                  )}
                  >
                    <span className={cn('w-1.5 h-1.5 rounded-full', acc.status === 'online' ? 'bg-green-500' : 'bg-muted-foreground')} />
                    {acc.status === 'online' ? '在线' : '离线'}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Bot className="h-3 w-3" />
                    {acc.botEnabled ? 'Bot 已启用' : 'Bot 未启用'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 保存按钮 ── */}
        <div className="flex justify-end">
          <Button
            onClick={handleSaveConfig}
            className="cursor-pointer"
            size="lg"
            style={{ background: 'var(--brand-gradient)' }}
          >
            <Check className="h-4 w-4 mr-1" /> 保存配置
          </Button>
        </div>

      </div>
    </div>
  )
}
