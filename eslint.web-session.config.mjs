import config from './eslint.config.mjs';

const scope = [
  'src/actions/webSessionActions/*.ts', 'src/actions/index.ts', 'src/session/webSessionPolicy*.ts', 'src/session/index.ts',
  'src/stores/webSessionStore*.ts', 'src/stores/index.ts', 'src/utils/webSessionRuntime*.ts', 'src/utils/api.ts',
  'src/utils/api.webSession.test.ts', 'src/index.tsx', 'src/index.webSession.test.tsx', 'src/utils/useMetropolis.ts',
  'src/index.test.tsx', 'src/utils/useMetropolis.test.tsx', 'src/utils/cacheIngestion.ts', 'src/utils/cacheIngestion.test.ts',
  'src/stores/nativeNotificationStore.ts', 'src/stores/nativeNotificationStore.test.ts',
  'tests/web-session-*.ts', 'tests/web-session-*.mjs', 'playwright.web-session.config.ts'
];
export default [...config.map((entry) => entry.ignores && !entry.files ? entry : {
  ...entry,
  files: scope.flatMap((file) => entry.files ? entry.files.map((pattern) => [pattern, file]) : [file])
}), {
  files: ['tests/web-session-transport.e2e.ts', 'playwright.web-session.config.ts'],
  languageOptions: {parserOptions: {project: './tsconfig.web-session-browser.json', projectService: false, tsconfigRootDir: import.meta.dirname}}
}];
