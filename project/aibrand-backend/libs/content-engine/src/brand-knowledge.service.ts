/**
 * BrandKnowledgeService — 品牌知识库服务
 *
 * 职责：
 * 1. URL 品牌信息自动抓取（Logo、产品图、品牌配色、文案规范）
 * 2. 品牌知识库 CRUD
 * 3. 自动沉淀：用户生成的优质内容自动入库
 * 4. 智能跳过依赖：根据品牌库已有字段决定采访跳过的字段
 *
 * 落地方案：
 * - L1 公共素材池（平台采购商用素材，按会员分级开放）
 * - L2 用户素材智能扩容（1 张图衍生 20 种变体）
 * - L3 企业私有素材库（品牌素材上传 + AI 学习品牌风格）
 */

import { Injectable, Logger } from '@nestjs/common'
import {
  AppException,
  BrandKnowledgeEntry,
  FieldSource,
  ResponseCode,
} from '@yikart/common'
import { DifyService } from '@yikart/ai-services'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'

// ── URL 提取结果 ──

interface URLExtractionResult {
  logoUrl?: string
  productImages: string[]
  brandColors: Array<{ name: string; hex: string }>
  fonts: string[]
  industry: { primary: string; secondary?: string }
  usps: string[]
  description: string
}

// ── 服务实现 ──

@Injectable()
export class BrandKnowledgeService {
  private readonly logger = new Logger(BrandKnowledgeService.name)

  /** 内存中的品牌知识库缓存（生产环境应迁至 MongoDB） */
  private readonly brandCache = new Map<string, BrandKnowledgeEntry>()

  constructor(
    private readonly difyService: DifyService,
    private readonly http: HttpService,
  ) {}

  // ═══════════════════════════════════════════════════════════
  // URL 品牌信息抓取
  // ═══════════════════════════════════════════════════════════

  /**
   * 从品牌官网 URL 自动提取品牌信息
   *
   * 流程：
   * 1. 抓取 URL HTML
   * 2. 提取 Logo / 产品图 / 配色 / 字体
   * 3. 调用 Dify 分析品牌文案风格
   * 4. 存入品牌知识库
   */
  async extractFromUrl(brandId: string, url: string, overwrite = false): Promise<BrandKnowledgeEntry> {
    const existing = this.brandCache.get(brandId)
    if (existing && !overwrite) {
      this.logger.log(`Brand knowledge already exists for ${brandId}, skipping extraction`)
      return existing
    }

    this.logger.log(`Extracting brand info from URL: ${url}`)
    let html = ''

    try {
      const response = await firstValueFrom(
        this.http.get(url, { timeout: 15000, responseType: 'text' }),
      )
      html = typeof response.data === 'string' ? response.data : ''
    } catch (error: any) {
      this.logger.error(`Failed to fetch URL ${url}: ${error.message}`)
      throw new AppException(ResponseCode.BrandKnowledgeExtractFailed, { url })
    }

    // 调用 Dify 进行品牌信息智能提取
    try {
      const result = await this.difyService.runAgentApp({
        query: `从以下网页 HTML 中提取品牌信息（只输出 JSON）：

提取内容：
1. 品牌名称
2. 行业分类（一级+二级）
3. 目标受众描述
4. 品牌人设/调性
5. 产品独特卖点（USP）
6. 品牌文案中经常出现的关键词/话术
7. 可以识别的设计风格线索
8. Logo URL（如果有 <img> 标签指向 logo）
9. 品牌主色调（从 CSS 中提取）

HTML 内容（截取前 15000 字符）：
${html.slice(0, 15000)}`,
        inputs: { task: 'brand_url_extraction' },
      })

      const extracted = this.parseJson(result.answer)

      const entry: BrandKnowledgeEntry = {
        brandId,
        name: extracted['name'] ?? '',
        industry: {
          primary: extracted['industry']?.['primary'] ?? '其他',
          secondary: extracted['industry']?.['secondary'],
          source: 'url_extraction',
        },
        targetAudience: {
          segments: extracted['targetAudience']?.['segments'] ?? [],
          painPoints: [],
          source: 'url_extraction',
        },
        brand: {
          voice: extracted['voice'] ?? '',
          forbiddenWords: [],
          fixedPhrases: extracted['keywords'] ?? [],
          visualIdentity: {
            logoUrl: extracted['logoUrl'],
            primaryColor: extracted['colors']?.[0]?.['hex'],
            secondaryColor: extracted['colors']?.[1]?.['hex'],
          },
          source: 'url_extraction',
        },
        style: {
          tone: extracted['tone'] ?? 'professional',
          visualStyle: extracted['visualStyle'] ?? '',
          colorPreference: extracted['colors']?.map((c: any) => c['hex']) ?? [],
          source: 'url_extraction',
        },
        assets: extracted['productImages'] ?? [],
        updatedAt: new Date(),
      }

      this.brandCache.set(brandId, entry)
      this.logger.log(`Brand knowledge extracted for ${brandId}: ${entry.name}`)
      return entry
    } catch (error: any) {
      this.logger.error(`Dify brand extraction failed: ${error.message}`)
      throw new AppException(ResponseCode.BrandKnowledgeExtractFailed, { url })
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 品牌知识库 CRUD
  // ═══════════════════════════════════════════════════════════

  /**
   * 获取品牌知识
   */
  getBrandKnowledge(brandId: string): BrandKnowledgeEntry | undefined {
    return this.brandCache.get(brandId)
  }

  /**
   * 创建或更新品牌知识
   */
  upsertBrandKnowledge(entry: BrandKnowledgeEntry): BrandKnowledgeEntry {
    entry.updatedAt = new Date()
    this.brandCache.set(entry.brandId, entry)
    this.logger.log(`Brand knowledge upserted: ${entry.brandId}`)
    return entry
  }

  /**
   * 查询品牌知识中哪些字段已有数据
   * 用于采访时的智能跳过逻辑
   */
  getPopulatedFields(brandId: string): Set<string> {
    const entry = this.brandCache.get(brandId)
    if (!entry) return new Set()

    const populated = new Set<string>()

    if (entry.industry?.primary) {
      populated.add('intent.industry')
    }
    if (entry.targetAudience?.segments?.length) {
      populated.add('intent.targetAudience')
    }
    if (entry.brand?.voice) {
      populated.add('style.tone')
    }
    if (entry.style?.visualStyle) {
      populated.add('style.visualStyle')
    }
    if (entry.products?.length) {
      populated.add('product')
    }

    return populated
  }

  /**
   * 自动沉淀优质内容到品牌库
   *
   * 当用户标记生成为"满意"时调用，将正向样本存入知识库，
   * 后续生成时作为风格参考。
   */
  async ingestSuccessfulContent(
    brandId: string,
    content: { type: string; text?: string; imageUrl?: string; metadata?: Record<string, unknown> },
  ): Promise<void> {
    const entry = this.brandCache.get(brandId)
    if (!entry) {
      this.logger.warn(`Brand ${brandId} not found, skipping ingestion`)
      return
    }

    // 更新品牌知识（简化版，实际应调用 Dify 做深度分析）
    if (content.text) {
      // 提取高频关键词加入固定话术
      const words = content.text.split(/[\s，。！？,.!?]+/).filter((w: string) => w.length >= 2)
      const topWords = [...new Set(words)].slice(0, 10)
      entry.brand!.fixedPhrases = [...new Set([...entry.brand!.fixedPhrases, ...topWords])]
    }

    if (content.imageUrl) {
      entry.assets = [...(entry.assets ?? []), content.imageUrl]
    }

    entry.updatedAt = new Date()
    this.brandCache.set(brandId, entry)
    this.logger.log(`Brand knowledge enriched from successful content: ${brandId}`)
  }

  // ── Private helpers ──

  private parseJson(text: string): Record<string, any> {
    // 处理 markdown 代码块
    const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
    const json = codeBlockMatch ? codeBlockMatch[1].trim() : text
    const jsonMatch = json.match(/\{[\s\S]*\}/)
    return JSON.parse(jsonMatch ? jsonMatch[0] : json)
  }
}
