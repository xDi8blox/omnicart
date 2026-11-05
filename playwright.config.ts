import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:4500',
    headless: true,
    viewport: { width: 1280, height: 720 },
    hasTouch: true,
    ...devices['Desktop Chrome'],
    launchOptions: {
      args: ['--use-gl=swiftshader', '--ignore-gpu-blocklist'],
    },
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4500',
    port: 4500,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
