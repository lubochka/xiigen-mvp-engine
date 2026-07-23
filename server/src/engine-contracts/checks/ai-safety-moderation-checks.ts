/**
 * FLOW-24 Named Checks (CF-461 through CF-472)
 *
 * 8 invariant functions for Learning Calendar (Personal AI Tutor):
 *  1. safety_compose_gate_publish_order  — CF-465 IRON RULE
 *  2. safety_gate_token_protocol         — DR-168/DD-224
 *  3. content_safety_scan_mandatory      — CF-462
 *  4. consent_blocks_all_downstream      — CF-461
 *  5. server_side_only_grading           — DD-226
 *  6. gamification_ledger_append_only    — DD-222
 *  7. streak_timezone_from_profile_not_client — DD-223
 *  8. calendar_fabric_connectors_only    — DD-225
 *
 * All functions throw on violation (invariant-style, not DataProcessResult).
 */

import type { SafetyGateToken } from '../safety-gate-token';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ExecutionLogEntry {
  step: string;
  completedAt: number; // Unix timestamp ms
}

// ── CHECK 1 — safety_compose_gate_publish_order (CF-465 IRON RULE) ────────────

export function safety_compose_gate_publish_order(executionLog: ExecutionLogEntry[]): void {
  const composeEntry = executionLog.find((e) => e.step === 'COMPOSE');
  const safetyEntry = executionLog.find((e) => e.step === 'SAFETY_GATE');
  const publishEntry = executionLog.find((e) => e.step === 'PUBLISH');

  const missing = [
    !composeEntry && 'COMPOSE',
    !safetyEntry && 'SAFETY_GATE',
    !publishEntry && 'PUBLISH',
  ].filter(Boolean) as string[];

  if (missing.length > 0) {
    throw new Error(
      `INVARIANT VIOLATION (CF-465): IRON RULE — ` +
        `Missing required step(s): ${missing.join(', ')}`,
    );
  }

  const c = composeEntry!.completedAt;
  const s = safetyEntry!.completedAt;
  const p = publishEntry!.completedAt;

  if (!(c < s && s < p)) {
    throw new Error(
      `INVARIANT VIOLATION (CF-465): IRON RULE VIOLATED — ` +
        `compose(${c}ms) → safetyGate(${s}ms) → publish(${p}ms). ` +
        `Required order: COMPOSE < SAFETY_GATE < PUBLISH. ` +
        `Score-0 on any violation.`,
    );
  }
}

// ── CHECK 2 — safety_gate_token_protocol (DR-168/DD-224) ─────────────────────

export function safety_gate_token_protocol(
  token: SafetyGateToken | undefined,
  compositionId: string,
): void {
  if (!token) {
    throw new Error(
      `INVARIANT VIOLATION (DR-168): safety_gate_token_protocol — ` +
        `No SafetyGateToken present for composition '${compositionId}'. ` +
        `F1002 must produce token before F1003 publish.`,
    );
  }

  if (token.verdict !== 'APPROVED') {
    throw new Error(
      `INVARIANT VIOLATION (DR-168): SafetyGateToken verdict is '${token.verdict}' ` +
        `for composition '${compositionId}'. Only APPROVED tokens may be passed to F1003.`,
    );
  }

  if (!token.signature || token.signature.length < 32) {
    throw new Error(
      `INVARIANT VIOLATION (DR-168): SafetyGateToken has invalid signature ` +
        `for composition '${compositionId}'. Token must be signed by F1002.`,
    );
  }

  if (!token.tokenId || !token.lessonCompositionHash) {
    throw new Error(
      `INVARIANT VIOLATION (DD-224): SafetyGateToken missing required fields ` +
        `(tokenId, lessonCompositionHash) for composition '${compositionId}'.`,
    );
  }
}

// ── CHECK 3 — content_safety_scan_mandatory (CF-462) ─────────────────────────

export function content_safety_scan_mandatory(
  token: SafetyGateToken | undefined,
  compositionId: string,
): void {
  if (!token) {
    throw new Error(
      `INVARIANT VIOLATION (CF-462): content_safety_scan_mandatory — ` +
        `No SafetyGateToken for composition '${compositionId}'. ` +
        `F1002 content safety scan is mandatory before any F1003 publish.`,
    );
  }

  if (token.verdict !== 'APPROVED') {
    throw new Error(
      `INVARIANT VIOLATION (CF-462): content_safety_scan_mandatory — ` +
        `Token verdict is '${token.verdict}' for composition '${compositionId}'. ` +
        `Content must receive APPROVED verdict.`,
    );
  }

  if (token.rejectedCategories.length > 0) {
    throw new Error(
      `INVARIANT VIOLATION (CF-462): content_safety_scan_mandatory — ` +
        `Token has rejected categories: [${token.rejectedCategories.join(', ')}] ` +
        `for composition '${compositionId}'.`,
    );
  }
}

// ── CHECK 4 — consent_blocks_all_downstream (CF-461) ─────────────────────────

export function consent_blocks_all_downstream(
  studentId: string,
  consentStatus: string,
  attemptedTaskType: string,
): void {
  const blockedTaskTypes = ['T368', 'T369', 'T370', 'T371', 'T372', 'T373', 'T374'];
  const blockingStatuses = ['DENIED', 'WITHDRAWN', 'PENDING'];

  if (blockingStatuses.includes(consentStatus) && blockedTaskTypes.includes(attemptedTaskType)) {
    throw new Error(
      `INVARIANT VIOLATION (CF-461): consent_blocks_all_downstream — ` +
        `${attemptedTaskType} attempted for student ${studentId} ` +
        `with consent.status='${consentStatus}'. All downstream task types blocked.`,
    );
  }
}

// ── CHECK 5 — server_side_only_grading (DD-226) ───────────────────────────────

export function server_side_only_grading(input: Record<string, unknown>): void {
  const rejectedFields = ['score', 'points', 'percentage', 'grade', 'mark', 'result'];

  for (const field of rejectedFields) {
    if (field in input) {
      throw new Error(
        `INVARIANT VIOLATION (DD-226): server_side_only_grading — ` +
          `Client-supplied field '${field}' detected. All grading is server-side via F1011.`,
      );
    }
    if (Array.isArray(input.answers)) {
      for (const answer of input.answers as Record<string, unknown>[]) {
        if (typeof answer === 'object' && answer !== null && field in answer) {
          throw new Error(
            `INVARIANT VIOLATION (DD-226): server_side_only_grading — ` +
              `Field '${field}' found in answers array.`,
          );
        }
      }
    }
  }
}

// ── CHECK 6 — gamification_ledger_append_only (DD-222) ───────────────────────

export function gamification_ledger_append_only(operationType: string, entryId?: string): void {
  if (operationType !== 'append') {
    throw new Error(
      `INVARIANT VIOLATION (DD-222): gamification_ledger_append_only — ` +
        `Operation '${operationType}' attempted on F1014. ` +
        `F1014 is APPEND-ONLY. Entry ID: ${entryId ?? 'N/A'}`,
    );
  }
}

// ── CHECK 7 — streak_timezone_from_profile_not_client (DD-223) ───────────────

export function streak_timezone_from_profile_not_client(params: {
  timezoneUsedForCalculation: string;
  profileTimezone: string;
  requestHeaderTimezone?: string;
}): void {
  if (params.timezoneUsedForCalculation !== params.profileTimezone) {
    throw new Error(
      `INVARIANT VIOLATION (DD-223): streak_timezone_from_profile_not_client — ` +
        `Calculation used '${params.timezoneUsedForCalculation}' but ` +
        `profile timezone is '${params.profileTimezone}'.`,
    );
  }
  if (
    params.requestHeaderTimezone &&
    params.timezoneUsedForCalculation === params.requestHeaderTimezone
  ) {
    throw new Error(
      `INVARIANT VIOLATION (DD-223): Timezone matches client request header. ` +
        `Server must use F982 profile timezone only.`,
    );
  }
}

// ── CHECK 8 — calendar_fabric_connectors_only (DD-225) ───────────────────────

export function calendar_fabric_connectors_only(
  serviceFilePath: string,
  importStatements: string[],
): void {
  const forbidden = [
    'googleapis',
    'google-calendar',
    '@microsoft/microsoft-graph',
    'ical-generator',
    'node-ical',
    'caldav',
    'tsdav',
  ];
  for (const imp of importStatements) {
    for (const f of forbidden) {
      if (imp.toLowerCase().includes(f)) {
        throw new Error(
          `INVARIANT VIOLATION (DD-225): calendar_fabric_connectors_only — ` +
            `'${serviceFilePath}' imports '${imp}'. Use F1018 ICalendarSyncConnectorFactory.`,
        );
      }
    }
  }
}
