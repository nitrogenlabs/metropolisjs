export default {
  test: {
    coverage: {
      enabled: true,
      include: ['src/session/sessionPolicy.ts', 'src/session/singleFlight.ts'],
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      thresholds: {branches: 90, functions: 90, lines: 90, statements: 90}
    },
    environment: 'node',
    include: ['src/session/*.test.ts']
  }
};
