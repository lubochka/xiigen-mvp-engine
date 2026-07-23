# XIIGEN Code Review Protocol
## Version: 1.6
## Scope: Per-plan review for Claude Code execution plans, FLOW implementation plans, MVP plans
## Status: Current — supersedes v1.5
## Applies: any plan document submitted for reviewer verdict before Claude Code execution

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

**Tier 1 — Structural pre-checks.** Gates 0a through 0l. These catch failures in how the plan was constructed and whether it addresses the user's actual ask. Any BLOCK at Tier 1 rejects the plan before Tier 2 runs.

**Tier 2 — Correctness checks.** FC-1 through FC-13. These catch failures in the plan's content: goal coverage, architectural coherence, codebase evidence, principles compliance, pipeline contract, and related dimensions.

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

The plan declares what "done" looks like with enough specificity that Claude Code can verify completion without asking the user. "All tests pass" is too vague. "Server tsc: 0 errors, 0 warnings. Server jest: 10,617 passed, 0 failures. Client build: success. PNG count in docs/sessions/SNAPSHOTS/ ≥ 4 per FLOW" is specific.

Verdict: PASS | FAIL.

### Gate 0f — Minimal-wiring preference

If the work touches artifacts with existing design (fixtures, contracts, documented decisions), the plan uses the minimal wiring path — not rebuild, not redesign. Plans exceeding 5 tasks for wiring work are rejected unless the task expansion is justified by verified complexity beyond wiring.

Verdict: PASS | FAIL.

### Gate 0g — Visual proof present for tenant-facing claims

Any plan step that claims to deliver a tenant-visible feature includes Playwright PNG evidence — either citing existing PNG paths in `docs/sessions/FLOW-XX/SNAPSHOTS/` or specifying Playwright spec changes that will produce PNGs. Server-only steps are explicitly flagged as server-only with justification.

Verdict: PASS | FAIL. On FAIL, specify which tenant-facing step lacks visual proof.

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

### Gate 0j — Plan addresses user's items in user's order — NEW v1.6

This gate enforces Response Construction Protocol Step 1 (instruction decomposition) at plan-authoring time. The reviewer checks whether the plan document was constructed per the user's stated order.

**Procedure:**

1. Locate the user's originating request in the plan's provenance (session brief, prior turn, or linked source document). Quote it in full.
2. Parse the request into enumerated items I1, I2, I3... as Protocol Step 1 would.
3. For each item, locate where in the plan it is addressed. Mark: ADDRESSED (with plan section reference), DEFERRED (with declared reason), or ABSENT.
4. Any ABSENT item without a declared reason fails the gate.
5. Items addressed out of user's stated order pass if the plan document declares the reordering explicitly; fail if the reordering is silent.

**This gate catches the N-A16 (cutting user order) failure mode as it appears in plan documents.**

Worked example (chata_data_2):
- User request at line 2128: *"Ok, Prepare a claude code plan what needs to be done with every document (check the flows docs session flow files ON EACH FLOW) to achieve these for EACH FLOW"*
- Decomposition: I1 = plan what needs to be done per flow; I2 = check session files on each flow; I3 = achieve Tracks A-E for each flow
- Plan produced at line 2548: `Execution order: Track A → Track B and Track C pre-phase (parallel) → Track C per-flow → Track D → Track E`
- Gate 0j verdict: BLOCK. The plan reorders from per-flow-first (user's order: pick a flow, complete A-E for it, move to next) to per-track-first (plan's order: batch Track A for all flows, then B, then C...). The reordering is silent — no declaration that the user's "for each flow" order was intentionally inverted.
- User's subsequent message at line 2571: *"I am very confused :(((( We talked that for each flow we will run phase A-E Plans and the prephase will be fix for Flow 47. And still you prepare a phase 1 plan for all flows"* confirms the gate's detection.

Verdict: PASS | BLOCK.

### Gate 0k — Corrections from prior rounds threaded explicitly into plan text — NEW v1.6

This gate enforces Response Construction Protocol Step 3 (prior-correction thread) at plan-authoring time. The reviewer checks whether user corrections that shaped the plan appear as explicit references in the plan document.

**Procedure:**

1. Identify the user's prior corrections in the session that preceded this plan version. Source: session transcript, prior plan versions, explicit user messages marked as corrections.
2. For each correction, locate in the plan document a specific reference or structural element that addresses it. The reference can be:
   - Inline note: "Per Luba's direction at [timestamp]: [quoted correction], this plan [specific consequence]"
   - Decision log entry: "DECISION-LOG: addressed [correction summary] by [plan element]"
   - Explicit carry-forward: "[Correction] from prior round is addressed in Turn N"
3. Corrections with no plan-text reference fail the gate.
4. Corrections referenced generically ("we addressed feedback") without specific plan-element linkage fail the gate.

**This gate catches the N-A18 (prior context not threaded) failure mode as it appears in plan documents.**

Worked example (chata_data_2 → chata_data_3):
- Nine corrections from Luba in chata_data_2 specifying per-flow A-E with pre-phase for FLOW-47 (lines 2128, 2288, 2304, 2318, 2377, 2384, 2409, 2420, 2421)
- Plan produced in chata_data_3 at line 2548: project-wide track sequencing, no reference to any of the nine prior corrections
- Gate 0k verdict: BLOCK. Nine distinct corrections from prior rounds have zero explicit references in the current plan.

Verdict: PASS | PASS_WITH_CONCERNS | BLOCK.

### Gate 0l — Plan's citations have source-layer tags — NEW v1.6

This gate enforces Response Construction Protocol Step 5 (source-layer check) at plan-authoring time. The reviewer checks whether every citation in the plan document is tagged by source provenance.

**Procedure:**

1. Identify every quoted phrase, file reference, and external citation in the plan.
2. For each, verify the source layer is declared:
   - `[codebase:file:line]` for code references
   - `[docs:path]` for documentation references
   - `[user-earlier-turn:timestamp]` for prior user messages
   - `[user-attached:filename]` for attached file content
   - `[state:field]` for STATE references
   - `[prior-plan:version]` for prior-plan-version references
3. Citations without source-layer tags fail the gate.
4. Citations depending on source layer for their weight — "Luba said X" vs "the prior plan said X" vs "the codebase shows X" — must have the tag adjacent to the claim, visible in the plan text, not only in internal notes.

**This gate catches the N-A20 (source-layer confusion) failure mode as it appears in plan documents.**

Worked example:
- Plan contains the sentence: *"Per earlier direction, install() should use registration semantics."*
- Gate 0l procedure: identify source of "earlier direction." Was this (a) a user correction in the session, (b) content from a prior plan version, (c) a locked decision in DECISIONS-LOCKED.md, or (d) an inherited verdict from another session? The plan doesn't specify.
- Gate 0l verdict: FAIL. The claim's weight depends on which source layer it came from — if (c) DECISIONS-LOCKED.md, the claim is authoritative; if (d) inherited verdict without re-verification, the claim is potentially N-A8 territory. The plan must specify.

Verdict: PASS | FAIL.

---

## 5. Tier 1 verdict aggregation

Tier 1 produces an aggregate verdict:

- **REJECTED** — any BLOCK in 0a, 0b, 0c, 0d, 0e, 0f, 0g, 0h, 0j, 0k, or 0l
- **REJECTED** — BLOCK in 0i after documented Step 2 returned nothing
- **APPROVED_WITH_CONCERNS** — any PASS_WITH_CONCERNS in 0i or 0k
- **APPROVED_TIER_1** — all gates PASS

Only APPROVED_TIER_1 or APPROVED_WITH_CONCERNS proceeds to Tier 2.

---

## 6. Tier 2 — Correctness checks (FC-1 through FC-17)

Tier 2 runs the failure-class battery. Order within Tier 2: FC-14, FC-15, FC-16, FC-17 run FIRST (structural correctness), then FC-1 through FC-13 (content correctness).

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

### FC-17 — Response Construction Protocol Compliance — NEW v1.6

For every substantive response in the plan-authoring session that led to this plan:
- Step 1 decomposition artifact exists (in session internal record or plan provenance)
- Step 2 absorption artifact exists if full mode
- Step 3 prior-correction thread artifact exists if full mode
- Step 5 source-layer tags on all citations in response
- Step 6 feedback recheck verdict ADDRESSED for every correction declared addressed

Cross-reference: FC-17 at plan review time overlaps with Gates 0j (decomposition enforcement), 0k (correction thread enforcement), and 0l (source-layer enforcement) from Tier 1. Tier 1 catches the failure in the plan document; FC-17 at Tier 2 catches the failure in the session record that produced the document.

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

### FC-7 — DNA compliance

Generated code specifications in the plan honor DNA-1 through DNA-9 patterns.

### FC-8 — Test gate integrity

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

- **REJECTED** — any BLOCK in FC-14, FC-15, FC-16, FC-17, or FC-1 through FC-13
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
| 0g | PASS | |
| 0h | PASS | |
| 0i | PASS | 0 habit hits above Class-c |
| 0j | BLOCK | User item I3 not addressed; plan silently reordered per-flow to per-track |
| 0k | PASS | 9 corrections threaded explicitly |
| 0l | PASS | All citations source-tagged |

Tier 1 aggregate: REJECTED (0j BLOCK)

## Tier 2 — Correctness checks
Not run — Tier 1 rejected the plan.

## Required corrections before resubmission
1. Gate 0j: restructure plan to address user I3 (per-flow Tracks A-E) or declare the reordering with justification.
2. [additional corrections]

## Scope-in for resubmission
[what the next plan version must include]

## Scope-out for resubmission
[what remains deferred with Luba's approval]
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

---

## 12. Observability

For any plan review using this protocol:

- Verdict document exists with Tier 1 and Tier 2 tables
- Every BLOCK has a plan-section citation
- Every required correction has a specific fix description
- Reviewer's own output passes the same source-layer check it applied to the plan (Gate 0l)
- No verdict shipped with reviewer's own draft unchecked against Mistakes 15-19 from the architect guide

Verdicts that violate these properties are out of protocol compliance and should be re-run.

---

## 13. Cross-references

- **SK-538** — architect habits catalog, used by Gate 0i
- **SK-534** — goal delivery completeness, enforced by FC-14
- **SK-537** — design artifact completeness, enforced by FC-15
- **RESPONSE-CONSTRUCTION-PROTOCOL v1.0** — enforced by FC-17 at Tier 2 and Gates 0j/0k/0l at Tier 1
- **HOW-TO-USE-SKILLS v4.2.0** — Rule 33 mandates protocol; FC-17 is in that rule's FC assignment
- **DESIGN-REVIEW-PROTOCOL v1.3** — fleet-level aggregation of per-plan findings
- **FLOW-DOCUMENT-AUTHORING-GUIDE v1.14** — General Rule 30 applies the three-step loop at authoring time, mirroring Gate 0i at review time
