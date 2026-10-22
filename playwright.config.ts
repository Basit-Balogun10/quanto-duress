import { existsSync } from 'node:fs'
import { defineConfig } from '@playwright/test'

const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ??
  (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined)

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 180_000,
  expect: { timeout: 10_000 },
  reporter: 'list',
  outputDir: 'test-results',
  use: {
    baseURL: process.env.BASE_URL ?? 'http://127.0.0.1:5173',
    viewport: { width: 1440, height: 1100 },
    launchOptions: executablePath ? { executablePath } : {},
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'pnpm dev --host 127.0.0.1 --port 5173',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
