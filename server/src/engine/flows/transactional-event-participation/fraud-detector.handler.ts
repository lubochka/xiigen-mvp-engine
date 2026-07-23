// T113 FraudDetectorHandler [VALIDATION] (inline, caller: T99)
// @connectionType FLOW_SCOPED
// @flowId FLOW-09
//
//
// FAIL_OPEN pattern (CF-09-2):
//   When F283 fraud service is unavailable, purchase MUST proceed + emit audit event.
//   Three conditions required simultaneously:
//   (1) try/catch around F283 call
//   (2) on catch: return { passed: true } (ALLOW purchase)
//   (3) on catch: emit FraudCheckFailed(service_unavailable) audit event
//   Missing any one = SILENT_FAILURE.
//
// Iron rules:
//   @Injectable() only — no @EventPattern, no @MessagePattern (inline call)
//   catch returns { passed: true } — never { passed: false }
//   FraudCheckFailed emitted on service_unavailable
//   knowledgeScope not applicable — no storeDocument calls

import { DataProcessResult } from '../../../kernel/data-process-result';

interface IFraudService {
  analyze(
    params: Record<string, unknown>,
  ): Promise<{ isSuccess: boolean; data?: Record<string, unknown> }>;
}
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

export interface FraudCheckInput {
  userId: string;
  eventId: string;
  purchaseId: string;
}

export interface FraudCheckResult {
  passed: boolean;
  reason?: string;
}

export class FraudDetectorHandler {
  constructor(
    /** F283: IFraudDetectionService — PLATFORM-ONLY fraud service */

    private readonly fraudService: IFraudService,
    /** QUEUE FABRIC: emit FraudCheckFailed audit event */
    private readonly queue: IQueueService,
  ) {}

  async check(input: FraudCheckInput): Promise<FraudCheckResult> {
    try {
      const result = await this.fraudService.analyze({
        userId: input.userId,
        eventId: input.eventId,
        purchaseId: input.purchaseId,
      });

      if (!result.isSuccess) {
        // Service returned failure (not unavailable) — block purchase
        return { passed: false, reason: 'FRAUD_DETECTED' };
      }

      const isFraudulent = result.data?.['isFraudulent'] as boolean;
      return { passed: !isFraudulent, reason: isFraudulent ? 'FRAUD_DETECTED' : undefined };
    } catch (_e) {
      // CF-09-2 FAIL_OPEN: service unavailable — ALLOW purchase + emit audit event
      // Condition 3: emit audit event (FraudCheckFailed service_unavailable)
      await this.queue.enqueue('fraud.check.failed', {
        reason: 'service_unavailable',
        purchaseId: input.purchaseId,
        userId: input.userId,
        eventId: input.eventId,
        occurredAt: new Date().toISOString(),
      });
      // Condition 2: allow purchase to proceed (not return false)
      return { passed: true, reason: 'service_unavailable' };
    }
  }
}

/**
 * DataProcessResult wrapper for use when T113 result needs to propagate as DataProcessResult.
 */
export async function runFraudCheck(
  handler: FraudDetectorHandler,
  input: FraudCheckInput,
): Promise<DataProcessResult<FraudCheckResult>> {
  const result = await handler.check(input);
  return DataProcessResult.success(result);
}
