/**
 * POST /api/n8n/trigger — 触发 N8N 工作流 Webhook
 *
 * 将 AiBrand 的诊断/优化等事件转发到 N8N 自动化工作流
 */
import { NextRequest, NextResponse } from 'next/server'

const N8N_BASE_URL = process.env.N8N_BASE_URL || 'http://localhost:5678'
const N8N_WEBHOOK_PATH = process.env.N8N_WEBHOOK_PATH || '/webhook'

// Webhook ID 映射
const WEBHOOK_IDS: Record<string, string> = {
  diagnosis: 'noterx-diagnosis-completed',
  optimize: 'noterx-optimize-completed',
  review: 'noterx-review-completed',
  account: 'noterx-account-check',
  daily_briefing: 'daily-briefing',
  weekly_report: 'weekly-report',
  post_publish: 'post-publish-track',
  recheck: 'recheck-reminder',
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { webhook_id, type, ...payload } = body

    const id = webhook_id || (type ? WEBHOOK_IDS[type] : null) || 'noterx-diagnosis-completed'
    const url = `${N8N_BASE_URL}${N8N_WEBHOOK_PATH}/${id}`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          type,
          source: 'AiBrand',
          timestamp: new Date().toISOString(),
        }),
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (!res.ok) {
        return NextResponse.json({
          success: false,
          status: 'failed',
          error: `N8N returned ${res.status}`,
        })
      }

      const data = await res.json().catch(() => ({}))
      return NextResponse.json({
        success: true,
        status: 'triggered',
        execution_id: data.execution?.id || data.id || null,
        webhook_id: id,
      })
    } catch (fetchErr: any) {
      clearTimeout(timeout)
      // N8N 不可达时的优雅降级
      console.warn('[N8N Trigger] N8N unreachable:', fetchErr.message)
      return NextResponse.json({
        success: false,
        status: 'unreachable',
        error: 'N8N 服务不可达，工作流将在 N8N 恢复后自动重试',
      })
    }
  } catch (err: any) {
    console.error('[N8N Trigger] Error:', err.message)
    return NextResponse.json(
      { success: false, status: 'error', error: err.message },
      { status: 500 },
    )
  }
}
