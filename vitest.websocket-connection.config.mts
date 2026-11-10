export default {test: {coverage: {enabled: true,
  include: ['src/actions/websocketActions/websocketActions.ts'], provider: 'v8',
  reporter: ['text', 'json', 'json-summary'], reportsDirectory: 'coverage-websocket-connection',
  thresholds: {branches: 90, functions: 90, lines: 90, perFile: true, statements: 90}},
environment: 'jsdom', globals: true, include: ['src/actions/websocketActions/*.test.ts']}};
