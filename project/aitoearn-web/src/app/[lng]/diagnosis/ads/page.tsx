"use client";
const t="广告投放诊疗",d="自然流量+付费流量双轮驱动",f=["素材诊断：点击率、转化率评分", "人群建议：精准人群标签推荐", "投放模式：DOU+、薯条、粉条", "预算策略：小额测试到逐步放量", "ROI预判：基于历史数据预测"];
export default function P(){return (
<div style={{maxWidth:800,margin:"0 auto",padding:24}}>
<h1 style={{fontSize:24,fontWeight:700,marginBottom:8}}>{t}</h1>
<p style={{color:"#666",marginBottom:20}}>{d}</p>
<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:12}}>
{f.map((x,i)=>(<div key={i} style={{background:"#f8f9fa",borderRadius:12,padding:16,border:"1px solid #eee"}}>
<div style={{fontSize:13,color:"#333",lineHeight:1.5}}>{x}</div></div>))}</div></div>);}