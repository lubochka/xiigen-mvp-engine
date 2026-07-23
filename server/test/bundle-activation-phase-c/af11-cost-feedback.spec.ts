/**
 * FLOW-00.3 Phase C — AF-11 cost feedback tests
 *
 * ACF-1: AF-11 feedback record includes cost_usd when generation ran
 * ACF-2: AF-11 feedback record has cost_usd = 0 when no generation
 * ACF-3: FeedbackStats.avg_cost_per_run calculated correctly over 5 records
 * ACF-4: FeedbackStats.total_cost_usd is sum of all runs
 */

import { FeedbackStation } from '../../src/af-stations/af11-feedback';
import { StationInput } from '../../src/af-stations/base';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeInput(opts?: {
  tenantId?: string;
  taskType?: string;
  generationResults?: Array<Record<string, unknown>>;
}): StationInput {
  return new StationInput({
    tenantId: opts?.tenantId ?? 'test-tenant',
    taskType: opts?.taskType ?? 'T-TEST',
    spec: { name: 'TestService' },
    generationResults: opts?.generationResults ?? [],
  });
}

function makeGenerationResult(
  cost: number,
  model = 'mock-claude',
  tokensIn = 100,
  tokensOut = 50,
): Record<string, unknown> {
  return {
    step_id: 'step-1',
    code: 'export class Foo {}',
    model,
    tokens_used: { input: tokensIn, output: tokensOut },
    cost,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AF11FeedbackStation — Cost Feedback [ACF]', () => {
  let station: FeedbackStation;

  beforeEach(() => {
    station = new FeedbackStation();
  });

  describe('ACF-1: feedback includes cost_usd when generation ran', () => {
    it('buildFeedback() result has cost_usd > 0 when PipelineResult includes cost', async () => {
      const input = makeInput({
        generationResults: [makeGenerationResult(0.0847)],
      });

      const result = await station.execute(input);
      expect(result.isSuccess).toBe(true);

      // Verify via getStats — the recorded feedback has cost_usd
      const stats = station.getStats('T-TEST');
      expect(stats).not.toBeNull();
      expect(stats!.total_cost_usd).toBeCloseTo(0.0847, 6);
      expect(stats!.avg_cost_per_run).toBeCloseTo(0.0847, 6);
    });
  });

  describe('ACF-2: feedback has cost_usd = 0 when no generation', () => {
    it('buildFeedback() result has cost_usd = 0 when no AI was invoked', async () => {
      const input = makeInput({
        generationResults: [], // no generation results
      });

      await station.execute(input);

      const stats = station.getStats('T-TEST');
      expect(stats).not.toBeNull();
      expect(stats!.total_cost_usd).toBe(0);
      expect(stats!.avg_cost_per_run).toBe(0);
    });
  });

  describe('ACF-3: FeedbackStats.avg_cost_per_run calculated correctly', () => {
    it('avg_cost_per_run = total_cost / count across 5 feedback records', async () => {
      const costs = [0.1, 0.2, 0.3, 0.4, 0.5];
      const taskType = 'T-COST-AVG';

      for (const cost of costs) {
        const input = makeInput({
          taskType,
          generationResults: [makeGenerationResult(cost)],
        });
        await station.execute(input);
      }

      const stats = station.getStats(taskType);
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(5);
      expect(stats!.total_cost_usd).toBeCloseTo(1.5, 6);
      expect(stats!.avg_cost_per_run).toBeCloseTo(0.3, 6);
    });
  });

  describe('ACF-4: FeedbackStats.total_cost_usd is sum of all runs', () => {
    it('total_cost_usd aggregates across all records for a task type', async () => {
      const taskType = 'T-COST-SUM';
      const costs = [0.05, 0.1, 0.07];

      for (const cost of costs) {
        const input = makeInput({
          taskType,
          generationResults: [makeGenerationResult(cost)],
        });
        await station.execute(input);
      }

      const stats = station.getStats(taskType);
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(3);
      expect(stats!.total_cost_usd).toBeCloseTo(0.22, 6);
    });
  });
});
