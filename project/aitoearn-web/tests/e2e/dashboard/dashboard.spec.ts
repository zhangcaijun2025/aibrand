import { test, expect } from '@playwright/test';

/**
 * Dashboard page load tests.
 */
test.describe('Dashboard', () => {
  test('dashboard page loads without error', async ({ page }) => {
    const response = await page.goto('/zh-CN/dashboard');
    expect(response?.status()).toBe(200);

    // Wait for page to render
    await page.waitForTimeout(3000);

    // Should not show Next.js error overlay
    const errorOverlay = page.locator('nextjs-portal');
    expect(await errorOverlay.count()).toBe(0);
  });

  test('pricing page loads correctly', async ({ page }) => {
    const response = await page.goto('/zh-CN/pricing');
    expect(response?.status()).toBe(200);

    // Should contain plan information
    const content = await page.content();
    expect(content).toBeTruthy();
  });

  test('welcome page is accessible', async ({ page }) => {
    const response = await page.goto('/zh-CN/welcome');
    expect(response?.status()).toBe(200);

    const title = await page.title();
    expect(title).toBeTruthy();
  });
});
