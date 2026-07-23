/**
 * FLOW-24 BFA Rules — AI Safety & Content Moderation (T367–T374)
 *
 * CF-24-1: T367 ConsentAndEnrollmentGate — CONSENT_GATE entry for ALL outcomes (GRANTED/DENIED/PENDING/WITHDRAWN)
 * CF-24-2: T368 ComposeStage/SafetyGateStage/PublishStage — saga ordering via saga log, not timestamps
 * CF-24-3: T369 QuizGradingGate — CLIENT_SCORE_REJECTED at ORDER 1, gamification async after HTTP response
 * CF-24-4: T370–T374 — Timezone from F982 profile ONLY, FREEDOM_GATED skip-not-fail, F1018 calendar fabric only
 */

export const AI_SAFETY_MODERATION_BFA_RULES = [
  {
    ruleId: 'CF-24-1',
    flowId: 'FLOW-24',
    description:
      'T367 ConsentAndEnrollmentGate: consent gate writes CONSENT_GATE entry for ALL outcomes. ' +
      'Outcomes: GRANTED, DENIED, PENDING, WITHDRAWN. ' +
      'storeDocument(CONSENT_GATE entry) for each outcome before emitting downstream event. ' +
      'T368–T374 must read CONSENT_GATE to determine pass/block status. ' +
      'Missing CONSENT_GATE entry = fail-closed (treated as DENIED for all downstream TTs). ' +
      'storeDocument at ORDER 1 BEFORE enqueue(ConsentGranted or ConsentDenied). DNA-8. ' +
      'If GRANTED, proceed to T368; if DENIED/PENDING/WITHDRAWN, emit ConsentDenied and STOP. ' +
      'SF-CHECK-24-1.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-24-2',
    flowId: 'FLOW-24',
    description:
      'T368 ComposeStage/SafetyGateStage/PublishStage: saga ordering via saga log, never timestamp comparison. ' +
      'COMPOSE→SAFETY_GATE→PUBLISH is non-negotiable three-stage saga. ' +
      'Saga log entry format: { stageName, stageId, timestamp, resultCode, resultData }. ' +
      'ORDER 1: ComposeStage storeDocument(lesson draft) BEFORE T368-S1 emit. ' +
      'ORDER 2: SafetyGateStage reads ComposeStage sagaId, runs safety check, storeDocument(safety result) BEFORE T368-S2 emit. ' +
      'ORDER 3: PublishStage reads ComposeStage sagaId + SafetyGateStage sagaId, requires safetyPassed: true in saga log BEFORE storeDocument(published lesson). ' +
      'xiigen-published-lessons is GLOBAL intentional (scope_isolation must explicitly permit in arbiterConfig). ' +
      'Safety gate CANNOT be skipped. Score-based pass/fail: safety_score >= threshold → safetyPassed: true. ' +
      'Never use request timestamp for ordering — always use saga log sequence. ' +
      'storeDocument(saga audit) at ORDER 4 in all three stages BEFORE enqueue. DNA-8. ' +
      'Timestamp-based ordering, skipping safety gate, or enqueue before saga log = BUILD_FAILURE. ' +
      'SF-CHECK-24-2.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-24-3',
    flowId: 'FLOW-24',
    description:
      'T369 QuizGradingGate: client-submitted score fields REJECTED at ORDER 1. ' +
      'Rejected fields: score, points, percentage, grade, mark, result (case-insensitive). ' +
      'Rejection code: CLIENT_SCORE_REJECTED. ' +
      'INPUT_VALIDATION → CONSENT_GATE_CHECK → QUIZ_SESSION_LOAD → IDEMPOTENCY_CHECK → SUBMISSION_STORE → SERVER_SIDE_GRADING → GRADE_PERSIST (sync phases). ' +
      'Gamification dispatch to F1014 fires AFTER HTTP response (async, fire-and-forget). ' +
      'No sync blocking on gamification. ' +
      'F1014.appendPoints() only — never update previous points ledger entries. ' +
      'Gamification ledger append-only: each activity creates new entry, no updates. ' +
      'storeDocument(grading audit) at ORDER 4 BEFORE GradingCompleted enqueue. DNA-8. ' +
      'Client score fields not rejected, gamification blocking response, or F1014 updateDocument = BUILD_FAILURE. ' +
      'SF-CHECK-24-3.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  // P11 (CF-981..CF-984) — edge-case coverage from docs/flow-coverage/ai-safety-moderation/P10-server-specs.md
  {
    ruleId: 'CF-981',
    flowId: 'FLOW-24',
    type: 'CONCURRENCY_CONSTRAINT',
    description:
      'EC-7 Optimistic concurrency on POST /api/dynamic/ai-safety-moderation — winner 201, loser 409 {code:CONCURRENT_UPDATE}. Client retries (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-982',
    flowId: 'FLOW-24',
    type: 'IDEMPOTENCY_CONSTRAINT',
    description:
      'EC-8 X-Idempotency-Key replay — first call 201+stores; retries return 200 cached response; no duplicate side effects (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-983',
    flowId: 'FLOW-24',
    type: 'ORDERING_CONSTRAINT',
    description:
      'EC-10 Boundary validation — empty/null/zero primary field → 400 {code:VALIDATION_FAILED, details:[{field,reason}]}; no partial write (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-984',
    flowId: 'FLOW-24',
    type: 'DNA8_ORDERING',
    description:
      'EC-11 Fabric timeout — 504 {code:TIMEOUT, retryAfterMs}; outbox row retained; queue consumer retries deduplicatively (DNA-8) (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-24-4',
    flowId: 'FLOW-24',
    description:
      'T370–T374: Timezone-from-profile-only enforcement, FREEDOM_GATED, Calendar fabric connectors. ' +
      'T370 LearningStreakEvaluationGate: DD-223 — timezone MUST come from F982 student profile ONLY. ' +
      'Never from request headers, client-supplied fields, or UTC fallback. ' +
      'Returns TIMEZONE_NOT_IN_PROFILE failure when profile.timezone missing. ' +
      'T371 PersonalizedLessonScheduler: AI-driven. Also reads F982 profile for timezone-aware scheduling. ' +
      'T372 DomainPackDeliveryGate: FREEDOM_GATED — missing DOMAIN_PACK config → DataProcessResult.success({ skipped: true }) NOT failure. ' +
      'T373 CalendarSyncConnectorGate: DD-225 — F1018 ICalendarSyncConnectorFactory ONLY. ' +
      'No direct googleapis or microsoft-graph SDK imports. ' +
      'T374 AdvancedProgressTracker: FREEDOM_GATED — missing config → success({ skipped: true }). ' +
      'All services storeDocument before enqueue. DNA-8. ' +
      'Timezone from UTC, config-missing returning FAILURE, or direct SDK imports = BUILD_FAILURE. ' +
      'SF-CHECK-24-4.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
];
