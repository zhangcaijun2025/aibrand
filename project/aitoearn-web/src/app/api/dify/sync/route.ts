/**
 * POST /api/dify/sync — Dify 知识库写入
 *
 * 将诊断结果、优化方案等数据同步到 Dify 知识库
 */
import { NextRequest, NextResponse } from 'next/server'

const DIFY_BASE_URL = process.env.DIFY_BASE_URL || 'http://localhost:8082'
const DIFY_API_KEY = process.env.DIFY_API_KEY || ''

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      title = '',
      category = '',
      score = 0,
      grade = '',
      analysis_summary = '',
      issues = [],
      suggestions = [],
      content = '',
    } = body

    if (!title && !content) {
      return NextResponse.json({ error: '内容不能为空' }, { status: 400 })
    }

    // 构建知识库文档
    const document = {
      name: `[诊断] ${title || content.slice(0, 30)}`,
      text: `标题：${title}
品类：${category}
评分：${score} (${grade})
分析摘要：${analysis_summary}
问题：${Array.isArray(issues) ? issues.join('；') : issues}
建议：${Array.isArray(suggestions) ? suggestions.join('；') : suggestions}
原始内容：${content}`,
      metadata: {
        source: 'AiBrand-diagnosis',
        category,
        score,
        grade,
        timestamp: new Date().toISOString(),
      },
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    try {
      const res = await fetch(`${DIFY_BASE_URL}/v1/datasets/diagnosis-records/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DIFY_API_KEY}`,
        },
        body: JSON.stringify(document),
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (!res.ok) {
        console.warn('[Dify Sync] Dify returned', res.status)
        return NextResponse.json({
          synced: false,
          error: `Dify returned ${res.status}`,
        })
      }

      return NextResponse.json({ synced: true })
    } catch {
      clearTimeout(timeout)
      // Dify 不可达时的优雅降级
      console.warn('[Dify Sync] Dify unreachable')
      return NextResponse.json({
        synced: false,
        error: 'Dify 服务不可达，数据将稍后重试',
      })
    }
  } catch (err: any) {
    console.error('[Dify Sync] Error:', err.message)
    return NextResponse.json(
      { synced: false, error: err.message },
      { status: 500 },
    )
  }
}
