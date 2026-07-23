# XIIGEN Session Load Plan v30
## Date: 2026-04-20
## Branch: claude/vigorous-margulis
## Status: Current — supersedes v29
## What changed in v30:
##   SK-539 planning--ui-ux-compliance-SKILL.md registered (Layer 8, load_order 5.5)
##     29 checks UX-01..UX-29, 52-role taxonomy, 12 visibility scopes,
##     7 screen templates T-1..T-7, 4 missing-page registry entries
##   FC-18 ui-ux-compliance gate registered (Gate 0m in CODE-REVIEW-PROTOCOL v1.7)
##   Rule 35 added — UI/UX Compliance Mandatory
##   Mandatory Check 15 added (FC-18 at every ⛔ STOP that produced React pages)
##   Document Registry updated: 9 documents bumped to new versions
##   FLOW-48 (i18n-translation) registered — was absent from v29
##   CFI-09 added (4 missing public-facing client pages)
##   Planning Pipeline updated (load_order 5.5 for SK-539)
##
## What changed in v29:
##   HISTORY-RAG-INDEX v1.0 (202 decisions, 13 batches A-L, 12 clusters) registered
##   ARCHITECTURAL-DECISION-ADDENDUM v1.0 registered
##   DESIGN-ARCHITECT-SESSION-GUIDE bumped to v1.6 (Q9 Step 5, Mistake 21)
##   ORIENTATION-MAP bumped to v1.1 (Q-21, Q-22)
##   D-HIST-001..008 appended to DECISIONS-LOCKED.md
##   CFI-08 added (15 flows with empty DR triples)

---

## What this document is

This is the top-level registry for a XIIGen session. It lists:

- The 34 absolute rules every session must honor
- The full skill inventory with current versions
- The full document registry (skills, protocols, guides) with current versions
- The FC gate map
- The current artifact boundaries (next SK, next FC, next task/factory IDs)
- The current codebase state (test counts, branch position, pending work)

Load order: this file first, then per-session-type Q2 skills per `HOW-TO-USE-SKILLS v4.3.0`.

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

## The 34 Absolute Rules

### Rules 1-24 — Foundation

**Rule 1 — Branch reality is ground truth.** The state of the codebase on the current branch (`claude/vigorous-margulis`) is the authoritative reality. Documentation, state files, and prior-session claims are secondary to what the code actually contains. When they conflict, code wins.

**Rule 2 — Tests must pass before completion claims.** A phase is not complete until `failures === 0` in server jest, server tsc, client tsc, and client build. Failing tests are not deferrable.

**Rule 3 — No silent overrides of locked decisions.** Locked iron rules, DNA rules, and DECISIONS-LOCKED.md entries may be overridden only with explicit Luba-approval timestamp in the overriding document.

**Rule 4 — Semantic slugs in all file paths.** Every file path uses the canonical slug from SK-430's domain name table. No FLOW-XX paths in engine-contracts, test dirs, rag-init, or source files.

**Rule 5 — Documentation artifacts ship with code.** Rule 17 documentation (business topology JSON + MD companion, design-reasoning JSON, contract JSON, arbiters NDJSON, DC tests, SEED entries) ships in the same commit as the code it describes.

**Rule 6 — Fabric-first external dependencies.** All external dependencies go through typed factory interfaces via `CreateAsync()`. Never direct provider imports.

**Rule 7 — NODE convergence is non-negotiable.** Every generated code unit must converge on the NODE spec via multi-model consensus. Direct generation without convergence is forbidden.

**Rule 8 — Arbiter panels have structural pre-checks first.** Every archetype's arbiter panel runs Role 8 Goal Delivery (SK-534) and Scope Isolation (SK-526) BEFORE correctness arbiters.

**Rule 9 — CF-POLICY-01 compliance.** Every BFA rule respects the cross-flow policy catalog; BFA rules with flow-scope collisions are rejected.

**Rule 10 — Tenant isolation is iron.** Three-tier scoping (PRIVATE | MODULE_SCOPED | GLOBAL) honored by every read and write to shared indices. Cross-tenant read without authorized scope-switch is a hard reject.

**Rule 11 — DNA-8 before enqueue.** storeDocument happens BEFORE enqueue in every queue-driven flow. Consumers that enqueue before storing fail the quality arbiter.

**Rule 12 — DPO triples have cross-model validity.** A DPO triple with chosen.model === rejected.model is invalid; both providers must differ for the triple to count as teaching data.

**Rule 13 — MACHINE vs FREEDOM separation.** Invariant algorithms (MACHINE) are locked at deploy; tenant-tunable parameters (FREEDOM) are admin-configurable via the FREEDOM config document. Misclassification between the two is a fleet-level error.

**Rule 14 — curriculumTier non-null.** Every session, every run, every node has a curriculumTier between 1 (ROUTING) and 5 (SCHEDULED). Null curriculumTier fails V9-003.

**Rule 15 — Principle arbiter isolation.** The principle arbiter receives only the NODE output and the principle catalog — never the full plan context. Shared context contaminates the verdict.

**Rule 16 — Semantic slug from SK-430 domain name table.** All file naming uses the current slug table. Stale slugs from pre-v1.1.0 must be updated before new code references them.

**Rule 17 — Every phase ships documentation artifacts.** Pre-delivery: run documentation gate script per flow slug. No phase closes without its documented artifacts.

**Rule 18 — FC-29 enforces issue inventory.** Every ⛔ STOP presents ISSUE INVENTORY: FIXED / DEFERRED+CARRY-FORWARD / EXCEPTION. Pre-existing items may not be marked FIXED unless genuinely resolved.

**Rule 19 — Test gate is absolute (P19).** `failures === 0` gate is non-negotiable. Pre-existing test failures block completion claims.

**Rule 20 — Shadow runs before flipping traffic.** Any change affecting generation behavior runs in shadow mode, produces comparison data, and is reviewed before primary traffic flips. No silent cuts.

**Rule 21 — Engine progress reporting.** Every generation run produces progress output per the engine-progress-template with phase, percent, current action, and ETA.

**Rule 22 — Absolute gates on engine quality.** P17-P22 govern DPO validity, curriculum tier, arbiter isolation, shadow runs, engine progress, and test gate. Each is non-overridable by session-level governance.

**Rule 23 — Shadow-run observability.** Shadow-run comparison data is persisted to xiigen-shadow-runs before the shadow-run verdict is rendered.

**Rule 24 — V9, V10, V11, V12 gates active at all STOPs.** These gates enforce cross-model DPO, test integrity, evidence grounding, and output contract match at every ⛔ STOP.

### Rules 25-35 — Governance discipline (Layer 8)

**Rule 25 — Reconnaissance Before Synthesis (SK-529).** Sessions producing plans, reviews, or architect-level synthesis begin with SK-529. STATE.recon saved before any synthesis output. Reviewers verify synthesis-to-evidence linkage via STATE.recon. Thresholds by session type: EXECUTOR 5/2/3, PLANNING 10/3/5, REVIEW 15/5/8, ARCHITECT 20/8/10, MATERIALIZATION 20/8/10. Wide-scope mode doubles all thresholds.

**Rule 26 — Wide-Scope Mode.** When user signals wide-scope work (triggers: "see the whole picture", "don't save tokens", "load the real state", "wide scope", uploads of ≥5 files or ≥100 KB), reconnaissance thresholds double and synthesis is deferred until ≥80% of uploaded artifacts are at minimum listed by name.

**Rule 27 — Claims Require Verification (SK-531).** User statements about existing state are captured in STATE.claims with status PENDING_VERIFICATION. Each claim must be VERIFIED, DISCONFIRMED, PARTIAL, or DEFERRED before planning proceeds. Session cannot ⛔ STOP with any PENDING_VERIFICATION BLOCKING claim.

**Rule 28 — Default MATERIALIZATION When Design Exists (SK-532).** If the work touches an artifact with existing design/fixture/contract, default session type is MATERIALIZATION. Overriding to PLANNING or GENERATION requires explicit written justification in STATE.mode.justification.

**Rule 29 — Session Mode Declaration (SK-535).** Every session declares exactly one mode in STATE.mode at start: ARCHITECT | PLANNER | REVIEWER | EXECUTOR | MATERIALIZATION. Declaration requires 1-2 sentence justification. Mode drift triggers immediate ⛔ STOP.

**Rule 30 — Goal Context Loading (SK-536).** User's original goal statement captured verbatim into STATE.goalContext at session start. Never paraphrased. Re-read at every ⛔ STOP gate. Every STOP output begins with Goal reminder block. Sessions >10 turns re-read at turn 5, 10, 15, ... checkpoints.

**Rule 31 — Multi-Goal Plans Must Declare Lanes.** When a plan claims to deliver 2+ user-stated goals, lane structure is mandatory. Each lane has own sequence, own gate, own verification. Lanes can share infrastructure; they cannot share gates.

**Rule 32 — Architect Habits Discipline (SK-538 v1.2.0).** Every ARCHITECT, PLANNER, REVIEWER, or MATERIALIZATION session loads SK-538 at load_order 6. 30-habit catalog (7 positive, 4 neutral-positive, 19 negative). Doc-first loop on every concern: scan → dig in docs FIRST → classify. BLOCK reserved for Class-a correctness-propagating after documented doc-search returns nothing.

**Rule 33 — Response Construction Protocol.** Every response in a session with a declared mode passes through the seven-step Response Construction Protocol before being sent:

1. **Instruction decomposition** — parse user's message into ordered items I1, I2, I3... Detect correction signals.
2. **Absorption** — read all inputs (attachments, pasted content, prior turns, STATE) in full before synthesis.
3. **Prior-correction thread** — list user's 3-5 most recent corrections with declared status (ADDRESSED by specific action | DEFERRED with reason | OBSOLETE with reason).
4. **Draft** — produce response in user's stated order with corrections threaded and citations tagged.
5. **Source-layer check** — every citation tagged with provenance: `[user-current]`, `[user-earlier-turn]`, `[user-pasted]`, `[user-attached]`, `[model-prior-output]`, `[state]`, `[tool-result]`.
6. **Feedback recheck** — read the draft against each correction declared addressed in Step 3. Verdict ADDRESSED requires a specific passage reference.
7. **Send** — only after Steps 1-6 pass.

Protocol has light and full modes. Light mode applies to simple single-item requests with no active correction and no attachments; Steps 2, 3, 4, 6 run as inline checks. Full mode applies otherwise; all seven steps produce internal artifacts before send.

**Mandatory Check 14 at every ⛔ STOP:** verify Step 1, Step 2 (full), Step 3 (full), Step 5, Step 6 artifacts are present and consistent. Any missing artifact → STOP does not fire → response revised.

**FC-17 at plan review:** Response Construction Protocol Compliance check verifies the plan-authoring session produced the seven-step artifacts.

**Cross-enforcement:**
- Gate 0j in `XIIGEN-CODE-REVIEW-PROTOCOL v1.7` enforces Step 1 at plan review time
- Gate 0k enforces Step 3 at plan review time
- Gate 0l enforces Step 5 at plan review time
- Gate 0m enforces UI/UX compliance at plan review time (NEW v30)
- Signal 7 in `XIIGEN-DESIGN-REVIEW-PROTOCOL v1.4` enforces Step 2 at fleet scope
- Signal 8 enforces Step 6 (shape-match verification) at fleet scope
- Signal 11 enforces Step 1 at fleet scope
- Signal 12 enforces UI/UX compliance at fleet scope (NEW v30)
- Correction-thread audit enforces Step 3 at fleet scope

Protocol maps step-by-step to SK-538 v1.2.0 negative habits:
- Step 1 skip → N-A16 (cutting user order), N-A17 (feedback not prioritized)
- Step 2 skip → N-A9 (acting before reading), N-A12 (enumeration substituting for meaning)
- Step 3 skip → N-A18 (prior context not threaded)
- Step 4 drift → N-A3 (problem-restatement), N-A14 (performing discipline), N-A15 (catalog-vocab-substitution)
- Step 5 skip → N-A20 (source-layer confusion)
- Step 6 skip → N-A19 (no recheck against feedback)



### Rule 35 — UI/UX Compliance Mandatory *(NEW v30)*

Every session that produces React pages (`*.tsx` files in `client/src/pages/`) must run
Phase 7 (UI/UX Compliance) and produce an FC-18 Audit Trail before the session closes.

**Enforcement chain:**
- **SK-539** (`planning--ui-ux-compliance-SKILL.md`, load_order 5.5) — defines the 29 UX
  checks (UX-01..UX-29), 52-role taxonomy, 12 visibility scopes, 7 screen templates, and
  4-entry missing-page registry. Loaded before any React page is written.
- **FC-18** (`fc-18-ui-ux-compliance-gate.md`) — the gate that enforces SK-539 at plan
  review time (Gate 0m in CODE-REVIEW-PROTOCOL v1.7) and at ⛔ STOP (Mandatory Check 15).
- **Mandatory Check 15** — added to the 14-check STOP battery. Fires if session produced
  ≥1 React page. Verifies FC-18 Audit Trail exists at `docs/ux-review/{slug}/FC-18-AUDIT-TRAIL.md`
  with all BLOCK findings cleared.
- **AUTHORING-GUIDE Rule 34 / Phase 7** — authoring-time enforcement in v1.15.

**The four role questions (from SK-539 §1) must be answered BEFORE writing any page:**
```
Q1 ROLE_TIER:   PLATFORM_ENG | PLATFORM_OPS | TENANT_OPS | TENANT_CONSUMER | PUBLIC
Q2 ROLE_GATE:   Primary role from the 52-role taxonomy in SK-539 §3
Q3 ROUTE_GUARD: Route prefix matches role tier (/admin/ for platform roles)
Q4 VISIBILITY:  Visibility scope from the 12-scope registry in SK-539 §4
```

**Missing-page registry (SK-539 §6):** Sessions implementing FLOW-20, FLOW-21, FLOW-28,
or FLOW-48 must create the corresponding missing public-facing page in the same session.
These are tracked as CFI-09 until resolved.

Rule 35 violation: React pages committed without Phase 7 → Mandatory Check 15 fails →
STOP does not fire → session cannot close.

### Rule 34 — Single Counter Authority *(NEW v28)*

`docs/state/INFRASTRUCTURE-FLOWS-STATE-v6.json` (or its versioned successor) is the
**canonical source** for all artifact counters: T (task types), F (factories), CF (BFA rules),
SK (skills), FC (gate IDs), DR (design records), Family numbers.

**The SESSION-LOAD-PLAN §Artifact Boundaries section is a cache** — updated at plan
authoring time from the canonical source, not maintained independently.

**Before any session consumes a counter** (assigns a new T, F, SK, FC, CF, or DR value):

```bash
# Read canonical counters before assigning any ID
python3 -c "
import json
d = json.load(open('docs/state/INFRASTRUCTURE-FLOWS-STATE-v6.json'))
print('Canonical source version:', d.get('version'))
print('Last updated:', d.get('lastUpdated'))
# Print counter fields
for k, v in d.items():
    if isinstance(v, (str, int)) and k not in ('version','description','lastUpdated','previousVersion'):
        print(k, ':', v)
"
```

If the canonical file disagrees with the SESSION-LOAD-PLAN cache, **the canonical file wins**.
Report the discrepancy; update the SESSION-LOAD-PLAN cache in the next plan authoring session.

`docs/architecture/QUICK_REFERENCE.md` §Next Artifact Numbers is a second-level cache — updated
**only** by the documentation gate script, never by hand. It is authoritative for human reference
but secondary to `INFRASTRUCTURE-FLOWS-STATE-v6.json` for session counter consumption.

**Violation:** assigning a counter from the SESSION-LOAD-PLAN cache without reading the canonical
file is an ID collision risk. The collision may not surface immediately — it surfaces when a
later session tries to use the same counter for a different artifact.

---

## STATE Schema

Persistent fields that every architect-mode session populates at start. All fields are read
at every ⛔ STOP. SESSION-LOAD-PLAN is the authoritative definition of these fields.

### STATE.productGoal — permanent product-level anchor *(NEW v28)*

This field is **not session-specific and not from user utterance**. It is the permanent
product goal for XIIGen, immutable across sessions. Every architect decision is valid
if it serves STATE.goalContext.statement (the session goal) AND does not regress
STATE.productGoal.statement (the product goal).

```json
{
  "productGoal": {
    "statement": "A startup founder opens XIIGen, sees all 47 flows, installs what they need, and their product works.",
    "flowCount": 47,
    "implementedRef": "docs/sessions/47-FLOW-CURRENT-STATE-MASTER.md",
    "productSpecRef": "docs/XIIGEN_PRODUCT_SPECS.md",
    "currentGapsRef": "CARRY-FORWARD-ISSUES.md CFI-01..CFI-07"
  }
}
```

**Usage at every ⛔ STOP — two-layer Goal Reminder Block:**

```
Goal reminder — session goal (verbatim): "[STATE.goalContext.statement]"
Goal reminder — product goal (permanent): "A startup founder opens XIIGen, sees all 47 flows,
  installs what they need, and their product works."
Session mode: [ARCHITECT | PLANNER | REVIEWER | EXECUTOR | MATERIALIZATION]
This round advances the session goal by: [verb of state change + before/after]
This round does not regress the product goal because: [one sentence]
```

If the session goal and product goal are in tension (e.g., a session task that would disable a
user-visible feature to fix a governance gap), **surface the tension explicitly** — do not
silently pick one. Luba resolves the tension; the session does not resolve it unilaterally.

**STATE.productGoal is read-only within sessions.** It can only be updated by a dedicated
maintenance session with explicit Luba approval — not by any session goal drift or
mid-session reinterpretation.

### STATE.goalContext — session-specific goal

```json
{
  "goalContext": {
    "statement": "[verbatim user goal from current session — captured at session start, never paraphrased]",
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
    "justification": "[1-2 sentences why this mode, not an adjacent mode]",
    "scopeOutReminder": "[explicit list of what this session will NOT produce]"
  }
}
```

### STATE.recon — reconnaissance evidence base

See SK-529 v2.0.0 for full schema. Required fields:

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

The current authoritative versions of the governance document stack:

| Document | Current version | Scope |
|----------|-----------------|-------|
| `HOW-TO-USE-SKILLS` | **v4.4.0** | Top-level governance — skill load order, FC gates, rules, mandatory checks |
| `XIIGEN-SESSION-LOAD-PLAN` | **v30 (this file)** | Rule registry, STATE schema, artifact boundaries, test counts |
| `XIIGEN-DESIGN-ARCHITECT-SESSION-GUIDE` | **v1.7** | Per-session architect discipline, Q0-Q9 + Step 5, Mistakes 1-22 |
| `XIIGEN-CODE-REVIEW-PROTOCOL` | **v1.7** | Per-plan review gates 0a-0m plus FC-1..FC-18 |
| `XIIGEN-DESIGN-REVIEW-PROTOCOL` | **v1.4** | Fleet review 12 signals including S12 UI/UX compliance |
| `XIIGEN-RESPONSE-CONSTRUCTION-PROTOCOL` | v1.0 | Response composition — 7 steps from decomposition to send |
| `XIIGEN-FLOW-DOCUMENT-AUTHORING-GUIDE` | **v1.15** | Authoring-time rules 1-34 including Phase 7 UI/UX compliance, 7 screen templates |
| `XIIGEN-CODEBASE-ORIENTATION-MAP` | **v1.2** | Question-class → file-path lookup; Q-21..Q-23 (historical RAG, context package, client page inventory); bash commands |
| `XIIGEN-GOLDEN-RULE` | v1 | Meta-principle: produce for the consumer, not the producer |
| `XIIGEN-V2-MASTER-PLAN` | current | Engine evolution roadmap |
| `XIIGEN-MARKETPLACE-MASTER-PLAN` | current | Marketplace plugin distribution across 14 platforms |
| `DECISIONS-LOCKED` | rolling | Architectural decisions locked from override without approval |
| `HISTORY-RAG-INDEX` | **v1.0 NEW** | Navigation index for 202 historical architecture decisions; 12 clusters; per-flow table; 8 D-HIST lock candidates; 13 batches (A-L); location: `docs/sessions/historyRag/` |
| `ARCHITECTURAL-DECISION-ADDENDUM` | v1.0 | "Give AI the minimum to decide" governing question; failure modes A+B; three-signal test; location: `docs/flow-plan-preparation/` |
| `SKILL-INDEX` | current | Full skill catalog with load-order mapping |
| `CARRY-FORWARD-ISSUES` | rolling | Issues tracked across sessions |
| `DOCUMENT-AUTHORITY-MAP` | current | Authority hierarchy for conflicting decisions |
| `planning--ui-ux-compliance-SKILL.md` (SK-539) | **v1.0.0 NEW** | 29 UX checks, 52-role taxonomy, 12 visibility scopes, 7 screen templates (T-1..T-7), 4 missing-page registry entries |
| `fc-18-ui-ux-compliance-gate.md` (FC-18) | **v1.0.0 NEW** | Gate 0m definition, Audit Trail format, BLOCK matrix, exemptions, 5 failure mode examples |

---

## Skill Inventory — 114 skills + 1 protocol

### Layer 1 — Engine internals (47 skills)

SK-426 through SK-470. Covers NODE composition, convergence handlers, AF pipeline stations (AF-1 through AF-7), fabric resolution, prompt assembly, skills factory, RAG patterns, iron rule derivation, arbiter panel execution, and related engine internals. See `SKILL-INDEX.md` for full listing.

### Layer 2 — Engine lifecycle (21 skills)

SK-471 through SK-491. Covers test-failure triage, docker local testing, flow implementation guide, documentation sync, preflight gates, test integrity rules (branch reachability, contract-driven testing, coverage vs execution, pipeline function coverage, test-fix-or-code-fix), QA session type, e2e matrix builder, and similar execution-layer skills.

### Layer 3 — Product lifecycle (13 skills)

SK-492 through SK-504. Covers product scope validation, feature prioritization, blast radius assessor, change propagation, prerequisite chain, solution scope gate, root cause ladder, root cause tracing, and related product-layer skills.

### Layer 4 — Self-awareness (5 skills)

SK-505 through SK-509. Covers capability state reader, gap-to-proposal, training-data gap audit, implementation integrity, and extension session type.

### Layer 5 — Dynamic decision architecture (10 skills)

SK-510 through SK-519. Covers four-tier decision classification, graph entity schema, graph RAG fabric integration, AI decision pipeline design, confidence lifecycle, learning loop closure, static-to-graph refactoring, decision graph query, top manager extension protocol, skill-graph sync.

### Layer 6 — AI-driven topology planning (6 skills)

SK-520 through SK-525. Covers intent-to-plan, depth decision, AI context package authoring, principles arbiter, cycle visibility, meta-arbiter.

### Layer 6x — Scope isolation (1 skill)

SK-526. Scope isolation arbiter — FC-32 enforcement.

### Layer 7 — Pipeline position (1 skill)

SK-528. Pipeline position check — Q0 enforcement.

### Layer 8 — Governance discipline (11 skills)

| Skill | Load order | Version | Purpose |
|-------|------------|---------|---------|
| SK-529 Reconnaissance Gate | 0 | **v2.0.0** | Evidence before synthesis; XIIGen Tier-0 search list |
| SK-535 Session Mode Declaration | 1 | v1.0.0 | 5 modes with drift detection |
| SK-536 Goal Context Persistence | 2 | v1.0.0 | Verbatim goal anchor |
| SK-531 Claim-as-Hypothesis | 3 | — | User claims captured as PENDING_VERIFICATION |
| SK-537 Design Artifact Completeness | 3 | — | Check artifacts exist + populated |
| SK-532 Materialization Session Type | 4 | — | 1-5 task constraint |
| SK-533 MVP Round-Trip Verification | 4 | — | Tenant-observable round-trip |
| SK-530 Specificity Calibration | 5 | — | Threshold per session type |
| SK-534 Goal Delivery Completeness | 5 | — | FIRST arbiter in every panel |
| SK-538 Architect Habits Classifier | 6 | v1.2.0 | 30-habit catalog |
| SK-539 UI/UX Compliance | 5.5 | **v1.0.0 NEW** | 29 UX checks, 52-role taxonomy, 12 visibility scopes, 7 screen templates, 4 missing pages |

### Layer 9 — Response construction (1 protocol)

`XIIGEN-RESPONSE-CONSTRUCTION-PROTOCOL v1.0`, load_order 7. Seven-step protocol for response composition; mandatory for all sessions with declared mode.

---

## FC Gate Map — FC-1 through FC-18, FC-22 through FC-32

### FC-1 through FC-13 — Plan correctness battery (SK-410 v2.0)

FC-1 goal coverage, FC-2 evidence grounding, FC-3 architectural coherence, FC-4 pipeline contract, FC-5 naming convention, FC-6 iron rules, FC-7 DNA compliance, FC-8 test gate integrity, FC-9 issue inventory, FC-10 cross-document propagation, FC-11 overview-detail match, FC-12 principles compliance, FC-13 documentation per Rule 17.

### FC-14 Goal Delivery Completeness (SK-534)

Runs FIRST in plan review, before FC-1..FC-13. Every goal element mapped to ≥1 plan turn with verification step.

### FC-15 Design Artifact Populated (SK-537)

Runs FIRST alongside FC-14. Every referenced artifact passes SK-537 Checks 1-2.

### FC-16 Architect Habits Discipline (SK-538 v1.2.0)

Runs FIRST alongside FC-14 and FC-15. Three-step doc-first loop applied to plan. Class-a unresolved after documented Step 2 → BLOCK.

### FC-17 Response Construction Protocol Compliance

Runs at plan review. Verifies Steps 1, 2 (full), 3 (full), 5, 6 artifacts exist from the plan-authoring session.

### FC-22 through FC-31 — Execution-layer

Build-time, test-time, commit-time, documentation-artifact gates. FC-22 build gate, FC-23 lint clean, FC-24 tsc clean, FC-25 test pass, FC-26 commit discipline, FC-27 documentation-gate (Rule 17), FC-28 session-file self-containment, FC-29 issue inventory discipline, FC-30 no skill-reference-as-production-dependency, FC-31 no hardcoded model names/endpoints.

### FC-18 UI/UX Compliance (SK-539) — NEW v30

Runs at plan review as Gate 0m in CODE-REVIEW-PROTOCOL v1.7 (Tier 1 structural pre-check)
and at ⛔ STOP as Mandatory Check 15. Verifies: (a) all React pages answer Q1–Q4 role
questions; (b) BLOCK check matrix (UX-01..UX-29 applicable subset) passes; (c) Phase 7
declared in plan; (d) missing-page registry addressed for FLOW-20/21/28/48.
FC-18 Audit Trail format: `fc-18-ui-ux-compliance-gate.md` §4.

### FC-32 Scope Isolation Arbiter Present (SK-526)

Every arbiter-panel.handler or multi-generate.handler node has scope_isolation arbiter.

---

## Mandatory Checks Before Every ⛔ STOP

15 checks applied at every ⛔ STOP in order. Any failure holds the STOP until resolved.

0. **Preflight gate (SK-457)** — at Claude Code session start
1. **Output contract verification (SK-448)** — re-quote Q4, match shape element-by-element
2. **Mission progress check (SK-445)** — first section of every PHASE-COMPLETE
3. **Issue inventory (FC-29)** — FIXED / DEFERRED+CARRY-FORWARD / EXCEPTION only
4. **Test gate (P19)** — failures === 0
5. **FC-32 scope isolation arbiter** — present in every node
6. **Pipeline contract check (SK-528)** — Q0a/b/c/d all aligned
7. **Documentation artifacts gate (Rule 17)** — JSON + MD companions, PNGs for tenant-facing
8. **Reconnaissance evidence (SK-529 v2.0.0)** — STATE.recon exists, threshold met, Tier-0 complete, synthesis references STATE.recon
9. **Claims verified (SK-531)** — no PENDING_VERIFICATION BLOCKING claims
10. **Goal reminder block (SK-536)** — verbatim session goal + permanent product goal, mode, round-trip advance at top of STOP output
11. **Goal delivery verdict (SK-534)** — plan reviews only, FC-14 APPROVED on all goals
12. **Architect habits discipline (SK-538 v1.2.0 / FC-16)** — 30-habit scan, doc-first loop, five sub-guards
13. **Tools before person (N-A13)** — clarifying questions preceded by tool-check; consult XIIGEN-CODEBASE-ORIENTATION-MAP §3 for XIIGen-specific commands
14. **Response Construction Protocol compliance (FC-17)** — Steps 1, 2 (full), 3 (full), 5, 6 artifacts present
15. **UI/UX compliance (FC-18)** — if session produced ≥1 React page: FC-18 Audit Trail at `docs/ux-review/{slug}/FC-18-AUDIT-TRAIL.md` with all BLOCK findings cleared; Phase 7 executed; if implementing FLOW-20/21/28/48, corresponding missing page created

---

## Artifact Boundaries (current as of 2026-04-17)

**⚠ RULE 34 NOTICE:** All counters below are a cache sourced from
`docs/state/INFRASTRUCTURE-FLOWS-STATE-v6.json` on 2026-04-17.
**Before consuming any counter, read the canonical file.** If the canonical file
disagrees with these numbers, the canonical file wins.
See Rule 34 and the verification command at the end of this section.

### Task and Factory IDs

- Next task ID: **T=T605** (per `INFRASTRUCTURE-FLOWS-STATE-v6.json`)
- Next factory ID: **F=F1601**
- Next BFA rule ID: **CF=CF-809**
- Next skill ID: **SK=SK-540** (SK-539 consumed by UI/UX Compliance in v30)
- Next FC gate ID: **FC=FC-19** (FC-18 consumed by UI/UX Compliance gate in v30)

### Test counts (post-MVP-v3, pre-FLOW-47 fixes verification)

- Server jest: **10,617 passed, 0 failures**
- Server tsc: 0 errors
- Server format: 0 warnings
- Server lint: 0 errors, 0 warnings
- Client tsc: 0 errors
- Client format: 0 warnings
- Client build: success

### Branch state

- **Branch:** `claude/vigorous-margulis` (xiigen-mvp-claude-vigorous-margulis)
- **Commit at time of v27 authoring:** 83b9cf3 (post-Turn 6 of MVP v3)
- **Pending work:**
  - FLOW-47 pre-phase gate validation (engine fixes verified in place; live gate query pending)
  - Per-flow Tracks A-E execution starting FLOW-01 through FLOW-12
  - Track A topology file creation for 33 missing flows
  - FLEET-DESIGN-REVIEW v1 scheduled after FLOW-12 completion

### Session types and current state

- FLOW-47 status: 9/9 e2e pass, 26/26 packages with bundle data (FLOW-47 fixes committed, gate verification pending)
- FLOW-46 status: phases A-F complete, SNAP-01 through SNAP-21 deferred, session docs not yet committed
- MVP status: v3 delivered, 4 round-trip gaps identified for MVP v4 (marketplace auto-publish, Linked install, AF-4 module scope, round-trip integration test)

### Counter verification command (Rule 34)

```bash
python3 -c "
import json
d = json.load(open('docs/state/INFRASTRUCTURE-FLOWS-STATE-v6.json'))
print('Canonical source:', d.get('version'), '| last updated:', d.get('lastUpdated'))
flows = d.get('flows', {})
complete = [k for k,v in flows.items() if isinstance(v,dict) and v.get('status')=='COMPLETE']
print('Flows in registry:', len(flows), '| COMPLETE:', len(complete))
"
```

---

## Current Carry-Forward Issues

Tracked in `CARRY-FORWARD-ISSUES.md`. Summary of open items:

- **CFI-01** — FLOW-46 SNAPSHOTS directory empty. Blocks fleet review Signal 4 for FLOW-46.
- **CFI-02** — FLOW-47 PNG evidence absent. JSON snapshots present but no visual proof.
- **CFI-03** — 33 flows missing `contracts/topologies/{slug}.topology.json`. Track A scope.
- **CFI-04** — 22 flows with DEMONSTRABLY_WRONG IMPL-STATE per RECONCILIATION-MASTER. Requires per-flow reconciliation.
- **CFI-05** — 5 flows (FLOW-37, 38, 39, 40, 45) with Potemkin UI (React pages not routed in App.tsx). Cross-signal cluster.
- **CFI-06** — 423 events emitted with no consumer; 18 events consumed. Observability gap per Signal 3 fleet data.
- **CFI-07** — FLOW-32 marketplace: 20/20 contracts, 0 unit tests, Potemkin UI. Requires full reconciliation before marketplace work proceeds.
- **CFI-08** — 15 design simulations have empty Section 8 DR triples (no `DESIGN_REASONING` decisions authored): `FLOW-29`, `FLOW-30`, `FLOW-31`, `FLOW-32`, `FLOW-33`, `FLOW-34`, `FLOW-35`, `FLOW-38`, `FLOW-39`, `FLOW-40`, `FLOW-41`, `FLOW-42`, `FLOW-43`, `FLOW-44`, `FLOW-45`. Historical RAG plan (Phase R0-R5 + Batch L) does not cover these flows (Batch L covers FLOW-41 adapters only, not DR triples). A dedicated DR-authoring session is required per flow. Does not block any current work.
- **CFI-09** — 4 missing public-facing client pages with fully implemented server services: (1) FLOW-20: `/settings/privacy` — `ConsentGateEnforcer` implemented, no client route; GDPR compliance risk. (2) FLOW-21: `/forms/:schemaId` — `FormSubmissionProcessor` implemented, `publicUrl` appears in mock state, no submitter route. (3) FLOW-28: `/blog` and `/blog/:slug` — `PublicPageRequestPipeline` with CDN caching implemented (18 services), zero public blog routes. (4) FLOW-48: `/settings/language` — `UserPreferencesManager` implemented, no user-facing locale preference route. All four must be created before their respective flows can reach fleet Signal 12 PASS. Tracked by SK-539 §6 and Rule 35.
- **FLOW-48 REGISTRY NOTE** — `i18n-translation` (slug) exists in `client/src/App.tsx` (line 153 comment `// FLOW-48 i18n-translation`), has 6 server services fully implemented, has `AdminI18nPage` at `/admin/i18n`, but was **not registered** in the 47-flow master state (`47-FLOW-CURRENT-STATE-MASTER.md`). FLOW-48 must be added to the master state as flow 48 of 48 in a MAINTENANCE session.

---

## Planning Pipeline Summary

```
Load order at every session start:

0  SK-529 Reconnaissance Gate v2.0.0    (MANDATORY, ALL sessions — Tier-0 for ARCHITECT)
1  SK-535 Session Mode Declaration      (MANDATORY for ARCHITECT/PLANNER/REVIEWER/MATERIALIZATION)
2  SK-536 Goal Context Persistence      (MANDATORY for sessions with user-stated goal)
3  SK-531 Claim-as-Hypothesis           (if claims present)
3  SK-537 Design Artifact Completeness  (if artifacts referenced)
4  SK-532 Materialization Session Type  (if MATERIALIZATION)
4  SK-533 MVP Round-Trip Verification   (if tenant-facing)
5  SK-530 Specificity Calibration       (before any STOP)
5  SK-534 Goal Delivery Completeness    (FIRST arbiter in every panel)
5  SK-528 Pipeline Position Check       (if GENERATION/PLANNING/MATERIALIZATION)
5.5 SK-539 UI/UX Compliance             (if session produces React pages — before first page written)
6  SK-538 Architect Habits v1.2.0       (if ARCHITECT/PLANNER/REVIEWER/MATERIALIZATION)
7  RESPONSE-CONSTRUCTION-PROTOCOL       (MANDATORY if mode declared)
8  SK-526 Scope Isolation Arbiter       (if arbiter panels)

For ARCHITECT sessions: after SK-529 Tier-0, consult XIIGEN-CODEBASE-ORIENTATION-MAP
before first synthesis if question class falls outside Tier-0 coverage.

Then session-type-specific skills per Q2 table in HOW-TO-USE-SKILLS v4.4.0.
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
Layer 8 — Governance discipline (10 skills, SK-529..SK-538):         COMPLETE
Layer 9 — Response construction (1 protocol, v1.0):                  COMPLETE

Total: 113 skills + 1 protocol
Next available SK: SK-539
Next available FC: FC-18
Pending (tracked separately): SK-527 module-isolation-arbiter, FC-33
```

---

## Change History

- v16 and prior — historical
- v17-v22 — early Layer 8 rollout (SK-529, SK-535, SK-536)
- v23 — SK-531, SK-537 added
- v24 — artifact-boundary audit after MVP v3 turn 6
- v25 — SK-538 v1.0.0 (17 habits) added as load_order 6; FC-16 added; Rule 32 added; 12 mandatory checks
- v26 — SK-538 v1.1.0 (25 habits); 5 companion documents bumped (CODE-REVIEW v1.5, DESIGN-REVIEW v1.2, ARCHITECT-GUIDE v1.3, AUTHORING-GUIDE v1.14, HOW-TO v4.1.1); 13 mandatory checks
- v27 — SK-538 v1.2.0 (30 habits); RESPONSE-CONSTRUCTION-PROTOCOL v1.0 as Layer 9; Rule 33; FC-17; Mandatory Check 14; CODE-REVIEW v1.6; DESIGN-REVIEW v1.3; ARCHITECT-GUIDE v1.4; HOW-TO v4.2.0; 14 mandatory checks
- **v28 — NEW:**
  - **Rule 34** — Single Counter Authority: `docs/state/INFRASTRUCTURE-FLOWS-STATE-v6.json` is canonical; SESSION-LOAD-PLAN §Artifact Boundaries is a cache; verify before consuming any counter
  - **STATE Schema section** added — formal definitions of STATE.productGoal, STATE.goalContext, STATE.mode, STATE.recon, STATE.claims
  - **STATE.productGoal** — permanent product-level goal anchor, immutable across sessions; two-layer Goal Reminder Block at every STOP
  - **Document Registry** — XIIGEN-CODEBASE-ORIENTATION-MAP v1.0 added; SK-529 bumped to v2.0.0; DESIGN-ARCHITECT-SESSION-GUIDE bumped to v1.5; HOW-TO bumped to v4.3.0
  - **SK-529** — v2.0.0 in skill inventory table (Tier-0 XIIGen search list)
  - **Mandatory Check 8** — note added: Tier-0 complete required
  - **Mandatory Check 13** — note added: ORIENTATION-MAP §3 reference
  - **Planning Pipeline** — ORIENTATION-MAP reference added for ARCHITECT sessions
  - **Artifact Boundaries** — Rule 34 notice + verification command added
  - Total mandatory checks: 14 (unchanged)
  - Total skills: 113 (unchanged — no new SK numbers consumed)
  - Next SK: SK-539 (unchanged)
  - Next FC: FC-18 (unchanged)
- **v29 — NEW:**
  - **Document Registry** — DESIGN-ARCHITECT-SESSION-GUIDE bumped to v1.6 (+Q9 Step 5, +Mistake 21); ORIENTATION-MAP bumped to v1.1 (+Q-21 historical RAG lookup, +Q-22 context package principle); `HISTORY-RAG-INDEX` v1.0 added (202-decision navigation index, 13 batches A-L, 12 clusters, per-flow table); `ARCHITECTURAL-DECISION-ADDENDUM` v1.0 added (governing question reference)
  - **CFI-08** — 15 flows (FLOW-29..FLOW-35, FLOW-38..FLOW-45) have no DESIGN_REASONING decisions in historical RAG; dedicated DR-authoring session required per flow
  - **D-HIST group** — D-HIST-001..D-HIST-008 appended to DECISIONS-LOCKED.md (8 proposed lock entries derived from historical RAG fixtures; Luba approval required)
  - **202 new fixtures** — `fixtures/rag-patterns/hist_*` (61) + `fixtures/design-reasoning/historical/hist_*` (140) + DR-07-G append; 13 batches (A-L); no T/F/SK/FC/CF counters consumed
  - **Total mandatory checks: 14** (unchanged)
  - **Total skills: 113** (unchanged — no new SK numbers consumed)
  - **Next SK: SK-539** (unchanged)
  - **Next FC: FC-18** (unchanged)
  - **Artifact Boundaries** — unchanged; no counters consumed by RAG integration work

---

## Observability

At every session close, the following should be true:

- Rules 1-34 all honored or explicitly flagged as waived with Luba approval
- All loaded skills at their current versions per the Document Registry above
- Every ⛔ STOP in the session passed all 14 mandatory checks
- Every FC gate that applied to the session fired and produced a verdict
- Artifact boundaries updated if any SK, FC, T, F, CF IDs were consumed — canonical file read before consumption per Rule 34
- Carry-forward issues updated with any new CFI or status change
- Test counts updated if code was modified
- STATE.productGoal.statement referenced in every Goal Reminder Block

Sessions that cannot claim the above at close are incomplete and should be flagged for re-run or continuation.

---

## Cross-references

- **HOW-TO-USE-SKILLS v4.3.0** — primary governance document; loads this registry
- **DESIGN-ARCHITECT-SESSION-GUIDE v1.6** — per-session architect discipline, Q0-Q9 + Step 5, Mistakes 1-21
- **XIIGEN-CODEBASE-ORIENTATION-MAP v1.1** — question-class → file-path lookup; Q-21 (historical RAG), Q-22 (context package); bash commands
- **CODE-REVIEW-PROTOCOL v1.6** — per-plan review protocol
- **DESIGN-REVIEW-PROTOCOL v1.3** — fleet review protocol
- **RESPONSE-CONSTRUCTION-PROTOCOL v1.0** — response composition protocol
- **FLOW-DOCUMENT-AUTHORING-GUIDE v1.14** — authoring-time rules
- **GOLDEN-RULE v1** — produce for the consumer
- **DOCUMENT-AUTHORITY-MAP** — authority hierarchy when documents conflict
- **SKILL-INDEX** — full skill catalog
- **CARRY-FORWARD-ISSUES** — open items across sessions
- **DECISIONS-LOCKED** — locked architectural decisions
- **HISTORY-RAG-INDEX v1.0** — navigation index for 202 historical architecture decisions across 12 theme clusters; per-flow lookup table; Q-21 entry point; location: `docs/sessions/historyRag/HISTORY-RAG-INDEX.md`
- **ARCHITECTURAL-DECISION-ADDENDUM v1.0** — "give AI the minimum to decide" governing question; two failure modes; three-signal test; Q-22 entry point; location: `docs/flow-plan-preparation/XIIGEN-ARCHITECTURAL-DECISION-ADDENDUM.md`

---

## End of Session Load Plan v29
