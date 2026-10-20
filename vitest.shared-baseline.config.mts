export default {
  test: {
    coverage: {
      enabled: true,
      include: ['src/actions/durableChatActions/documents.ts', 'src/actions/durableChatActions/durableChatActions.ts'],
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary'],
      reportsDirectory: 'coverage-shared-baseline',
      thresholds: {branches: 90, functions: 90, lines: 90, perFile: true, statements: 90}
    },
    environment: 'jsdom',
    globals: true,
    include: ['src/actions/durableChatActions/*.test.ts', 'src/index.sharedBaseline.test.ts', 'src/index.webSession.test.tsx', 'src/index.test.tsx', 'src/actions/webSessionActions/webSessionActions.test.ts']
  }
};
