"use client";
const t="生命体征监测",d="24小时不间断监测内容健康状况",f=["基础体征：播放量、点赞、收藏、评论", "深度体征：完播率、留存曲线、点击率", "异常预警：流量腰斩、违规限流", "实时数据看板：可视化展示"];
export default function P(){return (
<div style={{maxWidth:800,margin:"0 auto",padding:24}}>
<h1 style={{fontSize:24,fontWeight:700,marginBottom:8}}>{t}</h1>
<p style={{color:"#666",marginBottom:20}}>{d}</p>
<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:12}}>
{f.map((x,i)=>(<div key={i} style={{background:"#f8f9fa",borderRadius:12,padding:16,border:"1px solid #eee"}}>
<div style={{fontSize:13,color:"#333",lineHeight:1.5}}>{x}</div></div>))}</div></div>);}