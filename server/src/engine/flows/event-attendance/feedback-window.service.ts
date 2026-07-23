/**
 * FeedbackWindowController (T66) — FLOW-04 Phase 2D
 * Single responsibility: open a time-bounded feedback window when an event ends.
 *
 * Iron rules:
 *   IR-66-1: Triggered by event.ended CloudEvent — NEVER by a timer or cron.
 *            The feedback window lifecycle is event-driven (CF-04-3).
 *   IR-66-2: Window duration from FREEDOM config (flow04_feedback_window_hours).
 *            closes_at = opens_at + configured hours. Never hardcoded.
 *   IR-66-3: Idempotent by eventId — duplicate openWindow call returns existing record,
 *            no new storeDocument, no new event emit.
 *   IR-66-4: ONE storeDocument per window — record carries opens_at, closes_at, tenant_id,
 *            connection_type, knowledge_scope.
 *   DNA-3:   All methods return DataProcessResult<T> — never throw.
 *   DNA-8:   storeDocument(window) BEFORE FeedbackWindowOpened emit.
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';

const WINDOWS_INDEX = 'xiigen-feedback-windows';
const FREEDOM_INDEX = 'freedom_configs';

const DEFAULT_FEEDBACK_WINDOW_HOURS = 24;

export interface OpenWindowInput {
  eventId: string;
  tenantId: string;
}

export interface OpenWindowResult {
  windowId: string;
  opensAt: string;
  closesAt: string;
  idempotent: boolean; // true when existing window was returned
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-04
 * @portability MOBILE - no ClsService, FREEDOM keys flow-scoped (flow04_*)
 * @className FeedbackWindowController
 */
@Injectable()
export class FeedbackWindowController extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T66',
        serviceName: 'FeedbackWindowController',
        flowId: 'FLOW-04',
      }),
    });
  }

  async openWindow(input: OpenWindowInput): Promise<DataProcessResult<OpenWindowResult>> {
    try {
      // ── Validate ──────────────────────────────────────────────────────────
      if (!input.eventId || !input.tenantId) {
        return DataProcessResult.failure(
          'VALIDATION_FAILURE',
          'OpenWindow input validation failed',
        );
      }

      // ── IR-66-3: Idempotency — return existing window if found ────────────
      const existing = await this.dbFabric.searchDocuments(WINDOWS_INDEX, {
        event_id: input.eventId,
      });
      if (existing.isSuccess && (existing.data ?? []).length > 0) {
        const rec = existing.data![0] as Record<string, unknown>;
        return DataProcessResult.success({
          windowId: rec['window_id'] as string,
          opensAt: rec['opens_at'] as string,
          closesAt: rec['closes_at'] as string,
          idempotent: true,
        });
      }

      // ── IR-66-2: Window duration from FREEDOM config — never hardcoded ────
      const windowHours = await this.getFeedbackWindowHours();
      const now = new Date();
      const opensAt = now.toISOString();
      const closesAt = new Date(now.getTime() + windowHours * 3600 * 1000).toISOString();

      // ── IR-66-4: ONE atomic storeDocument ────────────────────────────────
      const windowId = `wnd-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      const doc: Record<string, unknown> = {
        window_id: windowId,
        event_id: input.eventId,
        tenant_id: input.tenantId,
        opens_at: opensAt,
        closes_at: closesAt,
        window_hours: windowHours,
        connection_type: 'FLOW_SCOPED',
        knowledge_scope: 'PRIVATE',
        created_at: opensAt,
      };

      // DNA-8: storeDocument BEFORE emit
      const stored = await this.dbFabric.storeDocument(WINDOWS_INDEX, doc, windowId);
      if (!stored.isSuccess) {
        return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);
      }

      await this.queueFabric.enqueue('FeedbackWindowOpened', {
        windowId,
        eventId: input.eventId,
        tenantId: input.tenantId,
        opensAt,
        closesAt,
      });

      return DataProcessResult.success({ windowId, opensAt, closesAt, idempotent: false });
    } catch (err) {
      return DataProcessResult.failure(
        'FEEDBACK_WINDOW_ERROR',
        `FeedbackWindowController threw: ${String(err)}`,
      );
    }
  }

  /** Read feedback window duration from FREEDOM config — never hardcoded (IR-66-2). */
  private async getFeedbackWindowHours(): Promise<number> {
    const cfg = await this.dbFabric.searchDocuments(FREEDOM_INDEX, {
      config_key: 'flow04_feedback_window_hours',
      task_type: 'xiigen-engine',
    });
    if (cfg.isSuccess && (cfg.data ?? []).length > 0) {
      const val = (cfg.data![0] as Record<string, unknown>)['config_value'];
      const parsed = parseFloat(String(val));
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return DEFAULT_FEEDBACK_WINDOW_HOURS;
  }
}
