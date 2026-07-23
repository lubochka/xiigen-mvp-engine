/**
 * DifficultyPredictorService unit tests (SESSION-P-4).
 * Calibrated against FLOW-03 predictions:
 *   T59 (ORCHESTRATION, seen in FLOW-01+02) → cycleBudget=1
 *   T60 (REGISTRATION, first occurrence, 3 iron rules) → cycleBudget=3
 *   T61 (PROCESSING, 2 prior) → cycleBudget=2
 *   T62 (ROUTING, 2 prior) → cycleBudget=2
 */

import { DifficultyPredictorService } from './difficulty-predictor.service';
import { DataProcessResult } from '../../kernel/data-process-result';

const makeDbResult = <T>(data: T[]) =>
  DataProcessResult.success(data as Array<Record<string, unknown>>);

function buildMocks() {
  const mockDbService = { searchDocuments: jest.fn() };
  const service = new DifficultyPredictorService(mockDbService as any);
  return { service, mockDbService };
}

describe('DifficultyPredictorService', () => {
  let service: DifficultyPredictorService;
  let mockDbService: { searchDocuments: jest.Mock };

  beforeEach(() => {
    const mocks = buildMocks();
    service = mocks.service;
    mockDbService = mocks.mockDbService;
  });

  // ── T60: REGISTRATION, first occurrence, 3 iron rules → cycleBudget=3 ─────

  it('predicts cycleBudget=3 for novel REGISTRATION archetype with 3 iron rules (T60)', async () => {
    // 0 prior archetype occurrences, 0 existing task type patterns
    mockDbService.searchDocuments
      .mockResolvedValueOnce(makeDbResult([])) // archetype count: 0
      .mockResolvedValueOnce(makeDbResult([])); // task type count: 0

    const result = await service.predict({
      taskTypeId: 'T60',
      archetype: 'REGISTRATION',
      ironRules: [
        { ruleId: 'IR-1', text: 'Atomic slot allocation' },
        { ruleId: 'IR-2', text: 'Null capacity = unlimited' },
        { ruleId: 'IR-3', text: 'Idempotency key required' },
      ],
    });

    expect(result.cycleBudget).toBe(3);
    expect(result.noveltyScore).toBeGreaterThanOrEqual(3);
    expect(result.noveltyFactors.length).toBeGreaterThan(0);
  });

  // ── T59: ORCHESTRATION, seen in FLOW-01+02 → cycleBudget=1 ───────────────

  it('predicts cycleBudget=1 for well-established ORCHESTRATION archetype (T59)', async () => {
    // 2 prior archetype occurrences, 1 existing task type pattern
    mockDbService.searchDocuments
      .mockResolvedValueOnce(makeDbResult([{ id: 'p1' }, { id: 'p2' }])) // 2 prior
      .mockResolvedValueOnce(makeDbResult([{ id: 'tp1' }])); // 1 existing

    const result = await service.predict({
      taskTypeId: 'T59',
      archetype: 'ORCHESTRATION',
      ironRules: [{ ruleId: 'IR-1', text: 'Log all state transitions' }],
    });

    expect(result.cycleBudget).toBe(1);
    expect(result.noveltyScore).toBe(0);
    expect(result.noveltyFactors).toHaveLength(0);
  });

  // ── T61: PROCESSING archetype, 2 prior → cycleBudget=2 ───────────────────

  it('predicts cycleBudget=2 for somewhat-novel PROCESSING archetype (T61)', async () => {
    // 0 task type patterns → +1 novelty, 2 prior archetype → no archetype bonus
    mockDbService.searchDocuments
      .mockResolvedValueOnce(makeDbResult([{ id: 'p1' }, { id: 'p2' }])) // 2 prior archetype
      .mockResolvedValueOnce(makeDbResult([])); // 0 task type patterns

    const result = await service.predict({
      taskTypeId: 'T61',
      archetype: 'PROCESSING',
      ironRules: [{ ruleId: 'IR-1', text: 'Idempotent processing' }],
    });

    expect(result.cycleBudget).toBe(2);
    expect(result.noveltyScore).toBe(1);
  });

  // ── noveltyFactors contents ───────────────────────────────────────────────

  it('includes descriptive novelty factor strings for each trigger', async () => {
    mockDbService.searchDocuments
      .mockResolvedValueOnce(makeDbResult([])) // archetype: 0 prior
      .mockResolvedValueOnce(makeDbResult([])); // task type: 0 patterns

    const result = await service.predict({
      taskTypeId: 'T60',
      archetype: 'REGISTRATION',
      ironRules: [
        { ruleId: 'IR-1', text: 'Rule 1' },
        { ruleId: 'IR-2', text: 'Rule 2' },
        { ruleId: 'IR-3', text: 'Rule 3' },
      ],
    });

    // Should mention archetype name, task type id
    expect(result.noveltyFactors.some((f) => f.includes('REGISTRATION'))).toBe(true);
    expect(result.noveltyFactors.some((f) => f.includes('T60'))).toBe(true);
  });

  // ── many iron rules + low prior patterns → +1 novelty ────────────────────

  it('adds iron-rule novelty when >2 iron rules and <2 prior patterns', async () => {
    mockDbService.searchDocuments
      .mockResolvedValueOnce(makeDbResult([{ id: 'p1' }])) // 1 prior archetype (< 2)
      .mockResolvedValueOnce(makeDbResult([{ id: 't1' }])); // 1 task type pattern (existing)

    const result = await service.predict({
      taskTypeId: 'T65',
      archetype: 'REGISTRATION',
      ironRules: [
        { ruleId: 'IR-1', text: 'Rule 1' },
        { ruleId: 'IR-2', text: 'Rule 2' },
        { ruleId: 'IR-3', text: 'Rule 3' },
      ],
    });

    // novelty: priorArchetype=1 (no +2), ironRules=3 + prior<2 (+1), existingPattern=1 (no +1)
    expect(result.noveltyScore).toBe(1);
    expect(result.cycleBudget).toBe(2);
  });

  // ── DB failure is tolerated gracefully ───────────────────────────────────

  it('treats DB failure as 0 occurrences (conservative prediction)', async () => {
    mockDbService.searchDocuments
      .mockResolvedValueOnce(DataProcessResult.failure('TIMEOUT', 'ES timeout'))
      .mockResolvedValueOnce(DataProcessResult.failure('TIMEOUT', 'ES timeout'));

    const result = await service.predict({
      taskTypeId: 'T99',
      archetype: 'UNKNOWN',
      ironRules: [],
    });

    // With 0 prior occurrences (from failure fallback) → archetype +2, no task type pattern +1
    // noveltyScore = 3 → cycleBudget = 3
    expect(result.cycleBudget).toBe(3);
  });

  // ── No iron rules → iron rule factor not triggered ───────────────────────

  it('does not add iron rule novelty factor when ironRules is empty', async () => {
    mockDbService.searchDocuments
      .mockResolvedValueOnce(makeDbResult([])) // 0 prior
      .mockResolvedValueOnce(makeDbResult([])); // 0 task type

    const result = await service.predict({
      taskTypeId: 'T70',
      archetype: 'NEW_ARCH',
      ironRules: [],
    });

    // archetype +2, no iron rule bonus (empty), task type +1 → score=3
    expect(result.noveltyScore).toBe(3);
    // Iron rule factor string should NOT be present
    expect(result.noveltyFactors.some((f) => f.includes('iron rule'))).toBe(false);
  });

  // ── cycleBudget boundaries ────────────────────────────────────────────────

  it('returns cycleBudget=1 when noveltyScore is exactly 0', async () => {
    mockDbService.searchDocuments
      .mockResolvedValueOnce(makeDbResult([{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }]))
      .mockResolvedValueOnce(makeDbResult([{ id: 't1' }, { id: 't2' }]));

    const result = await service.predict({
      taskTypeId: 'T59',
      archetype: 'ORCHESTRATION',
      ironRules: [],
    });

    expect(result.cycleBudget).toBe(1);
    expect(result.noveltyScore).toBe(0);
  });

  it('returns cycleBudget=2 when noveltyScore is exactly 1', async () => {
    // Only task-type novelty triggered
    mockDbService.searchDocuments
      .mockResolvedValueOnce(makeDbResult([{ id: 'p1' }, { id: 'p2' }])) // 2 prior archetype
      .mockResolvedValueOnce(makeDbResult([])); // 0 task type

    const result = await service.predict({
      taskTypeId: 'T80',
      archetype: 'ORCHESTRATION',
      ironRules: [],
    });

    expect(result.cycleBudget).toBe(2);
    expect(result.noveltyScore).toBe(1);
  });

  it('returns cycleBudget=3 when noveltyScore is exactly 3', async () => {
    mockDbService.searchDocuments
      .mockResolvedValueOnce(makeDbResult([])) // 0 prior archetype → +2
      .mockResolvedValueOnce(makeDbResult([])); // 0 task type → +1

    const result = await service.predict({
      taskTypeId: 'T90',
      archetype: 'BRAND_NEW',
      ironRules: [],
    });

    expect(result.cycleBudget).toBe(3);
    expect(result.noveltyScore).toBe(3);
  });
});
