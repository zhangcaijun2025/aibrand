/**
 * LayoutSidebar - 左侧侧边栏布局组件
 * 包含 Logo、主导航、底部功能区（余额、插件）、用户下拉菜单
 * 支持展开/收缩两种状态
 */
'use client'
import { useState } from 'react'
import { useShallow } from 'zustand/shallow'
import { routerData } from '@/app/layout/routerData'
import { useNavigationLogic } from '@/app/layout/shared'
import NotificationPanel from '@/components/notification/NotificationPanel'
import { useSettingsModalStore } from '@/components/SettingsModal/store'
import { useNotification } from '@/hooks/useNotification'
import { cn } from '@/lib/utils'
import { useUserStore } from '@/store/user'
import { BottomSection, LogoSection, NavSection, UserDropdownMenu } from './components'
import { MyChannelsEntry } from './components/BottomSection/MyChannelsEntry'
import { Coins } from 'lucide-react'
import { useEffect } from 'react'
import { getCreditsBalanceApi } from '@/api/credits'
import { toast } from '@/lib/toast'
/**
 * 侧边栏主组件
 */
function LayoutSidebar() {
  const { currRouter, isAuthPage } = useNavigationLogic()
  const { unreadCount } = useNotification()
  // 获取侧边栏状态和设置方法
  const { sidebarCollapsed: collapsed, setSidebarCollapsed: setCollapsed } = useUserStore(
    useShallow(state => ({
      sidebarCollapsed: state.sidebarCollapsed,
      setSidebarCollapsed: state.setSidebarCollapsed,
    })),
  )
  // UI 状态
  const [notificationVisible, setNotificationVisible] = useState(false)
  const { openSettings } = useSettingsModalStore()
  const token = useUserStore(state => state.token)
  const [creditsBalance, setCreditsBalance] = useState(0)
  const [creditsLoading, setCreditsLoading] = useState(false)
  useEffect(() => {
    if (!token) return
    setCreditsLoading(true)
    getCreditsBalanceApi().then(r => {
      if (r?.data?.balance !== undefined) setCreditsBalance(r.data.balance)
    }).catch(() => {}).finally(() => setCreditsLoading(false))
  }, [token])
  // 首页、auth、websit、welcome 页面不显示侧边栏
  if (isAuthPage) {
    return null
  }
  // 转换路由数据为 NavSection 所需格式
  const navItems = routerData.map(item => ({
    path: item.path,
    translationKey: item.translationKey,
    icon: item.icon,
    children: item.children,
  }))
  return (
    <>
      <aside
        className={cn(
          'group sticky left-0 top-0 hidden h-screen flex-col border-r border-sidebar-border bg-sidebar p-3 transition-all duration-300 md:flex',
          collapsed ? 'w-[68px] min-w-[68px]' : 'w-[240px] min-w-[240px]',
        )}
      >
        {/* Logo 区域 - 固定 */}
        <LogoSection collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        {/* 可滚动区域：主导航 */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          <NavSection items={navItems} currentRoute={currRouter!} collapsed={collapsed} />
        </div>
        {/* 底部固定区域 - 不随滚动 */}
        <div className="flex-shrink-0">
          {/* 我的频道入口 */}
          <div className="pb-1 flex flex-1">
            <MyChannelsEntry collapsed={collapsed} />
          </div>
          {/* 积分余额显示 */}
          {collapsed ? (
            <div className="pb-1 flex flex-1 justify-center">
              <div className="flex items-center justify-center px-2 py-2 rounded-lg">
                <Coins size={18} className="text-amber-500 shrink-0" />
              </div>
            </div>
          ) : (
            <div className="pb-1 flex flex-1">
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg w-full">
                <Coins size={20} className="text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground">积分余额</div>
                  <div className="text-sm font-semibold text-foreground">
                    {creditsLoading ? '...' : creditsBalance.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* 底部功能区 */}
          <BottomSection collapsed={collapsed} onOpenSettings={openSettings} />
          {/* 用户下拉菜单 */}
          <div className="mt-2 border-t border-sidebar-border pt-2">
            <UserDropdownMenu
              collapsed={collapsed}
              unreadCount={unreadCount}
              onOpenNotification={() => setNotificationVisible(true)}
              onOpenSettings={openSettings}
            />
            </div>
          </div>
      </aside>
      {/* 通知面板 */}
      <NotificationPanel
        visible={notificationVisible}
        onClose={() => setNotificationVisible(false)}
      />
    </>
    )
}
export default LayoutSidebar
