/**
 * ContentEngine — 内容智造引擎前端组件
 *
 * 提供引导式采访的完整 UI 套件：
 * - InterviewCard: 对话式选择题卡片组件
 * - InterviewCardSkeleton: 卡片的骨架屏加载态
 * - useInterview: 采访状态管理 Hook
 * - BriefConfirmCard: Brief 确认卡片（待实现）
 */

export { InterviewCard, InterviewCardSkeleton } from './InterviewCard'
export type { InterviewCardData, InterviewCardMode, InterviewCardOption, InterviewCardProps } from './InterviewCard'
export { useInterview } from './useInterview'
export type { ContentBrief, InterviewStateData } from './useInterview'
