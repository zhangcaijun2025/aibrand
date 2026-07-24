/**
 * FancyAI 29 skillKey 静态数据 — 后端副本
 *
 * 数据来源:前端 aibrand-studio/src/lib/fancyai/skill-keys.ts(100% 复刻 FancyAI 企业平台 API 层)
 * 同步策略:前端为权威源,后端为副本。修改时需同步两端。
 *
 * 29 skillKey 分三大类:
 *   - expert(12):消费端 AI 专家,支持真实执行(接入 AgentService)
 *   - enterprise(8):企业平台 Skill,映射到 8 大 Skills
 *   - tool(9):桌面工具 + 系统级 skill
 */

/** SkillKey 类型 */
export type SkillKeyType = 'expert' | 'enterprise' | 'tool'

/** SkillKey 状态 */
export type SkillKeyStatus = 'active' | 'beta' | 'deprecated'

export interface SkillKey {
  /** skillKey(唯一标识,与 FancyAI API 对齐) */
  key: string
  /** 显示名称 */
  name: string
  /** 简短描述 */
  description: string
  /** 类型(expert/enterprise/tool) */
  type: SkillKeyType
  /** 状态 */
  status: SkillKeyStatus
  /** 底层模型 */
  model: string
  /** 预估耗时(秒) */
  runDuration: number
  /** 关联的 appId */
  appId: string
  /** 关联的 8 Skills ID(企业 Skill 才有) */
  parentSkillId?: string
  /** 关联的 12 连接器 ID(企业 Skill 才有) */
  connectorIds?: string[]
  /** AiBrand 内部对应路由 */
  aibrandRoute: string
  /** 是否需要企业权限 */
  requireEnterprise?: boolean
  /** 输入参数 schema(JSON Schema 格式,简化版) */
  inputSchema?: Record<string, unknown>
  /** 输出格式 */
  outputFormat?: 'image' | 'video' | 'text' | 'json' | 'stream'
}

/**
 * 29 skillKey — 从前端 skill-keys.ts 复制
 * 按 type 分三组:expert(12) / enterprise(8) / tool(9)
 */
export const ALL_SKILL_KEYS: SkillKey[] = [
  /* ═══ 1. expert(12 消费端专家) ═══ */
  {
    key: 'fashion-campaign-director',
    name: 'AI Fashion Creative Director',
    description: 'Transform garment photos into 9-image fashion campaigns.',
    type: 'expert',
    status: 'active',
    model: 'claude-sonnet-4-5-20250929',
    runDuration: 600,
    appId: 'app-fashion-campaign-director',
    aibrandRoute: '/workspace',
    outputFormat: 'image',
  },
  {
    key: 'product-animation-video',
    name: 'AI Product Animation Specialist',
    description: 'Bring creative concepts to life with balanced visual aesthetics.',
    type: 'expert',
    status: 'active',
    model: 'claude-sonnet-4-5-20250929',
    runDuration: 600,
    appId: 'app-product-animation-video',
    aibrandRoute: '/workspace',
    outputFormat: 'video',
  },
  {
    key: 'product-motion',
    name: 'AI Image Animation Expert',
    description: 'Automated generation of animated videos with product-in-scene visuals.',
    type: 'expert',
    status: 'active',
    model: 'claude-sonnet-4-5-20250929',
    runDuration: 600,
    appId: 'app-product-motion',
    aibrandRoute: '/workspace',
    outputFormat: 'video',
  },
  {
    key: 'app-beauty-storyboard-artist',
    name: 'AI Beauty Creative Director',
    description: 'Professional storyboards for beauty product advertising videos.',
    type: 'expert',
    status: 'active',
    model: 'claude-sonnet-4-5-20250929',
    runDuration: 600,
    appId: 'app-beauty-storyboard-artist',
    aibrandRoute: '/workspace',
    outputFormat: 'video',
  },
  {
    key: 'fashion-shoot',
    name: "AI Women's Fashion Photographer",
    description: 'Turn white-background images into 6 pieces of 3:4 fashion photoshoots.',
    type: 'expert',
    status: 'active',
    model: 'claude-sonnet-4-5-20250929',
    runDuration: 600,
    appId: 'app-fashion-shoot',
    aibrandRoute: '/workspace',
    outputFormat: 'image',
  },
  {
    key: 'kidswear-photography-master',
    name: 'AI Kidswear Photographer',
    description: "Children's fashion photoshoot production from white-background images.",
    type: 'expert',
    status: 'active',
    model: 'claude-sonnet-4-5-20250929',
    runDuration: 600,
    appId: 'app-kidswear-photography-master',
    aibrandRoute: '/workspace',
    outputFormat: 'image',
  },
  {
    key: 'icon-designer',
    name: 'AI Fashion Designer',
    description: 'Six legendary designers with signature instinct.',
    type: 'expert',
    status: 'active',
    model: 'claude-sonnet-4-5-20250929',
    runDuration: 600,
    appId: 'app-icon-designer',
    aibrandRoute: '/workspace',
    outputFormat: 'image',
  },
  {
    key: 'street-style-photographer',
    name: 'AI Street Photographer',
    description: 'Candid street style photographs captured during Fashion Week.',
    type: 'expert',
    status: 'active',
    model: 'claude-sonnet-4-5-20250929',
    runDuration: 600,
    appId: 'app-street-style-photographer',
    aibrandRoute: '/workspace',
    outputFormat: 'image',
  },
  {
    key: 'beauty-photography-master',
    name: 'AI Beauty Photographer',
    description: 'Campaign-quality beauty shoot from a single product image.',
    type: 'expert',
    status: 'active',
    model: 'claude-sonnet-4-5-20250929',
    runDuration: 600,
    appId: 'app-beauty-photography-master',
    aibrandRoute: '/workspace',
    outputFormat: 'image',
  },
  {
    key: 'beverage-photography',
    name: 'AI Drinks & Beverage Photographer',
    description: 'Five signature aesthetics for beverage photography.',
    type: 'expert',
    status: 'active',
    model: 'claude-sonnet-4-5-20250929',
    runDuration: 600,
    appId: 'app-beverage-photography',
    aibrandRoute: '/workspace',
    outputFormat: 'image',
  },
  {
    key: 'appliance-photography',
    name: 'AI Small Appliance Photographer',
    description: 'Natural textures and wilderness aesthetics for small appliances.',
    type: 'expert',
    status: 'active',
    model: 'claude-sonnet-4-5-20250929',
    runDuration: 600,
    appId: 'app-appliance-photography',
    aibrandRoute: '/workspace',
    outputFormat: 'image',
  },
  {
    key: 'ecom_shoe_image_shotlist',
    name: 'AI Footwear Photographer',
    description: 'High-conversion e-commerce footwear imagery.',
    type: 'expert',
    status: 'active',
    model: 'claude-sonnet-4-5-20250929',
    runDuration: 600,
    appId: 'app-ecom_shoe_image_shotlist',
    aibrandRoute: '/workspace',
    outputFormat: 'image',
  },

  /* ═══ 2. enterprise(8 企业平台 Skill) ═══ */
  {
    key: 'crm-workflows',
    name: 'CRM Workflows',
    description: 'Automate customer interactions across Salesforce, HubSpot, and Instagram.',
    type: 'enterprise',
    status: 'active',
    model: 'claude-sonnet-4-5-20250929',
    runDuration: 1800,
    appId: 'app-crm-workflows',
    parentSkillId: 'crm-workflows',
    connectorIds: ['salesforce', 'hubspot', 'instagram'],
    aibrandRoute: '/channels',
    requireEnterprise: true,
    outputFormat: 'json',
  },
  {
    key: 'erp-launch',
    name: 'ERP Launch',
    description: 'Sync new product launches from ERP to all sales channels.',
    type: 'enterprise',
    status: 'active',
    model: 'claude-sonnet-4-5-20250929',
    runDuration: 3600,
    appId: 'app-erp-launch',
    parentSkillId: 'erp-launch',
    connectorIds: ['erp', 'dam', 'meta-ads', 'tiktok-ads'],
    aibrandRoute: '/visual/batch',
    requireEnterprise: true,
    outputFormat: 'json',
  },
  {
    key: 'dam-library',
    name: 'DAM Library',
    description: 'Centralized library for all creative assets with auto-tagging.',
    type: 'enterprise',
    status: 'active',
    model: 'claude-sonnet-4-5-20250929',
    runDuration: 600,
    appId: 'app-dam-library',
    parentSkillId: 'dam-library',
    connectorIds: ['dam', 'google-drive', 'canva'],
    aibrandRoute: '/visual/studio',
    requireEnterprise: true,
    outputFormat: 'json',
  },
  {
    key: 'campaign-drafting',
    name: 'Campaign Drafting',
    description: 'Draft and preview campaigns across Meta, TikTok, and Instagram.',
    type: 'enterprise',
    status: 'active',
    model: 'claude-sonnet-4-5-20250929',
    runDuration: 1200,
    appId: 'app-campaign-drafting',
    parentSkillId: 'campaign-drafting',
    connectorIds: ['meta-ads', 'tiktok-ads', 'instagram', 'slack'],
    aibrandRoute: '/create',
    requireEnterprise: true,
    outputFormat: 'json',
  },
  {
    key: 'performance-creative',
    name: 'Performance Creative',
    description: 'Generate ad creatives optimized for performance metrics.',
    type: 'enterprise',
    status: 'beta',
    model: 'claude-sonnet-4-5-20250929',
    runDuration: 900,
    appId: 'app-performance-creative',
    parentSkillId: 'performance-creative',
    connectorIds: ['meta-ads', 'tiktok-ads'],
    aibrandRoute: '/visual/studio',
    requireEnterprise: true,
    outputFormat: 'image',
  },
  {
    key: 'trend-monitoring',
    name: 'Trend Monitoring',
    description: 'Monitor trending topics, hashtags, and competitor moves.',
    type: 'enterprise',
    status: 'active',
    model: 'claude-sonnet-4-5-20250929',
    runDuration: 300,
    appId: 'app-trend-monitoring',
    parentSkillId: 'trend-monitoring',
    connectorIds: ['instagram', 'tiktok-ads', 'notion'],
    aibrandRoute: '/geo',
    requireEnterprise: true,
    outputFormat: 'stream',
  },
  {
    key: 'product-design',
    name: 'Product Design',
    description: 'Collaborate with AI Experts to design new products.',
    type: 'enterprise',
    status: 'active',
    model: 'claude-sonnet-4-5-20250929',
    runDuration: 2400,
    appId: 'app-product-design',
    parentSkillId: 'product-design',
    connectorIds: ['dam', 'canva', 'notion'],
    aibrandRoute: '/workspace',
    requireEnterprise: true,
    outputFormat: 'image',
  },
  {
    key: 'desktop-command-center',
    name: 'Desktop Command Center',
    description: 'Unified control surface for all Experts, Skills, and integrations.',
    type: 'enterprise',
    status: 'active',
    model: 'claude-sonnet-4-5-20250929',
    runDuration: 0,
    appId: 'app-desktop-command-center',
    parentSkillId: 'desktop-command-center',
    connectorIds: [],
    aibrandRoute: '/desktop',
    requireEnterprise: true,
    outputFormat: 'stream',
  },

  /* ═══ 3. tool(9 桌面工具 + 系统级 skill) ═══ */
  {
    key: 'image-generation',
    name: 'Image Generation',
    description: 'General-purpose editorial-grade fashion image generation.',
    type: 'tool',
    status: 'active',
    model: 'flux-pro-1.1',
    runDuration: 120,
    appId: 'app-image-generation',
    aibrandRoute: '/visual/studio',
    outputFormat: 'image',
  },
  {
    key: 'video-generation',
    name: 'Video Generation',
    description: 'Cinematic product videos with motion control.',
    type: 'tool',
    status: 'active',
    model: 'kling-video-1.6',
    runDuration: 300,
    appId: 'app-video-generation',
    aibrandRoute: '/visual/video',
    outputFormat: 'video',
  },
  {
    key: 'one-click-video',
    name: 'One-Click Video',
    description: 'Fully automated video generation from a single product photo.',
    type: 'tool',
    status: 'active',
    model: 'kling-video-1.6',
    runDuration: 180,
    appId: 'app-one-click-video',
    aibrandRoute: '/visual/video',
    outputFormat: 'video',
  },
  {
    key: 'clothing-wear',
    name: 'Clothing Wear',
    description: 'Virtual try-on for apparel.',
    type: 'tool',
    status: 'active',
    model: 'flux-pro-virtual-tryon',
    runDuration: 120,
    appId: 'app-clothing-wear',
    aibrandRoute: '/visual/studio',
    outputFormat: 'image',
  },
  {
    key: 'shoes-wear',
    name: 'Shoes Wear',
    description: 'Footwear virtual try-on for e-commerce listings.',
    type: 'tool',
    status: 'active',
    model: 'flux-pro-virtual-tryon',
    runDuration: 120,
    appId: 'app-shoes-wear',
    aibrandRoute: '/visual/studio',
    outputFormat: 'image',
  },
  {
    key: 'background-swap',
    name: 'Background Swap',
    description: 'Replace product backgrounds with AI-generated scenes.',
    type: 'tool',
    status: 'active',
    model: 'flux-pro-inpaint',
    runDuration: 60,
    appId: 'app-background-swap',
    aibrandRoute: '/visual/studio',
    outputFormat: 'image',
  },
  {
    key: 'batch-generation',
    name: 'Batch Generation',
    description: 'Process multiple products in parallel with consistent style.',
    type: 'tool',
    status: 'active',
    model: 'flux-pro-1.1',
    runDuration: 600,
    appId: 'app-batch-generation',
    aibrandRoute: '/visual/batch',
    outputFormat: 'image',
  },
  {
    key: 'quality-check',
    name: 'Quality Check',
    description: 'Automated quality scoring for generated content.',
    type: 'tool',
    status: 'active',
    model: 'claude-sonnet-4-5-20250929',
    runDuration: 30,
    appId: 'app-quality-check',
    aibrandRoute: '/quality',
    outputFormat: 'json',
  },
  {
    key: 'geo-monitor',
    name: 'GEO Monitor',
    description: 'Generative Engine Optimization monitoring across AI search engines.',
    type: 'tool',
    status: 'beta',
    model: 'claude-sonnet-4-5-20250929',
    runDuration: 300,
    appId: 'app-geo-monitor',
    aibrandRoute: '/geo',
    outputFormat: 'stream',
  },
]

/** 按 type 分组 */
export const SKILL_KEYS_BY_TYPE: Record<SkillKeyType, SkillKey[]> = {
  expert: ALL_SKILL_KEYS.filter((k) => k.type === 'expert'),
  enterprise: ALL_SKILL_KEYS.filter((k) => k.type === 'enterprise'),
  tool: ALL_SKILL_KEYS.filter((k) => k.type === 'tool'),
}

/** 按 key 查找 */
export function getSkillByKey(key: string): SkillKey | undefined {
  return ALL_SKILL_KEYS.find((k) => k.key === key)
}

/** 仅 expert 类 skillKey(支持真实执行) */
export const EXECUTABLE_SKILL_KEYS: SkillKey[] = SKILL_KEYS_BY_TYPE.expert
