import { describe, it, expect } from 'vitest';
import { generateTraceId, sleep, retry, formatRelativeTime, safeJsonParse } from '@/shared/utils';

describe('utils', () => {
  describe('generateTraceId', () => {
    it('returns non-empty string', () => {
      expect(generateTraceId().length).toBeGreaterThan(0);
    });

    it('generates unique values', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateTraceId()));
      expect(ids.size).toBe(100);
    });
  });

  describe('sleep', () => {
    it('resolves after delay', async () => {
      const start = Date.now();
      await sleep(50);
      expect(Date.now() - start).toBeGreaterThanOrEqual(40);
    });
  });

  describe('retry', () => {
    it('returns value on first success', async () => {
      const result = await retry(() => Promise.resolve(42));
      expect(result).toBe(42);
    });

    it('retries on failure', async () => {
      let calls = 0;
      const fn = () => {
        calls++;
        if (calls < 3) return Promise.reject(new Error('fail'));
        return Promise.resolve('ok');
      };

      const result = await retry(fn, { maxRetries: 5, baseDelay: 10, maxDelay: 100 });
      expect(result).toBe('ok');
      expect(calls).toBe(3);
    });

    it('throws after max retries', async () => {
      const fn = () => Promise.reject(new Error('always fail'));
      await expect(retry(fn, { maxRetries: 2, baseDelay: 10 })).rejects.toThrow('always fail');
    });
  });

  describe('formatRelativeTime', () => {
    it('returns "just now" for recent', () => {
      expect(formatRelativeTime(Date.now())).toBe('just now');
    });

    it('returns minutes ago', () => {
      expect(formatRelativeTime(Date.now() - 5 * 60 * 1000)).toBe('5m ago');
    });
  });

  describe('safeJsonParse', () => {
    it('parses valid JSON', () => {
      expect(safeJsonParse('{"a":1}', {})).toEqual({ a: 1 });
    });

    it('returns fallback on invalid JSON', () => {
      expect(safeJsonParse('invalid', { default: true })).toEqual({ default: true });
    });
  });
});
