/**
 * AnalyticsEmitter — T388 ANALYTICS service for FLOW-25.
 *
 * Fire-and-forget analytics event publisher for BFA arbitration lifecycle events.
 * Queue failures do NOT propagate — analytics loss is acceptable; blocking arbitration
 * on an analytics failure is not (CF-503).
 *
 * Iron rules (enforced — not configurable):
 *   CF-503:  Queue failures MUST NOT propagate — always return success even on emit error
 *   CF-476:  tenantId required on all operations — UNSCOPED_QUERY on missing
 *   DNA-3:   All methods return DataProcessResult<T> — never throw
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';
import { DecisionOption } from './impact-report-generator.service';
import { ArbitrationState } from './arbitration-state-machine.service';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';

// ── Shapes ──────────────────────────────────────────────────────────────────

export interface AnalyticsEvent {
  readonly eventType: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly emittedAt: string;
  readonly payload: Record<string, unknown>;
}

export interface AnalyticsEmitResult {
  readonly emitted: boolean;
  readonly eventType: string;
  readonly sessionId: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const ANALYTICS_CHANNEL = 'analytics.bfa.event';

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class AnalyticsEmitter extends MicroserviceBase {
  constructor(private readonly queueService: IQueueService) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T388',
        serviceName: 'AnalyticsEmitter',
        flowId: 'FLOW-25',
      }),
    });
  }

  /**
   * Emit an arbitration session opened event.
   *
   * CF-503: failure does NOT propagate — always returns success.
   * CF-476: tenantId required.
   */
  async emitSessionOpened(
    tenantId: string,
    sessionId: string,
    changeId: string,
  ): Promise<DataProcessResult<AnalyticsEmitResult>> {
    if (!tenantId || tenantId.trim() === '') {
      return DataProcessResult.failure('UNSCOPED_QUERY', 'CF-476: tenantId is required');
    }
    return this.fireAndForget(tenantId, sessionId, 'bfa.session.opened', {
      change_id: changeId,
    });
  }

  /**
   * Emit a decision captured event.
   *
   * CF-503: failure does NOT propagate — always returns success.
   * CF-476: tenantId required.
   */
  async emitDecisionCaptured(
    tenantId: string,
    sessionId: string,
    decision: DecisionOption,
    actorId: string,
    forceProceed: boolean,
  ): Promise<DataProcessResult<AnalyticsEmitResult>> {
    if (!tenantId || tenantId.trim() === '') {
      return DataProcessResult.failure('UNSCOPED_QUERY', 'CF-476: tenantId is required');
    }
    return this.fireAndForget(tenantId, sessionId, 'bfa.decision.captured', {
      decision,
      actor_id: actorId,
      force_proceed: forceProceed,
    });
  }

  /**
   * Emit an arbitration resolved event.
   *
   * CF-503: failure does NOT propagate — always returns success.
   * CF-476: tenantId required.
   */
  async emitArbitrationResolved(
    tenantId: string,
    sessionId: string,
    finalState: ArbitrationState | null,
    deferred: boolean,
  ): Promise<DataProcessResult<AnalyticsEmitResult>> {
    if (!tenantId || tenantId.trim() === '') {
      return DataProcessResult.failure('UNSCOPED_QUERY', 'CF-476: tenantId is required');
    }
    return this.fireAndForget(tenantId, sessionId, 'bfa.arbitration.resolved', {
      final_state: finalState,
      deferred,
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Internal fire-and-forget dispatcher.
   * CF-503: queue errors are swallowed — always returns success.
   */
  private async fireAndForget(
    tenantId: string,
    sessionId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<DataProcessResult<AnalyticsEmitResult>> {
    const emittedAt = new Date().toISOString();
    try {
      await this.queueService.enqueue(ANALYTICS_CHANNEL, {
        event_type: eventType,
        tenant_id: tenantId,
        session_id: sessionId,
        emitted_at: emittedAt,
        ...payload,
      });
    } catch {
      // CF-503: swallow — analytics loss is acceptable
    }

    // Always return success regardless of queue outcome
    return DataProcessResult.success({
      emitted: true,
      eventType,
      sessionId,
    });
  }
}
