/**
 * Dashboard API - 全域运营仪表盘数据
 *
 * MVP: 从后端聚合跨平台数据
 * 当前返回结构化数据，前端 DashboardCore 消费
 */

import { NextResponse } from 'next/server'

export async function GET() {
  // TODO: Phase 2 - 从后端 analytics 模块聚合真实数据
  // 目前返回数据骨架，前端可在此基础上展示

  const dashboardData = {
    score: 85,
    scoreChange: 3,
    totalFollowers: 12580,
    followersChange: 3,
    weeklyPosts: 8,
    pendingReplies: 5,
    aiSuggestions: [
      {
        id: '1',
        type: 'warning' as const,
        text: '你的抖音互动率本周下降 15%，建议增加教程类内容比例',
      },
      {
        id: '2',
        type: 'opportunity' as const,
        text: '#夏季护肤 话题在小红书热度上升 200%，还有 3 天窗口期可以蹭这波流量',
      },
      {
        id: '3',
        type: 'reminder' as const,
        text: '今天下午 5:00 有一条小红书内容待发布，记得最终确认封面图和话题标签',
      },
    ],
    todayTodos: [
      { id: '1', text: '审核 AI 生成的 3 条小红书内容草稿', done: false },
      { id: '2', text: '回复客户评论（5 条待处理）', done: false },
      { id: '3', text: '确认下周内容排期计划', done: false },
      { id: '4', text: '查看本周运营数据周报', done: true },
    ],
    weekCalendar: buildWeekCalendar(),
  }

  return NextResponse.json({
    code: 0,
    message: 'success',
    data: dashboardData,
  })
}

function buildWeekCalendar() {
  const days = ['一', '二', '三', '四', '五', '六', '日']
  const today = new Date()
  const dayOfWeek = today.getDay() // 0=Sun
  const monday = new Date(today)
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))

  const hasContentDays = new Set([0, 1, 2, 3, 4, 5]) // 周一到周六有内容

  return days.map((day, i) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    const hasContent = hasContentDays.has(i)
    const platformMap: Record<number, string[]> = {
      0: ['小红书'],
      1: ['抖音'],
      2: ['小红书', 'B站'],
      3: ['小红书'],
      4: ['抖音'],
      5: ['小红书'],
    }

    return {
      day,
      date: date.getDate(),
      hasContent: hasContent && i < 6, // 周日无内容
      platforms: platformMap[i] || [],
      isToday: date.toDateString() === today.toDateString(),
    }
  })
}
