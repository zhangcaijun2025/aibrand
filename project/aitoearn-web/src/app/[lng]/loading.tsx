/**
 * 全局页面加载状态
 * 路由切换时显示骨架屏
 */

import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">加载中...</p>
      </div>
    </div>
  )
}
