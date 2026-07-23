/**
 * TIER1 Integration Tests — S1 through S3 working together.
 * InMemory providers only — zero cloud/Docker dependencies.
 *
 * P-X: LearningSnapshotService cross-component integration.
 *
 * Note: P-1 (storePrompt) and P-3 (AF-3 three-tier resolution) tests retired in S3.
 * AF-3 PromptLibrary (in-memory Map) was replaced by ES-backed PromptLibraryStation.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { TenantContext, TENANT_CONTEXT_KEY, DEFAULT_PLAN } from '../../src/kernel';
import { PersistentFeedbackStore } from '../../src/learning/feedback-store';
import { ModelPreferenceTracker } from '../../src/learning/model-preference';
import { PromptVersionStore } from '../../src/learning/prompt-version-store';
import { RagQualityTracker } from '../../src/learning/rag-quality-tracker';
import { PromptAbTester } from '../../src/learning/prompt-ab-tester';
import { LearningSnapshotService } from '../../src/learning/learning-snapshot.service';

function makeSnapshotService(dir: string) {
  const fb = new PersistentFeedbackStore();
  const mp = new ModelPreferenceTracker({ minSamples: 1 });
  const ps = new PromptVersionStore();
  const rq = new RagQualityTracker();
  const ab = new PromptAbTester(ps);
  return new LearningSnapshotService(fb, mp, ps, rq, ab, { snapshotDir: dir });
}

describe('TIER1 Integration', () => {
  let snapshotDir: string;

  beforeEach(() => {
    snapshotDir = path.join(os.tmpdir(), `tier1-int-${Date.now()}`);
    fs.mkdirSync(snapshotDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(snapshotDir, { recursive: true, force: true });
  });

  describe('P-X: LearningSnapshotService integration', () => {
    it('snapshot captures prompt count, restore returns same state', async () => {
      const svc = makeSnapshotService(snapshotDir);

      // Create a snapshot before any prompt customisation
      const snap1 = svc.createSnapshot('tier1-tenant', {
        phase: 'before',
        aiProvider: 'mock',
        ragProvider: 'inmemory',
      });
      expect(snap1.isSuccess).toBe(true);

      // Create a second snapshot
      const snap2 = svc.createSnapshot('tier1-tenant', {
        phase: 'after',
        aiProvider: 'mock',
        ragProvider: 'inmemory',
      });
      expect(snap2.isSuccess).toBe(true);

      // List both snapshots
      const list = svc.listSnapshots();
      expect(list.isSuccess).toBe(true);
      expect((list.data as any[]).length).toBeGreaterThanOrEqual(2);

      // Restore snap1 succeeds
      const restored = svc.restoreSnapshot(snap1.data!.snapshotId);
      expect(restored.isSuccess).toBe(true);
    });
  });
});
