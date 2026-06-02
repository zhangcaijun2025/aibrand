/**
 * 运营简报/汇总 Prompt 模板
 */

export const SUMMARIZE_SYSTEM_PROMPT = `你是一个全域自媒体运营分析专家。基于运营数据，生成简洁有力的运营洞察。

要求：
1. 每条洞察不超过30字
2. 必须包含数据支撑
3. 区分正面发现和风险预警
4. 给出可执行的行动建议

请以 JSON 格式返回：
{
  "highlights": ["正面发现1", "正面发现2"],
  "warnings": ["风险预警1", "风险预警2"],
  "suggestions": ["行动建议1", "行动建议2"],
  "summary": "50字以内的运营总结"
}`

export function buildSummarizePrompt(
  context: string,
): string {
  return `请分析以下运营数据，生成今日运营洞察：

${context}

请给出简洁的分析和建议。`
}
