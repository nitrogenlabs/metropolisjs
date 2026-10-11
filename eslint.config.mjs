import lex from '@nlabs/lex/eslint.config.mjs';

export default [
  ...lex,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.test.json',
        projectService: false,
        tsconfigRootDir: import.meta.dirname
      }
    }
  },
  {
    files: ['src/api/**/*.ts', 'src/nativeAuth/**/*.ts', 'src/session/*.ts'],
    ignores: ['**/*.test.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.native-auth.json',
        projectService: false,
        tsconfigRootDir: import.meta.dirname
      }
    }
  },
  {
    files: ['examples/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.examples.json',
        projectService: false,
        tsconfigRootDir: import.meta.dirname
      }
    }
  },
  {
    files: ['src/api/**/*.ts', 'src/nativeAuth/**/*.ts', 'src/session/sessionPolicy.ts', 'src/session/strictJwtTimeHints.test.ts'],
    rules: {
      '@typescript-eslint/dot-notation': ['error', {allowIndexSignaturePropertyAccess: true}],
      'dot-notation': 'off'
    }
  }
];
