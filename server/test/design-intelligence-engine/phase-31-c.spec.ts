/**
 * FLOW-31 Phase C — Analysis Pipeline Tests (T494–T498)
 * F31C-1 through F31C-40
 */

import { DesignConflictDetector } from '../../src/engine/flows/design-system-governance/design-conflict-detector.service';
import { ComponentCompatibilityChecker } from '../../src/engine/flows/design-system-governance/component-compatibility-checker.service';
import { DesignRuleValidator } from '../../src/engine/flows/design-system-governance/design-rule-validator.service';
import { TokenConflictScanner } from '../../src/engine/flows/design-system-governance/token-conflict-scanner.service';
import { DesignDebtAnalyzer } from '../../src/engine/flows/design-system-governance/design-debt-analyzer.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ─── In-memory fakes ───────────────────────────────────────────────────────

function makeDb(
  overrides?: Partial<{
    store: Record<string, unknown[]>;
    searchResult: Record<string, unknown>[];
    storeFail: boolean;
  }>,
) {
  const store: Record<string, unknown[]> = overrides?.store ?? {};
  const searchResult: Record<string, unknown>[] = overrides?.searchResult ?? [];
  return {
    _store: store,
    async storeDocument(
      index: string,
      doc: Record<string, unknown>,
      id?: string,
    ): Promise<DataProcessResult<Record<string, unknown>>> {
      if (overrides?.storeFail)
        return DataProcessResult.failure<Record<string, unknown>>('DB_ERROR', 'store failed');
      if (!store[index]) store[index] = [];
      store[index].push({ ...doc, _id: id });
      return DataProcessResult.success<Record<string, unknown>>(doc);
    },
    async searchDocuments(
      _index: string,
      _filter: Record<string, unknown>,
    ): Promise<DataProcessResult<Record<string, unknown>[]>> {
      return DataProcessResult.success<Record<string, unknown>[]>(searchResult);
    },
  };
}

function makeDbFailing() {
  return {
    async storeDocument(): Promise<DataProcessResult<Record<string, unknown>>> {
      return DataProcessResult.failure<Record<string, unknown>>('DB_ERROR', 'store failed');
    },
    async searchDocuments(): Promise<DataProcessResult<Record<string, unknown>[]>> {
      return DataProcessResult.failure<Record<string, unknown>[]>('DB_ERROR', 'search failed');
    },
  };
}

function makeQueue() {
  const events: Array<{ event: string; data: Record<string, unknown> }> = [];
  return {
    _events: events,
    async enqueue(event: string, data: Record<string, unknown>) {
      events.push({ event, data });
      return DataProcessResult.success(event);
    },
  };
}

function makeFreedom(data?: Record<string, unknown>) {
  return {
    async get(_key: string): Promise<DataProcessResult<Record<string, unknown>>> {
      if (data) return DataProcessResult.success<Record<string, unknown>>(data);
      return DataProcessResult.failure<Record<string, unknown>>('NOT_FOUND', 'no config');
    },
  };
}

// ─── T494: DesignConflictDetector ─────────────────────────────────────────

describe('F31C-1..F31C-8 — DesignConflictDetector (T494)', () => {
  it('F31C-1: returns UNSCOPED_QUERY when tenantId is empty', async () => {
    const svc = new DesignConflictDetector(makeDb(), makeQueue());
    const r = await svc.detect('', 'spec-1', ['pattern-a']);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F31C-2: returns MISSING_SPEC_ID when specId is empty', async () => {
    const svc = new DesignConflictDetector(makeDb(), makeQueue());
    const r = await svc.detect('tenant-1', '', ['pattern-a']);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_SPEC_ID');
  });

  it('F31C-3: returns failure when searchDocuments fails', async () => {
    const svc = new DesignConflictDetector(makeDbFailing(), makeQueue());
    const r = await svc.detect('tenant-1', 'spec-1', ['pattern-a']);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('DB_ERROR');
  });

  it('F31C-4: returns DESIGN_CONFLICT_DETECTED when pattern names conflict', async () => {
    const db = makeDb({
      searchResult: [
        { specId: 'spec-other', patterns: [{ name: 'pattern-a' }, { name: 'pattern-b' }] },
      ],
    });
    const svc = new DesignConflictDetector(db, makeQueue());
    const r = await svc.detect('tenant-1', 'spec-1', ['pattern-a']);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('DESIGN_CONFLICT_DETECTED');
  });

  it('F31C-5: ignores conflicts from same specId', async () => {
    const db = makeDb({ searchResult: [{ specId: 'spec-1', patterns: [{ name: 'pattern-a' }] }] });
    const queue = makeQueue();
    const svc = new DesignConflictDetector(db, queue);
    const r = await svc.detect('tenant-1', 'spec-1', ['pattern-a']);
    expect(r.isSuccess).toBe(true);
  });

  it('F31C-6: succeeds with no conflicts and stores scan', async () => {
    const db = makeDb({ searchResult: [] });
    const queue = makeQueue();
    const svc = new DesignConflictDetector(db, queue);
    const r = await svc.detect('tenant-1', 'spec-1', ['pattern-new']);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.specId).toBe('spec-1');
    expect(r.data!.conflicts).toHaveLength(0);
    expect(db._store['flow31-conflict-scans']).toHaveLength(1);
  });

  it('F31C-7: emits design.conflict.clear event on success (DNA-8)', async () => {
    const db = makeDb({ searchResult: [] });
    const queue = makeQueue();
    const svc = new DesignConflictDetector(db, queue);
    await svc.detect('tenant-1', 'spec-1', ['pattern-new']);
    expect(queue._events[0].event).toBe('design.conflict.clear');
    // DNA-8: store happened first
    expect(db._store['flow31-conflict-scans']).toHaveLength(1);
  });

  it('F31C-8: returns failure when storeDocument fails', async () => {
    const db = makeDb({ searchResult: [], storeFail: true });
    const svc = new DesignConflictDetector(db, makeQueue());
    const r = await svc.detect('tenant-1', 'spec-1', ['pattern-new']);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('DB_ERROR');
  });
});

// ─── T495: ComponentCompatibilityChecker ──────────────────────────────────

describe('F31C-9..F31C-17 — ComponentCompatibilityChecker (T495)', () => {
  it('F31C-9: returns UNSCOPED_QUERY when tenantId is empty', async () => {
    const svc = new ComponentCompatibilityChecker(makeDb(), makeQueue());
    const r = await svc.check('', 'spec-1', [{ name: 'Button', requiredProps: ['label'] }]);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F31C-10: returns MISSING_SPEC_ID when specId is empty', async () => {
    const svc = new ComponentCompatibilityChecker(makeDb(), makeQueue());
    const r = await svc.check('tenant-1', '', [{ name: 'Button', requiredProps: ['label'] }]);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_SPEC_ID');
  });

  it('F31C-11: returns MISSING_COMPONENTS when components array is empty', async () => {
    const svc = new ComponentCompatibilityChecker(makeDb(), makeQueue());
    const r = await svc.check('tenant-1', 'spec-1', []);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_COMPONENTS');
  });

  it('F31C-12: returns failure when searchDocuments fails', async () => {
    const svc = new ComponentCompatibilityChecker(makeDbFailing(), makeQueue());
    const r = await svc.check('tenant-1', 'spec-1', [{ name: 'Button', requiredProps: ['label'] }]);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('DB_ERROR');
  });

  it('F31C-13: returns COMPONENT_INCOMPATIBLE when required prop is missing', async () => {
    const db = makeDb({
      searchResult: [{ components: [{ name: 'Button', requiredProps: ['label', 'onClick'] }] }],
    });
    const svc = new ComponentCompatibilityChecker(db, makeQueue());
    const r = await svc.check('tenant-1', 'spec-1', [{ name: 'Button', requiredProps: ['label'] }]);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('COMPONENT_INCOMPATIBLE');
  });

  it('F31C-14: succeeds when component provides all required props', async () => {
    const db = makeDb({
      searchResult: [{ components: [{ name: 'Button', requiredProps: ['label'] }] }],
    });
    const queue = makeQueue();
    const svc = new ComponentCompatibilityChecker(db, queue);
    const r = await svc.check('tenant-1', 'spec-1', [
      { name: 'Button', requiredProps: ['label', 'onClick'] },
    ]);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.compatibleCount).toBe(1);
  });

  it('F31C-15: succeeds when component not in catalog (no conflict)', async () => {
    const db = makeDb({ searchResult: [] });
    const queue = makeQueue();
    const svc = new ComponentCompatibilityChecker(db, queue);
    const r = await svc.check('tenant-1', 'spec-1', [{ name: 'NewWidget', requiredProps: [] }]);
    expect(r.isSuccess).toBe(true);
  });

  it('F31C-16: emits design.components.compatible event on success (DNA-8)', async () => {
    const db = makeDb({ searchResult: [] });
    const queue = makeQueue();
    const svc = new ComponentCompatibilityChecker(db, queue);
    await svc.check('tenant-1', 'spec-1', [{ name: 'Button', requiredProps: ['label'] }]);
    expect(queue._events[0].event).toBe('design.components.compatible');
    expect(db._store['flow31-compat-checks']).toHaveLength(1);
  });

  it('F31C-17: returns failure when storeDocument fails', async () => {
    const db = makeDb({ searchResult: [], storeFail: true });
    const svc = new ComponentCompatibilityChecker(db, makeQueue());
    const r = await svc.check('tenant-1', 'spec-1', [{ name: 'Button', requiredProps: [] }]);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('DB_ERROR');
  });
});

// ─── T496: DesignRuleValidator ─────────────────────────────────────────────

describe('F31C-18..F31C-27 — DesignRuleValidator (T496)', () => {
  it('F31C-18: returns UNSCOPED_QUERY when tenantId is empty', async () => {
    const svc = new DesignRuleValidator(makeDb(), makeQueue(), makeFreedom());
    const r = await svc.validate('', 'spec-1', {});
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F31C-19: returns MISSING_SPEC_ID when specId is empty', async () => {
    const svc = new DesignRuleValidator(makeDb(), makeQueue(), makeFreedom());
    const r = await svc.validate('tenant-1', '', {});
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_SPEC_ID');
  });

  it('F31C-20: uses DEFAULT_RULES when FREEDOM config not found', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const svc = new DesignRuleValidator(db, queue, makeFreedom());
    const r = await svc.validate('tenant-1', 'spec-1', { violationFlags: [] });
    expect(r.isSuccess).toBe(true);
    expect(r.data!.passed).toBe(true);
  });

  it('F31C-21: detects WCAG_AA_FAIL violation', async () => {
    const svc = new DesignRuleValidator(
      makeDb(),
      makeQueue(),
      makeFreedom({ require_wcag_aa: true }),
    );
    const r = await svc.validate('tenant-1', 'spec-1', { violationFlags: ['WCAG_AA_FAIL'] });
    expect(r.isSuccess).toBe(true);
    expect(r.data!.passed).toBe(false);
    expect(r.data!.violations.some((v) => v.includes('WCAG'))).toBe(true);
  });

  it('F31C-22: detects CONTRAST_FAIL violation', async () => {
    const svc = new DesignRuleValidator(makeDb(), makeQueue(), makeFreedom());
    const r = await svc.validate('tenant-1', 'spec-1', { violationFlags: ['CONTRAST_FAIL'] });
    expect(r.isSuccess).toBe(true);
    expect(r.data!.passed).toBe(false);
    expect(r.data!.violations.some((v) => v.includes('contrast'))).toBe(true);
  });

  it('F31C-23: detects SPACING_INVALID violation', async () => {
    const svc = new DesignRuleValidator(makeDb(), makeQueue(), makeFreedom());
    const r = await svc.validate('tenant-1', 'spec-1', { violationFlags: ['SPACING_INVALID'] });
    expect(r.isSuccess).toBe(true);
    expect(r.data!.passed).toBe(false);
    expect(r.data!.violations.some((v) => v.includes('Spacing'))).toBe(true);
  });

  it('F31C-24: emits design.rules.validated when passed', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const svc = new DesignRuleValidator(db, queue, makeFreedom());
    await svc.validate('tenant-1', 'spec-1', { violationFlags: [] });
    expect(queue._events[0].event).toBe('design.rules.validated');
  });

  it('F31C-25: emits design.rules.violated when failed', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const svc = new DesignRuleValidator(db, queue, makeFreedom());
    await svc.validate('tenant-1', 'spec-1', { violationFlags: ['WCAG_AA_FAIL'] });
    expect(queue._events[0].event).toBe('design.rules.violated');
  });

  it('F31C-26: stores validation before enqueue (DNA-8)', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const svc = new DesignRuleValidator(db, queue, makeFreedom());
    await svc.validate('tenant-1', 'spec-1', { violationFlags: [] });
    expect(db._store['flow31-rule-validations']).toHaveLength(1);
    expect(queue._events).toHaveLength(1);
  });

  it('F31C-27: returns failure when storeDocument fails', async () => {
    const db = makeDb({ storeFail: true });
    const svc = new DesignRuleValidator(db, makeQueue(), makeFreedom());
    const r = await svc.validate('tenant-1', 'spec-1', { violationFlags: [] });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('DB_ERROR');
  });
});

// ─── T497: TokenConflictScanner ───────────────────────────────────────────

describe('F31C-28..F31C-33 — TokenConflictScanner (T497)', () => {
  it('F31C-28: returns UNSCOPED_QUERY when tenantId is empty', async () => {
    const svc = new TokenConflictScanner(makeDb(), makeQueue());
    const r = await svc.scan('', 'spec-1', ['color-primary']);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F31C-29: returns MISSING_SPEC_ID when specId is empty', async () => {
    const svc = new TokenConflictScanner(makeDb(), makeQueue());
    const r = await svc.scan('tenant-1', '', ['color-primary']);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_SPEC_ID');
  });

  it('F31C-30: returns failure when searchDocuments fails', async () => {
    const svc = new TokenConflictScanner(makeDbFailing(), makeQueue());
    const r = await svc.scan('tenant-1', 'spec-1', ['color-primary']);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('DB_ERROR');
  });

  it('F31C-31: returns TOKEN_CONFLICT_DETECTED when token names conflict', async () => {
    const db = makeDb({ searchResult: [{ tokenNames: ['color-primary', 'spacing-4'] }] });
    const svc = new TokenConflictScanner(db, makeQueue());
    const r = await svc.scan('tenant-1', 'spec-1', ['color-primary']);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('TOKEN_CONFLICT_DETECTED');
  });

  it('F31C-32: succeeds with no conflicts and stores scan (DNA-8)', async () => {
    const db = makeDb({ searchResult: [{ tokenNames: ['color-secondary'] }] });
    const queue = makeQueue();
    const svc = new TokenConflictScanner(db, queue);
    const r = await svc.scan('tenant-1', 'spec-1', ['color-primary', 'spacing-8']);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.scannedCount).toBe(2);
    expect(db._store['flow31-token-conflict-scans']).toHaveLength(1);
    expect(queue._events[0].event).toBe('design.tokens.clear');
  });

  it('F31C-33: returns failure when storeDocument fails', async () => {
    const db = makeDb({ searchResult: [], storeFail: true });
    const svc = new TokenConflictScanner(db, makeQueue());
    const r = await svc.scan('tenant-1', 'spec-1', ['color-primary']);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('DB_ERROR');
  });
});

// ─── T498: DesignDebtAnalyzer ─────────────────────────────────────────────

describe('F31C-34..F31C-40 — DesignDebtAnalyzer (T498)', () => {
  const baseMetrics = {
    deprecatedPatterns: 0,
    orphanedTokens: 0,
    accessibilityViolations: 0,
    inconsistencyCount: 0,
  };

  it('F31C-34: returns UNSCOPED_QUERY when tenantId is empty', async () => {
    const svc = new DesignDebtAnalyzer(makeDb(), makeQueue(), makeFreedom());
    const r = await svc.analyze('', 'spec-1', baseMetrics);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F31C-35: returns MISSING_SPEC_ID when specId is empty', async () => {
    const svc = new DesignDebtAnalyzer(makeDb(), makeQueue(), makeFreedom());
    const r = await svc.analyze('tenant-1', '', baseMetrics);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_SPEC_ID');
  });

  it('F31C-36: computes debtScore 0.0 for zero metrics', async () => {
    const svc = new DesignDebtAnalyzer(makeDb(), makeQueue(), makeFreedom());
    const r = await svc.analyze('tenant-1', 'spec-1', baseMetrics);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.debtScore).toBe(0.0);
  });

  it('F31C-37: computes debtScore correctly from weighted metrics', async () => {
    const svc = new DesignDebtAnalyzer(makeDb(), makeQueue(), makeFreedom());
    // 1*10 + 2*5 + 1*20 + 5*3 = 10 + 10 + 20 + 15 = 55 → 0.55
    const r = await svc.analyze('tenant-1', 'spec-1', {
      deprecatedPatterns: 1,
      orphanedTokens: 2,
      accessibilityViolations: 1,
      inconsistencyCount: 5,
    });
    expect(r.isSuccess).toBe(true);
    expect(r.data!.debtScore).toBeCloseTo(0.55);
  });

  it('F31C-38: caps debtScore at 1.0 for large metrics', async () => {
    const svc = new DesignDebtAnalyzer(makeDb(), makeQueue(), makeFreedom());
    const r = await svc.analyze('tenant-1', 'spec-1', {
      deprecatedPatterns: 100,
      orphanedTokens: 100,
      accessibilityViolations: 100,
      inconsistencyCount: 100,
    });
    expect(r.isSuccess).toBe(true);
    expect(r.data!.debtScore).toBe(1.0);
  });

  it('F31C-39: uses FREEDOM thresholds to populate issues list', async () => {
    const svc = new DesignDebtAnalyzer(
      makeDb(),
      makeQueue(),
      makeFreedom({
        maxDeprecatedPatterns: 2,
        maxOrphanedTokens: 3,
        maxAccessibilityViolations: 0,
      }),
    );
    const r = await svc.analyze('tenant-1', 'spec-1', {
      deprecatedPatterns: 5,
      orphanedTokens: 6,
      accessibilityViolations: 1,
      inconsistencyCount: 0,
    });
    expect(r.isSuccess).toBe(true);
    expect(r.data!.issues.length).toBeGreaterThanOrEqual(3);
  });

  it('F31C-40: stores report before enqueue (DNA-8)', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const svc = new DesignDebtAnalyzer(db, queue, makeFreedom());
    await svc.analyze('tenant-1', 'spec-1', baseMetrics);
    expect(db._store['flow31-debt-reports']).toHaveLength(1);
    expect(queue._events[0].event).toBe('design.debt.analyzed');
  });
});
