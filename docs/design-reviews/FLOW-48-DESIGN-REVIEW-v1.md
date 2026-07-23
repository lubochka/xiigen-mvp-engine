# FLOW-48 Design Review v1 — i18n-translation

## Date: 2026-04-19
## Reviewer: Claude Code (pensive-tereshkova-baf347 worktree)
## Scope: FLOW-48 planning-stage artifacts (pre-implementation)
## Branch: claude/pensive-tereshkova-baf347 (review branch); target branch: claude/vigorous-margulis
## Protocols applied: XIIGEN-DESIGN-REVIEW-PROTOCOL v1.3 (scoped to one flow) + XIIGEN-CODE-REVIEW-PROTOCOL v1.6

---

## Section 1 — Executive summary

**Verdict: APPROVED_WITH_CONCERNS.** The FLOW-48 planning bundle is unusually complete for a pre-implementation state: 17-item P1 inventory, full P2/P3/P4 gap analysis, P5 UI specs, P9 edge-case table, P10 edge-case server specs, 691-line implementation plan, 8 DR triples, 8-record arbiter NDJSON (including the FC-32 mandatory scope_isolation record), 10 event schemas, topology JSON+MD companion, 7-rule BFA file (CF-810..CF-816), IMPL-STATE.json with phase shape matching the plan, and a pre-implementation Teach-QA forecast (33 gap patterns). The work is structurally honest and traceable. **Top 3 concerns:** (1) `fixtures/design-reasoning/i18n-translation-design-decisions.json` does not pass the PHASE-0 gate script as written — it is an object with `"decisions": [...]` rather than a bare array, and the records are missing `curriculumTier`, `appliesTo`, `connectionType`, `knowledgeScope`; (2) the plan references `server/src/bootstrap/history-seeds/i18n-translation-corpus.json` but the actual file on disk is named `i18n-translation-design-corpus.json` (fleet naming convention); (3) a filename divergence between P5 spec (`client/src/pages/admin-i18n/AdminI18nPage.tsx`) and the plan (`client/src/pages/admin/AdminI18nPage.tsx`) will fail P13 PNG linking. **Top 3 strengths:** (a) iron-rule chain CF-810..CF-816 is traceable across design → plan → BFA file → arbiter NDJSON → corpus → topology with consistent descriptions; (b) CF-812 absolute-200 contract is enforced at every layer — design, plan test list, arbiter, BFA rule, corpus teaching, topology, and P5 UI fallback indicator; (c) the scope_isolation arbiter is present as the last NDJSON record per FC-32 convention, and the plan threads the cross-flow `AccountCreatedPayload` extension into user-registration-contracts.ts explicitly.

---

## Section 2 — Design Review v1.3 signals (applied to FLOW-48 only)

| Signal | Verdict | Evidence | Reason |
|--------|---------|----------|--------|
| S1 Business topology file exists | PASS | `contracts/topologies/i18n-translation.topology.json` (142 lines, 6 nodes, 11 edges, all nodes declare archetype) + `.md` companion (54 lines) | Topology JSON is populated, nodes have archetype field, edges carry `event` + `condition`, and cross-flow touches are named (FLOW-01). |
| S2 Design bundle populated (SK-537) | PARTIAL | `fixtures/design-reasoning/i18n-translation-design-decisions.json` (8 records), `fixtures/arbiters/i18n-translation-arbiters.bulk.ndjson` (8 records). `fixtures/rag-patterns/i18n-translation-*` = 0 files; `fixtures/contracts/t66[5-9].contract.json` + `t670.contract.json` = 0 files. | Design-reasoning and arbiters present; RAG patterns + per-task contracts are explicitly deferred to PHASE-5 Teach-QA per plan §PHASE-5. Acceptable at plan stage, not at integration gate. |
| S3 UI completeness verdict | N/A | `docs/flow-coverage/i18n-translation/P2-ui-gap-analysis.md` — all 17 rows MISSING (pre-implementation baseline) | Expected pre-impl. P2 is a correctness-grounded gap record, not a failure. |
| S4 Visual proof — PNGs in SNAPSHOTS | N/A | `docs/e2e-snapshots/i18n-translation/*.png` = 0 files; `docs/topology-snapshots/i18n-translation-topology.png` = 0 files | Pre-implementation flow. PNGs produced by PHASE-4 (12 PNGs) and PHASE-6 (TVQ-09). P5 spec enumerates 12 target PNGs explicitly (P4-snapshot-gap-analysis.md lines 58–73). |
| S5 IMPL-STATE claims reconciled with code | PASS | `FLOW-48-IMPL-STATE.json` line 17 `"chain_review_verdict": "READY_FOR_EXECUTION"`, all 12 phases in `NOT_STARTED` status; no false claims of completion | State file truthfully reflects pre-implementation zero-ness. |
| S6 Architect Discipline (Gate 0i) | PASS | See Section 3 Gate 0i row | Plan cites inputs (FLOW-48-DESIGN-R2, PLAN-P1-P14, pattern references), re-quotes Q4 task map (T665–T670), matches deliverable shape (6 services + integration + client + topology). |
| S7 Inputs-absorbed at authoring time | PASS | FLOW-48-DESIGN-SIMULATION-R1.md lines 17–26 "INVENTORY CHECK" lists 8 documents read before design began; FLOW-48-IMPLEMENTATION-PLAN-v1.md lines 33–57 "DESIGN REFERENCES" names 4 authoritative sources + 6 pattern references | Explicit "read before authoring" section with verifiable file paths. |
| S8 Shape-match between plan claim and deliverable | PASS | IMPL-STATE `phases` object has 12 keys matching plan §PHASE ORDER 12 phases (PHASE-0, 1A..1F, 2, 3, 4, 5, 6); expected_tests sum = 99 across phases aligns with plan per-phase test-count math | Plan contract → state contract → deliverable expectation matches element-by-element. |
| S9 PNG evidence for tenant-facing claims | PASS | Plan §PHASE-4 lines 502–516 enumerates all 12 Playwright tests with per-test PNG filenames; plan §PHASE-6 lines 572–584 enumerates 9 TVQ tests with TVQ-09 screenshot target path | Every tenant-facing claim cites a specific PNG path. |
| S10 MD companions for JSON deliverables | PASS | `fixtures/arbiters/i18n-translation-arbiters.bulk.md` (24 lines), `contracts/topologies/i18n-translation.topology.md` (54 lines), `fixtures/design-reasoning/i18n-translation-design-decisions.md` (33 lines) all exist alongside JSON/NDJSON counterparts | Rule 31 compliance across all shipped structured fixtures. |
| S11 User-order preserved in plan structure | PASS | Plan §PHASE ORDER lines 72–85 matches the natural ordering of user asks (corpus → services → integration → UI → E2E → teaching → topology); no silent reordering observed | User never issued a conflicting order. |

**Aggregate per-flow verdict (per v1.3 §6): PARTIAL** — S2 rates PARTIAL because pre-Teach-QA fixtures (RAG patterns, per-task contracts) are not yet authored; all other in-scope signals PASS. N/A counts do not block.

---

## Section 3 — Code Review v1.6 gates (applied to FLOW-48-IMPLEMENTATION-PLAN-v1.md)

### Tier 1 — Structural pre-checks

| Gate | Verdict | Evidence |
|------|---------|----------|
| 0a Plan self-contained | PASS | Every referenced file is either in-repo or explicitly identified as design source at `<WORKSPACE>\Documents\xiigen\Missing gaps\FLOW-48-DESIGN-R2.md` (plan line 37); pattern references all have absolute paths (plan lines 44–57). |
| 0b Skill citations not embedded as code | PASS | Zero `import { ... } from "SK-..."` in the plan. SK references would be in gate commands; none present. |
| 0c Semantic slug paths (Rule 16) | PASS | Every file path uses `i18n-translation`. `flow-48` occurs only in grep command strings or self-check lines (4 hits across session docs — all non-path). |
| 0d Scope matches user ask | PASS | User asked for "design the multi language support of the site"; plan covers: client switcher, server pipeline, marketplace delta, user preferences, fallback, per-module override — all stated requirements. No silent widening. |
| 0e Q4 done contract specified | PASS | Plan lines 660–674 "DONE-DEFINITION" lists 9 criteria with concrete targets (item 7: "Server jest ≥ 11,134 passing, 0 failures"; item 6: "Smallest PNG > 1KB"). |
| 0f Minimal wiring preference | PASS | 6 services over 12 phases with per-task scoped test counts (8/12/7/6/6/6 for 1A-1F). Task expansion justified by archetype diversity (VALIDATION × 2, ORCHESTRATION, TRANSACTION, DATA_PIPELINE × 2). |
| 0g Visual proof for tenant-facing claims | PASS | PHASE-4 lines 502–516 lists 12 PNG paths; PHASE-6 lines 572–584 lists TVQ-09 path. Playwright assertion-before-screenshot pattern enforced (plan lines 497–499). |
| 0h Iron rules honored | PASS | CF-810..CF-816 appear in BFA file, arbiters NDJSON, topology JSON `ironRules[]`, corpus teaching. No rule override proposed in the plan. |
| 0i Architect habits discipline | PASS | Three-step doc-first loop evident: Step 1 scan (30-habit catalog, no BLOCK hits); Step 2 docs (design references block present); Step 3 classify (Issue Inventory per-section, plan line 678 self-containment checklist). N-A8/A9/A10 sub-guards pass. |
| 0j User-order preserved | PASS | User's 6 goal elements (G1–G6) per P1 inventory lines 58–65 mapped into plan phases; order preserved in §PHASE ORDER. |
| 0k Corrections threaded explicitly | PASS | Plan references "DESIGN-R2 Decision 4 / C-2" at line 173 (cross-flow AccountCreatedPayload — a prior correction from R2 review); no untraced corrections observed. |
| 0l Source-layer tags on citations | CONCERN | Plan cites "per DESIGN-R2 Decision N" (source: prior plan version) and "from DESIGN-SIMULATION §Section 7" (source: session doc) — these are clear in context, but citations are not tagged with `[docs:…]`/`[prior-plan:…]`/`[codebase:…]` labels per v1.6 Gate 0l literal prescription. Low practical impact because citations are unambiguous. |

**Tier 1 aggregate: APPROVED_WITH_CONCERNS** (Gate 0l CONCERN; no BLOCK).

### Tier 2 — Correctness checks (FC-14, 15, 16, 17 first, then FC-1..FC-13)

| Gate | Verdict | Evidence |
|------|---------|----------|
| FC-14 Goal delivery completeness | PASS | P1-business-logic-inventory.md lines 57–65 maps G1–G6 to inventory items 1–17; plan Phase list covers all 6 goals (G1 → PHASE-3 switcher; G2 → PHASE-1F + PHASE-3 settings page; G3 → PHASE-1A + PHASE-3 admin page; G4 → PHASE-1B pipeline; G5 → PHASE-1C MASTER CLS; G6 → PHASE-1B CF-812 + PHASE-3 fallback indicator). |
| FC-15 Design artifact populated (SK-537) | CONCERN | DR triples JSON exists but is shaped wrong vs plan gate script (see Finding F-1 + F-2). Arbiters NDJSON populated. Topology populated. RAG patterns (4 files expected per DESIGN-SIMULATION §Section 9) not yet written — planned for PHASE-5. |
| FC-16 Architect habits at authoring time | PASS | Plan Self-containment checklist (lines 679–691) enumerates 11 authoring-time self-checks; design doc SECTION 11 completion gate (lines 751–765) enumerates 12 checks. |
| FC-17 Response Construction Protocol compliance | PASS | Plan section order matches user-ordered decomposition; prior-correction thread shown at line 173 (C-2 review finding); source layers identifiable in context. |
| FC-1 Goal coverage (content) | PASS | Each goal has at least one phase with a verification step (see FC-14 evidence). |
| FC-2 Evidence grounding | PASS | P2 (lines 27–44), P3 (lines 18–29), P4 (lines 19–24) all show live recon command + output as grep-grounded evidence. |
| FC-3 Architectural coherence | PASS | No contradictions between DESIGN-SIMULATION-R1, plan, and topology. Service archetypes match across all three documents. |
| FC-4 Pipeline contract | PASS | Each phase's output stage produces artifacts the next phase consumes (PHASE-0 contracts → PHASE-1A–1F services → PHASE-2 integration → PHASE-3 client → PHASE-4 E2E → PHASE-5 Teach-QA → PHASE-6 topology). |
| FC-5 Naming convention compliance | PASS | Semantic slug `i18n-translation` used throughout. FLOW-48 numeric slug appears only in session docs (allowed by Rule 16). |
| FC-6 Iron rules not silently overridden | PASS | Plan iron rule list matches BFA file, arbiters, topology. No override attempted. |
| FC-7 DNA compliance | PASS | Plan explicitly cites DNA-5 (ALS tenantId), DNA-7 (SETNX at ORDER 1), DNA-8 (storeDocument BEFORE enqueue) in each relevant phase's Iron Rules block. |
| FC-8 Test gate integrity | PASS | Every phase gate uses concrete numbers (PHASE-1A: "8 passing, 0 failed"; PHASE-4: "12 PNGs, smallest > 1KB"; DONE-DEFINITION item 7: "≥ 11,134 passing"). |
| FC-9 Issue inventory present | PASS | DESIGN-SIMULATION-R1 lines 771–776 and TEACH-QA-R0 lines 229–235 both have Issue Inventory sections with FIXED / DEFERRED+CARRY-FORWARD / EXCEPTION statuses. |
| FC-10 Cross-document propagation | PASS | Plan is single v1; no stale copies; IMPL-STATE references plan_file correctly. |
| FC-11 Overview-detail match | PASS | Each phase's one-line goal matches its test list and file-produced list. |
| FC-12 Principles compliance | PASS | DNA-1 (Record<string,unknown>), DNA-5, DNA-8, CF-POLICY-01 honored in all code blocks cited in the plan. |
| FC-13 Documentation artifacts per Rule 17 | CONCERN | DR triples JSON present but shape non-compliant (F-1/F-2). Topology JSON + MD: ✅. Arbiters NDJSON + MD: ✅. Per-task contracts (fixtures/contracts/t66X.contract.json): deferred to PHASE-5 (plan acknowledges this). |

**Tier 2 aggregate: APPROVED_WITH_CONCERNS** (FC-15, FC-13 CONCERN; no BLOCK).

---

## Section 4 — Findings (F-1..F-12)

### F-1 — DR triples JSON shape does not match PHASE-0 gate script
- **Severity:** HIGH
- **Affected artifact:** `fixtures/design-reasoning/i18n-translation-design-decisions.json`
- **Description:** The PHASE-0 gate script at `FLOW-48-IMPLEMENTATION-PLAN-v1.md` lines 144–153 loads the file as a bare array: `d = json.load(...); assert isinstance(d, list) and len(d) >= 8`. The actual file on disk is a dict with a `"decisions"` key wrapping the array. The assertion would fail on line 1 of the load, blocking PHASE-0 commit.
- **Recommended fix:** Either (a) flatten the JSON file to a top-level array of 8 records, or (b) update the plan gate script to read `d['decisions']`. Option (a) is simpler and matches the plan's implicit assumption.
- **Status:** OPEN

### F-2 — DR records missing `curriculumTier`, `appliesTo`, `connectionType`, `knowledgeScope`
- **Severity:** HIGH
- **Affected artifact:** `fixtures/design-reasoning/i18n-translation-design-decisions.json` all 8 records
- **Description:** Plan lines 127–131 require per-record: `curriculumTier: int`, `qualityScore: float`, `appliesTo: JSON array with ≥ 2 flows`, `connectionType: "FLOW_SCOPED"`, `knowledgeScope: "GLOBAL"`, plus "all 17 required fields present (see LIBRARY-4 Phase 1 gate)". Current records have 10 fields: `tripleId, flowId, decisionTag, qualityScore, trigger, chosen, rejected, rationale, iron, source`. Missing fields block the gate script at line 148–152. The design doc §Section 8 DR-48-1..DR-48-8 DO specify `curriculumTier` and `applies_to` — they were simply not carried into the fixture.
- **Recommended fix:** Augment each of the 8 records with the 4 missing fields. Values for `curriculumTier` and `appliesTo` should be copied from DESIGN-SIMULATION-R1 lines 656–720. All records should set `connectionType: "FLOW_SCOPED"` and `knowledgeScope: "GLOBAL"` per plan line 129.
- **Status:** OPEN

### F-3 — Corpus file name divergence between plan and disk
- **Severity:** MEDIUM
- **Affected artifacts:** `docs/sessions/FLOW-48/FLOW-48-IMPLEMENTATION-PLAN-v1.md` lines 95, 115, 138, 620; `docs/sessions/FLOW-48/FLOW-48-IMPL-STATE.json` line 26; `docs/sessions/FLOW-48/SESSION-TEACH-A0.md` line 84
- **Description:** The plan, IMPL-STATE, and SESSION-TEACH docs all reference `server/src/bootstrap/history-seeds/i18n-translation-corpus.json`. The actual file on disk is `server/src/bootstrap/history-seeds/i18n-translation-design-corpus.json` — matching the fleet-wide naming convention (every other flow follows `{slug}-design-corpus.json`). PHASE-0 gate `ls server/src/bootstrap/history-seeds/i18n-translation-corpus.json` on plan line 138 will fail.
- **Recommended fix:** Update the 4 plan references + the IMPL-STATE entry + the SESSION-TEACH reference to use `i18n-translation-design-corpus.json`. Do NOT rename the existing file — the fleet convention wins.
- **Status:** OPEN

### F-4 — AdminI18nPage path inconsistency between P5 spec and plan
- **Severity:** MEDIUM
- **Affected artifacts:** `docs/flow-coverage/i18n-translation/P5-ui-specs.md` line 83; `docs/sessions/FLOW-48/FLOW-48-IMPLEMENTATION-PLAN-v1.md` lines 434, 631; `docs/sessions/FLOW-48/FLOW-48-IMPL-STATE.json` line 158
- **Description:** P5 spec says `client/src/pages/admin-i18n/AdminI18nPage.tsx`. Plan + IMPL-STATE say `client/src/pages/admin/AdminI18nPage.tsx`. Both are non-existent pre-implementation, so no disk clash, but PHASE-3 will create one and PHASE-4 Playwright will target one — if they diverge the screenshot assertion fails.
- **Recommended fix:** Align to a single path. Suggested: `client/src/pages/admin-i18n/AdminI18nPage.tsx` (follows the existing pages/{slug}/ pattern used by 48 other flows per `client/src/pages/` listing).
- **Status:** OPEN

### F-5 — Topology MD companion has internally inconsistent entry-point count
- **Severity:** LOW
- **Affected artifact:** `contracts/topologies/i18n-translation.topology.md` line 16
- **Description:** Line 16 reads "The topology has 2 entry points (AccountCreated, TranslationRequested, UserPreferencesRequested) and 5 terminal states". Three entries are named, not two. Count is wrong.
- **Recommended fix:** Change "2 entry points" to "3 entry points".
- **Status:** OPEN

### F-6 — Event schemas are skeletal — only `tenantId`, `eventId`, `emittedAt` — missing event-specific payload fields
- **Severity:** MEDIUM
- **Affected artifacts:** `fixtures/event-schemas/i18n-translation/*.schema.json` (all 10 files)
- **Description:** Each schema has identical required fields: `tenantId`, `eventId`, `emittedAt`, with `additionalProperties: false`. No event-specific payload is declared. For example, `translation-complete.schema.json` should carry `moduleId`, `locale`, `contentHash` per DESIGN-SIMULATION-R1 line 202 event signature; `preferences-updated.schema.json` should carry `userId, locale, userOverride`; `marketplace-cache-miss.schema.json` should carry `moduleId, locale`. With `additionalProperties: false`, real events would fail schema validation.
- **Recommended fix:** For each of the 10 schema files, declare the payload fields per their emit-site in DESIGN-SIMULATION-R1 §Section 7 tables. Add per-event `properties` and extend `required`. Rename `additionalProperties: false` to `true` if the event is extensible.
- **Status:** OPEN

### F-7 — Seven CF rules in BFA file, but `allRules[ruleId].appliesTo` in topology JSON doesn't include `CF-810` applying to ALL writers
- **Severity:** LOW
- **Affected artifact:** `contracts/topologies/i18n-translation.topology.json` line 119
- **Description:** CF-810 is the scope-isolation rule for `every F1523.storeRef() call` — which applies to T665, T667, T668, T670 (all services that write). Topology JSON line 119 declares `appliesTo: ["T668", "T667"]` only. T665 writes `xiigen-translation-requests`; T670 writes `xiigen-user-preferences`. They also need CF-810 coverage.
- **Recommended fix:** Update topology JSON line 119 to `"appliesTo": ["T665", "T667", "T668", "T670"]`. Arbiter NDJSON line 1 already correctly covers all of T665..T670.
- **Status:** OPEN

### F-8 — Plan test baseline target (11,134) vs done-definition target (≥ 11,134) not reconciled with current passing count
- **Severity:** LOW
- **Affected artifact:** `docs/sessions/FLOW-48/FLOW-48-IMPLEMENTATION-PLAN-v1.md` lines 13, 672; `FLOW-48-IMPL-STATE.json` line 227
- **Description:** CLAUDE.md states "Test baseline: ≥ 10,100 (branch claude/vigorous-margulis, 2026-04-14)". The plan writes "≥ 11,134 passing" as the session-start baseline and done-criterion 7 ("Server jest ≥ 11,134 passing"). The gap 11,134 − 10,100 = 1,034 tests suggests other work has landed on `claude/vigorous-margulis` since the April 14 snapshot. The number is plausible but unverified — IMPL-STATE `baseline_at_session_start` is `null`.
- **Recommended fix:** Before PHASE-0 starts, run `npx jest --passWithNoTests` on the target branch and populate `test_counts.baseline_at_session_start`. If the actual baseline differs from 11,134, update done-criterion 7 to use the measured value + the expected 99 additions.
- **Status:** OPEN

### F-9 — 47-page `useTranslation` wiring claim not verified against current `client/src/pages/` structure
- **Severity:** LOW
- **Affected artifacts:** `docs/flow-coverage/i18n-translation/P5-ui-specs.md` line 107, 110; `docs/sessions/FLOW-48/FLOW-48-IMPLEMENTATION-PLAN-v1.md` line 438; `FLOW-48-IMPL-STATE.json` line 161
- **Description:** Plan claims "47 pages (one per tenant-facing module slug)". Live listing of `client/src/pages/` shows 63 entries — 15 top-level `*Page.tsx` files + 48 slug directories. The 47 count may be "slug directories minus engine/infra ones" but the boundary isn't documented. PHASE-3 gate at plan line 477 (`ls client/src/locales/en/*.json | wc -l # Expected: ≥ 47`) also depends on this count.
- **Recommended fix:** In PHASE-3 of the plan, insert a reconnaissance step: list `client/src/pages/` directories, exclude engine/internal routes, produce the definitive tenant-facing page count. Update the ×47 multiplier to the actual count if it differs.
- **Status:** OPEN

### F-10 — No explicit treatment of RTL support (Hebrew, Arabic) despite Hebrew being the first non-English locale in examples
- **Severity:** LOW
- **Affected artifacts:** `docs/sessions/FLOW-48/FLOW-48-IMPLEMENTATION-PLAN-v1.md` (no `dir=` or RTL reference); `docs/sessions/FLOW-48/FLOW-48-DESIGN-SIMULATION-R1.md` line 776 "RTL support for Hebrew | EXCEPTION — out of R1 scope"
- **Description:** Design doc Issue Inventory acknowledges RTL as EXCEPTION. Plan PHASE-3 uses Hebrew (`he`) as the primary non-English example in tests, and PHASE-4 Playwright spec 02 is `02a-en.png + 02b-he.png`. Design-side exception is legitimate but the plan's test list does not declare "Hebrew UI will render LTR in R1" anywhere, which will surprise Luba at visual sign-off (done-criterion 8).
- **Recommended fix:** Add a one-line note to plan PHASE-4 §Locale-aware dual screenshot rule: "Hebrew renders LTR in R1 per DESIGN-SIMULATION-R1 Issue Inventory — RTL (`dir="rtl"`) promoted to FLOW-49 R1".
- **Status:** OPEN

### F-11 — Teach-QA Phase 2 fixture list includes `account-created-extended.schema.json` but it is NOT in the actual event-schemas directory
- **Severity:** MEDIUM
- **Affected artifacts:** `docs/sessions/FLOW-48/FLOW-48-TEACH-QA-R0.md` line 178; `fixtures/event-schemas/i18n-translation/` (10 files, none named `account-created-extended.*`)
- **Description:** Teach-QA R0 Phase 2 enumerates as expected deliverables: `account-created-extended.schema.json, translation-resolved.schema.json, preferences-updated.schema.json, master-cache-complete.schema.json`. The cross-flow AccountCreated extension is the whole reason for C-2 / DR-48-6. Yet the event schemas dir already shipped 10 files, none covering the extended AccountCreated payload. If the cross-flow payload is contract material, it belongs as a schema.
- **Recommended fix:** Either (a) add `fixtures/event-schemas/i18n-translation/account-created-extended.schema.json` declaring the extended payload (`userId, email, tenantId, status, acceptLanguage?`), or (b) update Teach-QA R0 Phase 2 list to drop that filename and document that the AccountCreated contract lives in FLOW-01's schema directory. Option (a) is defensible because the extension is driven by FLOW-48.
- **Status:** OPEN

### F-12 — Plan claims PHASE-2 topology path `contracts/topologies/i18n-translation.topology.json` but Teach-QA R0 lists topology at `fixtures/flow-definitions/i18n-translation-t666.topology.json`
- **Severity:** LOW
- **Affected artifacts:** `docs/sessions/FLOW-48/FLOW-48-IMPLEMENTATION-PLAN-v1.md` line 389, 652; `docs/sessions/FLOW-48/FLOW-48-TEACH-QA-R0.md` line 176; `docs/sessions/FLOW-48/FLOW-48-IMPL-STATE.json` line 138
- **Description:** Plan §PHASE-2 produces `contracts/topologies/i18n-translation.topology.json` (already exists). Teach-QA R0 Phase 2 lists a *second* topology at `fixtures/flow-definitions/i18n-translation-t666.topology.json` (n1..n8 cycle shape). Rule 17 documentation gate explicitly calls for `fixtures/flow-definitions/{slug}-t{NNN}.topology.json` for the cycle topology. The two files have different semantics (pipeline vs cycle) and both are legitimate — but only one is currently present.
- **Recommended fix:** No fix to planning required — acknowledge in review that PHASE-5 Teach-QA will add the cycle-shape topology alongside the existing pipeline-shape topology. Consider adding a clarifying note to the plan's PHASE-5 list distinguishing the two topology files.
- **Status:** OPEN

---

## Section 5 — Findings by artifact

```
docs/flow-coverage/i18n-translation/P1-business-logic-inventory.md — clean
docs/flow-coverage/i18n-translation/P2-ui-gap-analysis.md — clean
docs/flow-coverage/i18n-translation/P3-automation-gap-analysis.md — clean
docs/flow-coverage/i18n-translation/P4-snapshot-gap-analysis.md — clean
docs/flow-coverage/i18n-translation/P5-ui-specs.md — 1 finding (F-4)
docs/flow-coverage/i18n-translation/P9-edge-cases.md — clean
docs/flow-coverage/i18n-translation/P10-server-specs.md — clean
docs/sessions/FLOW-48/FLOW-48-DESIGN-SIMULATION-R1.md — clean
docs/sessions/FLOW-48/FLOW-48-TEACH-QA-R0.md — 2 findings (F-11, F-12)
docs/sessions/FLOW-48/FLOW-48-IMPLEMENTATION-PLAN-v1.md — 5 findings (F-3, F-4, F-8, F-9, F-10)
docs/sessions/FLOW-48/FLOW-48-IMPL-STATE.json — 3 findings (F-3, F-4, F-8)
docs/sessions/FLOW-48/SESSION-TEACH-A0.md — 1 finding (F-3)
fixtures/design-reasoning/i18n-translation-design-decisions.json — 2 findings (F-1, F-2)
fixtures/design-reasoning/i18n-translation-design-decisions.md — clean
fixtures/arbiters/i18n-translation-arbiters.bulk.ndjson — clean
fixtures/arbiters/i18n-translation-arbiters.bulk.md — clean
fixtures/event-schemas/i18n-translation/marketplace-cache-miss.schema.json — 1 finding (F-6)
fixtures/event-schemas/i18n-translation/master-cache-complete.schema.json — 1 finding (F-6)
fixtures/event-schemas/i18n-translation/policy-check-inline.schema.json — 1 finding (F-6)
fixtures/event-schemas/i18n-translation/policy-denied.schema.json — 1 finding (F-6)
fixtures/event-schemas/i18n-translation/preferences-requested.schema.json — 1 finding (F-6)
fixtures/event-schemas/i18n-translation/preferences-updated.schema.json — 1 finding (F-6)
fixtures/event-schemas/i18n-translation/ref-stored.schema.json — 1 finding (F-6)
fixtures/event-schemas/i18n-translation/request-registered.schema.json — 1 finding (F-6)
fixtures/event-schemas/i18n-translation/resolution-requested.schema.json — 1 finding (F-6)
fixtures/event-schemas/i18n-translation/translation-complete.schema.json — 1 finding (F-6)
contracts/topologies/i18n-translation.topology.json — 1 finding (F-7)
contracts/topologies/i18n-translation.topology.md — 1 finding (F-5)
server/src/engine-contracts/i18n-translation-bfa-rules.ts — clean
server/src/bootstrap/history-seeds/i18n-translation-design-corpus.json — clean (file exists; naming divergence is tracked under F-3 against the callers, not the file)
```

---

## Section 6 — Final verdict + next-step recommendation

**Final verdict: APPROVED_WITH_CONCERNS.**

Count summary: **0 BLOCKER, 2 HIGH, 4 MEDIUM, 6 LOW** (12 findings total).

Zero BLOCKER means execution can begin. The two HIGH findings (F-1, F-2) both affect the *same* JSON file and will fail the PHASE-0 gate script on first run — they must be fixed before PHASE-0 commits. F-3 (corpus filename) will fail `ls` at line 138 of PHASE-0 gate and should be addressed in the same pre-PHASE-0 sweep. F-4 (AdminI18nPage path) and F-6 (event schemas) matter before PHASE-3 and PHASE-2 respectively but do not block PHASE-0. F-11 and F-12 are Teach-QA forecast inconsistencies — fix before PHASE-5 runs.

**Recommended next steps (ordered):**
1. Fix F-1 + F-2 + F-3 in a single pre-execution commit (touches: DR JSON shape + field augmentation; 3 docs and IMPL-STATE updated to the `design-corpus` filename).
2. Fix F-4 (align AdminI18nPage path across P5, plan, IMPL-STATE) — 1 commit, 3 files.
3. Fix F-5 + F-7 topology MD/JSON consistency — 1 commit, 2 files.
4. Measure actual test baseline on `claude/vigorous-margulis`; update F-8 accordingly (1 commit, IMPL-STATE).
5. Execute PHASE-0 of the plan.
6. During PHASE-2, revisit F-6 event schemas and populate real payloads.
7. Before PHASE-5 Teach-QA, reconcile F-11 and F-12 (decide whether to add `account-created-extended.schema.json` and whether to author the cycle topology alongside the pipeline topology).

⛔ STOP — review produced. Awaiting direction on which findings to act on.
