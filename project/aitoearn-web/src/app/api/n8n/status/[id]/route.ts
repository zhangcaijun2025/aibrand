/**
 * GET /api/n8n/status/:id — 查询 N8N 工作流执行状态
 */
import { NextRequest, NextResponse } from 'next/server'

const N8N_BASE_URL = process.env.N8N_BASE_URL || 'http://localhost:5678'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  try {
    const url = `${N8N_BASE_URL}/rest/executions/${id}`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    try {
      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timeout)

      if (!res.ok) {
        return NextResponse.json({
          status: 'unknown',
          error: `N8N returned ${res.status}`,
        })
      }

      const data = await res.json()
      return NextResponse.json({
        status: data.status || 'running',
        data: data,
      })
    } catch {
      clearTimeout(timeout)
      return NextResponse.json({
        status: 'running', // 保守假设仍在运行
        note: 'N8N 不可达，返回保守状态',
      })
    }
  } catch (err: any) {
    return NextResponse.json(
      { status: 'error', error: err.message },
      { status: 500 },
    )
  }
}
