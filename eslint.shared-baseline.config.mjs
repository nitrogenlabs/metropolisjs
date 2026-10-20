import config from './eslint.config.mjs';

const scope = [
  'src/actions/durableChatActions/*.ts', 'src/actions/index.ts',
  'src/index.sharedBaseline.test.ts', 'src/tests/web-session-public-types.tsx'
];
export default config.map((entry) => entry.ignores && !entry.files ? entry : {
  ...entry,
  files: scope.flatMap((file) => entry.files ? entry.files.map((pattern) => [pattern, file]) : [file])
});
