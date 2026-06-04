/**
 * Dashboard API - 全域运营仪表盘数据
 *
 * 从后端各服务聚合真实数据：
 *   Agent greeting → 系统状态 + 简报
 *   Subscription   → 订阅计划 + 使用配额
 *   Credits        → 积分余额
 *   Notifications  → 未读通知数
 *   Accounts       → 已连接平台数
 *   Agent events   → AI 建议
 *
 * 后端不可用时降级返回骨架数据，确保前端不报错。
 */

import { NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_PROXY_URL || 'http://localhost:8080'

// 内部服务 Token（绕过 JWT 用户认证，服务间调用用）
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'change-this-secret-token'

async function backendFetch(path: string, authHeader: string): Promise<any> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000)
    const res = await fetch(`${BACKEND}${path}`, {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
    })
    clearTimeout(timeout)
    if (!res.ok) return null
    const json = await res.json()
    return json.code === 0 ? json.data : null
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  // 优先使用用户 JWT（浏览器发起），回退到内部 Token（服务间调用）
  const authHeader = request.headers.get('Authorization')
    || request.headers.get('authorization')
    || `Bearer ${INTERNAL_TOKEN}`

  // 并行请求后端各服务
  const [agentGreeting, subPlans, credits, notifications, accounts] =
    await Promise.all([
      backendFetch('/api/agent/greeting', authHeader),
      backendFetch('/api/user/subscription/plans', authHeader),
      backendFetch('/api/user/credits', authHeader),
      backendFetch('/api/notification/unread-count', authHeader),
      backendFetch('/api/account/list/all', authHeader),
    ])

  // ── 从真实数据构建 Dashboard ──

  // 系统状态 (来自 Agent greeting)
  const sysStatus = agentGreeting?.systemStatus
  const healthyCount = typeof sysStatus?.healthyComponents === 'number' ? sysStatus.healthyComponents : 0
  const totalComponents = typeof sysStatus?.totalComponents === 'number' ? sysStatus.totalComponents : 0
  const systemHealth = totalComponents > 0 ? Math.round((healthyCount / totalComponents) * 100) : 100
  const alerts = typeof sysStatus?.alerts === 'number' ? sysStatus.alerts : 0
  const score = Math.min(100, systemHealth - alerts * 5)
  const scoreChange = alerts > 0 ? -alerts : 0

  // 账号统计 (来自 Account list)
  const accountList = Array.isArray(accounts) ? accounts : (accounts?.list ?? [])
  const totalAccounts = accountList.length
  const connectedAccounts = accountList.filter(
    (a: any) => a.status === 1 || a.status === 'connected',
  ).length

  // 订阅配额 (来自 Subscription)
  const planList = Array.isArray(subPlans) ? subPlans : (subPlans?.list ?? [])
  const activePlan = planList.length > 0 ? planList[0] : null
  const weeklyPostsLimit = activePlan?.maxContentPerMonth
    ? Math.round(activePlan.maxContentPerMonth / 4)
    : 20 // 默认每周20条

  // 积分 (来自 Credits)
  const creditsBalance = credits?.balance ?? 0

  // 通知 (来自 Notifications)
  const unreadCount = notifications?.count ?? notifications?.unreadCount ?? 0

  // AI 建议 (优先来自 Agent greeting 的 briefCards)
  const suggestions: { id: string; type: 'warning' | 'opportunity' | 'reminder'; text: string }[] = []
  const briefCards = agentGreeting?.briefCards || agentGreeting?.briefingCards || []
  if (briefCards.length > 0) {
    briefCards.forEach((card: any, i: number) => {
      const isWarning = card.trend === 'down' || card.type === 'warning'
      suggestions.push({
        id: `brief-${i}`,
        type: isWarning ? 'warning' : 'opportunity',
        text: `${card.title}: ${card.subtitle || card.value || ''}`,
      })
    })
  }

  // 补充 Agent suggestions
  const agentSuggestions = agentGreeting?.suggestions || []
  if (agentSuggestions.length > 0 && suggestions.length < 4) {
    agentSuggestions.slice(0, 4 - suggestions.length).forEach((s: any, i: number) => {
      suggestions.push({
        id: `agent-${i}`,
        type: 'reminder',
        text: s.text || '',
      })
    })
  }

  // 后备：如果所有服务都没有数据
  const isBackendAvailable = agentGreeting !== null || subPlans !== null

  const dashboardData = {
    // 指标卡片
    score: isBackendAvailable ? score : 85,
    scoreChange: isBackendAvailable ? scoreChange : 0,
    totalFollowers: 0, // TODO: 从 analytics 聚合跨平台粉丝数
    followersChange: 0,
    weeklyPosts: 0, // TODO: 从 publish records 统计
    weeklyPostsLimit,
    pendingReplies: unreadCount,
    // 账号
    totalAccounts,
    connectedAccounts,
    // 积分
    creditsBalance,
    // 订阅
    activePlan: activePlan
      ? { name: activePlan.name, maxAccounts: activePlan.maxAccounts, maxContentPerMonth: activePlan.maxContentPerMonth }
      : null,
    // AI 建议 & 待办
    aiSuggestions: suggestions.length > 0 ? suggestions : getDefaultSuggestions(),
    todayTodos: buildTodos(unreadCount),
    weekCalendar: buildWeekCalendar(),
    // 元信息
    backendAvailable: isBackendAvailable,
    systemStatus: sysStatus ? `${healthyCount}/${totalComponents} 正常` : 'unknown',
    systemHealth,
  }

  return NextResponse.json({
    code: 0,
    message: isBackendAvailable ? 'success' : 'backend unavailable, using fallback',
    data: dashboardData,
  })
}

// ── 后备数据 ──

function getDefaultSuggestions() {
  return [
    {
      id: 'd1',
      type: 'reminder' as const,
      text: '后端服务连接中... 完成连接后可查看 AI 个性化建议',
    },
    {
      id: 'd2',
      type: 'opportunity' as const,
      text: '尝试连接你的第一个社交媒体账号，开启全域运营之旅',
    },
  ]
}

function buildTodos(unreadCount: number) {
  const todos = [
    { id: 't1', text: '连接社交媒体账号', done: false },
    { id: 't2', text: '创建第一篇 AI 内容', done: false },
  ]
  if (unreadCount > 0) {
    todos.unshift({ id: 't0', text: `查看 ${unreadCount} 条未读通知`, done: false })
  }
  return todos
}

function buildWeekCalendar() {
  const days = ['一', '二', '三', '四', '五', '六', '日']
  const today = new Date()
  const dayOfWeek = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))

  return days.map((day, i) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    return {
      day,
      date: date.getDate(),
      hasContent: false,
      platforms: [] as string[],
      isToday: date.toDateString() === today.toDateString(),
    }
  })
}
