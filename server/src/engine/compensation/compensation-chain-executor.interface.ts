// file: server/src/engine/compensation/compensation-chain-executor.interface.ts
// LIFO saga executor interface for T221 checkout saga.
// GAP-17-01: Extended with CompensationStep / SagaContext for ESCROW_SAGA (T236).

export const COMPENSATION_CHAIN_EXECUTOR = Symbol('COMPENSATION_CHAIN_EXECUTOR');

/**
 * A single step in a saga.
 * execute() runs the forward action.
 * compensate() undoes it — called in LIFO order on failure.
 */
export interface SagaStep {
  name: string;
  execute: () => Promise<Record<string, unknown>>;
  compensate: () => Promise<void>;
}

// ── GAP-17-01: CompensationStep + SagaContext (ESCROW_SAGA / T236) ────────────

/**
 * Context passed to every CompensationStep.execute() call.
 * Carries saga-level metadata (sagaId, correlationId) and
 * arbitrary context data the step may need.
 */
export interface SagaContext {
  sagaId: string;
  correlationId: string;
  /** Arbitrary step-specific data passed at compensate() call time. */
  [key: string]: unknown;
}

/**
 * A single compensation step in a pure-compensation chain (ESCROW_SAGA pattern).
 *
 * Register steps in FORWARD order (C1→C2→C3).
 * Executor runs them in REVERSE order (C3→C2→C1) — LIFO. SACRED.
 *
 * onFailure: 'CONTINUE' (default) — attempt all steps even if one fails.
 *            'HALT'               — stop on first failure.
 */
export interface CompensationStep {
  /** Step identifier: C1, C2, C3, … */
  stepId: string;
  description: string;
  execute: (
    context: SagaContext,
  ) => Promise<import('../../kernel/data-process-result').DataProcessResult<unknown>>;
  isIdempotent: boolean;
  onFailure?: 'CONTINUE' | 'HALT'; // default: CONTINUE
}

export interface SagaExecutionResult {
  success: boolean;
  /**
   * Index of the step that failed (0-based). Undefined if all steps succeeded.
   */
  failedAtStep?: number;
  failedStepName?: string;
  error?: string;
  /**
   * Results from each successfully completed forward step.
   */
  stepResults: Array<{ step: string; result: Record<string, unknown> }>;
  /**
   * Steps that were compensated, in LIFO order.
   */
  compensatedSteps: string[];
}

/**
 * ICompensationChainExecutor — LIFO saga executor.
 *
 * LIFO INVARIANT: compensation steps execute in reverse order of execution.
 * steps.slice(0, failedAtStep).reverse() — this is STRUCTURAL, not configurable.
 *
 * T221 LIFO ORDER IS SACRED:
 *   Forward:      S1 → S2 → S3 → S4 → S5
 *   Compensation: C4 → C3 → C2 → C1  (S5 has no compensation)
 *
 * GAP-17-01: Extended with register()/compensate() for ESCROW_SAGA pattern (T236).
 *   Register steps in C1→C2→C3 order.
 *   Executor runs in C3→C2→C1 order (LIFO). SACRED.
 */
export interface ICompensationChainExecutor {
  /**
   * Execute a saga: run all steps in order.
   * On failure at step N, compensate steps 0..N-1 in LIFO order.
   */
  executeSaga(steps: SagaStep[]): Promise<SagaExecutionResult>;

  /**
   * GAP-17-01: Register a variable-length compensation chain.
   * Steps registered in FORWARD order (C1→C2→C3).
   * compensate() will run them in REVERSE order (C3→C2→C1) — LIFO.
   */
  register(sagaId: string, steps: CompensationStep[]): void;

  /**
   * GAP-17-01: Execute all compensation steps for the given sagaId in LIFO order.
   * Steps are run in reverse of registration order (LIFO).
   * Default onFailure=CONTINUE: all steps attempted even if one fails.
   */
  compensate(
    sagaId: string,
    context: SagaContext,
  ): Promise<import('../../kernel/data-process-result').DataProcessResult<void>>;
}
