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

const TENANT = 'snap-svc-test';

function makeService(dir: string) {
  const fb = new PersistentFeedbackStore();
  const mp = new ModelPreferenceTracker({ minSamples: 1 });
  const ps = new PromptVersionStore();
  const rq = new RagQualityTracker();
  const ab = new PromptAbTester(ps);
  const svc = new LearningSnapshotService(fb, mp, ps, rq, ab, { snapshotDir: dir });
  return { svc, fb, mp, ps, rq, ab };
}

describe('LearningSnapshotService', () => {
  let snapshotDir: string;

  beforeEach(() => {
    snapshotDir = path.join(os.tmpdir(), `xiigen-snap-${Date.now()}`);
  });

  afterEach(() => {
    fs.rmSync(snapshotDir, { recursive: true, force: true });
  });

  it('creates a snapshot file on disk', () => {
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

    const result = svc.createSnapshot(TENANT, {
      phase: 'A',
      aiProvider: 'mock',
      ragProvider: 'inmemory',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.snapshotId).toMatch(/^snap-/);
    expect(result.data!.metrics.totalFeedbackRecords).toBe(1);
    expect(fs.readdirSync(snapshotDir).filter((f) => f.endsWith('.json')).length).toBe(1);
  });

  it('restores all 5 stores from a snapshot', () => {
    const { svc, fb, mp, rq } = makeService(snapshotDir);
    fb.record(
      createFeedbackRecord({
        tenantId: TENANT,
        taskType: 'T567',
        modelId: 'claude',
        qualityScore: createQualityScore([{ name: 'dna', score: 0.85, weight: 1.0 }]),
        passed: true,
      }),
    );
    mp.recordResult(TENANT, 'T567', 'claude', 85);
    rq.recordPatternUsage(TENANT, 'pat-1', true);

    const snap = svc.createSnapshot(TENANT, {
      phase: 'A',
      aiProvider: 'claude',
      ragProvider: 'inmemory',
    });
    fb.clear();
    mp.clear();
    rq.clear();

    const restored = svc.restoreSnapshot(snap.data!.snapshotId);
    expect(restored.isSuccess).toBe(true);
    expect(fb.count).toBe(1);
    expect(mp.getResultCount(TENANT, 'T567')).toBe(1);
  });

  it('lists snapshots sorted newest first', () => {
    const { svc } = makeService(snapshotDir);
    svc.createSnapshot(TENANT, { phase: 'A', aiProvider: 'mock', ragProvider: 'inmemory' });
    svc.createSnapshot(TENANT, { phase: 'B', aiProvider: 'mock', ragProvider: 'inmemory' });

    const list = svc.listSnapshots();
    expect(list.isSuccess).toBe(true);
    expect(list.data!.length).toBe(2);
    expect(list.data![0].metadata.phase).toBe('B'); // newest first
  });

  it('compares two snapshots and returns correct deltas', () => {
    const { svc, fb } = makeService(snapshotDir);
    const snapA = svc.createSnapshot(TENANT, {
      phase: 'A',
      aiProvider: 'mock',
      ragProvider: 'inmemory',
    });

    fb.record(
      createFeedbackRecord({
        tenantId: TENANT,
        taskType: 'T568',
        modelId: 'claude',
        qualityScore: createQualityScore([{ name: 'dna', score: 0.9, weight: 1.0 }]),
        passed: true,
      }),
    );

    const snapB = svc.createSnapshot(TENANT, {
      phase: 'B',
      aiProvider: 'claude',
      ragProvider: 'inmemory',
    });
    const cmp = svc.compareSnapshots(snapA.data!.snapshotId, snapB.data!.snapshotId);

    expect(cmp.isSuccess).toBe(true);
    expect(cmp.data!.deltas.feedbackCountDelta).toBe(1);
    expect(cmp.data!.aMetrics).toBeDefined();
    expect(cmp.data!.bMetrics).toBeDefined();
  });

  it('fails on empty tenantId', () => {
    const { svc } = makeService(snapshotDir);
    const result = svc.createSnapshot('', {
      phase: 'A',
      aiProvider: 'mock',
      ragProvider: 'inmemory',
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_TENANT');
  });

  it('fails restore on non-existent snapshotId', () => {
    const { svc } = makeService(snapshotDir);
    const result = svc.restoreSnapshot('snap-does-not-exist');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NOT_FOUND');
  });
});
