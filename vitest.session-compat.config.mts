export default {
  test: {
    coverage: {enabled: false},
    environment: 'jsdom',
    globals: true,
    include: ['src/utils/session.test.ts', 'src/utils/api*.test.ts']
  }
};
