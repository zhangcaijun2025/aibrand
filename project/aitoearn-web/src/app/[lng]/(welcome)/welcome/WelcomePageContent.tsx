/**
 * WelcomePageContent - Welcome 页面主组件
 * 使用 Tailwind CSS + shadcn/ui 重写版本
 */
'use client'

import { Footer } from './components/layout/Footer'
import { Navbar } from './components/layout/Navbar'
import { AIGraderSection } from './components/sections/AIGraderSection'
import { BeliefsSection } from './components/sections/BeliefsSection'
import { ExperienceTabsSection } from './components/sections/ExperienceTabsSection'
import { HeroSection } from './components/sections/HeroSection'
import { ReviewsSection } from './components/sections/ReviewsSection'
import { StructuredData } from './components/StructuredData'
import { TechFeaturesSection } from './components/sections/TechFeaturesSection'

interface WelcomePageContentProps {
  lng: string
}

export default function WelcomePageContent({ lng }: WelcomePageContentProps) {
  return (
    <>
      <StructuredData />
      <div className="min-h-screen bg-white antialiased">
      {/* 导航栏 */}
      <Navbar />

      {/* 主内容区 */}
      <main className="relative">
        {/* Hero: AI 全域运营，一人顶一个团队 */}
        <HeroSection />

        {/* AI 打分工具区块 */}
        <AIGraderSection />

        {/* 体验标签轮播 — 全域运营工作台 */}
        <ExperienceTabsSection />

        {/* 核心功能 */}
        <TechFeaturesSection />

        {/* 为什么选择 AiBrand */}
        <BeliefsSection />

        {/* 用户评价 */}
        <ReviewsSection />
      </main>

      {/* 页脚 */}
      <Footer />
    </div>
    </>
  )
}
