/**
 * sitemap.xml — 搜索引擎站点地图
 * Next.js 14 App Router 自动路由
 */

import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aibrand.cn'

  const routes = [
    { path: '/welcome', priority: 1.0, changeFreq: 'weekly' as const },
    { path: '/pricing', priority: 0.9, changeFreq: 'weekly' as const },
    { path: '/auth', priority: 0.6, changeFreq: 'monthly' as const },
  ]

  return [
    // 首页
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    // 子页面（zh-CN）
    ...routes.map(r => ({
      url: `${baseUrl}/zh-CN${r.path}`,
      lastModified: new Date(),
      changeFrequency: r.changeFreq,
      priority: r.priority,
    })),
    // 子页面（en）
    ...routes.map(r => ({
      url: `${baseUrl}/en${r.path}`,
      lastModified: new Date(),
      changeFrequency: r.changeFreq,
      priority: r.priority * 0.8,
    })),
  ]
}
