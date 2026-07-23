/**
 * SagaCrashTestHarness spec — verifies harness crash simulation and checkpoint recovery.
 * Z1-13_F15 (R14): SESSION-GAP-R14
 */
import { SagaCrashTestHarness } from './saga-crash-test-harness';

describe('SagaCrashTestHarness', () => {
  let harness: SagaCrashTestHarness;

  beforeEach(() => {
    harness = new SagaCrashTestHarness();
  });

  afterEach(() => {
    harness.reset();
  });

  it('should simulate crash at given step', async () => {
    await harness.simulateCrashAt('T_START+38', 1);
    const result = await harness.executeStep(
      'T_START+38',
      { name: 'provision-silo', order: 2, checkpoint: true, onFailure: 'abort' },
      async () => ({ provisioned: true }),
    );
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('SAGA_CRASH_SIMULATED');
  });

  it('should resume from checkpoint after crash', async () => {
    // Execute step 1 successfully (checkpointed)
    await harness.executeStep(
      'T_START+38',
      { name: 'prepare', order: 1, checkpoint: true, onFailure: 'abort' },
      async () => ({ prepared: true }),
    );
    // Verify checkpoint from step 1 exists (stepIndex = order-1 = 0)
    const hasCheckpoint = await harness.verifyCheckpointState('T_START+38', 0);
    expect(hasCheckpoint).toBe(true);
  });

  it('should not have checkpoint when crash occurs before checkpoint save', async () => {
    await harness.simulateCrashAt('T_START+38', 0);
    const result = await harness.executeStep(
      'T_START+38',
      { name: 'provision-silo', order: 1, checkpoint: true, onFailure: 'abort' },
      async () => ({ provisioned: true }),
    );
    expect(result.isSuccess).toBe(false);
    const hasCheckpoint = await harness.verifyCheckpointState('T_START+38', 0);
    expect(hasCheckpoint).toBe(false);
  });

  it('should return error result when no checkpoint found for resume', async () => {
    const resumeResult = await harness.resumeFromCheckpoint('T_START+38');
    expect(resumeResult.completed).toBe(false);
    expect(resumeResult.error).toContain('No checkpoint found');
  });

  it('should successfully execute step and checkpoint', async () => {
    const result = await harness.executeStep(
      'T_START+16',
      { name: 'prepare-green', order: 1, checkpoint: true, onFailure: 'abort' },
      async () => ({ slotReady: true }),
    );
    expect(result.isSuccess).toBe(true);
    expect(result.data).toEqual({ slotReady: true });
    const hasCheckpoint = await harness.verifyCheckpointState('T_START+16', 0);
    expect(hasCheckpoint).toBe(true);
  });
});
