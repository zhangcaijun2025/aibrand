/**
 * ContentCore - 内容中枢
 * AI 快捷输入栏按原版 AiBatchGenerateBar 布局：左侧图片区 + 右侧 textarea + 底部工具栏
 */

'use client'

import { useState, useRef } from 'react'
import {
  ArrowRight, ArrowUp, Check, Clock, Coins, Copy, Edit3, ExternalLink,
  Eye, Film, Grid2x2, Image, Layers, Loader2, Lock, Monitor,
  MoreHorizontal, PenLine, Plus, RotateCcw, Ruler, Save, Search, Send,
  Sparkles, Trash2, Upload, Video, X, Zap,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { VideoCreateModal } from '@/components/VideoCreateModal'
import { QuotaBar } from '@/components/QuotaBar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Slider } from '@/components/ui/slider'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'

// ═══════════════════════════════ 类型 ═══════════════════════════════
type ContentType = 'video' | 'image_text'
interface Material {
  id: string; title: string; platform: string; icon: string
  status: 'draft'|'generating'|'ready'|'published'
  type: 'article'|'video'|'image'; createdAt: string; score: number
}

// ═══════════════════════════════ 常量 ═══════════════════════════════
const PROMPT_MAX = 2000
const ASPECT_RATIOS = [
  { label: '9:16', w: 10, h: 18 }, { label: '1:1', w: 14, h: 14 },
  { label: '16:9', w: 18, h: 10 }, { label: '3:4', w: 12, h: 16 },
  { label: '4:3', w: 16, h: 12 },
]
const PLATFORMS = [
  { id:'xhs',name:'小红书',icon:'📕' }, { id:'douyin',name:'抖音',icon:'🎵' },
  { id:'gzh',name:'公众号',icon:'📰' }, { id:'bilibili',name:'B站',icon:'📺' },
]

function seedMaterials(): Material[] { return [
  {id:'1',title:'学生党必入！成分党教你选对卸妆油',platform:'xhs',icon:'📕',status:'ready',type:'article',createdAt:'10分钟前',score:85},
  {id:'2',title:'卸妆油乳化实测对比视频',platform:'douyin',icon:'🎵',status:'generating',type:'video',createdAt:'15分钟前',score:72},
  {id:'3',title:'端午节促销活动方案',platform:'xhs',icon:'📕',status:'draft',type:'article',createdAt:'1小时前',score:90},
  {id:'4',title:'卸妆产品横评图文',platform:'gzh',icon:'📰',status:'ready',type:'article',createdAt:'2小时前',score:78},
  {id:'5',title:'敏感肌护肤知识卡片',platform:'xhs',icon:'📕',status:'published',type:'image',createdAt:'昨天',score:92},
  {id:'6',title:'B站开箱测评脚本',platform:'bilibili',icon:'📺',status:'draft',type:'article',createdAt:'昨天',score:65},
]}

const statusMap: Record<string,{label:string;cls:string}> = {
  draft:{label:'草稿',cls:'bg-amber-100 text-amber-700'},
  generating:{label:'生成中',cls:'bg-blue-100 text-blue-700 animate-pulse'},
  ready:{label:'待发布',cls:'bg-green-100 text-green-700'},
  published:{label:'已发布',cls:'bg-muted text-muted-foreground'},
}

export default function ContentCore() {
  // ═══ AI 输入栏状态（按原版 AiBatchGenerateBar） ═══
  const [prompt, setPrompt] = useState('')
  const [contentType, setContentType] = useState<ContentType>('video')
  const [modelType, setModelType] = useState('grok-imagine-video')
  const [imageModel, setImageModel] = useState('gemini-3.1-flash-image-preview')
  const [aspectRatio, setAspectRatio] = useState('9:16')
  const [duration, setDuration] = useState(8)
  const [imageCount, setImageCount] = useState(3)
  const [imageSize, setImageSize] = useState('1K')
  const [quantity, setQuantity] = useState(1)
  const [isDraftMode, setIsDraftMode] = useState(true)
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['xhs','douyin','gzh','bilibili'])
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const dragCountRef = useRef(0)

  // ═══ 全局 ═══
  const [videoModalOpen, setVideoModalOpen] = useState(false)
  const [materials, setMaterials] = useState<Material[]>(seedMaterials())
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [batchMode, setBatchMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [panel, setPanel] = useState<'list'|'write'|'media'>('list')
  const [freeTitle, setFreeTitle] = useState('')
  const [freeContent, setFreeContent] = useState('')
  const [mediaPrompt, setMediaPrompt] = useState('')
  const [mediaTab, setMediaTab] = useState<'image'|'video'>('image')
  const [mediaGenerating, setMediaGenerating] = useState(false)
  const [mediaResults, setMediaResults] = useState<{url:string;model:string;type:string}[]>([])

  // ═══ 派生 ═══
  const filtered = materials.filter(m => {
    if (search && !m.title.includes(search)) return false
    if (statusFilter !== 'all' && m.status !== statusFilter) return false
    return true
  })

  // ═══ 拖拽处理 ═══
  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); dragCountRef.current++; if(dragCountRef.current===1) setIsDragging(true) }
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault() }
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); dragCountRef.current--; if(dragCountRef.current===0) setIsDragging(false) }
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); dragCountRef.current=0; setIsDragging(false); /* TODO: 文件上传 */ }

  // ═══ 生成 ═══
  const handleSubmit = async () => {
    if(!prompt.trim()){toast.warning('请输入创作需求');return}
    setIsUploading(true)
    await new Promise(r=>setTimeout(r,1500))
    const p = PLATFORMS.find(x=>x.id===selectedPlatforms[0])||PLATFORMS[0]!
    setMaterials(prev=>[{id:`gen-${Date.now()}`,title:prompt.slice(0,40),platform:p.id,icon:p.icon,status:'generating',type:contentType==='video'?'video':'article',createdAt:'刚刚',score:75+Math.floor(Math.random()*20)},...prev])
    setPrompt('');setIsUploading(false);toast.success(`${isDraftMode?'草稿生成':'素材生成'}已启动`)
  }

  const handleReset = () => { setPrompt(''); setAspectRatio('9:16'); setDuration(8); setQuantity(1); setIsDraftMode(true); setContentType('video') }

  // ═══ 列表操作 ═══
  const toggleSel = (id:string) => setSelected(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n})
  const clearSel = () => {setSelected(new Set());setBatchMode(false)}
  const batchDel = () => {setMaterials(p=>p.filter(m=>!selected.has(m.id)));clearSel();toast.success('已删除')}

  const handleMediaGen = async () => { if(!mediaPrompt.trim())return; setMediaGenerating(true); await new Promise(r=>setTimeout(r,2500)); setMediaResults(p=>[{url:`https://placehold.co/${mediaTab==='image'?'600x400':'600x340'}/3B82F6/FFF?text=${encodeURIComponent('AI生成')}`,model:'',type:mediaTab},...p].slice(0,8)); setMediaGenerating(false);toast.success('完成') }

  return (
    <div className="flex flex-col h-full">
      {/* ═══════════════════════════════════════════════════════════
          ① AI 快捷输入栏 — 按原版 AiBatchGenerateBar 布局
            上半区：左侧上传区 + 右侧 textarea + 右上角操作按钮
            下半区：工具栏（内容类型、模型、比例、时长、数量、平台、生成按钮）
          ═══════════════════════════════════════════════════════════ */}
      <div
        className="shrink-0 border-b border-border bg-card"
        onDragEnter={handleDragEnter} onDragOver={handleDragOver}
        onDragLeave={handleDragLeave} onDrop={handleDrop}
      >
        {/* 上半区 */}
        <div className="flex items-stretch gap-3 px-4 pt-4 pb-2">
          {/* 左侧：上传区（图片堆叠占位） */}
          <div className="shrink-0 pt-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="w-16 h-16 rounded-xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors text-muted-foreground"
                    disabled={isUploading}>
                    <Upload className="h-5 w-5" />
                    <span className="text-[9px]">上传</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>拖拽或点击上传图片/视频素材</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* 右侧：textarea */}
          <div className="relative flex-1 min-w-0">
            <textarea
              className="w-full resize-none bg-transparent text-sm placeholder:text-muted-foreground/60 focus-visible:outline-none min-h-[72px] max-h-[140px] pr-16 leading-relaxed"
              placeholder="描述你想创作的内容，AI 将自动适配多平台格式…&#10;例如：新品牌卸妆油¥129，天然橄榄油+氨基酸，目标学生党敏感肌"
              value={prompt}
              onChange={e=>setPrompt(e.target.value)}
              maxLength={PROMPT_MAX}
              rows={3}
            />
            {/* 右上角操作按钮 */}
            <div className="absolute top-0 right-0 flex flex-col gap-0.5">
              <button className="p-1 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                onClick={handleReset} title="重置配置">
                <RotateCcw className="h-4 w-4" />
              </button>
              {prompt && (
                <button className="p-1 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  onClick={()=>setPrompt('')} title="清空">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 下半区：工具栏 — 按原版 ToolBarInline 布局 */}
        <div className="px-4 pb-3 flex items-center gap-1.5 flex-wrap">
          {/* 内容类型切换 */}
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            {[{k:'video'as ContentType,l:'视频',i:<Video className="h-3.5 w-3.5"/>},{k:'image_text'as ContentType,l:'图文',i:<Image className="h-3.5 w-3.5"/>}].map(ct=>(
              <button key={ct.k} onClick={()=>setContentType(ct.k)}
                className={cn('flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-all',
                  contentType===ct.k?'bg-background text-foreground shadow-sm':'text-muted-foreground hover:text-foreground')}>
                {ct.i}{ct.l}
              </button>))}
          </div>

          <div className="w-px h-5 bg-border mx-0.5" />

          {/* 视频模型选择 */}
          {contentType==='video' && (
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-muted text-xs cursor-pointer hover:bg-muted/70 transition-colors">
                  <Video className="h-3.5 w-3.5"/>
                  <span className="max-w-[80px] truncate">Grok Video</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-52 p-1.5" align="start">
                <div className="text-[10px] text-muted-foreground px-2 py-1 mb-1 border-b border-border">视频生成模型</div>
                <button onClick={()=>setModelType('grok-imagine-video')}
                  className={cn('w-full text-left px-2.5 py-1.5 rounded text-xs cursor-pointer hover:bg-muted transition-colors',
                    modelType==='grok-imagine-video'&&'bg-primary/10 text-primary font-medium')}>
                  <div className="font-medium">Grok Video</div>
                  <div className="text-[10px] text-muted-foreground">xAI · 1-15秒 · 720p · 7种比例</div>
                </button>
              </PopoverContent>
            </Popover>
          )}

          {/* 图片模型选择 */}
          {contentType==='image_text' && (
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-muted text-xs cursor-pointer hover:bg-muted/70 transition-colors">
                  <Image className="h-3.5 w-3.5"/>
                  <span className="max-w-[90px] truncate">{imageModel==='gemini-3.1-flash-image-preview'?'NanoBanana 2':'NanoBanana Pro'}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-1.5" align="start">
                <div className="text-[10px] text-muted-foreground px-2 py-1 mb-1 border-b border-border">图片生成模型</div>
                {[
                  {v:'gemini-3.1-flash-image-preview',l:'NanoBanana 2',d:'Gemini 3.1 Flash · 最快速度',t:'1K/2K/4K · 最多14张参考图 · 9种比例'},
                  {v:'gemini-3-pro-image-preview',l:'NanoBanana Pro',d:'Gemini 3 Pro · 最高质量',t:'1K/2K/4K · 最多14张参考图 · 9种比例'},
                ].map(m=>(
                  <button key={m.v} onClick={()=>setImageModel(m.v)}
                    className={cn('w-full text-left px-2.5 py-2 rounded text-xs cursor-pointer hover:bg-muted transition-colors',
                      imageModel===m.v&&'bg-primary/10 text-primary font-medium')}>
                    <div className="font-medium">{m.l}</div>
                    <div className="text-[10px] text-muted-foreground">{m.d}</div>
                    <div className="text-[10px] text-muted-foreground/60">{m.t}</div>
                  </button>))}
              </PopoverContent>
            </Popover>
          )}

          <div className="w-px h-5 bg-border mx-0.5" />

          {/* 比例选择 */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-muted text-xs cursor-pointer hover:bg-muted/70 transition-colors">
                <Ruler className="h-3.5 w-3.5"/>{aspectRatio}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-1.5" align="start">
              <div className="grid grid-cols-2 gap-1">
                {ASPECT_RATIOS.map(r=>(
                  <button key={r.label} onClick={()=>setAspectRatio(r.label)}
                    className={cn('flex items-center gap-2 px-2.5 py-1.5 rounded text-xs cursor-pointer hover:bg-muted transition-colors',
                      aspectRatio===r.label&&'bg-primary/10 text-primary font-medium')}>
                    <span className="border border-current rounded" style={{width:r.w,height:r.h}}/>{r.label}
                  </button>))}
              </div>
            </PopoverContent>
          </Popover>

          {contentType==='video'?(
            <>
              <div className="w-px h-5 bg-border mx-0.5" />
              {/* 时长 */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-muted text-xs cursor-pointer hover:bg-muted/70 transition-colors">
                    <Clock className="h-3.5 w-3.5"/>{duration}s
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-3" align="start">
                  <div className="text-xs font-medium mb-2">视频时长：{duration}秒</div>
                  <Slider value={[duration]} min={4} max={15} step={1} onValueChange={([v])=>setDuration(v!)} />
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1"><span>4s</span><span>15s</span></div>
                </PopoverContent>
              </Popover>
            </>
          ):(
            <>
              <div className="w-px h-5 bg-border mx-0.5" />
              {/* 图片数量 */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-muted text-xs cursor-pointer hover:bg-muted/70 transition-colors">
                    <Grid2x2 className="h-3.5 w-3.5"/>{imageCount}张
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-1.5" align="start">
                  <div className="grid grid-cols-3 gap-1">
                    {[1,2,3,4,6,9].map(n=>(
                      <button key={n} onClick={()=>setImageCount(n)}
                        className={cn('px-2.5 py-1.5 rounded text-xs cursor-pointer hover:bg-muted transition-colors text-center',
                          imageCount===n&&'bg-primary/10 text-primary font-medium')}>{n}张</button>))}
                  </div>
                </PopoverContent>
              </Popover>
              <div className="w-px h-5 bg-border mx-0.5" />
              {/* 图片大小 */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-muted text-xs cursor-pointer hover:bg-muted/70 transition-colors">
                    <Monitor className="h-3.5 w-3.5"/>{imageSize}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-32 p-1.5" align="start">
                  {['1K','2K','4K'].map(s=>(
                    <button key={s} onClick={()=>setImageSize(s)}
                      className={cn('w-full text-left px-2.5 py-1.5 rounded text-xs cursor-pointer hover:bg-muted transition-colors',
                        imageSize===s&&'bg-primary/10 text-primary font-medium')}>{s}</button>))}
                </PopoverContent>
              </Popover>
            </>
          )}

          <div className="w-px h-5 bg-border mx-0.5" />

          {/* 数量 */}
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            {[1,2,3,5].map(n=>(
              <button key={n} onClick={()=>setQuantity(n)}
                className={cn('px-2 py-1 rounded-md text-xs font-medium cursor-pointer transition-all',
                  quantity===n?'bg-background text-foreground shadow-sm':'text-muted-foreground hover:text-foreground')}>
                ×{n}
              </button>))}
          </div>

          <div className="w-px h-5 bg-border mx-0.5" />

          {/* 平台选择 */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-muted text-xs cursor-pointer hover:bg-muted/70 transition-colors">
                <Layers className="h-3.5 w-3.5"/>{selectedPlatforms.length}个平台
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-1.5" align="start">
              {PLATFORMS.map(p=>(
                <button key={p.id} onClick={()=>setSelectedPlatforms(prev=>prev.includes(p.id)?prev.filter(x=>x!==p.id):[...prev,p.id])}
                  className={cn('w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs cursor-pointer hover:bg-muted transition-colors',
                    selectedPlatforms.includes(p.id)&&'bg-primary/10 text-primary font-medium')}>
                  <span className={cn('w-3 h-3 rounded border-2 flex items-center justify-center',
                    selectedPlatforms.includes(p.id)?'bg-primary border-primary':'border-muted-foreground/30')}>
                    {selectedPlatforms.includes(p.id)&&<Check className="h-2.5 w-2.5 text-white"/>}
                  </span>
                  {p.icon} {p.name}
                </button>))}
            </PopoverContent>
          </Popover>

          <div className="w-px h-5 bg-border mx-0.5" />

          {/* 草稿模式 */}
          <button onClick={()=>setIsDraftMode(!isDraftMode)}
            className={cn('flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-all',
              isDraftMode?'bg-primary/10 text-primary font-medium':'bg-muted text-muted-foreground hover:text-foreground')}>
            <Image className="h-3.5 w-3.5"/>{isDraftMode?'草稿':'素材'}
          </button>

          <div className="flex-1" />

          {/* 提示词探索链接 */}
          <a href="https://youmind.com/zh-CN/grok-imagine-prompts" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors cursor-pointer shrink-0">
            <ExternalLink className="h-3 w-3"/>探索更多提示词
          </a>

          {/* 积分 + 提交 */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Coins className="h-3 w-3"/>{contentType==='video'?duration*quantity*2:imageCount*quantity*1}积分
            </span>
            <Button onClick={handleSubmit} disabled={!prompt.trim()||isUploading}
              className="cursor-pointer gap-1 h-8 px-4 text-xs rounded-lg" size="sm">
              {isUploading?<Loader2 className="h-3.5 w-3.5 animate-spin"/>:<ArrowUp className="h-3.5 w-3.5"/>}
              生成
            </Button>
          </div>
        </div>

        {/* 拖拽遮罩 */}
        {isDragging && (
          <div className="absolute inset-0 bg-primary/5 border-2 border-dashed border-primary/30 rounded-lg flex items-center justify-center gap-2 z-10">
            <Upload className="h-6 w-6 text-primary"/><span className="text-sm text-primary font-medium">释放文件以上传</span>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          ② 工具栏：搜索、筛选、视图切换、配额
          ═══════════════════════════════════════════════════════════ */}
      <div className="shrink-0 border-b border-border bg-background px-4 md:px-6 py-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative w-44">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="搜索..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-card text-xs outline-none focus:border-primary/60"/>
          </div>
          {[{k:'all',l:'全部'},{k:'draft',l:'草稿'},{k:'generating',l:'生成中'},{k:'ready',l:'待发布'},{k:'published',l:'已发布'}].map(s=>(
            <button key={s.k} onClick={()=>setStatusFilter(s.k)}
              className={cn('px-2 py-1 rounded-full text-xs cursor-pointer transition-all',
                statusFilter===s.k?'bg-primary text-primary-foreground':'bg-muted text-muted-foreground hover:bg-muted/70')}>
              {s.l}({s.k==='all'?materials.length:materials.filter(m=>m.status===s.k).length})
            </button>))}
          <div className="flex-1"/>
          {batchMode?(
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-7 text-xs cursor-pointer" onClick={()=>setSelected(new Set(filtered.map(m=>m.id)))}>全选</Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs cursor-pointer text-red-500" onClick={batchDel} disabled={selected.size===0}><Trash2 className="h-3 w-3 mr-1"/>删除({selected.size})</Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs cursor-pointer" onClick={clearSel}>取消</Button>
            </div>
          ):(
            <Button variant="ghost" size="sm" className="h-7 text-xs cursor-pointer" onClick={()=>setBatchMode(true)}>
              <Check className="h-3 w-3 mr-1"/>批量</Button>
          )}
          <div className="flex gap-0.5 bg-muted rounded-lg p-0.5">
            {[{k:'list',l:'列表',i:<Layers className="h-3.5 w-3.5"/>},{k:'write',l:'创作',i:<PenLine className="h-3.5 w-3.5"/>},{k:'media',l:'素材',i:<Image className="h-3.5 w-3.5"/>}].map(t=>(
              <button key={t.k} onClick={()=>setPanel(t.k as typeof panel)}
                className={cn('flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-all',
                  panel===t.k?'bg-background text-foreground shadow-sm':'text-muted-foreground hover:text-foreground')}>
                {t.i}{t.l}</button>))}
          </div>
          <div className="hidden lg:block w-36"><QuotaBar /></div>
          <Button variant="outline" size="sm" className="gap-1 shrink-0 border-pink-500/20 text-pink-500 hover:bg-pink-500/5 cursor-pointer h-7 text-xs"
            onClick={()=>setVideoModalOpen(true)}><Film className="h-3 w-3"/>视频制作</Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          ③ 主内容区
          ═══════════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-auto">
        <div className="px-4 md:px-6 py-4">
          {panel==='list' && (
            filtered.length===0?(
              <div className="text-center py-20 text-muted-foreground"><Sparkles className="h-12 w-12 mx-auto mb-4 opacity-15"/><p className="text-sm">还没有内容</p><p className="text-xs mt-1">在上方输入框中描述需求，AI 帮你创作</p></div>
            ):(
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map(m=>{const s=statusMap[m.status]||{label:m.status,cls:''}
                  return (
                    <div key={m.id} className={cn('rounded-xl border bg-card p-4 hover:shadow-sm transition-all group',batchMode&&'cursor-pointer',selected.has(m.id)&&'border-primary bg-primary/5')}
                      onClick={()=>batchMode&&toggleSel(m.id)}>
                      <div className="flex items-start gap-3">
                        <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0 text-xl">
                          {m.type==='video'?<Film className="h-5 w-5 text-muted-foreground"/>:m.type==='image'?<Image className="h-5 w-5 text-muted-foreground"/>:<PenLine className="h-5 w-5 text-muted-foreground"/>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1"><span className="text-xs">{m.icon}</span><span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium',s.cls)}>{s.label}</span><span className="text-[10px] text-muted-foreground ml-auto">{m.score}分</span></div>
                          <h3 className="text-sm font-medium line-clamp-2">{m.title}</h3>
                          <div className="flex justify-between mt-2.5 text-[10px] text-muted-foreground">
                            <span>{m.createdAt}</span>
                            <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                              <button className="p-1 hover:bg-muted rounded cursor-pointer"><Edit3 className="h-3 w-3"/></button>
                              <button className="p-1 hover:bg-muted rounded cursor-pointer"><Copy className="h-3 w-3"/></button>
                              <button className="p-1 hover:bg-muted rounded cursor-pointer"><Eye className="h-3 w-3"/></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )})}
              </div>
            )
          )}
          {panel==='write' && (
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="text-sm text-muted-foreground flex items-center gap-2"><PenLine className="h-4 w-4"/>自由写作 — 不受AI干预，完成后保存到列表</div>
              <input value={freeTitle} onChange={e=>setFreeTitle(e.target.value)} placeholder="标题（可选）" maxLength={100} className="w-full px-5 py-3 rounded-xl border border-border bg-card text-xl font-semibold outline-none focus:border-primary/60"/>
              <textarea value={freeContent} onChange={e=>setFreeContent(e.target.value)} placeholder="开始创作..." className="w-full h-96 px-5 py-4 rounded-xl border border-border bg-card text-sm resize-none outline-none focus:border-primary/60 leading-relaxed"/>
              <div className="flex gap-3">
                <Button onClick={()=>{if(!freeContent.trim())return;setMaterials(p=>[{id:`free-${Date.now()}`,title:freeTitle||freeContent.slice(0,40),platform:'xhs',icon:'📕',status:'draft',type:'article',createdAt:'刚刚',score:70},...p]);setFreeTitle('');setFreeContent('');toast.success('已保存');setPanel('list')}} disabled={!freeContent.trim()} className="cursor-pointer gap-2"><Save className="h-4 w-4"/>保存到列表</Button>
                <span className="text-xs text-muted-foreground self-center">{freeContent.length}字</span>
              </div>
            </div>
          )}
          {panel==='media' && (
            <div className="max-w-3xl mx-auto space-y-5">
              <div className="flex gap-2">
                {[{k:'image'as const,l:'🖼️ 图片生成'},{k:'video'as const,l:'🎬 视频生成'}].map(t=>(<button key={t.k} onClick={()=>setMediaTab(t.k)} className={cn('flex-1 p-4 rounded-xl border-2 text-left cursor-pointer transition-all',mediaTab===t.k?'border-primary bg-primary/5':'border-border hover:border-primary/30')}><div className="font-medium text-sm">{t.l}</div></button>))}
              </div>
              <div className="flex gap-2">
                <textarea value={mediaPrompt} onChange={e=>setMediaPrompt(e.target.value)} placeholder={mediaTab==='image'?'描述图片...':'描述视频...'} className="flex-1 h-20 px-4 py-3 rounded-xl border border-border bg-card text-sm resize-none outline-none focus:border-primary/60"/>
                <Button onClick={handleMediaGen} disabled={!mediaPrompt.trim()||mediaGenerating} className="cursor-pointer shrink-0 h-20 px-6" size="lg">{mediaGenerating?<Loader2 className="h-5 w-5 animate-spin"/>:<Sparkles className="h-5 w-5"/>}</Button>
              </div>
              {mediaResults.length>0&&(<div className="grid grid-cols-2 md:grid-cols-4 gap-3">{mediaResults.map((m,i)=>(<div key={i} className="rounded-xl border overflow-hidden"><img src={m.url} alt="" className="w-full aspect-video object-cover"/></div>))}</div>)}
            </div>
          )}
        </div>
      </div>
      <VideoCreateModal open={videoModalOpen} onOpenChange={setVideoModalOpen} />
    </div>
  )
}
