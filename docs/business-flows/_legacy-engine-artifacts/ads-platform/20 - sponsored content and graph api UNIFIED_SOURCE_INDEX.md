# FLOW-20 UNIFIED SOURCE INDEX
## Sponsored Content + Graph API + Deep Search + Multi-Tenant Isolation
## Save Point: FLOW20:P5:INDEX ✅
## Design Decisions: DD-86–DD-101 (16 decisions)

---

## DELTA FROM FLOW-14

| Artifact | Before | After | Delta |
|----------|--------|-------|-------|
| Factories | 465 | 575 | +110 |
| Families | 59 | 75 | +16 |
| Task Types | 178 | 198 | +20 |
| Flow Templates | 35 | 40 | +5 |
| BFA Rules | 213 | 237 | +24 |
| Stress Tests | 103 | 119 | +16 |
| Skills | 98 | 112 | +14 |
| Design Decisions | 85 | 101 | +16 |
| Design Records | 65 | 77 | +12 |

---

## DESIGN DECISIONS — DD-86 through DD-101

### DD-86 — Graph API Style: REST Graph Paths (Not GraphQL Public Surface)
```
DECISION:    Expose Graph API as REST-style graph paths (/{nodeId}/{edge}?fields=...)
             with server-side field projection rather than exposing GraphQL directly.
RATIONALE:   REST graph paths are simpler to version, quota, and audit-log per endpoint;
             GraphQL execution is used internally in F474 QueryPlanner but not exposed.
ALTERNATIVES: GraphQL as public surface — rejected: schema introspection leaks object model;
              rate limiting per-query is harder; persisted queries add management overhead.
ENFORCED BY: F467 (ApiVersionService), F468 (RequestNormalizerService), Template 36
AFFECTS:     T179, T180, T191, DR-66
```

### DD-87 — Permission Engine: Per-Node/Edge/Field, Not Per-Request
```
DECISION:    IPermissionDecisionService (F488) is called per node, per edge, and per field —
             not once per API request; partial results returned for partially-authorized responses.
RATIONALE:   Per-request authorization misses field-level privacy rules; OWASP BFLA/BOLA
             require granular checks; partial errors more informative than all-or-nothing.
ALTERNATIVES: Per-request single decision — rejected: misses field-level privacy; over-blocks.
ENFORCED BY: SK-99, SK-100, IR-179-2, CF-214
AFFECTS:     T179, T180, T191, DR-68
```

### DD-88 — Auction Architecture: Stateless Function, Redis-Only Hot State
```
DECISION:    IAuctionEngineService (F542) is a pure stateless function; all mutable state
             (pacing, frequency, budget) accessed exclusively through Redis in the auction path.
RATIONALE:   <50ms p99 latency budget cannot tolerate synchronous PG writes;
             Redis INCR is atomic and fast; decoupled budget decrement via queue event.
ALTERNATIVES: Stateful auction with PG — rejected: lock contention at scale;
              budget decrement in-path — rejected: latency budget violated (DR-71).
ENFORCED BY: DR-74, SK-102, IR-184-1, IR-184-5, CF-222, CF-223
AFFECTS:     T184, T185
```

### DD-89 — Targeting Consent: Blocking Gate, Not Async Filter
```
DECISION:    Consent check via F525 is a BLOCKING step before F519 targeting evaluation;
             not an async post-filter on results.
RATIONALE:   Post-filter approach means targeting evaluation runs on non-consented users
             before filtering — privacy regulation requires consent-before-evaluation.
ALTERNATIVES: Async post-filter — rejected: evaluation still processes non-consented data.
ENFORCED BY: DR-72, SK-104, IR-184-3, CF-224
AFFECTS:     T184, T193
```

### DD-90 — Political Ad: Two-Gate Mandatory (Classifier + Verification)
```
DECISION:    Political ads require BOTH automated classifier (F535) AND explicit
             political verification service (F538); classifier alone is insufficient.
RATIONALE:   Classifier confidence is probabilistic; regulatory requirements for political
             ads demand explicit verification regardless of confidence score.
ALTERNATIVES: Classifier-only with high threshold — rejected: false negatives = regulatory violation.
ENFORCED BY: DR-73, SK-111, CF-225, IR-187-2
AFFECTS:     T187, T184
```

### DD-91 — Spend Ledger: Append-Only with Offset Corrections
```
DECISION:    All billing events are append-only; financial corrections use offset entries,
             never UPDATE/DELETE on billed records.
RATIONALE:   Append-only preserves audit trail; billing disputes require original events
             plus correction chain; financial compliance (SOC2, ISO 27001) requires immutable audit.
ALTERNATIVES: In-place corrections — rejected: destroys audit trail; billing dispute resolution impossible.
ENFORCED BY: DR-75, SK-105, CF-228, IR-186-4, IR-188-1
AFFECTS:     T185, T186, T188, T195
```

### DD-92 — Webhook HMAC: Mandatory on All Outbound Deliveries
```
DECISION:    All webhook deliveries from F496 include HMAC-SHA256 signature;
             no delivery path exists without signing.
RATIONALE:   Unsigned webhooks allow spoofing; developer app cannot verify payload authenticity;
             HMAC is industry standard (Stripe, GitHub, Shopify all require HMAC).
ALTERNATIVES: Optional HMAC per app config — rejected: security as opt-in = security theater.
ENFORCED BY: DR-69, SK-101, CF-216, IR-181-1
AFFECTS:     T181
```

### DD-93 — Payment Method: Tokenization-Only Storage
```
DECISION:    IPaymentMethodService (F505) accepts payment data and returns a tokenized
             reference; raw card data never persists in any service store.
RATIONALE:   PCI-DSS Level 1 compliance requires raw PAN to be out-of-scope;
             tokenization delegates PCI scope to payment vault.
ALTERNATIVES: Encrypted PAN storage — rejected: still in-scope for PCI audit;
              complexity without eliminating audit burden.
ENFORCED BY: DR-70, CF-219, IR-182-1
AFFECTS:     T182
```

### DD-94 — Tenant Resolution: Edge-Only, Trusted Context Propagation
```
DECISION:    Tenant identity resolved ONCE at API edge (F578) from validated token claims
             or subdomain; all internal services read tenantId from trusted scope context
             (never from user-supplied headers or request body).
RATIONALE:   User-supplied tenant = cross-tenant attack vector;
             single resolution point = single enforcement boundary;
             consistent with FLOW-08 tenant model (DR-65 extended to Graph+Ads).
ALTERNATIVES: Internal tenant re-resolution per service — rejected: attack surface multiplication.
ENFORCED BY: DR-77, SK-106, CF-232, IR-190-1
AFFECTS:     T179, T184, T190, all FLOW-20 task types
```

### DD-95 — Flow Spec Versioning: Immutable Snapshots
```
DECISION:    Published FlowVersion is an immutable snapshot; any change creates a new version;
             published versions are never modified.
RATIONALE:   Incident replay, rollback, and audit require stable version history;
             mutable specs make root cause analysis impossible.
ALTERNATIVES: In-place spec update — rejected: destroys version history.
ENFORCED BY: DR-76, CF-230, IR-189-2
AFFECTS:     T189
```

### DD-96 — Graph Traversal: Depth Limit via FREEDOM Config
```
DECISION:    Field projection depth limit (max nested traversal hops) is a FREEDOM config
             value per tenant/app tier; not hardcoded; violating requests get partial errors.
RATIONALE:   Fan-out amplification risk; different app tiers may have different depth allowances;
             hardcoding = cannot evolve without code change.
ALTERNATIVES: Hardcoded depth limit — rejected: violates Freedom Machine philosophy.
ENFORCED BY: F466 (FREEDOM config), SK-109, QG-179-1, ST-113
AFFECTS:     T179, T191
```

### DD-97 — Multi-Model Auction Quality Score: Conservative on Divergence
```
DECISION:    When AF-5 multi-model quality scores diverge > 10%, AF-10 uses the lower
             (more conservative) score rather than average or maximum.
RATIONALE:   Optimistic score on divergence = potential overspend vs quality;
             conservative approach protects advertiser value;
             divergence is signal to improve model alignment.
ALTERNATIVES: Average — rejected: dilutes high-confidence negative signal;
              Maximum — rejected: optimistic bias.
ENFORCED BY: QG-184-6, ST-115
AFFECTS:     T184
```

### DD-98 — Noisy Neighbor Guard: Per-Tenant Quota Isolation
```
DECISION:    Rate limits and quotas are enforced per tenant (not shared pool);
             F583 NoiseNeighborGuard prevents single tenant burst from affecting others.
RATIONALE:   Shared pool = noisy neighbor problem; enterprise tenants cannot tolerate
             degradation from other tenants; per-tenant isolation = predictable SLAs.
ALTERNATIVES: Shared quota pool with fair queuing — rejected: complex to implement fairly;
              per-tenant isolation simpler and more predictable.
ENFORCED BY: F581, F583, CF-220, ST-118
AFFECTS:     T190, T192 and all FLOW-20 flows
```

### DD-99 — Fraud Gate: Blocking Before Billing (Not Async Quarantine)
```
DECISION:    Fraud scoring (F555/F563) is a BLOCKING step before billing event emission;
             fraudulent events quarantined synchronously in delivery/attribution path.
RATIONALE:   Async quarantine means fraudulent events briefly enter billing pipeline;
             revenue integrity requires fraud gate before any billable record is created.
ALTERNATIVES: Async fraud quarantine + billing reversal — rejected: reversal complexity;
              downstream billing system must handle reversals which is operationally fragile.
ENFORCED BY: SK-107, CF-227, IR-185-2, IR-186-2
AFFECTS:     T185, T186, T197
```

### DD-100 — Creative Review: Approval Required Before Auction Eligibility
```
DECISION:    Ad creative must have IAdReviewService (F534) "approved" status stored in
             IAdCatalogService (F533) before F541 EligibilityCheckerService includes it
             in any auction; "pending" or "rejected" creatives are hard-filtered at eligibility.
RATIONALE:   Allowing unapproved creatives into auction — even briefly — risks brand safety
             violations appearing in live placements; hard eligibility filter is simpler
             and safer than post-auction creative swap; audit trail cleaner when
             approval state is immutable checkpoint (consistent with DD-91 append-only).
ALTERNATIVES: Post-auction creative substitution — rejected: race condition between auction
              result and creative swap; brand safety incident window exists;
              Soft filter (warn but allow) — rejected: warnings ignored at scale; regulatory
              exposure for prohibited content categories.
ENFORCED BY: DR-73, SK-110, CF-226, IR-183-1, IR-183-3, QG-183-2
AFFECTS:     T183, T184, T187
```

### DD-101 — Attribution Windows: FREEDOM Config Per Advertiser Account, Not Platform-Wide
```
DECISION:    Click-through and view-through attribution windows (e.g., 1d/7d/28d click,
             1d view) are FREEDOM config values settable per advertiser account by
             IAttributionConfigService (F561); no platform-wide hardcoded default window.
RATIONALE:   Different campaign objectives have different natural conversion latencies
             (e-commerce click → purchase: hours; B2B lead → close: weeks);
             one-size window over-attributes short cycles or under-attributes long ones;
             advertiser-level config preserves measurement accuracy per vertical.
             Platform-wide default was rejected because it creates systematic mis-attribution
             for non-standard conversion cycles, leading to advertiser churn.
ALTERNATIVES: Platform-wide hardcoded window — rejected: systematic mis-attribution across
              verticals; cannot be corrected without code change (Freedom Machine violation);
              Per-campaign window — considered; too granular for initial scope; add as
              future extension from per-account baseline.
ENFORCED BY: F561 (IAttributionConfigService → FREEDOM config), SK-108, DR-77,
             QG-196-1, CF-237
AFFECTS:     T196, T185, T186, T197
```

---

## DESIGN DECISIONS CROSS-REFERENCE TABLE

| DD | Title | Primary Factories | Enforced By |
|----|-------|------------------|-------------|
| DD-86 | Graph API REST Graph Paths | F467, F468 | T179, T180, T191, DR-66 |
| DD-87 | Per-Node/Edge/Field Permission | F488 | T179, T180, T191, DR-68, CF-214 |
| DD-88 | Stateless Auction, Redis Hot State | F542 | T184, T185, DR-74, CF-222 |
| DD-89 | Targeting Consent Blocking Gate | F525, F519 | T184, T193, DR-72, CF-224 |
| DD-90 | Political Ad Two-Gate Mandatory | F535, F538 | T187, T184, DR-73, CF-225 |
| DD-91 | Spend Ledger Append-Only | F564 | T185, T186, T188, T195, DR-75 |
| DD-92 | Webhook HMAC Mandatory | F496 | T181, DR-69, CF-216 |
| DD-93 | Payment Tokenization-Only | F505 | T182, DR-70, CF-219 |
| DD-94 | Tenant Resolution Edge-Only | F578 | All FLOW-20, DR-77, CF-232 |
| DD-95 | Flow Spec Immutable Snapshots | F571 | T189, DR-76, CF-230 |
| DD-96 | Graph Depth Limit FREEDOM Config | F466 | T179, T191, SK-109, ST-113 |
| DD-97 | Auction Score Conservative Diverge | F542, AF-5/AF-10 | T184, QG-184-6 |
| DD-98 | Per-Tenant Quota Isolation | F581, F583 | T190, T192, CF-220 |
| DD-99 | Fraud Gate Blocking Before Billing | F555, F563 | T185, T186, T197, CF-227 |
| DD-100 | Creative Approval Before Eligibility | F533, F534, F541 | T183, T184, T187, CF-226 |
| DD-101 | Attribution Windows FREEDOM Config | F561 | T196, T185, T186, T197, DR-77 |

---

## DESIGN RECORDS SUMMARY — DR-66 through DR-77

| DR | Title | Type | Enforced By |
|----|-------|------|-------------|
| DR-66 | REST graph path versioning contract | API_CONTRACT | F467, DD-86 |
| DR-67 | App OAuth scope catalog | SECURITY | F479, F480 |
| DR-68 | Field-level partial-auth response format | PROTOCOL | F488, DD-87 |
| DR-69 | HMAC-SHA256 webhook signature spec | SECURITY | F496, DD-92 |
| DR-70 | PCI tokenization boundary | COMPLIANCE | F505, DD-93 |
| DR-71 | Auction p99 latency budget (50ms) | SLO | F542, DD-88 |
| DR-72 | Consent-before-evaluation ordering | PRIVACY | F525, DD-89 |
| DR-73 | Political ad dual-gate protocol | REGULATORY | F535, F538, DD-90 |
| DR-74 | Redis-only mutable auction state | ARCHITECTURE | F542, F543, DD-88 |
| DR-75 | Append-only spend ledger schema | COMPLIANCE | F564, DD-91 |
| DR-76 | Immutable flow version snapshot | VERSIONING | F571, DD-95 |
| DR-77 | Attribution window FREEDOM config schema | MEASUREMENT | F561, DD-101 |

---

## FULL CATALOG TOTALS — POST FLOW-20

```
FACTORIES:        F1-F575     (575 total, Families 1-75)
  F466-F575       [FLOW-20 Graph API + Sponsored Content + Deep Search, Families 60-75]
TASK TYPES:       T1-T198     (198 total)
  T179-T198       [FLOW-20, 20 new task types]
FLOW TEMPLATES:   1-40        (40 total)
  Templates 36-40 [FLOW-20, 5 new templates]
BFA CONFLICTS:    CF-1-CF-237 (237 total)
  CF-214-CF-237   [FLOW-20, 24 new conflict rules]
STRESS TESTS:     ST-1-ST-119 (119 total)
  ST-104-ST-119   [FLOW-20, 16 new stress tests]
SKILL PATTERNS:   SK-1-SK-112 (112 total)
  SK-99-SK-112    [FLOW-20, 14 new skill patterns]
DESIGN DECISIONS: DD-1-DD-101 (101 total)
  DD-86-DD-101    [FLOW-20, 16 new design decisions]
DESIGN RECORDS:   DR-1-DR-77  (77 total)
  DR-66-DR-77     [FLOW-20, 12 new design records]
IRON RULES:       ~1,564      (+160 from FLOW-20: 8 per T × 20 task types)
QUALITY GATES:    ~1,340      (+120 from FLOW-20: 6 per T × 20 task types)
AF STATION CELLS: ~2,178      (+220 from FLOW-20: 11 stations × 20 task types)
DNA COMPLIANCE:   ~2,320 checks, all pass (+200 from FLOW-20)
```

---

## SAVE POINT: FLOW20:P5:INDEX ✅
## Phase 5 COMPLETE: DD-86–DD-101, DR-66–DR-77, full cross-reference table
## Recovery Command: "Continue FLOW-20 from Phase P6" (SESSION_STATE update)
