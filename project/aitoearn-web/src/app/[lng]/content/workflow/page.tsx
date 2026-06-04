/**
 * Content Workflow — AI 智能内容工厂
 *
 * 6 步工作流: 意图分析 → 策略研究 → 选题生成 → 内容生成 → 质量检测 → 发布策略
 */

import type { Metadata } from 'next'
import { WorkflowCore } from './WorkflowCore'

export const metadata: Metadata = {
  title: 'AI 内容工厂 — 智能内容批量创作',
  description: '输入你的需求，AI 自动完成从选题研究到发布策略的全链路内容创作',
}

export default function ContentWorkflowPage() {
  return <WorkflowCore />
}
