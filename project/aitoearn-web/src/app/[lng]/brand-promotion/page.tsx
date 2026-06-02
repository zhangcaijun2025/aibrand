/**
 * 品牌推广 - 二维码营销与数据分析
 *
 * 完整版：管理推广计划，AI批量生成视频/图文素材，
 * 通过推广二维码让顾客一键发布内容，
 * 实时追踪浏览量、点赞、评论、分享等数据表现。
 *
 * 数据来源：AiToEarn Docker 后端 API（计划列表 + 素材 + 统计数据）
 */
'use client'

import { Loader2, Plus, QrCode, Sparkles, TrendingUp, BarChart3, Eye, Heart, MessageSquare, Share2, Bookmark, ExternalLink } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useTransClient } from '@/app/i18n/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useBrandPromotionStore } from './brandPromotionStore'
import CreatePlanModal from './components/CreatePlanModal'
import PlanTabBar from './components/PlanTabBar'
import { usePlanDetailStore } from './planDetailStore'
import { usePlanTabStore } from './planTabStore'

export default function BrandPromotionPage() {
  const { t } = useTransClient(['brandPromotion', 'route'])

  const {
    tabPlans,
    tabPlansLoading,
    selectedPlanId,
    initialized,
  } = usePlanTabStore(
    useShallow(state => ({
      tabPlans: state.tabPlans,
      tabPlansLoading: state.tabPlansLoading,
      selectedPlanId: state.selectedPlanId,
      initialized: state.initialized,
    })),
  )

  const initTabs = usePlanTabStore(state => state.initTabs)
  const openCreatePlanModal = useBrandPromotionStore(state => state.openCreatePlanModal)
  const initContentData = usePlanDetailStore(state => state.initContentData)

  // 统计概览状态
  const [stats, setStats] = useState({
    totalPlans: 0,
    totalMaterials: 0,
    totalPublish: 0,
    totalViews: 0,
    totalLikes: 0,
  })

  useEffect(() => {
    initTabs()
  }, [initTabs])

  useEffect(() => {
    if (selectedPlanId) {
      initContentData(selectedPlanId)
    }
  }, [selectedPlanId, initContentData])

  const handlePlanChange = useCallback((planId: string) => {
    initContentData(planId, true)
  }, [initContentData])

  const loading = !initialized
  const showEmpty = initialized && tabPlans.length === 0

  // 填充统计数据（从 plan 数据推算）
  useEffect(() => {
    if (tabPlans.length > 0) {
      setStats({
        totalPlans: tabPlans.length,
        totalMaterials: tabPlans.reduce((s, p) => s + (p.mediaCount || 0), 0),
        totalPublish: tabPlans.reduce((s, p) => s + (p.statistics?.publishCount || 0), 0),
        totalViews: tabPlans.reduce((s, p) => s + (p.statistics?.viewCount || 0), 0),
        totalLikes: tabPlans.reduce((s, p) => s + (p.statistics?.likeCount || 0), 0),
      })
    }
  }, [tabPlans])

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (showEmpty) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-[#c565ef]/10 to-[#55D9ED]/10 flex items-center justify-center mb-6">
              <QrCode className="h-10 w-10 text-foreground/60" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {t('empty.title')}
            </h2>
            <p className="text-muted-foreground mb-6">
              {t('empty.description')}
            </p>
            <Button size="lg" className="cursor-pointer gap-2" onClick={openCreatePlanModal}>
              <Plus className="h-5 w-5" />
              {t('empty.createButton')}
            </Button>
          </div>
        </div>
        <CreatePlanModal />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* 顶部标题栏 */}
      <div className="border-b border-border bg-background px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#c565ef]/20 to-[#55D9ED]/20">
              <QrCode className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">{t('header.title')}</h1>
              <p className="text-xs text-muted-foreground">{t('header.subtitle')}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="cursor-pointer gap-1" onClick={openCreatePlanModal}>
            <Plus className="h-4 w-4" />
            {t('header.createPlan')}
          </Button>
        </div>
      </div>

      {/* 数据概览横幅 */}
      <div className="px-6 py-3 bg-gradient-to-r from-background via-primary/5 to-background border-b border-border shrink-0">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-card/50 border border-border/50">
            <BarChart3 className="h-4 w-4 text-primary" />
            <div><div className="text-sm font-bold">{stats.totalPlans}</div><div className="text-xs text-muted-foreground">推广计划</div></div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-card/50 border border-border/50">
            <Sparkles className="h-4 w-4 text-blue-500" />
            <div><div className="text-sm font-bold">{stats.totalMaterials}</div><div className="text-xs text-muted-foreground">素材数</div></div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-card/50 border border-border/50">
            <Eye className="h-4 w-4 text-green-500" />
            <div><div className="text-sm font-bold">{stats.totalViews.toLocaleString()}</div><div className="text-xs text-muted-foreground">浏览量</div></div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-card/50 border border-border/50">
            <Heart className="h-4 w-4 text-red-500" />
            <div><div className="text-sm font-bold">{stats.totalLikes.toLocaleString()}</div><div className="text-xs text-muted-foreground">点赞</div></div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-card/50 border border-border/50">
            <TrendingUp className="h-4 w-4 text-purple-500" />
            <div><div className="text-sm font-bold">{stats.totalPublish}</div><div className="text-xs text-muted-foreground">发布</div></div>
          </div>
        </div>
      </div>

      {/* Tab 栏 */}
      <div data-testid="brand-promotion-plan-tabs">
        <PlanTabBar onPlanChange={handlePlanChange} syncUrlQuery />
      </div>

      {/* 内容区域 */}
      <div className="flex-1 min-h-0">
        <div className="flex flex-col h-full bg-background">
          <div className="flex-1 overflow-auto p-4 md:p-6">
            {/* 快速操作卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="rounded-xl border border-border bg-card p-5 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group" onClick={() => {}}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <QrCode className="h-5 w-5 text-primary" />
                  </div>
                  <span className="font-medium text-sm">{t('overview.generateQRCode')}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{t('qrcode.description')}</p>
                <div className="mt-3 text-xs text-primary font-medium">创建二维码 →</div>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 hover:shadow-md hover:border-blue-500/30 transition-all cursor-pointer group" onClick={() => {}}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                    <Sparkles className="h-5 w-5 text-blue-500" />
                  </div>
                  <span className="font-medium text-sm">{t('detail.aiBatchGenerate')}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{t('detail.batchGenerateDesc')}</p>
                <div className="mt-3 text-xs text-blue-500 font-medium">AI 批量生成 →</div>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 hover:shadow-md hover:border-green-500/30 transition-all cursor-pointer group" onClick={() => {}}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                    <BarChart3 className="h-5 w-5 text-green-500" />
                  </div>
                  <span className="font-medium text-sm">{t('statistics.title')}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{t('statistics.performanceOverview')}</p>
                <div className="mt-3 text-xs text-green-500 font-medium">查看数据 →</div>
              </div>
            </div>

            {/* 计划列表 */}
            {selectedPlanId && (
              <div>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
                  {t('plan.title')} · {tabPlans.find(p => p.id === selectedPlanId)?.name || selectedPlanId}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {tabPlans.filter(p => p.id === selectedPlanId).map(plan => (
                    <div key={plan.id} className="rounded-xl border border-border bg-card p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium">{plan.name || plan.title}</span>
                        {plan.type && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {plan.type === 1 ? '视频' : '图文'}
                          </span>
                        )}
                      </div>
                      {plan.statistics ? (
                        <div className="grid grid-cols-4 gap-2 text-center">
                          <div><div className="text-xs font-bold">{plan.statistics.viewCount || 0}</div><div className="text-[10px] text-muted-foreground">{t('overview.viewCount')}</div></div>
                          <div><div className="text-xs font-bold">{plan.statistics.likeCount || 0}</div><div className="text-[10px] text-muted-foreground">{t('overview.likeCount')}</div></div>
                          <div><div className="text-xs font-bold">{plan.statistics.commentCount || 0}</div><div className="text-[10px] text-muted-foreground">评论</div></div>
                          <div><div className="text-xs font-bold">{plan.statistics.shareCount || 0}</div><div className="text-[10px] text-muted-foreground">{t('plan.share')}</div></div>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground py-2 text-center">{t('statistics.noData')}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 使用指南 */}
            <div className="mt-6 rounded-xl border border-border/60 bg-gradient-to-r from-primary/5 to-purple-500/5 p-5">
              <h4 className="text-sm font-semibold mb-3">使用流程</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { step: '1', title: '创建推广计划', desc: '定义名称和目标平台' },
                  { step: '2', title: 'AI 批量生成素材', desc: '自动生成视频/图文草稿' },
                  { step: '3', title: '生成推广二维码', desc: '顾客扫码一键发布' },
                  { step: '4', title: '追踪数据表现', desc: '实时查看浏览量/互动' },
                ].map((s, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">{s.step}</div>
                    <div><div className="text-sm font-medium">{s.title}</div><div className="text-xs text-muted-foreground">{s.desc}</div></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <CreatePlanModal />
    </div>
  )
}
