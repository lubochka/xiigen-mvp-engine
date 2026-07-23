# FLOW-20 MASTER EXECUTION PLAN
## Sponsored Content + Graph API + Deep Search + Multi-Tenant Isolation
## Save Point: FLOW20:P0:MASTER ✅
## Status: ALL PHASES COMPLETE ✅

---

# PART 1 — NO-CODE EXPLANATION (What FLOW-20 Actually Builds)

## The Big Picture

FLOW-20 extends the XIIGen engine with two massive platform capabilities that Facebook, LinkedIn, and Twitter all share: **a Graph API** (how external developers query your platform's data as a graph of nodes and edges) and a **full Ads platform** (how sponsored content is managed, reviewed, auctioned, delivered, measured, and billed). Layered on top is **deep search** (graph-aware querying) and **multi-tenant isolation** (ensuring that no tenant's data, quotas, or secrets ever touch another's).

The engine does NOT write these services. It **generates** them — as factory-backed services sitting on fabric interfaces, assembled into flow DAGs stored in Elasticsearch, with all business logic configurable through FREEDOM config rather than code changes.

---

## What the Engine Generates for FLOW-20

**16 new factory families (F466–F575) across 6 zones:**

**Zone A — Graph API Plane:** Developer-facing REST graph paths, schema + field projection, OAuth 2.0 identity + scopes, policy decision point (per-node/field/edge), query planner/federation, webhooks with HMAC delivery.

**Zone B — Ads Management:** Advertiser accounts + roles + billing, campaign hierarchy (campaign → ad set → ad), creative asset ingestion + transcoding + AI quality scoring, ad review with political dual-gate and brand safety scoring.

**Zone C — Ads Delivery:** Targeting with consent-before-evaluation blocking gate, stateless auction engine (Redis-only, <50ms p99), frequency caps, pacing, feed slot injection.

**Zone D — Measurement:** Impression + click attribution with fraud blocking gate, cross-device, server-side conversion, attribution windows per advertiser via FREEDOM config.

**Zone E — Revenue Integrity:** Fraud detection (IVT, click fraud, bot detection), quarantine before billing, append-only spend ledger, financial reconciliation bridge to FLOW-13 general ledger.

**Zone F — Multi-Tenant Isolation + Governance:** Per-tenant quota counters, noisy neighbor guard, immutable flow version snapshots, audit logging, OAuth app developer analytics.

---

## Phase Plan (No Code, Plain English)

### Phase 0 — Master Plan + RAG Bootstrap (~20 min) ✅
Read all anchor documents. Build the 7-file delivery structure. Identify all 16 new factory families (F466–F575) and 20 task types (T179–T198). Map every factory to its fabric. Validate backward compatibility against FLOW-01 through FLOW-14.

**Save point:** `FLOW20:P0:MASTER`

### Phase 1 — Engine Architecture (~45 min) ✅
Full factory registry for F466–F575 across 16 families. Design Records DR-66–DR-77. Flow templates 36–40. AF Station mapping for all zones. GENIE DNA compliance declaration.

**Save point:** `FLOW20:P1:ENGINE`

### Phase 2 — Task Types Catalog (~45 min) ✅
20 full engine contracts (T179–T198), each with: ARCHETYPE, ENTRY, PURPOSE, DISTINCT FROM, FACTORY DEPENDENCIES, FABRIC RESOLUTION, AF CONFIGURATION, BFA VALIDATION, MACHINE/FREEDOM, IRON RULES (8 each), QUALITY GATES (5–7 each).

**Save point:** `FLOW20:P2:TASKS`

### Phase 3 — BFA Stress Tests (~40 min) ✅
24 conflict rules (CF-214–CF-237) cross-validating FLOW-20 entities/events against FLOW-01–FLOW-14. 16 stress tests (ST-104–ST-119) covering auction latency, consent propagation, fraud flood, noisy neighbor, PCI scan, end-to-end pipeline.

**Save point:** `FLOW20:P3:BFA`

### Phase 4 — Skills Factory RAG (~40 min) ✅
14 skill patterns (SK-99–SK-112): per-node/field graph auth, partial-error response, HMAC delivery, stateless auction, PCI tokenization, consent gate, append-only ledger, edge tenant resolution, fraud gate, attribution window config, graph depth limit, creative review gate, political dual-gate, analytics aggregation. Each with primary .NET 9 + alternative language implementations + AI agent prompt.

**Save point:** `FLOW20:P4:SKILLS`

### Phase 5 — Unified Source Index (~30 min) ✅
16 design decisions (DD-86–DD-101): REST graph paths, per-field permissions, stateless auction, consent-before-targeting, political dual gate, append-only ledger, HMAC mandatory, PCI tokenization, edge-only tenant, immutable snapshots, depth limit FREEDOM, conservative multi-model score, per-tenant quota, fraud gate before billing, creative approval gate, attribution windows FREEDOM. Full DR/DD cross-reference table.

**Save point:** `FLOW20:P5:INDEX`

---

## Validation: Does the Plan Cover All Requirements?

| Requirement | Coverage | Evidence |
|-------------|----------|----------|
| Graph API (nodes, edges, field projection) | ✅ | Families 60–64, T179, T180, T191, SK-99, SK-100 |
| Developer OAuth + scopes + app review | ✅ | Family 62, T194, DR-67, CF-217, CF-234 |
| Webhooks with HMAC | ✅ | Family 65, T181, SK-101, DD-92, DR-69 |
| Advertiser accounts + campaign hierarchy | ✅ | Families 66–67, T182 |
| Creative ingestion + review | ✅ | Families 68–69, T183, T187, SK-110, SK-111 |
| Targeting + consent | ✅ | Family 70, T193, T184 S1, SK-104, DD-89 |
| Auction + delivery (<50ms) | ✅ | Family 71, T184, SK-102, DD-88, DR-71, ST-107 |
| Measurement + attribution | ✅ | Family 72, T185, T186, T196, SK-108, DD-101 |
| Fraud detection + revenue integrity | ✅ | Family 73, T185–T186 gate, T197, SK-107, DD-99 |
| Billing + reconciliation | ✅ | Family 74, T188, T195, SK-105, DD-91 |
| Multi-tenant isolation + quota | ✅ | Family 75, T190, T192, SK-106, DD-94, DD-98 |
| Governance + audit | ✅ | F570–F577, T189, T198, CF-231 |
| Fabric-first (all factories via CreateAsync) | ✅ | Every IR-X-6 enforces CreateAsync() |
| DNA compliance (all 6 patterns) | ✅ | Every AF-7 entry; ST-119 end-to-end scan |
| Backward compatibility (FLOW-01–14) | ✅ | CF-214–CF-237; ST-119 re-runs FLOW-01–14 tests |

---

## Positive and Negative Examples

### ✅ POSITIVE EXAMPLE — Engine-Generated Ad Auction Service

**What the engine produces (correct):**
```
AuctionOrchestratorService extends MicroserviceBase
  → registered in factory registry as F542
  → resolves through DATABASE FABRIC (Redis) for all hot state
  → RunAuctionAsync: reads Redis ONLY (F530 freq cap, F531 pacing)
  → impression log: QUEUE FABRIC async (non-blocking)
  → budget decrement: QUEUE FABRIC async (non-blocking)
  → consent gate (F525): BLOCKING step 1
  → eligibility filter: approval_status = "APPROVED" only
  → all results: DataProcessResult<AuctionResult>
  → no typed model: Dictionary<string,object> throughout
  → p99 < 50ms verified in ST-107
  → tenant isolation: scope.TenantId on every Redis key
```

**What the developer sees (correct):**
```
Admin configures: frequency_cap_per_user=3, auction_quality_threshold=0.7
Engine generates: AuctionOrchestratorService reading these from FREEDOM config
No code change needed when admin changes thresholds — FREEDOM Machine works.
```

### ❌ NEGATIVE EXAMPLE 1 — Direct Provider Import (IRON RULE VIOLATION)

```csharp
// WRONG — violates fabric-first
public class AuctionService
{
    private readonly IDatabase _redis = ConnectionMultiplexer.Connect("localhost").GetDatabase();
    // ↑ BUILD FAILURE: imports Redis driver directly. Must use DATABASE FABRIC via CreateAsync().
}
```

### ❌ NEGATIVE EXAMPLE 2 — Typed Model for Graph Node (DNA-1 VIOLATION)

```csharp
// WRONG — violates DNA-1 ParseDocument
public class GraphNode  // ← BUILD FAILURE: typed model
{
    public string Id { get; set; }
    public string Name { get; set; }
}
// CORRECT: Dictionary<string, object> via ObjectProcessor.ParseDocument()
```

### ❌ NEGATIVE EXAMPLE 3 — Consent Post-Filter (DD-89 VIOLATION)

```csharp
// WRONG — targeting runs first, then consent filtered
var ads = await targetingService.EvaluateAsync(userId, scope);  // ← targeting without consent
var filtered = ads.Where(a => consentStore.HasConsent(userId)).ToList(); // ← post-filter
// BUILD FAILURE: consent gate must be BLOCKING STEP BEFORE targeting evaluation
```

### ❌ NEGATIVE EXAMPLE 4 — Synchronous Auction Budget Decrement (DR-74 VIOLATION)

```csharp
// WRONG — synchronous PG write in auction critical path
public async Task<AuctionResult> RunAuctionAsync(...)
{
    var winner = SelectWinner(candidates);
    await _budgetRepository.DecrementAsync(winner.CampaignId, winner.Bid); // ← PG in critical path
    // BUILD FAILURE: budget decrement must be async via QUEUE FABRIC
}
```

### ❌ NEGATIVE EXAMPLE 5 — Raw PAN in Log (PCI VIOLATION)

```csharp
// WRONG — card data in log
_logger.LogInformation($"Processing card: {cardNumber}");
// BUILD FAILURE: raw card data in ANY log/queue/store = IR-182-1
```

---

## Recovery Map

| Phase | Save Point | File | Recovery Command |
|-------|-----------|------|-----------------|
| P0 | FLOW20:P0:MASTER | 20 - sponsored content MASTER_EXECUTION_PLAN.md | "Continue FLOW-20 Phase P0" |
| P1 | FLOW20:P1:ENGINE | 20 - sponsored content ENGINE_ARCHITECTURE.md | "Continue FLOW-20 Phase P1" |
| P2 | FLOW20:P2:TASKS | 20 - sponsored content TASK_TYPES_CATALOG.md | "Continue FLOW-20 Phase P2" |
| P3 | FLOW20:P3:BFA | 20 - sponsored content V62_BFA_STRESS_TEST.md | "Continue FLOW-20 Phase P3" |
| P4 | FLOW20:P4:SKILLS | 20 - sponsored content SKILLS_FACTORY_RAG.md | "Continue FLOW-20 Phase P4" |
| P5 | FLOW20:P5:INDEX | 20 - sponsored content UNIFIED_SOURCE_INDEX.md | "Continue FLOW-20 Phase P5" |

---

## FLOW-20 Deliverable Checklist

- [x] ENGINE_ARCHITECTURE — F466–F575 (16 families), DR-66–DR-77, Templates 36–40
- [x] TASK_TYPES_CATALOG — T179–T198 (20 full engine contracts)
- [x] V62_BFA_STRESS_TEST — CF-214–CF-237 (24 rules), ST-104–ST-119 (16 tests)
- [x] SKILLS_FACTORY_RAG — SK-99–SK-112 (14 patterns + AI agent prompts)
- [x] UNIFIED_SOURCE_INDEX — DD-86–DD-101 (16 decisions), full cross-reference
- [x] SESSION_STATE — Global tracker updated to F575/T198/DD-101/DR-77
- [x] MASTER_EXECUTION_PLAN — This file

---

## Global Engine State After FLOW-20

```
FACTORIES:        F1-F575     (575 total, Families 1-75)
TASK TYPES:       T1-T198     (198 total)
FLOW TEMPLATES:   1-40        (40 total)
BFA CONFLICT:     CF-1-CF-237 (237 total)
STRESS TESTS:     ST-1-ST-119 (119 total)
SKILL PATTERNS:   SK-1-SK-112 (112 total)
DESIGN DECISIONS: DD-1-DD-101 (101 total)
DESIGN RECORDS:   DR-1-DR-77  (77 total)

Next flow starts at: F584 / Family 76 / T199 / CF-238 / SK-113 / DD-102 / DR-78
```

## Checksum: FLOW20-575F-75FAM-T198-CF237-ST119-SK112-DD101-DR77-5T-7FILES

## SAVE POINT: FLOW20:P0:MASTER ✅ | FLOW20:COMPLETE ✅
