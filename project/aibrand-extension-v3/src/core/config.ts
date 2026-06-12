/**
 * AiBrand Extension v3 — Dynamic Config Service
 *
 * Manages platform configs and feature flags that can be hot-updated
 * from the backend via CONFIG_UPDATE WebSocket messages.
 *
 * Configs are cached in chrome.storage.local and refreshed on WS connect.
 */

import { STORAGE_KEY_CONFIGS } from '@/shared/constants';
import type { PlatformConfig } from '@/shared/types';

export class ConfigService {
  private platformConfigs: Record<string, PlatformConfig> = {};
  private featureFlags: Record<string, boolean> = {};

  /**
   * Load cached configs from storage.
   */
  async init(): Promise<void> {
    const stored = await chrome.storage.local.get(STORAGE_KEY_CONFIGS);
    if (stored[STORAGE_KEY_CONFIGS]) {
      const data = stored[STORAGE_KEY_CONFIGS] as {
        platformConfigs: Record<string, PlatformConfig>;
        featureFlags: Record<string, boolean>;
      };
      this.platformConfigs = data.platformConfigs ?? {};
      this.featureFlags = data.featureFlags ?? {};
    }
  }

  /**
   * Apply a CONFIG_UPDATE from the backend.
   */
  async applyUpdate(configs: Record<string, PlatformConfig>, flags?: Record<string, boolean>): Promise<void> {
    this.platformConfigs = { ...this.platformConfigs, ...configs };
    if (flags) {
      this.featureFlags = { ...this.featureFlags, ...flags };
    }

    // Persist to storage
    await chrome.storage.local.set({
      [STORAGE_KEY_CONFIGS]: {
        platformConfigs: this.platformConfigs,
        featureFlags: this.featureFlags,
      },
    });

    console.log('[AiBrand:Config] Updated:', {
      platforms: Object.keys(configs).length,
      flags: flags ? Object.keys(flags).length : 0,
    });
  }

  /** Get a single platform config */
  getPlatform(id: string): PlatformConfig | undefined {
    return this.platformConfigs[id];
  }

  /** Get all platform configs */
  getAllPlatforms(): Record<string, PlatformConfig> {
    return this.platformConfigs;
  }

  /** Check a feature flag */
  isFeatureEnabled(flag: string): boolean {
    return this.featureFlags[flag] ?? false;
  }

  /** Get all feature flags */
  getAllFlags(): Record<string, boolean> {
    return this.featureFlags;
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────

let instance: ConfigService | null = null;

export function getConfigService(): ConfigService {
  if (!instance) {
    instance = new ConfigService();
  }
  return instance;
}
