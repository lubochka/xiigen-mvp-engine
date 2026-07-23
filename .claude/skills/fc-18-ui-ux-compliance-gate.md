---
gate_id: FC-18
name: ui-ux-compliance
version: "1.1.0"
skill_ref: SK-539
priority: MANDATORY
tier: TIER_1_AND_TIER_2
updated: "2026-04-20"
enforced_by:
  - "XIIGEN-CODE-REVIEW-PROTOCOL v1.8 Gate 0m (Tier 1 structural pre-check)"
  - "HOW-TO-USE-SKILLS v4.5.0 Mandatory Check 15 (⛔ STOP gate)"
  - "XIIGEN-FLOW-DOCUMENT-AUTHORING-GUIDE v1.16 Phase 7 (authoring-time)"
applies_to:
  - "All plans that include React page implementation steps"
  - "All MATERIALIZATION sessions producing client-side surfaces"
  - "All GENERATION sessions for flows classified TENANT_FACING or PUBLIC"
---

# FC-18 — UI/UX Compliance Gate

## What changed in v1.1.0

- **FM-5 "Correct fix" extended:** three pre-creation steps added — read UI-REFLECTION-STATE, run SK-542 + SK-540 for grammar declaration, use MARKET-REFERENCE-CATALOG for per-state conventions. Note added that a page created without these steps passes FM-5's structural check but fails UX-30.
- **FM-6 added:** wrong grammar for tenant-facing page — CRUD table shown to TENANT_CONSUMER regardless of TENANT_FACING badge or Audit Trail status.
- **Gate 0m Step 3 BLOCK matrix** updated with UX-06b and UX-30.
- **Audit Trail format** updated with grammar type, .impeccable.md, and SK-541 audit fields (mirrors SK-539 v1.1.0 changes).
- **References** updated for new document versions and new skills.

## What this gate catches

FC-18 catches the gap between "server services are implemented" and "users can actually use the feature." It enforces that every React page produced by a XIIGen implementation session:

1. Was written for a declared role audience (not for all authenticated users generically)
2. Has a route that matches the declared audience's access tier
3. Does not expose engine-internal information to tenant or public users
4. Satisfies the 31 UX checks from SK-539 v1.1.0 appropriate to its classification
5. Uses the correct screen template where one applies
6. Implements one of the seven declared grammar types (G1–G7) where the audience is TENANT_CONSUMER or PUBLIC

FC-18 does **not** review code quality, test coverage, or DNA compliance — those are FC-1..FC-17 territory. FC-18 reviews only the user-facing correctness of client surfaces.

---

## Placement in Protocol

### In CODE-REVIEW-PROTOCOL v1.8 — Gate 0m (Tier 1)

Gate 0m runs as the **last Tier 1 structural pre-check**, after Gate 0l (source-layer tags) and before Tier 2 FC gates.

Tier 1 now runs: 0a → 0b → 0c → 0d → 0e → 0f → 0g → 0h → 0i → 0j → 0k → 0l → **0m**

Gate 0m blocks exactly the same way Gates 0a–0l do: a BLOCK at Gate 0m rejects the plan before Tier 2 runs. The plan does not execute until Gate 0m passes.

### In HOW-TO-USE-SKILLS v4.5.0 — Mandatory Check 15

Check 15 runs at every ⛔ STOP for sessions that produced React pages in that round. It verifies the FC-18 Audit Trail (defined in §4 of this document) was produced and all BLOCK findings were cleared before STOP fires.

### In FLOW-DOCUMENT-AUTHORING-GUIDE v1.16 — Phase 7

Phase 7 is the UX compliance phase that runs after Phase 6 (QA and PNG capture) and before the phase is closed. Phase 7 produces the FC-18 Audit Trail for each page delivered in the phase.

---

## Gate 0m Procedure (at Plan Review Time)

The reviewer runs this procedure on every plan that contains React page implementation steps.

### Step 1 — Identify all pages in the plan

Scan the plan for:
- Any step that creates or modifies a `*.tsx` file in `client/src/pages/`
- Any step that adds a `<Route>` to `App.tsx`
- Any step that creates a new user-visible surface (modal, drawer, embedded widget)

List them as P1, P2, P3...

### Step 2 — For each page, verify the four role questions

Per SK-539 §1, each page must answer:

```
Q1 ROLE_TIER:   Is it declared? [PLATFORM_ENG | PLATFORM_OPS | TENANT_OPS | TENANT_CONSUMER | PUBLIC]
Q2 ROLE_GATE:   Is a specific role (from the 52-role taxonomy) named as primary audience?
Q3 ROUTE_GUARD: Does the declared route match the declared role tier?
                /admin/...   → PLATFORM_ENG or PLATFORM_OPS only
                /settings/   → TENANT_CONSUMER or PUBLIC (user self-service)
                /...         → TENANT_CONSUMER or PUBLIC
Q4 VISIBILITY:  Is a visibility scope (from the 12-scope registry) declared?
```

Failure on any of the four questions → BLOCK (Gate 0m fails for that page).

### Step 3 — Run the BLOCK check matrix

For every page in the plan, check each BLOCK condition from SK-539 §7.

The abbreviated BLOCK matrix (reviewer runs each against the plan text):

| Check | Question | BLOCK if |
|---|---|---|
| UX-06 | Is empty state designed for this page? | Plan adds a TENANT_CONSUMER or PUBLIC page with no empty state specification |
| UX-06b | Does the plan's PNG gate require populated state? | Plan specifies PNG capture without `?mock=` param on TENANT_CONSUMER or PUBLIC page |
| UX-16 | Does route prefix match role tier? | `/admin/` page declared for PUBLIC or TENANT_CONSUMER audience |
| UX-17 | Are API errors translated? | Plan describes showing raw HTTP codes to tenant/public users |
| UX-18 | Are role-conditional elements conditionally rendered? | Plan renders the same UI to all roles regardless of permission |
| UX-19 | Are user-rights pages accessible to all R-REG? | Privacy, consent, or language-preference page routed under `/admin/` |
| UX-20 | Published forms have submitter route? | Plan publishes a form with `publicUrl` but adds no `/forms/:schemaId` route |
| UX-22 | No-bypass gate has visible indicator? | Plan adds a page for a no-bypass flow (FLOW-24, 37, 44) without the non-dismissable badge |
| UX-23 | Automated gates show progress, not buttons? | Plan adds a manual "publish/apply/trigger" button to a fully automated gate |
| UX-24 | Human-in-the-loop pages have 4 mandatory fields? | Plan's approval/review page spec omits item identity, requester, SLA countdown, or decision form |
| UX-25 | TENANT_FACING flows not routing to admin CRUD? | Plan marks a page `TENANT_FACING` but backs it with generic `/api/dynamic/xiigen-*` CRUD |
| UX-26 | OAuth handshake has pending + return screens? | Plan adds OAuth integration but specifies only success/error states |
| UX-27 | Human override requires written justification? | Plan's override form has no mandatory reason field |
| UX-29 | Consent-pending state has approve/deny affordance? | Plan shows consent gate status but provides no action widget |
| UX-30 | Grammar type declared and implemented? | Plan adds a TENANT_CONSUMER or PUBLIC page without declaring a grammar type (G1–G7); or declares a grammar type but the page specification describes a generic Name/Status/Notes/Actions table backed by `/api/dynamic/xiigen-*` |

**Missing page check (from SK-539 §6):**

If the plan implements or extends any of these flows, it must also create the corresponding missing page or the gate BLOCKS:

| Flow | Required page | Gate blocks if |
|---|---|---|
| FLOW-20 | `/settings/privacy` | Plan implements ConsentGateEnforcer but no privacy settings route |
| FLOW-21 | `/forms/:schemaId` | Plan publishes a form with publicUrl but no submitter route |
| FLOW-28 | `/blog` and `/blog/:slug` | Plan implements PublicPageRequestPipeline but no public blog routes |
| FLOW-48 | `/settings/language` | Plan implements UserPreferencesManager but no language preferences route |

### Step 4 — Check template usage

If any page in the plan matches one of the 7 screen templates (SK-539 §5), verify the plan uses that template as the starting point. A plan that reimplements the template from scratch without referencing it is a CONCERN (not a BLOCK) — the template exists to pre-satisfy UX checks; reimplementation risks missing checks the template already covers.

Template match conditions:

| Template | Match condition |
|---|---|
| T-1 AI-Proposal-Review | Page shows an AI-generated proposal with confidence score and approve/reject decision |
| T-2 Bootstrap-Checklist | Page shows sequential system initialization or upgrade steps with per-step status |
| T-3 Arbiter-Progress | Page shows N-of-M automated gate verdicts without a manual action button |
| T-4 ParallelFlowMonitor | Page shows multiple child flows dispatched in parallel with individual status |
| T-5 AiSelfModificationReview | Page shows AI self-modification proposal with before/after diff and simulation evidence |
| T-6 CycleTopologyDiff | Page shows a before/after topology graph for cycle chain modification |
| T-7 AgentSessionMonitor | Page shows a platform agent execution session with stage pipeline and consent widget |

### Step 5 — Produce Gate 0m verdict

```
Gate 0m verdict options:
  PASS         — all pages clear all BLOCK checks; no missing-page violations
  CONCERN      — no BLOCKs but ≥1 CONCERN finding (see SK-539 §7 CONCERN list)
  BLOCK        — any BLOCK finding present

On BLOCK: state the specific check (UX-XX), the specific page, and the specific plan
step that produced the violation. Plan cannot proceed to Tier 2 until cleared.

On CONCERN: plan may proceed to Tier 2 but CONCERN must appear in the plan's
carry-forward inventory before it is approved for execution.
```

---

## Mandatory Check 15 (at ⛔ STOP)

Check 15 runs after Checks 1–14 in HOW-TO-USE-SKILLS and before STOP fires.

### Trigger

Check 15 fires if the session produced ANY of:
- A new `*.tsx` file in `client/src/pages/`
- A new `<Route>` entry in `App.tsx`
- A modified page with changes to role-visible content

### Procedure

1. For each new or modified page, retrieve the FC-18 Audit Trail (see §4 below)
2. Confirm all BLOCK checks passed
3. Confirm any CONCERN findings are in the session's carry-forward inventory
4. Confirm the correct screen template was used (or explicit deviation documented)

### Verdict

```
STOP fires only if: all pages have Audit Trail, no unclosed BLOCKs, all CONCERNs carried forward.
STOP does not fire if: any page is missing its Audit Trail, or any BLOCK is unclosed.
```

---

## FC-18 Audit Trail Format

Every page delivered in a session must produce this record. The record is authored by the implementing session at Phase 7 of the AUTHORING-GUIDE and checked by the reviewer at Gate 0m.

```markdown
## FC-18 AUDIT TRAIL — [page-name] ([flow-slug])
**File:** `client/src/pages/[slug]/[PageName].tsx`
**Route:** `[/path/to/page]`

### Role declaration
- Role tier:    [PLATFORM_ENG | PLATFORM_OPS | TENANT_OPS | TENANT_CONSUMER | PUBLIC]
- Primary role: [R-role-id from SK-539 §3 taxonomy]
- Secondary roles (if any): [R-role-id, ...]
- Visibility scope: [V-scope-id from SK-539 §4 registry]

### Design context
- Grammar type:       [G1–G7 declared | NONE — UX-30 BLOCK]
- .impeccable.md:     [present at docs/design-context/{slug}/ | absent — SK-540 skipped]
- Examination record: [present: {classification} | absent]
- SK-541 audit:       [attached below | not run — Phase 7 Step 5 pending]

### Route correctness
- Declared tier is [PLATFORM_ENG/OPS | TENANT | PUBLIC]
- Route `/[path]` [matches | DOES NOT MATCH] expected prefix for this tier
- UX-16: [PASS | BLOCK — gap: description]

### BLOCK checks
| Check | Result | Evidence |
|-------|--------|----------|
| UX-01 | PASS/BLOCK | h1 text: "[exact h1 text]" |
| UX-02 | PASS/BLOCK | [N] buttons/links — all have text or aria-label |
| UX-03 | PASS/BLOCK | [N] inputs — all have associated labels |
| UX-04 | PASS/BLOCK | Inline errors: [description of implementation] |
| UX-05 | PASS/BLOCK | Loading state: [description] |
| UX-06 | PASS/BLOCK | Empty state: [CTA present and meaningful | gap description] |
| UX-06b | PASS/BLOCK | PNG state: [populated mock captured | empty/error state captured — invalid] |
| UX-08 | PASS/BLOCK | Focus ring: [implementation method] |
| UX-09 | PASS/EXEMPT | [tap target size or EXEMPT: admin-only page] |
| UX-10 | PASS/BLOCK | Status indicators: [description — color + label] |
| UX-12 | PASS/BLOCK/EXEMPT | Responsive: [breakpoints implemented or EXEMPT] |
| UX-14 | PASS/BLOCK/N_A | Destructive actions: [N destructive actions, all confirmed | N/A: no destructive actions] |
| UX-16 | PASS/BLOCK | Route guard: [see route correctness above] |
| UX-17 | PASS/BLOCK | API errors: [translation method] |
| UX-18 | PASS/BLOCK/N_A | Role-conditional: [N conditional elements or N/A] |
| UX-19 | PASS/BLOCK/N_A | User-rights page: [N/A or gap description] |
| UX-20 | PASS/BLOCK/N_A | PublicUrl → route: [N/A or route created] |
| UX-22 | PASS/BLOCK/N_A | No-bypass indicator: [N/A or implementation] |
| UX-23 | PASS/BLOCK/N_A | Automated gate: [N/A or progress indicator description] |
| UX-24 | PASS/BLOCK/N_A | HITL 4-fields: [N/A or all 4 fields confirmed] |
| UX-25 | PASS/BLOCK/N_A | TENANT_FACING not CRUD: [N/A or purpose-built UI description] |
| UX-26 | PASS/BLOCK/N_A | OAuth screens: [N/A or pending+return screens described] |
| UX-27 | PASS/BLOCK/N_A | Override justification: [N/A or mandatory reason field confirmed] |
| UX-29 | PASS/BLOCK/N_A | Consent affordance: [N/A or approve/deny widget described] |
| UX-30 | PASS/BLOCK/N_A | Grammar implemented: [G1–G7 type + confirmation | N/A: admin-only | BLOCK: CRUD table] |

### CONCERN checks
| Check | Result | Note |
|-------|--------|------|
| UX-07 | PASS/CONCERN | Icons: [SVG confirmed or emoji gap] |
| UX-11 | PASS/CONCERN | Hover-only: [none found or gap] |
| UX-13 | PASS/CONCERN | Per-field validation: [implemented or submit-only] |
| UX-15 | PASS/CONCERN | Skip-to-main: [present or not] |
| UX-21 | PASS/CONCERN | Internal IDs: [none found or gap description] |
| UX-28 | PASS/CONCERN/N_A | AI feedback widget: [N/A or widget present or gap] |

### SK-541 audit record
[Paste SK-541 AUDIT output here — Layer 1/2/3/4 results and overall verdict]

### Screen template
- Template applicable: [T-N name | NONE]
- Template used: [YES | NO — deviation reason: ...]
- Checks pre-satisfied by template: [UX-XX, UX-XX, ...]

### Missing page registry check
- This page fulfills missing page: [/path from SK-539 §6 | N/A]

### FC-18 verdict
**BLOCK findings:** [NONE | UX-XX: description, page: name, step: N]
**CONCERN findings:** [NONE | UX-XX: description — carry-forward CF-NNN]
**Overall verdict:** [APPROVED | BLOCK | CONCERN]
```

---

## Exemptions

The following exemptions reduce the check set. Exemptions must be declared in the Audit Trail; undeclared exemptions are treated as BLOCKs.

| Condition | Exempt checks | Declaration required |
|---|---|---|
| Page serves only PLATFORM_ENG roles (R-ENGINE-ARCHITECT, R-SENIOR-ARCHITECT, R-ENGINE-DEV, R-DATA-ENGINEER, R-DEVOPS-ENGINEER, R-FLOW-ARCHITECT) | UX-09 (tap targets), UX-12 (mobile responsive) | `EXEMPT: platform-eng-only page — tap/mobile checks not applicable` |
| Page has no form inputs | UX-03, UX-04, UX-13 | `EXEMPT: read-only page — no input labels, inline errors, or per-field validation applicable` |
| Page has no destructive actions | UX-14 | `EXEMPT: no destructive actions on this page` |
| Page is not in a no-bypass flow | UX-22 | `EXEMPT: no iron-rule no-bypass gate in this flow` |
| Page is not a human-in-the-loop surface | UX-24 | `EXEMPT: no approval/review decision on this page` |
| Page has no OAuth/external handshake | UX-26 | `EXEMPT: no OAuth integration on this page` |
| Page has no human override capability | UX-27 | `EXEMPT: no override of automated systems on this page` |
| Page renders no AI-generated content | UX-28 | `EXEMPT: no AI-generated content rendered on this page` |
| Page has no consent gate interaction | UX-29 | `EXEMPT: no consent-pending state on this page` |
| Page serves only PLATFORM_ENG or PLATFORM_OPS roles | UX-30 | `EXEMPT: admin-only page — grammar type mandate applies to TENANT_CONSUMER and PUBLIC only` |

---

## Failure Mode Reference

Six failure modes found across the 48-flow reconnaissance and subsequent examination runs:

### FM-1 — Wrong route tier (UX-16 + UX-19)

**Pattern:** User-rights pages (consent management, language preferences) routed under `/admin/`.

**Evidence:** FLOW-20 `ConsentGatePage` at `/admin/ads/consent` — GDPR consent is a right of all R-REG users, not an admin operation.

**Correct fix:** Route to `/settings/privacy`. Add authentication guard (all R-REG), remove admin guard.

**Incorrect fix:** Keeping the page at `/admin/` and adding a link from the user settings page — this does not satisfy UX-19; the route itself must be accessible without admin role.

---

### FM-2 — TENANT_FACING badge on admin CRUD (UX-25)

**Pattern:** `classification="TENANT_FACING"` on a page that renders the generic `AdminCrudPanel` component backed by `/api/dynamic/xiigen-*`.

**Evidence:** FLOW-21 `DynamicFormsWorkflowsPage`, FLOW-22 `CmsPublishingPage`, FLOW-28 `BlogCmsModulesPage` — all tagged TENANT_FACING but presenting admin CRUD to tenant users.

**Correct fix:** Build a domain-specific UI for the tenant-facing surface. The admin CRUD is acceptable for back-office operations but must not be the TENANT_FACING entry point.

**Incorrect fix:** Removing the TENANT_FACING badge without building the tenant surface — the feature still needs a tenant-facing surface; the badge removal only hides the gap.

---

### FM-3 — Automated gate with manual action button (UX-23)

**Pattern:** A page for a fully automated gate (5-arbiter consensus, safety gate, design deployment gate) shows a "Publish", "Apply", or "Trigger" button. The button creates false affordance — the gate fires automatically when conditions are met.

**Evidence:** FLOW-18 `FlowCanvasPage` — "Publish Flow" button present; publication is triggered by DFS cycle detection + type compatibility validation on the server, not by the user.

**Correct fix:** Replace the button with a progress indicator showing validation running. Show the verdict (PASS / FAILED + reason) as an informational panel. If PASS, confirm the action will occur automatically — no manual trigger.

**Incorrect fix:** Disabling the button (not removing it) — a disabled button with no explanation of why it is disabled and when it will enable still fails UX-23.

---

### FM-4 — Internal IDs in tenant UI copy (UX-21)

**Pattern:** Task-type IDs (T637, T638), flow IDs (FLOW-11, FLOW-28), CF rule numbers (CF-465), or spec file paths (created by `flow-name-crud.spec.ts`) appear in headings, labels, notes columns, or status messages visible to tenant users.

**Evidence:** FLOW-23 `TemplateBuilder` headings "T637 Validate Schema", "T638 Publish Version". FLOW-24 state cards "Every task type in T421-T460 has at least one plan step". Multiple flows showing test spec file paths in the Notes column of CRUD tables.

**Correct fix for headings:** Remove T-number prefix — "T637 Validate Schema" → "Validate Schema". Move T-number to a collapsed `<details>` tray labeled "Technical reference" if needed for internal debugging.

**Correct fix for test rows:** Filter rows where `notes` field matches `/created by .*\.spec\.ts/` out of tenant-visible list renders. These are test artifacts and must not surface in production UI.

---

### FM-5 — Missing public page for implemented service (UX-20 + UX-25 variant)

**Pattern:** A server service is fully implemented and handles a user-facing request type (form submission, blog reading, consent management), but no client route exists to receive those users.

**Evidence:** FLOW-21 `FormSubmissionProcessor` handles form submissions; `publicUrl: '/forms/FRM-2026-0419-017'` in mock state; no `/forms/:schemaId` route in `App.tsx`. FLOW-28 `PublicPageRequestPipeline` assembles public blog pages for CDN delivery; no `/blog/:slug` route exists.

**Correct fix:** Before creating the page, run three pre-creation steps:

- **Step 0a** — Read `docs/sessions/FLOW-XX/UI-REFLECTION-STATE.md` to understand which processes exist, what states each can be in, and which React components already implement them. This prevents building what already exists.

- **Step 0b** — Run SK-542 (`flow-ui-examination-protocol-SKILL.md`) to load the examination record and companion documents. Then run SK-540 (`planning--product-design-context-SKILL.md`) to confirm `.impeccable.md` exists with a grammar type declared. If absent, run SK-540 Steps 1–4 now. Consult `planning--business-flows-registry.md` for the pre-declared grammar for this flow.

- **Step 0c** — Use the declared grammar type to structure the page's primary content. Consult `docs/screen-examination/MARKET-REFERENCE-CATALOG.md` §{grammar-section} for per-state rendering conventions (empty / loading / populated / error states).

Then: create the missing route and page using the declared grammar type.

**Note:** A page created without Steps 0a–0c passes FM-5's structural check (route exists, service called) but fails UX-30 (grammar not implemented) and UX-06b (PNG shows empty state) at Phase 7.

**Incorrect fix:** Creating an admin page that proxies the content — admin staff viewing form submissions is not the same as form submitters submitting forms.

---

### FM-6 — Wrong grammar for tenant-facing page (UX-30) *(NEW v1.1.0)*

**Pattern:** A TENANT_CONSUMER or PUBLIC page renders a generic Name/Status/Notes/Actions table backed by `/api/dynamic/xiigen-*`, regardless of whether the page carries a TENANT_FACING badge or has a passing FC-18 Audit Trail. The grammar type was never declared, or was declared but not implemented.

**Evidence:** FLOW-35 `MetaArbitrationEnginePage` — CRUD table shown to platform-support reviewing multi-arbiter conflicts; should be G2 VERDICT_GRID. FLOW-36 `FeatureRegistryPage` — AdminCrudPanel default despite `FeatureMatrixScreen` component existing; should be G3 CARD_LIST. FLOW-29 pre-RUN-50 — topology canvas replaced generic CRUD table after per-flow examination identified G4 as the correct grammar (now the reference implementation).

**Correct fix:**

1. Run SK-542 (`flow-ui-examination-protocol-SKILL.md`) — loads the examination record for this flow if it exists. Read the "Grammar" and "Classification" sections.
2. Run SK-540 (`planning--product-design-context-SKILL.md`) — confirm `.impeccable.md` exists at `docs/design-context/{slug}/` with the grammar type declared. If absent, run SK-540 Steps 1–4 to produce it.
3. Consult `docs/screen-examination/MARKET-REFERENCE-CATALOG.md` for the declared grammar type's visual skeleton and per-state rendering conventions.
4. Implement the declared grammar type as the page's primary content.

For CFI-05 flows (FLOW-36/37/38/39/40) where a purpose-built screen component already exists but the Page wrapper defaults to AdminCrudPanel: apply the FLOW-45 RUN-52 HistoryBootstrapPage template — `?mock=X` → BusinessStateCard, no-mock → PlatformOpsPage wrapping the purpose-built screen with populated seed data.

**Incorrect fix:** Adding a TENANT_FACING badge to the existing CRUD table. The badge asserts tenant intent but does not build the tenant surface. UX-30 blocks on the page content regardless of badge status. Passing the Audit Trail without checking UX-30 hides the gap rather than fixing it.

---

## Version history

| Version | Date | Changes |
|---|---|---|
| 1.0.0 | 2026-04-20 | Initial — 29 checks, 52-role taxonomy ref, 7 templates ref, 4 missing pages, 5 failure modes. Introduced as Gate 0m in CODE-REVIEW-PROTOCOL v1.7 and Check 15 in HOW-TO-USE-SKILLS v4.4.0. |
| 1.1.0 | 2026-04-20 | FM-5 correct fix extended with 3 pre-creation steps (Step 0a UI-REFLECTION-STATE, Step 0b SK-542+SK-540 grammar gate, Step 0c MARKET-REFERENCE-CATALOG per-state conventions); FM-6 added (wrong grammar for tenant-facing page — UX-30, cites FLOW-29/35/36 evidence, CFI-05 Page rewrite template); Gate 0m Step 3 BLOCK matrix updated with UX-06b and UX-30; Audit Trail format updated with grammar type, .impeccable.md, examination record, and SK-541 audit fields; enforced_by updated for v1.8/v4.5.0/v1.16; references updated. |

## References

| Document | Section | Relationship |
|---|---|---|
| `planning--ui-ux-compliance-SKILL.md` (SK-539 v1.1.0) | §0 (pre-design gate), §2 (31 checks), §3 (roles), §4 (scopes), §5 (templates), §6 (missing pages), §7 (FC-18 logic) | Canonical source for all check definitions — FC-18 enforces SK-539 |
| `flow-ui-examination-protocol-SKILL.md` (SK-542) | All steps | Session orchestrator — loads examination record and companion docs; routes to correct procedure |
| `planning--product-design-context-SKILL.md` (SK-540) | Steps 1–4 | Design context gate — produces .impeccable.md with grammar declared |
| `planning--screen-craft-audit-SKILL.md` (SK-541) | Layers 1–4 | Four-layer PNG audit — output feeds FC-18 Audit Trail at Phase 7 Step 6 |
| `planning--business-flows-registry.md` | Per-flow table | Pre-declared grammar types + CFI-12 flags + spec paths |
| `docs/screen-examination/REPAIR-GUIDANCE.md` | Parts 2, 3, 4 | Authoritative examination and classification protocol; Part 3 decision tree maps findings to fix types |
| `docs/screen-examination/MARKET-REFERENCE-CATALOG.md` | §1–§7 | Per-grammar per-state rendering conventions; referenced in FM-5 Step 0c and FM-6 |
| `docs/screen-examination/{slug}-examination.md` (×38) | Classification + Primary finding | Per-flow ground truth where it exists; highest-authority source for WHO/VERB/GRAMMAR |
| `XIIGEN-CODE-REVIEW-PROTOCOL v1.8` | Gate 0m | FC-18 runs as Gate 0m in Tier 1 structural pre-checks |
| `HOW-TO-USE-SKILLS v4.5.0` | Mandatory Check 15 | FC-18 runs at every ⛔ STOP that produced client pages |
| `XIIGEN-FLOW-DOCUMENT-AUTHORING-GUIDE v1.16` | Phase 7 | FC-18 Audit Trail produced at authoring time |
| `XIIGEN-SESSION-LOAD-PLAN v31` | FC gate map | FC-18 registered; next FC is FC-19 |
| `DECISIONS-LOCKED.md` | D-ROLE-1, D-ROLE-2 | Role taxonomy and screen template standard locked here |
