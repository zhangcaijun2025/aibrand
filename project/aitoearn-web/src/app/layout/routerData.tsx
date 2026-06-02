/**
 * 路由/导航数据配置
 * 包含导航项的图标、路径、翻译键等信息
 */
import {
  BarChart3,
  BookOpen,
  Coins,
  CreditCard,
  Headphones,
  Home,
  LayoutDashboard,
  MessageCircle,
  PenLine,
  Send,
  Sparkles,
  Upload,
  Users,
} from 'lucide-react'

/** MVP 阶段暂不开放的翻译键（与 middleware.ts 中 mvpHiddenRoutes 保持一致） */
const MVP_HIDDEN_KEYS = new Set([
  'aiSocial',
  'tasksHistory',
  'header.agentAssets',
  'brandPromotion',
  'globalDiagnosis',
  'diagnosisOverview',
  'diagnosisWorkbench',
  'diagnosisDataCenter',
  'diagnosisHistory',
])

export interface IRouterDataItem {
  name: string
  translationKey: string
  path?: string
  icon?: React.ReactNode
  children?: IRouterDataItem[]
}

function filterHidden(items: IRouterDataItem[]): IRouterDataItem[] {
  return items
    .filter(item => !MVP_HIDDEN_KEYS.has(item.translationKey))
    .map(item => ({
      ...item,
      children: item.children ? filterHidden(item.children) : undefined,
    }))
}

const _routerData: IRouterDataItem[] = [
  {
    name: '工作台',
    translationKey: 'nav.dashboard',
    path: '/dashboard',
    icon: <LayoutDashboard size={20} />,
  },
  {
    name: 'AI 创作',
    translationKey: 'nav.create',
    path: '/create',
    icon: <Sparkles size={20} />,
  },
  {
    name: '内容管理',
    translationKey: 'nav.content',
    path: '/content',
    icon: <PenLine size={20} />,
  },
  {
    name: '多平台账号',
    translationKey: 'nav.accounts',
    path: '/accounts',
    icon: <Users size={20} />,
  },
  {
    name: '统一发布',
    translationKey: 'nav.publish',
    path: '/publish',
    icon: <Send size={20} />,
  },
  {
    name: '智能客服',
    translationKey: 'nav.customers',
    path: '/customers',
    icon: <Headphones size={20} />,
  },
  {
    name: '知识库',
    translationKey: 'nav.knowledge',
    icon: <BookOpen size={20} />,
    children: [
      {
        name: '指令库',
        translationKey: 'nav.commands',
        path: '/knowledge/commands',
        icon: <Sparkles size={18} />,
      },
      {
        name: '案例拆解',
        translationKey: 'nav.cases',
        path: '/knowledge/cases',
        icon: <BarChart3 size={18} />,
      },
    ],
  },
  {
    name: '订阅中心',
    translationKey: 'nav.pricing',
    path: '/pricing',
    icon: <Coins size={20} />,
  },
  {
    name: '订单管理',
    translationKey: 'nav.admin',
    path: '/admin/orders',
    icon: <CreditCard size={20} />,
  },
]

/** MVP 过滤后对外暴露的导航数据 */
export const routerData = filterHidden(_routerData)
