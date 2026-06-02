/**
 * AccountsPage — 全域账号管理中心
 *
 * 产品架构（PM 视角）：
 *   顶部：账号健康总览 + 快捷操作
 *   中部：平台卡片矩阵（连接状态、内容统计、快捷操作）
 *   底部：原版日历/发布/管理功能
 *
 * 内容策略（营销视角）：
 *   利益导向标题 · 平台覆盖价值主张 · 增长数据可视化
 */

import type { PageParams } from '@/app/globals'
import AccountsPageNew from './AccountsPageNew'
import { useTranslation } from '@/app/i18n'
import { getMetadata } from '@/utils/general'

export async function generateMetadata({ params }: PageParams) {
  const { lng } = await params
  const { t } = await useTranslation(lng, 'account')
  return await getMetadata(
    { title: t('seo.title'), description: t('seo.description'), keywords: t('seo.keywords') },
    lng, '/accounts',
  )
}

interface AccountsPageProps { searchParams?: { platform?: string; spaceId?: string; addChannel?: string; updateChannel?: string; action?: string; aiGenerated?: string; accountId?: string; taskId?: string; title?: string; description?: string; tags?: string; medias?: string } }

export default function Page({ searchParams }: AccountsPageProps) {
  return <AccountsPageNew searchParams={searchParams} />
}
