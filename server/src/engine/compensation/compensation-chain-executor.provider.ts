// file: server/src/engine/compensation/compensation-chain-executor.provider.ts
// LIFO saga executor implementation.
// GAP-17-01: Added register()/compensate() for ESCROW_SAGA (T236) variable-length chains.

import { Injectable, Logger } from '@nestjs/common';
import {
  ICompensationChainExecutor,
  SagaStep,
  SagaExecutionResult,
  CompensationStep,
  SagaContext,
} from './compensation-chain-executor.interface';
import { DataProcessResult } from '../../kernel/data-process-result';

@Injectable()
export class CompensationChainExecutorProvider implements ICompensationChainExecutor {
  private readonly logger = new Logger(CompensationChainExecutorProvider.name);

  // GAP-17-01: Named compensation chains registered by sagaId.
  // Key: sagaId (e.g. 'T236-ESCROW_SAGA')
  // Value: steps in FORWARD (C1→C2→C3) order — compensate() reverses them.
  private readonly chains = new Map<string, CompensationStep[]>();

  async executeSaga(steps: SagaStep[]): Promise<SagaExecutionResult> {
    const stepResults: SagaExecutionResult['stepResults'] = [];
    let failedAtStep: number | undefined;
    let failedStepName: string | undefined;
    let error: string | undefined;

    // Forward execution
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      try {
        this.logger.log(`Saga: executing step ${i} — ${step.name}`);
        const result = await step.execute();
        stepResults.push({ step: step.name, result });
      } catch (err) {
        failedAtStep = i;
        failedStepName = step.name;
        error = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Saga: step ${i} (${step.name}) failed — ${error}`);
        break;
      }
    }

    // If no failure, saga succeeded
    if (failedAtStep === undefined) {
      return {
        success: true,
        stepResults,
        compensatedSteps: [],
      };
    }

    // LIFO compensation: steps[0..failedAtStep-1] reversed
    // steps[failedAtStep] itself did not complete — no compensation needed for it
    const stepsToCompensate = steps.slice(0, failedAtStep).reverse();
    const compensatedSteps: string[] = [];

    for (const step of stepsToCompensate) {
      try {
        this.logger.log(`Saga compensation: executing compensate for ${step.name}`);
        await step.compensate();
        compensatedSteps.push(step.name);
      } catch (compensationErr) {
        const compErrMsg =
          compensationErr instanceof Error ? compensationErr.message : String(compensationErr);
        // Log but do not throw — compensation is best-effort; all steps must be attempted
        this.logger.error(
          `Saga compensation FAILED for ${step.name}: ${compErrMsg}. Manual intervention required.`,
        );
        compensatedSteps.push(`${step.name}:FAILED`);
      }
    }

    return {
      success: false,
      failedAtStep,
      failedStepName,
      error,
      stepResults,
      compensatedSteps,
    };
  }

  // ── GAP-17-01: register() / compensate() ──────────────────────────────────

  /**
   * Register a named compensation chain.
   * Steps MUST be provided in FORWARD order (C1→C2→C3).
   * compensate() will execute them in REVERSE (C3→C2→C1) — LIFO. SACRED.
   */
  register(sagaId: string, steps: CompensationStep[]): void {
    this.chains.set(sagaId, steps);
    this.logger.log(`Registered compensation chain '${sagaId}' with ${steps.length} step(s)`);
  }

  /**
   * Execute all compensation steps for the given sagaId in LIFO order.
   * Registered in C1→C2→C3 order → runs C3→C2→C1 (reversed). SACRED.
   * Default onFailure=CONTINUE: all steps attempted even if one fails.
   */
  async compensate(sagaId: string, context: SagaContext): Promise<DataProcessResult<void>> {
    const steps = this.chains.get(sagaId);
    if (!steps || steps.length === 0) {
      return DataProcessResult.failure(
        'NO_CHAIN',
        `No compensation chain registered for sagaId: ${sagaId}`,
      );
    }

    // LIFO: reverse the registration order so C3 runs first, C2 second, C1 last.
    const lifoSteps = [...steps].reverse();

    for (const step of lifoSteps) {
      this.logger.log(`LIFO compensation: executing ${step.stepId} — ${step.description}`);
      try {
        const result = await step.execute(context);
        if (!result.isSuccess) {
          this.logger.warn(
            `Compensation step ${step.stepId} reported failure: ${result.errorMessage}`,
          );
          if (step.onFailure === 'HALT') {
            return DataProcessResult.failure(
              'COMPENSATION_HALTED',
              `Step ${step.stepId} halted compensation chain for saga '${sagaId}'`,
            );
          }
          // CONTINUE (default) — proceed to next step regardless of failure
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `Compensation step ${step.stepId} threw: ${msg}. Manual intervention may be required.`,
        );
        if (step.onFailure === 'HALT') {
          return DataProcessResult.failure(
            'COMPENSATION_HALTED',
            `Step ${step.stepId} threw and halted compensation chain for saga '${sagaId}'`,
          );
        }
        // CONTINUE — attempt remaining steps
      }
    }

    return DataProcessResult.success(undefined);
  }
}
