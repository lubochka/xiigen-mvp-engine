/**
 * P12.3 Tests — Prompt Versioning + A/B Testing
 */

import { DataProcessResult } from '../../src/kernel/data-process-result';
import {
  createPromptVersion,
  promptVersionToDict,
  type PromptVersion,
  type PromptStatus,
  DEFAULT_PROMOTION_CONFIG,
} from '../../src/learning/prompt-types';
import { PromptVersionStore } from '../../src/learning/prompt-version-store';
import { PromptAbTester } from '../../src/learning/prompt-ab-tester';

// ── Helpers ─────────────────────────────────────────

function makeVersion(
  overrides?: Partial<{
    taskType: string;
    role: string;
    content: string;
    version: string;
    status: PromptStatus;
  }>,
): PromptVersion {
  return createPromptVersion({
    taskType: overrides?.taskType ?? 'T44',
    role: overrides?.role ?? 'system',
    content: overrides?.content ?? 'Generate code following DNA patterns.',
    version: overrides?.version ?? 'v1.0',
    status: overrides?.status ?? 'candidate',
  });
}

function storeWithChampionAndCandidate(): {
  store: PromptVersionStore;
  champion: PromptVersion;
  candidate: PromptVersion;
} {
  const store = new PromptVersionStore();
  const champion = makeVersion({ version: 'v1.0', status: 'champion', content: 'Champion prompt' });
  const candidate = makeVersion({
    version: 'v1.1',
    status: 'candidate',
    content: 'Candidate prompt',
  });
  store.registerVersion(champion);
  store.registerVersion(candidate);
  return { store, champion, candidate };
}

// ══════════════════════════════════════════════════════
// PromptVersion Types
// ══════════════════════════════════════════════════════

describe('PromptVersion Types', () => {
  it('should create PromptVersion with all fields', () => {
    const v = makeVersion();
    expect(v.id).toMatch(/^pv-/);
    expect(v.taskType).toBe('T44');
    expect(v.role).toBe('system');
    expect(v.content).toBeDefined();
    expect(v.version).toBe('v1.0');
    expect(v.status).toBe('candidate');
    expect(v.createdAt).toBeDefined();
  });

  it('should auto-generate unique IDs', () => {
    const v1 = makeVersion();
    const v2 = makeVersion();
    expect(v1.id).not.toBe(v2.id);
  });

  it('should serialize to dict with snake_case (DNA-1)', () => {
    const v = makeVersion();
    const dict = promptVersionToDict(v);
    expect(dict.task_type).toBe('T44');
    expect(dict.role).toBe('system');
    expect(dict.version).toBe('v1.0');
    expect(dict.status).toBe('candidate');
    expect(dict.created_at).toBeDefined();
  });

  it('should default status to candidate', () => {
    const v = createPromptVersion({
      taskType: 'T44',
      role: 'system',
      content: 'test',
      version: 'v1',
    });
    expect(v.status).toBe('candidate');
  });

  it('should accept champion status', () => {
    const v = makeVersion({ status: 'champion' });
    expect(v.status).toBe('champion');
  });

  it('should have default promotion config values', () => {
    expect(DEFAULT_PROMOTION_CONFIG.minSamples).toBe(10);
    expect(DEFAULT_PROMOTION_CONFIG.scoreThreshold).toBe(0.05);
    expect(DEFAULT_PROMOTION_CONFIG.autoPromote).toBe(true);
  });
});

// ══════════════════════════════════════════════════════
// PromptVersionStore
// ══════════════════════════════════════════════════════

describe('PromptVersionStore', () => {
  let store: PromptVersionStore;

  beforeEach(() => {
    store = new PromptVersionStore();
  });

  it('should register a version', () => {
    const v = makeVersion();
    const result = store.registerVersion(v);
    expect(result.isSuccess).toBe(true);
    expect(store.count).toBe(1);
  });

  it('should reject duplicate IDs', () => {
    const v = makeVersion();
    store.registerVersion(v);
    const result = store.registerVersion(v);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('DUPLICATE');
  });

  it('should reject missing taskType', () => {
    const v = { ...makeVersion(), taskType: '' } as PromptVersion;
    const result = store.registerVersion(v);
    expect(result.isSuccess).toBe(false);
  });

  it('should getChampion returning champion', () => {
    const { store, champion } = storeWithChampionAndCandidate();
    const result = store.getChampion('T44', 'system');
    expect(result.isSuccess).toBe(true);
    expect(result.data!.id).toBe(champion.id);
    expect(result.data!.status).toBe('champion');
  });

  it('should return null when no champion', () => {
    const result = store.getChampion('T44', 'system');
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeNull();
  });

  it('should getCandidates returning only candidates', () => {
    const { store, candidate } = storeWithChampionAndCandidate();
    const result = store.getCandidates('T44', 'system');
    expect(result.isSuccess).toBe(true);
    expect(result.data!).toHaveLength(1);
    expect(result.data![0].id).toBe(candidate.id);
  });

  it('should promote candidate to champion', () => {
    const { store, champion, candidate } = storeWithChampionAndCandidate();
    const result = store.promote(candidate.id);
    expect(result.isSuccess).toBe(true);

    // Candidate is now champion
    const newChampion = store.getChampion('T44', 'system');
    expect(newChampion.data!.id).toBe(candidate.id);
    expect(newChampion.data!.status).toBe('champion');

    // Old champion is retired
    const oldChampion = store.getById(champion.id);
    expect(oldChampion.data!.status).toBe('retired');
  });

  it('should not promote retired version', () => {
    const v = makeVersion({ status: 'retired' as any });
    // Force retired status
    (v as any).status = 'retired';
    store.registerVersion(v);
    store.retire(v.id);
    const result = store.promote(v.id);
    expect(result.isSuccess).toBe(false);
  });

  it('should retire a version', () => {
    const v = makeVersion();
    store.registerVersion(v);
    const result = store.retire(v.id);
    expect(result.isSuccess).toBe(true);
    expect(store.getById(v.id).data!.status).toBe('retired');
  });

  it('should not retire already retired version', () => {
    const v = makeVersion();
    store.registerVersion(v);
    store.retire(v.id);
    const result = store.retire(v.id);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('ALREADY_RETIRED');
  });

  it('should listVersions with optional taskType filter', () => {
    store.registerVersion(makeVersion({ taskType: 'T44' }));
    store.registerVersion(makeVersion({ taskType: 'T45' }));
    store.registerVersion(makeVersion({ taskType: 'T44' }));

    const all = store.listVersions();
    expect(all.data!).toHaveLength(3);

    const filtered = store.listVersions('T44');
    expect(filtered.data!).toHaveLength(2);
  });

  it('should getById returning version', () => {
    const v = makeVersion();
    store.registerVersion(v);
    const result = store.getById(v.id);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.id).toBe(v.id);
  });

  it('should fail getById for unknown version', () => {
    const result = store.getById('pv-nonexistent');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NOT_FOUND');
  });

  it('should return DataProcessResult (DNA-3)', () => {
    const result = store.getChampion('T44', 'system');
    expect(result).toBeInstanceOf(DataProcessResult);
  });
});

// ══════════════════════════════════════════════════════
// PromptAbTester
// ══════════════════════════════════════════════════════

describe('PromptAbTester', () => {
  let store: PromptVersionStore;
  let champion: PromptVersion;
  let candidate: PromptVersion;
  let tester: PromptAbTester;

  beforeEach(() => {
    const setup = storeWithChampionAndCandidate();
    store = setup.store;
    champion = setup.champion;
    candidate = setup.candidate;
    tester = new PromptAbTester(store, {
      championRatio: 0.8,
      promotionConfig: { minSamples: 5, scoreThreshold: 0.05 },
    });
  });

  // ── selectPrompt ──────────────────────────────────

  it('should return champion most of the time', () => {
    let championCount = 0;
    for (let i = 0; i < 100; i++) {
      const result = tester.selectPrompt('t1', 'T44', 'system');
      if (result.data!.id === champion.id) championCount++;
    }
    expect(championCount).toBeGreaterThan(50);
    expect(championCount).toBeLessThan(100);
  });

  it('should sometimes return candidate', () => {
    let candidateCount = 0;
    for (let i = 0; i < 100; i++) {
      const result = tester.selectPrompt('t1', 'T44', 'system');
      if (result.data!.id === candidate.id) candidateCount++;
    }
    expect(candidateCount).toBeGreaterThan(0);
  });

  it('should return champion when no candidates exist', () => {
    const store2 = new PromptVersionStore();
    const champ = makeVersion({ status: 'champion' });
    store2.registerVersion(champ);
    const tester2 = new PromptAbTester(store2);

    const result = tester2.selectPrompt('t1', 'T44', 'system');
    expect(result.data!.id).toBe(champ.id);
  });

  it('should return candidate when no champion exists', () => {
    const store2 = new PromptVersionStore();
    const cand = makeVersion({ status: 'candidate' });
    store2.registerVersion(cand);
    const tester2 = new PromptAbTester(store2);

    const result = tester2.selectPrompt('t1', 'T44', 'system');
    expect(result.data!.id).toBe(cand.id);
  });

  it('should fail when no prompts available', () => {
    const store2 = new PromptVersionStore();
    const tester2 = new PromptAbTester(store2);
    const result = tester2.selectPrompt('t1', 'T44', 'system');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NO_PROMPTS');
  });

  it('should fail on missing tenantId (DNA-5)', () => {
    const result = tester.selectPrompt('', 'T44', 'system');
    expect(result.isSuccess).toBe(false);
  });

  // ── recordResult ──────────────────────────────────

  it('should record test result', () => {
    const result = tester.recordResult('t1', champion.id, 0.85, true);
    expect(result.isSuccess).toBe(true);
    expect(tester.getResults(champion.id)).toHaveLength(1);
  });

  it('should fail recordResult on missing tenantId (DNA-5)', () => {
    const result = tester.recordResult('', champion.id, 0.85, true);
    expect(result.isSuccess).toBe(false);
  });

  // ── getStats ──────────────────────────────────────

  it('should calculate stats correctly', () => {
    tester.recordResult('t1', champion.id, 0.8, true);
    tester.recordResult('t1', champion.id, 0.9, true);
    tester.recordResult('t1', champion.id, 0.7, false);

    const result = tester.getStats(champion.id);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.sampleCount).toBe(3);
    expect(result.data!.avgScore).toBeCloseTo(0.8, 1);
    expect(result.data!.passRate).toBeCloseTo(2 / 3, 2);
    expect(result.data!.confidenceLevel).toBe('low');
  });

  it('should return zero stats for unknown version', () => {
    const result = tester.getStats('pv-unknown');
    expect(result.data!.sampleCount).toBe(0);
    expect(result.data!.avgScore).toBe(0);
  });

  it('should report medium confidence at 5+ samples', () => {
    for (let i = 0; i < 6; i++) {
      tester.recordResult('t1', champion.id, 0.8, true);
    }
    const result = tester.getStats(champion.id);
    expect(result.data!.confidenceLevel).toBe('medium');
  });

  it('should report high confidence at 20+ samples', () => {
    for (let i = 0; i < 21; i++) {
      tester.recordResult('t1', champion.id, 0.8, true);
    }
    const result = tester.getStats(champion.id);
    expect(result.data!.confidenceLevel).toBe('high');
  });

  // ── checkPromotion ────────────────────────────────

  it('should promote when candidate beats champion by threshold', () => {
    // Champion: avg 0.7
    for (let i = 0; i < 5; i++) tester.recordResult('t1', champion.id, 0.7, true);
    // Candidate: avg 0.85 (delta = 0.15 > 0.05 threshold)
    for (let i = 0; i < 5; i++) tester.recordResult('t1', candidate.id, 0.85, true);

    const result = tester.checkPromotion('T44', 'system');
    expect(result.isSuccess).toBe(true);
    expect(result.data!.promoted).toBe(true);
    expect(result.data!.versionId).toBe(candidate.id);

    // Verify: candidate is now champion
    expect(store.getChampion('T44', 'system').data!.id).toBe(candidate.id);
    // Old champion is retired
    expect(store.getById(champion.id).data!.status).toBe('retired');
  });

  it('should not promote when score delta below threshold', () => {
    // Champion: avg 0.80
    for (let i = 0; i < 5; i++) tester.recordResult('t1', champion.id, 0.8, true);
    // Candidate: avg 0.82 (delta = 0.02 < 0.05 threshold)
    for (let i = 0; i < 5; i++) tester.recordResult('t1', candidate.id, 0.82, true);

    const result = tester.checkPromotion('T44', 'system');
    expect(result.data!.promoted).toBe(false);
  });

  it('should not promote when below minimum samples', () => {
    // Only 2 samples for candidate (min is 5)
    tester.recordResult('t1', champion.id, 0.7, true);
    tester.recordResult('t1', candidate.id, 0.95, true);
    tester.recordResult('t1', candidate.id, 0.95, true);

    const result = tester.checkPromotion('T44', 'system');
    expect(result.data!.promoted).toBe(false);
  });

  it('should not promote when no candidates', () => {
    const store2 = new PromptVersionStore();
    store2.registerVersion(makeVersion({ status: 'champion' }));
    const tester2 = new PromptAbTester(store2);

    const result = tester2.checkPromotion('T44', 'system');
    expect(result.data!.promoted).toBe(false);
    expect(result.data!.reason).toContain('No candidates');
  });

  it('should not promote when auto-promote disabled', () => {
    const tester2 = new PromptAbTester(store, {
      promotionConfig: { autoPromote: false },
    });
    for (let i = 0; i < 10; i++) {
      tester2.recordResult('t1', champion.id, 0.5, true);
      tester2.recordResult('t1', candidate.id, 0.95, true);
    }
    const result = tester2.checkPromotion('T44', 'system');
    expect(result.data!.promoted).toBe(false);
    expect(result.data!.reason).toContain('disabled');
  });

  it('should support configurable split ratio', () => {
    // 50/50 split
    const tester5050 = new PromptAbTester(store, { championRatio: 0.5 });
    let championCount = 0;
    for (let i = 0; i < 200; i++) {
      const result = tester5050.selectPrompt('t1', 'T44', 'system');
      if (result.data!.id === champion.id) championCount++;
    }
    // Should be roughly 50% ± margin
    expect(championCount).toBeGreaterThan(60);
    expect(championCount).toBeLessThan(140);
  });

  it('should return DataProcessResult (DNA-3)', () => {
    const result = tester.selectPrompt('t1', 'T44', 'system');
    expect(result).toBeInstanceOf(DataProcessResult);
  });
});
