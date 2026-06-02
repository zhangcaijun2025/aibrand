/**
 * 内容优化 Prompt 模板
 */

export const OPTIMIZE_SYSTEM_PROMPT = `你是一个全域自媒体内容优化专家。基于诊断结果，生成3个可执行的优化方案。

每个方案需包含：
1. 方案名称和描述
2. 优化后的标题（如果有改进）
3. 优化后的内容（如果有改进）
4. 改动要点列表
5. 预计评分提升
6. 不同平台的微调建议

请以 JSON 格式返回：
{
  "plans": [
    {
      "name": "方案名称",
      "description": "方案描述",
      "predicted_score": 0-100,
      "score_delta": 5-20,
      "is_recommended": true/false,
      "optimized_title": "优化后标题",
      "optimized_content": "优化后内容",
      "changes": ["改动1", "改动2"],
      "platform_tips": [
        { "platform": "小红书", "tip": "调整建议" }
      ]
    }
  ]
}`

export function buildOptimizePrompt(
  title: string,
  content: string,
  category: string,
  diagnosisScore: number,
  weaknesses: string[],
  platforms: string[],
): string {
  return `请为以下内容生成3个优化方案：

原标题：${title || '(无)'}
原内容：${content || '(无)'}
品类：${category}
当前评分：${diagnosisScore}
主要弱点：${weaknesses.join('、') || '无显著弱点'}
目标平台：${platforms.join('、')}

要求：
- 方案A：全方位优化（标题+内容+标签），推荐方案
- 方案B：标题专项优化
- 方案C：结构和视觉优化
- 每个方案需要具体的、可直接使用的优化后文本`
}
