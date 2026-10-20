import {defineConfig} from '@playwright/test';

export default defineConfig({
  fullyParallel: true,
  projects: [{name: 'chromium', use: {browserName: 'chromium'}}, {name: 'webkit', use: {browserName: 'webkit'}}],
  reporter: [['list']],
  testDir: './tests',
  testMatch: 'web-session-transport.e2e.ts',
  timeout: 50_000,
  use: {baseURL: 'http://127.0.0.1:63721', headless: true},
  webServer: {command: 'node tests/web-session-transport-server.mjs', reuseExistingServer: false, url: 'http://127.0.0.1:63721'}
});
