# PNG INVENTORY — every screenshot in `docs/e2e-snapshots/` mapped to its source

**Purpose.** For each PNG in the fleet, this inventory states:
1. Which FLOW-XX the PNG belongs to
2. Which business state / lifecycle phase it depicts
3. Which viewer role was rendering
4. Which session document(s) define the intent (see `SPEC-LOCATION-INDEX.md`)
5. Which real-world reference platform governs the expected visual language (see `MARKET-REFERENCE-CATALOG.md`)
6. Whether the PNG currently *matches* or *contradicts* that intent

Without this mapping, every PNG audit repeats the same rediscovery work. With
this mapping, a reviewer (human or Claude) can open any PNG, look it up, and
immediately read: "this depicts FLOW-N state K for role R; here's where the
spec lives; here's the reference platform; here's the expected vs actual verdict."

**Not a drive-by description.** Every row is traceable to a source document or
is explicitly flagged as `SPEC_MISSING`.

---

## Companion documents (read before using this inventory)

The following four documents govern every row in this file. All four live
under `docs/screen-examination/` so they travel with the codebase.

| Document | Purpose |
|----------|---------|
| `REPAIR-GUIDANCE.md` | The governing 8-part guidance — classification taxonomy, decision tree, build standard, reference table, global fixes, must-nots |
| `SPEC-LOCATION-MAP.md` | Per-file answer map — for any design question, the exact file path that answers it (6 files, read order defined) |
| `SPEC-LOCATION-MAP-ADDENDUM-FLOW36-45.md` | Corrections for FLOW-36..45 — Potemkin UI (CFI-05) + external-adapter classification + FLOW-37 Multi-Stack Porting clarification |
| `SPEC-LOCATION-INDEX.md` | Per-flow inventory — for each FLOW-XX, which of the 6 files exist and their repo paths |
| `MARKET-REFERENCE-CATALOG.md` | Per-flow real-world platform reference + per-state rendering notes |

The persistent skill `.claude/skills/flow-ui-examination-protocol-SKILL.md`
invokes all five in the correct read order.

---

## Spec location — 6-file structure (per `SPEC-LOCATION-MAP.md`)

For every flow, read these files in this order **before opening any PNG**:

| # | File | Path | Question answered |
|---|------|------|-------------------|
| 1 | STEP-1-INVARIANTS | `docs/sessions/FLOW-XX/FLOW-XX-STEP-1-INVARIANTS.md` | What does this flow do? (user_intent sentence) |
| 2 | UI-REFLECTION-STATE | `docs/sessions/FLOW-XX/UI-REFLECTION-STATE.md` | What processes + states exist? Which React components implement them? Which states are missing? |
| 3 | ROLE-ANALYSIS-BATCH-NN | `docs/design-reviews/ROLE-ANALYSIS-BATCH-NN.md` | Which roles open this screen and what does each see? (Also `XIIGEN-ROLE-SCREEN-ARCHITECTURE-GUIDE.md` in zip — 144-role taxonomy) |
| 4 | Business flow spec | `business_flows.zip / NN-flow-name.md` (uploaded) | Business intent, user journey, success metrics. **FLOW-35–FLOW-47 have no entry — use files 1/2/5 instead.** |
| 5 | DESIGN-SIMULATION | `docs/sessions/FLOW-XX/FLOW-XX-DESIGN-SIMULATION-R1.md` (if exists) | End-to-end user walkthrough — screenplay of the flow |
| 6 | RECONCILIATION-STATE | `docs/sessions/FLOW-XX/FLOW-XX-RECONCILIATION-STATE.md` | What's built vs designed. If verdict = DEMONSTRABLY_WRONG, don't base UI on existing components — base on spec. |

**Fallback (Source 5 of the prior 5-source model):** `MARKET-REFERENCE-CATALOG.md`
for the real-world platform reference — used only when files 1–4 are silent on
a specific UI pattern.

**Resolution rule:** Every design decision must cite which of the 6 files
supports it. If no file supports it, the decision comes from the reference
platform (MARKET-REFERENCE-CATALOG) and is labelled as inference.

---

## Global fixes landed in RUN-49 (commit `a3ff8b81`)

Part 7 of the repair guidance defines three cross-cutting fixes. All three are
now live on branch `claude/pensive-tereshkova-baf347`:

| Fix | Affected files | Status |
|-----|---------------|--------|
| G1 — Provider-keys banner → platform-admin only | `client/src/components/KeyStatusBanner/KeyStatusBanner.tsx` | ✅ landed RUN-49 |
| G2 — Sidebar active NavLink accent | `client/src/App.tsx` | ✅ landed RUN-49 |
| G3 — Hide sidebar for anonymous public visitors | `client/src/App.tsx` (AppShell) | ✅ landed RUN-49 |

**Implication:** every row in this inventory dated RUN-50 or later is evaluated
**after** G1/G2/G3. Pre-RUN-49 PNGs are retained as historical evidence and
marked `❌ pre-RUN-49` where relevant — they are not product evidence.

---

## CFI-05 — Potemkin UI flows (refined by RUN-52 investigation)

The original CFI-05 finding (6 flows with "no route wired") turned out to be
more nuanced. After RUN-52 investigation:

| Flow | Slug | Route in App.tsx | Page wrapper | Purpose-built screen | Status |
|------|------|-------------------|---------------|----------------------|--------|
| FLOW-36 | feature-registry | ✅ `/admin/feature-registry` | ✅ `FeatureRegistryPage` (CRUD default) | 🟡 `FeatureMatrixScreen` orphaned | Fix in Batch C |
| FLOW-37 | design-system-governance | ✅ `/admin/design-system-governance` | ✅ (CRUD default) | 🟡 `StackPortingScreen` orphaned | Fix in Batch B |
| FLOW-38 | rag-quality-feedback | ✅ `/admin/rag-quality-feedback` | ✅ (CRUD default) | 🟡 `RagQualityScreen` orphaned | Fix in Batch F |
| FLOW-39 | oss-curriculum | ✅ `/admin/oss-curriculum` | ✅ (CRUD default) | 🟡 `OssCurriculumScreen` orphaned | Fix in Batch F |
| FLOW-40 | client-push | ✅ `/admin/client-push` | ✅ (CRUD default) | 🟡 `ClientPushScreen` orphaned | Fix in Batch C |
| FLOW-45 | history-bootstrap | ✅ `/admin/history-bootstrap` **(RUN-52)** | ✅ `HistoryBootstrapPage` **(RUN-52)** | ✅ wired as default | **Closed (RUN-52)** |

**Refined finding:** Only FLOW-45 was truly route-less before RUN-52. The
other 5 flows had routes but their Page wrappers default to
`AdminCrudPanel` — the CRUD-anti-pattern `REPAIR-GUIDANCE.md` rejects.

The fix for FLOW-36/37/38/39/40 is a **Page rewrite per flow**, not a
routing sweep. The FLOW-45 `HistoryBootstrapPage` commit (RUN-52) is the
template: `?mock=X` → BusinessStateCard, no-mock → PlatformOpsPage wrapping
the purpose-built screen with populated seed data.

These rewrites happen as part of each flow's per-batch examination, not as
a separate run, so each PNG is cleanly attributable to one flow-level fix.

---

## External adapter flows — no XIIGen UI

FLOW-41 (Canva), FLOW-42 (Miro), FLOW-43 (Webflow), FLOW-44 (Framer) are
external vendor-SDK adapters. Per their own `UI-REFLECTION-STATE.md`:

> `INTERNAL_ONLY — EXTERNAL_REPO — adapter lives in vendor SDK, no XIIGen UI`

**There is no XIIGen screen to design, examine, or repair for these flows.**
Any PNG in `docs/e2e-snapshots/{adapter-slug}/` showing a XIIGen page is a
mis-capture by definition. These directories should be deleted or flagged
as non-evidence — they are not examined in PNG-INVENTORY batches.

---

## Column schema

| Column | Meaning |
|--------|---------|
| PNG | Path relative to `docs/e2e-snapshots/` |
| Flow | `FLOW-XX` identifier |
| State/Phase | Business state depicted (from `MOCK_STATES` in code OR FILE 2 UI-REFLECTION-STATE.md) |
| Role | Viewer role the PNG was rendered under (from FILE 3 ROLE-ANALYSIS-BATCH-NN.md) |
| Spec cite | `F1` / `F2` / `F3` / `F4` / `F5` / `F6` — which of the 6 files governs (per `SPEC-LOCATION-MAP.md`) |
| Ref platform | Real-world reference from `MARKET-REFERENCE-CATALOG.md` |
| Verdict | ✅ match · 🟡 partial · ❌ contradicts intent · ⏭ no spec exists |
| Notes | What's seen vs what's spec'd, one sentence |

---

## Fleet-level counts (as of RUN-50)

- **Total directories:** 48 (one per flow) + `UNKNOWN` + `c6-role-coverage`
- **Total PNGs:** 628 (fleet) + 109 (c6-role-coverage after RUN-47b)
- **Rows catalogued in this document:** 9 (FLOW-29 complete — batches pending for 47 remaining flows)

---

## Inventory

### FLOW-29 · adaptive-rag-deep-research · 6+3 PNGs

**Reference platform (MARKET-REFERENCE-CATALOG):** Perplexity AI + Elicit for researcher view; n8n + Temporal UI for admin topology view.

Spec citations used in the rows below:
- `F1` — `docs/sessions/FLOW-29/FLOW-29-STEP-1-INVARIANTS.md` (user_intent sentence)
- `F2` — `docs/sessions/FLOW-29/UI-REFLECTION-STATE.md` (27 named processes + 5 runtime states)
- `F3` — `docs/design-reviews/ROLE-ANALYSIS-BATCH-06.md` (covers FLOW-26..FLOW-30; confirms FLOW-29 is ENGINE-INTERNAL admin-only)
- `F4` — **not applicable** (FLOW-29 has no entry in business_flows.zip; engine-internal flow)
- `F5` — `docs/sessions/FLOW-29/FLOW-29-DESIGN-SIMULATION-R1.md` (walkthrough)
- `F6` — `docs/sessions/FLOW-29/FLOW-29-RECONCILIATION-STATE.md`
- also `docs/sessions/FLOW-29/flow-ui-automation.json` — confirms `uiRequired = "Admin debug only"`

Business states (from `MOCK_STATES` in `client/src/pages/adaptive-rag-deep-research/AdaptiveRagDeepResearchPage.tsx`):
`query-received`, `plan-queued`, `search-running`, `sources-gathered`, `synthesis-done`, `search-failed`, `clarification-escalated`.

| PNG | State/Phase | Role | Spec cite | Ref platform | Verdict | Notes |
|-----|-------------|------|-----------|--------------|---------|-------|
| `adaptive-rag-deep-research/default.png` | default (no `?mock=`) | platform-admin implied | F1+F2 | n8n | ❌ pre-RUN-50 | Shows CRUD table with `ui-1776451808918` rows. Replaced by topology canvas in RUN-50; PNG not yet regenerated under new code. |
| `adaptive-rag-deep-research/state-1-flow-has.png` | `state-1` (BFA mock) | platform-admin | — | n/a | ❌ invalid evidence | Renders "FLOW-29 has no documented states" — engineering message leaked into user-facing space. |
| `adaptive-rag-deep-research/crud-initial-load.png` | CRUD scaffold | platform-admin | — | n/a | ❌ invalid | Generic admin-crud-panel table; replaced. |
| `adaptive-rag-deep-research/crud-after-create.png` | CRUD scaffold | platform-admin | — | n/a | ❌ invalid | Same as above, after form submission. |
| `adaptive-rag-deep-research/crud-list-with-test-row.png` | CRUD scaffold | platform-admin | — | n/a | ❌ invalid | Includes test-spec file names in Notes column (engineering leak). |
| `adaptive-rag-deep-research/c-03-before.png` | pre-CRUD | platform-admin | — | n/a | ❌ invalid | Same table, smaller row set. |
| `c6-role-coverage/flow-29-topology-canvas-stalled-run.png` | `search-running` (4 complete, 3 running, 2 pending) | platform-admin, `?run=stalled` | F1+F2+F3 | n8n + Temporal UI | ✅ match (v3, RUN-50) | Topology canvas with phase groups, state icon+text+colour, budget strip on anchor, path-summary fallback. |
| `c6-role-coverage/flow-29-topology-canvas-platform-support.png` | `search-running` read-only | platform-support, `?run=stalled` | F1+F2+F3 | n8n + Temporal UI | ✅ match (v3, RUN-50) | Same canvas, read-only banner, side panel shows escalate-to-admin sub-note. |
| `c6-role-coverage/flow-29-topology-canvas-tenant-user-fallback.png` | not-available fallback | tenant-user | F1+F3 | n/a (not-available variant) | ✅ match (v3, RUN-50) | Minimal card: "engine-internal operations surface, not available for your current role." |

FLOW-29 status: **reference implementation.** Pre-RUN-50 PNGs are retained for before/after comparison but are explicitly flagged invalid as product evidence.

---

### FLOW-18 · visual-flow-engine · 6+3 PNGs · RUN-53 catalogued (Batch A)

**Reference platform:** n8n + Zapier + Make + Retool (Grammar 4 Topology Canvas). Layout: `[palette | canvas | chat aside]` (locked RUN-47e).

Spec citations:
- `F1` — `docs/sessions/FLOW-18/FLOW-18-STEP-1-INVARIANTS.md` (user_intent verbatim)
- `F2` — `docs/sessions/FLOW-18/UI-REFLECTION-STATE.md` (22 processes: 8 PARTIAL_UI + 14 INTERNAL_ONLY; `next_step` missing across all PARTIAL_UI)
- `F3` — `docs/design-reviews/ROLE-ANALYSIS-BATCH-04.md` (3 roles: tenant-admin, platform-admin, platform-support)
- `F4` — **not applicable** (no entry in `business_flows.zip`)

Examination record: `docs/screen-examination/visual-flow-engine-examination.md`. Primary finding: NEEDS_ERROR_HANDLING (P0, H9 Error Recovery score 0/2) — `TopologyViewer` surfaces "backend may be unreachable" as normal state on the DRAFT editor.

| PNG | State/Phase | Role | Spec cite | Ref platform | Verdict | Notes |
|-----|-------------|------|-----------|--------------|---------|-------|
| `visual-flow-engine/01-every-task-type-in-t246-t286-has-at-leas.png` | BFA mock — success criteria line | fallback | — | n/a | ❌ invalid evidence | Renders STEP-1-INVARIANTS success-criteria text as visible UI. Engineering leak — should be deleted. |
| `visual-flow-engine/02-every-plan-step-is-scoped-to-a-single-re.png` | BFA mock — SC line 2 | fallback | — | n/a | ❌ invalid | Same pattern. |
| `visual-flow-engine/03-no-step-imports-provider-sdks-directly-f.png` | BFA mock — SC line 3 | fallback | — | n/a | ❌ invalid | Same pattern. |
| `visual-flow-engine/04-no-step-creates-entity-specific-controll.png` | BFA mock — SC line 4 | fallback | — | n/a | ❌ invalid | Same pattern. |
| `visual-flow-engine/05-all-steps-return-dataprocessresult-t.png` | BFA mock — SC line 5 | fallback | — | n/a | ❌ invalid | Same pattern. |
| `visual-flow-engine/06-focus-areas-covered-crdt-code-injection.png` | BFA mock — SC line 6 | fallback | — | n/a | ❌ invalid | Same pattern (also: provider-keys banner visible — pre-RUN-49). |
| `c6-role-coverage/visual-flow-engine-role-tenant-admin-n8n-layout.png` | DRAFT editing, 2 palette nodes dropped | tenant-admin | F1+F2+F3 | n8n | 🟡 partial (pre-RUN-49) | Correct n8n 3-column layout with canvas + chat aside. ❌ provider-keys banner visible (fixed RUN-49, needs re-capture). ❌ "Error: Topology response missing nodes or edges" visible below canvas. |
| `c6-role-coverage/visual-flow-engine-role-platform-admin.png` | cross-tenant audit | platform-admin | F1+F2+F3 | n8n + audit table | 🟡 partial (pre-RUN-49) | Needs re-capture post-RUN-49. |
| `c6-role-coverage/visual-flow-engine-role-platform-support.png` | read-only canvas viewer | platform-support | F1+F2+F3 | n8n (fieldset disabled) | 🟡 partial (pre-RUN-49) | Needs re-capture post-RUN-49. |

**Next action for FLOW-18:** RUN-54+ TopologyViewer empty-state copy fix (H9 recovery) + regenerate 3 role-coverage PNGs post-RUN-49.

---

### FLOW-26 · meta-flow-engine · 23 PNGs · RUN-54 catalogued (Batch A.2)

**Reference platform:** n8n meta-workflow view + Temporal UI + Airflow DAG (Grammar 4 Topology Canvas). Target: topology of flows-as-nodes; flow state colour per node; side panel per inspected flow; action bar gated to platform-admin.

Spec citations:
- `F1` — `docs/sessions/FLOW-26/FLOW-26-STEP-1-INVARIANTS.md`
- `F2` — `docs/sessions/FLOW-26/UI-REFLECTION-STATE.md` (24 processes, ALL INTERNAL_ONLY; every state missing)
- `F3` — `docs/design-reviews/ROLE-ANALYSIS-BATCH-06.md` (2 roles: platform-admin, platform-support)
- `F4` — not applicable (engine-internal)

Examination record: `docs/screen-examination/meta-flow-engine-examination.md`. Primary finding: NEEDS_PURPOSE_BUILT_UI (P0) — current `MetaFlowEnginePage.tsx` is config editor + action buttons; should be a topology canvas per FLOW-29 template.

| PNG | State/Phase | Role | Spec cite | Ref platform | Verdict | Notes |
|-----|-------------|------|-----------|--------------|---------|-------|
| `meta-flow-engine/01-dna-1-record-string-unknown-no-typed-mod.png` | BFA mock — DNA-1 rule text | fallback | — | n/a | ❌ invalid evidence | Renders DNA rule 1 as visible UI. Engineering leak. Delete. |
| `meta-flow-engine/02-dna-2-buildsearchfilter-dynamic-queries.png` | BFA mock — DNA-2 | fallback | — | n/a | ❌ invalid | Same. Delete. |
| `meta-flow-engine/03-dna-3-dataprocessresult-t-no-throws-for.png` | BFA mock — DNA-3 | fallback | — | n/a | ❌ invalid | Same. Delete. |
| `meta-flow-engine/04-dna-4-microservicebase-19-inherited-comp.png` | BFA mock — DNA-4 | fallback | — | n/a | ❌ invalid | Same. Delete. |
| `meta-flow-engine/05-dna-5-scope-isolation-via-asynclocalstor.png` | BFA mock — DNA-5 | fallback | — | n/a | ❌ invalid | Same. Delete. |
| `meta-flow-engine/06-dna-6-dynamiccontroller-all-crud-via-api.png` | BFA mock — DNA-6 | fallback | — | n/a | ❌ invalid | Same. Delete. |
| `meta-flow-engine/07-dna-7-idempotency-via-queue-deduplicatio.png` | BFA mock — DNA-7 | fallback | — | n/a | ❌ invalid | Same. Delete. |
| `meta-flow-engine/08-dna-8-outbox-pattern-storedocument-befor.png` | BFA mock — DNA-8 | fallback | — | n/a | ❌ invalid | Same. Delete. |
| `meta-flow-engine/09-dna-9-cloudevents-envelope-for-inter-ser.png` | BFA mock — DNA-9 | fallback | — | n/a | ❌ invalid | Same. Delete. |
| `meta-flow-engine/state-1-dna-record.png` | BFA mock — DNA-1 duplicate | fallback | — | n/a | ❌ invalid | Duplicate of 01. Delete. |
| `meta-flow-engine/state-2-dna-buildsearchfilter.png` | BFA mock — DNA-2 duplicate | fallback | — | n/a | ❌ invalid | Duplicate. Delete. |
| `meta-flow-engine/state-3-dna-dataprocessresult.png` | BFA mock — DNA-3 duplicate | fallback | — | n/a | ❌ invalid | Duplicate. Delete. |
| `meta-flow-engine/state-4-dna-microservicebase.png` | BFA mock — DNA-4 duplicate | fallback | — | n/a | ❌ invalid | Duplicate. Delete. |
| `meta-flow-engine/state-5-dna-scope.png` | BFA mock — DNA-5 duplicate | fallback | — | n/a | ❌ invalid | Duplicate. Delete. |
| `meta-flow-engine/state-6-dna-dynamiccontroller.png` | BFA mock — DNA-6 duplicate | fallback | — | n/a | ❌ invalid | Duplicate. Delete. |
| `meta-flow-engine/state-7-dna-idempotency.png` | BFA mock — DNA-7 duplicate | fallback | — | n/a | ❌ invalid | Duplicate. Delete. |
| `meta-flow-engine/state-8-dna-outbox.png` | BFA mock — DNA-8 duplicate | fallback | — | n/a | ❌ invalid | Duplicate. Delete. |
| `meta-flow-engine/state-9-dna-cloudevents.png` | BFA mock — DNA-9 duplicate | fallback | — | n/a | ❌ invalid | Duplicate. Delete. |
| `meta-flow-engine/state-1-flow-registered.png` | `FLOW_REGISTERED` | platform-admin (inferred) | F2 derived state | n8n (target) | 🟡 partial | One of 5 derived runtime states. Likely BusinessStateCard rendering; retain for reference until topology rebuild. |
| `meta-flow-engine/state-2-generation-queued.png` | `GENERATION_QUEUED` | platform-admin | F2 derived | n8n | 🟡 partial | Same. |
| `meta-flow-engine/state-3-generation-running.png` | `GENERATION_RUNNING` | platform-admin | F2 derived | n8n | 🟡 partial | Same. |
| `meta-flow-engine/state-4-review-gate.png` | `REVIEW_GATE` | platform-admin | F2 derived | n8n | 🟡 partial | Same. |
| `meta-flow-engine/state-5-review-needs-revision.png` | `REVIEW_NEEDS_REVISION` | platform-admin | F2 derived | n8n | 🟡 partial | Same. |
| `meta-flow-engine/state-6-published.png` | `PUBLISHED` | platform-admin | F2 derived | n8n | 🟡 partial | Same. |
| `meta-flow-engine/state-7-failed.png` | `FAILED` | platform-admin | F2 derived | n8n | 🟡 partial | Same. |
| `meta-flow-engine/default.png` | CRUD default | platform-admin | F2 | n/a | ❌ invalid | Default path shows AdminCrudPanel. Replaced by topology canvas on rebuild. |
| `meta-flow-engine/c-03-before.png` | CRUD pre-state | platform-admin | — | n/a | ❌ invalid | Delete. |
| `meta-flow-engine/crud-initial-load.png` | CRUD scaffold | platform-admin | — | n/a | ❌ invalid | Delete. |
| `meta-flow-engine/crud-after-create.png` | CRUD scaffold | platform-admin | — | n/a | ❌ invalid | Delete. |
| `meta-flow-engine/crud-list-with-test-row.png` | CRUD scaffold | platform-admin | — | n/a | ❌ invalid | Delete. |

**Next action for FLOW-26:** Rebuild `MetaFlowEnginePage.tsx` as Grammar-4 topology canvas per FLOW-29 recipe; delete 17 BFA-mock / CRUD PNGs; keep 7 state-mock PNGs as reference until topology rebuild ships.

---

### FLOW-34 · marketplace-plugin-adapter · 14 PNGs · RUN-55 catalogued (Batch A.3)

**Reference platform:** Zapier app directory, VS Code extensions marketplace, Stripe Connect integrations dashboard (Grammar 3 catalog + Grammar 3 admin dashboard + compound Grammar 4 topology for platform-admin).

Spec citations:
- `F1` — `docs/sessions/FLOW-34/FLOW-34-STEP-1-INVARIANTS.md` (**possibly misaligned** — says "AI Agent Orchestration" but slug + PNG + roles describe plugin marketplace)
- `F2` — `docs/sessions/FLOW-34/UI-REFLECTION-STATE.md` (1 NO_UI process `NOT_IMPLEMENTED-FLOW-34`; server engine dir does not exist)
- `F3` — `docs/design-reviews/ROLE-ANALYSIS-BATCH-07.md` (9 viewer roles — broadest in Batch A)
- `F4` — not applicable (no business_flows entry)

Examination record: `docs/screen-examination/marketplace-plugin-adapter-examination.md`. Primary finding: NEEDS_PURPOSE_BUILT_UI (P0) + NEEDS_ROLE_BRANCH_CORRECTION (P1) — current 1 admin page for 9 observable roles; needs public catalog + partner publisher + platform curation pages too. Also spec gap: F1 intent vs slug mismatch.

Derived lifecycle states (from PNG filenames): `adapter-registered → handshake-pending → plugin-connected → payload-translating → payload-translated → synced` + error branches `schema-mismatch`, `rate-limited`.

| PNG | State/Phase | Role | Spec cite | Ref platform | Verdict | Notes |
|-----|-------------|------|-----------|--------------|---------|-------|
| `marketplace-plugin-adapter/default.png` | CRUD default | platform-admin | F2 | n/a | ❌ invalid | AdminCrudPanel default path. Replaced by card list on rebuild. |
| `marketplace-plugin-adapter/c-03-before.png` | CRUD pre-state | platform-admin | — | n/a | ❌ invalid | Delete. |
| `marketplace-plugin-adapter/crud-initial-load.png` | CRUD scaffold | platform-admin | — | n/a | ❌ invalid | Delete. |
| `marketplace-plugin-adapter/crud-after-create.png` | CRUD scaffold | platform-admin | — | n/a | ❌ invalid | Delete. |
| `marketplace-plugin-adapter/crud-list-with-test-row.png` | CRUD scaffold | platform-admin | — | n/a | ❌ invalid | Delete. |
| `marketplace-plugin-adapter/state-1-flow-has.png` | BFA mock — "FLOW-34 has no documented states" leak | fallback | — | n/a | ❌ invalid evidence | Classic BFA engineering leak (same pattern as FLOW-29 / FLOW-18). Delete. |
| `marketplace-plugin-adapter/state-1-adapter-registered.png` | `adapter-registered` | tenant-admin / platform-admin | F3 + derived states | Zapier card list | 🟡 partial | BusinessStateCard rendering; useful for state-by-state PNG until rebuild. |
| `marketplace-plugin-adapter/state-2-handshake-pending.png` | `handshake-pending` | tenant-admin | derived | Stripe Connect pending | 🟡 partial | Same. |
| `marketplace-plugin-adapter/state-3-plugin-connected.png` | `plugin-connected` | tenant-admin | derived | Zapier connected | 🟡 partial | Same. |
| `marketplace-plugin-adapter/state-4-payload-translating.png` | `payload-translating` | tenant-admin | derived | in-flight badge | 🟡 partial | Same. |
| `marketplace-plugin-adapter/state-5-payload-translated.png` | `payload-translated` | tenant-admin | derived | Zapier success | 🟡 partial | Same. |
| `marketplace-plugin-adapter/state-6-synced.png` | `synced` | tenant-admin | derived | Zapier synced | 🟡 partial | Same. |
| `marketplace-plugin-adapter/state-7-schema-mismatch.png` | `schema-mismatch` (error) | tenant-admin | derived | Stripe error badge | 🟡 partial | Error state correctly labelled. |
| `marketplace-plugin-adapter/state-8-rate-limited.png` | `rate-limited` (error) | tenant-admin | derived | Stripe rate-limit | 🟡 partial | Error state correctly labelled. |

**Next action for FLOW-34:** resolve spec-gap (F1 vs slug); build 4 missing surfaces (public catalog, admin installed dashboard, partner publisher, platform curation); rebuild `MarketplacePluginAdapterPage.tsx` as card-list-with-state-badge grammar; delete 6 CRUD / BFA-mock PNGs.

---

## Batch B · Grammar 2 Verdict Grid (RUN-56)

5 flows catalogued in bulk. 107 PNGs total. Common patterns:
- **Group A PNGs** (CRUD pre-state + scaffold defaults): `default.png`, `c-03-before.png`, `crud-initial-load.png`, `crud-after-create.png`, `crud-list-with-test-row.png` — **all ❌ invalid** across every flow. Delete on rebuild.
- **Group B PNGs** (BFA engineering-leak mocks): `01-..-06-..-N.png` patterns where the filename encodes SUCCESS_CRITERIA lines, DNA rules, or contract test IDs; plus `state-1-flow-has.png`. **All ❌ invalid — engineering text leaked as UI.** Delete.
- **Group C PNGs** (domain-state mocks): `state-1-<domain-state>.png` through `state-N-<domain-state>.png` — **🟡 partial, retain until rebuild** as reference for the BusinessStateCard rendering per state.

---

### FLOW-24 · ai-safety-moderation · 25 PNGs · Batch B.1

**Reference platform:** Discord AutoMod + Reddit modqueue (moderator queue, G2); Trust & Safety public report forms (anonymous report, G5 Kiosk).
Spec cites: F1 `docs/sessions/FLOW-24/FLOW-24-STEP-1-INVARIANTS.md`, F2 `UI-REFLECTION-STATE.md`, F3 `ROLE-ANALYSIS-BATCH-05.md`.
Examination: `docs/screen-examination/ai-safety-moderation-examination.md`. Primary finding: NEEDS_PURPOSE_BUILT_UI (P0) for public report form (missing surface) + moderator queue (Grammar 2).

Group A (5 PNGs): `default.png`, `c-03-before.png`, `crud-initial-load.png`, `crud-after-create.png`, `crud-list-with-test-row.png` → ❌ invalid CRUD, delete.
Group B (11 PNGs): `01..06-*.png` + `state-1-every-task.png`, `state-2-every-plan.png`, `state-3-no-step.png`, `state-4-no-step-2.png`, `state-5-all-steps.png`, `state-6-focus-areas.png` → ❌ invalid SUCCESS_CRITERIA leak, delete.
Group C (8 PNGs, state-mocks): `state-1-content-received.png`, `state-2-moderation-running.png`, `state-3-content-approved.png`, `state-4-content-flagged.png`, `state-5-human-review.png`, `state-6-content-rejected.png`, `state-7-consent-pending.png`, `state-8-consent-granted.png` → 🟡 partial, retain until rebuild.

Role PNGs: none currently — anonymous public report surface is the key missing capture.

---

### FLOW-25 · bfa-cross-flow-governance · 20 PNGs · Batch B.2

**Reference platform:** GitHub PR review (reviewers × files), Linear issue approval, Gerrit code review (Grammar 2 Verdict Grid).
Spec cites: F1 `FLOW-25-STEP-1-INVARIANTS.md`, F2 `UI-REFLECTION-STATE.md` (29 processes), F3 `ROLE-ANALYSIS-BATCH-05.md`.
Examination: `docs/screen-examination/bfa-cross-flow-governance-examination.md`. Primary finding: NEEDS_PURPOSE_BUILT_UI (P0) + NEEDS_LABEL_SANITISATION (P1) for BFA / CF-XX jargon.

Group A (5 PNGs): `default.png`, `c-03-before.png`, `crud-*` → ❌ invalid.
Group B (3 PNGs): `01-change-intake-parse-001-t375-...`, `02-blast-radius-traversal-001-t380-...`, `03-cross-tenant-guard-001-t387-...` → ❌ invalid T-number + task-id leak.
Group C (12 PNGs, state-mocks): `state-1-change-intake`, `state-1-rule-draft`, `state-2-blast-radius`, `state-2-change-ingested`, `state-3-arbitration-machine`, `state-3-blast-radius-computed`, `state-4-cross-tenant`, `state-4-rule-published`, `state-5-violation-detected`, `state-6-rule-enforced`, `state-7-cross-tenant-guard`, `state-8-rule-suspended` → 🟡 partial (but note: labels like "arbitration-machine", "blast-radius" still leak engineering terms).

---

### FLOW-27 · human-interaction-gate · 31 PNGs · Batch B.3

**Reference platform:** Intercom inbox + Linear triage + GitHub PR review + Gerrit (Grammar 2 queue).
Spec cites: F1 `FLOW-27-STEP-1-INVARIANTS.md`, F3 `ROLE-ANALYSIS-BATCH-06.md`.
Examination: `docs/screen-examination/human-interaction-gate-examination.md`. Primary finding: NEEDS_PURPOSE_BUILT_UI (P0) for review queue inbox + NEEDS_EMPTY_STATE (P1) for inbox-zero.

Group A (5 PNGs): `default.png`, `c-03-before.png`, `crud-*` → ❌ invalid.
Group B (18 PNGs): `01..09-dna-*.png` (9 DNA-rule engineering leaks) + `state-1-dna-record`, `state-2-dna-buildsearchfilter`, `state-3-dna-dataprocessresult`, `state-4-dna-microservicebase`, `state-5-dna-scope`, `state-6-dna-dynamiccontroller`, `state-7-dna-idempotency`, `state-8-dna-outbox`, `state-9-dna-cloudevents` → ❌ invalid DNA-rule leaks (duplicates).
Group C (8 PNGs, state-mocks): `state-1-request-pending`, `state-2-chain-sequential`, `state-3-chain-parallel`, `state-4-decision-approved`, `state-5-decision-rejected`, `state-6-timeout-escalated`, `state-7-task-delegated`, `state-8-request-queued` → 🟡 partial, retain until rebuild.

---

### FLOW-35 · meta-arbitration-engine · 13 PNGs · Batch B.4

**Reference platform:** GitHub PR review + Linear issue approval + Gerrit code review (Grammar 2 Verdict Grid).
Spec cites: F1 `FLOW-35-STEP-1-INVARIANTS.md` (17 processes), F3 `ROLE-ANALYSIS-BATCH-07.md`.
Examination: `docs/screen-examination/meta-arbitration-engine-examination.md`. Primary finding: NEEDS_PURPOSE_BUILT_UI (P0) + NEEDS_LABEL_SANITISATION (P1) for arbiter jargon.

Group A (5 PNGs): `default.png`, `c-03-before.png`, `crud-*` → ❌ invalid.
Group B (1 PNG): `state-1-flow-has.png` → ❌ invalid BFA engineering leak.
Group C (7 PNGs, state-mocks): `state-1-conflict-detected`, `state-2-arbiters-running`, `state-3-verdict-approved`, `state-4-verdict-needs-revision`, `state-5-verdict-rejected`, `state-6-override-applied`, `state-7-escalated` → 🟡 partial, retain until rebuild.

---

### FLOW-37 · design-system-governance (multi-stack porting) · 18 PNGs · Batch B.5

**Reference platform:** Flyway migration compatibility + SonarQube dependency audit + Percy diff matrix (Grammar 2 coupling audit + Grammar 3 porting dashboard). **NOT** Figma governance.
Spec cites: F1 `FLOW-37-STEP-1-INVARIANTS.md`, F2 `UI-REFLECTION-STATE.md` (11 processes), F3 `ROLE-ANALYSIS-BATCH-08.md`.
Examination: `docs/screen-examination/design-system-governance-examination.md`. Primary finding: NEEDS_PURPOSE_BUILT_UI (P0) — **CFI-05 orphaned screen** (`StackPortingScreen.tsx` exists at `client/src/components/stack-coupling/` but Page wrapper defaults to AdminCrudPanel).

Group A (5 PNGs): `default.png`, `c-03-before.png`, `crud-*` → ❌ invalid.
Group B (2 PNGs): `01-hybrid-genesis-prompt-001-stack-aware-ge`, `02-design-debt-analysis-001-design-complexi` → ❌ invalid task-id + service-name leak.
Group C (11 PNGs, state-mocks): `state-1-design-system`, `state-1-rule-draft`, `state-2-hybrid-genesis`, `state-2-validated`, `state-3-design-debt`, `state-3-published`, `state-4-violation-detected`, `state-5-enforced`, `state-6-conflict-detected`, `state-7-impact-critical`, `state-8-rule-deprecated` → 🟡 partial, retain until rebuild.

**CFI-05 Page-rewrite required:** apply FLOW-45 RUN-52 template — `?mock=` → BusinessStateCard, no-mock → PlatformOpsPage wrapping `StackPortingScreen` with populated coupling audit data.

---

## Batch C · Grammar 3 Card List with State Badge (RUN-57)

13 flows catalogued in bulk. ~223 PNGs total. Common 3-group pattern applies
(Group A CRUD scaffold, Group B engineering-leak mocks, Group C domain state-mocks).

Each flow has its own examination file under `docs/screen-examination/{slug}-examination.md`.

| Flow | Slug | PNGs | Ref platform | Primary finding | Page-rewrite lane |
|------|------|-----:|--------------|-----------------|-------------------|
| FLOW-06 | user-groups-communities | 23 | Facebook Groups + Discord server list + Slack workspace directory | 🟡 partial, multi-page split is good; card-grid default needs verification | Confirm card grid vs CRUD default |
| FLOW-07 | friend-request-social-feed | 31 | Twitter/X + LinkedIn feed + Facebook connections | NEEDS_EMPTY_STATE (P1) + likely NEEDS_PURPOSE_BUILT_UI for feed card format | Feed infinite-scroll + request cards with Accept/Decline |
| FLOW-08 | marketplace | 14 | Etsy + Shopify storefront + Amazon product grid | 🟡 partial, 5 pages split roles; card-grid format needs confirmation | Product grid + filter sidebar + per-role empty state |
| FLOW-10 | reviews-reputation | 10 | Yelp + Google Maps reviews + Amazon + Etsy shop reviews | NEEDS_EMPTY_STATE (P1) | Review card format + reply action + star-rating inline form |
| FLOW-12 | subscription-billing | 9 | **Stripe billing portal** + Paddle + Chargebee | verify no FAILED-as-anchor (P0) + NEEDS_EMPTY_STATE (P1) | Current plan card + invoice list with badges + Retry on FAILED |
| FLOW-16 | marketplace-payments | 6 | **Stripe Checkout** + Stripe Connect (escrow) + Stripe Dashboard (refunds) | NEEDS_PURPOSE_BUILT_UI checkout (P0 — Stripe two-column) + NEEDS_ROLE_BRANCH (P1, 10 roles vs 2 pages) | Left order summary + right payment form; single Pay-$X button |
| FLOW-17 | freelancer-marketplace | 6 | **Upwork + Fiverr**; milestone timeline = Stripe Connect | NEEDS_PURPOSE_BUILT_UI for public browse (`/gigs`, `/freelancers`) + dual-persona GigPostingPage | Gig card grid + freelancer profile cards + milestone timeline |
| FLOW-20 | ads-platform | 15 | **Google Ads dashboard** + Meta Ads Manager | NEEDS_ERROR_HANDLING (P0, "Failed to fetch" flagged in REPAIR-GUIDANCE) | Campaign card + per-campaign metric tiles + consent kiosk |
| FLOW-28 | blog-cms-modules | 13 | **Medium + Substack + Ghost** (public); Ghost admin (author) | NEEDS_SIDEBAR_HIDDEN_ON_ANONYMOUS (P1, uses RUN-49 G3 mechanism) + NEEDS_PURPOSE_BUILT_UI for reader + author list | Public reader zero chrome + admin card list with Draft/Published badges + WYSIWYG editor |
| FLOW-32 | sharable-flows-marketplace | 14 | **GitHub Marketplace + npm registry + VS Code extensions** | NEEDS_PURPOSE_BUILT_UI (P0) — card grid format for gallery | Template cards + detail pages with README/screenshots/changelog |
| FLOW-36 | feature-registry | 34 | **LaunchDarkly + Split.io + Unleash** | NEEDS_PURPOSE_BUILT_UI (P0) — **CFI-05 orphaned screen** (`FeatureMatrixScreen` exists, Page renders CRUD) | Page rewrite per FLOW-45 RUN-52 template |
| FLOW-40 | client-push | 14 | New Relic + OneSignal admin + network-monitoring tools | NEEDS_PURPOSE_BUILT_UI (P0) — **CFI-05 orphaned screen** (`ClientPushScreen` exists, Page renders CRUD) | Page rewrite per FLOW-45 RUN-52 template |
| FLOW-46 | platform-agent | 34 | **Intercom / Zendesk agent console** + Cursor / Claude Code terminal | NEEDS_PURPOSE_BUILT_UI (P0) — largest admin surface; card list for runs + dashboard for metrics + topology for flow-alongside | Agent runs list + metrics dashboard + flow-alongside viewer (reuses FLOW-29 ReactFlow) |

**Batch C PNG-group summary** (per-flow full row detail in each flow's examination file):
- **Group A (CRUD scaffold):** `default.png` + `c-03-before.png` + `crud-*.png` — ~40 PNGs across Batch C — all ❌ invalid, delete on rebuild.
- **Group B (engineering-leak BFA mocks):** `01..NN-<task-id>-<rule-name>.png` + `state-1-flow-has.png` — ~30 PNGs across Batch C — all ❌ invalid, delete.
- **Group C (domain state-mocks):** `state-1-<domain-state>.png` through `state-N-<domain-state>.png` — ~150 PNGs across Batch C — 🟡 partial, retain until rebuild ships.

**CFI-05 Page-rewrites in Batch C:** FLOW-36 (feature-registry) + FLOW-40 (client-push). Apply the `HistoryBootstrapPage` template from RUN-52: `?mock=` → BusinessStateCard, no-mock → PlatformOpsPage wrapping the purpose-built screen with populated seed data.

---

## Batch D · Grammar 5 Kiosk / Single Action (RUN-58)

7 flows catalogued. **174 PNGs total**. Consumer-facing onboarding / checkout
/ celebration / article reader surfaces.

| Flow | Slug | PNGs | Ref platform | Primary finding |
|------|------|-----:|--------------|-----------------|
| FLOW-01 | user-registration | 18 | **Airbnb + Linear + Notion signup** | 🟡 partial — 6-page architecture good; per-page rendering needs sweep |
| FLOW-02 | profile-enrichment | 15 | **Typeform + LinkedIn + Notion wizard** | 🟡 partial — 3-page split; step indicator + progress bar verification |
| FLOW-03 | event-management | 25 | **Eventbrite + Luma + Meetup** | 🟡 partial — wizard layout + right-panel live preview verification |
| FLOW-04 | event-attendance | 31 | **Eventbrite attendee list + Luma + Eventbrite check-in app** | **F1 spec gap** (says DPO capture; slug + PNGs + pages describe attendance). Likely 🟡 partial after slug interpretation |
| FLOW-05 | completion-gamification | 29 | **Duolingo + Khan Academy + Codecademy** | 🟡 partial — 4-page split good; celebratory animation + streak counter verification |
| FLOW-09 | transactional-event-participation | 32 | **Eventbrite checkout + Airbnb booking + Ticketmaster + Stripe Refund** | NEEDS_PURPOSE_BUILT_UI (P0) — REPAIR-GUIDANCE flagged "booking event-organiser shows not found". **F1 spec gap** (says RAG pattern extraction; slug describes ticketing) |
| FLOW-22 | cms-publishing | 24 | **Medium + Substack + Ghost** (public); **Ghost admin + WordPress** (editorial) | NEEDS_SIDEBAR_HIDDEN_ON_ANONYMOUS (P1) + NEEDS_PURPOSE_BUILT_UI for reader + editorial list |

**Batch D 3-group pattern** applies (CRUD scaffold / engineering-leak / domain state-mocks) — per-flow detail in each examination record.

**F1 spec-gap consolidation** (flagged for Luba's separate review):
- FLOW-04 event-attendance: F1 says DPO capture; slug + pages + PNGs say event attendance
- FLOW-09 transactional-event-participation: F1 says RAG pattern extraction; slug + 5 pages + PNGs say ticketing
- FLOW-34 marketplace-plugin-adapter: F1 says AI Agent Orchestration; slug + pages + PNGs say plugin marketplace

All three flows followed their semantic slug per Rule 16. Either F1 docs are
stale (written before flow scope changed) or the flows were repurposed without
F1 update. **Recommend Luba resolve these three spec misalignments before any
code-fix sweep touches these flows.**

---

## Batch E · Grammar 1 Progress Strip (RUN-59)

6 flows catalogued. **104 PNGs total**. Bootstrap / lifecycle / ETL surfaces
with phase-chip + log-tail + retry-per-step pattern.

| Flow | Slug | PNGs | Ref platform | Primary finding |
|------|------|-----:|--------------|-----------------|
| FLOW-00 | bundle-activation | 33 | **Vercel + Docker + Render + Railway + CircleCI + GitHub Actions** | NEEDS_PURPOSE_BUILT_UI (P0) + no F1 gap (no STEP-1-INVARIANTS file) |
| FLOW-11 | schema-registry-dag | 14 | **Confluent Schema Registry + Apollo Studio + GraphQL Inspector** | 🟡 partial — 3-page compound (G1 + G4) needs verification |
| FLOW-14 | etl-data-integration | 24 | **Airbyte + Fivetran + Stitch** | NEEDS_PURPOSE_BUILT_UI (P0) — pipeline-run list with phase strip + row-counts |
| FLOW-19 | durable-sagas-compliance | 6 | **Temporal UI + Cadence + AWS Step Functions** | NEEDS_PURPOSE_BUILT_UI (P0) saga timeline + NEEDS_ROLE_BRANCH for tenant-user GDPR slice |
| FLOW-33 | system-initiation-bootstrap | 13 | **Vercel deploy + Docker setup + Stripe onboarding** | NEEDS_PURPOSE_BUILT_UI (P0) — Progress Strip canonical `Cold → Seeding → Indices → Warm → Self-verification` |
| FLOW-47 | module-lifecycle | 14 | **npm version history + Docker image tags + Homebrew formula updates** | NEEDS_PURPOSE_BUILT_UI (P0) + no F1 gap |

**Batch E F1 gaps flagged for Luba:**
- FLOW-00 bundle-activation: no STEP-1-INVARIANTS.md (session files exist but no invariants)
- FLOW-47 module-lifecycle: no STEP-1-INVARIANTS.md (intent derived from F2 UI-REFLECTION)

**Batch E 3-group pattern applies** — per-flow detail in each examination file.

---

## Batch F · Grammar 6 Dashboard (RUN-60)

5 flows catalogued. **76 PNGs total**. Analytics + tenant lifecycle + design
governance + RAG quality + OSS training admin surfaces.

| Flow | Slug | PNGs | Ref platform | Primary finding |
|------|------|-----:|--------------|-----------------|
| FLOW-13 | data-warehouse-analytics | 24 | **QuickBooks + Mixpanel + Looker + Amplitude** | NEEDS_PURPOSE_BUILT_UI (P0) dashboard (tiles + time-series + recent) |
| FLOW-30 | tenant-lifecycle-manager | 14 | **Stripe Connect + Vercel teams + Linear workspaces admin** | NEEDS_PURPOSE_BUILT_UI (P0) compound G6+G3+G7 |
| FLOW-31 | design-intelligence-engine | 12 | **LangSmith + W&B + Figma design-system analytics + Storybook** | NEEDS_PURPOSE_BUILT_UI (P0) dashboard + token-dependency topology |
| FLOW-38 | rag-quality-feedback | 13 | **LangSmith + Humanloop + PromptLayer** | NEEDS_PURPOSE_BUILT_UI (P0) — **CFI-05 orphaned screen** (`RagQualityScreen` exists, Page renders CRUD) |
| FLOW-39 | oss-curriculum | 13 | **LangSmith curriculum + W&B experiments + Humanloop training dashboards** (NOT Khan Academy) | NEEDS_PURPOSE_BUILT_UI (P0) — **CFI-05 orphaned screen** + DELETE `SAMPLE_COURSES` wrong-direction data |

**Important corrections confirmed in Batch F:**
- FLOW-39 `OssCurriculumPage.tsx` currently renders a `SAMPLE_COURSES` array ("Flow Design Fundamentals", "Prompt Engineering") as a **student-facing course catalog**. This is **wrong product direction** — the flow is a DPO training corpus dashboard for platform-admin, not a Khan-Academy-style curriculum. **Delete `SAMPLE_COURSES` + rewrite to use orphaned `OssCurriculumScreen` + `ShadowRunStatusCard` + `CurriculumTierBadge` components.**

**CFI-05 Page-rewrites in Batch F:** FLOW-38 + FLOW-39. Apply FLOW-45 RUN-52 template.

**FLOW-20 ads-platform:** already catalogued in Batch C (compound G3+G6 grammar — card list with per-campaign metrics embedded).

---

## Batch G · Grammar 7 Settings Tabs (RUN-61)

4 flows catalogued. **51 PNGs total**. Workspace / tenant / form builder /
i18n admin surfaces.

| Flow | Slug | PNGs | Ref platform | Primary finding |
|------|------|-----:|--------------|-----------------|
| FLOW-15 | saas-multi-tenancy | 6 | **Linear + Notion teamspace + Vercel team + GitHub + Stripe** | NEEDS_PURPOSE_BUILT_UI (P0) settings tabs layout |
| FLOW-21 | dynamic-forms-workflows | 25 | **Typeform + Google Forms + Jotform + Airtable Forms** | NEEDS_PURPOSE_BUILT_UI (P0) three-column builder + kiosk respondent |
| FLOW-23 | form-builder-templates | 6 | **Typeform + Webflow + Notion + Canva template galleries** | 🟡 partial — template gallery layout verification |
| FLOW-48 | admin-i18n + i18n-translation | 14 | **Crowdin + Lokalise + Phrase** | NEEDS_PURPOSE_BUILT_UI (P0) + no F1 gap (missing STEP-1-INVARIANTS) |

**Batch G F1 gap flagged:** FLOW-48 has no STEP-1-INVARIANTS.md. Intent
derived from design-review doc + existing pages.

---

## Batch H · External adapters + orphan directory sweep (RUN-62)

### FLOW-41/42/43/44 — external vendor-SDK adapters (no XIIGen UI)

**Verified clean:** no `canva-adapter/`, `miro-adapter/`, `webflow-adapter/`, `framer-adapter/` directories in `docs/e2e-snapshots/`. No mis-captured PNG evidence to delete.

Per `SPEC-LOCATION-MAP-ADDENDUM-FLOW36-45.md` + confirmed by each flow's own `UI-REFLECTION-STATE.md`:
- FLOW-41 canva-adapter — INTERNAL_ONLY
- FLOW-42 miro-adapter — INTERNAL_ONLY
- FLOW-43 webflow-adapter — INTERNAL_ONLY
- FLOW-44 framer-adapter — INTERNAL_ONLY

No XIIGen React surface. No examination work. Gate documented in SK-540 §6.

### Orphan admin-console directories (not in primary Batch A-G taxonomy)

These are engine-internal admin flows with their own pages + routes but
outside the 5-grammar taxonomy used for consumer-facing flows.

| Slug | PNGs | Likely grammar | Ref platform | Status |
|------|-----:|----------------|--------------|--------|
| `adapter-ci-cd-bridge/` | 0 | G1 Progress Strip | GitHub Actions + CircleCI | Clean — pending first examination + PNG capture |
| `rag-quality-graph/` | 13 | G4 Topology + G6 Dashboard | LangSmith trace graph + LangSmith dashboard | Needs purpose-built rebuild |
| `meta-flow-orchestration/` | 13 | G4 Topology Canvas | Temporal UI + Airflow DAG | Needs purpose-built rebuild |
| `ai-self-modification/` | 13 | G4 Topology + G2 Verdict Grid | proprietary AI-ops + LangSmith | **CRITICAL** — HIG gate must enforce |
| `cycle-chain-extension/` | 14 | G1 Progress Strip + G3 Card List | Flyway migration runner | Needs purpose-built rebuild |

All 5 orphan dirs follow the same 3-group PNG pattern (CRUD scaffold / BFA engineering-leak / domain state-mocks). Examination record at `docs/screen-examination/external-adapters-examination.md`.

### UNKNOWN/ directory — 6 test-evidence PNGs

| PNG | Test evidence | Relocate to |
|-----|---------------|-------------|
| `banner-disappears-after-keys-provisioned-before.png` | KeyStatusBanner + KeyProvisioningForm regression | `c6-role-coverage/` or delete (RUN-49 G1 superseded) |
| `chat-02-submit-shows-super-judge-verdict-before.png` | FLOW-46 platform-agent chat | `platform-agent/` |
| `chat-02-submit-shows-super-judge-verdict-after.png` | Same | `platform-agent/` |
| `provisioning-form-appears-when-configure-before.png` | KeyProvisioningForm | `c6-role-coverage/` or delete |
| `r-04-after.png` + `r-04-before.png` | Unclear — possibly RUN-04 | inspect and relocate or delete |

---

## Batch A-H docs sweep: **COMPLETE**

**48 flows catalogued** across 7 canonical grammars + external-adapter no-UI
classification + orphan-dir sweep. **~980 fleet PNGs indexed** with
provenance tags.

**Commits:**
- RUN-51 scaffold (`18942987`)
- RUN-52 FLOW-45 close + CFI-05 refinement (`541b82df`)
- RUN-53 Batch A.1 FLOW-18 (`01b92a12`)
- RUN-54 Batch A.2 FLOW-26 (`b562aba3`)
- RUN-55 Batch A.3 FLOW-34 (`c67e6863`)
- RUN-56 Batch B (`2e13a117`) — 5 flows
- RUN-57 Batch C (`7f24c872`) — 13 flows
- RUN-58 Batch D (`0ebd7ffb`) — 7 flows
- RUN-59 Batch E (`b967ce9f`) — 6 flows
- RUN-60 Batch F (`48ec6706`) — 5 flows
- RUN-61 Batch G (`7ab818e1`) — 4 flows
- RUN-62 Batch H (this commit)

To be populated in subsequent runs of ~5-8 flows per batch. Each row follows
the same schema and verdict grammar. Nothing fabricated: rows are authored by
opening the PNG + the session folder + the page file, not by inferring.

**Batch assignment (per `MARKET-REFERENCE-CATALOG.md` grammar grouping, post-addendum corrections):**

| Batch | Grammar | Flows | Rationale |
|-------|---------|-------|-----------|
| 0 | CFI-05 resolution | FLOW-45 closed RUN-52; FLOW-36/37/38/39/40 Page rewrites bundled with their per-batch examination (Page default → purpose-built screen, not AdminCrudPanel) | Originally planned as route-wiring sweep; refined to per-flow Page rewrite bundled with per-batch examination |
| A | Grammar 4 — Topology Canvas | FLOW-18, FLOW-26, FLOW-34 | Follow FLOW-29 recipe (FLOW-29 already reference-implemented) |
| B | Grammar 2 — Verdict Grid | FLOW-24 (mod), FLOW-25, FLOW-27, FLOW-35, FLOW-37 | Moderation / arbitration / review queues |
| C | Grammar 3 — Card List with State Badge | FLOW-06, FLOW-07, FLOW-08, FLOW-10, FLOW-12, FLOW-16, FLOW-17, FLOW-20, FLOW-28, FLOW-32, FLOW-36, FLOW-40, FLOW-46 | Marketplace / feed / billing list / registry |
| D | Grammar 5 — Kiosk / Single Action | FLOW-01, FLOW-02, FLOW-03, FLOW-04, FLOW-05, FLOW-09, FLOW-22, FLOW-24 (report) | Signup / checkout / celebration / article |
| E | Grammar 1 — Progress Strip | FLOW-00, FLOW-11, FLOW-14, FLOW-19, FLOW-33, FLOW-45, FLOW-47 | Bootstrap / lifecycle / ETL / history-bootstrap |
| F | Grammar 6 — Dashboard | FLOW-13, FLOW-20 (admin), FLOW-30, FLOW-31, FLOW-38, FLOW-39 | Analytics + curriculum / quality / tenant console |
| G | Grammar 7 — Settings Tabs | FLOW-15, FLOW-21, FLOW-23, FLOW-48 | Multi-tenancy / forms / i18n admin |
| H | External adapters — **no UI to design** | FLOW-41 Canva, FLOW-42 Miro, FLOW-43 Webflow, FLOW-44 Framer | Skip; delete mis-captured PNGs |
| misc | UNKNOWN + cycle-chain-extension | `UNKNOWN/`, `cycle-chain-extension/` | To classify |

**Directory → PNG count (for planning load):**

| Flow | Directory | PNGs | Status |
|------|-----------|-----:|--------|
| FLOW-00 | `bundle-activation/` | 25 | ⏭ pending |
| FLOW-01 | `user-registration/` | 18 | ⏭ pending |
| FLOW-02 | `profile-enrichment/` | 15 | ⏭ pending |
| FLOW-03 | `event-management/` | 25 | ⏭ pending |
| FLOW-04 | `event-attendance/` | 31 | ⏭ pending |
| FLOW-05 | `completion-gamification/` | 29 | ⏭ pending |
| FLOW-06 | `user-groups-communities/` | 23 | ⏭ pending |
| FLOW-07 | `friend-request-social-feed/` | 31 | ⏭ pending |
| FLOW-08 | `marketplace/` | 14 | ⏭ pending |
| FLOW-09 | `transactional-event-participation/` | 32 | ⏭ pending |
| FLOW-10 | `reviews-reputation/` | 10 | ⏭ pending |
| FLOW-11 | `schema-registry-dag/` | 14 | ⏭ pending |
| FLOW-12 | `subscription-billing/` | 9 | ⏭ pending |
| FLOW-13 | `data-warehouse-analytics/` | 16 | ⏭ pending |
| FLOW-14 | `etl-data-integration/` | 16 | ⏭ pending |
| FLOW-15 | `saas-multi-tenancy/` | 6 | ⏭ pending |
| FLOW-16 | `marketplace-payments/` | 6 | ⏭ pending |
| FLOW-17 | `freelancer-marketplace/` | 6 | ⏭ pending |
| FLOW-18 | `visual-flow-engine/` | 6 | ⏭ pending |
| FLOW-19 | `durable-sagas-compliance/` | 6 | ⏭ pending |
| FLOW-20 | `ads-platform/` | 6 | ⏭ pending |
| FLOW-21 | `dynamic-forms-workflows/` | 17 | ⏭ pending |
| FLOW-22 | `cms-publishing/` | 16 | ⏭ pending |
| FLOW-23 | `form-builder-templates/` | 6 | ⏭ pending |
| FLOW-24 | `ai-safety-moderation/` | 17 | ⏭ pending |
| FLOW-25 | `bfa-cross-flow-governance/` | 12 | ⏭ pending |
| FLOW-26 | `meta-flow-engine/` | 23 | ⏭ pending |
| FLOW-27 | `human-interaction-gate/` | 23 | ⏭ pending |
| FLOW-28 | `blog-cms-modules/` | 6 | ⏭ pending |
| FLOW-29 | `adaptive-rag-deep-research/` | 6 | ✅ catalogued |
| FLOW-30 | `tenant-lifecycle-manager/` | 6 | ⏭ pending |
| FLOW-31 | `design-intelligence-engine/` | 6 | ⏭ pending |
| FLOW-32 | `sharable-flows-marketplace/` | 6 | ⏭ pending |
| FLOW-33 | `system-initiation-bootstrap/` | 6 | ⏭ pending |
| FLOW-34 | `marketplace-plugin-adapter/` | 6 | ⏭ pending |
| FLOW-35 | `meta-arbitration-engine/` | 6 | ⏭ pending |
| FLOW-36 | `feature-registry/` | 27 | ⏭ pending |
| FLOW-37 | `design-system-governance/` | 10 | ⏭ pending |
| FLOW-38 | `rag-quality-feedback/` | 6 | ⏭ pending |
| FLOW-39 | `oss-curriculum/` | 6 | ⏭ pending |
| FLOW-40 | `client-push/` | 6 | ⏭ pending |
| FLOW-41 | `adapter-ci-cd-bridge/` | — | (post-RUN-43 scaffold; `c6-role-coverage` only) |
| FLOW-42 | `rag-quality-graph/` | 7 | ⏭ pending |
| FLOW-43 | `meta-flow-orchestration/` | 7 | ⏭ pending |
| FLOW-44 | `ai-self-modification/` | 7 | ⏭ pending |
| FLOW-46 | `platform-agent/` | 27 | ⏭ pending |
| FLOW-47 | `module-lifecycle/` | 6 | ⏭ pending |
| FLOW-48 | `admin-i18n/` + `i18n-translation/` | 14 | ⏭ pending |
| (misc) | `UNKNOWN/` | 6 | ⏭ pending — unmapped / to-classify |

---

## How rows are authored (recipe — lifted from Repair Guidance Part 6)

For every flow, run this sequence exactly. The run produces one PNG examination
record and one or more inventory rows.

**Step A — Read the spec (5 minutes, no code).**
1. Consult `SPEC-LOCATION-INDEX.md` to find the primary source for this flow.
2. Read that file; extract the one-sentence "this allows [WHO] to [DO WHAT]".
3. List all roles that open the screen.
4. Identify the primary action verb.

**Step B — Read the states (3 minutes, no code).**
5. Read `UI-REFLECTION-STATE.md` (engine flows) or the deep-research doc (business flows).
6. List the states (`empty`, `loading`, `populated`, `error`, `success`).
7. Note per-role variants.

**Step C — Examine the PNG (3 minutes, no code).**
8. Open the PNG.
9. Apply the 4 classification questions from Part 2 Step 3.
10. Note the highest-severity finding.

**Step D — Write the examination record.**
11. File: `docs/screen-examination/{slug}-examination.md`.
12. Contents: one-sentence spec, state list, classification, highest finding, ref platform.

**Step E — Resolve the highest-severity finding (one task only).**
13. Decision tree in Repair Guidance Part 3 picks the fix.

**Step F — Capture PNG evidence.**
14. Run the flow's Playwright spec with `?mock=` populated and role param.
15. Gate: PNG must show human-readable content + at least one non-default state.

**Step G — Update this inventory.**
16. Add / update the row(s) under the flow's section.

No step is "infer what the flow should do." The source docs already say it. This
catalog just makes that statement accessible per-PNG.

---

## Verdict grammar (mandatory across all rows)

- ✅ **match** — PNG depicts the spec's state accurately, role-correct, no engineering leak, passes the 4 UI/UX skill families
- 🟡 **partial** — correct structure but at least one finding (e.g. label sanitisation needed, missing empty state copy)
- ❌ **contradicts** — PNG shows a state the spec does not permit (CRUD on ENGINE_INTERNAL, error as normal state, role leak, engineering text in UI)
- ⏭ **no spec exists** — rare; flagged so the spec gap is filed, not guessed around

Every ❌ row must name *what's visible vs what's spec'd* in one sentence.
