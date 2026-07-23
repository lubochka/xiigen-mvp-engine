/**
 * Vitest compatibility shim for Jest environments.
 * Maps vitest globals to Jest equivalents so test files using
 * `import { describe, it, expect } from 'vitest'` work under Jest.
 */
/* eslint-disable no-undef */
module.exports = {
  describe: global.describe,
  it: global.it,
  test: global.test,
  expect: global.expect,
  beforeAll: global.beforeAll,
  afterAll: global.afterAll,
  beforeEach: global.beforeEach,
  afterEach: global.afterEach,
  vi: {
    fn: jest.fn,
    spyOn: jest.spyOn,
    mock: jest.mock,
    clearAllMocks: jest.clearAllMocks,
    resetAllMocks: jest.resetAllMocks,
  },
};
