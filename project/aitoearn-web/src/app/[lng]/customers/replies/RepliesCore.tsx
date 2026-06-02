/**
 * RepliesCore - 对外客服（帮用户回复客户）
 * 跨平台评论聚合 + AI 智能回复 + 品牌知识库 + 风格学习
 */

'use client'

import { useState } from 'react'
import {
  Bot,
  Check,
  Copy,
  Eye,
  Heart,
  MessageCircle,
  MessageSquare,
  Send,
  Sparkles,
  Star,
  ThumbsUp,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'
import { REPLY_TEMPLATES } from '@/lib/knowledge/customer-service-data'

// ── 模拟评论数据 ──

interface Comment {
  id: string
  platform: string
  platformIcon: string
  author: string
  avatar: string
  content: string
  time: string
  type: '咨询' | '好评' | '投诉' | '合作'
  postTitle: string
  aiReply: string
  replied: boolean
}

const MOCK_COMMENTS: Comment[] = [
  {
    id: 'c1',
    platform: '小红书',
    platformIcon: '📕',
    author: '美妆控小A',
    avatar: '👩',
    content: '这个卸妆油真的温和吗？我皮肤比较敏感，怕用了会泛红',
    time: '5分钟前',
    type: '咨询',
    postTitle: '学生党必入！成分党教你选对卸妆油',
    aiReply: '谢谢你的关注！这款卸妆油核心成分是天然橄榄油+氨基酸，专门为敏感肌研发的。0酒精0香精，我自己也是敏感肌，用了一个月没有任何不适。建议第一次使用先在耳后测试一下，如果不放心可以私信我了解更多成分细节～',
    replied: false,
  },
  {
    id: 'c2',
    platform: '抖音',
    platformIcon: '🎵',
    author: '爱吃火锅的老王',
    avatar: '👨',
    content: '昨天去吃了你们家火锅！毛肚真的绝了，新鲜得不行',
    time: '12分钟前',
    type: '好评',
    postTitle: '我心中排名第一的重庆火锅探店',
    aiReply: '哇！感谢老王的好评！🥰 我们的毛肚确实是每天从重庆空运过来的，你吃的出来新鲜说明你是真正的吃货！下次来报暗号"老王"，送一份招牌脑花～',
    replied: false,
  },
  {
    id: 'c3',
    platform: '公众号',
    platformIcon: '📰',
    author: '企业主老张',
    avatar: '🧔',
    content: '看了你们的行业分析，很受启发。我们公司在做数字化转型，想了解你们的咨询服务怎么收费？',
    time: '28分钟前',
    type: '合作',
    postTitle: '2026年中国中小企业数字化转型趋势报告',
    aiReply: '感谢老张的认可和关注！关于数字化转型咨询服务的具体方案和报价，我建议我们约一个15分钟的线上沟通，深入了解您公司的具体情况后给出针对性方案。方便的话可以私信您的联系方式，我安排专业顾问与您对接。期待合作！',
    replied: false,
  },
  {
    id: 'c4',
    platform: '小红书',
    platformIcon: '📕',
    author: '小白用户',
    avatar: '👩‍🦰',
    content: '买了你们推荐的面霜，用了一个周完全没效果，感觉被坑了',
    time: '1小时前',
    type: '投诉',
    postTitle: '年度爱用护肤品推荐合集',
    aiReply: '非常抱歉给你带来了不好的体验！我们非常重视你的反馈。护肤品效果因人而异，通常需要持续使用2-4周才能看到明显改善。不过你的体验对我们很重要——方便私信我你的肤质和使用方式吗？我亲自帮你分析问题所在，如果确实不适合你，我们也可以协助你处理售后。你的信任是我们最在意的。',
    replied: false,
  },
  {
    id: 'c5',
    platform: 'B站',
    platformIcon: '📺',
    author: '数码极客小杰',
    avatar: '🧑‍💻',
    content: 'UP主这个测评太专业了！想问一下这耳机和索尼那款比怎么样？',
    time: '2小时前',
    type: '咨询',
    postTitle: '2026蓝牙耳机横评：300元以内最佳选择',
    aiReply: '谢谢小杰的认可！和索尼同价位款对比的话：这款的优势是降噪更强（-35dB vs -28dB）和续航更长（40h vs 30h）；索尼的优势是音质调教更细腻和品牌生态好。如果你更看重降噪和续航，这款性价比很高；如果你追求极致音质，建议加预算上索尼。希望帮到你！',
    replied: false,
  },
]

const PLATFORM_FILTERS = ['全部', '小红书', '抖音', 'B站', '公众号']
const TYPE_FILTERS = ['全部', '咨询', '好评', '投诉', '合作']

export default function RepliesCore() {
  const [comments, setComments] = useState<Comment[]>(MOCK_COMMENTS)
  const [platform, setPlatform] = useState('全部')
  const [type, setType] = useState('全部')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [customReply, setCustomReply] = useState<Record<string, string>>({})
  const [brandKnowledge, setBrandKnowledge] = useState('')

  const filtered = comments.filter(c =>
    (platform === '全部' || c.platform === platform)
    && (type === '全部' || c.type === type),
  )

  const handleSendReply = (id: string) => {
    const reply = customReply[id] || comments.find(c => c.id === id)?.aiReply || ''
    setComments(prev => prev.map(c => c.id === id ? { ...c, replied: true, aiReply: reply } : c))
    setExpandedId(null)
    toast.success('已回复')
  }

  const handleCopyAndReply = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCustomReply(prev => ({ ...prev, [id]: text }))
    toast.success('回复内容已复制，可粘贴到对应平台')
    setComments(prev => prev.map(c => c.id === id ? { ...c, replied: true } : c))
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="max-w-5xl mx-auto w-full px-4 md:px-6 py-6 space-y-6">

        {/* 标题 + 知识库配置 */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-500" />
              客户回复助手
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {comments.filter(c => !c.replied).length} 条待回复 · AI 为你准备好了回复建议
            </p>
          </div>
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="输入你的品牌/产品信息，AI 回复更精准..."
              value={brandKnowledge}
              onChange={e => setBrandKnowledge(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-xs outline-none focus:border-green-500/60"
            />
            <p className="text-[10px] text-muted-foreground mt-1">💡 告诉 AI 你的品牌信息，回复会更像你自己</p>
          </div>
        </div>

        {/* 筛选 */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">平台</span>
            {PLATFORM_FILTERS.map(p => (
              <button key={p} onClick={() => setPlatform(p)}
                className={cn('px-2.5 py-1 rounded-full text-xs cursor-pointer transition-all',
                  platform === p ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70 text-muted-foreground',
                )}>{p}</button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">类型</span>
            {TYPE_FILTERS.map(t => (
              <button key={t} onClick={() => setType(t)}
                className={cn('px-2.5 py-1 rounded-full text-xs cursor-pointer transition-all',
                  type === t ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70 text-muted-foreground',
                )}>{t}</button>
            ))}
          </div>
        </div>

        {/* 回复模板快捷入口 */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/30">
          <span className="text-xs font-medium text-muted-foreground shrink-0">快捷模板：</span>
          {REPLY_TEMPLATES.map(t => (
            <button key={t.id}
              className="px-2.5 py-1 rounded-full bg-background border border-border text-xs cursor-pointer hover:border-green-500/40 transition-all"
              title={t.template.slice(0, 50)}
            >
              {t.scene}
            </button>
          ))}
        </div>

        {/* 评论列表 */}
        <div className="space-y-4">
          {filtered.map(comment => {
            const isExpanded = expandedId === comment.id
            return (
              <div key={comment.id}
                className={cn(
                  'rounded-xl border bg-card overflow-hidden transition-all',
                  comment.type === '投诉' ? 'border-red-500/20' : 'border-border',
                  comment.replied && 'opacity-60',
                )}>
                {/* 评论内容 */}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl shrink-0">{comment.platformIcon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-muted-foreground">{comment.platform}</span>
                        <span className={cn(
                          'px-1.5 py-0.5 rounded text-[10px] font-medium',
                          comment.type === '咨询' && 'bg-blue-500/10 text-blue-700',
                          comment.type === '好评' && 'bg-green-500/10 text-green-700',
                          comment.type === '投诉' && 'bg-red-500/10 text-red-700',
                          comment.type === '合作' && 'bg-purple-500/10 text-purple-700',
                        )}>{comment.type}</span>
                        <span className="text-xs text-muted-foreground">· {comment.time}</span>
                        {comment.replied && <span className="text-xs text-green-600">· 已回复</span>}
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{comment.author}</span>
                      </div>
                      <p className="text-sm text-foreground/80">{comment.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        来自：{comment.postTitle}
                      </p>
                    </div>
                  </div>
                </div>

                {/* AI 回复建议 */}
                {!comment.replied && (
                  <div className="border-t border-border px-4 py-3 bg-green-500/5">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="inline-flex p-1 rounded bg-green-500/10">
                        <Bot className="h-3.5 w-3.5 text-green-600" />
                      </div>
                      <span className="text-xs font-medium text-green-700">AI 回复建议</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">基于你的品牌知识生成</span>
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed">{comment.aiReply}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        size="sm"
                        className="h-7 text-xs cursor-pointer gap-1 bg-green-600 hover:bg-green-700"
                        onClick={() => handleCopyAndReply(comment.id, comment.aiReply)}
                      >
                        <Copy className="h-3 w-3" /> 复制并标记已回
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs cursor-pointer gap-1"
                        onClick={() => setExpandedId(isExpanded ? null : comment.id)}
                      >
                        <Sparkles className="h-3 w-3" /> 修改后再回
                      </Button>
                    </div>

                    {/* 自定义编辑 */}
                    {isExpanded && (
                      <div className="mt-3 space-y-2 animate-in fade-in">
                        <textarea
                          value={customReply[comment.id] || comment.aiReply}
                          onChange={e => setCustomReply(prev => ({ ...prev, [comment.id]: e.target.value }))}
                          className="w-full h-20 px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none outline-none focus:border-green-500/60"
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            className="h-7 text-xs cursor-pointer"
                            onClick={() => handleSendReply(comment.id)}
                          >
                            <Send className="h-3 w-3 mr-1" /> 确认回复
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">暂无该类评论</p>
          </div>
        )}

      </div>
    </div>
  )
}
