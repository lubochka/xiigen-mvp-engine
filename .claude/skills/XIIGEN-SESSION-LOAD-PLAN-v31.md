# XIIGEN Session Load Plan v31
## Date: 2026-04-20
## Branch: claude/vigorous-margulis
## Status: Current — supersedes v30

## What changed in v31:
##   NEW: flow-ui-examination-protocol-SKILL.md (SK-542, load_order 5.3)
##     Session orchestrator for screen examination/repair sessions
##     Loads: REPAIR-GUIDANCE + SPEC-LOCATION-MAP + MARKET-REFERENCE-CATALOG + registry
##     Conditional: fires when session scope includes examining or repairing existing React pages
##   NEW: planning--product-design-context-SKILL.md (SK-540, load_order 5.4)
##     Fires before first React page per flow · produces docs/design-context/{slug}/.impeccable.md
##     Checks examination record first · wraps interface-design + impeccable teach mode
##     Conditional: fires once per flow; skipped if .impeccable.md already present
##   NEW: planning--screen-craft-audit-SKILL.md (SK-541, Phase 7 Step 5)
##     Four-layer PNG audit: accessibility · AI slop · Nielsen H1/H2/H8/H9 · grammar (UX-30)
##     Wraps: REPAIR-GUIDANCE Parts 2/3 + impeccable critique + design-for-ai + ui-ux-pro-max
##     Fires at Phase 7 Step 5 for any session that produced React pages
##   NEW: planning--business-flows-registry.md (reference doc, no SK)
##     Maps all 48 flows to spec paths, role analysis batch, 7 grammar types, CFI notes
##   HOW-TO-USE-SKILLS bumped to v4.5.0
##     SK-542 at load_order 5.3 · SK-540 at load_order 5.4 · SK-541 at Phase 7 · Layer 10
##   planning--ui-ux-compliance-SKILL.md (SK-539) bumped to v1.1.0
##     Section 0: examination record check + 6-file read order + 7 grammar types (G1-G7)
##     Section 0.4: defers to MARKET-REFERENCE-CATALOG.md instead of inline table
##     Phase 7 Step 1 references SK-542 + SK-540
##     Phase 7 Step 5 references SK-541 + REPAIR-GUIDANCE
##     UX-06 → BLOCK (tenant/public) · UX-06b added · UX-30 added (Group H)
##   fc-18-ui-ux-compliance-gate.md bumped to v1.1.0
##     FM-5 correct fix: 3 pre-creation steps (UI-REFLECTION-STATE, SK-542+SK-540, MARKET-REFERENCE-CATALOG)
##     FM-6 added: wrong grammar for tenant-facing page (UX-30, FLOW-29/35/36 evidence)
##     Gate 0m BLOCK matrix: UX-06b and UX-30 added
##     Audit Trail format: grammar type, .impeccable.md, examination record, SK-541 audit fields
##   XIIGEN-CODEBASE-ORIENTATION-MAP bumped to v1.3
##     Q-08: STEP-1-INVARIANTS as primary source; 6-file read order; examination record first
##     Q-23: route gate added (STEP 0 verify App.tsx before examining any page)
##     Q-24 added: WHO/VERB/GRAMMAR job-to-be-done
##     Q-25 added: .impeccable.md design context check
##     Q-26 added: prior examination record check (highest authority source)
##     §4: UI/UX design intent authority hierarchy added
##   XIIGEN-DESIGN-REVIEW-PROTOCOL bumped to v1.5
##     Signal 13 added: grammar correctness for tenant-facing pages (G1-G7, CFI-05 sub-signal)
##     FLOW-29 cited as positive reference implementation; fleet table 13 columns
##   XIIGEN-CODE-REVIEW-PROTOCOL bumped to v1.8
##     Gate 0g: business-intent sub-check (examination record + user intent + role + grammar)
##     Gate 0m: UX-06b and UX-30 added to BLOCK matrix; FM-1..FM-6 reference
##     FC-18 Tier 2: business-intent elements + grammar declaration verified
##   XIIGEN-FLOW-DOCUMENT-AUTHORING-GUIDE bumped to v1.16
##     Q8 added: screen intent (examination record check + WHO/VERB/GRAMMAR before JSX)
##     Completion gate: SCREEN INTENT SERVED item added
##     Rule 35 added: Screen Intent Anchor — page anchored to user_intent before JSX
##     Phase 7 Step 1: examination record + design context verification added
##     Phase 7 Step 5: SK-541 four-layer audit + FM-6 added
##     File inventory: docs/design-context/{slug}/.impeccable.md added
##   XIIGEN-DESIGN-ARCHITECT-SESSION-GUIDE bumped to v1.8
##     Q10 added: user's job-to-be-done on React pages (examination record priority-1)
##     Mistake 23 added: building screen without reading business spec (FLOW-36 example)
##     Q10 artifact in handoff + observability
##   CFI-05 REFINED: routing sweep → Page rewrite per flow
##     Only FLOW-45 was truly route-less (CLOSED RUN-52); FLOW-36/37/38/39/40 have routes
##     but Page wrappers default to AdminCrudPanel. Fix: FLOW-45 RUN-52 template.
##   CFI-10 CLOSED: business spec read gap — root cause of 18 CRUD tables
##     Fixed by: SK-542 + SK-540 + SK-539 §0 + Q8 + Q10 + Gate 0g + Signal 13 + Rule 35
##   CFI-11 OPEN: source files not yet committed to repo (MAINTENANCE session required)
##   CFI-12 OPEN: 3 F1 spec gaps requiring Luba resolution (FLOW-04/09/34)
##   New reference documents registered in docs/screen-examination/ (6 docs + 38 exam files)
##   Total skills: 117 (+3: SK-540, SK-541, SK-542)
##   Total mandatory checks: 15 (unchanged)
##   Next available SK: SK-543
##   Next available FC: FC-19 (unchanged)
##
## What changed in v30:
##   SK-539 planning--ui-ux-compliance-SKILL.md registered (Layer 8, load_order 5.5)
##   FC-18 ui-ux-compliance gate registered (Gate 0m in CODE-REVIEW-PROTOCOL v1.7)
##   Rule 35 added — UI/UX Compliance Mandatory
##   Mandatory Check 15 added
##   CFI-09 added (4 missing public-facing client pages)

---

## What this document is

This is the top-level registry for a XIIGen session. It lists:

- The 35 absolute rules every session must honor
- The full skill inventory with current versions
- The full document registry with current versions
- The FC gate map
- The current artifact boundaries
- The current codebase state and pending work

Load order: this file first, then per-session-type Q2 skills per `HOW-TO-USE-SKILLS v4.5.0`.

---

## H0 — HUMAN OVERRIDE PROTOCOL

```
1. Luba's direct instruction in this conversation      ← ALWAYS WINS
2. Memory updates made in this conversation
3. Skills, governance rules, FC checks, V-gates
4. Claude's training defaults
```

Contradiction between levels 1 and 3: Execute first. State contradiction. Ask exception type.

---

## The 35 Absolute Rules

### Rules 1-24 — Foundation

**Rule 1 — Branch reality is ground truth.** The state of the codebase on the current branch (`claude/vigorous-margulis`) is the authoritative reality. Documentation, state files, and prior-session claims are secondary to what the code actually contains. When they conflict, code wins.

**Rule 2 — Tests must pass before completion claims.** A phase is not complete until `failures === 0` in server jest, server tsc, client tsc, and client build. Failing tests are not deferrable.

**Rule 3 — No silent overrides of locked decisions.** Locked iron rules, DNA rules, and DECISIONS-LOCKED.md entries may be overridden only with explicit Luba-approval timestamp in the overriding document.

**Rule 4 — Semantic slugs in all file paths.** Every file path uses the canonical slug from SK-430's domain name table. No FLOW-XX paths in engine-contracts, test dirs, rag-init, or source files.

**Rule 5 — Documentation artifacts ship with code.** Rule 17 documentation ships in the same commit as the code it describes.

**Rule 6 — Fabric-first external dependencies.** All external dependencies go through typed factory interfaces via `CreateAsync()`. Never direct provider imports.

**Rule 7 — NODE convergence is non-negotiable.** Every generated code unit must converge on the NODE spec via multi-model consensus. Direct generation without convergence is forbidden.

**Rule 8 — Arbiter panels have structural pre-checks first.** Every archetype's arbiter panel runs Role 8 Goal Delivery (SK-534) and Scope Isolation (SK-526) BEFORE correctness arbiters.

**Rule 9 — CF-POLICY-01 compliance.** Every BFA rule respects the cross-flow policy catalog.

**Rule 10 — Tenant isolation is iron.** Three-tier scoping honored by every read and write to shared indices.

**Rule 11 — DNA-8 before enqueue.** storeDocument happens BEFORE enqueue in every queue-driven flow.

**Rule 12 — DPO triples have cross-model validity.** chosen.model must differ from rejected.model.

**Rule 13 — MACHINE vs FREEDOM separation.** Invariant algorithms locked at deploy; tenant-tunable parameters admin-configurable via FREEDOM config.

**Rule 14 — curriculumTier non-null.** Every session, every run, every node has a curriculumTier between 1 and 5.

**Rule 15 — Principle arbiter isolation.** The principle arbiter receives only NODE output and principle catalog.

**Rule 16 — Semantic slug from SK-430 domain name table.** All file naming uses current slug table.

**Rule 17 — Every phase ships documentation artifacts.** Documentation gate script per flow slug. No phase closes without documented artifacts.

**Rule 18 — FC-29 enforces issue inventory.** Every ⛔ STOP: FIXED / DEFERRED+CARRY-FORWARD / EXCEPTION.

**Rule 19 — Test gate is absolute (P19).** `failures === 0` gate is non-negotiable.

**Rule 20 — Shadow runs before flipping traffic.**

**Rule 21 — Engine progress reporting.** Every generation run produces progress output per template.

**Rule 22 — Absolute gates on engine quality.** P17-P22 govern DPO validity, curriculum tier, arbiter isolation, shadow runs, engine progress, and test gate.

**Rule 23 — Shadow-run observability.** Comparison data persisted before verdict rendered.

**Rule 24 — V9, V10, V11, V12 gates active at all STOPs.**

### Rules 25-35 — Governance discipline (Layer 8)

**Rule 25 — Reconnaissance Before Synthesis (SK-529).** Sessions producing plans, reviews, or architect-level synthesis begin with SK-529. STATE.recon saved before synthesis. Thresholds: EXECUTOR 5/2/3, PLANNING 10/3/5, REVIEW 15/5/8, ARCHITECT 20/8/10, MATERIALIZATION 20/8/10. Wide-scope doubles all.

**Rule 26 — Wide-Scope Mode.** Triggers: "see the whole picture", "don't save tokens", "load the real state", "wide scope", uploads of ≥5 files or ≥100 KB. Thresholds double; synthesis deferred until ≥80% artifacts listed.

**Rule 27 — Claims Require Verification (SK-531).** User assertions about existing state captured in STATE.claims with PENDING_VERIFICATION. Cannot ⛔ STOP with any PENDING_VERIFICATION BLOCKING claim.

**Rule 28 — Default MATERIALIZATION When Design Exists (SK-532).** Work touching existing design/fixture/contract defaults to MATERIALIZATION. Override requires explicit written justification.

**Rule 29 — Session Mode Declaration (SK-535).** Declare exactly one mode: ARCHITECT | PLANNER | REVIEWER | EXECUTOR | MATERIALIZATION. Mode drift triggers immediate ⛔ STOP.

**Rule 30 — Goal Context Loading (SK-536).** User's goal captured verbatim. Never paraphrased. Two-layer Goal Reminder Block at every ⛔ STOP (session goal + product goal).

**Rule 31 — Multi-Goal Plans Must Declare Lanes.** 2+ user goals → lane structure mandatory with own sequence, gate, and verification per lane.

**Rule 32 — Architect Habits Discipline (SK-538 v1.2.0).** Every ARCHITECT, PLANNER, REVIEWER, or MATERIALIZATION session loads SK-538 at load_order 6. 30-habit catalog. Doc-first loop on every concern.

**Rule 33 — Response Construction Protocol.** Every response in a session with declared mode passes through the seven-step protocol before send. Mandatory Check 14 at every ⛔ STOP.

**Rule 34 — Single Counter Authority.** `docs/state/INFRASTRUCTURE-FLOWS-STATE-v6.json` is canonical for all artifact counters. SESSION-LOAD-PLAN §Artifact Boundaries is a cache. Before consuming any counter, read the canonical file. Canonical wins on any discrepancy.

**Rule 35 — UI/UX Compliance Mandatory.** Every session that produces React pages must run the full UI/UX compliance sequence and Phase 7 before closing.

**Sequence for every React page (load_order 5.3 → 5.4 → 5.5):**
1. SK-542 (examination protocol, 5.3) — check prior examination record; load companion docs; routes session to SK-540 or SK-541
2. SK-540 (design context, 5.4) — check examination record, then .impeccable.md; produce .impeccable.md with grammar declared
3. SK-539 v1.1.0 (compliance, 5.5) — Section 0 first (examination record + design context + 6-file read + grammar), then role questions Q1–Q4

**Phase 7 (after pages built, before STOP):**
- Step 1: SK-542 + SK-540 verification (examination record, .impeccable.md)
- Step 5: SK-541 four-layer audit (accessibility, AI slop, Nielsen, grammar/UX-30)
- Step 6: FC-18 Audit Trail per page

**Mandatory Check 15** verifies FC-18 Audit Trail, no unclosed BLOCKs, grammar type declared for every TENANT_CONSUMER or PUBLIC page, .impeccable.md present, SK-541 AUDIT record attached.

Rule 35 violation: React pages committed without the sequence → Check 15 fails → STOP does not fire.

---

## STATE Schema

### STATE.productGoal — permanent product-level anchor

```json
{
  "productGoal": {
    "statement": "A startup founder opens XIIGen, sees all 48 flows, installs what they need, and their product works.",
    "flowCount": 48,
    "implementedRef": "docs/sessions/47-FLOW-CURRENT-STATE-MASTER.md",
    "productSpecRef": "docs/XIIGEN_PRODUCT_SPECS.md",
    "currentGapsRef": "CARRY-FORWARD-ISSUES.md CFI-01..CFI-12"
  }
}
```

**Two-layer Goal Reminder Block at every ⛔ STOP:**
```
Goal reminder — session goal (verbatim): "[STATE.goalContext.statement]"
Goal reminder — product goal (permanent): "A startup founder opens XIIGen, sees all 48 flows,
  installs what they need, and their product works."
Session mode: [ARCHITECT | PLANNER | REVIEWER | EXECUTOR | MATERIALIZATION]
This round advances the session goal by: [verb of state change + before/after]
This round does not regress the product goal because: [one sentence]
```

### STATE.goalContext — session-specific goal

```json
{
  "goalContext": {
    "statement": "[verbatim user goal — never paraphrased]",
    "elements": ["G1: ...", "G2: ...", "G3: ..."],
    "capturedAt": "turn 1"
  }
}
```

### STATE.mode — session mode declaration

```json
{
  "mode": {
    "declared": "ARCHITECT",
    "justification": "[1-2 sentences]",
    "scopeOutReminder": "[explicit list of what this session will NOT produce]"
  }
}
```

### STATE.recon — reconnaissance evidence base

```json
{
  "recon": {
    "sessionType": "ARCHITECT",
    "wideScope": false,
    "threshold": { "fileReads": 20, "grepCounts": 8, "excerpts": 10 },
    "actual": { "fileReads": 0, "grepCounts": 0, "excerpts": 0 },
    "thresholdMet": false,
    "tier0": { "completed": false, "flowNamed": null }
  }
}
```

### STATE.claims — user assertions about existing state

```json
{
  "claims": [
    { "id": "C1", "assertion": "[verbatim user claim]", "status": "PENDING_VERIFICATION" }
  ]
}
```

---

## Document Registry

| Document | Current version | Scope |
|----------|-----------------|-------|
| `HOW-TO-USE-SKILLS` | **v4.5.0** | Top-level governance — skill load order, FC gates, rules, mandatory checks |
| `XIIGEN-SESSION-LOAD-PLAN` | **v31 (this file)** | Rule registry, STATE schema, artifact boundaries, test counts |
| `XIIGEN-DESIGN-ARCHITECT-SESSION-GUIDE` | **v1.8** | Q0-Q10 + Step 5; Mistakes 1-23 |
| `XIIGEN-CODE-REVIEW-PROTOCOL` | **v1.8** | Per-plan review gates 0a-0m; FC-1..FC-18; Gate 0g business-intent sub-check |
| `XIIGEN-DESIGN-REVIEW-PROTOCOL` | **v1.5** | Fleet review 13 signals; S13 grammar correctness |
| `XIIGEN-RESPONSE-CONSTRUCTION-PROTOCOL` | v1.0 | Response composition — 7 steps |
| `XIIGEN-FLOW-DOCUMENT-AUTHORING-GUIDE` | **v1.16** | Rules 1-35; Q8 screen intent; SCREEN INTENT SERVED gate; Phase 7 v1.1.0; Rule 35 Screen Intent Anchor |
| `XIIGEN-CODEBASE-ORIENTATION-MAP` | **v1.3** | Q-08..Q-26; UI/UX design intent authority hierarchy; examination record as ground truth |
| `XIIGEN-GOLDEN-RULE` | v1 | Meta-principle: produce for the consumer |
| `XIIGEN-V2-MASTER-PLAN` | current | Engine evolution roadmap |
| `DECISIONS-LOCKED` | rolling | Locked architectural decisions |
| `HISTORY-RAG-INDEX` | v1.0 | 202-decision navigation index; `docs/sessions/historyRag/` |
| `ARCHITECTURAL-DECISION-ADDENDUM` | v1.0 | "Give AI the minimum to decide"; `docs/flow-plan-preparation/` |
| `SKILL-INDEX` | current | Full skill catalog |
| `CARRY-FORWARD-ISSUES` | rolling | Issues tracked across sessions |
| `DOCUMENT-AUTHORITY-MAP` | current | Authority hierarchy |
| `planning--ui-ux-compliance-SKILL.md` (SK-539) | **v1.1.0** | 31 UX checks (UX-01..UX-30); Section 0 pre-design gate; 7 grammar types G1-G7; MARKET-REFERENCE-CATALOG reference |
| `fc-18-ui-ux-compliance-gate.md` (FC-18) | **v1.1.0** | Gate 0m definition; FM-1..FM-6; UX-06b + UX-30 in BLOCK matrix; SK-541 audit field in Audit Trail |
| `flow-ui-examination-protocol-SKILL.md` (SK-542) | **v1.0.0 NEW** | Session orchestrator; loads REPAIR-GUIDANCE + SPEC-LOCATION-MAP + MARKET-REFERENCE-CATALOG + registry |
| `planning--product-design-context-SKILL.md` (SK-540) | **v1.0.0 NEW** | Design context gate; examination record check; .impeccable.md production |
| `planning--screen-craft-audit-SKILL.md` (SK-541) | **v1.0.0 NEW** | Four-layer PNG audit; REPAIR-GUIDANCE Part 2/3 authoritative protocol |
| `planning--business-flows-registry.md` | **v1.0 NEW** | All 48 flows; 7 grammar types; CFI-12 flags; FLOW-29 reference implementation |
| `docs/screen-examination/REPAIR-GUIDANCE.md` | v1.0 | 8-part examination + classification protocol (authoritative) |
| `docs/screen-examination/SPEC-LOCATION-MAP.md` | v1.0 | 6-file read order + exact paths per flow |
| `docs/screen-examination/SPEC-LOCATION-INDEX.md` | v1.0 | Per-flow file existence inventory |
| `docs/screen-examination/MARKET-REFERENCE-CATALOG.md` | v1.0 | Per-flow real-world platform refs + per-state rendering |
| `docs/screen-examination/SPEC-LOCATION-MAP-ADDENDUM-FLOW36-45.md` | v1.0 | CFI-05 Potemkin UI corrections |
| `docs/screen-examination/PNG-INVENTORY.md` | v1.0 | Per-PNG verdict catalog (628 fleet + 109 role-coverage PNGs) |
| `docs/screen-examination/{slug}-examination.md` (×38) | v1.0 | Per-flow examination records (ground truth for WHO/VERB/GRAMMAR) |

---

## Skill Inventory — 117 skills + 1 protocol

### Layer 1 — Engine internals (47 skills, SK-426..SK-470): COMPLETE
### Layer 2 — Engine lifecycle (21 skills, SK-471..SK-491): COMPLETE
### Layer 3 — Product lifecycle (13 skills, SK-492..SK-504): COMPLETE
### Layer 4 — Self-awareness (5 skills, SK-505..SK-509): COMPLETE
### Layer 5 — Dynamic decision architecture (10 skills, SK-510..SK-519): COMPLETE
### Layer 6 — AI-driven topology planning (6 skills, SK-520..SK-525): COMPLETE
### Layer 6x — Scope isolation (1 skill, SK-526): COMPLETE
### Layer 7 — Pipeline position (1 skill, SK-528): COMPLETE

### Layer 8 — Governance discipline (11 skills, SK-529..SK-539)

| Skill | Load order | Version | Purpose |
|-------|------------|---------|---------|
| SK-529 Reconnaissance Gate | 0 | v2.0.0 | Evidence before synthesis; XIIGen Tier-0 search list |
| SK-535 Session Mode Declaration | 1 | v1.0.0 | 5 modes with drift detection |
| SK-536 Goal Context Persistence | 2 | v1.0.0 | Verbatim goal anchor; two-layer block |
| SK-531 Claim-as-Hypothesis | 3 | — | User claims captured as PENDING_VERIFICATION |
| SK-537 Design Artifact Completeness | 3 | — | Check artifacts exist + populated |
| SK-532 Materialization Session Type | 4 | — | 1-5 task constraint |
| SK-533 MVP Round-Trip Verification | 4 | — | Tenant-observable round-trip |
| SK-530 Specificity Calibration | 5 | — | Threshold per session type |
| SK-534 Goal Delivery Completeness | 5 | — | FIRST arbiter in every panel |
| SK-538 Architect Habits Classifier | 6 | v1.2.0 | 30-habit catalog |
| SK-539 UI/UX Compliance | 5.5 | **v1.1.0** | 31 checks UX-01..UX-30; Section 0 pre-design gate; 7 grammar types G1-G7; MARKET-REFERENCE-CATALOG reference |

### Layer 9 — Response construction (1 protocol): COMPLETE

`XIIGEN-RESPONSE-CONSTRUCTION-PROTOCOL v1.0`, load_order 7.

### Layer 10 — Screen examination + design context (3 skills, SK-540..SK-542): COMPLETE *(NEW v31)*

| Skill | Load order | Version | Purpose |
|-------|------------|---------|---------|
| SK-542 Flow UI Examination Protocol | 5.3 | v1.0.0 | Session orchestrator for screen examination/repair; loads REPAIR-GUIDANCE + SPEC-LOCATION-MAP + MARKET-REFERENCE-CATALOG + registry; routes to SK-540 or SK-541; one-finding-per-run discipline |
| SK-540 Product Design Context | 5.4 | v1.0.0 | Pre-design gate; checks examination record first; produces docs/design-context/{slug}/.impeccable.md with grammar declared |
| SK-541 Screen Craft Audit | Phase 7 Step 5 | v1.0.0 | Four-layer PNG audit (accessibility, AI slop, Nielsen H1/H2/H8/H9, grammar UX-30); REPAIR-GUIDANCE Parts 2/3 as authoritative protocol |

---

## FC Gate Map

### FC-1 through FC-13 — Plan correctness battery (SK-410 v2.0)

FC-1 goal coverage, FC-2 evidence grounding, FC-3 architectural coherence, FC-4 pipeline contract, FC-5 naming convention, FC-6 iron rules, FC-7 DNA compliance, FC-8 test gate integrity, FC-9 issue inventory, FC-10 cross-document propagation, FC-11 overview-detail match, FC-12 principles compliance, FC-13 documentation per Rule 17.

### FC-14 Goal Delivery Completeness (SK-534)

Runs FIRST in plan review. Every goal element mapped to ≥1 plan turn.

### FC-15 Design Artifact Populated (SK-537)

Runs FIRST alongside FC-14. Every referenced artifact passes SK-537 Checks 1-2.

### FC-16 Architect Habits Discipline (SK-538 v1.2.0)

Runs FIRST alongside FC-14 and FC-15. Class-a unresolved after documented doc-search → BLOCK.

### FC-17 Response Construction Protocol Compliance

Runs at plan review. Verifies Steps 1, 2, 3, 5, 6 artifacts exist from plan-authoring session.

### FC-18 UI/UX Compliance (SK-539 v1.1.0) — updated v31

Runs at plan review as Gate 0m in CODE-REVIEW-PROTOCOL v1.8 (Tier 1 structural pre-check)
and at ⛔ STOP as Mandatory Check 15. Verifies:
(a) all React pages answer Q1–Q4 role questions;
(b) BLOCK check matrix (UX-01..UX-30 applicable subset) passes — including UX-06b and UX-30;
(c) grammar type declared (G1–G7) for every TENANT_CONSUMER or PUBLIC page;
(d) .impeccable.md present at docs/design-context/{slug}/ for every flow producing pages;
(e) SK-541 AUDIT record attached to every Audit Trail;
(f) Phase 7 declared and executed;
(g) missing-page registry addressed for FLOW-20/21/28/48.

FC-18 Audit Trail format: `fc-18-ui-ux-compliance-gate.md v1.1.0` §4.

### FC-22 through FC-31 — Execution-layer

Build-time, test-time, commit-time, documentation-artifact gates.

### FC-32 Scope Isolation Arbiter Present (SK-526)

Every arbiter-panel.handler or multi-generate.handler node has scope_isolation arbiter.

---

## Mandatory Checks Before Every ⛔ STOP (15 checks)

0. **Preflight gate (SK-457)** — at Claude Code session start
1. **Output contract verification (SK-448)** — re-quote Q4, match shape element-by-element
2. **Mission progress check (SK-445)** — first section of every PHASE-COMPLETE
3. **Issue inventory (FC-29)** — FIXED / DEFERRED+CARRY-FORWARD / EXCEPTION only
4. **Test gate (P19)** — failures === 0
5. **FC-32 scope isolation arbiter** — present in every node
6. **Pipeline contract check (SK-528)** — Q0a/b/c/d all aligned
7. **Documentation artifacts gate (Rule 17)** — JSON + MD companions, PNGs for tenant-facing
8. **Reconnaissance evidence (SK-529 v2.0.0)** — STATE.recon exists, threshold met, Tier-0 complete
9. **Claims verified (SK-531)** — no PENDING_VERIFICATION BLOCKING claims
10. **Goal reminder block (SK-536)** — verbatim session goal + permanent product goal at top of STOP
11. **Goal delivery verdict (SK-534)** — plan reviews only, FC-14 APPROVED on all goals
12. **Architect habits discipline (SK-538 v1.2.0 / FC-16)** — 30-habit scan, doc-first loop
13. **Tools before person (N-A13)** — consult XIIGEN-CODEBASE-ORIENTATION-MAP v1.3 §3 for XIIGen-specific commands
14. **Response Construction Protocol compliance (FC-17)** — Steps 1, 2, 3, 5, 6 artifacts present
15. **UI/UX compliance (FC-18)** — if session produced ≥1 React page:
    - FC-18 Audit Trail at `docs/ux-review/{slug}/FC-18-AUDIT-TRAIL.md` for every page
    - All BLOCK findings cleared (no unclosed BLOCK)
    - Grammar type declared (G1–G7) for every TENANT_CONSUMER or PUBLIC page (UX-30)
    - .impeccable.md present at `docs/design-context/{slug}/`
    - SK-541 AUDIT record attached to every Audit Trail
    - Screen template declared (T-1..T-7) or deviation documented
    - If implementing FLOW-20/21/28/48: corresponding missing page created
    - If no React pages: declare "No React pages — Check 15 N/A"

---

## Artifact Boundaries (current as of 2026-04-20)

**⚠ RULE 34 NOTICE:** All counters below are a cache sourced from
`docs/state/INFRASTRUCTURE-FLOWS-STATE-v6.json` on 2026-04-17.
**Before consuming any counter, read the canonical file.** If the canonical file
disagrees with these numbers, the canonical file wins. See Rule 34.

```bash
python3 -c "
import json
d = json.load(open('docs/state/INFRASTRUCTURE-FLOWS-STATE-v6.json'))
print('Canonical source:', d.get('version'), '| last updated:', d.get('lastUpdated'))
for k, v in d.items():
    if isinstance(v, (str, int)) and k not in ('version','description','lastUpdated','previousVersion'):
        print(k, ':', v)
"
```

- Next task ID: **T=T605** (per `INFRASTRUCTURE-FLOWS-STATE-v6.json`)
- Next factory ID: **F=F1601**
- Next BFA rule ID: **CF=CF-809**
- Next skill ID: **SK=SK-543** (SK-540, SK-541, SK-542 consumed in v31)
- Next FC gate ID: **FC=FC-19** (unchanged; FC-18 consumed in v30)

### Test counts (post-MVP-v3)

- Server jest: **10,617 passed, 0 failures**
- Server tsc: 0 errors
- Server lint: 0 errors, 0 warnings
- Client tsc: 0 errors
- Client build: success

### Branch state

- **Branch:** `claude/vigorous-margulis`
- **Pending work:** per-flow Tracks A-E execution; Track A topology creation; CFI-11 MAINTENANCE session

---

## Current Carry-Forward Issues

- **CFI-01** — FLOW-46 SNAPSHOTS directory empty. Blocks fleet review Signal 4 for FLOW-46.
- **CFI-02** — FLOW-47 PNG evidence absent. JSON snapshots present but no visual proof.
- **CFI-03** — 33 flows missing `contracts/topologies/{slug}.topology.json`. Track A scope.
- **CFI-04** — 22 flows with DEMONSTRABLY_WRONG IMPL-STATE per RECONCILIATION-MASTER.
- **CFI-05** — **REFINED (from v30):** 5 flows (FLOW-36/37/38/39/40) have routes in App.tsx but Page wrappers default to AdminCrudPanel despite purpose-built screen components existing. **This is a Page rewrite problem, not a routing problem.** FLOW-45 was the only truly route-less flow — CLOSED in RUN-52 via HistoryBootstrapPage. Fix per remaining flow: apply FLOW-45 RUN-52 template (`?mock=X` → BusinessStateCard, no-mock → PlatformOpsPage wrapping purpose-built screen). Bundled with each flow's per-batch examination run.
  - FLOW-36 → FeatureMatrixScreen (G3 CARD_LIST)
  - FLOW-37 → StackPortingScreen (G2 VERDICT_GRID)
  - FLOW-38 → RagQualityScreen (G6 DASHBOARD)
  - FLOW-39 → OssCurriculumScreen (G1 PROGRESS_STRIP)
  - FLOW-40 → ClientPushScreen (G3 CARD_LIST)
- **CFI-06** — 423 events emitted with no consumer; 18 events consumed. Observability gap.
- **CFI-07** — FLOW-32 marketplace: 20/20 contracts, 0 unit tests, Potemkin UI.
- **CFI-08** — 15 design simulations have empty DR triples. Dedicated DR-authoring session required per flow.
- **CFI-09** — 4 missing public-facing client pages with fully implemented server services:
  (1) FLOW-20: `/settings/privacy` — ConsentGateEnforcer implemented, no client route
  (2) FLOW-21: `/forms/:schemaId` — FormSubmissionProcessor implemented, publicUrl in mock state, no route
  (3) FLOW-28: `/blog` and `/blog/:slug` — PublicPageRequestPipeline (18 services), zero public routes
  (4) FLOW-48: `/settings/language` — UserPreferencesManager implemented, no route
  Tracked by SK-539 §6 and Rule 35. All four must be created before fleet Signal 12 PASS.
- **CFI-10** — **CLOSED (v31):** No session start document instructed Claude Code to read the business spec before designing React pages. Root cause of 18 flows shipping CRUD tables. Resolved by: SK-542 (examination protocol) + SK-540 (design context gate) + SK-539 v1.1.0 Section 0 + Q8 (authoring guide) + Q10 (architect guide) + Gate 0g business-intent sub-check + Signal 13 + Rule 35.
- **CFI-11** — **OPEN (NEW v31):** Source files not yet committed to repo. Required in one MAINTENANCE session:
  (a) Copy `docs/business-flows/*.md` from business_flows.zip (FLOW-01..34)
  (b) Copy `docs/design-reviews/ROLE-ANALYSIS-BATCH-NN.md` (10 batch files)
  (c) Copy `docs/screen-examination/` contents from screen-examination.zip (6 companion docs + 38 examination files)
  (d) Commit `flow-ui-examination-protocol-SKILL.md` to `.claude/skills/`
  (e) Commit `planning--product-design-context-SKILL.md` to `.claude/skills/`
  (f) Commit `planning--screen-craft-audit-SKILL.md` to `.claude/skills/`
  Until CFI-11 is resolved: SK-542/SK-540/SK-541 load but companion doc paths return empty. Signal 13 will show MISSING for all flows.
- **CFI-12** — **OPEN (NEW v31):** 3 F1 spec gaps require Luba's resolution before any UI design work on these flows:
  - FLOW-04: F1 says DPO capture; slug + 31 PNGs + 4 pages say event attendance
  - FLOW-09: F1 says RAG pattern extraction; slug + 32 PNGs + 5 pages say ticketing
  - FLOW-34: F1 says AI Agent Orchestration; slug + 14 PNGs + pages say plugin marketplace
  All three flows followed semantic slug (Rule 16) correctly. Either F1 is stale (written before flow scope changed) or flows were repurposed without F1 update. **BLOCKED:** no UI design work on FLOW-04/09/34 until Luba confirms direction.

---

## Planning Pipeline Summary

```
Load order at every session start:

0    SK-529 Reconnaissance Gate v2.0.0   (MANDATORY, ALL sessions — Tier-0 for ARCHITECT)
1    SK-535 Session Mode Declaration     (MANDATORY for ARCHITECT/PLANNER/REVIEWER/MATERIALIZATION)
2    SK-536 Goal Context Persistence     (MANDATORY for sessions with user-stated goal)
3    SK-531 Claim-as-Hypothesis          (if claims present)
3    SK-537 Design Artifact Completeness (if artifacts referenced)
4    SK-532 Materialization Session Type (if MATERIALIZATION)
4    SK-533 MVP Round-Trip Verification  (if tenant-facing)
5    SK-530 Specificity Calibration      (before any STOP)
5    SK-534 Goal Delivery Completeness   (FIRST arbiter in every panel)
5    SK-528 Pipeline Position Check      (if GENERATION/PLANNING/MATERIALIZATION)
5.3  SK-542 Flow UI Examination Protocol (if examining/repairing existing React pages)
5.4  SK-540 Product Design Context       (if first React page for flow + .impeccable.md absent)
5.5  SK-539 UI/UX Compliance v1.1.0      (if session produces React pages — Section 0 first)
6    SK-538 Architect Habits v1.2.0      (if ARCHITECT/PLANNER/REVIEWER/MATERIALIZATION)
7    RESPONSE-CONSTRUCTION-PROTOCOL      (MANDATORY if mode declared)
8    SK-526 Scope Isolation Arbiter      (if arbiter panels)

     SK-541 Screen Craft Audit           (Phase 7 Step 5, if session produced React pages)

For ARCHITECT sessions: after SK-529 Tier-0, consult XIIGEN-CODEBASE-ORIENTATION-MAP v1.3
§2 and §3 if question class falls outside Tier-0. Q-26/Q-25/Q-24/Q-23 STEP 0 for React pages.

Then session-type-specific skills per Q2 table in HOW-TO-USE-SKILLS v4.5.0.
```

---

## Layer Summary

```
Layer 1 — Engine internals (47 skills, SK-426..SK-470):              COMPLETE
Layer 2 — Engine lifecycle (21 skills, SK-471..SK-491):              COMPLETE
Layer 3 — Product lifecycle (13 skills, SK-492..SK-504):             COMPLETE
Layer 4 — Self-awareness (5 skills, SK-505..SK-509):                 COMPLETE
Layer 5 — Dynamic decision architecture (10 skills, SK-510..SK-519): COMPLETE
Layer 6 — AI-driven topology planning (6 skills, SK-520..SK-525):    COMPLETE
Layer 6x — Scope isolation (1 skill, SK-526):                        COMPLETE
Layer 7 — Pipeline position (1 skill, SK-528):                       COMPLETE
Layer 8 — Governance discipline (11 skills, SK-529..SK-539):         COMPLETE
          SK-539 v1.1.0 — 31 UX checks (UX-01..UX-30), Section 0 pre-design gate,
                          7 grammar types (G1-G7), MARKET-REFERENCE-CATALOG reference
Layer 9 — Response construction (1 protocol, v1.0):                  COMPLETE
Layer 10 — Screen examination + design context (3 skills):           COMPLETE (NEW v31)
          SK-540 v1.0.0 — product design context
          SK-541 v1.0.0 — screen craft audit
          SK-542 v1.0.0 — flow UI examination protocol

Reference — XIIGEN-CODEBASE-ORIENTATION-MAP v1.3 (not a skill)
Reference — planning--business-flows-registry.md (not a skill)
Reference — docs/screen-examination/ (6 companion docs + 38 examination files)

Total: 117 skills + 1 protocol + reference documents
Next available: SK-543
Next available FC: FC-19
```

---

## Change History

- v16 and prior — historical
- v17-v22 — early Layer 8 rollout
- v23 — SK-531, SK-537 added
- v24 — artifact-boundary audit after MVP v3 turn 6
- v25 — SK-538 v1.0.0 (17 habits); FC-16; Rule 32; 12 mandatory checks
- v26 — SK-538 v1.1.0 (25 habits); 5 companion documents bumped
- v27 — SK-538 v1.2.0 (30 habits); RESPONSE-CONSTRUCTION-PROTOCOL v1.0; Rule 33; FC-17; Check 14; 14 mandatory checks
- v28 — Rule 34 (single counter authority); STATE schema; STATE.productGoal; ORIENTATION-MAP v1.0; SK-529 v2.0.0
- v29 — HISTORY-RAG-INDEX v1.0; ARCHITECTURAL-DECISION-ADDENDUM v1.0; DESIGN-ARCHITECT-GUIDE v1.6; CFI-08
- **v30** — SK-539 v1.0.0; FC-18 v1.0.0; Rule 35; Check 15; CFI-09; FLOW-48 registry; CODE-REVIEW v1.7; DESIGN-REVIEW v1.4; AUTHORING-GUIDE v1.15; ARCHITECT-GUIDE v1.7; HOW-TO v4.4.0; 15 mandatory checks
- **v31** — SK-540 v1.0.0 + SK-541 v1.0.0 + SK-542 v1.0.0 (Layer 10); planning--business-flows-registry.md; SK-539 → v1.1.0; FC-18 → v1.1.0; CODE-REVIEW → v1.8 (Gate 0g business-intent sub-check); DESIGN-REVIEW → v1.5 (Signal 13 grammar correctness); AUTHORING-GUIDE → v1.16 (Q8 + Rule 35 + SCREEN INTENT SERVED); ARCHITECT-GUIDE → v1.8 (Q10 + Mistake 23); ORIENTATION-MAP → v1.3 (Q-24/Q-25/Q-26 + UI/UX authority hierarchy); HOW-TO → v4.5.0; CFI-05 refined (Page rewrite, not routing sweep; FLOW-45 CLOSED); CFI-10 CLOSED; CFI-11 OPEN; CFI-12 OPEN; 6 docs/screen-examination/ companion docs + 38 examination records registered; SK-543 next; FC-19 next

---

## Observability

At every session close:

- Rules 1-35 all honored or explicitly flagged with Luba approval
- All loaded skills at current versions per Document Registry
- Every ⛔ STOP passed all 15 mandatory checks
- Every FC gate that applied fired and produced a verdict
- Artifact boundaries updated if any SK, FC, T, F, CF IDs consumed — canonical file read first per Rule 34
- Carry-forward issues updated with any new CFI or status change
- STATE.productGoal.statement referenced in every Goal Reminder Block
- For React page sessions: SK-542 → SK-540 → SK-539 sequence followed; FC-18 Audit Trail present; .impeccable.md present; SK-541 audit attached

---

## Cross-references

- **HOW-TO-USE-SKILLS v4.5.0** — primary governance document; loads this registry
- **DESIGN-ARCHITECT-SESSION-GUIDE v1.8** — Q0-Q10 + Step 5; Mistakes 1-23
- **XIIGEN-CODEBASE-ORIENTATION-MAP v1.3** — Q-08..Q-26; UI/UX design intent authority hierarchy
- **CODE-REVIEW-PROTOCOL v1.8** — per-plan review; Gate 0g business-intent sub-check
- **DESIGN-REVIEW-PROTOCOL v1.5** — fleet review; Signal 13 grammar correctness
- **RESPONSE-CONSTRUCTION-PROTOCOL v1.0** — response composition
- **FLOW-DOCUMENT-AUTHORING-GUIDE v1.16** — Q8 screen intent; Rule 35; Phase 7 v1.1.0
- **GOLDEN-RULE v1** — produce for the consumer
- **DOCUMENT-AUTHORITY-MAP** — authority hierarchy
- **SKILL-INDEX** — full skill catalog
- **CARRY-FORWARD-ISSUES** — open items
- **DECISIONS-LOCKED** — locked architectural decisions
- **HISTORY-RAG-INDEX v1.0** — 202-decision navigation index
- **ARCHITECTURAL-DECISION-ADDENDUM v1.0** — governing question reference
- **planning--business-flows-registry.md** — 48-flow grammar lookup; CFI-12 flags
- **docs/screen-examination/REPAIR-GUIDANCE.md** — 8-part examination + classification protocol
- **docs/screen-examination/MARKET-REFERENCE-CATALOG.md** — per-flow platform refs + per-state rendering
- **docs/screen-examination/{slug}-examination.md (×38)** — per-flow examination records (ground truth)

---

## End of Session Load Plan v31
