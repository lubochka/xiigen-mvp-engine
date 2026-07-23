# XIIGEN Design Review Protocol
## Version: 1.4
## Scope: Fleet-wide design state audit across all flows
## Status: Current — supersedes v1.3
## Cadence: run on-demand when fleet state is in question, on milestone transitions, or when cross-flow patterns are suspected

---

## 1. What this protocol reviews

The per-plan review protocol (`XIIGEN-CODE-REVIEW-PROTOCOL v1.6`) reviews one plan at a time. It catches failures inside a plan document.

This protocol — fleet review — looks at all flows together and catches failures that only become visible across the fleet:

- A habit that shows up in one flow is a local issue. The same habit across 20 flows is a fleet pattern signaling a systemic process problem.
- A single flow missing its visual proof is a gap. 33 of 47 flows missing business topology files is a fleet-wide missing prerequisite.
- A single plan passing with unthreaded corrections is a review failure. Fleet-wide pattern of unthreaded corrections indicates the Response Construction Protocol is not being applied at authoring time.
- One flow with Potemkin UI (routes not wired in App.tsx) is a bug. Five flows with the same pattern (FLOW-37, 38, 39, 40, 45 per chata_data_2 lines 3511, 3513) is a fleet-wide wiring gap.

The protocol produces a fleet signal table — one row per flow, one column per signal, per-flow verdicts aggregated into fleet-level patterns.

---

## 2. When this protocol runs

Triggered by:
- Milestone transitions (after completing a wave of flows, before starting the next wave)
- User requests a fleet-state audit ("where are all the flows")
- Suspected cross-flow pattern (one flow's failure mode observed in a second flow)
- Quarterly or monthly cadence as agreed with Luba
- Before any major architectural change that would affect all flows

The protocol is NOT run on every response. It is run on demand, produces an artifact (`FLEET-DESIGN-REVIEW-v{N}-{date}.md`), and the artifact is checked into `docs/design-reviews/`.

---

## 3. Preparation before running

Before the fleet review runs, the reviewer confirms:

1. **Scope declared.** Which flows are in scope? (Usually all numbered flows FLOW-00 through FLOW-47 plus variants like FLOW-00.1, FLOW-02-incoming, FLOW-07-08.)
2. **Reconnaissance threshold met (SK-529).** Fleet review is ARCHITECT-class or wider. Threshold is 20 file reads, 8 greps, 10 verbatim excerpts; doubled in wide-scope mode. STATE.recon saved.
3. **Inputs listed.** The reviewer lists every docs folder they will read: `docs/sessions/FLOW-XX/`, `contracts/topologies/`, `fixtures/flow-definitions/`, `docs/decisions/`, `docs/historyRag/`, `docs/flow-plan-preparation/`.
4. **Signal definitions loaded.** This protocol's 11 fleet signals are the scoring rubric — all must be applied to all flows in scope.

---

## 4. The 12 fleet signals — what each column measures

Each signal produces a per-flow verdict: PASS, PARTIAL, MISSING, or N/A. Fleet-level aggregation produces a distribution across all flows in scope.

### Signal 1 — Business topology file exists
**What it checks:** `contracts/topologies/{slug}.topology.json` exists for this flow with non-empty nodes[] and edges[].
**Verdict logic:**
- PASS: file exists, nodes ≥ 1, edges ≥ 0, all nodes have taskType declared
- PARTIAL: file exists but has empty arrays, or nodes without taskType
- MISSING: file does not exist
- N/A: flow is not a business-topology flow (e.g., FLOW-00 bundle-activation, FLOW-41/42/43/44 external adapters)

### Signal 2 — Design bundle populated (per SK-537)
**What it checks:** fixtures/design-reasoning, fixtures/arbiters, RAG patterns all have records tagged with this flow's flowId.
**Verdict logic:**
- PASS: design-reasoning count ≥ 3, arbiter count ≥ 1, RAG patterns count ≥ 3 for this flowId
- PARTIAL: some artifacts present, others below threshold
- MISSING: no artifacts tagged for this flowId
- N/A: flow is pre-design (explicitly scoped out of teaching corpus)

### Signal 3 — UI completeness verdict (from UI-REFLECTION-STATE)
**What it checks:** the FLOW-XX/UI-REFLECTION-STATE.json verdict for this flow's tenant-facing processes.
**Verdict logic:**
- PASS: FULL_UI across all processes, or explicit INTERNAL_ONLY justification
- PARTIAL: PARTIAL_UI on ≥1 process, others FULL_UI
- MISSING: NO_UI on a tenant-facing process, or EVENT_ONLY_NO_OBSERVER pattern
- N/A: flow is internal-only (infrastructure flow, governance flow)

### Signal 4 — Visual proof — PNGs in SNAPSHOTS
**What it checks:** `docs/sessions/FLOW-XX/SNAPSHOTS/` contains Playwright PNGs demonstrating the flow's key states.
**Verdict logic:**
- PASS: ≥4 PNGs covering initiate, result, error, next-step states
- PARTIAL: some PNGs present, gaps in state coverage
- MISSING: no PNGs, or SNAPSHOTS directory absent
- N/A: flow is server-only with declared exemption

### Signal 5 — IMPL-STATE claims reconciled with code
**What it checks:** FLOW-XX-IMPL-STATE.json claims match actual codebase state per the RECONCILIATION-STATE audit.
**Verdict logic:**
- PASS: RECONCILED verdict
- PARTIAL: RECONCILED_WITH_CAVEATS or PARTIAL verdict
- MISSING: DEMONSTRABLY_WRONG verdict
- N/A: no IMPL-STATE exists yet

### Signal 6 — Architect Discipline (per Gate 0i / SK-538 v1.2.0) — applied to this flow's most recent plan
**What it checks:** the most recent plan document for this flow passes Gate 0i from `XIIGEN-CODE-REVIEW-PROTOCOL v1.6` with CONCERN or PASS.
**Verdict logic:**
- PASS: Gate 0i PASS, zero habit hits above Class-c
- CONCERN: Gate 0i PASS_WITH_CONCERNS, ≥1 Class-b habit hit
- BLOCK: Gate 0i BLOCK, Class-a habit with documented Step 2 returning nothing
- N/A: no plan has been reviewed for this flow yet

### Signal 7 — Inputs-absorbed at authoring time — NEW v1.3
**What it checks:** the most recent plan document for this flow shows evidence that the plan author absorbed the inputs (session brief, attached files, prior plan versions, user corrections) before authoring.
**Verdict logic:**
- PASS: plan document contains absorption paraphrase, citations to prior inputs, or explicit "I read X before authoring" section
- CONCERN: plan references inputs but doesn't demonstrate absorption depth
- MISSING: plan has no evidence of input absorption; plan was authored before inputs were read (N-A9 signal)
- N/A: no prior inputs existed to absorb

### Signal 8 — Shape-match between plan claim and deliverable — NEW v1.3
**What it checks:** for the most recent plan's "done" contract, the actual deliverables match the contract element-by-element (cardinality, granularity, per-unit fields).
**Verdict logic:**
- PASS: Q4 contract re-quoted in plan's close; deliverable shape matches element-by-element
- PARTIAL: shape matches on some elements, mismatches on others
- MISSING: plan claimed done but shape doesn't match contract (N-A10 signal)
- N/A: plan has no close yet

### Signal 9 — Has PNG evidence for tenant-facing claims — NEW v1.3
**What it checks:** if the flow has tenant-facing claims in its plan, the plan includes Playwright PNG evidence paths for those claims.
**Verdict logic:**
- PASS: every tenant-facing claim cites a PNG path or spec that will produce one
- CONCERN: tenant-facing claims present, PNG paths cited generically without per-claim linkage
- MISSING: tenant-facing claims without PNG evidence
- N/A: all claims are server-only with declared exemption

### Signal 10 — Has MD companions for JSON deliverables — NEW v1.3
**What it checks:** for every JSON/NDJSON/CSV deliverable the plan produces, a Markdown companion with the same base name exists in the same directory (per `FLOW-DOCUMENT-AUTHORING-GUIDE v1.14` Rule 31).
**Verdict logic:**
- PASS: every structured deliverable has an MD companion
- CONCERN: some companions present, others missing
- MISSING: JSON deliverables exist with no MD companions
- N/A: plan produces no structured deliverables

### Signal 11 — User-order preserved in plan structure — NEW v1.3
**What it checks:** the most recent plan document addresses the user's request items in the user's stated order, per Gate 0j from `XIIGEN-CODE-REVIEW-PROTOCOL v1.6`.
**Verdict logic:**
- PASS: Gate 0j PASS at plan review time
- PARTIAL: reordering occurred but was declared explicitly
- MISSING: silent reordering or dropped user item (N-A16 signal)
- N/A: user request had no ordered structure

### Signal 12 — UI/UX compliance (FC-18) — NEW v1.4
**What it checks:** for every React page produced by the most recent implementation session for this flow, an FC-18 Audit Trail exists at `docs/ux-review/{slug}/FC-18-AUDIT-TRAIL.md` with verdict APPROVED or CONCERN (no unclosed BLOCK).

**Verdict logic:**
- PASS: FC-18 Audit Trail present; all pages have verdict APPROVED or CONCERN; no unclosed BLOCK findings; Phase 7 was declared and executed in the implementation session
- CONCERN: Audit Trail present but ≥1 page has CONCERN findings not yet in carry-forward inventory; or template applicable but not used (deviation not documented)
- MISSING: React pages were produced but no Audit Trail exists; or Audit Trail exists but any page has unclosed BLOCK verdict; or any missing-page registry gap (SK-539 §6) was not addressed when implementing the relevant flow
- N/A: flow produced no React pages in its most recent implementation session (server-only flow with explicit exemption declared)

**Cross-reference Signal 3:** Signal 3 checks UI completeness at the topology/architecture level (does the design specify a UI?). Signal 12 checks UI compliance at the implementation level (does the implemented UI satisfy the 29 UX checks?). A flow can pass Signal 3 (design specifies a UI) and still fail Signal 12 (implemented UI has role-tier mismatches or missing public pages).

**Fleet-level interpretation:** Signal 12 MISSING on a TENANT_FACING flow is a higher-severity finding than on an ENGINE_INTERNAL flow. The FC-18 exemption for platform-engineering-only pages (SK-539 §5) means V-PLATFORM-ONLY flows can legitimately be N/A on Signal 12 even with React pages.

---

## 5. The fleet signal table

The fleet review produces a table with one row per flow and 12 signal columns. An additional 13th column holds the per-flow overall verdict.

Table structure:

| Flow | S1 Topo | S2 Bundle | S3 UI | S4 PNGs | S5 IMPL | S6 Habits | S7 Absorb | S8 Shape | S9 PNG-ev | S10 MD | S11 Order | S12 UX | Verdict |
|------|---------|-----------|-------|---------|---------|-----------|-----------|----------|-----------|--------|-----------|--------|---------|
| FLOW-01 user-registration | PASS | PASS | PARTIAL | MISSING | PASS | PASS | PASS | PASS | CONCERN | PASS | PASS | MISSING | BLOCKED |
| FLOW-02 profile-enrichment | PASS | PASS | PARTIAL | MISSING | PARTIAL | PASS | PASS | PASS | CONCERN | PASS | PASS | N/A | PARTIAL |
| ... | | | | | | | | | | | | | |
| FLOW-47 module-lifecycle | PASS | PASS | N/A | N/A | PASS | PASS | PASS | PASS | N/A | PASS | PASS | N/A | PASS |

The per-flow verdict (rightmost column) follows aggregation rules in Section 6.

---

## 6. Per-flow verdict aggregation

Each flow's row of 12 signals aggregates to a single verdict:

- **PASS** — all non-N/A signals are PASS
- **PARTIAL** — no MISSING or BLOCK signals, some PARTIAL or CONCERN
- **BLOCKED** — any MISSING or BLOCK signal on a signal that is in-scope for this flow

MISSING on S1 (business topology) blocks the flow because it prevents S3, S4, S9 from ever reaching PASS. MISSING on S5 (IMPL-STATE reconciled) blocks because plans built on corrupted baselines propagate wrongness.

MISSING on S9 (PNG evidence) blocks only if the flow is tenant-facing. MISSING on S10 (MD companions) does not block on its own but contributes to CONCERN at fleet level if widespread.

MISSING on S12 (FC-18 Audit Trail) blocks if the flow is TENANT_FACING or PUBLIC and produced React pages in its most recent implementation session. MISSING on S12 for ENGINE_INTERNAL flows with declared server-only exemption does not block.

---

## 7. Fleet-level patterns

After the per-flow table is produced, the reviewer aggregates fleet-level signals and identifies systemic patterns. The aggregation surfaces patterns invisible at flow-level.

### 7.1 Fleet distribution by signal

For each of the 12 signals, count flows in each verdict bucket:

```
Signal 1 (Business topology file exists):
  PASS: 14 flows
  PARTIAL: 0 flows
  MISSING: 33 flows
  N/A: 0 flows
  → FLEET FINDING: 70% of flows missing business topology files — prerequisite gap blocking downstream work

Signal 6 (Architect discipline):
  PASS: 25 flows
  CONCERN: 8 flows
  BLOCK: 5 flows
  N/A: 9 flows
  → FLEET FINDING: 5 flows with Gate 0i BLOCK — investigate whether a common failure pattern is crossing multiple flows

Signal 11 (User-order preserved):
  PASS: 12 flows
  PARTIAL: 3 flows
  MISSING: 9 flows
  N/A: 23 flows
  → FLEET FINDING: 9 of 24 flows with ordered user requests show silent reordering — systemic N-A16 signal at plan-authoring time
```

### 7.2 Cross-signal cluster detection

If the same set of flows shows MISSING on multiple signals simultaneously, that cluster is reported as a fleet-wide root cause:

Example from chata_data_2 corpus:
- FLOW-37, 38, 39, 40, 45: all show NO_UI for tenant-facing processes (Signal 3), all show MISSING on PNGs (Signal 4)
- Cross-signal cluster: 5-flow Potemkin shell pattern — React pages exist on disk but aren't routed in App.tsx
- Fleet finding: one structural fix (route registration) resolves all 5 flows; individual plan fixes would miss the common root

### 7.3 Correction-thread audit — NEW v1.3

The correction-thread audit is a fleet-wide check for the N-A18 failure mode (prior context not threaded). The reviewer:

1. Collects all user corrections issued in the last N sessions across all flows
2. For each correction, locates which flows' plans were authored or revised after the correction
3. For each such plan, checks whether the correction is explicitly threaded (per Gate 0k from `XIIGEN-CODE-REVIEW-PROTOCOL v1.6`)
4. Counts plans that threaded vs didn't

**Fleet finding format:**
```
Correction-thread audit — last 30 sessions
  Corrections issued: 47
  Plans authored/revised after correction: 89 (across 34 flows)
  Threaded explicitly: 62 (70%)
  Threaded generically ("addressed feedback"): 15 (17%)
  Not threaded: 12 (13%)
  → FLEET FINDING: 13% of plans drop user corrections silently — targeted enforcement needed at Gate 0k
```

The audit catches the chata_data_2 → chata_data_3 failure pattern at fleet scope: nine corrections issued about per-flow structure, subsequent plan in next session produced project-wide batch structure, zero threading.

---

## 8. Fleet review output

The reviewer produces a single document: `docs/design-reviews/FLEET-DESIGN-REVIEW-v{N}-{date}.md`

Structure:

```
# XIIGen Fleet Design Review v[N]
## Date: [date]
## Reviewer: [session identifier]
## Scope: [flows in scope]

## Executive summary
- Flows reviewed: [count]
- PASS: [count]
- PARTIAL: [count]
- BLOCKED: [count]
- Top fleet findings: [3-5 most significant]

## Fleet signal table
[full 11-column table, all flows]

## Fleet-level findings

### Finding F1 — [name]
[description with evidence, cross-referenced signal counts]

### Finding F2 — [name]
[...]

## Correction-thread audit

[audit results per Section 7.3]

## Recommended systemic fixes

[fixes that resolve multi-flow patterns rather than per-flow patches]

## Per-flow action list

[flows with BLOCKED verdict, specific next action for each]

⛔ STOP — fleet review produced. Awaiting your direction on which findings to act on.
```

---

## 9. "How the fleet reviewer writes" — voice and structure

### 9.1 Table first, prose second

The fleet signal table is the primary artifact. Prose findings reference specific table entries. A fleet review with no table, or with a table produced as an afterthought, is in the wrong shape — the table IS the review; the prose is commentary on the table.

### 9.2 Fleet signals before fleet opinions

Every finding cites specific per-flow signal counts. "The fleet has a visual proof problem" is not a finding. "Signal 4 MISSING on 41 of 47 flows; 39 of those 41 are tenant-facing per Signal 3" is a finding.

### 9.3 Root cause above flow count

When a pattern shows up across 5+ flows, the reviewer's next move is to ask: is there a common root cause? Five individual flow fixes are often wasteful when one structural fix resolves all five. The fleet reviewer's value-add is identifying the structural cause that per-plan review cannot see.

### 9.4 The correction-thread audit is mandatory

Even when everything else looks green, run the correction-thread audit. It catches process problems (the Response Construction Protocol not being applied at authoring time) that won't show up in per-plan review.

### 9.5 ⛔ STOP at findings, not recommendations

The fleet reviewer's job is to produce findings with evidence. Recommending specific fixes is the next step, which Luba directs. The reviewer proposes; the user disposes.

---

## 10. Fleet reviewer self-habits

The fleet reviewer is subject to the same SK-538 catalog. Common failures:

- **N-A11 (narrow plans needing widening):** fleet review that omits a subset of flows (FLOW-00.x variants, FLOW-02-incoming) without declared scope. Fix: scope declaration in Section 3 preparation must be explicit; omissions require justification.
- **N-A12 (enumeration substituting for meaning):** fleet review that produces only the signal table without fleet-level findings. Fix: every review includes Section 7 aggregations and Section 7.2 cluster detection.
- **N-A18 (prior context not threaded):** fleet review v{N} that doesn't reference findings from review v{N-1} — what was resolved, what persists, what worsened. Fix: every fleet review's Executive Summary includes a trend line relative to the prior review.
- **N-A20 (source-layer confusion):** fleet review claims cited as facts without source-layer tags. Fix: every finding cites `[signal-table:row/column]`, `[flow:file:line]`, or `[prior-review:v{N}:section]`.

The fleet reviewer runs the three-step doc-first loop on their own draft before emission, same as the per-plan reviewer and the plan author.

---

## 11. Versioning

- v1.0 — initial fleet protocol, 6 signals, 6 columns
- v1.1 — added Signal 6 (architect discipline) per SK-538 v1.1.0 rollout, 7 signals, 7 columns
- v1.2 — expanded Signal 6 to include cluster-aware scan, added "How the fleet reviewer writes" section; 7 signals in 7 columns (column count unchanged, signal definitions refined)
- v1.3 — added Signals 7 (inputs-absorbed), 8 (shape-match), 9 (PNG-evidence), 10 (MD-companions), 11 (user-order-preserved); added correction-thread audit section; added fleet-reviewer self-habits section; 11 signals in 11 columns
- v1.4 — added Signal 12 (UI/UX compliance — FC-18 Audit Trail per page); Signal 3 cross-reference added to Signal 12 definition; fleet signal table expanded to 12 columns + 13th verdict column; per-flow verdict aggregation updated for S12 blocking rules; fleet distribution updated to 12 signals; observability updated to 12 columns; 12 signals in 12 columns

---

## 12. Observability

For any fleet review using this protocol:

- Fleet signal table complete for all flows in scope
- Every per-flow row has verdicts in all 12 signal columns (PASS, PARTIAL, MISSING, CONCERN, or N/A)
- Fleet-level aggregations in Section 7 include per-signal distribution AND cross-signal cluster detection
- Correction-thread audit run and results reported in Section 7.3
- Top findings each cite specific signal counts
- Document saved to `docs/design-reviews/FLEET-DESIGN-REVIEW-v{N}-{date}.md`

Reviews missing any of the above are out of protocol compliance and should be re-run.

---

## 13. Cross-references

- **SK-538 v1.2.0** — architect habits catalog, used in Signal 6 and fleet-reviewer self-habits
- **SK-537** — design artifact completeness, used in Signal 2
- **SK-529** — reconnaissance gate, required in Section 3 preparation
- **RESPONSE-CONSTRUCTION-PROTOCOL v1.0** — its Steps 1, 3, 5, 6 map to Signals 11, correction-thread-audit, source-layer-tags, and plan-recheck
- **XIIGEN-CODE-REVIEW-PROTOCOL v1.7** — Gates 0i, 0j, 0k, 0l, 0m produce the per-flow inputs for Signals 6, 11, 12, correction-thread-audit, source-layer-tags
- **HOW-TO-USE-SKILLS v4.4.0** — Rule 33 mandates response construction; fleet review is where fleet-wide compliance is verified; Mandatory Check 15 (FC-18) feeds Signal 12
- **FLOW-DOCUMENT-AUTHORING-GUIDE v1.15** — General Rule 30 (three-step loop at authoring), Rules 31 (JSON+MD companions), 32 (Playwright PNG per feature + UX review loop), 33 (topology disambiguation), 34 (UI/UX compliance) — enforced fleet-wide by Signals 10, 9, 1, 12
- **SK-539** — UI/UX compliance skill (29 checks, 52-role taxonomy, 7 screen templates, 4 missing pages) — Signal 12 verifies SK-539 Phase 7 was executed
- **FC-18** — UI/UX compliance gate (`fc-18-ui-ux-compliance-gate.md`) — Signal 12 reads from FC-18 Audit Trail at `docs/ux-review/{slug}/FC-18-AUDIT-TRAIL.md`
- **XIIGEN-DESIGN-ARCHITECT-SESSION-GUIDE v1.7** — defines the per-session architect discipline; Mistake 22 (starting React pages without SK-539) feeds Signal 12
