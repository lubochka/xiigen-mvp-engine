/**
 * P7.2 Tests — DnaInterceptor
 *
 * Tests: wrap non-DataProcessResult responses, pass-through DataProcessResult,
 * scope isolation check, enforce modes (log, warn, block), violation tracking.
 */

import { DataProcessResult } from '../../src/kernel/data-process-result';
import { DnaInterceptor } from '../../src/guardrails/dna.interceptor';

describe('DnaInterceptor', () => {
  describe('log mode (default)', () => {
    let interceptor: DnaInterceptor;

    beforeEach(() => {
      interceptor = new DnaInterceptor({ enforceMode: 'log' });
    });

    it('should pass through DataProcessResult unchanged', () => {
      const original = DataProcessResult.success({ name: 'test' });
      const result = interceptor.intercept(original);
      expect(result).toBe(original);
    });

    it('should wrap plain objects in DataProcessResult.success', () => {
      const result = interceptor.intercept({ name: 'test' });
      expect(result.isSuccess).toBe(true);
      expect(result.data).toEqual({ name: 'test' });
    });

    it('should log violation when wrapping plain response', () => {
      interceptor.intercept({ name: 'test' });
      expect(interceptor.violationCount).toBe(1);
      expect(interceptor.getViolations()[0].pattern_id).toBe('DNA-3');
    });

    it('should log violation when tenantId missing', () => {
      interceptor.intercept({ name: 'test' }, { path: '/api/users' });
      // Two violations: DNA-5 (no tenantId) + DNA-3 (not DataProcessResult)
      const violations = interceptor.getViolations();
      const dna5 = violations.filter((v) => v.pattern_id === 'DNA-5');
      expect(dna5).toHaveLength(1);
    });

    it('should NOT log DNA-5 when tenantId present', () => {
      interceptor.intercept({ name: 'test' }, { tenantId: 'tenant-1', path: '/api/users' });
      const violations = interceptor.getViolations();
      const dna5 = violations.filter((v) => v.pattern_id === 'DNA-5');
      expect(dna5).toHaveLength(0);
    });

    it('should still succeed in log mode (not block)', () => {
      const result = interceptor.intercept('plain string', { path: '/test' });
      expect(result.isSuccess).toBe(true);
    });
  });

  describe('block mode', () => {
    let interceptor: DnaInterceptor;

    beforeEach(() => {
      interceptor = new DnaInterceptor({ enforceMode: 'block' });
    });

    it('should block when tenantId missing', () => {
      const result = interceptor.intercept({ data: 'test' }, { path: '/api/items' });
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('DNA_5_VIOLATION');
    });

    it('should block non-DataProcessResult responses', () => {
      const result = interceptor.intercept({ data: 'test' }, { tenantId: 't1', path: '/api' });
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('DNA_3_VIOLATION');
    });

    it('should pass through DataProcessResult even in block mode', () => {
      const original = DataProcessResult.success('ok');
      const result = interceptor.intercept(original, { tenantId: 't1' });
      expect(result.isSuccess).toBe(true);
      expect(result).toBe(original);
    });
  });

  describe('violation tracking', () => {
    it('should track violation count', () => {
      const interceptor = new DnaInterceptor();
      interceptor.intercept('a');
      interceptor.intercept('b');
      expect(interceptor.violationCount).toBe(2);
    });

    it('should clear violations', () => {
      const interceptor = new DnaInterceptor();
      interceptor.intercept('a');
      interceptor.clearViolations();
      expect(interceptor.violationCount).toBe(0);
    });

    it('should return violations as dicts', () => {
      const interceptor = new DnaInterceptor();
      interceptor.intercept('a');
      const violations = interceptor.getViolations();
      expect(violations[0]).toHaveProperty('pattern_id');
      expect(violations[0]).toHaveProperty('message');
      expect(violations[0]).toHaveProperty('timestamp');
    });
  });

  describe('getEnforceMode', () => {
    it('should return configured mode', () => {
      expect(new DnaInterceptor({ enforceMode: 'log' }).getEnforceMode()).toBe('log');
      expect(new DnaInterceptor({ enforceMode: 'warn' }).getEnforceMode()).toBe('warn');
      expect(new DnaInterceptor({ enforceMode: 'block' }).getEnforceMode()).toBe('block');
    });

    it('should default to log', () => {
      expect(new DnaInterceptor().getEnforceMode()).toBe('log');
    });
  });
});
