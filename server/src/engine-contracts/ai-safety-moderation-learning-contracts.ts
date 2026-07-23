/**
 * FLOW-24: Learning Calendar (Personal AI Tutor)
 * Task types: T367–T374 (8 task types)
 * Families: 140–146
 * BFA rules: CF-458–CF-472 (15 rules)
 * Factories: F982–F1027 (46 factories, 5 PLATFORM-ONLY)
 * Wave: 4 (last user-facing flow)
 *
 * GAP-M1: SafetyGateToken protocol (DR-168/DD-224)
 * GAP-M2: Consent-blocks-all-downstream gate topology (CF-461)
 * GAP-M3: IRON RULE order validator (CF-465)
 * GAP-M4: Server-side grading enforcement (DD-226)
 * GAP-M5: HYBRID_SYNC_ASYNC execution model (DD-220)
 * GAP-M6: FREEDOM_GATED skip-not-fail outcome
 * GAP-M7: Timezone-from-profile enforcement (DD-223)
 * GAP-M8: Append-only gamification ledger — F1014 (DD-222)
 * GAP-M9: Calendar FABRIC connectors only — F1018 (DD-225)
 */

// ── T367 — ConsentAndEnrollmentGate ──────────────────────────────────────────

export const T367_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T367',
  name: 'ConsentAndEnrollmentGate',
  family: 140,
  flowId: 'FLOW-24',
  archetype: 'orchestration',
  version: 'v1',
  executionModel: 'async',
  description:
    'CF-461: Consent gate. Writes CONSENT_GATE entry for all outcomes (GRANTED/DENIED/PENDING/WITHDRAWN). Blocks T368-T374 on non-GRANTED status.',
  namedChecks: ['consent_blocks_all_downstream'],
  bfaRules: ['CF-458', 'CF-459', 'CF-461'],
  factories: ['F982', 'F983', 'F984', 'F985', 'F986', 'F987'],
  ironRules: [
    'IR-367-1: CF-461: Must write CONSENT_GATE entry for ALL consent outcomes — not only GRANTED',
    'IR-367-2: Fail-closed: missing CONSENT_GATE entry = DENIED for all downstream TTs',
  ],
};

// ── T368 — LessonCompositionEngine ───────────────────────────────────────────

export const T368_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T368',
  name: 'LessonCompositionEngine',
  family: 141,
  flowId: 'FLOW-24',
  archetype: 'ai_generation',
  version: 'v1',
  executionModel: 'async',
  description:
    'CF-465 IRON RULE: compose → safety gate → publish order enforced. F1002 token required before F1003 publish.',
  namedChecks: [
    'safety_compose_gate_publish_order',
    'safety_gate_token_protocol',
    'content_safety_scan_mandatory',
  ],
  bfaRules: ['CF-460', 'CF-462', 'CF-464', 'CF-465'],
  factories: ['F988', 'F989', 'F990', 'F991', 'F992', 'F993', 'F994', 'F995', 'F996'],
  ironRulesStructured: [{ check: 'safety_compose_gate_publish_order', severity: 'score-0' }],
  ironRules: [
    'IR-368-1: CF-465: compose → safety gate → publish order is NON-NEGOTIABLE — score-0 if violated',
    'IR-368-2: DR-168: F1003.publishLesson() MUST receive SafetyGateToken from F1002',
  ],
};

// ── T369 — QuizGradingGate ────────────────────────────────────────────────────

export const T369_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T369',
  name: 'QuizGradingGate',
  family: 142,
  flowId: 'FLOW-24',
  archetype: 'orchestration',
  executionModel: 'HYBRID_SYNC_ASYNC',
  version: 'v1',
  description:
    'DD-220: Hybrid sync/async. Grading sync (in response), gamification async (fire-after-response). DD-226: Client score fields rejected before processing.',
  namedChecks: [
    'server_side_only_grading',
    'gamification_ledger_append_only',
    'consent_blocks_all_downstream',
  ],
  bfaRules: ['CF-461', 'CF-463', 'CF-466', 'CF-467'],
  hybridConfig: {
    syncPhase: {
      steps: [
        'INPUT_VALIDATION',
        'CONSENT_GATE_CHECK',
        'QUIZ_SESSION_LOAD',
        'IDEMPOTENCY_CHECK',
        'SUBMISSION_STORE',
        'SERVER_SIDE_GRADING',
        'GRADE_PERSIST',
      ],
    },
    asyncPhase: {
      steps: ['GAMIFICATION_DISPATCH', 'LEDGER_APPEND', 'ANALYTICS_UPDATE'],
      errorHandler: 'LOG_AND_IGNORE',
    },
  },
  inputValidation: {
    rejectedFields: ['score', 'points', 'percentage', 'grade', 'mark', 'result'],
    rejectionCode: 'CLIENT_SCORE_REJECTED',
    rejectionMessage:
      'DD-226: Client-supplied score fields are not accepted. All scoring is server-side by F1011.',
    arrayFieldsToCheck: ['answers'],
  },
  factories: ['F997', 'F998', 'F999', 'F1000', 'F1001', 'F1011', 'F1012', 'F1013', 'F1014'],
  ironRules: [
    'IR-369-1: DD-226: CLIENT_SCORE_REJECTED for any client-supplied score field — first operation',
    'IR-369-2: DD-220: Gamification fires AFTER HTTP response — no sync blocking',
    'IR-369-3: F1014 is APPEND-ONLY — gamification_ledger_append_only check enforced',
  ],
};

// ── T370 — LearningStreakEvaluationGate ───────────────────────────────────────

export const T370_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T370',
  name: 'LearningStreakEvaluationGate',
  family: 143,
  flowId: 'FLOW-24',
  archetype: 'service',
  version: 'v1',
  executionModel: 'async',
  description:
    'DD-223: Timezone exclusively from F982 student profile. Never from request headers or client-supplied fields.',
  namedChecks: ['streak_timezone_from_profile_not_client'],
  bfaRules: ['CF-461', 'CF-468', 'CF-471'],
  factories: ['F1004', 'F1005', 'F1006', 'F1007', 'F1008'],
  ironRules: [
    'IR-370-1: DD-223: Timezone MUST come from F982 profile only — never from request headers',
    'IR-370-2: Returns TIMEZONE_NOT_IN_PROFILE failure when profile.timezone is missing',
  ],
};

// ── T371 — PersonalizedLessonScheduler ───────────────────────────────────────

export const T371_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T371',
  name: 'PersonalizedLessonScheduler',
  family: 143,
  flowId: 'FLOW-24',
  archetype: 'ai_generation',
  version: 'v1',
  executionModel: 'async',
  description: 'AI-driven lesson scheduling. Uses F982 profile for timezone-aware scheduling.',
  bfaRules: ['CF-461', 'CF-469'],
  factories: ['F1009', 'F1010', 'F1015', 'F1016', 'F1017'],
};

// ── T372 — DomainPackDeliveryGate ─────────────────────────────────────────────

export const T372_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T372',
  name: 'DomainPackDeliveryGate',
  family: 144,
  flowId: 'FLOW-24',
  archetype: 'orchestration',
  version: 'v1',
  executionModel: 'async',
  description:
    'FREEDOM_GATED: returns SKIP (not FAIL) when DOMAIN_PACK config key missing. First SKIP outcome in engine.',
  bfaRules: ['CF-461', 'CF-470'],
  factories: ['F1019', 'F1020', 'F1021'],
  ironRules: [
    'IR-372-1: Missing DOMAIN_PACK config → SKIP not FAIL. DataProcessResult.success({ skipped: true })',
  ],
};

// ── T373 — CalendarSyncConnectorGate ─────────────────────────────────────────

export const T373_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T373',
  name: 'CalendarSyncConnectorGate',
  family: 145,
  flowId: 'FLOW-24',
  archetype: 'orchestration',
  version: 'v1',
  executionModel: 'async',
  description:
    'DD-225: All calendar sync via F1018 ICalendarSyncConnectorFactory. No direct SDK imports.',
  namedChecks: ['calendar_fabric_connectors_only'],
  bfaRules: ['CF-461', 'CF-472'],
  factories: ['F1018', 'F1022', 'F1023', 'F1024'],
  ironRules: [
    'IR-373-1: DD-225: T373 must use @Inject(CALENDAR_SYNC_CONNECTOR_FACTORY) — no googleapis/outlook SDK imports',
  ],
};

// ── T374 — AdvancedProgressTracker ───────────────────────────────────────────

export const T374_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T374',
  name: 'AdvancedProgressTracker',
  family: 146,
  flowId: 'FLOW-24',
  archetype: 'service',
  version: 'v1',
  executionModel: 'async',
  description:
    'Advanced progress tracking. CF-465: compose-safety-publish order enforced. FREEDOM_GATED: SKIP when feature disabled.',
  namedChecks: ['safety_compose_gate_publish_order', 'gamification_ledger_append_only'],
  bfaRules: ['CF-461', 'CF-465'],
  factories: ['F1025', 'F1026', 'F1027'],
  ironRules: [
    'IR-374-1: CF-465: compose-safety-publish order enforced — score-0 on violation',
    'IR-374-2: FREEDOM_GATED: returns SKIP when advanced tracking config missing',
  ],
};

/** All FLOW-24 contracts for engine bootstrapper. */
export const FLOW_24_CONTRACTS: Record<string, unknown>[] = [
  T367_CONTRACT,
  T368_CONTRACT,
  T369_CONTRACT,
  T370_CONTRACT,
  T371_CONTRACT,
  T372_CONTRACT,
  T373_CONTRACT,
  T374_CONTRACT,
];
