/**
 * PricingLayout - 定价页布局
 * 提供服务端 SEO 元数据
 */

import type { Metadata } from 'next'
import { useTranslation } from '@/app/i18n'
import { fallbackLng, languages } from '@/lib/i18n/languageConfig'
import { getMetadata } from '@/utils/general'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lng: string }>
}): Promise<Metadata> {
  let { lng } = await params
  if (!languages.includes(lng))
    lng = fallbackLng

  const { t } = await useTranslation(lng, 'pricing')

  return getMetadata(
    {
      title: t('seo.title'),
      description: t('seo.description'),
      keywords: t('seo.keywords'),
    },
    lng,
    '/pricing',
  )
}

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
