/**
 * POST /api/ai/summarize — DeepSeek 运营简报生成
 */
import { NextRequest, NextResponse } from 'next/server'
import { deepseekQuick } from '@/services/ai/deepseek'
import { SUMMARIZE_SYSTEM_PROMPT, buildSummarizePrompt } from '@/services/ai/prompts/summarize'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { context = '' } = body

    if (!context) {
      return NextResponse.json({ error: '缺少分析上下文' }, { status: 400 })
    }

    const userPrompt = buildSummarizePrompt(context)
    const result = await deepseekQuick(SUMMARIZE_SYSTEM_PROMPT, userPrompt)

    let insights
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/)
      insights = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: result.content }
    } catch {
      insights = { summary: result.content }
    }

    return NextResponse.json({
      success: true,
      model: result.model,
      insights,
      usage: result.usage,
    })
  } catch (err: any) {
    console.error('[AI Summarize] Error:', err.message)
    return NextResponse.json(
      { error: '简报服务暂时不可用', detail: err.message },
      { status: 500 },
    )
  }
}
