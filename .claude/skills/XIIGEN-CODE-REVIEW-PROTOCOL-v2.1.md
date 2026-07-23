# XIIGEN Code Review Protocol
## Version: 2.1
## Scope: Per-plan review for Claude Code execution plans, FLOW implementation plans,
##         MVP plans, REMEDIATION plans, gap-closure plans, architectural fix plans
## Status: Current — supersedes v2.0
## Applies: any plan document submitted for reviewer verdict before Claude Code execution

---

## What changed in v2.1

- **FC-22 added — Definition of done includes protocol status + Guard 14.**
  Any implementation plan submitted for review must declare that its definition of done
  includes all three protocol gate fields (portabilityStatus, authStatus, tenantCertTier)
  and must satisfy Guard 14 before claiming TIER_C eligibility.

  **FC-22 has three sub-checks:**

  FC-22a (portability): plan includes Phase G or an explicit "Phase G N/A — EXTERNAL_REPO
  adapter" declaration. Plan's "done" state cannot leave portabilityStatus = TBD. A plan
  that ends at Phase F without declaring Phase G has an incomplete definition of done for
  any distributable flow.

  FC-22b (auth): plan includes Phase H or an explicit "Phase H N/A — no HTTP controllers"
  declaration. AUTH_DEFERRED is acceptable (auth.module.ts absent) — the plan must name
  it explicitly as the deferred path. A plan with HTTP controllers and no Phase H ships
  unguarded endpoints by design.

  FC-22c (certification + Guard 14): plan includes Phase I or an explicit "Phase I N/A —
  NOT_DISTRIBUTABLE" declaration. If the plan targets TIER_C or TIER_D, Guard 14 must be
  verified in the plan: auth infrastructure score 4/4 (auth.module.ts + scope-enrichment
  + APP_GUARD + role-strings.ts). A plan claiming TIER_C eligibility without Guard 14
  evidence will be blocked at TIER_B at Phase I execution time.

  Corpus origin: IMPL-STATE.json across 49 flows shows portabilityStatus = TBD,
  authStatus = TBD, tenantCertTier = NONE on all 49 flows. Root cause: no prior
  implementation plan version had Phase G, H, or I in its scope. FC-22 installs the
  gate that catches this omission at plan-review time before Phase A runs.

- **Tier 2 verdict aggregation** updated to include FC-22 (FC-22a/b/c).
- **Verdict format** updated: FC-22 appears as a single row with three sub-check columns.
- **Versioning** updated.

---

## What changed in v2.0

- **FC-7c added — Detection before scope claim.** Any plan claiming "N flows affected"
  must show detection command output before fix steps. Detection output must match the
  claimed scope. Claims that exceed detected scope are BLOCK. Universal claims ("all flows,"
  "full fleet") require detection against 100% of flows, not a sample.
  Corpus origin: G-05 from gap mapping R3 — plans claimed full-fleet scope with detection
  run on 3-5 flows. Remediation sessions that ran on 49 flows had evidence from 6.

- **FC-7d added — New rows trigger arbiter re-run.** When a plan version adds new
  per-flow rows (FLOW-40..48 added to a plan originally written for FLOW-01..39),
  the full arbiter battery runs on all new rows before the plan version is approved.
  A plan version that adds rows without re-review is unapproved for those rows.
  Adding rows to an existing plan is a new plan for those rows.
  Corpus origin: G-07 and G-11 from gap mapping R3 — FLOW-40..48 went unreviewed
  for 10 plan versions. The full arbiter battery was never run on the 9 most important
  new flows in the fleet.

- **Tier 2 verdict aggregation** updated to include FC-7c and FC-7d.
- **Verdict format** updated: FC-7c and FC-7d appear as separate rows.

---

## What changed in v1.9

- **FC-7 split into FC-7a and FC-7b.** FC-7a preserves existing behavior (GENERATION
  plans: generated code specifications honor DNA-1..DNA-9). FC-7b is new: REMEDIATION
  plans must verify every proposed solution pattern against the four critical DNA rules
  (DNA-5 tenant scoping, DNA-7 fabric-first, DNA-8 outbox-before-queue, DNA-3
  DataProcessResult) with IMPLEMENTATION or TEST evidence. DESIGN_DOC evidence
  (RECONCILIATION-STATE, FIX-PLAN documents) does not satisfy FC-7b.
  Corpus origin: module-separation fix plan v2.0–v4.9 passed all custom arbiter passes
  (F1-F4) while proposing "remove ClsService, add explicit tenantId" for 15 flows with
  no IMPLEMENTATION evidence that the proposed pattern was DNA-5 compliant. DNA violations
  were found at implementation review — after the fact, at scale.
- **Scope line extended** to include REMEDIATION plans, gap-closure plans, and
  architectural fix plans. FC-7 scope was previously implicit (code-generation only).
  Remediation plans that propose changes to existing code are now in scope.
- **Tier 2 verdict aggregation** updated to include FC-7b.
- **Verdict format** updated: FC-7a and FC-7b appear as separate rows.
- **Versioning** updated.

---

## What changed in v1.8

- **Gate 0g business-intent sub-check added:** for any plan step creating or modifying a React page, the plan must cite all four of the following before the first implementation task: (1) examination record read and primary finding named, (2) user intent quoted from FLOW-XX-STEP-1-INVARIANTS.md, (3) primary role and source file named, (4) grammar type declared (G1–G7). A plan that passes the SK-539 Phase 7 sub-check (Phase 7 planned) but fails the business-intent sub-check has planned the compliance audit without planning what the page is for.
- **Tier 1 Tier 2 verdict aggregation** updated to reflect Gate 0g now having two sub-checks.
- **Cross-references** updated for new document versions.
- **Versioning** updated.

---

## 1. What this protocol reviews

This protocol reviews **plans** — documents that instruct Claude Code (or equivalent executor) to perform work. The review produces a verdict: APPROVED, APPROVED_WITH_CONCERNS, or REJECTED. A REJECTED plan does not execute.

The protocol does not review:
- Code itself — that's execution-layer review at Claude Code's PR-review or Gate F stage
- Fleet-wide design state — that's `XIIGEN-DESIGN-REVIEW-PROTOCOL`
- Live flow runs — that's QA session type

The protocol reviews the plan as an artifact: its coverage, its evidence grounding, its correctness relative to governance, its construction shape. A plan that looks complete but was produced against a misread brief, or that drops a stated goal, or that inherits unverified claims, must be caught here — before the executor runs it and produces wrong output at scale.

---

## 2. When this protocol runs

Triggered by:
- A plan document is produced in a PLANNING session and presented at ⛔ STOP
- A plan document is uploaded by the user for review
- A plan version is bumped and requires re-review

Reviewer runs all gates in order. Early-gate failures block later gates.

---

## 3. Gate ordering and precedence

Gates run in two tiers.

**Tier 1 — Structural pre-checks.** Gates 0a through 0m. These catch failures in how the plan was constructed and whether it addresses the user's actual ask. Any BLOCK at Tier 1 rejects the plan before Tier 2 runs.

**Tier 2 — Correctness checks.** FC-1 through FC-18. These catch failures in the plan's content: goal coverage, architectural coherence, codebase evidence, principles compliance, pipeline contract, and related dimensions.

Tier 1 runs first because a plan that passes correctness review for the wrong plan is worse than no review at all. If the plan's construction is wrong, correcting its content is work against a moving target.

---

## 4. Tier 1 — Structural pre-check gates

### Gate 0a — Plan is self-contained

Every claim, file reference, and decision referenced in the plan must be present in the plan document, a referenced session file, or an explicitly-linked source. A plan that says "per the prior decision" without naming which decision fails Gate 0a.

Verdict: PASS | FAIL. On FAIL, specify which references are unresolved.

### Gate 0b — Plan does not embed skill citations as production dependencies

SK-XXX references in the plan appear only inside gate-check command strings (telling Claude Code to run the grep), not as production code dependencies. A plan instructing Claude Code to `import { something } from "SK-443"` fails Gate 0b — skills are governance, not code.

Verdict: PASS | FAIL.

### Gate 0c — Plan respects file-path semantic slugs (Rule 16)

Every file path in the plan uses the semantic slug from SK-430's domain name table. A plan referencing `server/src/engine/flows/flow-15/` fails if the canonical slug is `saas-multi-tenancy`.

Verdict: PASS | FAIL.

### Gate 0d — Plan's scope matches the user's ask

Plan scope is equal to or explicitly narrower than the user's stated ask. Narrowing requires declared justification in the plan document. Widening without declared justification fails.

Verdict: PASS | FAIL.

### Gate 0e — Plan's contract (Q4 output contract) is specified

The plan declares what "done" looks like with enough specificity that Claude Code can verify completion without asking the user. "All tests pass" is too vague. "Server tsc: 0 errors, 0 warnings. Server jest: 10,617 passed, 0 failures. Client build: success. PNG count in docs/e2e-snapshots/{slug}/ ≥ 4 per FLOW, populated state as primary PNG" is specific.

Verdict: PASS | FAIL.

### Gate 0f — Minimal-wiring preference

If the work touches artifacts with existing design (fixtures, contracts, documented decisions), the plan uses the minimal wiring path — not rebuild, not redesign. Plans exceeding 5 tasks for wiring work are rejected unless the task expansion is justified by verified complexity beyond wiring.

Verdict: PASS | FAIL.

### Gate 0g — Visual proof present for tenant-facing claims *(updated v1.8)*

Any plan step that claims to deliver a tenant-visible feature includes Playwright PNG evidence — either citing existing PNG paths in `docs/e2e-snapshots/{slug}/` or specifying Playwright spec changes that will produce PNGs. Server-only steps are explicitly flagged as server-only with justification.

**SK-539 Phase 7 sub-check:** For any plan step that produces a React page, the plan must also declare Phase 7 (UI/UX Compliance) as a step following the React pages phase. A plan that adds `*.tsx` files without a corresponding Phase 7 step fails this sub-check. Gate 0g only verifies that Phase 7 is *planned*; Gate 0m verifies the role questions; the business-intent sub-check below verifies what the page is actually for.

**Business-intent sub-check (NEW v1.8):** For any plan step creating or modifying a React page in `client/src/pages/`, the plan must cite all four of the following before the first implementation task:

1. **Examination record** — plan states that `docs/screen-examination/{slug}-examination.md` was read (if it exists) and names its primary finding and classification. A plan that ignores an existing examination record fails this sub-check. If no examination record exists, state "no examination record — proceeding from spec files."

2. **User intent source** — plan quotes or closely paraphrases the `user_intent` sentence from `docs/sessions/FLOW-XX/FLOW-XX-STEP-1-INVARIANTS.md`. A plan that describes page functionality without citing what the user is trying to accomplish fails.

3. **Role-visibility source** — plan names the primary role and its source file (`docs/design-reviews/ROLE-ANALYSIS-BATCH-NN.md`). A plan that says "admin view" without citation fails.

4. **Grammar declaration** — plan declares which grammar type the page implements (G1 PROGRESS_STRIP · G2 VERDICT_GRID · G3 CARD_LIST · G4 TOPOLOGY_CANVAS · G5 KIOSK · G6 DASHBOARD · G7 SETTINGS_TABS). A plan that describes a page without declaring a grammar type fails.

**Relationship between sub-checks:** a plan that passes the Phase 7 sub-check (Phase 7 planned) but fails the business-intent sub-check has planned the compliance audit without planning what the page is for. Both sub-checks must pass. The business-intent sub-check installs Vocabulary B (who uses this page and what do they want?) before Vocabulary A (can they access it and is the route correct?).

**CFI-12 halt (FLOW-04, FLOW-09, FLOW-34):** if the plan includes React page work for these flows, Gate 0g fails automatically until a Luba resolution on the F1 spec gap is on record. These flows have stale F1 documents where the stated user_intent contradicts the slug, pages, and PNGs. A plan cannot declare a valid grammar type for a page whose user intent is disputed.

Verdict: PASS | FAIL. On FAIL, specify which tenant-facing step lacks visual proof, which React pages phase lacks a Phase 7 step, or which of the four business-intent elements is missing.

### Gate 0h — Iron rule and BFA governance honored

The plan does not propose overriding locked iron rules or BFA governance without explicit Luba approval stated in the plan document with timestamp.

Verdict: PASS | FAIL.

### Gate 0i — Architect Habits Discipline (SK-538 v1.2.0)

Reviewer runs the three-step doc-first loop on the plan document:

**Step 1 — Scan.** Read the plan against the 30-habit catalog (7 positive, 4 neutral-positive, 19 negative). Note every habit hit with name and bracketed ID.

**Step 2 — Dig in docs FIRST.** For every habit hit suggesting a correctness-propagating concern, search `docs/`, `historyRag/`, `DECISIONS-LOCKED.md`, prior FLOW session files, `SESSION-LOAD-PLAN`, and codebase grep — with conceptual vocabulary, not only literal strings.

**Step 3 — Classify.**
- Class-a (correctness-propagating, BLOCK after documented Step 2 returns nothing)
- Class-b (architectural, CONCERN — plan may ship after author responds in writing)
- Class-c (style, not raised)

Three sub-checks that must clear before Gate 0i passes:
- **N-A8 sub-guard:** no inherited-verdict citations used without re-running the originating command
- **N-A9 sub-guard:** plan cites its inputs — what the plan read to produce itself (session brief, attached files, prior plan versions)
- **N-A10 sub-guard:** plan's own "done" contract re-quoted from session Q4, deliverable shape matches element-by-element

**Cluster-aware scan sub-check:** if a single plan exhibits three or more habit hits from the same cluster (e.g., N-A5, N-A6, N-A8 all appearing together — the unverified-claims cluster), the plan is flagged regardless of individual-habit classification. Clustered hits indicate systemic construction problems.

Verdict: PASS | PASS_WITH_CONCERNS | BLOCK.

### Gate 0j — Plan addresses user's items in user's order

This gate enforces Response Construction Protocol Step 1 (instruction decomposition) at plan-authoring time. The reviewer checks whether the plan document was constructed per the user's stated order.

**Procedure:**

1. Locate the user's originating request in the plan's provenance (session brief, prior turn, or linked source document). Quote it in full.
2. Parse the request into enumerated items I1, I2, I3... as Protocol Step 1 would.
3. For each item, locate where in the plan it is addressed. Mark: ADDRESSED (with plan section reference), DEFERRED (with declared reason), or ABSENT.
4. Any ABSENT item without a declared reason fails the gate.
5. Items addressed out of user's stated order pass if the plan document declares the reordering explicitly; fail if the reordering is silent.

**This gate catches the N-A16 (cutting user order) failure mode as it appears in plan documents.**

Worked example (chata_data_2):
- User request: *"Ok, Prepare a claude code plan what needs to be done with every document (check the flows docs session flow files ON EACH FLOW) to achieve these for EACH FLOW"*
- Decomposition: I1 = plan what needs to be done per flow; I2 = check session files on each flow; I3 = achieve Tracks A-E for each flow
- Plan produced: `Execution order: Track A → Track B and Track C pre-phase (parallel) → Track C per-flow → Track D → Track E`
- Gate 0j verdict: BLOCK. Per-flow-first (user's order) silently inverted to per-track-first (plan's order) with no declaration.

Verdict: PASS | BLOCK.

### Gate 0k — Corrections from prior rounds threaded explicitly into plan text

This gate enforces Response Construction Protocol Step 3 (prior-correction thread) at plan-authoring time. The reviewer checks whether user corrections that shaped the plan appear as explicit references in the plan document.

**Procedure:**

1. Identify the user's prior corrections in the session that preceded this plan version.
2. For each correction, locate in the plan document a specific reference or structural element that addresses it.
3. Corrections with no plan-text reference fail the gate.
4. Corrections referenced generically ("we addressed feedback") without specific plan-element linkage fail the gate.

**This gate catches the N-A18 (prior context not threaded) failure mode as it appears in plan documents.**

Verdict: PASS | PASS_WITH_CONCERNS | BLOCK.

### Gate 0l — Plan's citations have source-layer tags

This gate enforces Response Construction Protocol Step 5 (source-layer check) at plan-authoring time. The reviewer checks whether every citation in the plan document is tagged by source provenance.

**Procedure:**

1. Identify every quoted phrase, file reference, and external citation in the plan.
2. For each, verify the source layer is declared: `[codebase:file:line]`, `[docs:path]`, `[user-earlier-turn:timestamp]`, `[user-attached:filename]`, `[state:field]`, `[prior-plan:version]`.
3. Citations without source-layer tags fail the gate.
4. Citations whose weight depends on source layer (user direction vs prior plan vs codebase) must have the tag adjacent to the claim.

**This gate catches the N-A20 (source-layer confusion) failure mode as it appears in plan documents.**

Verdict: PASS | FAIL.

---

### Gate 0m — UI/UX compliance for React page plans

This gate enforces SK-539 (UI/UX Compliance) and FC-18 at plan-authoring time. It applies to any plan that includes steps producing React pages (`*.tsx` files in `client/src/pages/`).

Gate 0m is the last Tier 1 structural pre-check. It verifies the plan's *intent* is UX-correct — not that the implementation is done (that is Phase 7 at execution time), but that the plan as written does not structurally commit to a UX violation before execution begins.

**Procedure:**

**Step 1 — Identify all pages planned.** Scan the plan for steps that create or modify `*.tsx` files, add `<Route>` entries to `App.tsx`, or produce new user-visible surfaces. List as P1, P2, P3...

**Step 2 — Role question check.** For each planned page, verify the plan answers all four role questions from SK-539 §1:

```
Q1 ROLE_TIER:   declared? [PLATFORM_ENG | PLATFORM_OPS | TENANT_OPS | TENANT_CONSUMER | PUBLIC]
Q2 ROLE_GATE:   primary role named from SK-539 §3 taxonomy?
Q3 ROUTE_GUARD: declared route matches declared role tier?
                /admin/... → PLATFORM_ENG or PLATFORM_OPS only
                /settings/ → TENANT_CONSUMER or PUBLIC (user self-service)
                /<path>    → TENANT_CONSUMER or PUBLIC
Q4 VISIBILITY:  visibility scope declared from SK-539 §4 registry?
```

Missing answers on any of Q1–Q4 → BLOCK.

**Step 3 — Run the structural BLOCK check matrix.** For each planned page, the reviewer checks these conditions against the plan text:

| Check | BLOCK condition |
|---|---|
| UX-06b | Plan specifies PNG capture without `?mock=` param on TENANT_CONSUMER or PUBLIC page |
| UX-16 | Plan's declared route for the page does not match the declared role tier |
| UX-17 | Plan describes showing raw HTTP error codes to tenant or public users |
| UX-18 | Plan renders same UI to all roles where role-conditional rendering is required |
| UX-19 | Plan routes a user-rights page (consent, privacy, language preference) under `/admin/` |
| UX-20 | Plan publishes a form with a `publicUrl` field but adds no `/forms/:schemaId` route |
| UX-22 | Plan adds a page for a no-bypass flow (FLOW-24, 37, 44) without a non-dismissable no-bypass badge |
| UX-23 | Plan adds a manual action button to a fully automated gate (5-arbiter, safety, design deployment) |
| UX-24 | Plan's human-in-the-loop page spec omits any of the 4 mandatory fields (item, requester, SLA, decision form) |
| UX-25 | Plan marks a page `TENANT_FACING` but backs it with generic admin CRUD (`/api/dynamic/xiigen-*`) |
| UX-26 | Plan adds OAuth integration without specifying both pending-state and return-state screens |
| UX-27 | Plan's human override form has no mandatory written justification field |
| UX-29 | Plan's consent-pending state has no approve/deny affordance |
| UX-30 | Plan adds a TENANT_CONSUMER or PUBLIC page without declaring a grammar type (G1–G7); or declares a grammar type but the page specification describes a generic CRUD table backed by `/api/dynamic/xiigen-*` |

**Missing page registry check:** if the plan implements or extends FLOW-20, FLOW-21, FLOW-28, or FLOW-48, verify the plan includes the corresponding missing page from SK-539 §6:

| Flow | Required page | BLOCK if absent |
|---|---|---|
| FLOW-20 | `/settings/privacy` | Plan adds `ConsentGateEnforcer` work but no `/settings/privacy` route |
| FLOW-21 | `/forms/:schemaId` | Plan publishes a form with `publicUrl` but no submitter route |
| FLOW-28 | `/blog` and `/blog/:slug` | Plan adds `PublicPageRequestPipeline` work but no public blog routes |
| FLOW-48 | `/settings/language` | Plan adds `UserPreferencesManager` work but no language preferences route |

**Step 4 — Template check.** If any planned page matches a screen template pattern (T-1..T-7 in SK-539 §5), verify the plan references the template. Template match without reference → CONCERN, not BLOCK.

**Step 5 — Phase 7 declared.** Verify that for every React pages phase in the plan, a corresponding Phase 7 (UI/UX Compliance) step is declared after it. Phase 7 absent → BLOCK.

**This gate catches the six structural FC-18 failure modes (FM-1..FM-6 from `fc-18-ui-ux-compliance-gate.md`) before execution, not after.**

Verdict: PASS | CONCERN | BLOCK. On BLOCK, specify the check (UX-XX), the page (P-N), and the plan step that produced the violation.

---

## 5. Tier 1 verdict aggregation

Tier 1 produces an aggregate verdict:

- **REJECTED** — any BLOCK in 0a, 0b, 0c, 0d, 0e, 0f, 0g, 0h, 0j, 0k, 0l, or 0m
- **REJECTED** — BLOCK in 0i after documented Step 2 returned nothing
- **APPROVED_WITH_CONCERNS** — any PASS_WITH_CONCERNS in 0i or 0k, or CONCERN in 0m
- **APPROVED_TIER_1** — all gates PASS

Only APPROVED_TIER_1 or APPROVED_WITH_CONCERNS proceeds to Tier 2.

---

## 6. Tier 2 — Correctness checks (FC-1 through FC-18)

Tier 2 runs the failure-class battery. Order within Tier 2: FC-14, FC-15, FC-16, FC-17, FC-18 run FIRST (structural correctness), then FC-1 through FC-13 (content correctness).

### FC-14 — Goal Delivery Completeness (SK-534)

Goal elements decomposed from STATE.goalContext.statement. Each goal mapped to ≥1 plan turn with a verification step. Per-goal verdict: APPROVED | BLOCK_UNMAPPED | BLOCK_UNVERIFIED | CHALLENGE.

Any BLOCK → plan rejected before FC-1..FC-13 execute.

### FC-15 — Design Artifact Populated (SK-537)

For every artifact referenced by the plan:
- SK-537 Checks 1-2: files exist + fields populated
- Checks 3-4: surface mismatches (don't block, produce CONCERN)
- Check 5: informational

Any artifact failing Checks 1-2 → plan rejected or must add enrichment task.

### FC-16 — Architect Habits Discipline (SK-538 v1.2.0)

Authoring-time cross-check of Gate 0i from Tier 1. FC-16 ensures the same three-step doc-first loop that Gate 0i ran at review time was also run at plan-authoring time — i.e., the plan author documented their doc-search evidence in the plan.

Verdict: PASS if authoring-time evidence present; CONCERN if Tier 1 Gate 0i passed but authoring evidence missing; BLOCK if both absent.

### FC-17 — Response Construction Protocol Compliance

For every substantive response in the plan-authoring session that led to this plan:
- Step 1 decomposition artifact exists (in session internal record or plan provenance)
- Step 2 absorption artifact exists if full mode
- Step 3 prior-correction thread artifact exists if full mode
- Step 5 source-layer tags on all citations in response
- Step 6 feedback recheck verdict ADDRESSED for every correction declared addressed

Cross-reference: FC-17 at plan review time overlaps with Gates 0j (decomposition enforcement), 0k (correction thread enforcement), and 0l (source-layer enforcement) from Tier 1. Tier 1 catches the failure in the plan document; FC-17 at Tier 2 catches the failure in the session record that produced the document.

Verdict: PASS | CONCERN | BLOCK.

### FC-18 — UI/UX Compliance (SK-539 v1.1.0) *(updated v1.8)*

Tier 2 cross-check of Gate 0m from Tier 1. While Gate 0m verifies the plan's *structural intent* is UX-correct, FC-18 at Tier 2 verifies the plan author ran the SK-539 role question check, the business-intent sub-check, and the BLOCK matrix at authoring time — i.e., the plan document contains evidence that all four business-intent elements were declared and the BLOCK check matrix was consulted.

**FC-18 Tier 2 check procedure:**

1. Verify the plan document contains role declarations for each React page (Q1–Q4 per SK-539 §1). If Gate 0m passed but no role declaration appears in the plan text, FC-18 flags CONCERN.

2. Verify the plan contains all four business-intent elements for each React page (from Gate 0g business-intent sub-check): examination record finding, user intent source, role-visibility source, grammar declaration. If any element is missing, FC-18 flags BLOCK.

3. Verify the plan references FC-18 or SK-539 in its Phase 7 specification, or includes an explicit statement that Phase 7 was considered. A plan that passed Gate 0m structurally but contains no mention of FC-18 compliance work → CONCERN.

4. If the plan implements any of the four missing-page flows (FLOW-20/21/28/48), verify the missing page creation step appears explicitly in the plan with its correct route path.

5. If the plan uses a screen template (T-1..T-7), verify the template name is stated in the plan alongside the page specification.

6. Verify the plan declares a grammar type (G1–G7) for each TENANT_CONSUMER or PUBLIC page, and that the grammar type matches the examination record or `.impeccable.md` where those exist. A plan that declares grammar G3 CARD_LIST but specifies a CRUD table as the page content fails.

Cross-reference: FC-18 at Tier 2 overlaps with Gate 0m at Tier 1. Gate 0m catches structural violations; FC-18 at Tier 2 catches the absence of business-intent and UX compliance authoring-time evidence in the session record.

Any BLOCK finding in FC-18 → plan rejected before FC-1..FC-13 execute.

Verdict: PASS | CONCERN | BLOCK.

### FC-1 — Goal coverage (content-level)

Every user-stated goal has a plan element addressing it with sufficient specificity to execute.

### FC-2 — Evidence grounding

Plan claims about codebase state are grounded in grep/view results cited in the plan. Evidence index references STATE.recon lines.

### FC-3 — Architectural coherence

The plan's architectural decisions are internally consistent. No turn contradicts another turn's premise.

### FC-4 — Pipeline contract

Plan respects Q0a/b/c/d from SK-528. What the plan's output stage produces matches what the next stage consumes.

### FC-5 — Naming convention compliance (SK-430)

File paths, slug references, and domain names match the canonical table.

### FC-6 — Iron rules not silently overridden

Every iron rule referenced in the plan is either honored or explicitly flagged as overridden with Luba-approval timestamp.

### FC-7a — DNA compliance for GENERATION plans

Generated code specifications in the plan honor DNA-1 through DNA-9 patterns.

Applies to: plans that instruct Claude Code to generate new code (GENERATION session type,
new task-type contracts, new service files, new topology nodes).

Verdict: PASS | CONCERN | BLOCK.

---

### FC-7b — DNA compliance for REMEDIATION plans *(NEW v1.9)*

For plans that describe changes to existing code (remediation, gap-closure, refactoring,
module-separation, import-path updates, pattern migration): every proposed solution
pattern must be verified against the four critical DNA rules before the plan can execute.

**What "proposed solution pattern" means:**
Any sentence of the form "remove X," "replace X with Y," "add explicit Z," "migrate from A
to B," or "apply GAP-NN to FLOW-XX" is a proposed solution pattern. It implicitly commits
downstream code to a specific implementation shape. FC-7b requires that shape to be
verified against the four DNA rules before the plan author asserts it is correct.

**The four critical DNA rules for remediation plans:**

1. **DNA-5 — Tenant scoping via ALS**
   Any proposed change to tenantId handling must preserve ALS-based scoping.
   Common failure: "add explicit tenantId parameter" removes ALS-based scoping and
   replaces it with parameter passing — a DNA-5 violation that compiles and passes
   unit tests but creates tenant isolation holes under concurrent requests.
   Evidence required: read the actual service file (`[filepath:grep-result]`); confirm
   current scoping mechanism (ALS lookup or parameter); state why the proposed change
   preserves rather than replaces the current mechanism.

2. **DNA-7 — Fabric-first external access**
   Any proposed change involving external service access must route through fabric
   interfaces. IScopedMemoryService not IRedisService. ISchedulerService not Bull
   directly. ICodeRepositoryService not GitHub MCP.
   Common failure: proposed fix accesses Redis directly to "simplify the implementation"
   — a DNA-7 violation that makes the service non-portable and breaks the swap protocol.
   Evidence required: confirm no direct provider import in the proposed change; confirm
   the fabric interface exists for the service type (`grep -n "IFabricInterface" server/src/`).

3. **DNA-8 — Outbox-before-queue**
   Any proposed change that adds or modifies a queue operation must store the document
   before enqueuing it. The outbox write must be ORDER 1 in any handler that enqueues.
   Common failure: proposed handler adds enqueue as a new step without specifying that
   the existing storeDocument call precedes it — or adds a new enqueue without adding a
   preceding storeDocument.
   Evidence required: if change adds or modifies an enqueue, state explicitly:
   "storeDocument at line N precedes enqueue at line M in the proposed code."

4. **DNA-3 — DataProcessResult return type**
   Any proposed handler change must return DataProcessResult, not a raw object or void.
   Common failure: proposed handler method returns `Promise<boolean>` — compiles, passes
   tests, breaks DPO pipeline.
   Evidence required: proposed handler return type stated explicitly in the plan.

**Evidence standard for FC-7b:**
- IMPLEMENTATION evidence: actual file read with grep result, or proposed code block
  showing the specific implementation. File path + line range required.
- TEST evidence: existing test that confirms the behavior the proposed change preserves.
- DESIGN_DOC evidence — RECONCILIATION-STATE, FIX-PLAN versions, session notes, arbiter
  verdicts — does NOT satisfy FC-7b. Design documents describe intent, not implementation.
  A remediation plan backed only by DESIGN_DOC evidence is a plan that has not been
  verified against the code it proposes to change.

**Scope:**
FC-7b applies to every flow-level proposed change in a remediation plan.
"Apply GAP-01 to FLOW-05" is one application of FC-7b.
"Apply GAP-01 to FLOW-05 through FLOW-20" is sixteen applications of FC-7b.
Each flow requires its own evidence citation — shared evidence ("same pattern applies")
is acceptable only when the referenced service file for each flow has been individually
read and confirmed to match.

**Failure mode this gate catches (corpus evidence):**
module-separation fix plan v2.0–v4.9: proposed "remove ClsService, add explicit tenantId"
for 15 flows across six arbiter passes (A through F, 20 corrections per pass). No pass
applied FC-7a or FC-7b. No service file for any of the 15 flows was cited as IMPLEMENTATION
evidence. DNA violations were found at implementation review — after the plan had accumulated
18 versions and the executor began running it. One FC-7b review pass at v2.0 would have
caught the DNA-5 gap before the plan grew to v4.9.

Verdict: PASS (all four DNA rules verified with IMPLEMENTATION evidence for each
  proposed change) | CONCERN (some proposed changes lack evidence — reviewer lists
  which by flow and DNA rule) | BLOCK (proposed pattern demonstrably violates a DNA
  rule — specific violation cited with file:line reference).

### FC-7c — Detection before scope claim *(NEW v2.0)*

Any plan that claims "N flows affected" or "all flows require this change" must show
the detection command and its output before listing fix steps.

**What "scope claim" means:**
- "GAP-01 affects FLOW-05 through FLOW-20" — scope claim for 15 flows
- "All PLAIN_TS flows have local interface clones" — scope claim for a flow cluster
- "The full fleet has unscoped FREEDOM keys" — universal scope claim

**Required for FC-7c to PASS:**

```bash
# Example: plan claims "GAP-01 affects 23 flows"
# Required detection output in plan (before any fix steps):

grep -rl "import.*ClsService\|from 'nestjs-cls'" \
  server/src/engine/flows/ --include="*.service.ts" | wc -l
# Output: 23

# OR per-flow detection:
for FLOW in flow-01-user-registration flow-08-sharable-flows ...; do
  COUNT=$(grep -rc "import.*ClsService" server/src/engine/flows/$FLOW/ \
    --include="*.service.ts" 2>/dev/null | awk -F: '{sum+=$2} END {print sum+0}')
  [ $COUNT -gt 0 ] && echo "$FLOW: $COUNT hits"
done
```

**Universal claim rule:** A plan claiming "all flows" or "full fleet" must have run
detection against 100% of flows — not a representative sample. If detection was run
on 6 of 49 flows, the scope is 6 flows — not 49.

**Failure mode this gate catches:**
G-05 from gap mapping R3: plans claimed full-fleet scope for portability gaps based on
manual inspection of 3-5 representative flows. Remediation sessions launched for 49
flows had IMPLEMENTATION evidence from 6. The remaining 43 had design-doc evidence only.

Verdict: PASS (detection output present and matches claimed scope) |
CONCERN (detection missing for some claimed flows — list which) |
BLOCK (claimed scope exceeds detected scope — reduce scope to match detection output).

---

### FC-7d — New rows trigger arbiter re-run *(NEW v2.0)*

When a plan version adds new per-flow rows that were not present in the prior reviewed
version, the full arbiter battery (FC-1 through FC-13, FC-7a/b/c) must run on those
new rows before the plan version is approved.

**What counts as "new rows":**
- FLOW-40..48 added to a plan originally written for FLOW-01..39
- A new gap added to an existing gap-by-gap plan
- A new phase added to an existing implementation plan

**The rule:**
Adding rows to a reviewed plan creates an unapproved plan for those rows.
The prior plan version remains approved for its original scope.
The new rows require their own review pass.

**Detection:**

```bash
# Reviewer: identify new rows by diffing plan versions
diff PLAN-v3.md PLAN-v4.md | grep "^+" | grep "FLOW-\|GAP-\|Phase "
# Each line added is a new row requiring review
```

**Why this matters — corpus evidence:**
G-11 from gap mapping R3: FLOW-40..48 were added to the module-separation fix plan
across versions v2.0 through v4.9. The B-arbiter (the plan's own custom reviewer) was
never re-run after these 9 flows were added. For 10 plan versions, the most important
new flows in the fleet had no arbiter review. FC-7d would have caught this at v2.1
when FLOW-40 was first added.

**Exemption:** Minor editorial changes (typo fixes, clarification of an existing row)
do not require a full re-run. The test: does the editorial change alter what Claude
Code will execute for any flow? If yes → re-run required.

Verdict: PASS (new rows reviewed in this pass or no new rows added) |
BLOCK (new rows present but not reviewed — list which by flow/gap/phase).

---

### FC-22 — Definition of done includes protocol status + Guard 14 *(NEW v2.1)*

For any implementation plan (FLOW-XX-IMPLEMENTATION-PLAN or equivalent), the plan's
definition of done must include all three protocol gate phases, or declare explicit N/A
for each. A plan with no Phase G, H, or I and no N/A declarations has an incomplete
definition of done for the platform's certification and security requirements.

**FC-22a — Portability gate declared:**

The plan must contain one of:
- Phase G (Portability Mobility Gate) as a declared phase with V9 gate steps (P-1..P-5 + D-HIST-001)
- An explicit statement: "Phase G N/A — EXTERNAL_REPO adapter" (only for adapter flows with no monorepo services)

Detection: scan plan for "Phase G" or "portabilityStatus" or "Phase G N/A".

Failure example: plan has Phases A-F with no Phase G and targets distribution.
Failure consequence: flow ships ACTIVE with portabilityStatus = TBD; cannot reach TIER_A.

Verdict: PASS | BLOCK.

**FC-22b — Auth decoration gate declared:**

The plan must contain one of:
- Phase H (Auth Decoration) as a declared phase with A-1/A-2/A-3 checks and Rule 7 tests
- An explicit statement: "Phase H N/A — no HTTP controllers"
- An explicit AUTH_DEFERRED declaration: "Phase H N/A — AUTH_DEFERRED: auth.module.ts absent; decorate in Phase H after AUTH-PLAN v3 Phases 1-4"

Detection: scan plan for "Phase H" or "authStatus" or "Phase H N/A" or "AUTH_DEFERRED".

Failure example: plan has HTTP controllers, no Phase H, no AUTH_DEFERRED declaration.
Failure consequence: controllers ship unguarded; authStatus = TBD blocks GOAL_REACHED.

Verdict: PASS | BLOCK.

**FC-22c — Certification tier and Guard 14 declared:**

The plan must contain one of:
- Phase I (Tenant Certification Status) as a declared phase with V11 gate steps and tenantCertTarget
- An explicit statement: "Phase I N/A — NOT_DISTRIBUTABLE"

Additionally, if the plan targets TIER_C or TIER_D, it must include Guard 14 evidence:
```
Guard 14 check:
  auth.module.ts present:              [YES | NO]
  scope-enrichment.interceptor.ts:     [YES | NO]
  APP_GUARD or JwtAuthGuard in app.module.ts: [YES | NO]
  role-strings.ts present:             [YES | NO]
  Guard 14 score: N/4
```
Score < 4/4 → plan must cap tenantCertTarget at TIER_B until Guard 14 is satisfied.
Claiming TIER_C without Guard 14 evidence is a BLOCK.

Detection: scan plan for "Phase I" or "tenantCertTarget" or "Phase I N/A" or "NOT_DISTRIBUTABLE".
For TIER_C claims: look for Guard 14 score block.

Failure example: plan declares `tenantCertTarget: TIER_C` with no Guard 14 evidence.
Failure consequence: Phase I Step 6c (flow-lifecycle v1.1.0) exits 1 at execution time.

Verdict: PASS | CONCERN (missing Phase I but also NOT_DISTRIBUTABLE not declared — ambiguous)
       | BLOCK (TIER_C claim without Guard 14 evidence, or no Phase I and distributable flow).

**FC-22 combined verdict:**
PASS if FC-22a + FC-22b + FC-22c all PASS.
BLOCK if any of FC-22a, FC-22b, FC-22c is BLOCK.
CONCERN if any is CONCERN and none is BLOCK.

---

Plan specifies test gates with concrete pass criteria (numbers, not qualitative descriptions).

### FC-9 — Issue inventory present

Plan includes ISSUE-INVENTORY section: FIXED / DEFERRED+CARRY-FORWARD / EXCEPTION.

### FC-10 — Cross-document propagation

Single plan document; no stale copies. If the plan supersedes a prior version, the prior version is explicitly marked as superseded.

### FC-11 — Overview-detail match

Each turn's one-line goal and its code specification are consistent.

### FC-12 — Principles compliance

DNA-1, DNA-5, DNA-8, CF-POLICY-01, and other platform principles honored in the plan's code blocks.

### FC-13 — Documentation artifacts per Rule 17

For every phase the plan produces, the corresponding Rule 17 documentation (business topology JSON + MD companion, design-reasoning JSON, contract JSON, etc.) is specified as an output.

---

## 7. Tier 2 verdict aggregation

Tier 2 produces the final verdict:

- **REJECTED** — any BLOCK in FC-14, FC-15, FC-16, FC-17, FC-18, FC-22, or FC-1 through FC-13
  (including FC-7a, FC-7b, FC-7c, FC-7d, and FC-22a/b/c)
- **APPROVED_WITH_CONCERNS** — any CONCERN in any FC gate
- **APPROVED** — all gates PASS

---

## 8. Verdict output format

Reviewer produces a single document: `PLAN-REVIEW-VERDICT-v{N}.md`

Structure:

```
# Plan Review Verdict — [plan name] v[version]
## Reviewer: [session identifier]
## Date: [timestamp]

## Tier 1 — Structural pre-checks

| Gate | Verdict | Notes |
|------|---------|-------|
| 0a | PASS | |
| 0b | PASS | |
| 0c | PASS | |
| 0d | PASS | |
| 0e | PASS | |
| 0f | PASS | |
| 0g | PASS | Phase 7 sub-check: Phase 7 declared ✓; Business-intent sub-check: all 4 elements present ✓ |
| 0h | PASS | |
| 0i | PASS | 0 habit hits above Class-c |
| 0j | PASS | User items addressed in stated order |
| 0k | PASS | Corrections threaded explicitly |
| 0l | PASS | All citations source-tagged |
| 0m | PASS | Role tier declared for all 2 pages; UX-30 grammar declared; Phase 7 step present |

Tier 1 aggregate: APPROVED_TIER_1

## Tier 2 — Correctness checks

| FC | Verdict | Notes |
|----|---------|-------|
| FC-18 | PASS | All 4 business-intent elements present; grammar declared; examination record cited |
| FC-14 | PASS | All goal elements mapped |
| FC-15 | PASS | All referenced artifacts populated |
| FC-7a | PASS | [if GENERATION plan] Generated code specs honor DNA-1..DNA-9 |
| FC-7b | PASS | [if REMEDIATION plan] DNA-5/7/8/3 verified with IMPLEMENTATION evidence for each proposed change |
| FC-7c | PASS | Detection output present and matches claimed scope (N flows detected = N flows in plan) |
| FC-7d | PASS | New rows reviewed in this pass OR no new rows added since prior reviewed version |
| FC-22 | PASS | FC-22a: Phase G or N/A declared ✓; FC-22b: Phase H or N/A/AUTH_DEFERRED declared ✓; FC-22c: Phase I or NOT_DISTRIBUTABLE declared ✓; Guard 14 score adequate if TIER_C target ✓ |
| [FC-1..FC-13 excluding FC-7] | PASS | |

Tier 2 aggregate: APPROVED

## Final verdict: APPROVED
```

---

## 9. "How the reviewer writes" — voice and structure

The reviewer's writing follows four principles observed across productive review sessions:

### 9.1 Findings, not prose

The verdict is a table of gates and a list of findings. Not narrative prose. A reviewer who writes five paragraphs of analysis instead of a verdict table has drifted into architect mode — a different role.

### 9.2 Evidence attached to every claim

Every finding cites the specific line in the plan that triggered it. Vague findings ("the plan seems to overreach") fail Gate 0l if the reviewer emits them — same standard applies to the reviewer's own output as to the plan being reviewed.

### 9.3 ⛔ STOP after verdict

The reviewer's document ends with a verdict and a STOP. No recommendations disguised as verdicts. No "I think this could be improved by..." tacked on. The reviewer's job is verdict + required corrections, not design suggestions.

### 9.4 Grade format, not conversational format

The verdict is the output. The reader (plan author, Luba) reads the verdict and acts. The reviewer does not open a dialog — "would you like me to elaborate on Gate 0j?" — unless explicitly asked.

---

## 10. When the reviewer themselves trips a habit

Reviewer output is subject to the same SK-538 catalog. Common reviewer failures:

- **N-A5 (claims without evidence):** the verdict cites a gate failure without pointing to the plan line. Fix: every gate-level BLOCK names the plan section that triggered it.
- **N-A6 (altitude-as-excuse):** "at review level, I'm flagging this as a concern" without explaining what the concern is. Fix: concerns are specific.
- **N-A15 (catalog-vocabulary):** reviewer labels a finding "this is N-A18" without quoting the user correction that didn't thread. Fix: quote the correction, then name the habit.
- **N-A19 (no recheck):** reviewer acknowledges plan revision but doesn't verify the revision addresses the prior BLOCK. Fix: before changing a verdict from BLOCK to PASS, verify the specific gate condition now holds.

The reviewer runs the three-step doc-first loop on their own verdict before emission, same as the plan author does on their plan.

---

## 11. Versioning

- v1.0 — initial protocol, Gates 0a-0f plus FC-1..FC-13
- v1.1 — added Gate 0g visual proof
- v1.2 — added Gate 0h iron rules
- v1.3 — added Gate 0i architect habits (SK-538 v1.0.0)
- v1.4 — extended Gate 0i for SK-538 v1.1.0, added scope-in/out boundary
- v1.5 — added three Gate 0i sub-checks (plan-cites-inputs, shape-match-at-close, cluster-aware scan), added Gate 0g visual-proof sub-check, added "How the reviewer writes" section
- v1.6 — added Gates 0j (user-order preservation), 0k (correction-thread), 0l (source-layer tags); added FC-17 Response Construction Protocol Compliance; added reviewer self-habits section; cluster-aware scan subcheck kept in Gate 0i
- v1.7 — added Gate 0g SK-539 sub-check (Phase 7 must be planned for React pages phases); added Gate 0m (UI/UX compliance structural pre-check — role questions Q1–Q4, 12-item BLOCK matrix, missing-page registry, template check, Phase 7 declared); added FC-18 UI/UX Compliance (Tier 2 cross-check of Gate 0m); updated Tier 1 and Tier 2 verdict aggregation; updated verdict output format table
- v1.8 — Gate 0g business-intent sub-check added (4 elements required before any React page implementation task: examination record finding, user intent source, role-visibility source, grammar declaration G1–G7); CFI-12 halt condition added for FLOW-04/09/34; Gate 0m BLOCK matrix updated with UX-06b and UX-30; FC-18 Tier 2 updated to verify business-intent elements and grammar declaration; FM count updated (FM-1..FM-6); verdict format table updated to show Gate 0g two-sub-check format; cross-references updated
- v1.9 — FC-7 split into FC-7a (GENERATION plans, unchanged behavior) and FC-7b (REMEDIATION plans — four critical DNA rules, IMPLEMENTATION evidence required per proposed change, DESIGN_DOC evidence explicitly rejected); scope line extended to include REMEDIATION/gap-closure/architectural-fix plans; Tier 2 verdict aggregation and verdict format table updated; corpus origin: module-separation fix plan v2.0–v4.9, DNA-5 violation in 15 flows caught at implementation not at plan review
- v2.0 — FC-7c added (detection before scope claim; universal claims require 100% coverage); FC-7d added (new rows trigger arbiter re-run); Tier 2 aggregation and verdict format updated
- v2.1 — FC-22 added: three sub-checks FC-22a (portability/Phase G), FC-22b (auth/Phase H), FC-22c (cert tier/Phase I + Guard 14 for TIER_C); Tier 2 aggregation and verdict format updated; corpus origin: all 49 IMPL-STATE.json files show portabilityStatus=TBD/authStatus=TBD/tenantCertTier=NONE — no prior plan version included Phase G/H/I

---

## 12. Observability

For any plan review using this protocol:

- Verdict document exists with Tier 1 and Tier 2 tables
- Every BLOCK has a plan-section citation
- Every required correction has a specific fix description
- Reviewer's own output passes the same source-layer check it applied to the plan (Gate 0l)
- No verdict shipped with reviewer's own draft unchecked against SK-538 catalog

Verdicts that violate these properties are out of protocol compliance and should be re-run.

---

## 13. Cross-references

- **SK-538** — architect habits catalog, used by Gate 0i
- **SK-534** — goal delivery completeness, enforced by FC-14
- **SK-537** — design artifact completeness, enforced by FC-15
- **SK-539 v1.1.0** — UI/UX compliance (31 checks UX-01..UX-30, 52-role taxonomy, 7 screen templates, 4 missing pages, 7 grammar types G1-G7, Section 0 pre-design gate), enforced by Gate 0m and FC-18
- **FC-18 v1.1.0** — UI/UX compliance gate (`fc-18-ui-ux-compliance-gate.md`) — canonical source for Gate 0m BLOCK matrix (including UX-06b + UX-30), Audit Trail format, and exemption rules; FM-1..FM-6 reference for Gate 0m
- **RESPONSE-CONSTRUCTION-PROTOCOL v1.0** — enforced by FC-17 at Tier 2 and Gates 0j/0k/0l at Tier 1
- **HOW-TO-USE-SKILLS v4.5.0** — Rule 33 mandates protocol; Rule 35 mandates UI/UX compliance sequence; Mandatory Check 15 enforces FC-18 at ⛔ STOP
- **DESIGN-REVIEW-PROTOCOL v1.5** — fleet-level aggregation of per-plan findings; Signal 12 corresponds to FC-18; Signal 13 corresponds to Gate 0g business-intent sub-check + FC-18 grammar verification
- **FLOW-DOCUMENT-AUTHORING-GUIDE v1.16** — Q8 (examination record check + WHO/VERB/GRAMMAR before JSX) mirrors Gate 0g business-intent sub-check; Rule 35 (Screen Intent Anchor) mirrors Gate 0g; Phase 7 at authoring time mirrors Gate 0m and FC-18
- **XIIGEN-DESIGN-ARCHITECT-SESSION-GUIDE v1.8** — Q10 (job-to-be-done, examination record as priority 1 source) mirrors Gate 0g business-intent sub-check; Mistake 23 (building screen without reading business spec) is the canonical Gate 0g failure example
- **planning--business-flows-registry.md** — pre-declared grammar types and CFI-12 flags; Gate 0g consults this for FLOW-04/09/34 halt condition
- **docs/screen-examination/{slug}-examination.md** — examination records; Gate 0g sub-check 1 requires plan cites primary finding and classification from this file where it exists
- **SESSION-LOAD-PLAN v31** — CFI-05 (Page rewrite for FLOW-36/37/38/39/40), CFI-10 (CLOSED), CFI-11 (OPEN), CFI-12 (OPEN — FLOW-04/09/34 halt)
- **GUIDE-B17-IMPLEMENTATION-PLAN v6.3** — Phase G (portability V9 gate), Phase H (auth decoration A-1..A-3 + Rule 7), Phase I (tenant cert tier + Guard 14 + TIER-C checklist); FC-22 verifies these phases are declared
- **pipeline--flow-lifecycle-SKILL v1.1.0** — Step 6a (portabilityStatus write), Step 6b (authStatus write), Step 6c (tenantCertTier write + Guard 14 enforcement); FC-22c references Guard 14 score
- **code-execution--dna-compliance-guard-SKILL v1.2.0** — A-1..A-3 auth checks verified by FC-22b; plans that propose controller-creating steps without Phase H fail FC-22b
- **planning--qa-session-type-SKILL v2.0.0** — Step 5b protocol completeness; FC-22 at plan-review time is the pre-execution gate; Step 5b at QA time is the post-execution gate
