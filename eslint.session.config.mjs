import lex from './node_modules/@nlabs/lex/eslint.config.mjs';

export default [
  ...lex,
  {
    files: ['src/**/*.test.ts'],
    languageOptions: {parserOptions: {project: './tsconfig.test.json', projectService: false, tsconfigRootDir: import.meta.dirname}}
  }
];
