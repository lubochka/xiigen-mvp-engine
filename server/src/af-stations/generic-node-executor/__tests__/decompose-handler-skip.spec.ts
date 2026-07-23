/**
 * SKIP outcome tests for resolveStepStatus (GAP-M6)
 * Tests the decompose handler SKIP logic.
 */

import { resolveStepStatus } from '../decompose-handler-types';

describe('decompose.handler SKIP outcome (GAP-M6)', () => {
  describe('resolveStepStatus', () => {
    it('returns SKIP when result.data.skipped is true', () => {
      const result = { isSuccess: true, data: { skipped: true, skipReason: 'FREEDOM_GATED' } };
      expect(resolveStepStatus(result)).toBe('SKIP');
    });

    it('returns SUCCESS when result.data.skipped is false', () => {
      const result = { isSuccess: true, data: { skipped: false, value: 'something' } };
      expect(resolveStepStatus(result)).toBe('SUCCESS');
    });

    it('returns SUCCESS when result.data has no skipped field', () => {
      const result = { isSuccess: true, data: { value: 'something' } };
      expect(resolveStepStatus(result)).toBe('SUCCESS');
    });

    it('returns FAILURE when result.isSuccess is false', () => {
      const result = { isSuccess: false, errorCode: 'ERR', errorMessage: 'failed' };
      expect(resolveStepStatus(result)).toBe('FAILURE');
    });

    it('returns SUCCESS when data is undefined but isSuccess is true', () => {
      const result = { isSuccess: true, data: undefined };
      expect(resolveStepStatus(result)).toBe('SUCCESS');
    });

    it('returns SKIP only when skipped is strictly true (not truthy string)', () => {
      const result = { isSuccess: true, data: { skipped: 'yes' } };
      // 'yes' !== true — strict equality check
      expect(resolveStepStatus(result)).toBe('SUCCESS');
    });
  });
});
