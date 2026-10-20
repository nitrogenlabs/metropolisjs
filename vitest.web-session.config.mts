export default {
  test: {
    coverage: {
      enabled: true,
      include: ['src/session/webSessionPolicy.ts', 'src/stores/webSessionStore.ts', 'src/utils/webSessionRuntime.ts', 'src/actions/webSessionActions/webSessionActions.ts', 'src/utils/api.ts', 'src/index.tsx', 'src/utils/useMetropolis.ts', 'src/utils/cacheIngestion.ts', 'src/stores/nativeNotificationStore.ts'],
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary'],
      reportsDirectory: 'coverage-web-session',
      thresholds: {branches: 90, functions: 90, lines: 90, perFile: true, statements: 90}
    },
    environment: 'jsdom',
    globals: true,
    include: ['src/session/*.test.ts', 'src/stores/webSessionStore.test.ts', 'src/utils/webSessionRuntime.test.ts', 'src/actions/webSessionActions/webSessionActions.test.ts', 'src/utils/api*.test.ts', 'src/utils/useMetropolis.test.tsx', 'src/utils/session.test.ts', 'src/nativeAuth/*.test.ts', 'src/api/*.test.ts', 'src/index*.test.tsx', 'src/utils/cacheIngestion.test.ts', 'src/stores/nativeNotificationStore.test.ts']
  }
};
