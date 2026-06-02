/**
 * WeWorkPage — 企业微信接入页面
 * AI 机器人 + 真人企业微信混合客服服务
 */

import dynamic from 'next/dynamic'
import type { Metadata } from 'next'
import { getMetadata } from '@/utils/general'

export async function generateMetadata(): Promise<Metadata> {
  return getMetadata(
    {
      title: '企业微信接入 - AI机器人+真人混合客服',
      description: '接入企业微信，AI 机器人自动回复常见问题，复杂问题无缝转接真人客服。支持扫码授权、关键词规则、情感检测自动转接。',
      keywords: '企业微信,WeCom,AI客服,智能机器人,自动回复,转人工',
    },
    'zh-CN',
    '/customers/wework',
  )
}

const WeWorkCore = dynamic(() => import('./WeWorkCore'), { ssr: false })

export default function WeWorkPage() {
  return <WeWorkCore />
}
