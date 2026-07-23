/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    // FLOW-01 Phase A6 / GR-001: Vite-shim transformer wraps ts-jest to
    // rewrite `import.meta.env.*` and `import.meta.glob(...)` to
    // Jest-safe values before TypeScript compilation. Unblocks 11
    // pre-existing suites that failed at parse time because ts-jest
    // compiles to CommonJS where `import.meta` is a syntax error.
    '^.+\\.tsx?$': '<rootDir>/jest.transform.vite.cjs',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^vitest$': '<rootDir>/__mocks__/vitest.js',
    '\\.css$': '<rootDir>/__mocks__/styleMock.js',
  },
  setupFilesAfterSetup: [],
};
