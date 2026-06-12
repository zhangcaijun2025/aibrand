/**
 * AiBrand Extension v3 — Platform Registry
 *
 * Config-driven platform management.
 *
 * Platform configs are loaded from the backend via CONFIG_UPDATE WebSocket
 * messages and cached in chrome.storage.local. The registry provides:
 * - Lookup by platform ID
 * - Content type filtering
 * - Capability reporting
 * - Hot-reload on config update
 */

import { getConfigService } from '@/core/config';
import type { PlatformConfig, ContentType } from '@/shared/types';

// ─── Registry ─────────────────────────────────────────────────────────────

export class PlatformRegistry {
  private configs: Record<string, PlatformConfig> = {};
  private initialized = false;

  /**
   * Initialize from cached configs.
   */
  async init(): Promise<void> {
    const configService = getConfigService();
    this.configs = configService.getAllPlatforms();
    this.initialized = true;
    console.log(`[PlatformRegistry] Initialized with ${Object.keys(this.configs).length} platforms`);
  }

  /**
   * Apply config update from backend (hot-reload).
   */
  applyUpdate(configs: Record<string, PlatformConfig>): void {
    this.configs = { ...this.configs, ...configs };
    console.log(`[PlatformRegistry] Hot-reloaded: ${Object.keys(configs).length} platforms updated`);
  }

  /**
   * Get a single platform config.
   */
  get(id: string): PlatformConfig | undefined {
    return this.configs[id];
  }

  /**
   * Get all platform configs.
   */
  getAll(): Record<string, PlatformConfig> {
    return this.configs;
  }

  /**
   * Get platforms filtered by content type.
   */
  getByType(type: ContentType): PlatformConfig[] {
    return Object.values(this.configs).filter((c) => c.type === type);
  }

  /**
   * Get platform IDs only.
   */
  getIds(): string[] {
    return Object.keys(this.configs);
  }

  /**
   * Get platform names (display names).
   */
  getNames(): { id: string; name: string; icon: string }[] {
    return Object.values(this.configs).map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
    }));
  }

  /**
   * Get a list of platform capabilities for REGISTER message.
   */
  getCapabilities(): string[] {
    return Object.keys(this.configs);
  }

  /**
   * Check if a platform is registered.
   */
  has(id: string): boolean {
    return id in this.configs;
  }

  /**
   * Get the pipeline for a platform.
   */
  getPipeline(platformId: string): import('@/shared/types').PipelineStep[] {
    return this.configs[platformId]?.pipeline ?? [];
  }

  /**
   * Get media constraints for a platform.
   */
  getMediaConstraints(platformId: string): import('@/shared/types').MediaConstraints | null {
    return this.configs[platformId]?.mediaConstraints ?? null;
  }

  /**
   * Get content constraints for a platform.
   */
  getContentConstraints(platformId: string): import('@/shared/types').ContentConstraints | null {
    return this.configs[platformId]?.contentConstraints ?? null;
  }

  /**
   * Get login detection config for a platform.
   */
  getLoginDetection(platformId: string): import('@/shared/types').LoginDetection | null {
    return this.configs[platformId]?.loginDetection ?? null;
  }

  /**
   * Get publish URL for a platform.
   */
  getPublishUrl(platformId: string): string | null {
    return this.configs[platformId]?.publishUrl ?? null;
  }

  /**
   * Validate platform content against constraints.
   */
  validateContent(
    platformId: string,
    content: { title: string; content: string; tags?: string[] },
  ): { valid: boolean; errors: string[] } {
    const constraints = this.configs[platformId]?.contentConstraints;
    if (!constraints) return { valid: true, errors: [] };

    const errors: string[] = [];

    if (content.title.length > constraints.titleMaxLength) {
      errors.push(
        `Title too long: ${content.title.length}/${constraints.titleMaxLength}`,
      );
    }

    if (content.content.length > constraints.contentMaxLength) {
      errors.push(
        `Content too long: ${content.content.length}/${constraints.contentMaxLength}`,
      );
    }

    if (
      constraints.hashtagMaxCount > 0 &&
      content.tags &&
      content.tags.length > constraints.hashtagMaxCount
    ) {
      errors.push(
        `Too many hashtags: ${content.tags.length}/${constraints.hashtagMaxCount}`,
      );
    }

    return { valid: errors.length === 0, errors };
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────

let instance: PlatformRegistry | null = null;

export function getPlatformRegistry(): PlatformRegistry {
  if (!instance) {
    instance = new PlatformRegistry();
  }
  return instance;
}
