/**
 * FLOW-31 Phase F — Learning + Orchestration Tests (T510–T515)
 * F31F-1 through F31F-44
 */

import { DesignFeedbackLearner } from '../../src/engine/flows/design-system-governance/design-feedback-learner.service';
import { CrossDesignImpactAnalyzer } from '../../src/engine/flows/design-system-governance/cross-design-impact-analyzer.service';
import { DesignEvolutionTracker } from '../../src/engine/flows/design-system-governance/design-evolution-tracker.service';
import { DesignPublishOrchestrator } from '../../src/engine/flows/design-system-governance/design-publish-orchestrator.service';
import { DesignDeploymentGate } from '../../src/engine/flows/design-system-governance/design-deployment-gate.service';
import { MetaDesignOrchestrator } from '../../src/engine/flows/design-system-governance/meta-design-orchestrator.service';
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

// ─── T510: DesignFeedbackLearner ───────────────────────────────────────────

describe('F31F-1..F31F-6 — DesignFeedbackLearner (T510)', () => {
  const feedback = {
    deploymentOutcome: 'success' as const,
    patternSignals: [{ patternName: 'atomic-tokens', confidence: 0.9 }],
  };

  it('F31F-1: returns UNSCOPED_QUERY when tenantId is empty', async () => {
    const svc = new DesignFeedbackLearner(makeDb(), makeQueue());
    const r = await svc.learn('', 'spec-1', feedback);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F31F-2: returns MISSING_SPEC_ID when specId is empty', async () => {
    const svc = new DesignFeedbackLearner(makeDb(), makeQueue());
    const r = await svc.learn('tenant-1', '', feedback);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_SPEC_ID');
  });

  it('F31F-3: stores signal with scoreFlag SCORE-0 (async-only)', async () => {
    const db = makeDb();
    const svc = new DesignFeedbackLearner(db, makeQueue());
    await svc.learn('tenant-1', 'spec-1', feedback);
    const stored = db._store['flow31-design-learning-signals'][0] as Record<string, unknown>;
    expect(stored['scoreFlag']).toBe('SCORE-0');
  });

  it('F31F-4: DNA-8 store before enqueue, emits design.feedback.learned', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const svc = new DesignFeedbackLearner(db, queue);
    await svc.learn('tenant-1', 'spec-1', feedback);
    expect(db._store['flow31-design-learning-signals']).toHaveLength(1);
    expect(queue._events[0].event).toBe('design.feedback.learned');
  });

  it('F31F-5: handles failure outcome', async () => {
    const db = makeDb();
    const svc = new DesignFeedbackLearner(db, makeQueue());
    const r = await svc.learn('tenant-1', 'spec-1', {
      deploymentOutcome: 'failure',
      patternSignals: [{ patternName: 'monolithic-theme', confidence: 0.1 }],
    });
    expect(r.isSuccess).toBe(true);
  });

  it('F31F-6: returns failure when storeDocument fails', async () => {
    const svc = new DesignFeedbackLearner(makeDb({ storeFail: true }), makeQueue());
    const r = await svc.learn('tenant-1', 'spec-1', feedback);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('DB_ERROR');
  });
});

// ─── T511: CrossDesignImpactAnalyzer ──────────────────────────────────────

describe('F31F-7..F31F-14 — CrossDesignImpactAnalyzer (T511)', () => {
  it('F31F-7: returns UNSCOPED_QUERY when tenantId is empty', async () => {
    const svc = new CrossDesignImpactAnalyzer(makeDb(), makeQueue());
    const r = await svc.analyze('', 'spec-1', ['color-primary'], []);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F31F-8: returns MISSING_SPEC_ID when specId is empty', async () => {
    const svc = new CrossDesignImpactAnalyzer(makeDb(), makeQueue());
    const r = await svc.analyze('tenant-1', '', ['color-primary'], []);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_SPEC_ID');
  });

  it('F31F-9: returns failure when searchDocuments fails', async () => {
    const svc = new CrossDesignImpactAnalyzer(makeDbSearchFail(), makeQueue());
    const r = await svc.analyze('tenant-1', 'spec-1', ['color-primary'], []);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('DB_ERROR');
  });

  it('F31F-10: severity NONE for zero changes', async () => {
    const svc = new CrossDesignImpactAnalyzer(makeDb({ searchResult: [] }), makeQueue());
    const r = await svc.analyze('tenant-1', 'spec-1', [], []);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.severity).toBe('NONE');
  });

  it('F31F-11: severity LOW for 1-2 total changes', async () => {
    const svc = new CrossDesignImpactAnalyzer(makeDb({ searchResult: [] }), makeQueue());
    const r = await svc.analyze('tenant-1', 'spec-1', ['color-primary'], []);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.severity).toBe('LOW');
  });

  it('F31F-12: severity CRITICAL for > 10 total changes', async () => {
    const svc = new CrossDesignImpactAnalyzer(makeDb({ searchResult: [] }), makeQueue());
    const r = await svc.analyze(
      'tenant-1',
      'spec-1',
      ['t1', 't2', 't3', 't4', 't5', 't6'],
      ['c1', 'c2', 'c3', 'c4', 'c5'],
    );
    expect(r.isSuccess).toBe(true);
    expect(r.data!.severity).toBe('CRITICAL');
  });

  it('F31F-13: DNA-8 store before enqueue, emits design.impact.analyzed', async () => {
    const db = makeDb({ searchResult: [] });
    const queue = makeQueue();
    const svc = new CrossDesignImpactAnalyzer(db, queue);
    await svc.analyze('tenant-1', 'spec-1', ['color-primary'], []);
    expect(db._store['flow31-impact-reports']).toHaveLength(1);
    expect(queue._events[0].event).toBe('design.impact.analyzed');
  });

  it('F31F-14: returns failure when storeDocument fails', async () => {
    const db = makeDb({ searchResult: [], storeFail: true });
    const svc = new CrossDesignImpactAnalyzer(db, makeQueue());
    const r = await svc.analyze('tenant-1', 'spec-1', ['color-primary'], []);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('DB_ERROR');
  });
});

// ─── T512: DesignEvolutionTracker ─────────────────────────────────────────

describe('F31F-15..F31F-21 — DesignEvolutionTracker (T512)', () => {
  const evolution = {
    milestone: 'Adopt design tokens v2',
    category: 'architectural_shift' as const,
    description: 'Migrated from CSS variables to structured token system',
  };

  it('F31F-15: returns UNSCOPED_QUERY when tenantId is empty', async () => {
    const svc = new DesignEvolutionTracker(makeDb(), makeQueue());
    const r = await svc.track('', 'spec-1', evolution);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F31F-16: returns MISSING_SPEC_ID when specId is empty', async () => {
    const svc = new DesignEvolutionTracker(makeDb(), makeQueue());
    const r = await svc.track('tenant-1', '', evolution);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_SPEC_ID');
  });

  it('F31F-17: returns MISSING_MILESTONE when milestone is empty', async () => {
    const svc = new DesignEvolutionTracker(makeDb(), makeQueue());
    const r = await svc.track('tenant-1', 'spec-1', { ...evolution, milestone: '' });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_MILESTONE');
  });

  it('F31F-18: INSERT-ONLY — each call creates a new evolution record', async () => {
    const db = makeDb();
    const svc = new DesignEvolutionTracker(db, makeQueue());
    await svc.track('tenant-1', 'spec-1', evolution);
    await svc.track('tenant-1', 'spec-1', { ...evolution, milestone: 'v3 tokens' });
    expect(db._store['flow31-design-evolutions']).toHaveLength(2);
  });

  it('F31F-19: DNA-8 store before enqueue, emits design.evolution.tracked', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const svc = new DesignEvolutionTracker(db, queue);
    await svc.track('tenant-1', 'spec-1', evolution);
    expect(db._store['flow31-design-evolutions']).toHaveLength(1);
    expect(queue._events[0].event).toBe('design.evolution.tracked');
  });

  it('F31F-20: returns milestone in success data', async () => {
    const svc = new DesignEvolutionTracker(makeDb(), makeQueue());
    const r = await svc.track('tenant-1', 'spec-1', evolution);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.milestone).toBe('Adopt design tokens v2');
  });

  it('F31F-21: returns failure when storeDocument fails', async () => {
    const svc = new DesignEvolutionTracker(makeDb({ storeFail: true }), makeQueue());
    const r = await svc.track('tenant-1', 'spec-1', evolution);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('DB_ERROR');
  });
});

// ─── T513: DesignPublishOrchestrator ──────────────────────────────────────

describe('F31F-22..F31F-28 — DesignPublishOrchestrator (T513)', () => {
  it('F31F-22: returns UNSCOPED_QUERY when tenantId is empty', async () => {
    const svc = new DesignPublishOrchestrator(makeDb(), makeQueue());
    const r = await svc.publish('', 'spec-1', ['token_library']);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F31F-23: returns MISSING_SPEC_ID when specId is empty', async () => {
    const svc = new DesignPublishOrchestrator(makeDb(), makeQueue());
    const r = await svc.publish('tenant-1', '', ['token_library']);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_SPEC_ID');
  });

  it('F31F-24: returns MISSING_TARGETS when targets array is empty', async () => {
    const svc = new DesignPublishOrchestrator(makeDb(), makeQueue());
    const r = await svc.publish('tenant-1', 'spec-1', []);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_TARGETS');
  });

  it('F31F-25: returns failure when searchDocuments fails', async () => {
    const svc = new DesignPublishOrchestrator(makeDbSearchFail(), makeQueue());
    const r = await svc.publish('tenant-1', 'spec-1', ['token_library']);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('DB_ERROR');
  });

  it('F31F-26: idempotent — returns existing when already published', async () => {
    const db = makeDb({
      searchResult: [{ publishId: 'existing-pub-id', publishedAt: '2024-01-01T00:00:00.000Z' }],
    });
    const queue = makeQueue();
    const svc = new DesignPublishOrchestrator(db, queue);
    const r = await svc.publish('tenant-1', 'spec-1', ['token_library']);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.publishId).toBe('existing-pub-id');
    expect(queue._events).toHaveLength(0);
  });

  it('F31F-27: publishes and emits on first call', async () => {
    const db = makeDb({ searchResult: [] });
    const queue = makeQueue();
    const svc = new DesignPublishOrchestrator(db, queue);
    const r = await svc.publish('tenant-1', 'spec-1', [
      'token_library',
      'component_catalog',
      'pattern_library',
    ]);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.status).toBe('PUBLISHED');
    expect(queue._events[0].event).toBe('design.published');
  });

  it('F31F-28: returns failure when storeDocument fails', async () => {
    const db = makeDb({ searchResult: [], storeFail: true });
    const svc = new DesignPublishOrchestrator(db, makeQueue());
    const r = await svc.publish('tenant-1', 'spec-1', ['token_library']);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('DB_ERROR');
  });
});

// ─── T514: DesignDeploymentGate ────────────────────────────────────────────

describe('F31F-29..F31F-36 — DesignDeploymentGate (T514)', () => {
  const allPhases = [
    'ingested',
    'analyzed',
    'quality_passed',
    'schema_valid',
    'tokens_consistent',
    'published',
  ];

  it('F31F-29: returns UNSCOPED_QUERY when tenantId is empty', async () => {
    const svc = new DesignDeploymentGate(makeDb(), makeQueue());
    const r = await svc.evaluate('', 'spec-1', allPhases);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F31F-30: returns MISSING_SPEC_ID when specId is empty', async () => {
    const svc = new DesignDeploymentGate(makeDb(), makeQueue());
    const r = await svc.evaluate('tenant-1', '', allPhases);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_SPEC_ID');
  });

  it('F31F-31: returns DESIGN_DEPLOYMENT_BLOCKED when phases missing', async () => {
    const svc = new DesignDeploymentGate(makeDb(), makeQueue());
    const r = await svc.evaluate('tenant-1', 'spec-1', ['ingested', 'analyzed']);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('DESIGN_DEPLOYMENT_BLOCKED');
  });

  it('F31F-32: blocks on single missing phase', async () => {
    const svc = new DesignDeploymentGate(makeDb(), makeQueue());
    const missingOne = allPhases.filter((p) => p !== 'published');
    const r = await svc.evaluate('tenant-1', 'spec-1', missingOne);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('DESIGN_DEPLOYMENT_BLOCKED');
    expect(r.errorMessage).toContain('published');
  });

  it('F31F-33: succeeds when all required phases present', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const svc = new DesignDeploymentGate(db, queue);
    const r = await svc.evaluate('tenant-1', 'spec-1', allPhases);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.approved).toBe(true);
    expect(queue._events[0].event).toBe('design.deployment.approved');
  });

  it('F31F-34: succeeds with extra phases beyond required', async () => {
    const db = makeDb();
    const svc = new DesignDeploymentGate(db, makeQueue());
    const r = await svc.evaluate('tenant-1', 'spec-1', [...allPhases, 'extra_phase']);
    expect(r.isSuccess).toBe(true);
  });

  it('F31F-35: DNA-8 store before enqueue', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const svc = new DesignDeploymentGate(db, queue);
    await svc.evaluate('tenant-1', 'spec-1', allPhases);
    expect(db._store['flow31-deployment-gates']).toHaveLength(1);
    expect(queue._events).toHaveLength(1);
  });

  it('F31F-36: returns failure when storeDocument fails', async () => {
    const svc = new DesignDeploymentGate(makeDb({ storeFail: true }), makeQueue());
    const r = await svc.evaluate('tenant-1', 'spec-1', allPhases);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('DB_ERROR');
  });
});

// ─── T515: MetaDesignOrchestrator ─────────────────────────────────────────

describe('F31F-37..F31F-44 — MetaDesignOrchestrator (T515)', () => {
  const config = {
    designFormat: 'figma',
    targetPhases: ['ingest', 'analyze', 'validate', 'build', 'publish', 'deploy'],
  };

  it('F31F-37: returns UNSCOPED_QUERY when tenantId is empty', async () => {
    const svc = new MetaDesignOrchestrator(makeDb(), makeQueue());
    const r = await svc.initiate('', 'spec-1', config);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F31F-38: returns MISSING_SPEC_ID when specId is empty', async () => {
    const svc = new MetaDesignOrchestrator(makeDb(), makeQueue());
    const r = await svc.initiate('tenant-1', '', config);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_SPEC_ID');
  });

  it('F31F-39: returns failure when searchDocuments fails', async () => {
    const svc = new MetaDesignOrchestrator(makeDbSearchFail(), makeQueue());
    const r = await svc.initiate('tenant-1', 'spec-1', config);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('DB_ERROR');
  });

  it('F31F-40: idempotent — returns existing on duplicate specId', async () => {
    const db = makeDb({
      searchResult: [
        { orchestrationId: 'existing-orch-id', initiatedAt: '2024-01-01T00:00:00.000Z' },
      ],
    });
    const queue = makeQueue();
    const svc = new MetaDesignOrchestrator(db, queue);
    const r = await svc.initiate('tenant-1', 'spec-1', config);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.orchestrationId).toBe('existing-orch-id');
    expect(queue._events).toHaveLength(0);
  });

  it('F31F-41: initiates on first call, status INITIATED', async () => {
    const db = makeDb({ searchResult: [] });
    const queue = makeQueue();
    const svc = new MetaDesignOrchestrator(db, queue);
    const r = await svc.initiate('tenant-1', 'spec-1', config);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.status).toBe('INITIATED');
    expect(queue._events[0].event).toBe('metadesign.orchestration.initiated');
  });

  it('F31F-42: DNA-8 store before enqueue', async () => {
    const db = makeDb({ searchResult: [] });
    const queue = makeQueue();
    const svc = new MetaDesignOrchestrator(db, queue);
    await svc.initiate('tenant-1', 'spec-1', config);
    expect(db._store['flow31-meta-design-runs']).toHaveLength(1);
    expect(queue._events).toHaveLength(1);
  });

  it('F31F-43: two different specIds produce two separate records', async () => {
    const db = makeDb({ searchResult: [] });
    const svc = new MetaDesignOrchestrator(db, makeQueue());
    await svc.initiate('tenant-1', 'spec-1', config);
    await svc.initiate('tenant-1', 'spec-2', config);
    expect(db._store['flow31-meta-design-runs']).toHaveLength(2);
  });

  it('F31F-44: returns failure when storeDocument fails', async () => {
    const db = makeDb({ searchResult: [], storeFail: true });
    const svc = new MetaDesignOrchestrator(db, makeQueue());
    const r = await svc.initiate('tenant-1', 'spec-1', config);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('DB_ERROR');
  });
});
