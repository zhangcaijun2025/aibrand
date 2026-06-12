import { Injectable, Logger } from '@nestjs/common'
import { AgentService, AgentGreeting } from '../agent/agent.service'
import { PublishRecordService } from '../publish-record/publish-record.service'

export interface DashboardResponse {
  greeting: {
    text: string
    userName: string
    systemStatus: Record<string, any>
  }
  metricCards: MetricCardData[]
  trendChart: TrendPoint[]
  channelDistribution: ChannelSlice[]
  channelConversion: ConversionBar[]
  recentRecords: RecordItem[]
  hotContent: RankItem[]
  aiInsights: { conclusions: string[]; suggestions: string[] }
  hasData: boolean
}

export interface MetricCardData {
  id: string; title: string; value: string
  trend?: { direction: 'up' | 'down'; value: string }
}

export interface TrendPoint { label: string; exposure: number; engagement: number }
export interface ChannelSlice { label: string; value: number; pct: number }
export interface ConversionBar { label: string; rate: number; cost: number }

export interface RecordItem {
  date: string; title: string; platform: string
  type: string; status: string; exposure: string; engagement: string; rate: string
}

export interface RankItem { rank: number; title: string; heat: number; rate: string }

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name)

  constructor(private readonly agentService: AgentService) {}

  async getDashboard(userId: string): Promise<DashboardResponse> {
    const greeting = await this.agentService.generateGreeting(userId)

    return {
      greeting: {
        text: greeting.greeting,
        userName: greeting.userName,
        systemStatus: greeting.systemStatus as any,
      },
      metricCards: this.mapMetricCards(greeting),
      trendChart: this.emptyTrend(),
      channelDistribution: this.emptyChannels(),
      channelConversion: this.emptyConversion(),
      recentRecords: [],
      hotContent: [],
      aiInsights: {
        conclusions: greeting.briefCards
          ?.filter(c => c.type === 'alert' || c.type === 'milestone')
          .map(c => c.title) ?? [],
        suggestions: greeting.suggestions?.map(s => s.text) ?? [],
      },
      hasData: false,
    }
  }

  private mapMetricCards(g: AgentGreeting): MetricCardData[] {
    const b = g.briefCards ?? []
    return [
      { id: 'exposure', title: b[0]?.title ?? '本月配额', value: b[0]?.value ?? '—' },
      { id: 'engagement', title: b[1]?.title ?? '互动量', value: b[1]?.value ?? '—' },
      { id: 'rate', title: b[2]?.title ?? '转化率', value: b[2]?.value ?? '—' },
      { id: 'growth', title: '用户增长', value: '+0' },
    ]
  }

  private emptyTrend(): TrendPoint[] {
    const pts: TrendPoint[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      pts.push({
        label: `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        exposure: 0,
        engagement: 0,
      })
    }
    return pts
  }

  private emptyChannels(): ChannelSlice[] {
    return [
      { label: '社交媒体', value: 0, pct: 0 },
      { label: '搜索引擎', value: 0, pct: 0 },
      { label: '内容平台', value: 0, pct: 0 },
      { label: '信息流广告', value: 0, pct: 0 },
      { label: '其他', value: 0, pct: 0 },
    ]
  }

  private emptyConversion(): ConversionBar[] {
    return ['社交媒体', '搜索引擎', '内容平台', '信息流广告', '其他'].map(l => ({
      label: l, rate: 0, cost: 0,
    }))
  }
}
