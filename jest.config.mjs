/**
 * Jest configuration for MetropolisJS tests.
 * Pulls the default Lex Jest config (which includes TS/Babel transforms)
 * and overlays the project-specific settings from lex.config.mjs.
 */
import lexConfig from './lex.config.mjs';
import baseConfig from './node_modules/@nlabs/lex/jest.config.mjs';

const projectJest = lexConfig?.jest || {};

export default {
  ...baseConfig,
  ...projectJest,
  testPathIgnorePatterns: [
    'lib/__tests__/e2e/helpers/testGraphQLServer.d.ts',
    'lib/__tests__/e2e/helpers/testGraphQLServerSimple.d.ts'
  ],
  transformIgnorePatterns: [
    '/node_modules/(?!(?:@nlabs/utils|@nlabs/rip-hunter)/)'
  ],
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    ...projectJest.moduleNameMapper
  },
  transform: {
    ...baseConfig.transform
  }
};
