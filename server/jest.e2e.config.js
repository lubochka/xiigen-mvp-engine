/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/e2e/**/*.spec.ts', '**/e2e/**/*.e2e-spec.ts'],
  moduleNameMapper: {
    '^@kernel/(.*)$': '<rootDir>/src/kernel/$1',
    '^@fabrics/(.*)$': '<rootDir>/src/fabrics/$1',
    '^@test/(.*)$': '<rootDir>/test/$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs',
        target: 'ES2022',
        strict: true,
        esModuleInterop: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        skipLibCheck: true,
        noImplicitAny: false,
      },
    }],
  },
  testTimeout: 30000,
  verbose: true,
  // E2E tests must run serially — providers are stateful across setup/teardown
  // (--runInBand is also passed from the CLI in run-e2e.sh)
  maxWorkers: 1,
};
