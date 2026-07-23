/**
 * Snapshot HTTP route integration tests.
 *
 * Routes are registered on the raw Express instance in main.ts bootstrap(),
 * not as NestJS controllers. This test therefore exercises LearningSnapshotService
 * directly through its public API — the same behaviour the routes delegate to.
 *
 * All 7 test scenarios match the SESSION-3 route spec.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PersistentFeedbackStore } from '../../src/learning/feedback-store';
import { ModelPreferenceTracker } from '../../src/learning/model-preference';
import { PromptVersionStore } from '../../src/learning/prompt-version-store';
import { RagQualityTracker } from '../../src/learning/rag-quality-tracker';
import { PromptAbTester } from '../../src/learning/prompt-ab-tester';
import { LearningSnapshotService } from '../../src/learning/learning-snapshot.service';
import { createFeedbackRecord, createQualityScore } from '../../src/learning/feedback-types';

const TENANT = 'route-test';

function makeService(dir: string) {
  const fb = new PersistentFeedbackStore();
  const mp = new ModelPreferenceTracker({ minSamples: 1 });
  const ps = new PromptVersionStore();
  const rq = new RagQualityTracker();
  const ab = new PromptAbTester(ps);
  const svc = new LearningSnapshotService(fb, mp, ps, rq, ab, { snapshotDir: dir });
  return { svc, fb };
}

// ── Route behaviour helpers ──────────────────────────────────────────────────
// Mirror the route handlers in main.ts so each test verifies what the route
// would return without needing a running HTTP server.

function routeCreateSnapshot(svc: LearningSnapshotService, body: Record<string, unknown>) {
  const { tenantId, phase, aiProvider, ragProvider, flowId, notes } = body as any;
  if (!tenantId) return { status: 400, body: { error: 'MISSING_TENANT' } };
  const result = svc.createSnapshot(tenantId, { phase, aiProvider, ragProvider, flowId, notes });
  return {
    status: result.isSuccess ? 201 : 400,
    body: result.isSuccess
      ? result.data
      : { error: result.errorCode, message: result.errorMessage },
  };
}

function routeRestoreSnapshot(svc: LearningSnapshotService, body: Record<string, unknown>) {
  const { snapshotId } = body as any;
  const result = svc.restoreSnapshot(snapshotId);
  return {
    status: result.isSuccess ? 200 : 404,
    body: result.isSuccess
      ? { restored: true, snapshotId }
      : { error: result.errorCode, message: result.errorMessage },
  };
}

function routeListSnapshots(svc: LearningSnapshotService) {
  const result = svc.listSnapshots();
  return { status: 200, body: result.isSuccess ? result.data : [] };
}

function routeCompareSnapshots(svc: LearningSnapshotService, a?: string, b?: string) {
  if (!a || !b) {
    return {
      status: 400,
      body: { error: 'MISSING_PARAMS', message: 'Query params a and b required' },
    };
  }
  const result = svc.compareSnapshots(a, b);
  return {
    status: result.isSuccess ? 200 : 404,
    body: result.isSuccess
      ? result.data
      : { error: result.errorCode, message: result.errorMessage },
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Snapshot HTTP Routes', () => {
  let snapshotDir: string;

  beforeEach(() => {
    snapshotDir = path.join(os.tmpdir(), `snap-route-${Date.now()}`);
    fs.mkdirSync(snapshotDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(snapshotDir, { recursive: true, force: true });
  });

  it('POST /learning/snapshot → 201 with snapshotId', () => {
    const { svc, fb } = makeService(snapshotDir);
    fb.record(
      createFeedbackRecord({
        tenantId: TENANT,
        taskType: 'T567',
        modelId: 'mock',
        qualityScore: createQualityScore([{ name: 'test', score: 0.7, weight: 1.0 }]),
        passed: true,
      }),
    );

    const res = routeCreateSnapshot(svc, {
      tenantId: TENANT,
      phase: 'A',
      aiProvider: 'mock',
      ragProvider: 'inmemory',
    });

    expect(res.status).toBe(201);
    expect((res.body as any).snapshotId).toMatch(/^snap-/);
    expect((res.body as any).metrics.totalFeedbackRecords).toBeGreaterThanOrEqual(1);
  });

  it('GET /learning/snapshots → array of summaries', () => {
    const { svc } = makeService(snapshotDir);
    routeCreateSnapshot(svc, {
      tenantId: TENANT,
      phase: 'A',
      aiProvider: 'mock',
      ragProvider: 'inmemory',
    });

    const res = routeListSnapshots(svc);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect((res.body as any[]).length).toBeGreaterThanOrEqual(1);
  });

  it('POST /learning/snapshot/restore → 200 restored: true', () => {
    const { svc } = makeService(snapshotDir);
    const createRes = routeCreateSnapshot(svc, {
      tenantId: TENANT,
      phase: 'A',
      aiProvider: 'mock',
      ragProvider: 'inmemory',
    });
    const snapshotId = (createRes.body as any).snapshotId;

    const restoreRes = routeRestoreSnapshot(svc, { snapshotId });

    expect(restoreRes.status).toBe(200);
    expect((restoreRes.body as any).restored).toBe(true);
  });

  it('POST /learning/snapshot → 400 without tenantId', () => {
    const { svc } = makeService(snapshotDir);
    const res = routeCreateSnapshot(svc, {
      phase: 'A',
      aiProvider: 'mock',
      ragProvider: 'inmemory',
    });
    expect(res.status).toBe(400);
  });

  it('POST /learning/snapshot/restore → 404 for unknown ID', () => {
    const { svc } = makeService(snapshotDir);
    const res = routeRestoreSnapshot(svc, { snapshotId: 'snap-nonexistent' });
    expect(res.status).toBe(404);
  });

  it('GET /learning/snapshot/compare → deltas object', () => {
    const { svc, fb } = makeService(snapshotDir);
    const snap1 = routeCreateSnapshot(svc, {
      tenantId: TENANT,
      phase: 'A',
      aiProvider: 'mock',
      ragProvider: 'inmemory',
    });

    fb.record(
      createFeedbackRecord({
        tenantId: TENANT,
        taskType: 'T568',
        modelId: 'claude',
        qualityScore: createQualityScore([{ name: 'dna', score: 0.95, weight: 1.0 }]),
        passed: true,
      }),
    );

    const snap2 = routeCreateSnapshot(svc, {
      tenantId: TENANT,
      phase: 'B',
      aiProvider: 'claude',
      ragProvider: 'inmemory',
    });

    const cmpRes = routeCompareSnapshots(
      svc,
      (snap1.body as any).snapshotId,
      (snap2.body as any).snapshotId,
    );

    expect(cmpRes.status).toBe(200);
    expect((cmpRes.body as any).deltas.feedbackCountDelta).toBeGreaterThanOrEqual(1);
    expect((cmpRes.body as any).aMetrics).toBeDefined();
    expect((cmpRes.body as any).bMetrics).toBeDefined();
  });

  it('GET /learning/snapshot/compare → 400 without both params', () => {
    const { svc } = makeService(snapshotDir);
    const res = routeCompareSnapshots(svc, 'snap-123', undefined);
    expect(res.status).toBe(400);
  });
});
