/**
 * POST /api/ai/diagnosis — DeepSeek 内容诊断
 */
import { NextRequest, NextResponse } from 'next/server'
import { deepseekQuick, deepseekThink } from '@/services/ai/deepseek'
import { DIAGNOSIS_SYSTEM_PROMPT, buildDiagnosisPrompt } from '@/services/ai/prompts/diagnosis'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title = '', content = '', category = 'lifestyle', platforms = ['xiaohongshu'], deep = false } = body

    if (!title && !content) {
      return NextResponse.json({ error: '标题和内容不能同时为空' }, { status: 400 })
    }

    const userPrompt = buildDiagnosisPrompt(title, content, category, platforms)

    let result
    if (deep) {
      result = await deepseekThink(DIAGNOSIS_SYSTEM_PROMPT, userPrompt)
    } else {
      result = await deepseekQuick(DIAGNOSIS_SYSTEM_PROMPT, userPrompt)
    }

    // 尝试解析 JSON 响应
    let analysis
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/)
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: result.content }
    } catch {
      analysis = { raw: result.content }
    }

    return NextResponse.json({
      success: true,
      model: result.model,
      analysis,
      usage: result.usage,
    })
  } catch (err: any) {
    console.error('[AI Diagnosis] Error:', err.message)
    return NextResponse.json(
      { error: '诊断服务暂时不可用', detail: err.message },
      { status: 500 },
    )
  }
}
