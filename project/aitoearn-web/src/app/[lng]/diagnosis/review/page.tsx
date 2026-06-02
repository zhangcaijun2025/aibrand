"use client";
import { useState } from "react";
import { preScore, type ModelAResult } from "@/app/diagnosis/model-a";
import { runFullWorkflow, WorkflowStatusIndicator, type WorkflowResult } from "@/app/diagnosis/diagnosis-workflow";

/**
 * 智能复诊
 * 输入发布链接 → 调用 Model A 评分 → 显示分析结果
 * 完成后自动触发 N8N + Dify 全链路
 */
export default function ReviewPage() {
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState("xiaohongshu");
  const [result, setResult] = useState<ModelAResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [workflowResult, setWorkflowResult] = useState<WorkflowResult | null>(null);

  const PLATFORMS = [
    { key: "xiaohongshu", label: "小红书" },
    { key: "douyin", label: "抖音" },
    { key: "bilibili", label: "B站" },
    { key: "weibo", label: "微博" },
  ];

  /**
   * 从链接中提取标题信息
   */
  function extractTitleFromUrl(urlStr: string): string {
    try {
      const u = new URL(urlStr);
      // 从 pathname 提取可读信息
      const path = u.pathname.replace(/\/+/g, ' ').trim()
      return path || u.hostname
    } catch {
      return urlStr.slice(0, 40)
    }
  }

  const runReview = async () => {
    if (!url.trim()) { setMsg("请输入发布链接"); return; }

    setLoading(true);
    setMsg("分析中...");
    setResult(null);
    setWorkflowResult(null);

    try {
      // 尝试调用后端 NoteRx 复诊接口
      const formData = new FormData();
      formData.append("url", url);
      formData.append("platform", platform);

      const res = await fetch("/api/diagnose", {
        method: "POST",
        body: formData,
      });

      let score: number = 0;
      let level: string = "";
      let data: any = null;

      if (res.ok) {
        data = await res.json();
        score = data.overall_score || 0;
        level = data.grade || "";
      }

      // 如果后端不可用，使用 Model A 本地评分作为兜底
      if (!score) {
        const title = extractTitleFromUrl(url);
        const simContent = `发布链接: ${url} | 平台: ${platform}`;
        const localResult = preScore(title, simContent, "lifestyle", 4, 1);
        score = localResult.total_score;
        level = localResult.level;
        data = localResult;
      }

      const reviewResult: ModelAResult = {
        total_score: score,
        dimensions: data?.dimensions || {
          title_quality: 0, content_quality: 0, visual_quality: 0,
          tag_strategy: 0, engagement_potential: 0,
        },
        weights: data?.weights || {},
        level: level,
        baseline: data?.baseline || { avg_engagement: 0, median: 0, viral_threshold: 0, sample_size: 0 },
      };

      setResult(reviewResult);
      setMsg(`✅ 复诊完成 · 评分: ${score}/100`);

      // 全链路工作流：N8N + Dify
      runFullWorkflow('review', {
        url,
        platform,
        score,
        level,
        grade: level,
        title: `复诊: ${extractTitleFromUrl(url)}`,
      }).then(wf => setWorkflowResult(wf))

    } catch (e: any) {
      setMsg(`❌ ${e.message}`);
      console.error(e);
    }
    setLoading(false);
  };

  const s = result?.total_score || 0;
  const cl = s >= 80 ? "#4caf50" : s >= 60 ? "#ff9800" : "#f44336";

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>智能复诊</h1>
      <p style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>
        粘贴已发布内容的链接，AI 自动分析评分并给出优化建议
      </p>

      {/* 平台选择 */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
        {PLATFORMS.map(p =>
          <button key={p.key} onClick={() => setPlatform(p.key)} style={{
            padding: "4px 12px", border: "1px solid " + (platform === p.key ? "#0070f3" : "#ddd"),
            borderRadius: 14, background: platform === p.key ? "#f0f7ff" : "#fff",
            cursor: "pointer", fontSize: 12, color: platform === p.key ? "#0070f3" : "#666",
          }}>{p.label}</button>
        )}
      </div>

      <input value={url} onChange={e => setUrl(e.target.value)} placeholder="粘贴发布链接..." 
        style={{ width: "100%", padding: 12, marginBottom: 12, border: "1px solid #ddd", borderRadius: 10, fontSize: 13 }} />

      <button onClick={runReview} disabled={loading} style={{
        width: "100%", padding: 12, border: "none", borderRadius: 10,
        background: loading ? "#ccc" : "linear-gradient(135deg,#0070f3,#00b4d8)",
        color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
      }}>
        {loading ? "分析中..." : "开始复诊"}
      </button>

      {msg && !loading && (
        <div style={{ marginTop: 6, fontSize: 11, color: "#888", textAlign: "center" }}>{msg}</div>
      )}

      {/* 复诊结果 */}
      {result && (
        <div style={{ marginTop: 16 }}>
          <div style={{ background: "linear-gradient(135deg,#1a1a2e,#16213e)", borderRadius: 16, padding: 20, marginBottom: 12 }}>
            <div style={{ color: "#8899b8", fontSize: 11 }}>内容评分</div>
            <div style={{ fontSize: 36, fontWeight: 700, color: cl }}>{s.toFixed(1)}/100</div>
            <div style={{ padding: "2px 10px", borderRadius: 14, fontSize: 11, display: "inline-block", marginTop: 4,
              background: s >= 80 ? "rgba(76,175,80,0.2)" : s >= 60 ? "rgba(255,152,0,0.2)" : "rgba(244,67,54,0.2)", color: cl }}>
              {result.level || '-'}
            </div>
          </div>

          {/* 各维度评分 */}
          <div style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #eee" }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>各维度评分</div>
            {Object.entries(result.dimensions).map(([key, val]) => {
              const labelMap: Record<string, string> = {
                title_quality: "标题质量",
                content_quality: "内容质量",
                visual_quality: "视觉呈现",
                tag_strategy: "标签策略",
                engagement_potential: "互动潜力",
              };
              const ratio = (val as number) / 100;
              return (
                <div key={key} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                    <span style={{ color: "#666" }}>{labelMap[key] || key}</span>
                    <span style={{ fontWeight: 600 }}>{val}</span>
                  </div>
                  <div style={{ height: 6, background: "#eee", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${ratio * 100}%`, background: ratio >= 0.8 ? "#4caf50" : ratio >= 0.6 ? "#ff9800" : "#f44336", borderRadius: 3 }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* N8N / Dify 同步状态指示器 */}
          <WorkflowStatusIndicator result={workflowResult} />
        </div>
      )}
    </div>
  );
}
