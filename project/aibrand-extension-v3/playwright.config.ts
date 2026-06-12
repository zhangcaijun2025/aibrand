import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 1,
  use: {
    headless: false,  // Extension requires a real browser
    viewport: { width: 400, height: 700 }, // Side panel size
    actionTimeout: 10_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        launchOptions: {
          args: [
            `--load-extension=./dist/chrome-mv3`,
            `--disable-extensions-except=./dist/chrome-mv3`,
          ],
        },
      },
    },
  ],
});
