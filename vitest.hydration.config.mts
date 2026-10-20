export default {
  test: {
    coverage: {
      enabled: true,
      include: ['src/index.tsx', 'src/stores/appStore.ts', 'src/actions/webSessionActions/webSessionActions.ts'],
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary'],
      reportsDirectory: 'coverage-hydration',
      thresholds: {branches: 90, functions: 90, lines: 90, perFile: true, statements: 90}
    },
    environment: 'jsdom',
    globals: true,
    include: ['src/index*.test.tsx', 'src/stores/appStore.test.ts', 'src/actions/webSessionActions/webSessionActions.test.ts']
  }
};
