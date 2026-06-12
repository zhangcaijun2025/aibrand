import { describe, it, expect, beforeEach } from 'vitest';
import { PlatformRegistry, getPlatformRegistry } from '@/platforms/registry';
import type { PlatformConfig } from '@/shared/types';

const mockConfig: PlatformConfig = {
  id: 'weibo', name: '微博', type: 'dynamic', icon: 'weibo',
  publishUrl: 'https://weibo.com', loginUrl: 'https://weibo.com/login',
  pipeline: [{ id: 'test', type: 'click', target: { selector: '.btn' }, value: '' }],
  aiInjection: { enabled: true, prompt: '', fallbackSelectors: {} },
  mediaConstraints: { images: { max: 9, formats: ['png'], maxSize: 10e6 }, videos: { max: 1, formats: ['mp4'], maxDuration: 300 } },
  contentConstraints: { titleMaxLength: 100, contentMaxLength: 2000, hashtagMaxCount: 10, supportedFeatures: [] },
  loginDetection: {},
};

describe('PlatformRegistry', () => {
  let registry: PlatformRegistry;

  beforeEach(() => {
    registry = new PlatformRegistry();
  });

  it('starts empty', () => {
    expect(registry.getIds()).toHaveLength(0);
  });

  it('applies hot-reload configs', () => {
    registry.applyUpdate({ weibo: mockConfig });
    expect(registry.has('weibo')).toBe(true);
    expect(registry.get('weibo')?.name).toBe('微博');
  });

  it('filters by content type', () => {
    registry.applyUpdate({ weibo: mockConfig });
    const dynamics = registry.getByType('dynamic');
    expect(dynamics).toHaveLength(1);
    expect(registry.getByType('video')).toHaveLength(0);
  });

  it('validates content against constraints', () => {
    registry.applyUpdate({ weibo: mockConfig });
    const result = registry.validateContent('weibo', {
      title: 'A'.repeat(200),
      content: 'Hello',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Title too long'))).toBe(true);
  });

  it('returns capabilities for REGISTER message', () => {
    registry.applyUpdate({ weibo: mockConfig, douyin: { ...mockConfig, id: 'douyin', name: '抖音' } });
    expect(registry.getCapabilities()).toHaveLength(2);
  });

  it('works as singleton', () => {
    expect(getPlatformRegistry()).toBe(getPlatformRegistry());
  });
});
