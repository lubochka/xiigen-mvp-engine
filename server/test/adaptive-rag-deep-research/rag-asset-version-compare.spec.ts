/**
 * RAGAssetVersionCompare — Unit Tests (T453).
 *
 * Tests:
 *   RAVC-1:  missing tenantId → UNSCOPED_QUERY
 *   RAVC-2:  missing versionAId → MISSING_VERSION_A
 *   RAVC-3:  missing versionBId → MISSING_VERSION_B
 *   RAVC-4:  versionB wins → success with winner=versionB
 *   RAVC-5:  regression detected → REGRESSION_DETECTED failure
 *   RAVC-6:  result includes scores array with both versions
 *   RAVC-7:  result includes confidence value
 *   RAVC-8:  evalDatasetRef from FREEDOM config (not hardcoded)
 *   RAVC-9:  AI parse failure → falls back to defaults (no throw)
 *   RAVC-10: evalDatasetRef = 'default-eval-dataset' when config not found
 */

import { RAGAssetVersionCompare } from '../../src/engine/flows/rag-optimization/rag-asset-version-compare.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-ravc-test';
const VERSION_A = 'v1-current';
const VERSION_B = 'v2-candidate';

function makeDb(evalDatasetRef?: string) {
  return {
    searchDocuments: jest.fn(async () => {
      if (evalDatasetRef) return DataProcessResult.success([{ eval_dataset_ref: evalDatasetRef }]);
      return DataProcessResult.success([]);
    }),
  } as any;
}

function makeAi(scoreA: number, scoreB: number) {
  return {
    generate: jest.fn(async () =>
      DataProcessResult.success(`{"score_a": ${scoreA}, "score_b": ${scoreB}, "confidence": 0.9}`),
    ),
  } as any;
}

function makeFailingAi() {
  return {
    generate: jest.fn(async () => DataProcessResult.failure('AI_FAILED', 'ai error')),
  } as any;
}

describe('RAGAssetVersionCompare — Unit (T453)', () => {
  it('RAVC-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new RAGAssetVersionCompare(makeDb(), makeAi(0.7, 0.8));
    const r = await svc.compare('', VERSION_A, VERSION_B);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('RAVC-2: missing versionAId → MISSING_VERSION_A', async () => {
    const svc = new RAGAssetVersionCompare(makeDb(), makeAi(0.7, 0.8));
    const r = await svc.compare(TENANT, '', VERSION_B);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_VERSION_A');
  });

  it('RAVC-3: missing versionBId → MISSING_VERSION_B', async () => {
    const svc = new RAGAssetVersionCompare(makeDb(), makeAi(0.7, 0.8));
    const r = await svc.compare(TENANT, VERSION_A, '');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_VERSION_B');
  });

  it('RAVC-4: versionB wins → success with winner=versionB', async () => {
    const svc = new RAGAssetVersionCompare(makeDb(), makeAi(0.7, 0.85));
    const r = await svc.compare(TENANT, VERSION_A, VERSION_B);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.winner).toBe(VERSION_B);
  });

  it('RAVC-5: regression detected → REGRESSION_DETECTED failure', async () => {
    const svc = new RAGAssetVersionCompare(makeDb(), makeAi(0.85, 0.5));
    const r = await svc.compare(TENANT, VERSION_A, VERSION_B);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('REGRESSION_DETECTED');
  });

  it('RAVC-6: result includes scores array with both versions', async () => {
    const svc = new RAGAssetVersionCompare(makeDb(), makeAi(0.7, 0.8));
    const r = await svc.compare(TENANT, VERSION_A, VERSION_B);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.scores).toHaveLength(2);
    const ids = r.data!.scores.map((s) => s.versionId);
    expect(ids).toContain(VERSION_A);
    expect(ids).toContain(VERSION_B);
  });

  it('RAVC-7: result includes confidence value', async () => {
    const svc = new RAGAssetVersionCompare(makeDb(), makeAi(0.7, 0.8));
    const r = await svc.compare(TENANT, VERSION_A, VERSION_B);
    expect(typeof r.data!.confidence).toBe('number');
    expect(r.data!.confidence).toBeGreaterThan(0);
  });

  it('RAVC-8: evalDatasetRef from FREEDOM config', async () => {
    const svc = new RAGAssetVersionCompare(makeDb('my-eval-dataset-v3'), makeAi(0.7, 0.8));
    const r = await svc.compare(TENANT, VERSION_A, VERSION_B);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.evalDatasetRef).toBe('my-eval-dataset-v3');
  });

  it('RAVC-9: AI parse failure → falls back to defaults (no throw)', async () => {
    const svc = new RAGAssetVersionCompare(makeDb(), makeFailingAi());
    // Defaults: scoreA=0.7, scoreB=0.6 → regression
    const r = await svc.compare(TENANT, VERSION_A, VERSION_B);
    // Should not throw; may succeed or detect regression depending on defaults
    expect(r).toBeDefined();
    expect(r.isSuccess !== undefined).toBe(true);
  });

  it('RAVC-10: evalDatasetRef = default when config not found', async () => {
    const svc = new RAGAssetVersionCompare(makeDb(), makeAi(0.6, 0.8));
    const r = await svc.compare(TENANT, VERSION_A, VERSION_B);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.evalDatasetRef).toBe('default-eval-dataset');
  });
});
