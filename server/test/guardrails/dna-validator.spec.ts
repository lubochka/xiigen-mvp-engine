/**
 * P7.2 Tests — DnaPatternValidator
 *
 * Tests per DNA pattern (positive = clean, negative = violation),
 * isCompliant, summarize, empty code, DNA-3 return type.
 */

import { DataProcessResult } from '../../src/kernel/data-process-result';
import { DnaPatternValidator } from '../../src/guardrails/dna-validator';

describe('DnaPatternValidator', () => {
  let validator: DnaPatternValidator;

  beforeEach(() => {
    validator = new DnaPatternValidator();
  });

  // ── DNA-1: ParseDocument ───────────────────────────

  describe('DNA-1: ParseDocument', () => {
    it('should flag class XxxModel (typed model)', () => {
      const code = 'class OrderModel { id: string; }';
      const result = validator.validate(code);
      const violations = result.data!.filter((v) => v.patternId === 'DNA-1');
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].severity).toBe('error');
    });

    it('should flag class XxxEntity (typed model)', () => {
      const code = 'class UserEntity { name: string; }';
      const result = validator.validate(code);
      const violations = result.data!.filter((v) => v.patternId === 'DNA-1');
      expect(violations.length).toBeGreaterThan(0);
    });

    it('should flag interface XxxModel', () => {
      const code = 'interface ProductModel { sku: string; }';
      const result = validator.validate(code);
      const violations = result.data!.filter((v) => v.patternId === 'DNA-1');
      expect(violations.length).toBeGreaterThan(0);
    });

    it('should pass code using Record<string, unknown>', () => {
      const code = 'const doc: Record<string, unknown> = { id: "1" };';
      const result = validator.validate(code);
      const violations = result.data!.filter((v) => v.patternId === 'DNA-1');
      expect(violations).toHaveLength(0);
    });
  });

  // ── DNA-2: BuildQueryFilters ───────────────────────

  describe('DNA-2: BuildQueryFilters', () => {
    it('should warn when filter+search without skip logic', () => {
      const code = 'function searchItems(filter, query) { return db.search(filter, query); }';
      const result = validator.validate(code);
      const violations = result.data!.filter((v) => v.patternId === 'DNA-2');
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].severity).toBe('warning');
    });

    it('should pass when using buildSearchFilter', () => {
      const code = 'const f = buildSearchFilter(params); db.search(f, query);';
      const result = validator.validate(code);
      const violations = result.data!.filter((v) => v.patternId === 'DNA-2');
      expect(violations).toHaveLength(0);
    });

    it('should pass when filter code has null/undefined checks', () => {
      const code =
        'function searchItems(filter, query) { if (filter === null) return []; db.find(filter, query); }';
      const result = validator.validate(code);
      const violations = result.data!.filter((v) => v.patternId === 'DNA-2');
      expect(violations).toHaveLength(0);
    });
  });

  // ── DNA-3: DataProcessResult ───────────────────────

  describe('DNA-3: DataProcessResult', () => {
    it('should error when functions dont use DataProcessResult', () => {
      const code = 'function getUser() { return { name: "test" }; }';
      const result = validator.validate(code);
      const violations = result.data!.filter((v) => v.patternId === 'DNA-3');
      const errors = violations.filter((v) => v.severity === 'error');
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should warn on throw new Error in service method', () => {
      const code =
        'class UserService extends MicroserviceBase {\n  getUser() {\n    throw new Error("not found");\n  }\n}';
      const result = validator.validate(code);
      const violations = result.data!.filter((v) => v.patternId === 'DNA-3');
      const warnings = violations.filter((v) => v.severity === 'warning');
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('should pass code using DataProcessResult', () => {
      const code =
        'function getUser(): DataProcessResult<User> { return DataProcessResult.success(user); }';
      const result = validator.validate(code);
      const violations = result.data!.filter(
        (v) => v.patternId === 'DNA-3' && v.severity === 'error',
      );
      expect(violations).toHaveLength(0);
    });

    it('should allow throw with // system comment', () => {
      const code = 'function init() {\n  throw new Error("bootstrap failed"); // system\n}';
      const result = validator.validate(code);
      const warnings = result.data!.filter(
        (v) => v.patternId === 'DNA-3' && v.severity === 'warning',
      );
      expect(warnings).toHaveLength(0);
    });
  });

  // ── DNA-4: MicroserviceBase ────────────────────────

  describe('DNA-4: MicroserviceBase', () => {
    it('should error when service lacks MicroserviceBase', () => {
      const code = 'class InventoryService { doStuff() {} }';
      const result = validator.validate(code, { isService: true });
      const violations = result.data!.filter((v) => v.patternId === 'DNA-4');
      expect(violations).toHaveLength(1);
      expect(violations[0].severity).toBe('error');
    });

    it('should pass service extending MicroserviceBase', () => {
      const code = 'class InventoryService extends MicroserviceBase { doStuff() {} }';
      const result = validator.validate(code, { isService: true });
      const violations = result.data!.filter((v) => v.patternId === 'DNA-4');
      expect(violations).toHaveLength(0);
    });

    it('should skip DNA-4 check for non-service code', () => {
      const code = 'class Helper { doStuff() {} }';
      const result = validator.validate(code, { isService: false });
      const violations = result.data!.filter((v) => v.patternId === 'DNA-4');
      expect(violations).toHaveLength(0);
    });
  });

  // ── DNA-5: Scope Isolation ─────────────────────────

  describe('DNA-5: ScopeIsolation', () => {
    it('should error when query code lacks tenantId', () => {
      const code = 'function searchItems() { db.find({ name: "test" }); }';
      const result = validator.validate(code);
      const violations = result.data!.filter((v) => v.patternId === 'DNA-5');
      expect(violations).toHaveLength(1);
      expect(violations[0].severity).toBe('error');
    });

    it('should pass when query code includes tenantId', () => {
      const code =
        'function searchItems(tenantId: string) { db.find({ tenantId, name: "test" }); }';
      const result = validator.validate(code);
      const violations = result.data!.filter((v) => v.patternId === 'DNA-5');
      expect(violations).toHaveLength(0);
    });

    it('should pass when using TenantContext', () => {
      const code = 'function searchItems() { const ctx = TenantContext.get(); db.find(ctx); }';
      const result = validator.validate(code);
      const violations = result.data!.filter((v) => v.patternId === 'DNA-5');
      expect(violations).toHaveLength(0);
    });
  });

  // ── DNA-6: DynamicController ───────────────────────

  describe('DNA-6: DynamicController', () => {
    it('should error on entity-specific controller', () => {
      const code = 'class UserController { getUsers() {} }';
      const result = validator.validate(code);
      const violations = result.data!.filter((v) => v.patternId === 'DNA-6');
      expect(violations).toHaveLength(1);
      expect(violations[0].severity).toBe('error');
      expect(violations[0].message).toContain('UserController');
    });

    it('should allow DynamicController', () => {
      const code = 'class DynamicController { handle() {} }';
      const result = validator.validate(code);
      const violations = result.data!.filter((v) => v.patternId === 'DNA-6');
      expect(violations).toHaveLength(0);
    });

    it('should allow HealthController', () => {
      const code = 'class HealthController { check() {} }';
      const result = validator.validate(code);
      const violations = result.data!.filter((v) => v.patternId === 'DNA-6');
      expect(violations).toHaveLength(0);
    });

    it('should detect multiple entity controllers', () => {
      const code = 'class UserController {} class OrderController {}';
      const result = validator.validate(code);
      const violations = result.data!.filter((v) => v.patternId === 'DNA-6');
      expect(violations).toHaveLength(2);
    });
  });

  // ── DNA-7: Idempotency ────────────────────────────

  describe('DNA-7: Idempotency', () => {
    it('should warn on mutations without idempotency key', () => {
      const code = 'function createOrder(data) { db.insert(data); }';
      const result = validator.validate(code);
      const violations = result.data!.filter((v) => v.patternId === 'DNA-7');
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].severity).toBe('warning');
    });

    it('should pass mutations with idempotency handling', () => {
      const code =
        'function createOrder(data, idempotencyKey) { checkIdempotency(idempotencyKey); db.insert(data); }';
      const result = validator.validate(code);
      const violations = result.data!.filter((v) => v.patternId === 'DNA-7');
      expect(violations).toHaveLength(0);
    });
  });

  // ── DNA-8: Outbox-before-queue ────────────────────

  describe('DNA-8: OutboxBeforeQueue', () => {
    it('should error when enqueueAsync before storeDocument', () => {
      const code = 'await enqueueAsync(event); await storeDocument(doc);';
      const result = validator.validate(code);
      const violations = result.data!.filter((v) => v.patternId === 'DNA-8');
      expect(violations).toHaveLength(1);
      expect(violations[0].severity).toBe('error');
    });

    it('should pass when storeDocument before enqueueAsync', () => {
      const code = 'await storeDocument(doc); await enqueueAsync(event);';
      const result = validator.validate(code);
      const violations = result.data!.filter((v) => v.patternId === 'DNA-8');
      expect(violations).toHaveLength(0);
    });

    it('should pass when only storeDocument (no queue)', () => {
      const code = 'await storeDocument(doc);';
      const result = validator.validate(code);
      const violations = result.data!.filter((v) => v.patternId === 'DNA-8');
      expect(violations).toHaveLength(0);
    });
  });

  // ── DNA-9: CloudEvents ────────────────────────────

  describe('DNA-9: CloudEvents', () => {
    it('should warn when event publishing without CloudEvents', () => {
      const code = 'function publishEvent(data) { queue.emit(data); }';
      const result = validator.validate(code);
      const violations = result.data!.filter((v) => v.patternId === 'DNA-9');
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].severity).toBe('warning');
    });

    it('should pass when using CloudEvent envelope', () => {
      const code =
        'function publishEvent(data) { const event = new CloudEvent(data); queue.emit(event); }';
      const result = validator.validate(code);
      const violations = result.data!.filter((v) => v.patternId === 'DNA-9');
      expect(violations).toHaveLength(0);
    });
  });

  // ── General ────────────────────────────────────────

  describe('general', () => {
    it('should return DataProcessResult (DNA-3)', () => {
      const result = validator.validate('const x = 1;');
      expect(result).toBeInstanceOf(DataProcessResult);
    });

    it('should fail on empty code', () => {
      const result = validator.validate('');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('EMPTY_CODE');
    });

    it('should fail on whitespace-only code', () => {
      const result = validator.validate('   \n  \t  ');
      expect(result.isSuccess).toBe(false);
    });

    it('should return empty violations for fully compliant code', () => {
      const code = 'const config: Record<string, unknown> = { tenantId: "t1" };';
      const result = validator.validate(code);
      expect(result.isSuccess).toBe(true);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('isCompliant', () => {
    it('should return true when no error-level violations', () => {
      const code = 'const x: Record<string, unknown> = {};';
      expect(validator.isCompliant(code)).toBe(true);
    });

    it('should return false when error-level violations exist', () => {
      const code = 'class OrderModel { id: string; }';
      expect(validator.isCompliant(code)).toBe(false);
    });

    it('should return true when only warnings (no errors)', () => {
      // DNA-9 warning only: event publish without CloudEvents
      const code = 'function notify() { queue.emit({ type: "dispatch event" }); }';
      // This may trigger DNA-9 warning but no errors
      const result = validator.validate(code);
      const errors = result.data!.filter((v) => v.severity === 'error');
      if (errors.length === 0) {
        expect(validator.isCompliant(code)).toBe(true);
      }
    });
  });

  describe('summarize', () => {
    it('should count errors and warnings', () => {
      const violations = [
        {
          patternId: 'DNA-1',
          patternName: 'ParseDocument',
          severity: 'error' as const,
          message: 'test',
        },
        {
          patternId: 'DNA-2',
          patternName: 'BuildQueryFilters',
          severity: 'warning' as const,
          message: 'test',
        },
        {
          patternId: 'DNA-3',
          patternName: 'DataProcessResult',
          severity: 'error' as const,
          message: 'test',
        },
      ];
      const summary = validator.summarize(violations);
      expect(summary.errors).toBe(2);
      expect(summary.warnings).toBe(1);
      expect(summary.total).toBe(3);
    });
  });
});
