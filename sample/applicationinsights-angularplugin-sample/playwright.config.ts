import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/src',
  use: {
    baseURL: 'http://127.0.0.1:4200',
    ...devices['Desktop Chrome']
  },
  webServer: {
    command: 'npm start -- --host 127.0.0.1',
    url: 'http://127.0.0.1:4200',
    reuseExistingServer: !process.env.CI
  }
});
