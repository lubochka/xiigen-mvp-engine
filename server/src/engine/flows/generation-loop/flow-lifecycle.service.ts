/**
 * IFlowLifecycleService — F1491 [META_DECISION].
 *
 * Flow lifecycle state tracker. One document per flow per tenant.
 * Tracks generation history, current status, dependencies, and bundle activations.
 *
 * D-VIS-4: Phase A DRY_RUN pass → GENERATED. Phase E gate → PROMOTED → ACTIVE.
 *          These transitions are mandatory, not optional.
 *
 * DNA-3: All methods return DataProcessResult — never throw.
 * DNA-8: storeDocument() BEFORE enqueue() on every status update.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';
import type {
  GenerationLoopDocumentUpdater,
  GenerationLoopQueue,
} from './generation-loop-shared-interfaces';

export type FlowStatus =
  | 'NOT_STARTED'
  | 'GENERATED'
  | 'TESTING'
  | 'PROMOTED'
  | 'ACTIVE'
  | 'REGRESSED'
  | 'DEPRECATED';

export interface GenerationRunRecord {
  runId: string;
  triggeredBy: string;
  arbitersUsed: number;
  roundsToAccept: number;
  promotedAt?: string;
  promotedBy?: string;
  promptVersions: Record<string, string>;
}

export interface CurrentGenerationRecord {
  runId: string;
  status: FlowStatus;
  testMatrixLastRun?: string;
  testMatrixResult?: 'PASS' | 'FAIL' | 'NOT_RUN';
  lastRegressionCheck?: string;
  blastRadiusLastComputed?: string;
}

export interface BundleActivationRecord {
  bundleId: string;
  bundleVersion: string;
  flowVersionAtActivation: string;
  activatedAt: string;
}

export interface FlowLifecycleRecord {
  flowId: string;
  tenantId: string;
  status: FlowStatus;
  generationHistory: GenerationRunRecord[];
  currentGeneration?: CurrentGenerationRecord;
  dependsOn: string[];
  downstreamFlows: string[];
  featureIds: string[];
  bundle_activations: BundleActivationRecord[];
  createdAt: string;
  updatedAt: string;
}

/** Valid status machine transitions. */
export const VALID_LIFECYCLE_TRANSITIONS: Record<FlowStatus, FlowStatus[]> = {
  NOT_STARTED: ['GENERATED'],
  GENERATED: ['TESTING', 'REGRESSED'],
  TESTING: ['PROMOTED', 'REGRESSED'],
  PROMOTED: ['ACTIVE', 'REGRESSED'],
  ACTIVE: ['REGRESSED', 'DEPRECATED'],
  REGRESSED: ['GENERATED', 'DEPRECATED'],
  DEPRECATED: [],
};

/** Composite document key for flow-lifecycle index. */
function lifecycleKey(flowId: string, tenantId: string): string {
  return `${tenantId}::${flowId}`;
}

export class FlowLifecycleService {
  constructor(
    private readonly db: GenerationLoopDocumentUpdater,
    private readonly queue: GenerationLoopQueue,
  ) {}

  /**
   * Get current lifecycle record for a flow.
   */
  async getStatus(
    flowId: string,
    tenantId: string,
  ): Promise<DataProcessResult<FlowLifecycleRecord | null>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!flowId) return DataProcessResult.failure('MISSING_FLOW_ID', 'flowId is required');

    const key = lifecycleKey(flowId, tenantId);
    const result = await this.db.searchDocuments('flow-lifecycle', { compositeKey: key });
    if (!result.isSuccess)
      return DataProcessResult.failure(result.errorCode!, result.errorMessage!);
    if (!result.data?.length) return DataProcessResult.success(null);

    return DataProcessResult.success(result.data[0] as unknown as FlowLifecycleRecord);
  }

  /**
   * Update flow status — validates state machine transition.
   * D-VIS-4: GENERATED at Phase A DRY_RUN pass. PROMOTED→ACTIVE at Phase E gate.
   */
  async updateStatus(
    flowId: string,
    tenantId: string,
    status: FlowStatus,
    metadata?: Record<string, unknown>,
    expectedCurrentStatus?: FlowStatus,
  ): Promise<DataProcessResult<{ success: boolean; actualStatus: FlowStatus }>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!flowId) return DataProcessResult.failure('MISSING_FLOW_ID', 'flowId is required');

    const key = lifecycleKey(flowId, tenantId);
    const existing = await this.db.searchDocuments('flow-lifecycle', { compositeKey: key });
    if (!existing.isSuccess)
      return DataProcessResult.failure(existing.errorCode!, existing.errorMessage!);

    const now = new Date().toISOString();

    if (!existing.data?.length) {
      // First-time creation
      if (status !== 'NOT_STARTED' && status !== 'GENERATED') {
        return DataProcessResult.failure(
          'INVALID_INITIAL_STATUS',
          `Cannot create lifecycle record with initial status ${status}`,
        );
      }
      const record: FlowLifecycleRecord = {
        flowId,
        tenantId,
        status,
        generationHistory: [],
        dependsOn: [],
        downstreamFlows: [],
        featureIds: [],
        bundle_activations: [],
        createdAt: now,
        updatedAt: now,
        ...metadata,
      };
      // DNA-8: store before emit
      const stored = await this.db.storeDocument(
        'flow-lifecycle',
        { ...record, compositeKey: key } as unknown as Record<string, unknown>,
        key,
      );
      if (!stored.isSuccess)
        return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);
      await this.queue.enqueue(`flow.status.${status.toLowerCase()}`, {
        flowId,
        tenantId,
        status,
        updatedAt: now,
      });
      return DataProcessResult.success({ success: true, actualStatus: status });
    }

    const current = existing.data[0] as unknown as FlowLifecycleRecord;
    const currentStatus = current.status;

    if (expectedCurrentStatus && currentStatus !== expectedCurrentStatus) {
      return DataProcessResult.success({ success: false, actualStatus: currentStatus });
    }

    if (!VALID_LIFECYCLE_TRANSITIONS[currentStatus].includes(status)) {
      return DataProcessResult.failure(
        'INVALID_TRANSITION',
        `Cannot transition from ${currentStatus} to ${status}. Valid: [${VALID_LIFECYCLE_TRANSITIONS[currentStatus].join(', ')}]`,
      );
    }

    // DNA-8: update before emit
    const updates: Record<string, unknown> = { status, updatedAt: now, ...metadata };
    const updated = await this.db.updateDocument('flow-lifecycle', key, updates);
    if (!updated.isSuccess)
      return DataProcessResult.failure(updated.errorCode!, updated.errorMessage!);

    await this.queue.enqueue(`flow.status.${status.toLowerCase()}`, {
      flowId,
      tenantId,
      fromStatus: currentStatus,
      toStatus: status,
      updatedAt: now,
    });
    return DataProcessResult.success({ success: true, actualStatus: status });
  }

  /**
   * Append a generation run record to history.
   */
  async appendGenerationRun(
    flowId: string,
    tenantId: string,
    run: GenerationRunRecord,
  ): Promise<DataProcessResult<void>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');

    const key = lifecycleKey(flowId, tenantId);
    const existing = await this.db.searchDocuments('flow-lifecycle', { compositeKey: key });
    if (!existing.isSuccess)
      return DataProcessResult.failure(existing.errorCode!, existing.errorMessage!);
    if (!existing.data?.length)
      return DataProcessResult.failure('NOT_FOUND', `No lifecycle record for ${flowId}`);

    const current = existing.data[0] as unknown as FlowLifecycleRecord;
    const updatedHistory = [...current.generationHistory, run];

    const updated = await this.db.updateDocument('flow-lifecycle', key, {
      generationHistory: updatedHistory,
      updatedAt: new Date().toISOString(),
    });
    if (!updated.isSuccess)
      return DataProcessResult.failure(updated.errorCode!, updated.errorMessage!);

    return DataProcessResult.success(undefined);
  }

  /**
   * Get downstream flow IDs.
   */
  async getDownstreamFlows(flowId: string, tenantId: string): Promise<DataProcessResult<string[]>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');

    const record = await this.getStatus(flowId, tenantId);
    if (!record.isSuccess)
      return DataProcessResult.failure(record.errorCode!, record.errorMessage!);
    if (!record.data) return DataProcessResult.success([]);

    return DataProcessResult.success(record.data.downstreamFlows);
  }

  /**
   * Query flows by status for a tenant.
   */
  async queryByStatus(
    status: FlowStatus,
    tenantId: string,
  ): Promise<DataProcessResult<FlowLifecycleRecord[]>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');

    const result = await this.db.searchDocuments('flow-lifecycle', { tenantId, status });
    if (!result.isSuccess)
      return DataProcessResult.failure(result.errorCode!, result.errorMessage!);

    return DataProcessResult.success((result.data ?? []) as unknown as FlowLifecycleRecord[]);
  }

  /**
   * Record a bundle activation for this flow.
   */
  async recordBundleActivation(
    flowId: string,
    tenantId: string,
    activation: { bundleId: string; bundleVersion: string; flowVersionAtActivation: string },
  ): Promise<DataProcessResult<void>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');

    const key = lifecycleKey(flowId, tenantId);
    const existing = await this.db.searchDocuments('flow-lifecycle', { compositeKey: key });
    if (!existing.isSuccess)
      return DataProcessResult.failure(existing.errorCode!, existing.errorMessage!);
    if (!existing.data?.length)
      return DataProcessResult.failure('NOT_FOUND', `No lifecycle record for ${flowId}`);

    const current = existing.data[0] as unknown as FlowLifecycleRecord;
    const now = new Date().toISOString();
    const newActivation: BundleActivationRecord = { ...activation, activatedAt: now };
    const updatedActivations = [...(current.bundle_activations ?? []), newActivation];

    const updated = await this.db.updateDocument('flow-lifecycle', key, {
      bundle_activations: updatedActivations,
      updatedAt: now,
    });
    if (!updated.isSuccess)
      return DataProcessResult.failure(updated.errorCode!, updated.errorMessage!);

    return DataProcessResult.success(undefined);
  }

  /**
   * Get all bundle activations for a flow.
   */
  async getBundleActivations(
    flowId: string,
    tenantId: string,
  ): Promise<DataProcessResult<BundleActivationRecord[]>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');

    const record = await this.getStatus(flowId, tenantId);
    if (!record.isSuccess)
      return DataProcessResult.failure(record.errorCode!, record.errorMessage!);
    if (!record.data) return DataProcessResult.success([]);

    return DataProcessResult.success(record.data.bundle_activations ?? []);
  }
}
