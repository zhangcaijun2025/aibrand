"use client";
import { useState } from "react";
import { runFullWorkflow, WorkflowStatusIndicator, type WorkflowResult } from "@/app/diagnosis/diagnosis-workflow";

/**
 * 账号体检
 * 录入账号信息 → 生成五维健康评分
 * 完成后自动触发 N8N + Dify 全链路
 */
export default function AccountCheckPage() {
  const [nickname, setNickname] = useState("");
  const [platform, setPlatform] = useState("xiaohongshu");
  const [followerCount, setFollowerCount] = useState(0);
  const [avgLikes, setAvgLikes] = useState(0);
  const [postCount, setPostCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [result, setResult] = useState<any>(null);
  const [workflowResult, setWorkflowResult] = useState<WorkflowResult>();

  const PLATFORMS = [
    { key: "xiaohongshu", label: "小红书" },
    { key: "douyin", label: "抖音" },
    { key: "bilibili", label: "B站" },
    { key: "tiktok", label: "TikTok" },
  ];

  /**
   * 计算五维健康评分
   */
  function calculateHealthScore(data: {
    followers: number;
    avgLikes: number;
    posts: number;
    platform: string;
  }) {
    // 内容生产力
    const productivity = Math.min(data.posts > 0 ? 100 : 0, 100);

    // 互动质量
    const engagementRate = data.followers > 0
      ? (data.avgLikes / data.followers) * 100
      : 0;
    const engagement = Math.min(Math.round(engagementRate * 10), 100);

    // 粉丝基础
    const followerBase = Math.min(
      data.followers >= 10000 ? 90 : data.followers >= 1000 ? 70 : data.followers >= 100 ? 50 : 20,
      100,
    );

    // 内容频率
    const frequency = Math.min(data.posts > 50 ? 90 : data.posts > 20 ? 70 : data.posts > 5 ? 50 : 30, 100);

    // 成长潜力
    const growth = Math.min(
      data.followers > 0 && data.avgLikes > 0
        ? Math.round((data.avgLikes / Math.max(data.followers, 1)) * 50 + 30)
        : 30,
      100,
    );

    const scores = { productivity, engagement, followerBase, frequency, growth };
    const total = Math.round(
      (productivity * 0.2 + engagement * 0.3 + followerBase * 0.25 + frequency * 0.1 + growth * 0.15)
    );

    let level: string;
    if (total >= 85) level = "S级（优质账号）";
    else if (total >= 75) level = "A级（健康账号）";
    else if (total >= 60) level = "B级（一般账号）";
    else if (total >= 45) level = "C级（待提升）";
    else level = "D级（新号/需优化）";

    return { scores, total, level };
  }

  const runCheck = async () => {
    if (!nickname.trim()) { setMsg("请输入账号昵称"); return; }

    setLoading(true);
    setMsg("体检中...");
    setResult(null);
    setWorkflowResult(undefined);

    try {
      // 计算五维健康评分
      const health = calculateHealthScore({
        followers: followerCount,
        avgLikes: avgLikes,
        posts: postCount,
        platform,
      });

      const checkResult = {
        nickname: nickname.trim(),
        platform,
        followerCount,
        avgLikes,
        postCount,
        ...health,
        timestamp: new Date().toISOString(),
      };

      setResult(checkResult);
      setMsg(`✅ 体检完成 · 综合评分: ${health.total}/100 (${health.level})`);

      // 全链路工作流：N8N + Dify
      runFullWorkflow('account', {
        nickname: nickname.trim(),
        platform,
        score: health.total,
        grade: health.level,
        scores: health.scores,
        suggestions: getSuggestions(health.scores, health.total),
        followerCount,
        avgLikes,
        postCount,
      }).then(wf => setWorkflowResult(wf))

    } catch (e: any) {
      setMsg(`❌ ${e.message}`);
      console.error(e);
    }
    setLoading(false);
  };

  function getSuggestions(scores: any, total: number): string[] {
    const suggestions: string[] = [];
    if (scores.engagement < 60) suggestions.push("提升互动率：优化标题钩子，增加评论区互动引导");
    if (scores.productivity < 60) suggestions.push("提高内容频率：建议保持每周3-5篇发布节奏");
    if (scores.followerBase < 60) suggestions.push("扩大粉丝基数：尝试合作推广或跨平台引流");
    if (scores.frequency < 60) suggestions.push("增加发布频率：定期更新保持账号活跃度");
    if (scores.growth < 60) suggestions.push("优化内容策略：分析竞品爆款，调整内容方向");
    if (suggestions.length === 0) suggestions.push("账号状态良好，继续保持！");
    return suggestions;
  }

  const total = result?.total || 0;
  const cl = total >= 85 ? "#4caf50" : total >= 60 ? "#ff9800" : "#f44336";

  const DIM_LABELS: Record<string, string> = {
    productivity: "内容生产力",
    engagement: "互动质量",
    followerBase: "粉丝基础",
    frequency: "内容频率",
    growth: "成长潜力",
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>账号体检</h1>
      <p style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>
        录入账号基本信息，AI 自动生成五维健康评估
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

      <input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="账号昵称"
        style={{ width: "100%", padding: 10, marginBottom: 8, border: "1px solid #ddd", borderRadius: 10, fontSize: 13 }} />

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input type="number" value={followerCount || ''} onChange={e => setFollowerCount(Number(e.target.value))}
          placeholder="粉丝数" style={{ flex: 1, padding: 10, border: "1px solid #ddd", borderRadius: 10, fontSize: 13 }} />
        <input type="number" value={avgLikes || ''} onChange={e => setAvgLikes(Number(e.target.value))}
          placeholder="平均点赞" style={{ flex: 1, padding: 10, border: "1px solid #ddd", borderRadius: 10, fontSize: 13 }} />
        <input type="number" value={postCount || ''} onChange={e => setPostCount(Number(e.target.value))}
          placeholder="发布篇数" style={{ flex: 1, padding: 10, border: "1px solid #ddd", borderRadius: 10, fontSize: 13 }} />
      </div>

      <button onClick={runCheck} disabled={loading} style={{
        width: "100%", padding: 12, border: "none", borderRadius: 10,
        background: loading ? "#ccc" : "linear-gradient(135deg,#0070f3,#00b4d8)",
        color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
      }}>
        {loading ? "体检中..." : "开始体检"}
      </button>

      {msg && !loading && (
        <div style={{ marginTop: 6, fontSize: 11, color: "#888", textAlign: "center" }}>{msg}</div>
      )}

      {/* 体检结果 */}
      {result && (
        <div style={{ marginTop: 16 }}>
          <div style={{ background: "linear-gradient(135deg,#1a1a2e,#16213e)", borderRadius: 16, padding: 20, marginBottom: 12 }}>
            <div style={{ color: "#8899b8", fontSize: 11 }}>{result.nickname} · 综合健康指数</div>
            <div style={{ fontSize: 36, fontWeight: 700, color: cl }}>{total}/100</div>
            <div style={{ padding: "2px 10px", borderRadius: 14, fontSize: 11, display: "inline-block", marginTop: 4,
              background: total >= 85 ? "rgba(76,175,80,0.2)" : total >= 60 ? "rgba(255,152,0,0.2)" : "rgba(244,67,54,0.2)", color: cl }}>
              {result.level || '-'}
            </div>
          </div>

          {/* 五维评分 */}
          <div style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #eee", marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>五维健康评估</div>
            {Object.entries(result.scores || {}).map(([key, val]) => {
              const v = val as number;
              return (
                <div key={key} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                    <span style={{ color: "#666" }}>{DIM_LABELS[key] || key}</span>
                    <span style={{ fontWeight: 600, color: v >= 70 ? "#4caf50" : v >= 50 ? "#ff9800" : "#f44336" }}>{v}</span>
                  </div>
                  <div style={{ height: 6, background: "#eee", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${v}%`, background: v >= 70 ? "#4caf50" : v >= 50 ? "#ff9800" : "#f44336", borderRadius: 3 }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* 优化建议 */}
          {result.suggestions && result.suggestions.length > 0 && (
            <div style={{ background: "linear-gradient(135deg,#fff8e1,#fff3cd)", borderRadius: 12, padding: 16, border: "1px solid #ffe082", marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "#f57f17" }}>💡 优化建议</div>
              {result.suggestions.map((sg: string, i: number) => (
                <div key={i} style={{ fontSize: 11, color: "#795548", marginBottom: 4, paddingLeft: 12 }}>
                  • {sg}
                </div>
              ))}
            </div>
          )}

          {/* N8N / Dify 同步状态指示器 */}
          <WorkflowStatusIndicator result={workflowResult} />
        </div>
      )}
    </div>
  );
}
