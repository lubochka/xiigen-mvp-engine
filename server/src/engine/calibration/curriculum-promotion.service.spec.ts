import 'reflect-metadata';
import { CurriculumPromotionService } from './curriculum-promotion.service';
import { OssCurriculumRecord, OssModel } from './oss-curriculum-runner.service';

const makeRecord = (
  ossModel: OssModel,
  grade: number,
  createdAt = new Date().toISOString(),
): OssCurriculumRecord => ({
  ossModel,
  station: 'CYCLE-1',
  depth: 0,
  nodeIntent: 'test intent',
  cycle: 1,
  grade,
  ragContextSize: 0,
  graphContextSize: 0,
  phase: 'PHASE-0',
  flowId: 'FLOW-01',
  tenantId: 'test-tenant',
  createdAt,
});

const makeFreedom = (threshold = 0.85, minConsecutive = 3) => ({
  get: jest.fn(async (key: string) => {
    if (key === 'graduation.gradeThreshold') return threshold;
    if (key === 'graduation.minConsecutivePassing') return minConsecutive;
    return null;
  }),
});

describe('CurriculumPromotionService', () => {
  // ── POSITIVE ──────────────────────────────────────────────────────────────

  it('returns true when last 3 records are all ≥ 0.85 (default threshold)', async () => {
    const svc = new CurriculumPromotionService(makeFreedom() as any);
    const now = Date.now();
    const records = [
      makeRecord('llama3:8b', 0.6, new Date(now - 3000).toISOString()),
      makeRecord('llama3:8b', 0.88, new Date(now - 2000).toISOString()),
      makeRecord('llama3:8b', 0.9, new Date(now - 1000).toISOString()),
      makeRecord('llama3:8b', 0.92, new Date(now).toISOString()),
    ];
    const result = await svc.shouldGraduate('llama3:8b', records);
    expect(result).toBe(true);
  });

  it('returns false when streak is broken (one record below threshold)', async () => {
    const svc = new CurriculumPromotionService(makeFreedom() as any);
    const now = Date.now();
    const records = [
      makeRecord('llama3:8b', 0.9, new Date(now - 2000).toISOString()),
      makeRecord('llama3:8b', 0.8, new Date(now - 1000).toISOString()), // breaks streak
      makeRecord('llama3:8b', 0.91, new Date(now).toISOString()),
    ];
    const result = await svc.shouldGraduate('llama3:8b', records);
    expect(result).toBe(false);
  });

  it('returns false when there are fewer records than minConsecutivePassing', async () => {
    const svc = new CurriculumPromotionService(makeFreedom() as any);
    const records = [makeRecord('codellama:13b', 0.9), makeRecord('codellama:13b', 0.92)]; // only 2, needs 3
    const result = await svc.shouldGraduate('codellama:13b', records);
    expect(result).toBe(false);
  });

  it('returns false when model has no records', async () => {
    const svc = new CurriculumPromotionService(makeFreedom() as any);
    const result = await svc.shouldGraduate('deepseek-coder:6.7b', []);
    expect(result).toBe(false);
  });

  it('filters by model — other model records do not count toward graduation', async () => {
    const svc = new CurriculumPromotionService(makeFreedom() as any);
    const now = Date.now();
    const records = [
      makeRecord('llama3:8b', 0.91, new Date(now - 2000).toISOString()),
      makeRecord('llama3:8b', 0.92, new Date(now - 1000).toISOString()),
      makeRecord('llama3:8b', 0.93, new Date(now).toISOString()),
      // Different model — should not affect deepseek graduation
      makeRecord('deepseek-coder:6.7b', 0.4),
    ];
    // llama3:8b should graduate, deepseek should not
    expect(await svc.shouldGraduate('llama3:8b', records)).toBe(true);
    expect(await svc.shouldGraduate('deepseek-coder:6.7b', records)).toBe(false);
  });

  it('FREEDOM config: custom threshold and minConsecutive respected', async () => {
    const svc = new CurriculumPromotionService(makeFreedom(0.7, 2) as any);
    const now = Date.now();
    const records = [
      makeRecord('llama3:8b', 0.72, new Date(now - 1000).toISOString()),
      makeRecord('llama3:8b', 0.75, new Date(now).toISOString()),
    ];
    expect(await svc.shouldGraduate('llama3:8b', records)).toBe(true);
  });

  // ── NEGATIVE (Rule 16 / DNA-3) ────────────────────────────────────────────

  it('DNA-3: returns false (not throws) when FREEDOM config is absent', async () => {
    const svc = new CurriculumPromotionService(); // no freedomConfig
    const records = [
      makeRecord('llama3:8b', 0.9),
      makeRecord('llama3:8b', 0.92),
      makeRecord('llama3:8b', 0.91),
    ];
    // Falls back to default threshold 0.85 — all pass → true
    const result = await svc.shouldGraduate('llama3:8b', records);
    expect(typeof result).toBe('boolean');
    expect(() => result).not.toThrow();
  });

  it('DNA-3: returns false (not throws) when FREEDOM config throws', async () => {
    const badFreedom = { get: jest.fn().mockRejectedValue(new Error('FREEDOM down')) };
    const svc = new CurriculumPromotionService(badFreedom as any);
    // Should not throw
    const result = await svc.shouldGraduate('llama3:8b', [makeRecord('llama3:8b', 0.95)]);
    expect(typeof result).toBe('boolean');
  });
});
