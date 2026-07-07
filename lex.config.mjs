import {Config} from '@nlabs/lex';

export default Config.create({
  ai: {
    maxTokens: 4000,
    model: 'cursor-code',
    provider: 'cursor',
    temperature: 0.1
  },
  entryJS: 'app.tsx',
  esbuild: {
    minify: process.env.NODE_ENV === 'production'
  },
  gitUrl: 'https://github.com/nitrogenlabs/metropolisjs',
  outputPath: 'lib',
  targetEnvironment: 'web',
  useESM: true,
  useTypescript: true,
  vitest: {
    coverage: {
      enabled: true,
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/lib/**',
        '**/__snapshots__/**',
        '**/*.d.ts',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/**/*.e2e.{ts,tsx}',
        'src/**/*.e2e.test.ts',
        'src/**/*.e2e.test.tsx',
        'src/**/*.e2e.*',
        'src/tests/**',
        'src/tests/**/*',
        '**/src/tests/**',
        '**/src/tests/**/*',
        'src/**/*.types.ts',
        'src/graphql/**'
      ],
      include: ['src/**/*.{ts,tsx}'],
      reporter: ['text-summary'],
      thresholds: {
        functions: 90,
        lines: 90,
        statements: 90
      }
    },
    globals: true,
    hookTimeout: 120000,
    testEnvironment: 'jsdom',
    testTimeout: 120000
  }
});
