"use client";
import { useState } from "react";
import { runFullWorkflow, WorkflowStatusIndicator, type WorkflowResult } from "@/app/diagnosis/diagnosis-workflow";

/**
 * 处方优化
 * 输入文案内容 → 调用 NoteRx optimize API → 生成3个优化方案
 * 完成后自动触发 N8N + Dify 全链路
 */
export default function OptimizePage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("food");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [workflowResult, setWorkflowResult] = useState<WorkflowResult>();

  const CATEGORIES = [
    { key: "food", label: "美食" },
    { key: "fashion", label: "穿搭" },
    { key: "tech", label: "科技" },
    { key: "travel", label: "旅游" },
    { key: "lifestyle", label: "生活" },
  ];

  const runOptimize = async () => {
    if (!content.trim()) { setMsg("请输入需要优化的文案"); return; }

    setLoading(true);
    setMsg("优化中...");
    setResult(null);
    setWorkflowResult(undefined);

    try {
      const formData = new FormData();
      formData.append("title", title || content.slice(0, 30));
      formData.append("content", content);
      formData.append("category", category);

      const res = await fetch("/api/optimize", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        setMsg(`❌ 服务器错误 (${res.status})`);
        console.error("API error:", text);
        return;
      }

      const data = await res.json();
      setResult(data);
      setMsg(`✅ 优化完成 · 原评分: ${data.original_score || '?'}`);

      // 全链路工作流：N8N + Dify
      runFullWorkflow('optimize', {
        title: title || content.slice(0, 30),
        content: content.slice(0, 200),
        category,
        score: data.original_score || 0,
        grade: data.original_score >= 75 ? '优质' : data.original_score >= 60 ? '中等' : '待优化',
        plans: data.plans || [],
      }).then(wf => setWorkflowResult(wf))

    } catch (e: any) {
      setMsg(`❌ ${e.message}`);
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>处方优化</h1>
      <p style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>
        AI 生成 3 个不同策略的优化方案，自动评分排序
      </p>

      {/* 品类选择 */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
        {CATEGORIES.map(c =>
          <button key={c.key} onClick={() => setCategory(c.key)} style={{
            padding: "4px 12px", border: "1px solid " + (category === c.key ? "#0070f3" : "#ddd"),
            borderRadius: 14, background: category === c.key ? "#f0f7ff" : "#fff",
            cursor: "pointer", fontSize: 12, color: category === c.key ? "#0070f3" : "#666",
          }}>{c.label}</button>
        )}
      </div>

      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="标题（选填）"
        style={{ width: "100%", padding: 10, marginBottom: 8, border: "1px solid #ddd", borderRadius: 10, fontSize: 13 }} />

      <textarea value={content} onChange={e => setContent(e.target.value)} rows={6}
        placeholder="粘贴需要优化的文案内容..." style={{ width: "100%", padding: 12, marginBottom: 12,
          border: "1px solid #ddd", borderRadius: 12, fontSize: 13, resize: "vertical" }} />

      <button onClick={runOptimize} disabled={loading} style={{
        width: "100%", padding: 12, border: "none", borderRadius: 10,
        background: loading ? "#ccc" : "linear-gradient(135deg,#0070f3,#00b4d8)",
        color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
      }}>
        {loading ? "优化中..." : "开始优化"}
      </button>

      {msg && !loading && (
        <div style={{ marginTop: 6, fontSize: 11, color: "#888", textAlign: "center" }}>{msg}</div>
      )}

      {/* 优化结果 */}
      {result && result.plans && (
        <div style={{ marginTop: 16 }}>
          <div style={{ background: "linear-gradient(135deg,#1a1a2e,#16213e)", borderRadius: 16, padding: 20, marginBottom: 12 }}>
            <div style={{ color: "#8899b8", fontSize: 11 }}>原始评分</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: result.original_score >= 75 ? "#4caf50" : "#ff9800" }}>
              {result.original_score || '?'}/100
            </div>
          </div>

          {result.plans.map((plan: any, i: number) => (
            <div key={i} style={{
              background: plan.recommended ? "linear-gradient(135deg,#f0fdf4,#e8f5e9)" : "#fff",
              borderRadius: 12, padding: 16, marginBottom: 8,
              border: plan.recommended ? "1px solid #4caf50" : "1px solid #eee",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{plan.strategy}</span>
                  {plan.recommended && (
                    <span style={{ marginLeft: 6, padding: "1px 6px", background: "#4caf50", color: "#fff", borderRadius: 8, fontSize: 10 }}>
                      推荐
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 16, color: "#4caf50" }}>{plan.score}</span>
                  {plan.score_delta > 0 && (
                    <span style={{ fontSize: 11, color: "#4caf50" }}>⬆ +{plan.score_delta}</span>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#333", marginBottom: 4 }}>{plan.optimized_title}</div>
              <div style={{ fontSize: 11, color: "#666", whiteSpace: "pre-line", lineHeight: 1.6 }}>
                {plan.optimized_content?.slice(0, 300)}
                {(plan.optimized_content?.length || 0) > 300 ? '...' : ''}
              </div>
              {plan.key_changes && (
                <div style={{ fontSize: 10, color: "#1976d2", marginTop: 6, padding: "4px 8px", background: "#f0f7ff", borderRadius: 6 }}>
                  {plan.key_changes}
                </div>
              )}
            </div>
          ))}

          {/* N8N / Dify 同步状态指示器 */}
          <WorkflowStatusIndicator result={workflowResult} />
        </div>
      )}
    </div>
  );
}
