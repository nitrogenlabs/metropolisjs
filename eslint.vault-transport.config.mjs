import base from '@nlabs/lex/eslint.config.mjs';

const files = ['src/actions/websocketActions/websocketActions.ts',
  'src/actions/websocketActions/websocketActions.connection.test.ts', 'src/actions/durableChatActions/durableChatActions.test.ts',
  'src/actions/webSessionActions/webSessionActions.ts', 'src/actions/webSessionActions/webSessionActions.cleanup.test.ts', 'src/actions/webSessionActions/webSessionActions.test.ts', 'eslint.vault-transport.config.mjs', 'lex.config.mjs', 'src/githooks.test.ts',
  'src/utils/api.credentials.test.ts', 'src/utils/location.test.ts',
  'test-utils/vaultTransportPublicConsumer.mts', 'tests/web-session-transport-server.mjs'];
export default [{ignores: ['**/*', '!**/', ...files.map((file) => `!${file}`)]}, ...base,
  {files: ['src/actions/websocketActions/*.ts', 'src/actions/durableChatActions/durableChatActions.test.ts',
    'src/actions/webSessionActions/webSessionActions.ts', 'src/actions/webSessionActions/webSessionActions.cleanup.test.ts', 'src/actions/webSessionActions/webSessionActions.test.ts', 'src/githooks.test.ts', 'src/utils/location.test.ts', 'src/utils/api.credentials.test.ts'], languageOptions: {parserOptions: {
    project: './tsconfig.test.json', projectService: false, tsconfigRootDir: import.meta.dirname
  }}},
  {files: ['test-utils/vaultTransportPublicConsumer.mts'], languageOptions: {parserOptions: {
    project: './tsconfig.vault-public.json', projectService: false, tsconfigRootDir: import.meta.dirname
  }}}];
