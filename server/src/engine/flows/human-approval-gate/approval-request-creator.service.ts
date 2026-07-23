/**
 * ApprovalRequestCreator — T413 [ORCHESTRATION].
 *
 * Creates an approval request document and routes notification to the
 * designated reviewer via queue event. Returns QUEUED immediately —
 * never blocks waiting for human response.
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

export interface ApprovalRequestResult {
  requestId: string;
  status: 'QUEUED';
  notifiedAt: string;
  workflowId: string;
  reviewerGroup: string;
}

export class ApprovalRequestCreator {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async createRequest(
    tenantId: string,
    workflowId: string,
    stepId: string,
    reviewerGroup: string,
    metadata: Record<string, unknown> = {},
  ): Promise<DataProcessResult<ApprovalRequestResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!workflowId)
      return DataProcessResult.failure('MISSING_WORKFLOW_ID', 'workflowId is required');
    if (!stepId) return DataProcessResult.failure('MISSING_STEP_ID', 'stepId is required');
    if (!reviewerGroup)
      return DataProcessResult.failure('MISSING_REVIEWER_GROUP', 'reviewerGroup is required');

    const requestId = `ar-${tenantId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const notifiedAt = new Date().toISOString();

    const doc: Record<string, unknown> = {
      request_id: requestId,
      tenant_id: tenantId,
      workflow_id: workflowId,
      step_id: stepId,
      reviewer_group: reviewerGroup,
      status: 'PENDING',
      created_at: notifiedAt,
      ...metadata,
    };

    // DNA-8: store BEFORE enqueue
    const storeResult = await this.db.storeDocument('flow27-approval-requests', doc, requestId);
    if (!storeResult.isSuccess)
      return DataProcessResult.failure(storeResult.errorCode!, storeResult.errorMessage!);

    await this.queue.enqueue('approval.request.created', {
      requestId,
      tenantId,
      workflowId,
      reviewerGroup,
      notifiedAt,
    });

    return DataProcessResult.success({
      requestId,
      status: 'QUEUED' as const,
      notifiedAt,
      workflowId,
      reviewerGroup,
    });
  }
}
