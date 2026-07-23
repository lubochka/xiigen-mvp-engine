/**
 * ApprovalTimeoutHandler — T415 [GOVERNANCE].
 *
 * Checks if an approval request has exceeded its timeout threshold.
 * Threshold read from FREEDOM config (key: flow27_timeout_thresholds).
 * On timeout: stores escalation record and emits approval.escalated event.
 *
 * DNA-8: storeDocument() BEFORE enqueue().
 * DNA-3: All methods return DataProcessResult — never throw.
 * CF-476: tenantId required — UNSCOPED_QUERY on missing.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';

interface IDb {
  searchDocuments(
    index: string,
    filter: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>[]>>;
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

export interface TimeoutCheckResult {
  timedOut: boolean;
  escalationId?: string;
  timeoutThresholdMinutes: number;
}

const DEFAULT_TIMEOUT_MINUTES = 1440; // 24h fallback

export class ApprovalTimeoutHandler {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
    private readonly config: IConfig,
  ) {}

  async checkTimeout(
    tenantId: string,
    requestId: string,
    createdAt: string,
  ): Promise<DataProcessResult<TimeoutCheckResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!requestId) return DataProcessResult.failure('MISSING_REQUEST_ID', 'requestId is required');
    if (!createdAt) return DataProcessResult.failure('MISSING_CREATED_AT', 'createdAt is required');

    // Read timeout threshold from FREEDOM config — never hardcode
    const configResult = await this.config.get('flow27_timeout_thresholds');
    const thresholdMinutes: number =
      configResult.isSuccess && configResult.data
        ? ((configResult.data['default_minutes'] as number) ?? DEFAULT_TIMEOUT_MINUTES)
        : DEFAULT_TIMEOUT_MINUTES;

    const createdMs = new Date(createdAt).getTime();
    const nowMs = Date.now();
    const elapsedMinutes = (nowMs - createdMs) / (1000 * 60);
    const timedOut = elapsedMinutes >= thresholdMinutes;

    if (!timedOut) {
      return DataProcessResult.success({
        timedOut: false,
        timeoutThresholdMinutes: thresholdMinutes,
      });
    }

    const escalationId = `esc-${tenantId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const escalatedAt = new Date().toISOString();

    const doc: Record<string, unknown> = {
      escalation_id: escalationId,
      tenant_id: tenantId,
      request_id: requestId,
      escalated_at: escalatedAt,
      elapsed_minutes: Math.floor(elapsedMinutes),
      threshold_minutes: thresholdMinutes,
    };

    // DNA-8: store BEFORE enqueue
    const storeResult = await this.db.storeDocument('flow27-escalations', doc, escalationId);
    if (!storeResult.isSuccess)
      return DataProcessResult.failure(storeResult.errorCode!, storeResult.errorMessage!);

    await this.queue.enqueue('approval.escalated', {
      escalationId,
      tenantId,
      requestId,
      escalatedAt,
    });

    return DataProcessResult.success({
      timedOut: true,
      escalationId,
      timeoutThresholdMinutes: thresholdMinutes,
    });
  }
}
