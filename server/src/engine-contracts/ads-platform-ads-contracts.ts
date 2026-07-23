/**
 * FLOW-20: Sponsored Content + Graph API + Ads Platform
 * Task types: T287–T306 (20 task types)
 * Families: 103–116
 * BFA rules: CF-364–CF-379
 *
 * GAP-NEW-78: REQUEST_RESPONSE archetype — sync execution, sloMs required
 * GAP-NEW-79: sloMs and cachePolicy schema fields
 * GAP-NEW-80: F830 append-only spend ledger
 * GAP-NEW-81: Political dual-gate arbiter (T295)
 */

// ── T287 — GraphReadGate ──────────────────────────────────────────────────────

export const T287_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T287',
  name: 'GraphReadGate',
  family: 103,
  flowId: 'FLOW-20',
  archetype: 'request_response',
  version: 'v1',
  executionModel: 'sync',
  sloMs: 50,
  cachePolicy: 'read-through',
  description: 'Per-node/field/edge auth on every Graph API read request. SK-175.',
  namedChecks: ['per_field_auth_every_request', 'tenant_edge_resolver_no_user_header'],
  bfaRules: ['CF-364', 'CF-365'],
  factories: ['F734', 'F735', 'F736', 'F737', 'F738', 'F739', 'F743', 'F846'],
};

// ── T288 — GraphWriteGate ─────────────────────────────────────────────────────

export const T288_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T288',
  name: 'GraphWriteGate',
  family: 103,
  flowId: 'FLOW-20',
  archetype: 'request_response',
  version: 'v1',
  executionModel: 'sync',
  sloMs: 100,
  cachePolicy: 'write-through',
  description: 'Per-field write auth with synchronous cache invalidation before response.',
  namedChecks: ['per_field_auth_every_request', 'tenant_edge_resolver_no_user_header'],
  bfaRules: ['CF-364', 'CF-365', 'CF-366', 'CF-367'],
  factories: ['F734', 'F737', 'F738', 'F739', 'F740', 'F743', 'F846'],
};

// ── T289 — WebhookDelivery ────────────────────────────────────────────────────
// DNA-1 FIX: no WebhookPayload class — uses Record<string,unknown>

export const T289_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T289',
  name: 'WebhookDelivery',
  family: 104,
  flowId: 'FLOW-20',
  archetype: 'orchestration',
  version: 'v1',
  executionModel: 'async',
  description: 'HMAC-mandatory webhook delivery. DR-125: unsigned = BUILD FAILURE.',
  namedChecks: ['webhook_hmac_mandatory'],
  bfaRules: ['CF-368', 'CF-369', 'CF-370'],
  factories: ['F744', 'F745', 'F746', 'F747', 'F748', 'F749'],
  ironRules: [
    'IR-289-1: All webhook payloads must use Record<string,unknown> — no WebhookPayload class (DNA-1)',
    'IR-289-2: DR-125: unsigned webhook = BUILD FAILURE — HMAC signature mandatory',
  ],
};

// ── T290 — PaymentMethod ──────────────────────────────────────────────────────

export const T290_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T290',
  name: 'PaymentMethod',
  family: 105,
  flowId: 'FLOW-20',
  archetype: 'request_response',
  version: 'v1',
  executionModel: 'sync',
  sloMs: 200,
  cachePolicy: 'no-cache',
  description: 'PCI zero-PAN tokenization. DR-126: raw PAN detection = IMMEDIATE BUILD FAILURE.',
  namedChecks: ['pci_no_raw_pan'],
  bfaRules: ['CF-371', 'CF-372', 'CF-373'],
  factories: ['F750', 'F751', 'F752', 'F753', 'F754', 'F755', 'F756', 'F757', 'F758', 'F759'],
  ironRules: [
    'IR-290-1: DR-126: raw PAN must never appear in code — use tokenized PAN reference only',
  ],
};

// ── T291 — CreativeIngestion ──────────────────────────────────────────────────

export const T291_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T291',
  name: 'CreativeIngestion',
  family: 106,
  flowId: 'FLOW-20',
  archetype: 'ai_generation',
  version: 'v1',
  executionModel: 'async',
  description: '3-model conservative consensus. DD-175: lower score when divergence >10%.',
  namedChecks: ['conservative_multi_model_take_lower'],
  bfaRules: ['CF-374', 'CF-375'],
  factories: ['F760', 'F761', 'F762', 'F763', 'F764', 'F765', 'F766', 'F767'],
  ironRules: [
    'IR-291-1: DD-175: conservative multi-model — take lower score when models diverge >10%',
  ],
};

// ── T292 — AdAuction ──────────────────────────────────────────────────────────

export const T292_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T292',
  name: 'AdAuction',
  family: 107,
  flowId: 'FLOW-20',
  archetype: 'ai_generation',
  version: 'v1',
  executionModel: 'async',
  description: 'Consent-S1, Redis-only critical path, async budget decrement. DD-167, DD-166.',
  namedChecks: ['consent_blocking_pipeline_gate', 'redis_only_no_pg'],
  bfaRules: ['CF-376', 'CF-377', 'CF-378', 'CF-379'],
  scorePrediction: { min: 0.25, max: 0.45, cycles: 4 },
  factories: [
    'F768',
    'F769',
    'F770',
    'F771',
    'F772',
    'F773',
    'F774',
    'F775',
    'F776',
    'F777',
    'F778',
    'F779',
    'F780',
    'F781',
    'F782',
    'F783',
    'F784',
    'F785',
    'F810',
  ],
  ironRules: [
    'IR-292-1: DD-167: consent MUST be verified before targeting',
    'IR-292-2: DD-166: Redis-only on critical path — no PG writes in hot path',
  ],
};

// ── T293 — Attribution ────────────────────────────────────────────────────────

export const T293_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T293',
  name: 'Attribution',
  family: 108,
  flowId: 'FLOW-20',
  archetype: 'orchestration',
  version: 'v1',
  executionModel: 'async',
  description: 'Fraud-gated attribution recording. Must check F788 before recording.',
  factories: [
    'F786',
    'F787',
    'F788',
    'F789',
    'F790',
    'F791',
    'F792',
    'F793',
    'F794',
    'F795',
    'F796',
    'F797',
  ],
};

// ── T294 — AttributionValidation ─────────────────────────────────────────────

export const T294_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T294',
  name: 'AttributionValidation',
  family: 108,
  flowId: 'FLOW-20',
  archetype: 'orchestration',
  version: 'v1',
  executionModel: 'async',
  description: 'Attribution validation with fraud gate + idempotency key (click ID).',
  factories: ['F788', 'F790', 'F794', 'F795'],
};

// ── T295 — AdReview ───────────────────────────────────────────────────────────

export const T295_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T295',
  name: 'AdReview',
  family: 109,
  flowId: 'FLOW-20',
  archetype: 'ai_generation',
  version: 'v1',
  executionModel: 'async',
  description: 'Political dual-gate: BOTH AI AND human required. DD-168: no auto-approve.',
  namedChecks: ['political_dual_gate_both_ai_and_human'],
  ironRulesStructured: [{ check: 'political_dual_gate_both_ai_and_human', severity: 'score-0' }],
  factories: [
    'F798',
    'F799',
    'F800',
    'F801',
    'F802',
    'F803',
    'F804',
    'F805',
    'F806',
    'F807',
    'F808',
  ],
  ironRules: [
    'IR-295-1: DD-168: political content requires BOTH AI and human review — no auto-approval',
  ],
};

// ── T296 — SpendBilling ───────────────────────────────────────────────────────

export const T296_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T296',
  name: 'SpendBilling',
  family: 110,
  flowId: 'FLOW-20',
  archetype: 'orchestration',
  version: 'v1',
  executionModel: 'async',
  description: 'Append-only spend ledger (DD-169) + fraud gate before billing (DD-177).',
  namedChecks: ['spend_ledger_append_only', 'fraud_before_billing_ordering'],
  factories: [
    'F809',
    'F810',
    'F811',
    'F812',
    'F813',
    'F814',
    'F815',
    'F816',
    'F817',
    'F818',
    'F830',
  ],
  ironRules: [
    'IR-296-1: DD-169: spend ledger is append-only — no UPDATE or DELETE on ledger entries',
    'IR-296-2: DD-177: fraud gate ALWAYS before billing — never skip',
  ],
};

// ── T297 — FlowVersion ────────────────────────────────────────────────────────

export const T297_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T297',
  name: 'FlowVersion',
  family: 111,
  flowId: 'FLOW-20',
  archetype: 'service',
  version: 'v1',
  executionModel: 'async',
  description: 'Immutable flow config snapshots.',
  factories: ['F819', 'F820', 'F824', 'F825', 'F826'],
};

// ── T298 — TenantQuota ────────────────────────────────────────────────────────

export const T298_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T298',
  name: 'TenantQuota',
  family: 111,
  flowId: 'FLOW-20',
  archetype: 'service',
  version: 'v1',
  executionModel: 'async',
  description: 'Per-tenant quota enforcement (FREEDOM config).',
  factories: ['F821', 'F822', 'F823'],
};

// ── T299 — SchemaRegistry ─────────────────────────────────────────────────────

export const T299_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T299',
  name: 'SchemaRegistry',
  family: 112,
  flowId: 'FLOW-20',
  archetype: 'request_response',
  version: 'v1',
  executionModel: 'sync',
  sloMs: 30,
  cachePolicy: 'read-through',
  description: 'Synchronous schema lookup for Graph API requests.',
  factories: ['F827'],
};

// ── T300 — RateLimiter ────────────────────────────────────────────────────────

export const T300_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T300',
  name: 'RateLimiter',
  family: 112,
  flowId: 'FLOW-20',
  archetype: 'request_response',
  version: 'v1',
  executionModel: 'sync',
  sloMs: 20,
  cachePolicy: 'no-cache',
  description: 'Redis sliding-window rate limiter per tenant/endpoint.',
  factories: ['F828', 'F829'],
};

// ── T301 — ConsentVerification ────────────────────────────────────────────────
// DNA-1 FIX: no ConsentRecord interface cast — uses Record<string,unknown>

export const T301_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T301',
  name: 'ConsentVerification',
  family: 113,
  flowId: 'FLOW-20',
  archetype: 'orchestration',
  version: 'v1',
  executionModel: 'async',
  description: 'Blocking S1 gate in T292. Consent BEFORE targeting. DD-167.',
  namedChecks: ['consent_blocking_pipeline_gate'],
  factories: ['F834', 'F835', 'F836', 'F837', 'F838', 'F839'],
  ironRules: [
    'IR-301-1: All consent data must use Record<string,unknown> — no ConsentRecord interface cast (DNA-1)',
    'IR-301-2: DD-167: consent verified BEFORE targeting pipeline proceeds',
  ],
};

// ── T302 — OAuthFlow ──────────────────────────────────────────────────────────

export const T302_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T302',
  name: 'OAuthFlow',
  family: 112,
  flowId: 'FLOW-20',
  archetype: 'request_response',
  version: 'v1',
  executionModel: 'sync',
  sloMs: 150,
  cachePolicy: 'no-cache',
  description: 'OAuth 2.0 token issuance and validation for Graph API clients.',
  factories: ['F831', 'F832', 'F833'],
};

// ── T303 — Reconciliation ─────────────────────────────────────────────────────

export const T303_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T303',
  name: 'Reconciliation',
  family: 114,
  flowId: 'FLOW-20',
  archetype: 'orchestration',
  version: 'v1',
  executionModel: 'async',
  description: 'FLOW-13 soft dep reconciliation. IR-303-7: defers if FLOW-13 not ACTIVE.',
  factories: ['F840', 'F841', 'F842', 'F843', 'F851'],
};

// ── T304 — AttributionWindow ──────────────────────────────────────────────────

export const T304_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T304',
  name: 'AttributionWindow',
  family: 108,
  flowId: 'FLOW-20',
  archetype: 'service',
  version: 'v1',
  executionModel: 'async',
  description: 'Attribution window config (FREEDOM config per campaign).',
  factories: ['F787', 'F793'],
};

// ── T305 — FraudQuarantine ────────────────────────────────────────────────────

export const T305_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T305',
  name: 'FraudQuarantine',
  family: 115,
  flowId: 'FLOW-20',
  archetype: 'orchestration',
  version: 'v1',
  executionModel: 'async',
  description: 'Fraud gate ALWAYS before billing. DD-177: quarantined = never billed.',
  namedChecks: ['fraud_before_billing_ordering'],
  bfaRules: ['CF-379'],
  factories: ['F844', 'F845', 'F846', 'F847'],
  ironRulesStructured: [{ check: 'fraud_before_billing_ordering', severity: 'score-0' }],
};

// ── T306 — DeveloperAnalytics ─────────────────────────────────────────────────

export const T306_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T306',
  name: 'DeveloperAnalytics',
  family: 116,
  flowId: 'FLOW-20',
  archetype: 'service',
  version: 'v1',
  executionModel: 'async',
  description: 'Read-only aggregated analytics for Graph API developers.',
  factories: ['F848', 'F849'],
};

/** All FLOW-20 contracts for engine bootstrapper. */
export const FLOW_20_CONTRACTS: Record<string, unknown>[] = [
  T287_CONTRACT,
  T288_CONTRACT,
  T289_CONTRACT,
  T290_CONTRACT,
  T291_CONTRACT,
  T292_CONTRACT,
  T293_CONTRACT,
  T294_CONTRACT,
  T295_CONTRACT,
  T296_CONTRACT,
  T297_CONTRACT,
  T298_CONTRACT,
  T299_CONTRACT,
  T300_CONTRACT,
  T301_CONTRACT,
  T302_CONTRACT,
  T303_CONTRACT,
  T304_CONTRACT,
  T305_CONTRACT,
  T306_CONTRACT,
];
