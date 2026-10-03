import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'native-notifications.e2e.ts',
  use: {baseURL: 'http://127.0.0.1:63719', headless: true},
  webServer: {
    command: 'npx vite --host 127.0.0.1 --port 63719 --strictPort',
    reuseExistingServer: false,
    url: 'http://127.0.0.1:63719/tests/native-notifications-harness.html'
  }
});
