/**
 * FLOW-31 Phase D — Quality Gates Tests (T499–T503)
 * F31D-1 through F31D-40
 */

import { DesignQualityGate } from '../../src/engine/flows/design-system-governance/design-quality-gate.service';
import { ComponentSchemaGate } from '../../src/engine/flows/design-system-governance/component-schema-gate.service';
import { TokenConsistencyGate } from '../../src/engine/flows/design-system-governance/token-consistency-gate.service';
import { DesignComplexityAnalyzer } from '../../src/engine/flows/design-system-governance/design-complexity-analyzer.service';
import { ArchitectureScorer } from '../../src/engine/flows/design-system-governance/architecture-scorer.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ─── In-memory fakes ───────────────────────────────────────────────────────

function makeDb(opts?: { storeFail?: boolean; searchResult?: Record<string, unknown>[] }) {
  const store: Record<string, unknown[]> = {};
  return {
    _store: store,
    async storeDocument(
      index: string,
      doc: Record<string, unknown>,
      id?: string,
    ): Promise<DataProcessResult<Record<string, unknown>>> {
      if (opts?.storeFail)
        return DataProcessResult.failure<Record<string, unknown>>('DB_ERROR', 'store failed');
      if (!store[index]) store[index] = [];
      store[index].push({ ...doc, _id: id });
      return DataProcessResult.success<Record<string, unknown>>(doc);
    },
    async searchDocuments(
      _index: string,
      _filter: Record<string, unknown>,
    ): Promise<DataProcessResult<Record<string, unknown>[]>> {
      return DataProcessResult.success<Record<string, unknown>[]>(opts?.searchResult ?? []);
    },
  };
}

function makeDbSearchFail() {
  return {
    _store: {} as Record<string, unknown[]>,
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
    async enqueue(
      event: string,
      data: Record<string, unknown>,
    ): Promise<DataProcessResult<string>> {
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

// ─── T499: DesignQualityGate ───────────────────────────────────────────────

describe('F31D-1..F31D-8 — DesignQualityGate (T499)', () => {
  it('F31D-1: returns UNSCOPED_QUERY when tenantId is empty', async () => {
    const svc = new DesignQualityGate(makeDb(), makeQueue(), makeFreedom());
    const r = await svc.evaluate('', 'spec-1', { qualityScore: 0.8, debtScore: 0.2 });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F31D-2: returns MISSING_SPEC_ID when specId is empty', async () => {
    const svc = new DesignQualityGate(makeDb(), makeQueue(), makeFreedom());
    const r = await svc.evaluate('tenant-1', '', { qualityScore: 0.8, debtScore: 0.2 });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_SPEC_ID');
  });

  it('F31D-3: returns DESIGN_QUALITY_GATE_FAILED when quality score too low', async () => {
    const svc = new DesignQualityGate(makeDb(), makeQueue(), makeFreedom());
    const r = await svc.evaluate('tenant-1', 'spec-1', { qualityScore: 0.5, debtScore: 0.1 });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('DESIGN_QUALITY_GATE_FAILED');
  });

  it('F31D-4: returns DESIGN_QUALITY_GATE_FAILED when debt score too high', async () => {
    const svc = new DesignQualityGate(makeDb(), makeQueue(), makeFreedom());
    const r = await svc.evaluate('tenant-1', 'spec-1', { qualityScore: 0.9, debtScore: 0.5 });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('DESIGN_QUALITY_GATE_FAILED');
  });

  it('F31D-5: uses FREEDOM config thresholds', async () => {
    const svc = new DesignQualityGate(
      makeDb(),
      makeQueue(),
      makeFreedom({
        minQualityScore: 0.9,
        maxDebtScore: 0.1,
      }),
    );
    // Would pass default (0.7/0.3) but fail stricter FREEDOM thresholds
    const r = await svc.evaluate('tenant-1', 'spec-1', { qualityScore: 0.8, debtScore: 0.2 });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('DESIGN_QUALITY_GATE_FAILED');
  });

  it('F31D-6: succeeds when scores meet thresholds', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const svc = new DesignQualityGate(db, queue, makeFreedom());
    const r = await svc.evaluate('tenant-1', 'spec-1', { qualityScore: 0.8, debtScore: 0.2 });
    expect(r.isSuccess).toBe(true);
    expect(r.data!.passed).toBe(true);
    expect(db._store['flow31-quality-gates']).toHaveLength(1);
    expect(queue._events[0].event).toBe('design.quality.passed');
  });

  it('F31D-7: uses DEFAULT_RULES when FREEDOM config not found', async () => {
    const db = makeDb();
    const svc = new DesignQualityGate(db, makeQueue(), makeFreedom());
    const r = await svc.evaluate('tenant-1', 'spec-1', { qualityScore: 0.7, debtScore: 0.3 });
    expect(r.isSuccess).toBe(true);
  });

  it('F31D-8: returns failure when storeDocument fails', async () => {
    const svc = new DesignQualityGate(makeDb({ storeFail: true }), makeQueue(), makeFreedom());
    const r = await svc.evaluate('tenant-1', 'spec-1', { qualityScore: 0.8, debtScore: 0.2 });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('DB_ERROR');
  });
});

// ─── T500: ComponentSchemaGate ─────────────────────────────────────────────

describe('F31D-9..F31D-16 — ComponentSchemaGate (T500)', () => {
  it('F31D-9: returns UNSCOPED_QUERY when tenantId is empty', async () => {
    const svc = new ComponentSchemaGate(makeDb(), makeQueue());
    const r = await svc.validate('', 'spec-1', [{ name: 'Button', requiredProps: ['label'] }]);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F31D-10: returns MISSING_SPEC_ID when specId is empty', async () => {
    const svc = new ComponentSchemaGate(makeDb(), makeQueue());
    const r = await svc.validate('tenant-1', '', [{ name: 'Button', requiredProps: ['label'] }]);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_SPEC_ID');
  });

  it('F31D-11: returns MISSING_COMPONENTS when components array is empty', async () => {
    const svc = new ComponentSchemaGate(makeDb(), makeQueue());
    const r = await svc.validate('tenant-1', 'spec-1', []);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_COMPONENTS');
  });

  it('F31D-12: returns COMPONENT_SCHEMA_INVALID when component missing name', async () => {
    const svc = new ComponentSchemaGate(makeDb(), makeQueue());
    const r = await svc.validate('tenant-1', 'spec-1', [{ name: '', requiredProps: ['label'] }]);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('COMPONENT_SCHEMA_INVALID');
  });

  it('F31D-13: returns COMPONENT_SCHEMA_INVALID when prop entry is invalid', async () => {
    const svc = new ComponentSchemaGate(makeDb(), makeQueue());
    const r = await svc.validate('tenant-1', 'spec-1', [
      { name: 'Button', requiredProps: ['' as string] },
    ]);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('COMPONENT_SCHEMA_INVALID');
  });

  it('F31D-14: succeeds with valid components', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const svc = new ComponentSchemaGate(db, queue);
    const r = await svc.validate('tenant-1', 'spec-1', [
      {
        name: 'Button',
        requiredProps: ['label', 'onClick'],
        slots: ['default'],
        events: ['click'],
      },
      { name: 'Card', requiredProps: ['title'] },
    ]);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.validatedCount).toBe(2);
    expect(db._store['flow31-schema-gates']).toHaveLength(1);
    expect(queue._events[0].event).toBe('design.schema.valid');
  });

  it('F31D-15: DNA-8 store before enqueue', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const svc = new ComponentSchemaGate(db, queue);
    await svc.validate('tenant-1', 'spec-1', [{ name: 'Button', requiredProps: [] }]);
    expect(db._store['flow31-schema-gates']).toHaveLength(1);
    expect(queue._events).toHaveLength(1);
  });

  it('F31D-16: returns failure when storeDocument fails', async () => {
    const svc = new ComponentSchemaGate(makeDb({ storeFail: true }), makeQueue());
    const r = await svc.validate('tenant-1', 'spec-1', [{ name: 'Button', requiredProps: [] }]);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('DB_ERROR');
  });
});

// ─── T501: TokenConsistencyGate ────────────────────────────────────────────

describe('F31D-17..F31D-24 — TokenConsistencyGate (T501)', () => {
  it('F31D-17: returns UNSCOPED_QUERY when tenantId is empty', async () => {
    const svc = new TokenConsistencyGate(makeDb(), makeQueue());
    const r = await svc.check('', 'spec-1', ['color-primary']);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F31D-18: returns MISSING_SPEC_ID when specId is empty', async () => {
    const svc = new TokenConsistencyGate(makeDb(), makeQueue());
    const r = await svc.check('tenant-1', '', ['color-primary']);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_SPEC_ID');
  });

  it('F31D-19: returns failure when searchDocuments fails', async () => {
    const svc = new TokenConsistencyGate(makeDbSearchFail(), makeQueue());
    const r = await svc.check('tenant-1', 'spec-1', ['color-primary']);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('DB_ERROR');
  });

  it('F31D-20: returns TOKEN_REFERENCE_BROKEN when token not in library', async () => {
    const db = makeDb({ searchResult: [{ tokenNames: ['color-secondary'] }] });
    const svc = new TokenConsistencyGate(db, makeQueue());
    const r = await svc.check('tenant-1', 'spec-1', ['color-primary']);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('TOKEN_REFERENCE_BROKEN');
  });

  it('F31D-21: succeeds when all token refs found in library', async () => {
    const db = makeDb({ searchResult: [{ tokenNames: ['color-primary', 'spacing-4'] }] });
    const queue = makeQueue();
    const svc = new TokenConsistencyGate(db, queue);
    const r = await svc.check('tenant-1', 'spec-1', ['color-primary', 'spacing-4']);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.checkedCount).toBe(2);
    expect(queue._events[0].event).toBe('design.tokens.consistent');
  });

  it('F31D-22: succeeds with empty tokenRefs (no references to validate)', async () => {
    const db = makeDb({ searchResult: [] });
    const queue = makeQueue();
    const svc = new TokenConsistencyGate(db, queue);
    const r = await svc.check('tenant-1', 'spec-1', []);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.checkedCount).toBe(0);
  });

  it('F31D-23: DNA-8 store before enqueue', async () => {
    const db = makeDb({ searchResult: [{ tokenNames: ['color-primary'] }] });
    const queue = makeQueue();
    const svc = new TokenConsistencyGate(db, queue);
    await svc.check('tenant-1', 'spec-1', ['color-primary']);
    expect(db._store['flow31-token-consistency-gates']).toHaveLength(1);
    expect(queue._events).toHaveLength(1);
  });

  it('F31D-24: returns failure when storeDocument fails', async () => {
    const db = makeDb({ searchResult: [{ tokenNames: ['color-primary'] }], storeFail: true });
    const svc = new TokenConsistencyGate(db, makeQueue());
    const r = await svc.check('tenant-1', 'spec-1', ['color-primary']);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('DB_ERROR');
  });
});

// ─── T502: DesignComplexityAnalyzer ───────────────────────────────────────

describe('F31D-25..F31D-32 — DesignComplexityAnalyzer (T502)', () => {
  const baseMetrics = {
    componentTreeDepth: 3,
    totalPropCount: 15,
    uniqueTokensUsed: 10,
    patternReuseRatio: 0.5,
  };

  it('F31D-25: returns UNSCOPED_QUERY when tenantId is empty', async () => {
    const svc = new DesignComplexityAnalyzer(makeDb(), makeQueue());
    const r = await svc.analyze('', 'spec-1', baseMetrics);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F31D-26: returns MISSING_SPEC_ID when specId is empty', async () => {
    const svc = new DesignComplexityAnalyzer(makeDb(), makeQueue());
    const r = await svc.analyze('tenant-1', '', baseMetrics);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_SPEC_ID');
  });

  it('F31D-27: produces a complexity score 0.0–1.0', async () => {
    const svc = new DesignComplexityAnalyzer(makeDb(), makeQueue());
    const r = await svc.analyze('tenant-1', 'spec-1', baseMetrics);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.complexityScore).toBeGreaterThanOrEqual(0.0);
    expect(r.data!.complexityScore).toBeLessThanOrEqual(1.0);
  });

  it('F31D-28: complexity score is 0 for minimal metrics with full reuse', async () => {
    const svc = new DesignComplexityAnalyzer(makeDb(), makeQueue());
    const r = await svc.analyze('tenant-1', 'spec-1', {
      componentTreeDepth: 0,
      totalPropCount: 0,
      uniqueTokensUsed: 0,
      patternReuseRatio: 1.0,
    });
    expect(r.isSuccess).toBe(true);
    expect(r.data!.complexityScore).toBe(0.0);
  });

  it('F31D-29: complexity score approaches 1 for extreme metrics', async () => {
    const svc = new DesignComplexityAnalyzer(makeDb(), makeQueue());
    const r = await svc.analyze('tenant-1', 'spec-1', {
      componentTreeDepth: 100,
      totalPropCount: 500,
      uniqueTokensUsed: 300,
      patternReuseRatio: 0.0,
    });
    expect(r.isSuccess).toBe(true);
    expect(r.data!.complexityScore).toBeGreaterThan(0.5);
  });

  it('F31D-30: higher reuse ratio reduces complexity score', async () => {
    const svc = new DesignComplexityAnalyzer(makeDb(), makeQueue());
    const lowReuse = await svc.analyze('tenant-1', 'spec-1', {
      ...baseMetrics,
      patternReuseRatio: 0.0,
    });
    const highReuse = await svc.analyze('tenant-1', 'spec-2', {
      ...baseMetrics,
      patternReuseRatio: 1.0,
    });
    expect(lowReuse.data!.complexityScore).toBeGreaterThan(highReuse.data!.complexityScore);
  });

  it('F31D-31: DNA-8 store before enqueue', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const svc = new DesignComplexityAnalyzer(db, queue);
    await svc.analyze('tenant-1', 'spec-1', baseMetrics);
    expect(db._store['flow31-complexity-analyses']).toHaveLength(1);
    expect(queue._events[0].event).toBe('design.complexity.scored');
  });

  it('F31D-32: returns failure when storeDocument fails', async () => {
    const svc = new DesignComplexityAnalyzer(makeDb({ storeFail: true }), makeQueue());
    const r = await svc.analyze('tenant-1', 'spec-1', baseMetrics);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('DB_ERROR');
  });
});

// ─── T503: ArchitectureScorer ──────────────────────────────────────────────

describe('F31D-33..F31D-40 — ArchitectureScorer (T503)', () => {
  const strongDimensions = {
    consistencyScore: 0.9,
    reusabilityScore: 0.85,
    accessibilityScore: 0.88,
    patternAdherence: 0.92,
  };

  it('F31D-33: returns UNSCOPED_QUERY when tenantId is empty', async () => {
    const svc = new ArchitectureScorer(makeDb(), makeQueue());
    const r = await svc.score('', 'spec-1', strongDimensions);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F31D-34: returns MISSING_SPEC_ID when specId is empty', async () => {
    const svc = new ArchitectureScorer(makeDb(), makeQueue());
    const r = await svc.score('tenant-1', '', strongDimensions);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_SPEC_ID');
  });

  it('F31D-35: classifies STRONG when score >= 0.8', async () => {
    const svc = new ArchitectureScorer(makeDb(), makeQueue());
    const r = await svc.score('tenant-1', 'spec-1', strongDimensions);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.classification).toBe('STRONG');
    expect(r.data!.architectureScore).toBeGreaterThanOrEqual(0.8);
  });

  it('F31D-36: classifies ADEQUATE when score >= 0.5 and < 0.8', async () => {
    const svc = new ArchitectureScorer(makeDb(), makeQueue());
    const r = await svc.score('tenant-1', 'spec-1', {
      consistencyScore: 0.6,
      reusabilityScore: 0.6,
      accessibilityScore: 0.6,
      patternAdherence: 0.6,
    });
    expect(r.isSuccess).toBe(true);
    expect(r.data!.classification).toBe('ADEQUATE');
  });

  it('F31D-37: classifies WEAK when score < 0.5', async () => {
    const svc = new ArchitectureScorer(makeDb(), makeQueue());
    const r = await svc.score('tenant-1', 'spec-1', {
      consistencyScore: 0.2,
      reusabilityScore: 0.3,
      accessibilityScore: 0.2,
      patternAdherence: 0.1,
    });
    expect(r.isSuccess).toBe(true);
    expect(r.data!.classification).toBe('WEAK');
  });

  it('F31D-38: architecture score is average of 4 dimensions', async () => {
    const svc = new ArchitectureScorer(makeDb(), makeQueue());
    const r = await svc.score('tenant-1', 'spec-1', {
      consistencyScore: 0.8,
      reusabilityScore: 0.6,
      accessibilityScore: 1.0,
      patternAdherence: 0.6,
    });
    expect(r.isSuccess).toBe(true);
    expect(r.data!.architectureScore).toBeCloseTo(0.75);
  });

  it('F31D-39: DNA-8 store before enqueue', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const svc = new ArchitectureScorer(db, queue);
    await svc.score('tenant-1', 'spec-1', strongDimensions);
    expect(db._store['flow31-architecture-scores']).toHaveLength(1);
    expect(queue._events[0].event).toBe('design.architecture.scored');
  });

  it('F31D-40: returns failure when storeDocument fails', async () => {
    const svc = new ArchitectureScorer(makeDb({ storeFail: true }), makeQueue());
    const r = await svc.score('tenant-1', 'spec-1', strongDimensions);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('DB_ERROR');
  });
});
