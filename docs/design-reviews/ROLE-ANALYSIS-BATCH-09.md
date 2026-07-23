# Role Analysis — Batch 9 of ~10 (FLOW-41 → FLOW-45)

## Date: 2026-04-20 | Branch: claude/pensive-tereshkova-baf347
## Source: CLAUDE.md slug semantics + P1 inventory placeholders + existing page scaffolds (4 of 5)
## Scope constraint: per Luba, no more than 5 flows per run

---

## Batch 9 scope

**All-engine-internal batch.** Every flow in this batch is marked `ENGINE_INTERNAL` in CLAUDE.md. Density should hover around the 2-3 cell two-role-minimum floor confirmed in batches 6 and 7. One flow (FLOW-41 adapter CI/CD bridge) has no client-page scaffold — the CLAUDE.md domain-slug map reserves the name but no `client/src/pages/adapter-*/` folder exists. Analysis is forward-looking.

Existing client scaffolds:

- **FLOW-41 adapter CI/CD bridge:** *no scaffold — CLAUDE.md-reserved name, no page yet*
- **FLOW-42 rag-quality-graph:** `rag-quality-graph/` folder exists
- **FLOW-43 meta-flow-orchestration:** `meta-flow-orchestration/` folder exists
- **FLOW-44 ai-self-modification:** `ai-self-modification/` folder exists
- **FLOW-45 cycle-chain-extension:** `cycle-chain-extension/` folder exists

---

## Zip-to-XIIGen mapping for batch 9

No direct zip documents. All analyses inferred from slug + architectural position.

---

## FLOW-41 — Adapter CI/CD Bridge (not yet scaffolded)

**Business-logic summary (inferred from slug):** Bridge between the XIIGen engine and external CI/CD pipelines — GitHub Actions, GitLab CI, Jenkins, Bitbucket pipelines. When a tenant's custom flow or plugin is submitted (via FLOW-32 sharable-flows-marketplace or FLOW-34 marketplace-plugin-adapter), FLOW-41 runs the tenant's test suite, lint checks, type-checks, and security scans in the external CI before the install gates. Also handles rollback hooks on deployment failures.

**Entry points (inferred):** `GET /admin/platform/ci-cd` (platform-admin — CI/CD bridge ops), `GET /admin/platform/ci-cd/pipelines/:id` (platform-admin — pipeline run detail), `GET /support/ci-cd/:runId` (platform-support — pipeline debug), `GET /admin/my-submissions/ci-cd` (tenant-admin — FREEDOM-gated — their submitted flow pipelines).

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`platform-admin`** | Primary — CI/CD infrastructure ops, pipeline configuration, runner management, external-provider credentials | Full CI/CD bridge console + pipeline monitor + provider-credential vault | ✅ YES — CI/CD ops primary |
| **`platform-support`** | Read-only — investigate failed pipelines referenced in support tickets | Per-pipeline-run inspector + log viewer | ⚠️ read-only variant |
| **`tenant-admin`** | FREEDOM-gated — see their own submission's pipeline status ("Why did my flow fail validation?") | Submission-status list + failure-log + resubmit action | ⚠️ tenant status-only |
| All other roles | — | DevOps infrastructure — not end-user exposed | — |

### Template implications

1. `AdapterCiCdBridgePage` (NEW scaffold required — `client/src/pages/adapter-ci-cd-bridge/`) → platform-admin primary.
2. `MySubmissionsCiCdPage` (`/admin/my-submissions/ci-cd`) — tenant-admin FREEDOM-gated.
3. `CiCdSupportInspectorPage` — platform-support.

### ROLE-COVERAGE-MATRIX update for FLOW-41

anon — · public-mkt — · tenant-user — · tenant-admin ⚠️ (FREEDOM) · referral — · freelancer — · biz-partner — · event-org — · platform-admin ✅ · platform-support ⚠️

(Previously 0 cells — N/A row; now **1 full + 2 partial** cells = 3. +3 — flow is reserved but has role-template targets once scaffolded.)

---

## FLOW-42 — RAG Quality Graph

**Business-logic summary (from P1 "Learning Handoff-specific patterns"):** Knowledge-graph-backed RAG quality tracking. Models retrieval events as a graph (query → retrieved docs → user feedback → outcome). Platform-admin uses it to identify retrieval weaknesses and training gaps. Feeds into FLOW-38 rag-quality-feedback.

**Entry points (inferred):** `GET /admin/platform/rag-graph` (platform-admin — graph explorer), `GET /admin/platform/rag-graph/nodes/:id` (platform-admin — node detail), `GET /support/rag-graph/:traceId` (platform-support — graph trace).

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`platform-admin`** | Primary — graph explorer, quality trend analysis, retrieval gap identification | Graph explorer + quality dashboards + gap alerts | ✅ YES — RAG graph ops primary |
| **`platform-support`** | Read-only — "trace a specific retrieval back through the graph" | Single-trace graph walk | ⚠️ read-only variant |
| All other roles | — | Engine learning substrate | — |

### Template implications

1. `RagQualityGraphPage` (existing) → platform-admin primary.
2. `RagGraphSupportInspectorPage` — platform-support.

### ROLE-COVERAGE-MATRIX update for FLOW-42

anon — · public-mkt — · tenant-user — · tenant-admin — · referral — · freelancer — · biz-partner — · event-org — · platform-admin ✅ · platform-support ⚠️

(Previously 1 cell; now **1 full + 1 partial** cells = 2. +1.)

---

## FLOW-43 — Meta Flow Orchestration

**Business-logic summary (from P1 "Session Management-specific patterns"):** Orchestrates FLOWS-OF-FLOWS at session scope. When a user request triggers multiple flows (e.g., signup → verify email → profile enrichment → group suggestion), FLOW-43 tracks the session-level orchestration, ensures ordering, handles compensating rollbacks if any flow fails. Pure engine substrate.

**Entry points (inferred):** `GET /admin/platform/meta-orchestration` (platform-admin — session orchestration ops), `GET /admin/platform/meta-orchestration/sessions/:id` (platform-admin — session trace), `GET /support/meta-orchestration/:sessionId` (platform-support).

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`platform-admin`** | Primary — session orchestration console, compensating-action review, dead session cleanup | Session orchestration ops + rollback console | ✅ YES — meta-orchestration primary |
| **`platform-support`** | Read-only — "why did this user's signup take 47 minutes?" | Per-session trace inspector | ⚠️ read-only variant |
| All other roles | — | Engine substrate | — |

### Template implications

1. `MetaFlowOrchestrationPage` (existing) → platform-admin primary.
2. `MetaOrchestrationSupportInspectorPage` — platform-support.

### ROLE-COVERAGE-MATRIX update for FLOW-43

anon — · public-mkt — · tenant-user — · tenant-admin — · referral — · freelancer — · biz-partner — · event-org — · platform-admin ✅ · platform-support ⚠️

(Previously 1 cell; now **1 full + 1 partial** cells = 2. +1.)

---

## FLOW-44 — AI Self-Modification

**Business-logic summary (from P1 "Gap Translation Engine-specific patterns"):** The engine's self-modification capability — XIIGen's AI proposing improvements to its own code based on observed gaps (via FLOW-25 BFA + FLOW-35 meta-arbitration feedback). HIGHLY SENSITIVE — every self-modification proposal passes through human-approval gates (FLOW-27) and BFA validation. Platform-admin owns the approval surface; platform-support audits every change.

**Entry points (inferred):** `GET /admin/platform/self-modification` (platform-admin — proposal queue), `POST /admin/platform/self-modification/:id/approve` (platform-admin — approve with audit trail), `GET /support/self-modification/:changeId` (platform-support — change audit — mandatory for SOC2 trail).

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`platform-admin`** | Primary — review AI-proposed engine changes, approve/reject, trigger dry-runs in staging | Proposal queue + diff viewer + staging-test runner + approval gate with reason-recording | ✅ YES — self-modification gate primary |
| **`platform-support`** | Read-only — mandatory audit trail for every self-modification change (compliance requirement) | Per-change audit log with unchangeable decision record | ⚠️ compliance-grade read-only |
| All other roles | — | Highly sensitive engine-internal — never exposed | — |

### Template implications

1. `AiSelfModificationPage` (existing) → platform-admin primary with enhanced approval gate UI.
2. `SelfModificationAuditLogPage` — platform-support (append-only compliance log).

### ROLE-COVERAGE-MATRIX update for FLOW-44

anon — · public-mkt — · tenant-user — · tenant-admin — · referral — · freelancer — · biz-partner — · event-org — · platform-admin ✅ · platform-support ⚠️ (compliance-grade)

(Previously 1 cell; now **1 full + 1 partial** cells = 2. +1.)

---

## FLOW-45 — Cycle Chain Extension

**Business-logic summary (from P1 "Flow State Machine-specific patterns"):** Extensibility mechanism for flow cycles — pre-hooks, post-hooks, chain-extensions that let tenants/platform-admins inject custom logic at flow boundaries without modifying the core flow. Analogous to WordPress hooks. Platform-admin owns cycle-extension semantics; tenant-admin may register tenant-local extensions if FREEDOM-enabled.

**Entry points (inferred):** `GET /admin/platform/cycle-chain-extensions` (platform-admin — extension library), `POST /admin/platform/cycle-chain-extensions/:id/register` (platform-admin — register system extension), `GET /admin/my-tenant/cycle-extensions` (tenant-admin — FREEDOM-gated tenant extension registrar), `GET /support/cycle-chain/:invocationId` (platform-support — hook invocation audit).

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`platform-admin`** | Primary — manage cycle-extension library, register system hooks, resolve extension conflicts | Extension library + conflict resolver + hook-invocation monitor | ✅ YES — cycle extension primary |
| **`platform-support`** | Read-only — per-invocation trace for debug | Per-invocation inspector | ⚠️ read-only variant |
| **`tenant-admin`** | FREEDOM-gated — register tenant-local cycle extensions (tenant-specific post-hook logic) | Tenant extension registrar + scope-limited library | ⚠️ FREEDOM-gated |
| All other roles | — | Extension substrate | — |

### Template implications

1. `CycleChainExtensionPage` (existing) → platform-admin primary.
2. `TenantCycleExtensionsPage` (`/admin/my-tenant/cycle-extensions`) — tenant-admin FREEDOM-gated.
3. `CycleChainSupportInspectorPage` — platform-support.

### ROLE-COVERAGE-MATRIX update for FLOW-45

anon — · public-mkt — · tenant-user — · tenant-admin ⚠️ (FREEDOM) · referral — · freelancer — · biz-partner — · event-org — · platform-admin ✅ · platform-support ⚠️

(Previously 1 cell; now **1 full + 2 partial** cells = 3. +2.)

---

## Consolidated role signals across batch 9

| Role | Flows in batch 9 needing it | Notes |
|------|:---------------------------:|-------|
| `anonymous` | — | Zero anon surface in engine-internal batch |
| `public-marketplace-visitor` | — | Zero |
| `tenant-user` | — | Zero — all flows are platform-ops |
| `tenant-admin` | FLOW-41 ⚠️, FLOW-45 ⚠️ | FREEDOM-gated visibility only |
| `referral-user` | — | — |
| `freelancer` | — | — |
| `business-partner` | — | — |
| `event-organiser` | — | — |
| `platform-admin` | All 5 ✅ | Universal — sole primary persona in batch 9 |
| `platform-support` | All 5 ⚠️ | Universal read-only audit |

### Biggest finding in batch 9

**Batch 9 is the purest "engine two-role minimum" batch** — 4 of 5 flows have exactly platform-admin + platform-support as their only role surfaces. FLOW-41 (CI/CD) and FLOW-45 (cycle extensions) add a FREEDOM-gated tenant-admin row because tenants may consume these capabilities to extend their custom flows. Otherwise nothing tenant-facing.

**FLOW-44 ai-self-modification deserves special architectural note:** it is the ONLY flow in the fleet where the platform-support read-only role is *compliance-grade* (append-only audit log with legal-trail semantics). This is a MANDATORY feature — SOC2 / GDPR require every self-modification change to have an unchangeable audit record.

### Consolidated batch 1..9 density (per flow, top 20 unchanged)

Top 20 cell counts stable since batch 8. Batch 9 flows all sit in the 2-3 cell band, at the bottom of the density distribution — exactly where engine-internal flows belong.

---

## Fleet-wide plan validation status (end of batch 9)

| Plan | 48-flow coverage |
|------|---|
| P14b FLOW-SESSION-VISUALIZATION-v2 | ✅ 164 PNGs |
| UX-FIX-THREE-TRACK | ✅ |
| UX-FIX-EXECUTION (7-task v2) | ✅ |
| P14-EXECUTION (P1-14 test coverage) | ✅ |
| FLOW-UI-COVERAGE-PLAN-UNIFIED | ✅ |
| FLOW-48-PLAN-P1-P14 (i18n) | ✅ 12/12 + 14 PNGs |
| ui-ux-pro-max-skill-main | ✅ baseline; 43 pages pending useTranslation |
| **C6 role-aware templating** | 🟡 scaffold + FLOW-08 pilot; **9 of 10 batches DONE** — 45 of 48 flows (93.75%) |

**Overall gate:** 7 of 8 plans GREEN. C6 analysis at 93.75% — one batch from fleet-wide completeness.

---

## Running coverage target

- Initial: ~135
- After batch 1: +9 → 144
- After batch 2: +20 → 155
- After batch 3: +18 → 173
- After batch 4: +7 → 180
- After batch 5: +18 → 198
- After batch 6: +9 → 207
- After batch 7: +9 → 216
- After batch 8: +8 → 224
- **After batch 9: +7 → 231**

Final fleet target now expected to land at **235-240** after batch 10 (FLOW-46..48).

---

## Next batch (FINAL)

Batch 10 target: **FLOW-46 → FLOW-48** (platform-agent, module-lifecycle, i18n-translation). Smaller batch — only 3 flows. FLOW-48 i18n is already top-tier density (8 cells) per matrix; FLOW-46 and FLOW-47 are engine-internal.

Produces: `docs/design-reviews/ROLE-ANALYSIS-BATCH-10.md` — **the final batch**.

Once batch 10 lands, ROLE-COVERAGE-MATRIX.md will be the complete, authoritative map of role templates × flows for all 48 XIIGen flows. Implementation rollout (converting matrix cells into shipped `<RoleScopedView>` instances) is still at pilot stage — that's the next major C6 work after analysis completes.

---

## Footer

Produces artifact at: `docs/design-reviews/ROLE-ANALYSIS-BATCH-09.md`.
Companion: `docs/design-reviews/ROLE-COVERAGE-MATRIX.md` (matrix rows 41..45 updated).
Prior batches: `ROLE-ANALYSIS-BATCH-01.md` through `-08.md`.
Fleet verdict context: `docs/design-reviews/FLEET-VALIDATION-v2.md`.
