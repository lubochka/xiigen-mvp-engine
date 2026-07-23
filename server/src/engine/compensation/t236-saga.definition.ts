// file: server/src/engine/compensation/t236-saga.definition.ts
// T236 MilestoneCreationFundingGate — ESCROW_SAGA 3-step compensation chain.
// GAP-17-01: C3→C2→C1 LIFO order. SACRED.
//
// Registration order: C1→C2→C3 (forward).
// Execution order:    C3→C2→C1 (LIFO — reversed by CompensationChainExecutorProvider).
//
// C1: Mark milestone FUNDING_FAILED
// C2: Reverse fee calculation (no-op — computed, never stored)
// C3: Release escrow hold via F606 (runs FIRST in LIFO — most critical reversal)

import { CompensationStep, SagaContext } from './compensation-chain-executor.interface';
import { DataProcessResult } from '../../kernel/data-process-result';

export const T236_SAGA_ID = 'T236-ESCROW_SAGA';

/**
 * Build the 3-step compensation chain for T236 ESCROW_SAGA.
 *
 * @param services — fabric dependencies injected at call time
 *   milestoneStore: store to mark milestone FUNDING_FAILED
 *   escrowFundService: F606 IEscrowFundService — releases hold
 */
export function buildT236CompensationSteps(services: {
  milestoneStore: {
    markFundingFailed: (
      milestoneId: string,
      correlationId: string,
    ) => Promise<DataProcessResult<unknown>>;
  };
  escrowFundService: {
    releaseFundsAsync: (
      milestoneId: string,
      idempotencyKey: string,
      correlationId: string,
    ) => Promise<DataProcessResult<unknown>>;
  };
}): CompensationStep[] {
  // Registered in FORWARD order (C1→C2→C3).
  // Executor runs in REVERSE order (C3→C2→C1). SACRED.
  return [
    {
      stepId: 'C1',
      description: 'Mark milestone FUNDING_FAILED',
      isIdempotent: false,
      onFailure: 'CONTINUE',
      execute: async (ctx: SagaContext): Promise<DataProcessResult<unknown>> => {
        const milestoneId = String(ctx['milestoneId'] ?? '');
        return services.milestoneStore.markFundingFailed(milestoneId, ctx.correlationId);
      },
    },
    {
      stepId: 'C2',
      description: 'Reverse fee calculation (no-op — fee is derived, never stored)',
      isIdempotent: true,
      onFailure: 'CONTINUE',
      execute: async (_ctx: SagaContext): Promise<DataProcessResult<unknown>> => {
        // INV-17-derived: fee is computed at query time, never persisted.
        // No actual reversal action needed here.
        return DataProcessResult.success({
          note: 'fee reversal is a no-op — derived_never_stored',
        });
      },
    },
    {
      stepId: 'C3',
      description: 'Release escrow hold via F606 — runs FIRST in LIFO',
      isIdempotent: true,
      onFailure: 'CONTINUE',
      execute: async (ctx: SagaContext): Promise<DataProcessResult<unknown>> => {
        const milestoneId = String(ctx['milestoneId'] ?? '');
        // INV-17-8: all money ops must carry idempotency key
        const idempotencyKey = String(
          ctx['escrowReleaseIdempotencyKey'] ?? `release-${ctx.sagaId}-${milestoneId}`,
        );
        return services.escrowFundService.releaseFundsAsync(
          milestoneId,
          idempotencyKey,
          ctx.correlationId,
        );
      },
    },
  ];
}
