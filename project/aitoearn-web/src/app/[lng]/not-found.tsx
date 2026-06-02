'use client'

import Link from 'next/link'
import { ArrowLeft, Home } from 'lucide-react'
import { useGetClientLng } from '@/hooks/useSystem'

export default function NotFound() {
  const lng = useGetClientLng()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6 px-4">
        <h1 className="text-8xl font-bold bg-gradient-to-r from-muted-foreground/40 to-muted-foreground/20 bg-clip-text text-transparent">
          404
        </h1>
        <h2 className="text-xl font-semibold text-foreground">页面未找到</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          你访问的页面不存在或已被移除。请检查链接是否正确，或返回首页。
        </p>
        <div className="flex items-center justify-center gap-3 pt-4">
          <Link
            href={`/${lng}`}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Home className="h-4 w-4" />
            返回首页
          </Link>
          <Link
            href={`/${lng}/welcome`}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            了解更多
          </Link>
        </div>
      </div>
    </div>
  )
}
