# FLOW-02 Adaptation Plan — FREEDOM-config + Role-scope + Business-domain

**Protocol**: FLOW-PORTABILITY-TEST-PROTOCOL-v1.2 · Phase 1 (Propose)
**Plan version**: v1.0 · **Date**: 2026-04-23
**Flow**: FLOW-02 profile-enrichment
**Sub-tenant**: `acme-pro-members` (reused from FLOW-01)
**Author**: architect-mode / opus-4.7 / session vigorous-margulis

---

## 0. Governance references (Gate 0l — source-layer tags)

All citations below carry source-layer tags per XIIGEN-CODE-REVIEW-PROTOCOL-v1.9 Gate 0l:
`[codebase:path:line]` · `[docs:path]` · `[user-earlier-turn:timestamp]` · `[state:field]`.

- Plan review protocol: `[docs:Planning sessions/XIIGEN-CODE-REVIEW-PROTOCOL-v1.9.md]`
- Session start: `[docs:Planning sessions/XIIGEN-SESSION-START-PROMPT-v5.1.md]`
- Behavioral registry: `[docs:Planning sessions/BEHAVIORAL-CORRECTIONS-REGISTRY.md]`
- Per-entity protocol: `[docs:Planning sessions/planning--per-entity-examination-protocol-SKILL-v1.1.0.md]` (NOT ACTIVATED — N=1)
- FLOW-02 invariants: `[docs:docs/portability/flow-02/FLOW-02-STEP-1-INVARIANTS.md]`
- Adaptation surface: `[docs:docs/portability/flow-02/adaptation-surface-profile-enrichment.json]`
- Examination record: `[docs:docs/screen-examination/profile-enrichment-examination.md]`
- Business spec: `[docs:docs/business-flows/02-profile-enrichment.md]`
- Role source: `[docs:docs/design-reviews/ROLE-ANALYSIS-BATCH-01.md]` (referenced by examination)
- FLOW-01 precedent: `[docs:docs/portability/flow-01/]`
- DoD protocol: `[docs:FLOW-PORTABILITY-TEST-PROTOCOL-v1.2.md]`

---

## 1. Instruction decomposition (Gate 0j — user items in user's order)

Verbatim user request: `[user-earlier-turn:2026-04-23]`

> "Now we will continue with flow portability, to FLOW 02 — each development has to be review with Fabric first, Genie DNA, tenant separation (keys are never in dev) and be visually validated by agents with UI/UX skills (the images are not sent here in chat!!! bud are visually validated) Definition of done is according to 'FLOW-PORTABILITY-TEST-PROTOCOL-v1.2.md'"

Enumerated items:

| Item | Content | Addressed in plan |
|---|---|---|
| I1 | Continue flow portability to FLOW-02 | §2 scope, §3 phases (P0-P6) |
| I2 | Review axis: Fabric First | §7.1 + 4-axis review gate |
| I3 | Review axis: Genie DNA | §7.2 (FC-7a compliance) |
| I4 | Review axis: Tenant separation (keys never in dev) | §7.3 (grep prefixes, ALS only) |
| I5 | Review axis: Visual validation by UI/UX agents | §7.4 + Phase 4 SK-549 |
| I6 | Images NEVER sent in chat | §7.4 + BC-001 + agent verdict-only output |
| I7 | Definition of done per FLOW-PORTABILITY-TEST-PROTOCOL-v1.2 | §8 5-requirement DoD + Phase 5 CHANGELOG |

All items ADDRESSED. User's stated order preserved (Fabric → DNA → Tenant → Visual → DoD).

---

## 2. Prior corrections threaded (Gate 0k)

Corrections from this session directly shaping this plan:

- `[user-earlier-turn:2026-04-23]` — **"keep this plan in state json - and follow it"** → Plan writes to `FLOW-02-PORTABILITY-STATE.json` (done P0), every phase updates STATE.
- `[user-earlier-turn:2026-04-23]` — **"images are not sent here in chat"** → §7.4 delegates to UI/UX agent with verdict-only output; PNGs land in `visual-evidence/` only. Aligns with BC-001.
- `[user-earlier-turn:2026-04-23]` — **"Keep me posted at least once in 3 minutes"** → `pulseCadenceMinutes: 3` in STATE; pulse after each phase artifact.
- `[user-earlier-turn:2026-04-23]` — **"load v5.1 + v1.9 + BC-Registry + SK-552"** → STATE `sessionGovernance` + this plan's §0 source-layer tags + §7 applies FC-7a / Gate 0g / Gate 0m.

---

## 3. Scope (Gate 0d)

**In scope for this plan (Phase 1)**: 3 adaptation categories for FLOW-02 profile-enrichment at TIER-D:

| Category | Focus | Phases touched |
|---|---|---|
| FREEDOM-config | 4 of 6 registered keys overridden for `acme-pro-members` | P1, P2 |
| Role-scope | ViewerRole integration for 3 React pages | P3, P4 |
| Business-domain | 3 edge cases documented (timeout-as-success, A2 GENERAL fallback, T52 consent gate) | P2, P5 |

**Out of scope** (deferred to Sprint B):
- Grammar adaptation — FLOW-02 has no DSL surface (N/A, confirmed in invariants §8)
- Package-and-distribute (GAP-25 GitHub provisioning)
- Third-tenant install + cascade visual evidence (GAP-26, GAP-29)

Scope matches user's ask (I1-I7) — no widening.

---

## 4. Binary Q4 done criterion (Gate 0e)

Restated verbatim from `[state:q4BinaryCriterion]`:

> FROZEN_COMPLETE when ALL of: (1) P0-P6 all status=COMPLETED; (2) `ADAPTATION-CHANGELOG.md` with 5-req DoD all MET; (3) `visual-evidence/` SK-549 cells C1..C7 all PASS × 3 pages; (4) `phase-02-adaptation-freedom-config.spec.ts` passes with jest 0 failures; (5) `tenant-profile-acme-pro-members.json` committed; (6) 4-axis review all PASS; (7) commit + push complete.

Each element is binary TRUE/FALSE at session close — no interpretation.

---

## 5. Iron rules honored (Gate 0h — 15 MACHINE invariants)

From `[docs:docs/portability/flow-02/FLOW-02-STEP-1-INVARIANTS.md]` §6 — every rule preserved; no override requested:

1. DNA-4 MicroserviceBase (QG-02-00)
2. Rule 1 fabric interfaces only (QG-02-01)
3. DNA-3 DataProcessResult (QG-02-02)
4. DNA-5 AsyncLocalStorage tenant scope (QG-02-03)
5. DNA-8 storeDocument BEFORE enqueue (QG-02-04, -11, -22, -32)
6. DNA-7 idempotency key `sha256(tenantId + userId + 'business-profile')`
7. FAN-IN (T50) `Promise.allSettled` — never `Promise.all` (QG-02-10)
8. CONVERGENCE (T51) confidence threshold from FREEDOM — score-0 if hardcoded (QG-02-20, -23)
9. DEGRADED TERMINAL (T51) below min_confidence → `MatchingDeferred`
10. BROADCAST (T52) consent checked per channel BEFORE emit (QG-02-30)
11. BEST-EFFORT (T52) channel failure returns `DataProcessResult.success`
12. NO PII in queue events — userId + matched IDs only
13. DUAL-RECORD-WRITE PRIVATE + GLOBAL with 4 match-safe fields only
14. Cross-flow `PersonalizationCompleted` (never `OnboardingCompleted`)
15. Match weights sum to 1.0

All 15 preserved under this plan — the adaptation surface excludes all of them (see `[docs:docs/portability/flow-02/adaptation-surface-profile-enrichment.json]` `notPartOfAdaptationSurface`).

---

## 6. Business-intent elements per React page (Gate 0g — 4 elements required)

Sourced from `[state:gate0gBusinessIntent]` — all 4 elements populated for every page.

### 6.1 Page P1 — QuestionnairePage.tsx
- **Examination record**: `[docs:docs/screen-examination/profile-enrichment-examination.md]` — primary finding "🟡 partial — needs rendering verification"; classification **G5 Kiosk multi-step wizard** (step indicator + progress bar + skip-option secondary)
- **User intent** (quoted): *"When a developer completes registration on the XIIGen community platform, enrich their profile with skill data, match them to relevant projects, and broadcast their onboarding completion to the community."*
- **Role-visibility source**: `[docs:docs/design-reviews/ROLE-ANALYSIS-BATCH-01.md]` — primary role: **tenant-user**
- **Grammar**: **G5 KIOSK — multi-step wizard** (Typeform / LinkedIn profile-setup / Notion onboarding reference)

### 6.2 Page P2 — MatchingPage.tsx
- **Examination record**: same file — primary finding includes "3-5 suggested projects as cards; 'Join' CTA per card"
- **User intent**: same F1 quote (shared flow-level user intent)
- **Role-visibility source**: ROLE-ANALYSIS-BATCH-01.md — tenant-user
- **Grammar**: G5 KIOSK (card-list within wizard flow; planned fix: "3-5 suggested projects as cards" within multi-step wizard step)

### 6.3 Page P3 — PersonalizationPage.tsx
- **Examination record**: same file — "feed preferences toggles, 'Save and continue' primary"
- **User intent**: same F1 quote
- **Role-visibility source**: ROLE-ANALYSIS-BATCH-01.md — tenant-user
- **Grammar**: G5 KIOSK (final wizard step — feed-prefs toggles + "Save and continue")

No CFI-12 halt (FLOW-02 not in FLOW-04/09/34 list). No missing-page registry match (not FLOW-20/21/28/48).

---

## 7. Four-axis review plan (user items I2-I6)

### 7.1 Fabric First (I2)
**Gate**: `grep -rn "from '@elastic\|@aws-sdk\|stripe\|openai\|@anthropic\|bull\|kafka'" server/src/engine/flows/profile-enrichment`
**Expected**: 0 hits
**When**: P2 before commit; P6 final.
**Current state** (from P0 recon): 0 hits — confirmed invariants §7.

### 7.2 Genie DNA (I3 — FC-7a enforced)
**Gate**: `dna-compliance-guard` pre-commit on every touched file.
**Expected**: 0 violations across DNA-1..DNA-9.
**When**: P2 test-spec authoring; verified per-file.
**FC-7a evidence required per v1.9**: generated test spec code honors DNA-1..DNA-9. P2 spec will:
- DNA-1: payloads `Record<string, unknown>` only — no typed Product classes `[codebase:server/src/engine/flows/profile-enrichment/*.service.ts]`
- DNA-3: handlers return `DataProcessResult<T>` — not `Promise<boolean>` `[codebase:server/src/kernel/data-process-result.ts]`
- DNA-5: `AsyncLocalStorage` tenant scope; no tenantId param on fabric calls
- DNA-7: `IScopedMemoryService`/`IFreedomConfig` fabric interfaces only; no Redis/Elastic SDK import
- DNA-8: `storeDocument` precedes `enqueue` — ORDER 1 asserted by spec
- Other 4 DNA rules preserved by not touching service code

### 7.3 Tenant separation (I4 — "keys never in dev")
**Gate**:
- `grep -rn "process\.env\." server/src/engine/flows/profile-enrichment` filtered for tenant-config reads
- `grep -rE "sk-ant-|sk-proj-|ghp_|AIzaSy|pcsk_" .` — secret-pattern matches in tracked files
- acme-pro-members tenant cannot read default-tenant FREEDOM overrides (assertion in P2 spec)

**Expected**: 0 env tenant reads, 0 secret-pattern matches, isolation assertion green.
**Mechanism**: FREEDOM config + AsyncLocalStorage only — no process.env for tenant settings.

### 7.4 Visual validation (I5, I6 — delegated, verdicts-only)
**Gate**: UI/UX agent (skill set per SK-549) runs cells C1..C7 on 3 React pages.
**Expected**: verdict table returned to chat (PASS/FAIL × 7 × 3 = 21 cells); screenshots to `docs/portability/flow-02/visual-evidence/` only.
**Discipline (BC-001)**: images NEVER enter chat — agent prompt enforces verdict-only output.
**When**: Phase 4 (labeled "Phase 7" per FC-18/SK-539).

**Phase 7 declaration**: Phase 4 of this protocol = Phase 7 UI/UX Compliance per `[docs:SK-539]` and FC-18 Tier 2. Explicit step present → Gate 0m Step 5 satisfied.

---

## 8. 5-requirement Definition of Done (I7, per v1.2 protocol)

Mapped from `[docs:FLOW-PORTABILITY-TEST-PROTOCOL-v1.2.md]`:

| # | Requirement | Artifact | Phase | Verification |
|---|---|---|---|---|
| 1 | Adaptation surface documented | `adaptation-surface-profile-enrichment.json` | P0 ✓ | File exists, 4 categories populated |
| 2 | Tenant profile applied | `tenant-profile-acme-pro-members.json` | P2 | Jest spec asserts FREEDOM overrides read tenant-scoped |
| 3 | Layer 1 tests green | `phase-02-adaptation-freedom-config.spec.ts` | P2 | `jest ... --testPathPatterns="profile-enrichment"` — 0 failures |
| 4 | Visual evidence captured | `visual-evidence/` PNGs + verdict table | P4 | 21 SK-549 cells PASS (7 cells × 3 pages); verdicts only in chat |
| 5 | Changelog + 4-axis review | `ADAPTATION-CHANGELOG.md` | P5 | All 4 axis verdicts = PASS; 5-req table all MET |

---

## 9. FREEDOM-config adaptation targets (primary adaptation category)

From `[state:adaptation-surface FREEDOM-config]`:

| Key | Default | `acme-pro-members` override | Stakeholder rationale |
|---|---|---|---|
| `flow02_match_weight_industry` | 0.4 | **0.55** | Pro members community ranks industry alignment highest |
| `flow02_match_weight_stage` | 0.3 | **0.25** | Stage slightly de-emphasized for pro tier |
| `flow02_match_weight_location` | 0.2 | **0.10** | Remote-first community — location less relevant |
| `flow02_match_weight_team` | 0.1 | **0.10** | Unchanged |
| `flow02_match_timeout_seconds` | 30 | **15** | Pro-tier SLA demands faster matches; degraded-terminal still valid |
| `flow02_debounce_window_seconds` | 300 | **60** | Pro-tier re-questionnaire allowed sooner |

**Consistency invariant (Rule 15)**: `0.55 + 0.25 + 0.10 + 0.10 = 1.0` ✓

**MACHINE iron rule preserved**: thresholds remain from FREEDOM config (not hardcoded) — QG-02-20/23 still passes.

---

## 10. Role-scope adaptation (second category)

Plugin-SDK already extracted `[codebase:packages/plugin-sdk/package.json]` at v1.0.0 private. ViewerRole exported from `[codebase:client/src/components/common/ViewerRole.ts]`. 3 pages consume `ViewerRole.tenant-user` — no code change required; tenant profile just declares `roleScope: "tenant-user"`.

---

## 11. Business-domain adaptation (third category — 3 edge cases)

Documented in `[state:adaptation-surface business-domain edge-cases]`:

1. **Timeout-as-success** — T51 timeout → `partialResults: true` + `MatchingDeferred`, not failure
2. **A2 GENERAL fallback** — AnalyticsSegmentationService returns success with GENERAL segment on ML error
3. **Consent-gated broadcast** — T52 per-channel consent check BEFORE emit; failure returns success

Each tested in P2 spec.

---

## 12. Issue inventory (FC-9)

| Status | Item |
|---|---|
| FIXED | P0 recon confirmed 0 fabric-SDK imports, DUAL-RECORD-WRITE pattern intact |
| DEFERRED (CARRY-FORWARD) | ISSUE-002 — align 8 contract-referenced FREEDOM keys with `config-schema.ts` registry (tracked in invariants §5; not scope-blocking for TIER-D) |
| DEFERRED | Sprint B packages + third-tenant cascade (GAP-25, GAP-26, GAP-29) |
| EXCEPTION | None |

---

## 13. Test gate integrity (FC-8)

| Gate | Concrete pass criterion |
|---|---|
| Server tsc | `cd server && npx tsc --noEmit \| grep -v TS5101 \| grep -c "error"` → **0** |
| Server jest (profile-enrichment subset) | `cd server && npx jest --testPathPatterns="profile-enrichment"` → **0 failures** |
| Client tsc | `cd client && npx tsc --noEmit \| grep -v TS5101 \| grep -c "error"` → **0** |
| Playwright (P3, conditional) | `cd client && npx playwright test profile-enrichment-tenant-isolation` → **0 failures** or flagged CARRY-FORWARD |
| SK-549 verdicts (P4) | 21 cells (7 × 3 pages) → all **PASS** |
| DNA-compliance-guard | Pre-commit → 0 violations on touched files |

---

## 14. Phase 1 ⛔ STOP — awaiting Luba's grade

─────────────────────────────────────────────────────
**SESSION GOAL**:
  "continue with flow portability, to FLOW 02 - each development has to be review with Fabric first, Genie DNA, tenant separation (keys are never in dev) and be visually validated by agents with UI/UX skills (the images are not sent here in chat!!! bud are visually validated) Definition of done is according to 'FLOW-PORTABILITY-TEST-PROTOCOL-v1.2.md'"

**THIS ROUND PRODUCED**:
  Phase 1 adaptation plan MD written (this file) — before: P1 pending → after: P1 plan document exists, addresses I1-I7 in user's stated order, satisfies Gate 0g (4 business-intent elements × 3 pages) + Gate 0m (Q1-Q4 role matrix × 3 pages) + FC-7a (DNA-1..9 enforced in P2 test-spec spec) + Gate 0e (binary Q4) + Gate 0h (15 iron rules preserved). STATE.json updated with `sessionGovernance` + `q4BinaryCriterion` + `gate0gBusinessIntent` + `gate0mUiUxRoleMatrix` + `mandatoryStopFormatAdoption` + `roundContractAdoption` blocks.

**OUTPUT CONTRACT (Q4 stated at session start)**:
  FROZEN_COMPLETE when 7-item binary criterion all TRUE (see §4).
  STATUS: PARTIAL — P1 plan document DONE; items (1)-(7) binary TRUE pending P2-P6 execution.

**LAST CORRECTION FROM LUBA**:
  "Please load these files and examin them, as updated load session files and examine code review protocol / Then you can proceed" + "@planning--per-entity-examination-protocol-SKILL-v1.1.0.md please load the skill"
  → ADDRESSED ✓ (3 governance files + SK-552 loaded; delta reported; STATE + plan both reflect v1.9/v5.1/BC-Registry/SK-552; SK-552 assessed NOT_ACTIVATED for single-flow work)

⛔ STOP — awaiting grade on Phase 1 plan OR explicit "proceed to Phase 2" to continue GENERATION
─────────────────────────────────────────────────────
