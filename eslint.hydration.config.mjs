import config from './eslint.config.mjs';

const scope = ['src/index.tsx', 'src/index.hydration.test.tsx', 'src/index.test.tsx',
  'src/stores/appStore.ts', 'src/stores/appStore.test.ts', 'src/actions/webSessionActions/webSessionActions.ts'];
export default config.map((entry) => entry.ignores && !entry.files ? entry : {
  ...entry,
  files: scope.flatMap((file) => entry.files ? entry.files.map((pattern) => [pattern, file]) : [file])
});
