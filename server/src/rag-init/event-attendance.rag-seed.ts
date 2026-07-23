/**
 * Flow04EventAttendanceRagSeed — RAG patterns for FLOW-04 Event Attendance.
 *
 * Key patterns:
 *   - rsvp-setnx-idempotency            (T63 CF-04-1 single storeDocument)
 *   - waitlist-fifo-promotion            (T64 CF-04-2 FIFO by joinTimestamp)
 *   - checkin-confirmed-only-gate        (T65 CONFIRMED-only check-in)
 *   - feedback-window-event-triggered    (T66 CF-04-3 event.ended only)
 *   - cancellation-slot-release          (T67 IR-67-3 slot release)
 *
 * BFA rules: CF-04-1, CF-04-2, CF-04-3
 * Design records: DD-F04-001, DD-F04-002
 *
 * DNA-3: All methods return DataProcessResult.
 * Rule 1: No SDK imports.
 */
import { Injectable } from '@nestjs/common';
import { FlowRagSeedBase } from './flow-rag-seed.base';
import { DataProcessResult } from '../kernel/data-process-result';

@Injectable()
export class Flow04EventAttendanceRagSeed extends FlowRagSeedBase {
  readonly domainId = 'flow-04-event-attendance';

  async indexPatterns(): Promise<DataProcessResult<number>> {
    const patterns = [
      // ── rsvp-setnx-idempotency (T63, CF-04-1) ───────────────────────────────

      {
        patternId: 'rsvp-setnx-idempotency',
        name: 'RSVP_SETNX_IDEMPOTENCY',
        namespace: 'event-attendance',
        pattern: 'setnx-single-store',
        title: 'RSVP SETNX Idempotency (T63)',
        version: '1.0.0',
        description:
          'T63 RSVPOrchestrator uses a SETNX-style idempotency key (attendeeId + eventId) to ensure ' +
          'exactly ONE storeDocument call per RSVP creation request. ' +
          'Case A: new RSVP — search returns empty → storeDocument once (CONFIRMED or WAITLISTED). ' +
          'Case B: idempotent return — existing record found → return it without another storeDocument. ' +
          'Case C: WAITLISTED→CONFIRMED promotion with promotionRequest:true → single storeDocument update. ' +
          'Two storeDocument calls on any code path = CF-04-1 atomicity violation.',
        useCase:
          'RSVP creation with idempotency guarantee: duplicate requests return existing record, ' +
          'never create a second RSVP for the same (attendeeId, eventId) pair',
        dnaCompliance:
          'DNA-2 (buildSearchFilter for existence check) — DNA-3 (DataProcessResult) — DNA-8 (store before emit)',
        codeExample:
          '// T63 RSVPOrchestrator — Case A: new RSVP\n' +
          'const existing = await this.db.searchDocuments(\n' +
          '  "xiigen-event-rsvps",\n' +
          '  buildSearchFilter({ attendeeId, eventId }),\n' +
          ');\n' +
          'if (existing.data.length > 0) {\n' +
          '  return DataProcessResult.success({ rsvp: existing.data[0], idempotent: true });\n' +
          '}\n' +
          '// Single storeDocument — the ONLY write on this path\n' +
          'await this.db.storeDocument("xiigen-event-rsvps", rsvpDoc, rsvpId);\n' +
          'await this.queue.enqueue("RSVPCreated", { rsvpId });',
        negativeExample:
          '// WRONG — two storeDocument calls on CONFIRMED path\n' +
          'await this.db.storeDocument("xiigen-event-rsvps", { ...rsvpDoc, status: "PENDING" }, rsvpId);\n' +
          'await this.db.storeDocument("xiigen-event-rsvps", { ...rsvpDoc, status: "CONFIRMED" }, rsvpId);',
        negativeReason:
          'Two storeDocument calls on a single RSVP creation violates CF-04-1 atomicity constraint. ' +
          'Status should be determined before the single write.',
        factories: [
          {
            factoryId: 'F-DB',
            interfaceName: 'IDatabaseService',
            role: 'RSVP document storage via DATABASE_SERVICE',
          },
          {
            factoryId: 'F-Q',
            interfaceName: 'IQueueService',
            role: 'RSVPCreated queue publish via QUEUE_SERVICE',
          },
        ],
        taskTypesTargeted: ['T63'],
        antiPatterns: [
          'Two storeDocument calls per RSVP creation',
          'storeDocument PENDING then UPDATE to CONFIRMED (two writes)',
          'Creating RSVP without existence check (allows duplicates)',
          'enqueue() before storeDocument() (DNA-8 violation)',
        ],
        tags: ['T63', 'SETNX', 'idempotency', 'CF-04-1', 'single-write', 'atomicity'],
      },

      // ── waitlist-fifo-promotion (T64, CF-04-2) ───────────────────────────────

      {
        patternId: 'waitlist-fifo-promotion',
        name: 'WAITLIST_FIFO_PROMOTION',
        namespace: 'event-attendance',
        pattern: 'fifo-sort-promote-earliest',
        title: 'Waitlist FIFO Promotion by join_timestamp (T64)',
        version: '1.0.0',
        description:
          'T64 WaitlistManager promotes waitlisted RSVPs strictly by FIFO order: ' +
          'the attendee with the earliest join_timestamp is promoted first. ' +
          'The sort must be ascending by join_timestamp (oldest first). ' +
          'T64 delegates the actual promotion write to T63 with promotionRequest:true — ' +
          'T63 performs the single storeDocument update (CF-04-1 maintained). ' +
          'If the waitlist is empty, T64 returns success (no promotion needed — not an error).',
        useCase: 'Fair waitlist promotion that respects registration order when a spot opens up',
        dnaCompliance: 'DNA-2 (buildSearchFilter for WAITLISTED query) — DNA-3 (DataProcessResult)',
        codeExample:
          '// T64 WaitlistManager\n' +
          'const waitlisted = await this.db.searchDocuments(\n' +
          '  "xiigen-event-rsvps",\n' +
          '  buildSearchFilter({ eventId, status: "WAITLISTED" }),\n' +
          ');\n' +
          'if (!waitlisted.data || waitlisted.data.length === 0) {\n' +
          '  return DataProcessResult.success({ promoted: false });\n' +
          '}\n' +
          '// Sort ascending by join_timestamp — earliest first\n' +
          'const sorted = [...waitlisted.data].sort((a, b) =>\n' +
          '  new Date(a["join_timestamp"] as string).getTime() -\n' +
          '  new Date(b["join_timestamp"] as string).getTime()\n' +
          ');\n' +
          'const earliest = sorted[0];\n' +
          '// Delegate write to T63 — maintains CF-04-1 single storeDocument\n' +
          'return this.rsvpOrchestrator.rsvp({\n' +
          '  attendeeId: earliest["attendee_id"] as string,\n' +
          '  eventId,\n' +
          '  tenantId,\n' +
          '  promotionRequest: true,\n' +
          '});',
        negativeExample:
          '// WRONG — T64 directly stores without delegation to T63\n' +
          'const promoted = waitlisted.data[0]; // no sort — arbitrary order\n' +
          'await this.db.storeDocument("xiigen-event-rsvps",\n' +
          '  { ...promoted, status: "CONFIRMED" }, promoted["rsvp_id"] as string\n' +
          ');',
        negativeReason:
          'Direct write from T64 bypasses T63 idempotency logic, and missing sort violates FIFO. ' +
          'Violates CF-04-2 (ordering) and CF-04-1 (single-write responsibility).',
        factories: [
          {
            factoryId: 'F-DB',
            interfaceName: 'IDatabaseService',
            role: 'Waitlisted RSVP query via DATABASE_SERVICE',
          },
          {
            factoryId: 'T63',
            interfaceName: 'RSVPOrchestrator',
            role: 'T63 delegated promotion write',
          },
        ],
        taskTypesTargeted: ['T64'],
        antiPatterns: [
          'Sorting descending (promotes latest instead of earliest)',
          'Not sorting at all (arbitrary promotion)',
          'T64 writing directly to DB instead of delegating to T63',
          'Returning failure when waitlist is empty (should be success)',
        ],
        tags: ['T64', 'waitlist', 'FIFO', 'join_timestamp', 'CF-04-2', 'sort-ascending'],
      },

      // ── checkin-confirmed-only-gate (T65) ────────────────────────────────────

      {
        patternId: 'checkin-confirmed-only-gate',
        name: 'CHECKIN_CONFIRMED_ONLY_GATE',
        namespace: 'event-attendance',
        pattern: 'status-gate-before-checkin',
        title: 'Check-In Requires CONFIRMED RSVP Status (T65)',
        version: '1.0.0',
        description:
          'T65 CheckInProcessor gates check-in on CONFIRMED RSVP status. ' +
          'WAITLISTED attendees cannot check in (they do not have a seat). ' +
          'Already-checked-in attendees return success with alreadyCheckedIn:true (idempotent). ' +
          'No RSVP found → success with reason NO_RSVP (not a system error — normal business case). ' +
          'All non-success paths return DataProcessResult.success() with a reason field — never failure(). ' +
          'SETNX by attendeeId prevents double check-in even under concurrent requests.',
        useCase:
          'Event check-in that is idempotent, CONFIRMED-only, and returns structured non-error results for business states',
        dnaCompliance:
          'DNA-2 (buildSearchFilter) — DNA-3 (DataProcessResult) — DNA-8 (checkin record before emit)',
        codeExample:
          '// T65 CheckInProcessor\n' +
          'const rsvpResult = await this.db.searchDocuments(\n' +
          '  "xiigen-event-rsvps",\n' +
          '  buildSearchFilter({ attendeeId, eventId }),\n' +
          ');\n' +
          'if (!rsvpResult.data || rsvpResult.data.length === 0) {\n' +
          '  return DataProcessResult.success({ checkedIn: false, reason: "NO_RSVP" });\n' +
          '}\n' +
          'const rsvp = rsvpResult.data[0];\n' +
          'if (rsvp["status"] !== "CONFIRMED") {\n' +
          '  return DataProcessResult.success({ checkedIn: false, reason: "NOT_CONFIRMED" });\n' +
          '}\n' +
          '// SETNX — skip if already checked in\n' +
          'const existing = await this.db.searchDocuments("xiigen-event-checkins", ...);\n' +
          'if (existing.data.length > 0) {\n' +
          '  return DataProcessResult.success({ checkedIn: true, alreadyCheckedIn: true });\n' +
          '}\n' +
          'await this.db.storeDocument("xiigen-event-checkins", checkinDoc, checkinId);\n' +
          'await this.queue.enqueue("AttendeeCheckedIn", { attendeeId, eventId });',
        negativeExample:
          '// WRONG — allows WAITLISTED check-in\n' +
          'if (rsvpResult.data.length > 0) {\n' +
          '  await this.db.storeDocument("xiigen-event-checkins", checkinDoc, checkinId);\n' +
          '}',
        negativeReason:
          'Not checking RSVP status allows WAITLISTED attendees to check in without a confirmed seat.',
        factories: [
          {
            factoryId: 'F-DB',
            interfaceName: 'IDatabaseService',
            role: 'RSVP and check-in records via DATABASE_SERVICE',
          },
          {
            factoryId: 'F-Q',
            interfaceName: 'IQueueService',
            role: 'AttendeeCheckedIn via QUEUE_SERVICE',
          },
        ],
        taskTypesTargeted: ['T65'],
        antiPatterns: [
          'Allowing check-in without verifying CONFIRMED status',
          'Returning failure() on NO_RSVP (should be success with reason)',
          'Double check-in without SETNX guard',
          'enqueue AttendeeCheckedIn before storeDocument (DNA-8 violation)',
        ],
        tags: ['T65', 'check-in', 'CONFIRMED-only', 'SETNX', 'idempotent', 'status-gate'],
      },

      // ── feedback-window-event-triggered (T66, CF-04-3) ──────────────────────

      {
        patternId: 'feedback-window-event-triggered',
        name: 'FEEDBACK_WINDOW_EVENT_TRIGGERED',
        namespace: 'event-attendance',
        pattern: 'event-driven-window-open',
        title: 'Feedback Window Opened by event.ended Only (T66)',
        version: '1.0.0',
        description:
          'T66 FeedbackWindowService opens the post-event feedback window in response to the ' +
          '"event.ended" domain event on the queue. ' +
          'It must NOT be triggered by a timer, a cron job, an HTTP endpoint, or any direct call. ' +
          'The feedback window duration is read from FREEDOM config (xiigen.flow04.feedbackWindowHours), ' +
          'never hardcoded. T66 is idempotent: opening a window that is already open returns ' +
          'success with idempotent:true.',
        useCase:
          'Post-event feedback window that opens exactly when the event ends, driven by domain event',
        dnaCompliance:
          'DNA-3 (DataProcessResult) — DNA-8 (store window record before emit) — Rule 14 (FREEDOM config)',
        codeExample:
          '@EventPattern("event.ended")\n' +
          'async handleEventEnded(payload: Record<string, unknown>) {\n' +
          '  const hours = await this.freedomConfig.get(\n' +
          '    XIIGEN_FREEDOM_KEYS.FLOW04_FEEDBACK_WINDOW_HOURS\n' +
          '  ) ?? 24;\n' +
          '  const opensAt = new Date().toISOString();\n' +
          '  const closesAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();\n' +
          '  await this.db.storeDocument("xiigen-feedback-windows",\n' +
          '    { eventId: payload["eventId"], opensAt, closesAt },\n' +
          '    `fw-${payload["eventId"]}`,\n' +
          '  );\n' +
          '}',
        negativeExample:
          '// WRONG — HTTP endpoint that opens feedback window directly\n' +
          '@Post("/feedback-windows/open")\n' +
          'async openWindow(@Body() body: Record<string, unknown>) {\n' +
          '  await this.feedbackWindow.open(body["eventId"] as string);\n' +
          '}',
        negativeReason:
          'An HTTP endpoint for opening the feedback window allows the window to be opened ' +
          'independently of the event lifecycle, bypassing the event.ended trigger. Violates CF-04-3.',
        factories: [
          {
            factoryId: 'F-DB',
            interfaceName: 'IDatabaseService',
            role: 'Feedback window record via DATABASE_SERVICE',
          },
          {
            factoryId: 'F-CFG',
            interfaceName: 'IFreedomConfigService',
            role: 'feedbackWindowHours from FREEDOM config',
          },
        ],
        taskTypesTargeted: ['T66'],
        antiPatterns: [
          'Timer-triggered feedback window open',
          'HTTP endpoint to open feedback window',
          'Cron job to open feedback window',
          'Hardcoded feedback window duration (Rule 14 violation)',
          'Opening feedback window in T65 or T67 directly',
        ],
        tags: [
          'T66',
          'feedback-window',
          'event.ended',
          'event-driven',
          'CF-04-3',
          'FREEDOM-config',
        ],
      },

      // ── cancellation-slot-release (T67, IR-67-3) ─────────────────────────────

      {
        patternId: 'cancellation-slot-release',
        name: 'CANCELLATION_SLOT_RELEASE',
        namespace: 'event-attendance',
        pattern: 'conditional-slot-release',
        title: 'CONFIRMED Cancellation Releases Slot; WAITLISTED Does Not (T67)',
        version: '1.0.0',
        description:
          'T67 CancellationProcessor cancels an RSVP and conditionally triggers WaitlistManager.promoteNext(). ' +
          'IR-67-3: only a CONFIRMED cancellation releases a capacity slot, so only CONFIRMED cancellations ' +
          'trigger promoteNext(). A WAITLISTED cancellation removes the attendee from the queue but ' +
          'does NOT free a slot (they did not have one). ' +
          'Cancellations are also window-guarded: if the current time is past cancellable_until, ' +
          'T67 returns success with windowClosed:true — not a system error. ' +
          'CANCELLED→CANCELLED cancellation is idempotent.',
        useCase:
          'RSVP cancellation with conditional slot release and cancellation-window enforcement',
        dnaCompliance: 'DNA-3 (DataProcessResult) — DNA-8 (storeDocument before queue emit)',
        codeExample:
          '// T67 CancellationProcessor\n' +
          'const wasConfirmed = rsvp["status"] === "CONFIRMED";\n' +
          '// storeDocument (DNA-8) BEFORE any queue emit\n' +
          'await this.db.storeDocument("xiigen-event-rsvps",\n' +
          '  { ...rsvp, status: "CANCELLED" }, rsvpId\n' +
          ');\n' +
          'await this.queue.enqueue("RSVPCancelled", { rsvpId, eventId });\n' +
          '// Only promote if a seat was freed\n' +
          'if (wasConfirmed) {\n' +
          '  await this.waitlistManager.promoteNext({ eventId, tenantId });\n' +
          '}',
        negativeExample:
          '// WRONG — always promote regardless of prior status\n' +
          'await this.db.storeDocument("xiigen-event-rsvps",\n' +
          '  { ...rsvp, status: "CANCELLED" }, rsvpId\n' +
          ');\n' +
          'await this.waitlistManager.promoteNext({ eventId, tenantId }); // unconditional — wrong',
        negativeReason:
          'Unconditional promoteNext() on WAITLISTED cancellation wastes a promotion cycle — ' +
          'no seat was released, so no promotion should occur. Violates IR-67-3.',
        factories: [
          {
            factoryId: 'F-DB',
            interfaceName: 'IDatabaseService',
            role: 'RSVP cancellation record via DATABASE_SERVICE',
          },
          {
            factoryId: 'F-Q',
            interfaceName: 'IQueueService',
            role: 'RSVPCancelled via QUEUE_SERVICE',
          },
          {
            factoryId: 'T64',
            interfaceName: 'WaitlistManager',
            role: 'T64 conditional promoteNext()',
          },
        ],
        taskTypesTargeted: ['T67'],
        antiPatterns: [
          'promoteNext() on WAITLISTED cancellation',
          'promoteNext() before storeDocument (DNA-8 violation)',
          'Returning failure() when cancellation window is closed (should be success with windowClosed:true)',
          'Allowing cancellation of already-CANCELLED RSVP to trigger promotion again',
        ],
        tags: ['T67', 'cancellation', 'slot-release', 'IR-67-3', 'conditional-promote', 'waitlist'],
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
        patternId: 'bfa-cf-04-1-rsvp-single-store',
        ruleId: 'CF-04-1',
        flowId: 'FLOW-04',
        title: 'Exactly one storeDocument call per RSVP creation request',
        description:
          'T63 must produce exactly 1 storeDocument call for CONFIRMED and WAITLISTED outcomes, ' +
          'and 0 storeDocument calls for DUPLICATE (idempotent return). ' +
          'Multiple writes on a single path = atomicity violation.',
        violationClass: 'BUILD_FAILURE',
        tags: ['CF-04-1', 'FLOW-04', 'single-write', 'T63', 'atomicity'],
      },
      {
        patternId: 'bfa-cf-04-2-waitlist-fifo',
        ruleId: 'CF-04-2',
        flowId: 'FLOW-04',
        title: 'Waitlist promotion must use FIFO ordering by join_timestamp',
        description:
          'T64 must sort waitlisted RSVPs ascending by join_timestamp and promote the earliest. ' +
          'Any other ordering (random, by name, by rsvpId) violates fairness and CF-04-2.',
        violationClass: 'BUILD_FAILURE',
        tags: ['CF-04-2', 'FLOW-04', 'FIFO', 'join_timestamp', 'T64'],
      },
      {
        patternId: 'bfa-cf-04-3-feedback-event-triggered',
        ruleId: 'CF-04-3',
        flowId: 'FLOW-04',
        title: 'Feedback window must be triggered by event.ended domain event only',
        description:
          'T66 must listen for the "event.ended" queue event to open the feedback window. ' +
          'Timer, cron, HTTP, or direct-call triggers are forbidden. ' +
          'The trigger must be traceable in the event audit log.',
        violationClass: 'BUILD_FAILURE',
        tags: ['CF-04-3', 'FLOW-04', 'feedback-window', 'event.ended', 'T66'],
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
        patternId: 'dd-flow04-001-confirmed-cancel-triggers-promote',
        ddRef: 'DD-F04-001',
        flowId: 'FLOW-04',
        title: 'Why Only CONFIRMED Cancellation Triggers Waitlist Promotion',
        description:
          'A CONFIRMED attendee occupies a capacity slot. Cancelling a CONFIRMED RSVP releases ' +
          'that slot, making room for the next waitlisted attendee. ' +
          'A WAITLISTED attendee is queued but has no slot. ' +
          'Cancelling a WAITLISTED RSVP removes them from the queue without freeing any capacity. ' +
          'Triggering promoteNext() on WAITLISTED cancellation would promote someone into a ' +
          'slot that was never actually freed — causing over-capacity.',
        tags: ['FLOW-04', 'cancellation', 'IR-67-3', 'slot-release', 'DD-F04-001'],
      },
      {
        patternId: 'dd-flow04-002-rsvp-setnx-not-search-then-create',
        ddRef: 'DD-F04-002',
        flowId: 'FLOW-04',
        title: 'Why RSVP Uses SETNX Pattern (Not Search-Then-Create)',
        description:
          'A naive search-then-create approach has a TOCTOU race: two concurrent requests for ' +
          'the same (attendeeId, eventId) both search, find nothing, and both create — producing ' +
          'two RSVPs for the same attendee. ' +
          'The SETNX pattern uses the (attendeeId, eventId) composite key as the document ID, ' +
          'so the second concurrent write either overwrites the first (idempotent) or is rejected ' +
          'by an optimistic lock, depending on the fabric implementation. ' +
          'T63 searches first for the idempotent-return path, then stores with the deterministic key ' +
          'so the final state is always a single canonical RSVP record.',
        tags: ['FLOW-04', 'T63', 'SETNX', 'idempotency', 'race-condition', 'DD-F04-002'],
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
