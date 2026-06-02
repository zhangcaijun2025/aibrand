/**
 * POST /api/dify/query — Dify 知识库 RAG 检索
 *
 * 根据查询文本从 Dify 知识库中检索相关文档片段
 */
import { NextRequest, NextResponse } from 'next/server'

const DIFY_BASE_URL = process.env.DIFY_BASE_URL || 'http://localhost:8082'
const DIFY_API_KEY = process.env.DIFY_API_KEY || ''

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query = '', knowledge_base = 'content-practices', top_k = 5 } = body

    if (!query) {
      return NextResponse.json({ error: '查询文本不能为空' }, { status: 400 })
    }

    // Dify 知识库检索 API
    const url = `${DIFY_BASE_URL}/v1/datasets/${knowledge_base}/retrieve`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DIFY_API_KEY}`,
        },
        body: JSON.stringify({
          query,
          retrieval_model: {
            search_method: 'hybrid_search',
            top_k,
            score_threshold: 0.5,
          },
        }),
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (!res.ok) {
        console.warn('[Dify Query] Dify returned', res.status)
        return NextResponse.json({
          success: false,
          documents: [],
          error: `Dify returned ${res.status}`,
        })
      }

      const data = await res.json()
      return NextResponse.json({
        success: true,
        documents: data.records || data.documents || [],
      })
    } catch {
      clearTimeout(timeout)
      // Dify 不可达时的优雅降级
      console.warn('[Dify Query] Dify unreachable, returning empty')
      return NextResponse.json({
        success: false,
        documents: [],
        error: 'Dify 服务不可达',
      })
    }
  } catch (err: any) {
    console.error('[Dify Query] Error:', err.message)
    return NextResponse.json(
      { error: '知识库检索失败', detail: err.message },
      { status: 500 },
    )
  }
}
