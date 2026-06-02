/**
 * POST /api/ai/optimize — DeepSeek R1 优化方案生成
 */
import { NextRequest, NextResponse } from 'next/server'
import { deepseekThink } from '@/services/ai/deepseek'
import { OPTIMIZE_SYSTEM_PROMPT, buildOptimizePrompt } from '@/services/ai/prompts/optimize'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      title = '',
      content = '',
      category = 'lifestyle',
      diagnosisScore = 70,
      weaknesses = [],
      platforms = ['xiaohongshu'],
    } = body

    if (!title && !content) {
      return NextResponse.json({ error: '标题和内容不能同时为空' }, { status: 400 })
    }

    const userPrompt = buildOptimizePrompt(title, content, category, diagnosisScore, weaknesses, platforms)
    const result = await deepseekThink(OPTIMIZE_SYSTEM_PROMPT, userPrompt)

    // 尝试解析 JSON 响应
    let plans
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/)
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null
      plans = parsed?.plans || [{ name: 'AI 优化方案', description: result.content, predicted_score: diagnosisScore + 10 }]
    } catch {
      plans = [{ name: 'AI 优化方案', description: result.content, predicted_score: diagnosisScore + 10 }]
    }

    return NextResponse.json({
      success: true,
      model: result.model,
      plans,
      usage: result.usage,
    })
  } catch (err: any) {
    console.error('[AI Optimize] Error:', err.message)
    return NextResponse.json(
      { error: '优化服务暂时不可用', detail: err.message },
      { status: 500 },
    )
  }
}
