/**
 * Tests for PlanningStation.runPlanningGate.
 * Phase 11 — File 3 gate.
 */

import { PlanningStation } from '../../src/af-stations/af2-planning';
import { StationInput } from '../../src/af-stations/base';

const makeSteps = (
  count: number,
  base: Partial<Record<string, unknown>> = {},
): Array<Record<string, unknown>> =>
  Array.from({ length: count }, (_, i) => ({
    step_id: `step-${i + 1}`,
    description: `Step ${i + 1}`,
    ...base,
  }));

describe('PlanningStation.runPlanningGate', () => {
  let station: PlanningStation;

  beforeEach(() => {
    station = new PlanningStation();
  });

  it('PASS when ≤5 steps with clean descriptions', () => {
    const result = station.runPlanningGate(makeSteps(4), {});
    expect(result.isSuccess).toBe(true);
  });

  it('FAIL PLAN_TOO_MANY_STEPS when 6 steps', () => {
    const result = station.runPlanningGate(makeSteps(6), {});
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('PLAN_TOO_MANY_STEPS');
  });

  it('FAIL PLAN_DNA1_VIOLATION when a step description contains "class Foo {"', () => {
    const steps = makeSteps(2);
    steps[1].description = 'Generate class OrderService { constructor() {} }';
    const result = station.runPlanningGate(steps, {});
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('PLAN_DNA1_VIOLATION');
  });

  it('FAIL PLAN_DUPLICATE_STEP_IDS when two steps share an id', () => {
    const steps = makeSteps(3);
    steps[2].step_id = 'step-1'; // duplicate of first
    const result = station.runPlanningGate(steps, {});
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('PLAN_DUPLICATE_STEP_IDS');
  });

  it('execute() propagates gate failure when gate check fails', async () => {
    // Register a rule with 6 steps to trigger PLAN_TOO_MANY_STEPS
    station.registerRule('TEST_ARCH', makeSteps(6));
    const input = new StationInput({
      tenantId: 't1',
      taskType: 'test-task',
      spec: { archetype: 'TEST_ARCH' },
    });
    const result = await station.execute(input);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('PLAN_TOO_MANY_STEPS');
  });
});
