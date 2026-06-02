"use client";
const t="一键发布",d="基于OpenClaw平台适配器生态",f=["支持平台：小红书、抖音、视频号、快手、B站", "自动适配：按平台规则裁剪尺寸", "矩阵发布：支持账号分组管理", "发布状态追踪：实时显示进度"];
export default function P(){return (
<div style={{maxWidth:800,margin:"0 auto",padding:24}}>
<h1 style={{fontSize:24,fontWeight:700,marginBottom:8}}>{t}</h1>
<p style={{color:"#666",marginBottom:20}}>{d}</p>
<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:12}}>
{f.map((x,i)=>(<div key={i} style={{background:"#f8f9fa",borderRadius:12,padding:16,border:"1px solid #eee"}}>
<div style={{fontSize:13,color:"#333",lineHeight:1.5}}>{x}</div></div>))}</div></div>);}