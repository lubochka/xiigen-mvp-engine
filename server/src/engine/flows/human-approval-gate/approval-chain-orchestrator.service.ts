/**
 * ApprovalChainOrchestrator — T419 [ORCHESTRATION].
 *
 * Manages multi-level approval chains (sequential or parallel).
 * Chain mode and configuration read from FREEDOM config.
 *
 * DNA-8: storeDocument() BEFORE enqueue().
 * DNA-3: All methods return DataProcessResult — never throw.
 * CF-476: tenantId required — UNSCOPED_QUERY on missing.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';

interface IDb {
  storeDocument(
    index: string,
    doc: Record<string, unknown>,
    id?: string,
  ): Promise<DataProcessResult<Record<string, unknown>>>;
}

interface IQueue {
  enqueue(event: string, data: Record<string, unknown>): Promise<DataProcessResult<string>>;
}

interface IConfig {
  get(key: string): Promise<DataProcessResult<Record<string, unknown>>>;
}

export type ChainMode = 'SEQUENTIAL' | 'PARALLEL';

export interface ChainOrchestrationResult {
  chainId: string;
  mode: ChainMode;
  stepCount: number;
  startedAt: string;
}

const DEFAULT_MODE: ChainMode = 'SEQUENTIAL';

export class ApprovalChainOrchestrator {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
    private readonly config: IConfig,
  ) {}

  async startChain(
    tenantId: string,
    workflowId: string,
    steps: string[],
  ): Promise<DataProcessResult<ChainOrchestrationResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!workflowId)
      return DataProcessResult.failure('MISSING_WORKFLOW_ID', 'workflowId is required');
    if (!steps || steps.length === 0)
      return DataProcessResult.failure('MISSING_STEPS', 'steps array is required and non-empty');

    // Read chain config from FREEDOM — never hardcode mode
    const configResult = await this.config.get('flow27_approval_chain');
    const rawMode =
      configResult.isSuccess && configResult.data
        ? (configResult.data['mode'] as string)
        : DEFAULT_MODE;
    const mode: ChainMode = rawMode === 'PARALLEL' ? 'PARALLEL' : 'SEQUENTIAL';

    const chainId = `chain-${tenantId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const startedAt = new Date().toISOString();

    const doc: Record<string, unknown> = {
      chain_id: chainId,
      tenant_id: tenantId,
      workflow_id: workflowId,
      mode,
      steps,
      step_count: steps.length,
      started_at: startedAt,
    };

    // DNA-8: store BEFORE enqueue
    const storeResult = await this.db.storeDocument('flow27-approval-chains', doc, chainId);
    if (!storeResult.isSuccess)
      return DataProcessResult.failure(storeResult.errorCode!, storeResult.errorMessage!);

    await this.queue.enqueue('approval.chain.started', {
      chainId,
      tenantId,
      workflowId,
      mode,
      stepCount: steps.length,
      startedAt,
    });

    return DataProcessResult.success({
      chainId,
      mode,
      stepCount: steps.length,
      startedAt,
    });
  }
}
