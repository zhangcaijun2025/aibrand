"use client";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { runFullWorkflow, WorkflowStatusIndicator, type WorkflowResult } from "@/app/diagnosis/diagnosis-workflow";

/**
 * 全媒诊疗 - 内容诊断
 * 接入 DeepSeek AI (deepseek-v4-flash) 进行 AI 诊断
 * 诊断完成后自动触发 N8N 工作流 + 同步 Dify 知识库
 */
export default function Page() {
  const [mode, setMode] = useState("text");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("food");
  const [fileCount, setFileCount] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<Record<string, any> | null>(null);
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

  const DIM_NAMES: Record<string, string> = {
    title_quality: "标题质量",
    content_quality: "内容质量",
    visual_quality: "视觉质量",
    tag_strategy: "标签策略",
    engagement_potential: "互动潜力",
  };

  const runDiagnosis = async () => {
    const inputText = mode === "text" ? content : "";
    const inputTitle = mode === "text" ? title : "";
    if (!inputText.trim() && mode === "text") { setMsg("请输入文案"); return; }
    if (fileCount === 0 && mode === "file") { setMsg("请上传图片"); return; }

    setLoading(true);
    setMsg("AI 诊断中...");

    try {
      const res = await fetch("/api/ai/diagnosis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: inputTitle || "未命名笔记",
          content: inputText,
          category,
          mode: "quick",
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        setMsg(`❌ 服务器错误 (${res.status})`);
        console.error("API error:", text);
        setLoading(false);
        return;
      }

      const raw = await res.json();
      if (!raw.success) {
        setMsg(`❌ ${raw.error || "诊断失败"}`);
        setLoading(false);
        return;
      }

      // 将 DeepSeek 多维分析转换为页面格式
      const analysis = raw.analysis;
      const dims = analysis?.dimension_analysis || {};
      const agentOpinions = Object.entries(dims).map(([key, dim]: [string, any]) => ({
        agent_name: DIM_NAMES[key] || key,
        score: dim.score || 0,
        suggestions: [dim.suggestion || dim.weakness || ""].filter(Boolean),
      }));

      const data = {
        overall_score: analysis?.overall_score || 0,
        grade: analysis?.grade || "C",
        agent_opinions: agentOpinions,
      };
      setResult(data);
      setMsg(`✅ 完成 · 评分: ${data.overall_score}`);

      // 全链路工作流：N8N + Dify（非阻塞，不影响主流程）
      runFullWorkflow('diagnosis', {
        title: inputTitle || "未命名笔记",
        content: inputText,
        category,
        score: data.overall_score,
        grade: data.grade,
      }).then(wfResult => {
        setWorkflowResult(wfResult)
      })
    } catch (e: any) {
      setMsg(`❌ ${e.message}`);
      console.error(e);
    }
    setLoading(false);
  };

  const s = result?.overall_score || 0;
  const cl = s >= 80 ? "#4caf50" : s >= 60 ? "#ff9800" : "#f44336";

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>全媒诊疗</h1>

      {/* 输入模式切换 */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
        {[{ id: "text", l: "文案" }, { id: "file", l: "文件" }].map(x =>
          <button key={x.id} onClick={() => setMode(x.id)} style={{
            flex: 1, padding: "8px", border: "1px solid " + (mode === x.id ? "#0070f3" : "#ddd"),
            borderRadius: 8, background: mode === x.id ? "#f0f7ff" : "#fff",
            cursor: "pointer", fontSize: 12, color: mode === x.id ? "#0070f3" : "#666",
            fontWeight: mode === x.id ? 600 : 400,
          }}>{x.l}</button>
        )}
      </div>

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

      {mode === "text" && <>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="标题（选填）"
          style={{ width: "100%", padding: 10, marginBottom: 8, border: "1px solid #ddd", borderRadius: 10, fontSize: 13 }} />
        <textarea value={content} onChange={e => setContent(e.target.value)} rows={4}
          placeholder="粘贴文案..." style={{ width: "100%", padding: 12, marginBottom: 12,
            border: "1px solid #ddd", borderRadius: 12, fontSize: 13, resize: "vertical" }} />
      </>}

      {mode === "file" && <div style={{
        border: "2px dashed #ddd", borderRadius: 16, padding: 32, marginBottom: 12,
        textAlign: "center", background: "#fafafa"
      }}>
        <input type="file" multiple accept="image/*" style={{ display: "none" }} id="fu"
          onChange={e => { const fs = e.target.files; if (fs) { setFileCount(fs.length); setFiles(Array.from(fs)); } }} />
        <label htmlFor="fu" style={{ cursor: "pointer", fontSize: 13, color: "#666" }}>
          🖼️ 点击选择截图/图片
        </label>
        {fileCount > 0 && <div style={{ fontSize: 11, color: "#1976d2", marginTop: 4 }}>已选 {fileCount} 个文件</div>}
      </div>}

      <button onClick={runDiagnosis} disabled={loading} style={{
        width: "100%", padding: 12, border: "none", borderRadius: 10,
        background: loading ? "#ccc" : "linear-gradient(135deg,#0070f3,#00b4d8)",
        color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
      }}>
        {loading ? "诊断中..." : "开始诊断"}
      </button>

      {msg && !loading && <div style={{ marginTop: 6, fontSize: 11, color: "#888", textAlign: "center" }}>{msg}</div>}

      {/* 诊断结果 */}
      {result && (
        <div style={{ marginTop: 16 }}>
          <div style={{ background: "linear-gradient(135deg,#1a1a2e,#16213e)", borderRadius: 16, padding: 20, marginBottom: 12 }}>
            <div style={{ color: "#8899b8", fontSize: 11 }}>综合评分</div>
            <div style={{ fontSize: 36, fontWeight: 700, color: cl }}>{result.overall_score?.toFixed(1) || '?'}/100</div>
            <div style={{ padding: "2px 10px", borderRadius: 14, fontSize: 11, display: "inline-block", marginTop: 4,
              background: s >= 80 ? "rgba(76,175,80,0.2)" : s >= 60 ? "rgba(255,152,0,0.2)" : "rgba(244,67,54,0.2)", color: cl }}>
              {result.grade || '-'}
            </div>
          </div>

          {/* Agent 诊断意见 */}
          {result.agent_opinions?.map((op: any, i: number) => (
            <div key={i} style={{ background: "#fff", borderRadius: 8, padding: 10, marginBottom: 4, border: "1px solid #eee" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{op.agent_name}</span>
                <span style={{ fontWeight: 700, color: op.score >= 60 ? "#4caf50" : "#f44336" }}>{op.score}</span>
              </div>
              {op.suggestions?.slice(0, 2).map((sg: string, j: number) => (
                <div key={j} style={{ fontSize: 10, color: "#1976d2", marginTop: 2 }}>{sg}</div>
              ))}
            </div>
          ))}

          {/* N8N / Dify 同步状态指示器 */}
          <WorkflowStatusIndicator result={workflowResult} />
        </div>
      )}
    </div>
  );
}
