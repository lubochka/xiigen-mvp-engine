import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PersistentFeedbackStore } from '../../src/learning/feedback-store';
import { ModelPreferenceTracker } from '../../src/learning/model-preference';
import { PromptVersionStore } from '../../src/learning/prompt-version-store';
import { RagQualityTracker } from '../../src/learning/rag-quality-tracker';
import { PromptAbTester } from '../../src/learning/prompt-ab-tester';
import { LearningSnapshotService } from '../../src/learning/learning-snapshot.service';
import { ModelTeachingMatrix, DEFAULT_MATRIX } from '../../src/learning/model-teaching-matrix';

const TENANT = 'matrix-test';

function makeMatrix(dir: string) {
  const fb = new PersistentFeedbackStore();
  const mp = new ModelPreferenceTracker({ minSamples: 1 });
  const ps = new PromptVersionStore();
  const rq = new RagQualityTracker();
  const ab = new PromptAbTester(ps);
  const svc = new LearningSnapshotService(fb, mp, ps, rq, ab, { snapshotDir: dir });
  return { matrix: new ModelTeachingMatrix(svc), svc };
}

describe('ModelTeachingMatrix', () => {
  let snapshotDir: string;

  beforeEach(() => {
    snapshotDir = path.join(os.tmpdir(), `matrix-test-${Date.now()}`);
  });

  afterEach(() => {
    fs.rmSync(snapshotDir, { recursive: true, force: true });
  });

  it('returns default matrix with 7 combinations', () => {
    const { matrix } = makeMatrix(snapshotDir);
    expect(matrix.getDefaultMatrix().length).toBe(DEFAULT_MATRIX.length);
    expect(matrix.getDefaultMatrix()[0].aiProvider).toBe('mock');
  });

  it('runs full matrix and produces report with recommendations', async () => {
    const { matrix } = makeMatrix(snapshotDir);
    const result = await matrix.runMatrix(TENANT, 'T567');
    expect(result.isSuccess).toBe(true);
    expect(result.data!.results.length).toBe(DEFAULT_MATRIX.length);
    expect(result.data!.recommendation.bestFree).not.toBeNull();
    expect(result.data!.taskType).toBe('T567');
    expect(result.data!.tenantId).toBe(TENANT);
  });

  it('each combination gets a unique snapshotId', async () => {
    const { matrix } = makeMatrix(snapshotDir);
    const result = await matrix.runMatrix(TENANT, 'T567');
    const ids = result.data!.results.map((r) => r.snapshotId).filter(Boolean);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('mock scores are deterministic across runs', async () => {
    const { matrix } = makeMatrix(snapshotDir);
    const r1 = await matrix.runMatrix(TENANT, 'T567');
    const r2 = await matrix.runMatrix(TENANT, 'T567');
    expect(r1.data!.results[0].round1Score).toBe(r2.data!.results[0].round1Score);
  });

  it('fails on missing tenantId', async () => {
    const { matrix } = makeMatrix(snapshotDir);
    const result = await matrix.runMatrix('', 'T567');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_TENANT');
  });

  it('fails on missing taskType', async () => {
    const { matrix } = makeMatrix(snapshotDir);
    const result = await matrix.runMatrix(TENANT, '');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_TASK');
  });

  it('runs with a custom subset of combinations', async () => {
    const { matrix } = makeMatrix(snapshotDir);
    const result = await matrix.runMatrix(TENANT, 'T567', {
      combinations: [
        { aiProvider: 'mock', ragProvider: 'inmemory', estimatedCostPerRun: '$0' },
        {
          aiProvider: 'ollama:qwen2.5-coder:7b',
          ragProvider: 'inmemory',
          estimatedCostPerRun: '$0',
        },
      ],
    });
    expect(result.data!.results.length).toBe(2);
  });

  it('recommendation separates free vs paid correctly', async () => {
    const { matrix } = makeMatrix(snapshotDir);
    const result = await matrix.runMatrix(TENANT, 'T567');
    const rec = result.data!.recommendation;
    // bestFree comes from $0 combos; bestPaid from $0.50+ combos
    if (rec.bestFree) expect(rec.bestFree).toMatch(/\$0\)$/);
    if (rec.bestPaid) expect(rec.bestPaid).toMatch(/\$0\.\d+\)$/);
  });

  it('restores baseline before each combo when baselineSnapshotId provided', async () => {
    const { matrix, svc } = makeMatrix(snapshotDir);
    const baseline = svc.createSnapshot(TENANT, {
      phase: 'baseline',
      aiProvider: 'none',
      ragProvider: 'none',
    });

    const result = await matrix.runMatrix(TENANT, 'T567', {
      baselineSnapshotId: baseline.data!.snapshotId,
      combinations: [{ aiProvider: 'mock', ragProvider: 'inmemory', estimatedCostPerRun: '$0' }],
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.baselineSnapshotId).toBe(baseline.data!.snapshotId);
  });
});
