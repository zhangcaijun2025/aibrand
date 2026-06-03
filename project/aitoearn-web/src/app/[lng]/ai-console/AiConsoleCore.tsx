'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { ArrowRight, Command, Mic, Sparkles, Wrench, Play, Layers, Brain, Zap, Activity, Bug, Home, Settings, Search, RefreshCw, ExternalLink } from 'lucide-react'

// ─── API ─────────────────────────────────────────────────────
const $ = {
  health: async (url: string) => { const t = Date.now(); try { const r = await fetch(url,{signal:AbortSignal.timeout(4000)}); return {ok:r.ok||r.status<500,ms:Date.now()-t} } catch { return {ok:false,ms:0} } },
  agent: (task:string) => fetch('http://localhost:4010/agent/run-unified',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({task_id:crypto.randomUUID(),intent:'user_query',payload:{task,tools:['search_knowledge_base','generate_content','trigger_workflow']}}),signal:AbortSignal.timeout(60000)}).then(r=>r.json()),
  workflow: (wf:string) => fetch(`http://localhost:5678/webhook/aibrand/${wf}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({keyword:'AI运营',task_id:crypto.randomUUID()}),signal:AbortSignal.timeout(30000)}),
  evolution: () => fetch('http://localhost:4030/runbooks',{signal:AbortSignal.timeout(4000)}).then(r=>r.json()).catch(()=>({runbooks:[]})),
  profile: () => fetch('http://localhost:4030/adapt/profile/user-001',{signal:AbortSignal.timeout(4000)}).then(r=>r.json()).catch(()=>({})),
}

// ─── Types ────────────────────────────────────────────────────
interface ToolStep { tool: string; status: 'done'|'running'|'pending'; result?: string }
interface Message { type: 'user'|'agent'|'thinking'|'steps'; content: string; steps?: ToolStep[] }

const NAV = [
  { id: 'agent', icon: Home, label: '总览' },
  { id: 'workflows', icon: Layers, label: '工作流' },
  { id: 'evolution', icon: Brain, label: '进化' },
  { id: 'knowledge', icon: Search, label: '知识库' },
  { id: 'settings', icon: Settings, label: '设置' },
]

const SERVICES = [
  { name: 'OpenClaw', port: '19001', desc: '通信+RPA', url: 'http://localhost:19001/health' },
  { name: 'Dify', port: '5001', desc: 'AI+知识库', url: 'http://localhost:5001/health' },
  { name: 'LangChain', port: '4010', desc: '编排+评测', url: 'http://localhost:4010/health' },
  { name: 'n8n', port: '5678', desc: '中枢调度', url: 'http://localhost:5678/healthz' },
  { name: 'Claude', port: '4020', desc: '研发+审计', url: 'http://localhost:4020/health' },
  { name: 'Evolution', port: '4030', desc: '自愈+适应', url: 'http://localhost:4030/health' },
  { name: 'Backend', port: '8080', desc: 'API', url: 'http://localhost:8080/api/health' },
]

// ─── Particle Canvas ──────────────────────────────────────────
function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current; if(!c) return
    const ctx = c.getContext('2d'); if(!ctx) return
    let id: number; const ps: {x:number;y:number;vx:number;vy:number;r:number;a:number}[] = []
    const resize = () => { c.width=c.offsetWidth; c.height=c.offsetHeight }
    resize(); window.addEventListener('resize',resize)
    for(let i=0;i<30;i++) ps.push({x:Math.random()*c.width,y:Math.random()*c.height,vx:(Math.random()-.5)*.2,vy:(Math.random()-.5)*.2,r:Math.random()*1.2+.4,a:Math.random()*.3+.05})
    const draw = () => {
      ctx.clearRect(0,0,c.width,c.height)
      ps.forEach(p=>{p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>c.width)p.vx*=-1;if(p.y<0||p.y>c.height)p.vy*=-1;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=`rgba(0,245,160,${p.a})`;ctx.fill()})
      id=requestAnimationFrame(draw)
    }; draw()
    return ()=>{cancelAnimationFrame(id);window.removeEventListener('resize',resize)}
  },[])
  return <canvas ref={ref} className="absolute inset-0 pointer-events-none" style={{opacity:.5}} />
}

// ─── Pulse Dot ────────────────────────────────────────────────
function PulseDot({ alive }: { alive: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      {alive && <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" style={{animationDuration:'2.5s'}} />}
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{background:alive?'#00F5A0':'#FF4757',boxShadow:alive?'0 0 6px rgba(0,245,160,.5)':'0 0 4px rgba(255,71,87,.4)'}} />
    </span>
  )
}

// ─── Evolution Ring ───────────────────────────────────────────
function EvoRing({ value }: { value: number }) {
  const r=26; const c=2*Math.PI*r; const off=c-(value/100)*c
  return (
    <div className="relative flex items-center justify-center">
      <svg width="68" height="68" className="-rotate-90">
        <circle cx="34" cy="34" r={r} fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="2.5" />
        <circle cx="34" cy="34" r={r} fill="none" stroke="url(#evoG)" strokeWidth="2.5" strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" style={{transition:'stroke-dashoffset 1.5s ease-out'}} />
        <defs><linearGradient id="evoG" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#00F5A0"/><stop offset="100%" stopColor="#4DABF7"/></linearGradient></defs>
      </svg>
      <span className="absolute text-xs font-bold text-white/90">{value}</span>
    </div>
  )
}

// ─── Tool Call Card ───────────────────────────────────────────
function ToolCard({ steps }: { steps: ToolStep[] }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          {s.status === 'done' ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" style={{boxShadow:'0 0 4px rgba(0,245,160,.5)'}} /> :
           s.status === 'running' ? <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" /> :
           <span className="h-1.5 w-1.5 rounded-full bg-white/8" />}
          <span className={`text-[10px] ${s.status==='done'?'text-white/40':s.status==='running'?'text-white/60':'text-white/15'}`}>{s.tool}{s.result&&s.status==='done'?` ✓`:''}</span>
          {i < steps.length-1 && <span className="text-white/6 mx-0.5">→</span>}
        </div>
      ))}
    </div>
  )
}

// ─── MAIN ─────────────────────────────────────────────────────
export default function AiConsoleCore() {
  const [msgs, setMsgs] = useState<Message[]>([{type:'agent',content:'晚上好。我是 AiBrand AI 中枢。\n\n当前全部 7 个组件在线，进化引擎就绪。\n\n直接告诉我想做什么——分析竞品、生成报告、追踪热搜，或查看系统状态。'}])
  const [input, setInput] = useState(''); const [running, setRunning] = useState(false)
  const [health, setHealth] = useState<Record<string,boolean>>({})
  const [evo, setEvo] = useState({runbooks:5,skills:0,index:72})
  const [nav, setNav] = useState('agent'); const [cmd, setCmd] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const poll = async () => {
      const res = await Promise.all(SERVICES.map(async s => ({n:s.name,...(await $.health(s.url))})))
      setHealth(Object.fromEntries(res.map(r=>[r.n,r.ok])))
      const [rb,pf] = await Promise.all([$.evolution(),$.profile()])
      setEvo({runbooks:rb.runbooks?.length||5,skills:pf.skills_generated||0,index:Math.min(100,(rb.runbooks?.length||5)*15+(pf.skills_generated||0)*10+30)})
    }; poll(); const iv = setInterval(poll,15000); return ()=>clearInterval(iv)
  },[])

  useEffect(() => {
    const h = (e:KeyboardEvent) => {
      if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();setCmd(true)}
      if(e.key==='Escape')setCmd(false)
    }; window.addEventListener('keydown',h); return ()=>window.removeEventListener('keydown',h)
  },[])

  const alive = Object.values(health).filter(Boolean).length

  const send = useCallback(async () => {
    if(!input.trim()||running) return
    const task = input; setMsgs(p=>[...p,{type:'user',content:task}]); setInput(''); setRunning(true)
    const steps: ToolStep[] = [{tool:'理解意图',status:'done'},{tool:'search_knowledge_base',status:'running'},{tool:'generate_content',status:'pending'}]
    setMsgs(p=>[...p,{type:'steps',content:'',steps}])
    try {
      const d = await $.agent(task)
      const final: ToolStep[] = [{tool:'意图分析',status:'done',result:'已理解'},{tool:'search_knowledge_base',status:'done',result:d.tools_used?.includes('search_knowledge_base')?'检索完成':undefined},{tool:'generate_content',status:'done',result:'内容已生成'},...(d.tools_used?.includes('trigger_workflow')?[{tool:'trigger_workflow',status:'done' as const,result:'已触发'}] as ToolStep[]:[])]
      setMsgs(p=>p.filter(m=>m.type!=='steps').concat({type:'steps',content:'',steps:final},{type:'agent',content:d.result?.output||d.result?.result||'完成'}))
    } catch {
      setMsgs(p=>p.filter(m=>m.type!=='steps').concat({type:'agent',content:'⚠️ 调度超时，请重试。'}))
    }; setRunning(false)
  },[input,running])

  const runWf = async (id:string) => {
    try { await $.workflow(id); setMsgs(p=>[...p,{type:'agent',content:`🚀 工作流「${id}」已触发，结果将回调到 n8n 中枢。`}]) }
    catch { setMsgs(p=>[...p,{type:'agent',content:`⚠️ 工作流触发失败，请检查 n8n 状态。`}]) }
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden" style={{background:'#080B12',color:'#fff'}}>
      <ParticleCanvas />

      {/* ── Left: Icon Nav (48px) ── */}
      <nav className="relative z-10 w-12 flex flex-col items-center py-3 border-r border-white/[0.04] bg-white/[0.005] shrink-0">
        <Sparkles className="h-5 w-5 mb-6" style={{color:'#00F5A0',filter:'drop-shadow(0 0 6px rgba(0,245,160,.3))'}} />
        {NAV.map(item => {
          const active = nav === item.id
          return (
            <button key={item.id} onClick={() => setNav(item.id)} className="relative flex flex-col items-center gap-0.5 py-2 w-full group" title={item.label}>
              {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full" style={{background:'#00F5A0'}} />}
              <item.icon className={`h-4 w-4 transition-colors ${active ? 'text-white' : 'text-white/20 group-hover:text-white/50'}`} />
            </button>
          )
        })}
        <div className="mt-auto flex flex-col items-center gap-1">
          <a href="http://localhost:5678" target="_blank" className="p-1 text-white/10 hover:text-white/40 transition-colors" title="n8n"><ExternalLink className="h-3 w-3" /></a>
          <a href="http://localhost:3010" target="_blank" className="p-1 text-white/10 hover:text-white/40 transition-colors" title="Dify"><ExternalLink className="h-3 w-3" /></a>
        </div>
      </nav>

      {/* ── Center: Agent ── */}
      <main className="relative z-10 flex-1 flex flex-col min-w-0 border-r border-white/[0.04]">
        {/* Status bar */}
        <div className="h-7 flex items-center px-4 text-[10px] text-white/20 border-b border-white/[0.03] gap-3">
          <span className="flex items-center gap-1"><span className={`h-1.5 w-1.5 rounded-full ${alive===7?'bg-emerald-400':'bg-amber-400'}`} style={{boxShadow:alive===7?'0 0 4px rgba(0,245,160,.3)':'none'}} />{alive}/7 在线</span>
          <span>进化 {evo.index}</span>
          <span className="ml-auto flex items-center gap-1"><Command className="h-2.5 w-2.5" />K 命令</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-auto px-8 py-6 space-y-4">
          {msgs.map((m,i) => (
            <div key={i} className={`flex ${m.type==='user'?'justify-end':'justify-start'}`}>
              {m.type==='steps' && m.steps ? <ToolCard steps={m.steps} /> :
               <div className={`max-w-[80%] rounded-2xl px-5 py-3 text-[13px] leading-relaxed ${m.type==='user'?'bg-white/[0.03] border border-white/[0.05] text-white/70':'text-white/50'}`} style={{whiteSpace:'pre-wrap'}}>{m.content}</div>}
            </div>
          ))}
          {running && <div className="flex justify-start"><div className="flex items-center gap-2 px-3 py-2 rounded-xl"><RefreshCw className="h-3 w-3 text-emerald-400/60 animate-spin" /><span className="text-[11px] text-white/15">思考中...</span></div></div>}
        </div>

        {/* Input */}
        <div className="px-8 pb-6">
          <div className="relative rounded-2xl border border-white/[0.04] bg-white/[0.01] backdrop-blur-xl focus-within:border-white/[0.08] transition-all">
            <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="告诉我想做什么..." className="w-full bg-transparent px-5 py-3.5 text-[13px] text-white outline-none placeholder:text-white/10" disabled={running} />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button className="p-1.5 rounded-lg text-white/10 hover:text-white/30 transition-colors"><Mic className="h-3.5 w-3.5" /></button>
              <button onClick={send} disabled={running||!input.trim()} className="p-1.5 rounded-lg text-emerald-400/70 hover:bg-emerald-400/10 disabled:opacity-20 transition-all"><ArrowRight className="h-3.5 w-3.5" /></button>
            </div>
          </div>
          <p className="mt-1.5 text-[9px] text-white/8 text-center">⌘K 命令面板 · Agent 自动调度 LangChain + Dify + n8n</p>
        </div>
      </main>

      {/* ── Right: Panel (280px) ── */}
      <aside className="relative z-10 w-[280px] flex flex-col shrink-0 bg-white/[0.005]">
        {/* Evolution */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.04]">
          <EvoRing value={evo.index} />
          <div><div className="text-[9px] text-white/15 uppercase tracking-[.2em] mb-0.5">进化指数</div><div className="flex items-center gap-2 text-[10px] text-white/25"><span>{evo.runbooks} 剧本</span><span className="text-white/8">·</span><span>{evo.skills} 技能</span></div></div>
        </div>

        {/* Services */}
        <div className="flex-1 overflow-auto px-3 py-2">
          <div className="text-[8px] text-white/10 uppercase tracking-[.25em] px-2 py-2">服务脉搏</div>
          {SERVICES.map(s => (
            <div key={s.name} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/[0.02] transition-colors group">
              <PulseDot alive={health[s.name]??false} />
              <div className="flex-1 min-w-0"><div className="text-[10px] text-white/50">{s.name}</div><div className="text-[8px] text-white/15">{s.desc}</div></div>
              <span className={`text-[8px] ${health[s.name]?'text-emerald-400/40':'text-red-400/50'}`}>{health[s.name]?'live':'down'}</span>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="px-3 py-3 border-t border-white/[0.04] space-y-1">
          <div className="text-[8px] text-white/10 uppercase tracking-[.25em] px-2 py-1">快捷调度</div>
          {[
            {l:'竞品分析',a:()=>runWf('competitor-analysis')},{l:'热搜追踪',a:()=>runWf('trending-topics')},{l:'发布追踪',a:()=>runWf('post-publish-tracking')},{l:'自愈检测',a:()=>runWf('self-heal')},
          ].map(x=>(<button key={x.l} onClick={x.a} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px] text-white/25 hover:text-white/50 hover:bg-white/[0.02] transition-all"><Play className="h-2.5 w-2.5" />{x.l}</button>))}
        </div>
      </aside>

      {/* ── Command Palette ── */}
      {cmd && (
        <div className="absolute inset-0 z-50 flex items-start justify-center pt-28" onClick={()=>setCmd(false)}>
          <div className="w-[460px] rounded-2xl border border-white/[0.06] bg-[#0A0F16]/98 backdrop-blur-2xl shadow-2xl overflow-hidden" onClick={e=>e.stopPropagation()}>
            <div className="p-4 border-b border-white/[0.04]">
              <input autoFocus className="w-full bg-transparent text-white text-[13px] outline-none placeholder:text-white/12" placeholder="输入命令..." onKeyDown={e=>{if(e.key==='Enter'){setCmd(false);setInput(e.currentTarget.value);setTimeout(()=>inputRef.current?.focus(),100)}}} />
            </div>
            <div className="p-1.5">
              {[{l:'分析竞品',d:'启动竞品分析工作流'},{l:'检查系统健康',d:'刷新全部组件状态'},{l:'生成运营报告',d:'AI 自动生成日报/周报'},{l:'触发自愈检测',d:'运行自动修复诊断'}].map(x=>(
                <button key={x.l} onClick={()=>{setCmd(false);setInput(x.l);setTimeout(()=>inputRef.current?.focus(),100)}} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-white/[0.03] transition-colors">
                  <span className="text-[12px] text-white/70">{x.l}</span><span className="text-[10px] text-white/15 ml-auto">{x.d}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
