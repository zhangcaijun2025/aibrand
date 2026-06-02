'use client'

/**
 * 全局错误边界
 * 捕获渲染错误并显示友好的错误页面
 */

import { AlertTriangle, Home, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 可将错误上报到错误追踪服务
    console.error('Page error:', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="inline-flex p-4 rounded-full bg-destructive/10">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">页面出错了</h2>
        <p className="text-sm text-muted-foreground">
          抱歉，页面发生了一些意外错误。请尝试刷新页面，或返回首页。
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            重试
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Home className="h-4 w-4" />
            返回首页
          </Link>
        </div>
      </div>
    </div>
  )
}
