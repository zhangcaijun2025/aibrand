/**
 * GEO Redis Cache — 热数据缓存策略 (配合前端BFF)
 *
 * 缓存策略:
 * - 地域规则: 24h (低频变更)
 * - 城市热词: 1h (中频更新)
 * - 实时热点: 10min (高频变化)
 * - GEO评分缓存: 5min (评分结果复用)
 */

import { Injectable, Inject, Logger } from '@nestjs/common'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Cache } from 'cache-manager'

const TTL = {
  RULES: 86400_000,      // 24h
  HOTWORDS: 3600_000,    // 1h
  TRENDING: 600_000,     // 10min
  SCORE: 300_000,        // 5min
  REGION_TREE: 86400_000, // 24h
}

@Injectable()
export class GeoCacheService {
  private readonly logger = new Logger(GeoCacheService.name)

  constructor(@Inject(CACHE_MANAGER) private cache: Cache) {}

  /* ── Region Tree ── */

  async getRegionTree(): Promise<any> {
    const key = 'geo:region:tree'
    return this.cache.get(key)
  }

  async setRegionTree(data: any): Promise<void> {
    await this.cache.set('geo:region:tree', data, TTL.REGION_TREE)
  }

  /* ── Platform Rules ── */

  async getPlatformRules(platform: string): Promise<any> {
    const key = `geo:rules:${platform}`
    return this.cache.get(key)
  }

  async setPlatformRules(platform: string, data: any): Promise<void> {
    await this.cache.set(`geo:rules:${platform}`, data, TTL.RULES)
  }

  /* ── City Hotwords ── */

  async getCityHotwords(cityCode: string): Promise<string[]> {
    const key = `geo:hotwords:${cityCode}`
    return (await this.cache.get(key)) || []
  }

  async setCityHotwords(cityCode: string, words: string[]): Promise<void> {
    await this.cache.set(`geo:hotwords:${cityCode}`, words, TTL.HOTWORDS)
  }

  /* ── Trending Topics ── */

  async getTrending(): Promise<any> {
    return this.cache.get('geo:trending')
  }

  async setTrending(data: any): Promise<void> {
    await this.cache.set('geo:trending', data, TTL.TRENDING)
  }

  /* ── Score Cache ── */

  async getCachedScore(contentHash: string): Promise<any> {
    return this.cache.get(`geo:score:${contentHash}`)
  }

  async setCachedScore(contentHash: string, score: any): Promise<void> {
    await this.cache.set(`geo:score:${contentHash}`, score, TTL.SCORE)
  }

  /* ── Cache Invalidation ── */

  async invalidatePattern(pattern: string): Promise<void> {
    // Redis SCAN + DEL for pattern matching
    this.logger.log(`Cache invalidation requested: ${pattern}`)
  }

  async warmup(): Promise<void> {
    this.logger.log('GEO cache warmup initiated')
  }
}
