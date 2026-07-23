/**
 * FLOW-08: Marketplace Listings & Catalog
 * Task types: T79–T82 (pre-allocated) → resolved to T83–T86 after collision resolution
 * Note: FLOW-07 and FLOW-08 collide on T79–T82. Per MASTER-PLAN-v4:
 *   FLOW-08 uses T83–T86 after pre-allocation session resolves the collision.
 *   Families: 29–32 (Wave 2 final flow)
 * BFA rules: CF-813–CF-820
 * Factories: F244–F253 (post-collision-resolution)
 * Wave: 2 (parallel) — FINAL Wave 2 flow
 *
 * Architectural notes (SESSION-FLOW-08-MASTER-v4):
 *   T83 (ListingPublisher) — audit outbox BEFORE moderation, price check, everything
 *   T83 — moderation failure → DRAFT (DataProcessResult.success({ status: 'DRAFT' }))
 *   T83 — zero price is valid (price < 0 → reject; price = 0 → free listing, accept)
 *   T84 (CatalogIndexer) — cross-flow factory dependency on F227 ISearchIndexService (FLOW-07)
 *   T85 (ListingFeedGenerator) — count only in payload: { count: N }
 *   T86 (ListingAnalyticsAggregator) — MACHINE formula: conversionRate = inquiries / (views || 1)
 *   B-001 — cannot be ACTIVE unless FLOW-08 is ACTIVE
 *
 * DNA compliance:
 *   DNA-2: all queries use Record<string, unknown>
 *   DNA-3: all methods return DataProcessResult
 *   DNA-8: storeDocument() BEFORE enqueue() — T83 is STRICTER: audit write is absolutely first
 */

// ── T83 — ListingPublisher ────────────────────────────────────────────────────

export const T83_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T83',
  name: 'ListingPublisher',
  family: 29,
  flowId: 'FLOW-08',
  archetype: 'submission_gateway',
  version: 'v1',
  executionModel: 'async',
  description:
    'Publishes marketplace listings. Execution order (STRICT): ' +
    '1. F251 audit write FIRST (stricter than DNA-8) ' +
    '2. F249 moderation check ' +
    '3. F247 price validation ' +
    '4. F244 persist listing ' +
    '5. storeDocument() ' +
    '6. enqueue(). ' +
    'Moderation failure → DataProcessResult.success({ status: "DRAFT" }) — NOT failure. ' +
    'price < 0 → reject; price = 0 → accept (free listing). ' +
    'Moderation before audit = BUILD_FAILURE.',
  requiredFactories: ['F244', 'F247', 'F249', 'F251'],
  bfaRules: ['CF-813', 'CF-814', 'CF-815'],
  ironRules: [
    'IR-1: audit write BEFORE moderation, price check, everything (stricter than DNA-8)',
    'IR-2: moderation failure → DataProcessResult.success({ status: "DRAFT" }) — never failure()',
    'IR-3: price < 0 → reject; price = 0 → accept (free listing)',
    'IR-4: storeDocument BEFORE enqueue (DNA-8)',
  ],
  ragPatterns: ['audit-outbox-first', 'moderation-to-draft-not-failure', 'zero-price-valid'],
  auditFirst: {
    required: true,
    factoryId: 'F251',
    mustPrecedeModeration: true,
    violationClass: 'BUILD_FAILURE',
  },
  moderationPolicy: {
    failureResult: 'DRAFT',
    failureType: 'success',
    noDeletion: true,
  },
  priceValidation: {
    rejectBelow: 0,
    acceptZero: true,
    freeListingAllowed: true,
  },
};

// ── T84 — CatalogIndexer ──────────────────────────────────────────────────────

export const T84_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T84',
  name: 'CatalogIndexer',
  family: 29,
  flowId: 'FLOW-08',
  archetype: 'data_pipeline',
  version: 'v1',
  executionModel: 'async',
  description:
    'Indexes marketplace listings into the search catalog. ' +
    'Cross-flow factory dependency: F227 ISearchIndexService (registered by FLOW-07). ' +
    'Phase A gate: if FLOW-07 not ACTIVE, self-register F227. ' +
    'Version-keyed idempotency: same listingId + version always produces same index doc.',
  requiredFactories: ['F244', 'F227'],
  crossFlowFactoryDependencies: [
    {
      factoryId: 'F227',
      interfaceName: 'ISearchIndexService',
      registeredBy: 'FLOW-07',
      fallback: 'self-register-if-flow07-not-active',
    },
  ],
  bfaRules: ['CF-816'],
  ironRules: [
    'IR-1: inject F227 ISearchIndexService — registered by FLOW-07',
    'IR-2: version-keyed idempotency — same listingId+version produces same doc',
    'IR-3: storeDocument BEFORE enqueue (DNA-8)',
  ],
  ragPatterns: ['cross-flow-factory-dependency'],
};

// ── T85 — ListingFeedGenerator ────────────────────────────────────────────────

export const T85_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T85',
  name: 'ListingFeedGenerator',
  family: 30,
  flowId: 'FLOW-08',
  archetype: 'data_pipeline',
  version: 'v1',
  executionModel: 'async',
  description:
    'Generates listing feed events. ' +
    'ListingFeedGenerated payload: { count: N } ONLY — no listing IDs, no reference IDs. ' +
    'count-only is the PII safety boundary.',
  requiredFactories: ['F244', 'F246'],
  bfaRules: ['CF-817'],
  ironRules: [
    'IR-1: ListingFeedGenerated payload = { count: N } only — no IDs of any kind',
    'IR-2: storeDocument BEFORE enqueue (DNA-8)',
  ],
  ragPatterns: ['count-only-feed-payload'],
  feedPayloadPolicy: {
    allowedFields: ['count'],
    prohibitedFields: ['listingId', 'sellerId', 'ids', 'referenceIds'],
    payloadShape: '{ count: N }',
  },
};

// ── T86 — ListingAnalyticsAggregator ─────────────────────────────────────────

export const T86_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T86',
  name: 'ListingAnalyticsAggregator',
  family: 30,
  flowId: 'FLOW-08',
  archetype: 'analytics_engine',
  version: 'v1',
  executionModel: 'async',
  description:
    'Aggregates listing analytics. ' +
    'MACHINE formula (not FREEDOM config): conversionRate = inquiries / (views || 1). ' +
    'This is a MACHINE formula — must appear as literal computation in code. ' +
    'config.get("conversion_formula") = score-0. ' +
    'Aggregate-only: views are counters only — no viewerIds array (data-retention violation).',
  requiredFactories: ['F244', 'F248', 'F250'],
  bfaRules: ['CF-818', 'CF-819'],
  ironRules: [
    'IR-1: conversionRate = inquiries / (views || 1) — MACHINE formula, not FREEDOM config',
    'IR-2: no viewerIds array — views are counters only (data-retention)',
    'IR-3: storeDocument BEFORE enqueue (DNA-8)',
  ],
  ragPatterns: ['machine-formula-not-freedom-config', 'aggregate-only-analytics'],
  machineFormula: {
    field: 'conversionRate',
    expression: 'inquiries / (views || 1)',
    mustBeLiteralCode: true,
    freedomConfigForbidden: true,
  },
  analyticsPolicy: {
    aggregateOnly: true,
    perUserHistoryForbidden: true,
    viewerIdsForbidden: true,
  },
};

// ── T87 — ListingModerationEngine ────────────────────────────────────────────

export const T87_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T87',
  name: 'ListingModerationEngine',
  family: 31,
  flowId: 'FLOW-08',
  archetype: 'moderation',
  version: 'v1',
  executionModel: 'async',
  description:
    'Three-path moderation: PASS / REJECT / UNCERTAIN with human-queue routing. ' +
    'UNCERTAIN listings routed to human review queue via F249. ' +
    'REJECT stores rejection record with reason.',
  requiredFactories: ['F244', 'F249', 'F252'],
  bfaRules: ['CF-820'],
  ironRules: [
    'IR-1: three-path result: PASS / REJECT / UNCERTAIN',
    'IR-2: UNCERTAIN → human review queue (not auto-reject)',
    'IR-3: storeDocument BEFORE enqueue (DNA-8)',
  ],
  ragPatterns: ['three-path-moderation'],
};

// ── T88 — ListingPriceValidator ───────────────────────────────────────────────

export const T88_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T88',
  name: 'ListingPriceValidator',
  family: 31,
  flowId: 'FLOW-08',
  archetype: 'guard',
  version: 'v1',
  executionModel: 'INLINE_ONLY',
  description:
    'Price validation guard (inline). ' +
    'price < 0 → reject with DataProcessResult.failure. ' +
    'price = 0 → accept (free listing). ' +
    'price validation config thresholds from FREEDOM config.',
  requiredFactories: ['F247'],
  bfaRules: ['CF-815'],
  ironRules: [
    'IR-1: price < 0 → failure; price >= 0 → success',
    'IR-2: max price cap from FREEDOM config',
  ],
  ragPatterns: ['zero-price-valid'],
  entryType: 'INLINE_ONLY',
};

/** All FLOW-08 contracts as an array for bootstrapper registration. */
export const FLOW_08_CONTRACTS: Record<string, unknown>[] = [
  T83_CONTRACT,
  T84_CONTRACT,
  T85_CONTRACT,
  T86_CONTRACT,
  T87_CONTRACT,
  T88_CONTRACT,
];
