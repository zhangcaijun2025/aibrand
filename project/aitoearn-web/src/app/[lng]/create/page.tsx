/**
 * CreatePage - 指令共创空间
 * AI 引导式对话，帮用户从模糊想法到高质量指令
 */

import dynamic from 'next/dynamic'
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

  const { t } = await useTranslation(lng, 'common')

  return getMetadata(
    {
      title: 'AI 指令共创 - 智能创作工作台',
      description: '通过 AI 引导式对话，从模糊想法到高质量指令。支持小红书、抖音、公众号等多平台内容创作。',
      keywords: 'AI创作,提示词,指令生成,内容创作,AI引导',
    },
    lng,
    '/create',
  )
}

const CreateCore = dynamic(() => import('./CreateCore'), {
  ssr: false,
})

export default function CreatePage() {
  return <CreateCore />
}
