# FLOW-02 Profile Enrichment & Matching — Portability Invariants

**Protocol**: FLOW-PORTABILITY-TEST-PROTOCOL-v1.2 — Step 1 (Invariants capture)
**Captured**: 2026-04-23
**Captured by**: architect-mode
**Flow slug**: `profile-enrichment`

---

## 1. Task types (MACHINE identifiers — never adapt)

| Task | Archetype | Purpose | Service file |
|---|---|---|---|
| **T50** | `fan_in` | Profile enrichment fan-in (GitHub + portfolio + skills in parallel) | [business-profile.service.ts](server/src/engine/flows/profile-enrichment/business-profile.service.ts) and auxiliary services |
| **T51** | `convergence` | Matching-score gate with FREEDOM-config threshold + degraded terminal | [compatibility-scoring.service.ts](server/src/engine/flows/profile-enrichment/compatibility-scoring.service.ts) |
| **T52** | `broadcast` | Consent-gated, best-effort community broadcast of onboarding completion | [personalization-completion.service.ts](server/src/engine/flows/profile-enrichment/personalization-completion.service.ts) |

**Family**: 206
**Factories**: F1508 IGithubProfileFetcher, F1509 IPortfolioAnalyzer, F1510 ISkillAssessor, F1511 IEnrichmentResultStore, F1512 IProjectMatchEngine, F1513 IMatchResultStore, F1514 IUserConsentStore, F1515 ICommunityChannelBroadcast
**Named check**: `convergence_threshold_from_freedom_config` (score-0 severity — SILENT_FAILURE guard)

## 2. Event names (MACHINE literals — never adapt)

- `BusinessProfileCreated` (T50/A1)
- `BusinessMatchesFound` (T51/B1 — with `partialResults: boolean`)
- `PersonalizationCompleted` (T52/D — cross-flow contract FLOW-02-DR-02-C)
- `EnrichmentCompleted` (T50 aggregate)
- `MatchingConverged` / `MatchingDeferred` (T51 — degraded terminal)
- `OnboardingBroadcastSent` / `OnboardingAnnouncement.Channel.Skipped` (T52)

**Cross-flow invariant (FLOW-02-DR-02-C)**: FLOW-02 emits `PersonalizationCompleted`, NEVER `OnboardingCompleted` (that belongs to FLOW-01).

## 3. Services (7) — fabric-first, DNA-compliant

| Service | Phase | Fabrics consumed | DNA signature |
|---|---|---|---|
| `BusinessProfileService` | A1 | DATABASE + QUEUE | DNA-7 idempotency + DNA-8 dual-record-write PRIVATE→GLOBAL before enqueue |
| `AnalyticsSegmentationService` | A2 | DATABASE + QUEUE | DNA-3 GENERAL fallback (always success) |
| `LearningProgramService` | A3 | DATABASE + QUEUE | Reads profileId from store (not raw questionnaire) |
| `CompatibilityScoringService` | B1 | DATABASE + QUEUE + FREEDOM_CONFIG | Timeout-as-success with `partialResults=true` |
| `ConnectionSuggestionService` | B2 | DATABASE + QUEUE | Forwards `partialResults` downstream |
| `FeedPersonalizationService` | C | DATABASE | Degraded-but-valid feed on missing signals |
| `PersonalizationCompletionService` | D | DATABASE + QUEUE | Emits terminal `PersonalizationCompleted` |

## 4. FREEDOM keys currently registered (6 in `config-schema.ts`)

| Key | Default | Unit | Stakeholder |
|---|---|---|---|
| `flow02_debounce_window_seconds` | 300 | seconds | platform-operations |
| `flow02_match_timeout_seconds` | 30 | seconds | platform-operations |
| `flow02_match_weight_industry` | 0.4 | weight (0-1) | product / data-science |
| `flow02_match_weight_stage` | 0.3 | weight (0-1) | product / data-science |
| `flow02_match_weight_location` | 0.2 | weight (0-1) | product / data-science |
| `flow02_match_weight_team` | 0.1 | weight (0-1) | product / data-science |

**Invariant**: 4 match-weights MUST sum to 1.0 — consistency gate, not MACHINE logic.

## 5. FREEDOM keys referenced by contracts but not yet in schema (carry-forward)

Listed in T50/T51/T52 `freedomComponents` but NOT in `XIIGEN_FREEDOM_KEYS`:

- `flow02_enrichment_github_enabled` (T50)
- `flow02_enrichment_portfolio_enabled` (T50)
- `flow02_enrichment_ttl_days` (T50)
- `matching.confidenceThreshold` (T51 — 0.80 default)
- `matching.minConfidence` (T51 — 0.50 default)
- `flow02_matching_project_limit` (T51 — 20 default)
- `flow02_broadcast_channels_enabled` (T52)
- `flow02_broadcast_announcement_template` (T52)

**CARRY-FORWARD ISSUE-002**: align contract `freedomComponents` with `config-schema.ts` registry. Not in scope for FLOW-02 portability but tracked.

## 6. MACHINE iron rules — NEVER weakened by adaptation

1. **DNA-4** all services extend MicroserviceBase (QG-02-00)
2. **Rule 1 / D-HIST-001** no direct SDK imports — fabric interfaces only (QG-02-01)
3. **DNA-3** all methods return `DataProcessResult<T>` — never throw (QG-02-02)
4. **DNA-5** tenant scope via AsyncLocalStorage — no tenantId param (QG-02-03)
5. **DNA-8** storeDocument BEFORE enqueue on every transition (QG-02-04, QG-02-11, QG-02-22, QG-02-32)
6. **DNA-7** idempotency key = `sha256(tenantId + userId + 'business-profile')`
7. **FAN-IN (T50)** `Promise.allSettled` — never `Promise.all` (QG-02-10)
8. **CONVERGENCE (T51)** confidence threshold from FREEDOM config — score-0 if hardcoded (QG-02-20, QG-02-23)
9. **DEGRADED TERMINAL (T51)** below min_confidence → `MatchingDeferred`, never `DataProcessResult.failure` (QG-02-21)
10. **BROADCAST (T52)** consent checked per channel BEFORE emit (QG-02-30)
11. **BEST-EFFORT (T52)** channel failure returns `DataProcessResult.success` (QG-02-31)
12. **NO PII** in queue events — userId + matched IDs only (QG-02-33, IR-1)
13. **DUAL-RECORD-WRITE** PRIVATE `xiigen-business-profiles` + GLOBAL `xiigen-matching-profiles` with 4 match-safe fields only
14. **Cross-flow** FLOW-02 emits `PersonalizationCompleted`, never `OnboardingCompleted`
15. **Match weights** consistency: `flow02_match_weight_*` sum to 1.0

## 7. 4-axis portability review gates

| Axis | Detection | Expected |
|---|---|---|
| **Fabric First** | `grep -rn "from '@elastic\|@aws-sdk\|stripe\|openai\|@anthropic\|bull\|kafka'" server/src/engine/flows/profile-enrichment` | 0 hits |
| **Genie DNA** | dna-compliance-guard pre-commit on touched files | 0 violations |
| **Tenant separation** | grep `process\.env\.` in profile-enrichment services filtered for tenant-config reads; grep for `sk-ant-\|sk-proj-\|ghp_\|AIzaSy\|pcsk_` (known key prefixes); tenant isolation spec | 0 tenant-scoped env reads; 0 secret-pattern matches; acme-pro-members reads differ from default tenant |
| **Visual validation** | UI/UX agent runs SK-549 cells C1..C7 on 3 React pages; screenshots saved under `docs/portability/flow-02/visual-evidence/`; returns verdict table to chat | All cells PASS; 0 images in chat |

## 8. Adaptation categories (4) — status for FLOW-02

| Category | Status | Notes |
|---|---|---|
| **FREEDOM-config** | IN SCOPE — 4 of 6 keys selected for override | Primary focus of this session |
| **Grammar** | N/A | FLOW-02 has no DSL surface (matches FLOW-01 stance) |
| **Role-scope** | IN SCOPE — plugin-sdk already extracted | `@xiigen/plugin-sdk` workspace-resolved; ViewerRole in `client/src/components/common/ViewerRole.ts` |
| **Business-domain** | IN SCOPE — 3 edge cases identified | Timeout-as-success, A2 GENERAL fallback, T52 consent gate |

## 9. UI surface (SK-549 scope)

Three React pages under `client/src/pages/profile-enrichment/`:

- `MatchingPage.tsx` — matched-projects list, confidence badges
- `PersonalizationPage.tsx` — personalized feed, segment indicator
- `QuestionnairePage.tsx` — business-profile questionnaire form

All three render FREEDOM-overridden copy + are role-scoped (ViewerRole-aware).

## 10. Reference — FLOW-01 precedent

FLOW-01 portability artifacts live in [docs/portability/flow-01/](docs/portability/flow-01). This FLOW-02 work mirrors that pattern: surface JSON → plan MD → apply-and-verify spec → changelog → SK-549 evidence MD.

Completed FLOW-01 state: v1.0.0-acme-pro-members.1, 5 FC-ADAPT tests green, MACHINE invariants proven unchanged, cross-tenant isolation proven.

## 11. Ready for Phase 1 — Adaptation plan

Invariants locked. Phase 1 consumes this document.
