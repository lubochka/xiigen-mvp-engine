/**
 * EventCreationOrchestrator (T59) — FLOW-03 Phase 1A
 * Nodes A1/A2/A3: Validate → Store → Emit
 *
 * Iron rules:
 *   IR-59-1: capacity === null means unlimited — strict null check (NOT !capacity).
 *            capacity === 0 means closed event (no registrations).
 *   IR-59-2: storeDocument() BEFORE EventCreated enqueued (DNA-8).
 *   CF-03-2: !capacity anti-pattern forbidden — treats 0 as unlimited (BUILD_FAILURE).
 *   CF-03-3: isPaidEvent=true → payment config MUST exist (PAYMENT_CONFIG_MISSING).
 *   SCHEMA:  matchingCriteria{} MUST be in stored event schema (B1 in FLOW-03 reads it).
 *   SCOPE:   knowledgeScope=GLOBAL for public events, PRIVATE for private/paid.
 *   DNA-3:   All methods return DataProcessResult<T> — never throw.
 *   DNA-8:   storeDocument() before enqueue() on every transition.
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';

const EVENTS_INDEX = 'xiigen-events';
const PAYMENT_CONFIGS_INDEX = 'xiigen-payment-configs';
const FREEDOM_CONFIGS_INDEX = 'freedom_configs';

export interface CreateEventInput {
  title: string;
  organizerId: string;
  tenantId: string;
  startDate: string; // ISO 8601
  capacity: number | null; // null=unlimited, 0=closed, n=limited
  isPrivate?: boolean;
  isPaidEvent?: boolean;
  matchingCriteria?: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface CreateEventResult {
  eventId: string;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-03
 * @portability MOBILE — no ClsService, FREEDOM keys flow-scoped (flow03_*)
 * @className EventCreationOrchestrator
 */
@Injectable()
export class EventCreationOrchestrator {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queue: IQueueService,
  ) {}

  async createEvent(input: CreateEventInput): Promise<DataProcessResult<CreateEventResult>> {
    try {
      // ── A1: Validate ─────────────────────────────────────────────────────────
      // Uniform VALIDATION_FAILURE — same error code regardless of which field fails
      if (!input.title || !input.organizerId || !input.tenantId || !input.startDate) {
        return DataProcessResult.failure(
          'VALIDATION_FAILURE',
          'Event creation input validation failed',
        );
      }
      if (new Date(input.startDate) <= new Date()) {
        return DataProcessResult.failure(
          'VALIDATION_FAILURE',
          'Event creation input validation failed',
        );
      }

      // A1: isPaidEvent check — payment config MUST exist (CF-03-3, DR-03-I)
      // This read is named in CONNECTIONS: reads from xiigen-payment-configs when isPaidEvent=true.
      if (input.isPaidEvent) {
        const paymentCfg = await this.db.searchDocuments(PAYMENT_CONFIGS_INDEX, {
          organizer_id: input.organizerId,
        });
        if (!paymentCfg.isSuccess || (paymentCfg.data ?? []).length === 0) {
          return DataProcessResult.failure(
            'PAYMENT_CONFIG_MISSING',
            'Payment configuration required for paid events',
          );
        }
      }

      // A1: Organizer rate limit — FREEDOM config key: flow03_max_events_per_organizer
      const maxEvents = await this.getMaxEventsPerOrganizer(input.tenantId);
      const existingEvents = await this.db.searchDocuments(EVENTS_INDEX, {
        organizer_id: input.organizerId,
      });
      const existingCount = existingEvents.isSuccess ? (existingEvents.data ?? []).length : 0;
      if (existingCount >= maxEvents) {
        return DataProcessResult.failure(
          'RATE_LIMIT_EXCEEDED',
          'Event creation rate limit exceeded for organizer',
        );
      }

      // ── A2: Build and store event record ─────────────────────────────────────
      // IR-59-1: capacity=null means unlimited — stored as-is (never coerced).
      //          capacity=0 means closed event. !capacity check FORBIDDEN (treats 0 as unlimited).
      // knowledgeScope: GLOBAL for public events, PRIVATE for private or paid events.
      const knowledgeScope = input.isPrivate || input.isPaidEvent ? 'PRIVATE' : 'GLOBAL';
      const eventId = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      const doc: Record<string, unknown> = {
        event_id: eventId,
        title: input.title,
        organizer_id: input.organizerId,
        tenant_id: input.tenantId,
        start_date: input.startDate,
        capacity: input.capacity, // null=unlimited, 0=closed, number=limited (IR-59-1)
        is_private: input.isPrivate ?? false,
        is_paid_event: input.isPaidEvent ?? false,
        matching_criteria: input.matchingCriteria ?? {}, // SCHEMA: required for B1 audience scoring
        knowledge_scope: knowledgeScope,
        connection_type: 'FLOW_SCOPED',
        created_at: new Date().toISOString(),
      };

      // DNA-8: storeDocument BEFORE EventCreated enqueued (IR-59-2)
      const stored = await this.db.storeDocument(EVENTS_INDEX, doc, eventId);
      if (!stored.isSuccess) {
        return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);
      }

      // ── A3: Emit EventCreated ──────────────────────────────────────────────
      // A3 conditional scope: reads stored knowledgeScope before publishing (DR-03-H).
      // The organizer receives { eventId } synchronously — everything after is async (DR-03-A).
      await this.queue.enqueue('EventCreated', {
        eventId,
        organizerId: input.organizerId,
        tenantId: input.tenantId,
        knowledgeScope: doc['knowledge_scope'],
      });

      return DataProcessResult.success({ eventId });
    } catch (err) {
      return DataProcessResult.failure(
        'EVENT_CREATION_ERROR',
        `EventCreationOrchestrator threw: ${String(err)}`,
      );
    }
  }

  /** Read max events per organizer from FREEDOM config — never hardcoded. */
  private async getMaxEventsPerOrganizer(_tenantId: string): Promise<number> {
    const cfg = await this.db.searchDocuments(FREEDOM_CONFIGS_INDEX, {
      config_key: 'flow03_max_events_per_organizer',
      task_type: 'xiigen-engine',
    });
    if (cfg.isSuccess && (cfg.data ?? []).length > 0) {
      const val = (cfg.data![0] as Record<string, unknown>)['config_value'];
      const parsed = parseInt(String(val), 10);
      if (!isNaN(parsed)) return parsed;
    }
    return 100; // Safe default if FREEDOM config not seeded
  }
}
