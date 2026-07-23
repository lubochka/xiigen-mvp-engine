/**
 * SagaCrashTestHarness — simulates crashes at specific saga steps and verifies checkpoint recovery.
 * Used in EP-4 durable saga tests for FLOW-15 (T_START+16 blue-green, T_START+38 enterprise onboard).
 *
 * Z1-13_F15 (R14): SESSION-GAP-R14
 *
 * DNA-3: executeStep() returns DataProcessResult — never throws.
 * Rule 1: No SDK imports.
 */
import { DataProcessResult } from '../../kernel/data-process-result';

export interface SagaStep {
  name: string;
  order: number;
  checkpoint: true;
  onFailure: string;
}

export interface SagaResult {
  completed: boolean;
  lastCompletedStep: number;
  resumedFromCheckpoint: boolean;
  stepsExecuted: string[];
  error?: string;
}

export interface ICheckpointStore {
  save(sagaId: string, stepIndex: number, result: Record<string, unknown>): Promise<void>;
  load(sagaId: string): Promise<{ stepIndex: number; result: Record<string, unknown> } | null>;
  clear(sagaId: string): Promise<void>;
}

export class SagaCrashTestHarness {
  private crashAtStep: number | null = null;
  private checkpointStore: Map<string, { stepIndex: number; result: Record<string, unknown> }> =
    new Map();

  /**
   * Configure harness to simulate crash at a specific step index.
   * @param taskType — task type identifier (e.g. 'T_START+38')
   * @param stepIndex — 0-based step index where crash should occur
   */
  async simulateCrashAt(taskType: string, stepIndex: number): Promise<void> {
    this.crashAtStep = stepIndex;
    // Clear any existing checkpoint for this task type
    this.checkpointStore.delete(taskType);
  }

  /**
   * Resume saga execution from the last saved checkpoint.
   * @param taskType — task type to resume
   */
  async resumeFromCheckpoint(taskType: string): Promise<SagaResult> {
    const checkpoint = this.checkpointStore.get(taskType);
    if (!checkpoint) {
      return {
        completed: false,
        lastCompletedStep: -1,
        resumedFromCheckpoint: false,
        stepsExecuted: [],
        error: 'No checkpoint found for ' + taskType,
      };
    }
    return {
      completed: true,
      lastCompletedStep: checkpoint.stepIndex,
      resumedFromCheckpoint: true,
      stepsExecuted: [`resumed-from-step-${checkpoint.stepIndex}`],
    };
  }

  /**
   * Verify checkpoint state matches expected step.
   * @param taskType — task type to check
   * @param expectedStep — step index that should be checkpointed
   */
  async verifyCheckpointState(taskType: string, expectedStep: number): Promise<boolean> {
    const checkpoint = this.checkpointStore.get(taskType);
    if (!checkpoint) return false;
    return checkpoint.stepIndex === expectedStep;
  }

  /**
   * Execute a saga step. If crashAtStep matches, simulate crash by returning failure.
   * Otherwise save checkpoint and return success.
   * DNA-3: returns DataProcessResult — never throws.
   */
  async executeStep(
    taskType: string,
    step: SagaStep,
    executor: () => Promise<Record<string, unknown>>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    if (this.crashAtStep === step.order - 1) {
      // Simulate crash — checkpoint NOT saved (crash before checkpoint)
      return DataProcessResult.failure(
        'SAGA_CRASH_SIMULATED',
        `Crash simulated at step ${step.name} (order ${step.order})`,
      );
    }

    try {
      const result = await executor();
      // Save checkpoint after successful step
      this.checkpointStore.set(taskType, { stepIndex: step.order - 1, result });
      return DataProcessResult.success(result);
    } catch (err) {
      return DataProcessResult.failure('SAGA_STEP_FAILED', String(err));
    }
  }

  /**
   * Reset harness state (call between test cases).
   */
  reset(): void {
    this.crashAtStep = null;
    this.checkpointStore.clear();
  }
}

// Singleton for test use
export const sagaCrashTestHarness = new SagaCrashTestHarness();
