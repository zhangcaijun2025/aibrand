import { test, expect } from '@playwright/test';

/**
 * Publish page with extension bridge tests.
 */
test.describe('Publish Page', () => {
  test('publish page loads correctly', async ({ page }) => {
    const response = await page.goto('/zh-CN/dashboard/publish');
    expect(response?.status()).toBe(200);
    await page.waitForTimeout(3000);
  });

  test('publish page shows platform tabs', async ({ page }) => {
    await page.goto('/zh-CN/dashboard/publish');
    await page.waitForTimeout(2000);

    // Check for tab labels
    const content = await page.content();
    // Should contain platform type labels
    const hasTabs = /文章|动态|视频|播客|article|dynamic|video|podcast/i.test(content);
    expect(hasTabs).toBe(true);
  });

  test('publish page shows extension detection UI', async ({ page }) => {
    await page.goto('/zh-CN/dashboard/publish');
    await page.waitForTimeout(2000);

    // Extension status should be displayed
    const content = await page.content();
    const hasDetection = /扩展|extension/i.test(content);
    expect(hasDetection).toBe(true);
  });
});
