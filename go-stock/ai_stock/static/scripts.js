/* ═══════════════════════════════════════════════
   AI智能选股系统 · v2 前端交互
   ═══════════════════════════════════════════════ */

'use strict';

const state = {
  stockCode: '600519', stockName: '贵州茅台',
  pollInterval: null, selectedRank: 0, top5Data: [],
  sseConnection: null
};

const $ = (id) => document.getElementById(id);
const dom = {};

function cacheDom() {
  // 行情概览条
  dom.shIndex = $('shIndex'); dom.shChange = $('shChange');
  dom.szIndex = $('szIndex'); dom.szChange = $('szChange');
  dom.moodTag = $('moodTag'); dom.northTag = $('northTag');
  dom.volTag = $('volTag'); dom.sysSource = $('sysSource');
  // 中央 - TOP5
  dom.top5Cards = $('top5Cards');
  dom.radarCanvas = $('radarChart');
  dom.dimBarQ = $('dimBarQ'); dom.dimBarT = $('dimBarT');
  dom.dimBarV = $('dimBarV'); dom.dimBarG = $('dimBarG');
  dom.dimValQ = $('dimValQ'); dom.dimValT = $('dimValT');
  dom.dimValV = $('dimValV'); dom.dimValG = $('dimValG');
  dom.rdComposite = $('rdComposite');
  dom.rdEnv = $('rdEnv'); dom.rdWeight = $('rdWeight');
  dom.pipelineCards = $('pipelineCards');
  dom.pfStock = $('pfStock'); dom.pfConfidence = $('pfConfidence');
  dom.klineCanvas = $('klineChart');
  // 右侧面板
  dom.stockName = $('stockName'); dom.stockCode = $('stockCode');
  dom.compositeScore = $('compositeScore'); dom.confidence = $('confidence');
  dom.dimQuant = $('dimQuant'); dom.dimTech = $('dimTech');
  dom.dimValue = $('dimValue'); dom.dimGrowth = $('dimGrowth');
  dom.barQuant = $('barQuant'); dom.barTech = $('barTech');
  dom.barValue = $('barValue'); dom.barGrowth = $('barGrowth');
  dom.weightMode = $('weightMode');
  dom.sentimentBadge = $('sentimentBadge');
  dom.hotSectors = $('hotSectors');
  dom.northFlow = $('northFlow'); dom.mainFlow = $('mainFlow');
  dom.chartTrend = $('chartTrend');
  dom.sentimentCanvas = $('sentimentLineChart');
  dom.newsList = $('newsList');
  dom.phaseList = $('phaseList');
  dom.wfStatus = $('wfStatus');
  dom.signalBuy = $('signalBuy'); dom.signalSell = $('signalSell');
  dom.signalAlert = $('signalAlert');
  dom.lastUpdate = $('lastUpdate');
  dom.signalBadge = $('signalBadge');
  dom.taskIndicator = $('taskIndicator');
}

function fmtTime() { return new Date().toLocaleTimeString('zh-CN', {hour12:false}); }
function fmtFlow(v) { return (v>=0?'+':'')+v.toFixed(1)+'亿'; }

function signalClass(t) {
  const m = {'价值洼地':'tag-value','行业景气':'tag-growth','技术突破':'tag-tech',
    '成长潜力':'tag-momentum','动量突破':'tag-momentum','困境反转':'tag-value','财报超预期':'tag-growth'};
  return m[t]||'tag-value';
}
function medal(r) { return ['🥇','🥈','🥉','',''][r-1]||''; }

// ═══════════════ 雷达图 ═══════════════
function drawRadar(data) {
  const canvas = dom.radarCanvas; if (!canvas) return;
  const ctx = canvas.getContext('2d'), dpr = window.devicePixelRatio||1;
  const S = 200; canvas.width = S*dpr; canvas.height = S*dpr; canvas.style.width= S+'px'; canvas.style.height= S+'px';
  ctx.scale(dpr, dpr);
  const cx = S/2, cy = S/2, maxR = S*0.38;
  const dims = [
    {label:'量化',v:data.quant/100},{label:'技术',v:data.tech/100},
    {label:'价值',v:data.value/100},{label:'成长',v:data.growth/100}
  ];
  const N = dims.length, step = Math.PI*2/N, start = -Math.PI/2;
  function pt(r, i) { const a = start + i*step; return {x:cx+r*Math.cos(a),y:cy+r*Math.sin(a)}; }
  ctx.clearRect(0,0,S,S);
  // 网格
  for (let l = 1; l <= 4; l++) {
    const r = (maxR/4)*l; ctx.beginPath();
    for (let i = 0; i <= N; i++) { const p = pt(r, i%N); i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y); }
    ctx.closePath(); ctx.strokeStyle = 'rgba(48,54,61,0.4)'; ctx.lineWidth = 1; ctx.stroke();
  }
  for (let i = 0; i < N; i++) { const p = pt(maxR,i); ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(p.x,p.y); ctx.strokeStyle='rgba(48,54,61,0.3)'; ctx.stroke(); }
  // 数据
  ctx.beginPath();
  for (let i = 0; i <= N; i++) { const p = pt(maxR*dims[i%N].v, i%N); i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y); }
  ctx.closePath();
  const g = ctx.createRadialGradient(cx,cy,0,cx,cy,maxR);
  g.addColorStop(0,'rgba(74,140,255,0.3)'); g.addColorStop(1,'rgba(74,140,255,0.05)');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = '#4A8CFF'; ctx.lineWidth = 1.5; ctx.stroke();
  for (let i = 0; i < N; i++) { const p = pt(maxR*dims[i].v,i); ctx.beginPath(); ctx.arc(p.x,p.y,3,0,Math.PI*2); ctx.fillStyle='#4A8CFF'; ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=1; ctx.stroke(); }
  // 标签
  ctx.textAlign='center'; ctx.textBaseline='middle';
  for (let i = 0; i < N; i++) { const p = pt(maxR*1.15,i); ctx.fillStyle='#70788A'; ctx.font='10px sans-serif'; ctx.fillText(dims[i].label,p.x,p.y-6); ctx.fillStyle='#E0E0E0'; ctx.font='bold 11px sans-serif'; ctx.fillText(Math.round(dims[i].v*100),p.x,p.y+6); }
  ctx.fillStyle='rgba(74,140,255,0.1)'; ctx.beginPath(); ctx.arc(cx,cy,18,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#4A8CFF'; ctx.font='bold 13px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(data.composite,cx,cy);
}

// ═══════════════ 折线图 (右面板) ═══════════════
function drawSentimentChart(data) {
  const canvas = dom.sentimentCanvas; if (!canvas) return;
  const ctx = canvas.getContext('2d'), dpr = window.devicePixelRatio||1;
  const rect = canvas.parentElement.getBoundingClientRect();
  const W = rect.width, H = 70;
  canvas.width = W*dpr; canvas.height = H*dpr; canvas.style.width = W+'px'; canvas.style.height = H+'px';
  ctx.scale(dpr,dpr);
  ctx.clearRect(0,0,W,H);
  if (!data||data.length<2) return;
  const vals = data.map(d=>d.value), min = Math.min(...vals)-0.05, max = Math.max(...vals)+0.05, range = max-min||0.5;
  const pts = data.map((d,i)=>({x:8+(i/(data.length-1))*(W-16), y:10+50-((d.value-min)/range)*50}));
  const grad = ctx.createLinearGradient(0,10,0,60);
  grad.addColorStop(0,'rgba(0,212,170,0.2)'); grad.addColorStop(1,'rgba(0,212,170,0.01)');
  ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y);
  for (let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x,pts[i].y);
  ctx.lineTo(pts[pts.length-1].x,60); ctx.lineTo(pts[0].x,60); ctx.closePath(); ctx.fillStyle=grad; ctx.fill();
  ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y);
  for (let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x,pts[i].y);
  ctx.strokeStyle='#00D4AA'; ctx.lineWidth=1.5; ctx.stroke();
  pts.forEach((p,i)=>{ctx.beginPath();ctx.arc(p.x,p.y,2,0,Math.PI*2);ctx.fillStyle='#00D4AA';ctx.fill()});
}

// ═══════════════ K 线图 ═══════════════
function drawKLine(canvas, data) {
  if (!canvas||!data||data.length<2) return;
  const ctx = canvas.getContext('2d'), dpr = window.devicePixelRatio||1, rect = canvas.getBoundingClientRect();
  const W = rect.width||400, H = 160;
  canvas.width = W*dpr; canvas.height = H*dpr; canvas.style.width=W+'px'; canvas.style.height=H+'px';
  ctx.scale(dpr,dpr);
  const hi = Math.max(...data.map(d=>d.high)), lo = Math.min(...data.map(d=>d.low)), ra = hi-lo||1;
  const gap = W/data.length, bw = Math.max(2,gap*0.5), pad=4;
  ctx.clearRect(0,0,W,H);
  ctx.strokeStyle='rgba(48,54,61,0.2)'; ctx.lineWidth=0.5;
  for (let i=0;i<4;i++){const y=pad+(H-pad*2)/4*i;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
  data.forEach((d,i)=>{
    const x = i*gap+(gap-bw)/2;
    const isUp = d.close>=d.open;
    ctx.strokeStyle = isUp?'#FF3333':'#00CC00'; ctx.fillStyle = isUp?'#FF3333':'#00CC00';
    ctx.beginPath(); ctx.moveTo(x+bw/2,pad+(H-pad*2)-((d.high-lo)/ra)*(H-pad*2)); ctx.lineTo(x+bw/2,pad+(H-pad*2)-((d.low-lo)/ra)*(H-pad*2)); ctx.stroke();
    const oy = pad+(H-pad*2)-((d.open-lo)/ra)*(H-pad*2), cy2 = pad+(H-pad*2)-((d.close-lo)/ra)*(H-pad*2), t = Math.min(oy,cy2), bh = Math.max(1,Math.abs(cy2-oy));
    ctx.fillRect(x,t,bw,bh);
  });
  ctx.fillStyle='#70788A'; ctx.font='9px sans-serif'; ctx.textAlign='right';
  for(let i=0;i<3;i++){ctx.fillText((hi-(ra/2)*i).toFixed(2),W-2,pad+((H-pad*2)/2)*i+8)}
}

// ═══════════════ 加载 K 线数据 ═══════════════
function loadKLineData(stock) {
  const canvas = dom.klineCanvas; if (!canvas) return;
  const data = []; let price = 150; const today = new Date();
  for (let i=29;i>=0;i--) {
    const d = new Date(today); d.setDate(d.getDate()-i);
    const open = price, change = (Math.random()-0.48)*4, close = open+change;
    data.push({date:(d.getMonth()+1)+'/'+d.getDate(),open:+open.toFixed(2),close:+close.toFixed(2),
      high:+(Math.max(open,close)+Math.random()*2).toFixed(2),low:+(Math.min(open,close)-Math.random()*2).toFixed(2)});
    price = close;
  }
  drawKLine(canvas,data);
}

// ═══════════════ 渲染 TOP5 ═══════════════
function renderTop5Cards(stocks) {
  dom.top5Cards.innerHTML = stocks.map(s => `
    <div class="stock-card ${s.rank===state.selectedRank?'active':''}" data-rank="${s.rank}" onclick="selectStock(${s.rank})">
      <span class="sc-medal">${medal(s.rank)}</span>
      <div class="sc-header"><span class="sc-name">${s.name}</span><span class="sc-code">${s.code}</span></div>
      <div class="sc-score">${s.composite_score}</div>
      <span class="sc-tag ${signalClass(s.signal_type)}">${s.signal_type}</span>
      <span class="sc-detail">${s.highlight}</span>
      <span class="sc-pos">${s.position}</span>
    </div>`).join('');
}

function updateRadar(stock) {
  if (!stock||!stock.dimensions) return;
  const d = stock.dimensions;
  dom.dimValQ.textContent = d.quant; dom.dimValT.textContent = d.tech;
  dom.dimValV.textContent = d.value; dom.dimValG.textContent = d.growth;
  dom.dimBarQ.style.width = d.quant+'%'; dom.dimBarT.style.width = d.tech+'%';
  dom.dimBarV.style.width = d.value+'%'; dom.dimBarG.style.width = d.growth+'%';
  dom.rdComposite.textContent = stock.composite_score;
  drawRadar({quant:d.quant,tech:d.tech,value:d.value,growth:d.growth,composite:stock.composite_score});
}

function selectStock(rank) {
  state.selectedRank = rank;
  const stock = state.top5Data.find(s=>s.rank===rank); if(!stock) return;
  document.querySelectorAll('.stock-card').forEach(c=>c.classList.toggle('active',parseInt(c.dataset.rank)===rank));
  updateRadar(stock); loadKLineData(stock);
  state.stockCode = stock.code.replace('.SH','').replace('.SZ',''); state.stockName = stock.name;
  const d = stock.dimensions;
  dom.stockName.textContent=stock.name; dom.stockCode.textContent=state.stockCode;
  dom.compositeScore.textContent=stock.composite_score; dom.confidence.textContent=Math.min(99,stock.composite_score-2)+'%';
  dom.dimQuant.textContent=d.quant; dom.dimTech.textContent=d.tech; dom.dimValue.textContent=d.value; dom.dimGrowth.textContent=d.growth;
  dom.barQuant.style.width=d.quant+'%'; dom.barTech.style.width=d.tech+'%'; dom.barValue.style.width=d.value+'%'; dom.barGrowth.style.width=d.growth+'%';
  const mode = d.value>d.growth?'价值优先 (震荡偏多)':'成长优先 (进攻偏好)';
  dom.weightMode.innerHTML='⚖️ '+mode;
  loadDashboard();
}

// ═══════════════ 渲染中央仪表盘 ═══════════════
function renderCenterDashboard(data) {
  if(!data) return;
  const mo = data.market_overview;
  if(mo){
    dom.shIndex.textContent=mo.sh_index.toFixed(0); dom.shChange.textContent=(mo.sh_change>=0?'+':'')+mo.sh_change.toFixed(2)+'%';
    dom.shChange.className='ov-change '+(mo.sh_change>=0?'up':'down');
    dom.szIndex.textContent=mo.sz_index.toFixed(0); dom.szChange.textContent=(mo.sz_change>=0?'+':'')+mo.sz_change.toFixed(2)+'%';
    dom.szChange.className='ov-change '+(mo.sz_change>=0?'up':'down');
    dom.northTag.textContent=fmtFlow(mo.north_flow); dom.northTag.className='ov-change '+(mo.north_flow>=0?'up':'down');
    dom.volTag.textContent=mo.volume+'亿';
  }
  if(data.system_status) dom.sysSource.textContent=data.system_status.data_source||'Tushare';
  const s = data.market_sentiment;
  if(s){
    dom.moodTag.textContent=s.overall_label+' '+(s.overall_score>0.3?'乐观':s.overall_score<-0.3?'悲观':'中性');
    dom.moodTag.style.background=s.overall_label==='🟢'?'rgba(0,204,0,0.1)':s.overall_label==='🔴'?'rgba(255,51,51,0.1)':'rgba(230,160,35,0.1)';
    dom.moodTag.style.color=s.overall_label==='🟢'?'#00CC00':s.overall_label==='🔴'?'#FF3333':'#E6A023';
  }
  if(data.top5_stocks){
    state.top5Data=data.top5_stocks;
    if(state.selectedRank===0) state.selectedRank=data.top5_stocks[0].rank;
    renderTop5Cards(data.top5_stocks);
    const sel = data.top5_stocks.find(s=>s.rank===state.selectedRank)||data.top5_stocks[0];
    updateRadar(sel);
  }
  if(data.ai_pipeline) renderPipeline(data.ai_pipeline);
  state.lastRefresh = Date.now();
}

function renderPipeline(p) {
  const sm = {completed:{c:'done',t:'完成',i:'✅'},running:{c:'run',t:'进行中',i:'🔄'},waiting:{c:'wait',t:'等待',i:'⏳'}};
  dom.pipelineCards.innerHTML = p.phases.map(ph=>{
    const st = sm[ph.status]||sm.waiting;
    return `<div class="pip-item"><div class="pip-top"><span class="pip-icon">${st.i}</span><span class="pip-name">${ph.name}</span><span class="pip-status ${st.c}">${st.t}</span></div><span class="pip-meta">${ph.detail} · ${ph.duration}</span></div>`;
  }).join('');
  dom.pfStock.textContent=p.current_stock; dom.pfConfidence.textContent=p.confidence+'%';
  dom.rdEnv.textContent=p.market_env||'震荡'; dom.rdWeight.textContent=p.weight_mode||'价值优先';
}

// ═══════════════ 渲染右面板 ═══════════════
function renderDashboard(data) {
  if(!data) return;
  if(data.stock){dom.stockName.textContent=data.stock.name;dom.stockCode.textContent=data.stock.code;}
  if(data.scores){
    const s=data.scores;
    dom.compositeScore.textContent=s.composite;dom.confidence.textContent=s.confidence+'%';
    dom.dimQuant.textContent=s.quant;dom.dimTech.textContent=s.tech;dom.dimValue.textContent=s.value;dom.dimGrowth.textContent=s.growth;
    dom.barQuant.style.width=s.quant+'%';dom.barTech.style.width=s.tech+'%';dom.barValue.style.width=s.value+'%';dom.barGrowth.style.width=s.growth+'%';
  }
  if(data.weight_mode)dom.weightMode.innerHTML='⚖️ '+data.weight_mode;
  if(data.sentiment){
    const se=data.sentiment;
    dom.sentimentBadge.textContent=se.overall_label+' '+se.overall_mood+' ('+se.overall_score+')';
    dom.sentimentBadge.style.background=se.overall_label==='🟢'?'rgba(0,204,0,0.15)':se.overall_label==='🔴'?'rgba(255,51,51,0.15)':'rgba(230,160,35,0.15)';
    dom.sentimentBadge.style.color=se.overall_label==='🟢'?'#00CC00':se.overall_label==='🔴'?'#FF3333':'#E6A023';
    dom.hotSectors.innerHTML='<span class="sector-label">行业</span>'+se.hot_sectors.map(h=>'<span class="sector-tag">'+h+'</span>').join('');
    if(se.capital_flow){
      dom.northFlow.textContent=fmtFlow(se.capital_flow.north);
      dom.northFlow.className=se.capital_flow.north>=0?'up':'dn';
      dom.mainFlow.textContent=fmtFlow(se.capital_flow.main);
      dom.mainFlow.className=se.capital_flow.main>=0?'up':'dn';
    }
  }
  if(data.sentiment_history){
    drawSentimentChart(data.sentiment_history);
    const l2=data.sentiment_history.slice(-2);
    if(l2.length===2){dom.chartTrend.textContent=(l2[1].value>=l2[0].value?'📈 回暖':'📉 回落');dom.chartTrend.style.color=l2[1].value>=l2[0].value?'#00CC00':'#FF3333';}
  }
  if(data.news) renderNews(data.news);
  if(data.tasks) renderTasks(data.tasks);
  dom.lastUpdate.textContent=fmtTime();
}

function renderNews(news) {
  dom.newsList.innerHTML = news.map(n=>`<div class="news-item"><span class="news-badge">${n.badge}</span><span class="news-text">${n.content}</span><span class="news-time">${n.time}</span><span class="news-act">▸</span></div>`).join('');
}

function renderTasks(tasks) {
  const sm = {'完成':{c:'done',i:'✅'},'进行中':{c:'run',i:'🔄'},'等待中':{c:'wait',i:'⏳'}};
  dom.phaseList.innerHTML = tasks.phases.map(p=>{const st=sm[p[2]]||{c:'wait',i:'⏳'};return `<div class="phase-item"><span>${st.i}</span><span class="phase-name">${p[0]}</span><span class="phase-st ${st.c}">${p[2]}</span><span class="phase-dur">${p[3]}</span></div>`;}).join('');
  dom.wfStatus.textContent='● 运行中'; dom.wfStatus.style.color='#00CC00';
  if(tasks.today_signals){dom.signalBuy.textContent=tasks.today_signals.buy+'买';dom.signalSell.textContent=tasks.today_signals.sell+'卖';}
  dom.signalAlert.textContent='预警:'+tasks.alerts+'条';
  const total = (tasks.today_signals.buy||0)+(tasks.today_signals.sell||0)+(tasks.alerts||0);
  if(dom.signalBadge){dom.signalBadge.textContent=total;dom.signalBadge.style.display=total>0?'':'none';}
}

// ═══════════════ API 加载 ═══════════════
async function loadAllPanels() {
  try {
    const [cr,rr] = await Promise.all([
      fetch('/api/center-dashboard'),
      fetch('/api/dashboard?code='+state.stockCode+'&name='+encodeURIComponent(state.stockName))
    ]);
    if(cr.ok) renderCenterDashboard(await cr.json());
    if(rr.ok) renderDashboard(await rr.json());
  } catch(e) { console.error('load error',e); }
}

async function loadDashboard() {
  try {
    const r = await fetch('/api/dashboard?code='+state.stockCode+'&name='+encodeURIComponent(state.stockName));
    if(r.ok) renderDashboard(await r.json());
  } catch(e) { console.error('dashboard error',e); }
}

// ═══════════════ SSE 实时流 ═══════════════
function connectSSE() {
  if(state.sseConnection) state.sseConnection.close();
  state.sseConnection = new EventSource('/api/stream');
  state.sseConnection.onmessage = function(e) {
    try { const d = JSON.parse(e.data); renderCenterDashboard(d); }
    catch(err) {}
  };
  state.sseConnection.onerror = function() { setTimeout(connectSSE, 5000); };
}

function startPolling() {
  loadAllPanels(); connectSSE();
  state.pollInterval = setInterval(loadAllPanels, 30000);
}

// ═══════════════ 外部接口 ═══════════════
function openAnalysis() {
  fetch('/api/analysis/'+state.stockCode).then(r=>r.json()).then(d=>{
    const a = d.analysis;
    alert(['📄 '+state.stockCode+' 分析报告','','📊 综合评分: '+a.details.composite,'量化: '+a.details.quant+' 技术: '+a.details.tech+' 价值: '+a.details.value+' 成长: '+a.details.growth,'',a.summary].join('\n'));
  }).catch(()=>alert('加载失败'));
}

function openTrace() {
  fetch('/api/trace/'+state.stockCode).then(r=>r.json()).then(d=>{
    alert(['🔗 数据追溯 · '+state.stockCode,'──────────────────',...d.trace.map(t=>'  '+t.source+' · '+t.field+' · '+t.updated)].join('\n'));
  }).catch(()=>alert('加载失败'));
}

function onResize() {
  const sel = state.top5Data.find(s=>s.rank===state.selectedRank);
  if(sel) updateRadar(sel);
}

// ═══════════════ 导航切换 ═══════════════
function switchPage(page) {
  document.querySelectorAll('.menu-item').forEach(i=>i.classList.toggle('active',i.dataset.page===page));
  const mainScroll = document.getElementById('mainScroll');
  const cards = mainScroll.querySelectorAll('.card');
  mainScroll.style.opacity='0.5'; mainScroll.style.transition='opacity 0.2s';
  setTimeout(()=>{
    if(page==='overview'){
      cards.forEach(c=>c.style.display='');
      const p=mainScroll.querySelector('.page-placeholder');if(p)p.remove();
      mainScroll.style.opacity='1';
      return;
    }
    cards.forEach(c=>c.style.display='none');
    let p = mainScroll.querySelector('.page-placeholder');
    if(!p){p=document.createElement('div');p.className='page-placeholder';mainScroll.appendChild(p);}
    loadModulePage(page, p);
    mainScroll.style.opacity='1';
  }, 80);
}

function loadModulePage(page, container) {
  const renderers = {
    'strategy': async (c) => {
      const r = await fetch('/api/modules/strategy');
      const d = await r.json();
      c.innerHTML = `<div class="placeholder-content" style="width:100%;max-width:700px;text-align:left;gap:8px;">
        <h2 style="font-size:16px;font-weight:600;color:var(--text-primary);width:100%;border-bottom:1px solid var(--border-light);padding-bottom:8px;">📁 策略配置与管理</h2>
        ${d.strategies.map(s => `<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:rgba(255,255,255,0.02);border-radius:6px;border:1px solid var(--border-light);width:100%;">
          <span style="font-size:16px;">${s.status==='running'?'🟢':s.status==='paused'?'🟡':'⚪'}</span>
          <div style="flex:1;"><div style="font-size:13px;font-weight:600;color:var(--text-primary);">${s.name}</div><div style="font-size:10px;color:var(--text-muted);">${s.desc}</div></div>
          <span style="font-size:12px;font-weight:600;color:${s.performance.startsWith('+')?'var(--accent-red)':'var(--accent-green)'};">${s.performance}</span>
          <span style="font-size:10px;color:var(--text-muted);">信号 ${s.signals}</span>
          <span class="sc-tag tag-value" style="cursor:pointer;" onclick="window.open('http://localhost:5678','_blank')">N8N</span>
        </div>`).join('')}
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">N8N 工作流状态: ${d.n8n.n8n_workflow_status}</div>
      </div>`;
    },
    'portfolio': async (c) => {
      const r = await fetch('/api/modules/portfolio');
      const d = await r.json();
      c.innerHTML = `<div class="placeholder-content" style="width:100%;max-width:700px;text-align:left;gap:8px;">
        <h2 style="font-size:16px;font-weight:600;color:var(--text-primary);width:100%;border-bottom:1px solid var(--border-light);padding-bottom:8px;">📈 投资组合</h2>
        <div style="display:flex;gap:10px;width:100%;">
          <div style="flex:1;padding:10px;background:rgba(255,255,255,0.02);border-radius:6px;border:1px solid var(--border-light);text-align:center;"><div style="font-size:10px;color:var(--text-muted);">总资产</div><div style="font-size:20px;font-weight:700;color:var(--accent-blue);">¥${(d.total_value/10000).toFixed(2)}万</div></div>
          <div style="flex:1;padding:10px;background:rgba(255,255,255,0.02);border-radius:6px;border:1px solid var(--border-light);text-align:center;"><div style="font-size:10px;color:var(--text-muted);">盈亏</div><div style="font-size:20px;font-weight:700;color:${d.total_profit>=0?'var(--accent-red)':'var(--accent-green)'};">${d.total_propt_pct||0}%</div></div>
          <div style="flex:1;padding:10px;background:rgba(255,255,255,0.02);border-radius:6px;border:1px solid var(--border-light);text-align:center;"><div style="font-size:10px;color:var(--text-muted);">仓位</div><div style="font-size:20px;font-weight:700;color:var(--text-primary);">${d.risk_control.position_usage_pct}%</div></div>
        </div>
        ${d.positions.map(p => `<div style="display:flex;align-items:center;gap:10px;padding:6px 12px;background:rgba(255,255,255,0.02);border-radius:4px;border:1px solid var(--border-light);width:100%;">
          <span style="font-size:13px;font-weight:600;min-width:60px;color:var(--text-primary);">${p.name}</span>
          <span style="font-size:10px;color:var(--text-muted);">${p.shares}股</span>
          <span style="flex:1;font-size:11px;color:var(--text-secondary);">成本 ¥${p.avg_cost}</span>
          <span style="font-size:13px;font-weight:600;color:${p.profit_pct>=0?'var(--accent-red)':'var(--accent-green)'};">${p.profit_pct>=0?'+':''}${p.profit_pct}%</span>
          <span class="sc-tag ${p.signal==='持有'?'tag-value':p.signal==='关注'?'tag-tech':'tag-growth'}">${p.signal}</span>
        </div>`).join('')}
      </div>`;
    },
    'ai-analysis': (c) => {
      c.innerHTML = `<div class="placeholder-content" style="gap:12px;">
        <div class="icon">🤖</div>
        <h2>AI 决策中枢</h2>
        <div style="display:flex;gap:8px;">
          <a class="badge" href="http://localhost:8082" target="_blank" style="cursor:pointer;text-decoration:none;padding:8px 20px;">🎯 打开 Dify</a>
          <a class="badge" href="http://localhost:8086" target="_blank" style="cursor:pointer;text-decoration:none;padding:8px 20px;">🤖 PraisonAI</a>
          <span class="badge" style="cursor:pointer;" onclick="openAnalysis()">📄 当前分析</span>
        </div>
      </div>`;
    },
    'knowledge': (c) => {
      c.innerHTML = `<div class="placeholder-content" style="width:100%;max-width:600px;text-align:left;gap:8px;">
        <h2 style="font-size:16px;font-weight:600;color:var(--text-primary);width:100%;border-bottom:1px solid var(--border-light);padding-bottom:8px;">📚 知识库</h2>
        <div style="display:flex;gap:8px;width:100%;">
          <div style="flex:1;padding:14px;background:rgba(255,255,255,0.02);border-radius:6px;border:1px solid var(--border-light);text-align:center;cursor:pointer;"><div style="font-size:28px;">📄</div><div style="font-size:13px;font-weight:600;color:var(--text-primary);">行业研报</div><div style="font-size:10px;color:var(--text-muted);">12 篇</div></div>
          <div style="flex:1;padding:14px;background:rgba(255,255,255,0.02);border-radius:6px;border:1px solid var(--border-light);text-align:center;cursor:pointer;"><div style="font-size:28px;">📊</div><div style="font-size:13px;font-weight:600;color:var(--text-primary);">财务数据</div><div style="font-size:10px;color:var(--text-muted);">8 份</div></div>
          <div style="flex:1;padding:14px;background:rgba(255,255,255,0.02);border-radius:6px;border:1px solid var(--border-light);text-align:center;cursor:pointer;"><div style="font-size:28px;">🎓</div><div style="font-size:13px;font-weight:600;color:var(--text-primary);">投资技能</div><div style="font-size:10px;color:var(--text-muted);">5 个</div></div>
        </div>
        <div style="width:100%;"><div style="display:flex;gap:6px;background:var(--bg-card);padding:8px 12px;border-radius:6px;border:1px solid var(--border-light);"><span style="color:var(--text-muted);font-size:12px;">🔍</span><input placeholder="搜索知识库..." style="flex:1;background:transparent;border:none;color:var(--text-primary);font-size:12px;outline:none;" onfocus="this.placeholder=''" onblur="this.placeholder='搜索知识库...'"/></div></div>
      </div>`;
    },
    'signals': async (c) => {
      const r = await fetch('/api/modules/signals');
      const d = await r.json();
      c.innerHTML = `<div class="placeholder-content" style="width:100%;max-width:700px;text-align:left;gap:6px;">
        <h2 style="font-size:16px;font-weight:600;color:var(--text-primary);width:100%;border-bottom:1px solid var(--border-light);padding-bottom:8px;">🔔 信号中心</h2>
        <div style="display:flex;gap:6px;font-size:11px;color:var(--text-muted);width:100%;">今日 ${d.today_signals.buy}买 ${d.today_signals.sell}卖</div>
        ${d.signals.map(s => `<div style="display:flex;align-items:center;gap:8px;padding:5px 10px;background:rgba(255,255,255,0.02);border-radius:4px;border:1px solid var(--border-light);width:100%;">
          <span style="font-size:10px;color:var(--text-muted);">${s.time}</span>
          <span style="font-size:12px;">${s.type==='buy'?'🟢':s.type==='sell'?'🔴':'🟡'}</span>
          <span style="font-size:13px;font-weight:600;color:var(--text-primary);width:60px;">${s.name}</span>
          <span style="flex:1;font-size:10px;color:var(--text-secondary);">${s.reason}</span>
          <span style="font-size:12px;font-weight:700;color:var(--accent-blue);">${s.score}</span>
          <span class="sc-tag ${s.status==='executed'?'tag-growth':s.status==='pending'?'tag-tech':'tag-value'}">${s.status}</span>
        </div>`).join('')}
      </div>`;
    },
    'tasks': async (c) => {
      const r = await fetch('/api/modules/tasks');
      const d = await r.json();
      c.innerHTML = `<div class="placeholder-content" style="width:100%;max-width:700px;text-align:left;gap:6px;">
        <h2 style="font-size:16px;font-weight:600;color:var(--text-primary);width:100%;border-bottom:1px solid var(--border-light);padding-bottom:8px;">📋 任务状态</h2>
        ${d.tasks.map(t => `<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:rgba(255,255,255,0.02);border-radius:4px;border:1px solid var(--border-light);width:100%;">
          <span>${t.status==='running'?'🔄':t.status==='completed'?'✅':'⏳'}</span>
          <span style="flex:1;font-size:12px;color:var(--text-primary);">${t.name}</span>
          <span style="font-size:10px;color:${t.status==='running'?'var(--accent-blue)':t.status==='completed'?'var(--accent-green)':'var(--text-muted)'};">${t.node}</span>
          <span style="font-size:10px;color:var(--text-muted);">${t.elapsed}</span>
        </div>`).join('')}
      </div>`;
    },
    'system': async (c) => {
      const r = await fetch('/api/modules/system');
      const d = await r.json();
      c.innerHTML = `<div class="placeholder-content" style="width:100%;max-width:700px;text-align:left;gap:6px;">
        <h2 style="font-size:16px;font-weight:600;color:var(--text-primary);width:100%;border-bottom:1px solid var(--border-light);padding-bottom:8px;">⚙️ 系统设置</h2>
        <div style="display:flex;align-items:center;justify-content:space-between;width:100%;padding:6px 10px;background:rgba(255,255,255,0.02);border-radius:4px;border:1px solid var(--border-light);">
          <span style="font-size:12px;color:var(--text-primary);">数据源</span>
          <span style="font-size:11px;color:var(--accent-cyan);">${d.data_source.current} (已连接)</span>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;width:100%;padding:6px 10px;background:rgba(255,255,255,0.02);border-radius:4px;border:1px solid var(--border-light);">
          <span style="font-size:12px;color:var(--text-primary);">更新频率</span>
          <span style="font-size:11px;color:var(--text-muted);">${d.update_freq}</span>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;width:100%;padding:6px 10px;background:rgba(255,255,255,0.02);border-radius:4px;border:1px solid var(--border-light);">
          <span style="font-size:12px;color:var(--text-primary);">版本</span>
          <span style="font-size:11px;color:var(--text-muted);">v${d.version}</span>
        </div>
        <h3 style="font-size:13px;font-weight:600;color:var(--text-primary);width:100%;margin-top:4px;">服务状态</h3>
        ${d.services.map(s => `<div style="display:flex;align-items:center;gap:8px;width:100%;padding:4px 10px;">
          <span style="font-size:10px;color:${s.status==='running'?'var(--accent-green)':'var(--accent-red)'};">●</span>
          <span style="font-size:12px;flex:1;color:var(--text-primary);">${s.name}</span>
          <span style="font-size:10px;color:var(--text-muted);">:${s.port}</span>
        </div>`).join('')}
      </div>`;
    },
    'profile': (c) => {
      c.innerHTML = `<div class="placeholder-content" style="gap:8px;">
        <div class="user-avatar" style="width:56px;height:56px;font-size:22px;">军</div>
        <h2 style="font-size:16px;color:var(--text-primary);">军哥</h2>
        <p style="font-size:11px;color:var(--text-muted);">AI 智能选股系统 · 管理员</p>
        <div class="badge">在线 · 2026-05-17</div>
      </div>`;
    }
  };
  const render = renderers[page];
  if(render) render(container);
  else {
    container.innerHTML = '<div class="placeholder-content"><div class="icon">🚧</div><h2>开发中</h2></div>';
  }
}

// ═══════════════ 初始化 ═══════════════
document.addEventListener('DOMContentLoaded', () => {
  cacheDom(); startPolling();
  window.addEventListener('resize', onResize);
});
