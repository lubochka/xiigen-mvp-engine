/**
 * FLOW-31 Phase E — Build/Governance Tests (T504–T509)
 * F31E-1 through F31E-44
 */

import { DesignDecisionLogger } from '../../src/engine/flows/design-system-governance/design-decision-logger.service';
import { TokenLibraryUpdater } from '../../src/engine/flows/design-system-governance/token-library-updater.service';
import { ComponentCatalogUpdater } from '../../src/engine/flows/design-system-governance/component-catalog-updater.service';
import { DesignVersionTracker } from '../../src/engine/flows/design-system-governance/design-version-tracker.service';
import { DesignChangeEmitter } from '../../src/engine/flows/design-system-governance/design-change-emitter.service';
import { DesignHealthScorer } from '../../src/engine/flows/design-system-governance/design-health-scorer.service';
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

// ─── T504: DesignDecisionLogger ────────────────────────────────────────────

describe('F31E-1..F31E-7 — DesignDecisionLogger (T504)', () => {
  it('F31E-1: returns UNSCOPED_QUERY when tenantId is empty', async () => {
    const svc = new DesignDecisionLogger(makeDb(), makeQueue());
    const r = await svc.log('', 'spec-1', { rationale: 'Use atomic tokens' });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F31E-2: returns MISSING_SPEC_ID when specId is empty', async () => {
    const svc = new DesignDecisionLogger(makeDb(), makeQueue());
    const r = await svc.log('tenant-1', '', { rationale: 'Use atomic tokens' });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_SPEC_ID');
  });

  it('F31E-3: returns MISSING_RATIONALE when rationale is empty', async () => {
    const svc = new DesignDecisionLogger(makeDb(), makeQueue());
    const r = await svc.log('tenant-1', 'spec-1', { rationale: '' });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_RATIONALE');
  });

  it('F31E-4: logs decision with full payload', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const svc = new DesignDecisionLogger(db, queue);
    const r = await svc.log('tenant-1', 'spec-1', {
      rationale: 'Use atomic design tokens',
      tradeOffs: ['more files', 'better reuse'],
      rejectedAlternatives: ['monolithic theme'],
      approvedBy: 'design-lead',
    });
    expect(r.isSuccess).toBe(true);
    expect(r.data!.specId).toBe('spec-1');
    expect(db._store['flow31-design-decisions']).toHaveLength(1);
    expect(queue._events[0].event).toBe('design.decision.logged');
  });

  it('F31E-5: INSERT-ONLY — each call creates a new record', async () => {
    const db = makeDb();
    const svc = new DesignDecisionLogger(db, makeQueue());
    await svc.log('tenant-1', 'spec-1', { rationale: 'First decision' });
    await svc.log('tenant-1', 'spec-1', { rationale: 'Second decision' });
    expect(db._store['flow31-design-decisions']).toHaveLength(2);
  });

  it('F31E-6: DNA-8 store before enqueue', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const svc = new DesignDecisionLogger(db, queue);
    await svc.log('tenant-1', 'spec-1', { rationale: 'Use atomic tokens' });
    expect(db._store['flow31-design-decisions']).toHaveLength(1);
    expect(queue._events).toHaveLength(1);
  });

  it('F31E-7: returns failure when storeDocument fails', async () => {
    const svc = new DesignDecisionLogger(makeDb({ storeFail: true }), makeQueue());
    const r = await svc.log('tenant-1', 'spec-1', { rationale: 'Use atomic tokens' });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('DB_ERROR');
  });
});

// ─── T505: TokenLibraryUpdater ─────────────────────────────────────────────

describe('F31E-8..F31E-14 — TokenLibraryUpdater (T505)', () => {
  it('F31E-8: returns UNSCOPED_QUERY when tenantId is empty', async () => {
    const svc = new TokenLibraryUpdater(makeDb(), makeQueue());
    const r = await svc.update('', 'spec-1', ['color-primary']);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F31E-9: returns MISSING_SPEC_ID when specId is empty', async () => {
    const svc = new TokenLibraryUpdater(makeDb(), makeQueue());
    const r = await svc.update('tenant-1', '', ['color-primary']);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_SPEC_ID');
  });

  it('F31E-10: returns failure when searchDocuments fails', async () => {
    const svc = new TokenLibraryUpdater(makeDbSearchFail(), makeQueue());
    const r = await svc.update('tenant-1', 'spec-1', ['color-primary']);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('DB_ERROR');
  });

  it('F31E-11: idempotent — returns existing when specId already updated', async () => {
    const db = makeDb({
      searchResult: [
        { updateId: 'existing-id', tokenCount: 5, updatedAt: '2024-01-01T00:00:00.000Z' },
      ],
    });
    const queue = makeQueue();
    const svc = new TokenLibraryUpdater(db, queue);
    const r = await svc.update('tenant-1', 'spec-1', ['color-primary']);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.updateId).toBe('existing-id');
    expect(queue._events).toHaveLength(0); // no new event emitted
  });

  it('F31E-12: stores and emits on first update', async () => {
    const db = makeDb({ searchResult: [] });
    const queue = makeQueue();
    const svc = new TokenLibraryUpdater(db, queue);
    const r = await svc.update('tenant-1', 'spec-1', ['color-primary', 'spacing-4']);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.tokenCount).toBe(2);
    expect(db._store['flow31-token-library']).toHaveLength(1);
    expect(queue._events[0].event).toBe('design.tokens.library.updated');
  });

  it('F31E-13: DNA-8 store before enqueue', async () => {
    const db = makeDb({ searchResult: [] });
    const queue = makeQueue();
    const svc = new TokenLibraryUpdater(db, queue);
    await svc.update('tenant-1', 'spec-1', ['color-primary']);
    expect(db._store['flow31-token-library']).toHaveLength(1);
    expect(queue._events).toHaveLength(1);
  });

  it('F31E-14: returns failure when storeDocument fails', async () => {
    const db = makeDb({ searchResult: [], storeFail: true });
    const svc = new TokenLibraryUpdater(db, makeQueue());
    const r = await svc.update('tenant-1', 'spec-1', ['color-primary']);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('DB_ERROR');
  });
});

// ─── T506: ComponentCatalogUpdater ────────────────────────────────────────

describe('F31E-15..F31E-22 — ComponentCatalogUpdater (T506)', () => {
  it('F31E-15: returns UNSCOPED_QUERY when tenantId is empty', async () => {
    const svc = new ComponentCatalogUpdater(makeDb(), makeQueue());
    const r = await svc.update('', 'spec-1', [{ name: 'Button', requiredProps: [] }]);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F31E-16: returns MISSING_SPEC_ID when specId is empty', async () => {
    const svc = new ComponentCatalogUpdater(makeDb(), makeQueue());
    const r = await svc.update('tenant-1', '', [{ name: 'Button', requiredProps: [] }]);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_SPEC_ID');
  });

  it('F31E-17: returns MISSING_COMPONENTS when array is empty', async () => {
    const svc = new ComponentCatalogUpdater(makeDb(), makeQueue());
    const r = await svc.update('tenant-1', 'spec-1', []);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_COMPONENTS');
  });

  it('F31E-18: returns failure when searchDocuments fails', async () => {
    const svc = new ComponentCatalogUpdater(makeDbSearchFail(), makeQueue());
    const r = await svc.update('tenant-1', 'spec-1', [{ name: 'Button', requiredProps: [] }]);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('DB_ERROR');
  });

  it('F31E-19: idempotent — returns existing when specId already updated', async () => {
    const db = makeDb({
      searchResult: [
        {
          catalogId: 'existing-catalog-id',
          componentCount: 3,
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ],
    });
    const queue = makeQueue();
    const svc = new ComponentCatalogUpdater(db, queue);
    const r = await svc.update('tenant-1', 'spec-1', [{ name: 'Button', requiredProps: [] }]);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.catalogId).toBe('existing-catalog-id');
    expect(queue._events).toHaveLength(0);
  });

  it('F31E-20: stores and emits on first update', async () => {
    const db = makeDb({ searchResult: [] });
    const queue = makeQueue();
    const svc = new ComponentCatalogUpdater(db, queue);
    const r = await svc.update('tenant-1', 'spec-1', [
      { name: 'Button', requiredProps: ['label'] },
      { name: 'Card', requiredProps: ['title'] },
    ]);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.componentCount).toBe(2);
    expect(db._store['flow31-component-catalog']).toHaveLength(1);
    expect(queue._events[0].event).toBe('design.catalog.updated');
  });

  it('F31E-21: DNA-8 store before enqueue', async () => {
    const db = makeDb({ searchResult: [] });
    const queue = makeQueue();
    const svc = new ComponentCatalogUpdater(db, queue);
    await svc.update('tenant-1', 'spec-1', [{ name: 'Button', requiredProps: [] }]);
    expect(db._store['flow31-component-catalog']).toHaveLength(1);
    expect(queue._events).toHaveLength(1);
  });

  it('F31E-22: returns failure when storeDocument fails', async () => {
    const db = makeDb({ searchResult: [], storeFail: true });
    const svc = new ComponentCatalogUpdater(db, makeQueue());
    const r = await svc.update('tenant-1', 'spec-1', [{ name: 'Button', requiredProps: [] }]);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('DB_ERROR');
  });
});

// ─── T507: DesignVersionTracker ────────────────────────────────────────────

describe('F31E-23..F31E-29 — DesignVersionTracker (T507)', () => {
  it('F31E-23: returns UNSCOPED_QUERY when tenantId is empty', async () => {
    const svc = new DesignVersionTracker(makeDb(), makeQueue());
    const r = await svc.track('', 'spec-1', { version: 'v1.0', changesetSummary: 'Initial' });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F31E-24: returns MISSING_SPEC_ID when specId is empty', async () => {
    const svc = new DesignVersionTracker(makeDb(), makeQueue());
    const r = await svc.track('tenant-1', '', { version: 'v1.0', changesetSummary: 'Initial' });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_SPEC_ID');
  });

  it('F31E-25: returns MISSING_VERSION when version is empty', async () => {
    const svc = new DesignVersionTracker(makeDb(), makeQueue());
    const r = await svc.track('tenant-1', 'spec-1', { version: '', changesetSummary: 'Initial' });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_VERSION');
  });

  it('F31E-26: returns MISSING_CHANGESET when changesetSummary is empty', async () => {
    const svc = new DesignVersionTracker(makeDb(), makeQueue());
    const r = await svc.track('tenant-1', 'spec-1', { version: 'v1.0', changesetSummary: '' });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_CHANGESET');
  });

  it('F31E-27: INSERT-ONLY — each call creates a new version record', async () => {
    const db = makeDb();
    const svc = new DesignVersionTracker(db, makeQueue());
    await svc.track('tenant-1', 'spec-1', { version: 'v1.0', changesetSummary: 'Initial' });
    await svc.track('tenant-1', 'spec-1', { version: 'v1.1', changesetSummary: 'Patch' });
    expect(db._store['flow31-design-versions']).toHaveLength(2);
  });

  it('F31E-28: DNA-8 store before enqueue, emits design.version.tracked', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const svc = new DesignVersionTracker(db, queue);
    await svc.track('tenant-1', 'spec-1', {
      version: 'v1.0',
      changesetSummary: 'Initial',
      author: 'designer-1',
    });
    expect(db._store['flow31-design-versions']).toHaveLength(1);
    expect(queue._events[0].event).toBe('design.version.tracked');
  });

  it('F31E-29: returns failure when storeDocument fails', async () => {
    const svc = new DesignVersionTracker(makeDb({ storeFail: true }), makeQueue());
    const r = await svc.track('tenant-1', 'spec-1', {
      version: 'v1.0',
      changesetSummary: 'Initial',
    });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('DB_ERROR');
  });
});

// ─── T508: DesignChangeEmitter ─────────────────────────────────────────────

describe('F31E-30..F31E-36 — DesignChangeEmitter (T508)', () => {
  it('F31E-30: returns UNSCOPED_QUERY when tenantId is empty', async () => {
    const svc = new DesignChangeEmitter(makeDb(), makeQueue());
    const r = await svc.emit('', 'spec-1', [
      { changeType: 'token_update', subject: 'color-primary', summary: 'Updated' },
    ]);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F31E-31: returns MISSING_SPEC_ID when specId is empty', async () => {
    const svc = new DesignChangeEmitter(makeDb(), makeQueue());
    const r = await svc.emit('tenant-1', '', [
      { changeType: 'token_update', subject: 'color-primary', summary: 'Updated' },
    ]);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_SPEC_ID');
  });

  it('F31E-32: returns MISSING_CHANGES when changes array is empty', async () => {
    const svc = new DesignChangeEmitter(makeDb(), makeQueue());
    const r = await svc.emit('tenant-1', 'spec-1', []);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_CHANGES');
  });

  it('F31E-33: emits for all change types', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const svc = new DesignChangeEmitter(db, queue);
    const r = await svc.emit('tenant-1', 'spec-1', [
      { changeType: 'token_update', subject: 'color-primary', summary: 'Updated to #FF0000' },
      { changeType: 'component_change', subject: 'Button', summary: 'Added variant prop' },
      { changeType: 'pattern_change', subject: 'CardGrid', summary: 'Added responsive layout' },
    ]);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.changeCount).toBe(3);
  });

  it('F31E-34: DNA-8 store before enqueue', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const svc = new DesignChangeEmitter(db, queue);
    await svc.emit('tenant-1', 'spec-1', [
      { changeType: 'token_update', subject: 'color-primary', summary: 'Updated' },
    ]);
    expect(db._store['flow31-change-events']).toHaveLength(1);
    expect(queue._events[0].event).toBe('design.change.emitted');
  });

  it('F31E-35: returns correct changeCount in data', async () => {
    const svc = new DesignChangeEmitter(makeDb(), makeQueue());
    const r = await svc.emit('tenant-1', 'spec-1', [
      { changeType: 'token_update', subject: 'a', summary: 'x' },
      { changeType: 'component_change', subject: 'b', summary: 'y' },
    ]);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.changeCount).toBe(2);
  });

  it('F31E-36: returns failure when storeDocument fails', async () => {
    const svc = new DesignChangeEmitter(makeDb({ storeFail: true }), makeQueue());
    const r = await svc.emit('tenant-1', 'spec-1', [
      { changeType: 'token_update', subject: 'a', summary: 'x' },
    ]);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('DB_ERROR');
  });
});

// ─── T509: DesignHealthScorer ──────────────────────────────────────────────

describe('F31E-37..F31E-44 — DesignHealthScorer (T509)', () => {
  const healthyMetrics = {
    errorRate: 0.05,
    tokenAdoptionRate: 0.9,
    componentReuseRate: 0.85,
    accessibilityComplianceRate: 0.95,
  };

  it('F31E-37: returns UNSCOPED_QUERY when tenantId is empty', async () => {
    const svc = new DesignHealthScorer(makeDb(), makeQueue());
    const r = await svc.score('', 'spec-1', healthyMetrics);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F31E-38: returns MISSING_SPEC_ID when specId is empty', async () => {
    const svc = new DesignHealthScorer(makeDb(), makeQueue());
    const r = await svc.score('tenant-1', '', healthyMetrics);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_SPEC_ID');
  });

  it('F31E-39: classifies HEALTHY when health score >= 0.8', async () => {
    const svc = new DesignHealthScorer(makeDb(), makeQueue());
    const r = await svc.score('tenant-1', 'spec-1', healthyMetrics);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.classification).toBe('HEALTHY');
  });

  it('F31E-40: classifies DEGRADED when health score >= 0.5 and < 0.8', async () => {
    const svc = new DesignHealthScorer(makeDb(), makeQueue());
    // (0.7+0.7+0.7)/3 - 0.1 = 0.6 → DEGRADED
    const r = await svc.score('tenant-1', 'spec-1', {
      errorRate: 0.1,
      tokenAdoptionRate: 0.7,
      componentReuseRate: 0.7,
      accessibilityComplianceRate: 0.7,
    });
    expect(r.isSuccess).toBe(true);
    expect(r.data!.classification).toBe('DEGRADED');
  });

  it('F31E-41: classifies UNHEALTHY when health score < 0.5', async () => {
    const svc = new DesignHealthScorer(makeDb(), makeQueue());
    const r = await svc.score('tenant-1', 'spec-1', {
      errorRate: 0.5,
      tokenAdoptionRate: 0.2,
      componentReuseRate: 0.2,
      accessibilityComplianceRate: 0.3,
    });
    expect(r.isSuccess).toBe(true);
    expect(r.data!.classification).toBe('UNHEALTHY');
  });

  it('F31E-42: high error rate reduces health score', async () => {
    const svc = new DesignHealthScorer(makeDb(), makeQueue());
    const low = await svc.score('tenant-1', 'spec-1', { ...healthyMetrics, errorRate: 0.9 });
    const high = await svc.score('tenant-1', 'spec-2', { ...healthyMetrics, errorRate: 0.0 });
    expect(low.data!.healthScore).toBeLessThan(high.data!.healthScore);
  });

  it('F31E-43: DNA-8 store before enqueue', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const svc = new DesignHealthScorer(db, queue);
    await svc.score('tenant-1', 'spec-1', healthyMetrics);
    expect(db._store['flow31-health-scores']).toHaveLength(1);
    expect(queue._events[0].event).toBe('design.health.scored');
  });

  it('F31E-44: returns failure when storeDocument fails', async () => {
    const svc = new DesignHealthScorer(makeDb({ storeFail: true }), makeQueue());
    const r = await svc.score('tenant-1', 'spec-1', healthyMetrics);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('DB_ERROR');
  });
});
