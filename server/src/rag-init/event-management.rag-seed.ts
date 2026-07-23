/**
 * Flow03EventManagementRagSeed — RAG patterns for FLOW-03 Event Management.
 *
 * Key patterns:
 *   - event-created-outbox-pattern      (T59 DNA-8 outbox)
 *   - null-capacity-unlimited-events    (T59/T60 CF-03-2 strict null)
 *   - content-safety-gate-before-promo  (T61 CF-03-3 ordering)
 *   - promotion-analytics-tracking      (T62 event-driven, no HTTP)
 *
 * BFA rules: CF-03-1, CF-03-2, CF-03-3
 * Design records: DD-F03-001
 *
 * DNA-3: All methods return DataProcessResult.
 * Rule 1: No SDK imports.
 */
import { Injectable } from '@nestjs/common';
import { FlowRagSeedBase } from './flow-rag-seed.base';
import { DataProcessResult } from '../kernel/data-process-result';

@Injectable()
export class Flow03EventManagementRagSeed extends FlowRagSeedBase {
  readonly domainId = 'flow-03-event-management';

  async indexPatterns(): Promise<DataProcessResult<number>> {
    const patterns = [
      // ── event-created-outbox-pattern (T59, DNA-8) ───────────────────────────

      {
        patternId: 'event-created-outbox-pattern',
        name: 'EVENT_CREATED_OUTBOX_PATTERN',
        namespace: 'event-management',
        pattern: 'outbox-before-emit',
        title: 'EventCreated Outbox Pattern (T59)',
        version: '1.0.0',
        description:
          'T59 EventCreationOrchestrator stores the event document (storeDocument) in xiigen-events ' +
          'BEFORE emitting the EventCreated queue message. ' +
          'Emitting first and then crashing before store = lost event, no recovery path. ' +
          'DNA-8 mandates DB record existence before any downstream consumer can act on it.',
        useCase:
          'Event creation with outbox guarantee: DB record exists before queue consumers see it',
        dnaCompliance: 'DNA-3 (DataProcessResult) — DNA-8 (storeDocument before enqueue)',
        codeExample:
          '// T59 EventCreationOrchestrator\n' +
          'const storeResult = await this.db.storeDocument(\n' +
          '  "xiigen-events",\n' +
          '  { ...eventData, status: "DRAFT" },\n' +
          '  eventId,\n' +
          ');\n' +
          'if (!storeResult.isSuccess) return DataProcessResult.failure(...);\n' +
          '// Only enqueue AFTER successful store\n' +
          'await this.queue.enqueue("EventCreated", { eventId });',
        negativeExample:
          'await this.queue.enqueue("EventCreated", { eventId });\n' +
          'await this.db.storeDocument("xiigen-events", eventData, eventId); // WRONG — emit first',
        negativeReason:
          'If the process crashes after enqueue but before storeDocument, downstream consumers ' +
          'reference an event that does not exist in the database. Violates DNA-8.',
        factories: [
          {
            factoryId: 'F-DB',
            interfaceName: 'IDatabaseService',
            role: 'Event document storage via DATABASE_SERVICE',
          },
          {
            factoryId: 'F-Q',
            interfaceName: 'IQueueService',
            role: 'EventCreated queue publish via QUEUE_SERVICE',
          },
        ],
        taskTypesTargeted: ['T59'],
        antiPatterns: [
          'enqueue() before storeDocument()',
          'Fire-and-forget enqueue without checking store result',
          'Emitting EventCreated from a queue consumer (double-emit)',
        ],
        tags: ['T59', 'outbox', 'DNA-8', 'CF-03-1', 'event-creation', 'storeDocument-first'],
      },

      // ── null-capacity-unlimited-events (T59/T60, CF-03-2) ───────────────────

      {
        patternId: 'null-capacity-unlimited-events',
        name: 'NULL_CAPACITY_UNLIMITED_EVENTS',
        namespace: 'event-management',
        pattern: 'strict-null-unlimited',
        title: 'capacity=null Means Unlimited (T59/T60)',
        version: '1.0.0',
        description:
          'capacity === null is the machine constant for unlimited attendance. ' +
          'capacity === 0 means zero seats — an error condition or a zero-cap event, NOT unlimited. ' +
          'The check must be a strict null (=== null), never a falsy coercion (!capacity). ' +
          'T60 EventRegistrationManager reads this to determine whether to check confirmed-count ' +
          'before registering: if null → skip count query entirely.',
        useCase:
          'Event capacity check where null = unlimited (skip count query) and any number = capped (count query required)',
        dnaCompliance: 'DNA-2 (buildSearchFilter for count query) — DNA-3 (DataProcessResult)',
        codeExample:
          '// T60 EventRegistrationManager\n' +
          'if (event.capacity === null) {\n' +
          '  // Unlimited — skip confirmed-count query\n' +
          '  return DataProcessResult.success({ status: "CONFIRMED" });\n' +
          '}\n' +
          'const confirmed = await this.db.searchDocuments(\n' +
          '  "xiigen-event-registrations",\n' +
          '  buildSearchFilter({ eventId, status: "CONFIRMED" }),\n' +
          ');\n' +
          'if (confirmed.data.length >= event.capacity) {\n' +
          '  return DataProcessResult.success({ status: "WAITLISTED" });\n' +
          '}',
        negativeExample:
          'if (!event.capacity) {\n' +
          '  // WRONG — treats capacity=0 as unlimited too\n' +
          '  return DataProcessResult.success({ status: "CONFIRMED" });\n' +
          '}',
        negativeReason:
          '!capacity coerces 0 to truthy-false, wrongly treating a zero-cap event as unlimited. ' +
          'Only strict null check (=== null) is correct. Violates CF-03-2.',
        factories: [
          {
            factoryId: 'F-DB',
            interfaceName: 'IDatabaseService',
            role: 'Confirmed-count query via DATABASE_SERVICE',
          },
        ],
        taskTypesTargeted: ['T59', 'T60'],
        antiPatterns: [
          '!capacity (loose null check)',
          'capacity == null (loose equality includes undefined)',
          'capacity <= 0 as unlimited check',
          'Issuing confirmed-count query on null-capacity events',
        ],
        tags: ['T59', 'T60', 'capacity', 'null-unlimited', 'CF-03-2', 'strict-null'],
      },

      // ── content-safety-gate-before-promo (T61, CF-03-3) ─────────────────────

      {
        patternId: 'content-safety-gate-before-promo',
        name: 'CONTENT_SAFETY_GATE_BEFORE_PROMO',
        namespace: 'event-management',
        pattern: 'gate-before-state-transition',
        title: 'Content Safety Gate Before EventPromoted (T61)',
        version: '1.0.0',
        description:
          'T61 ContentSafetyFilter must complete and pass BEFORE T59 records the PROMOTED outcome ' +
          'and BEFORE the EventPromoted queue message is emitted. ' +
          'Promoting first and checking safety after = events with unsafe content can reach attendees ' +
          'before the gate fires. This is CF-03-3: ordering constraint on safety before promotion.',
        useCase:
          'Event promotion with mandatory pre-promotion content safety check that blocks if unsafe',
        dnaCompliance: 'DNA-3 (DataProcessResult) — DNA-8 (store PROMOTED status before emit)',
        codeExample:
          '// T59 EventCreationOrchestrator — promote path\n' +
          'const safetyResult = await this.contentSafety.check(eventId);\n' +
          'if (!safetyResult.isSuccess || !safetyResult.data?.safe) {\n' +
          '  return DataProcessResult.success({ status: "BLOCKED_UNSAFE" });\n' +
          '}\n' +
          '// Safety passed — now record promotion and emit\n' +
          'await this.db.storeDocument("xiigen-events", { status: "PROMOTED" }, eventId);\n' +
          'await this.queue.enqueue("EventPromoted", { eventId });',
        negativeExample:
          '// WRONG — record promotion before safety check\n' +
          'await this.db.storeDocument("xiigen-events", { status: "PROMOTED" }, eventId);\n' +
          'const safetyResult = await this.contentSafety.check(eventId);',
        negativeReason:
          'Recording PROMOTED before safety check passes means unsafe events can reach the queue ' +
          'and be consumed by downstream services before the safety gate fires. Violates CF-03-3.',
        factories: [
          {
            factoryId: 'F-DB',
            interfaceName: 'IDatabaseService',
            role: 'Event status update via DATABASE_SERVICE',
          },
          {
            factoryId: 'F-Q',
            interfaceName: 'IQueueService',
            role: 'EventPromoted queue publish via QUEUE_SERVICE',
          },
          {
            factoryId: 'F-AI',
            interfaceName: 'IAiProvider',
            role: 'Content safety AI call via AI_PROVIDER',
          },
        ],
        taskTypesTargeted: ['T61'],
        antiPatterns: [
          'Recording PROMOTED status before content safety check',
          'Emitting EventPromoted before safety gate passes',
          'Running content safety asynchronously after promotion',
          'Skipping content safety for private events',
        ],
        tags: ['T61', 'content-safety', 'gate-ordering', 'CF-03-3', 'EventPromoted'],
      },

      // ── promotion-analytics-tracking (T62) ───────────────────────────────────

      {
        patternId: 'promotion-analytics-tracking',
        name: 'PROMOTION_ANALYTICS_TRACKING',
        namespace: 'event-management',
        pattern: 'event-driven-analytics-no-http',
        title: 'Promotion Analytics via Queue (T62)',
        version: '1.0.0',
        description:
          'T62 PromotionAnalyticsTracker listens for EventPromoted events on the queue and records ' +
          'promotion analytics (impression counts, campaign engagement) to the database. ' +
          'It is purely event-driven — never called via HTTP from T59 or T61. ' +
          'Rule 11: no inter-service HTTP calls. All cross-service communication via queue events. ' +
          'T62 stores analytics BEFORE emitting PromotionCampaignCompleted (DNA-8).',
        useCase:
          'Analytics tracking for promoted events, decoupled from the promotion path via queue',
        dnaCompliance: 'DNA-3 (DataProcessResult) — DNA-8 (storeDocument before enqueue)',
        codeExample:
          '@EventPattern("EventPromoted")\n' +
          'async handleEventPromoted(payload: Record<string, unknown>) {\n' +
          '  const storeResult = await this.db.storeDocument(\n' +
          '    "xiigen-promotion-analytics",\n' +
          '    { eventId: payload["eventId"], type: "impression", recordedAt: new Date().toISOString() },\n' +
          '    `analytics-${payload["eventId"]}`,\n' +
          '  );\n' +
          '  if (storeResult.isSuccess && this.campaignThresholdMet()) {\n' +
          '    await this.queue.enqueue("PromotionCampaignCompleted", { eventId: payload["eventId"] });\n' +
          '  }\n' +
          '}',
        negativeExample:
          '// T59 calling T62 directly via HTTP — Rule 11 violation\n' +
          'await fetch("/api/promotion-analytics/track", {\n' +
          '  method: "POST", body: JSON.stringify({ eventId })\n' +
          '});',
        negativeReason:
          'Direct HTTP calls between services violate Rule 11. T62 must be wired only through queue events.',
        factories: [
          {
            factoryId: 'F-DB',
            interfaceName: 'IDatabaseService',
            role: 'Analytics document storage via DATABASE_SERVICE',
          },
          {
            factoryId: 'F-Q',
            interfaceName: 'IQueueService',
            role: 'PromotionCampaignCompleted via QUEUE_SERVICE',
          },
        ],
        taskTypesTargeted: ['T62'],
        antiPatterns: [
          'HTTP call to T62 from T59 or T61 (Rule 11 violation)',
          'Synchronous T62 invocation in the promotion request path',
          'Emitting PromotionCampaignCompleted before storeDocument (DNA-8 violation)',
        ],
        tags: ['T62', 'analytics', 'event-driven', 'Rule-11', 'DNA-8', 'queue-only'],
      },
    ];

    let count = 0;
    for (const pattern of patterns) {
      const result = await this.upsertPattern(pattern);
      if (result.isSuccess) count++;
    }
    return DataProcessResult.success(count);
  }

  async indexBfaRules(): Promise<DataProcessResult<number>> {
    const rules = [
      {
        patternId: 'bfa-cf-03-1-event-created-outbox',
        ruleId: 'CF-03-1',
        flowId: 'FLOW-03',
        title: 'EventCreated document must be stored before the event is emitted',
        description:
          'T59 must call storeDocument() before queue.enqueue("EventCreated"). ' +
          'Emitting first and crashing before store leaves downstream consumers with an orphaned reference.',
        violationClass: 'BUILD_FAILURE',
        tags: ['CF-03-1', 'FLOW-03', 'outbox', 'DNA-8', 'T59'],
      },
      {
        patternId: 'bfa-cf-03-2-capacity-null-unlimited',
        ruleId: 'CF-03-2',
        flowId: 'FLOW-03',
        title: 'capacity === null is the strict machine constant for unlimited events',
        description:
          'T60 must use === null (strict equality) to determine unlimited capacity. ' +
          'Any falsy check (!capacity) incorrectly conflates capacity=0 (zero seats) with unlimited.',
        violationClass: 'BUILD_FAILURE',
        tags: ['CF-03-2', 'FLOW-03', 'capacity', 'null-unlimited', 'T59', 'T60'],
      },
      {
        patternId: 'bfa-cf-03-3-content-safety-before-promoted',
        ruleId: 'CF-03-3',
        flowId: 'FLOW-03',
        title: 'Content safety check must complete before EventPromoted is recorded',
        description:
          'T61 ContentSafetyFilter result must be evaluated before T59 updates status to PROMOTED ' +
          'and before the EventPromoted queue message is emitted. ' +
          'Unsafe events must be blocked before any downstream consumer can act on them.',
        violationClass: 'BUILD_FAILURE',
        tags: ['CF-03-3', 'FLOW-03', 'content-safety', 'T61', 'EventPromoted'],
      },
    ];

    let count = 0;
    for (const rule of rules) {
      const result = await this.upsertPattern(rule);
      if (result.isSuccess) count++;
    }
    return DataProcessResult.success(count);
  }

  async indexDesignRecords(): Promise<DataProcessResult<number>> {
    const records = [
      {
        patternId: 'dd-flow03-001-null-capacity-type-contract',
        ddRef: 'DD-F03-001',
        flowId: 'FLOW-03',
        title: 'Why null=unlimited Rather Than 0=unlimited',
        description:
          'The decision to use null (not 0) as the unlimited sentinel preserves 0 as a meaningful ' +
          'business value (zero-seat event, used for soft-launch holds). ' +
          'If 0 meant unlimited, a misconfigured event with no capacity set would silently accept ' +
          'unlimited registrations. null is intentional absence-of-limit; 0 is an explicit zero.',
        tags: ['FLOW-03', 'capacity', 'null-unlimited', 'type-contract', 'DD-F03-001'],
      },
    ];

    let count = 0;
    for (const record of records) {
      const result = await this.upsertPattern(record);
      if (result.isSuccess) count++;
    }
    return DataProcessResult.success(count);
  }
}
