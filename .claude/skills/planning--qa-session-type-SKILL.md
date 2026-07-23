---
name: qa-session-type
sk_number: SK-481
version: "1.0.0"
priority: HIGH
load_order: 0
category: planning
author: luba
updated: "2026-03-26"
contexts: ["claude-code", "web-session"]
description: >
  Defines QA as a formal session type. A QA session validates a delivered phase
  against acceptance criteria, runs C1-C5 client test categories, and produces
  a QA report (APPROVED or DEFECTS_FOUND). OPTIONAL for Wave 0/1 sequential
  execution. RECOMMENDED for Wave 2+ parallel execution where self-approval
  across 5 simultaneous flows is inadequate. The HOW-TO-USE update for this
  session type is in HOW-TO-USE-SKILLS-v2.6.0.
triggers:
  - "QA session"
  - "validate this phase"
  - "approve phase"
  - "phase review"
  - "qa review"
  - "acceptance criteria check"
  - "phase sign-off"
---

# QA Session Type Skill (SK-481)

## WHEN QA SESSIONS APPLY

**OPTIONAL — Wave 0 and Wave 1 (sequential execution, one developer):**
Luba reviews every output at each ⛔ STOP. Self-approval with ISSUE INVENTORY
and ENGINE PROGRESS is sufficient. The QA session type is available but not
required. Use it when a phase output needs independent validation.

**RECOMMENDED — Wave 2+ (parallel execution, 5+ flows simultaneously):**
When 5 flows are completing Phase D and E simultaneously, self-approval does
not scale. Each flow's ISSUE INVENTORY may be complete but cross-flow
interactions are not verified. A QA session per flow before Wave 2 progression
prevents compounding errors across parallel execution.

**REQUIRED — Any phase producing DPO triples:**
Phase E output must always be validated before training data enters the index.
SK-479 (training-data-quality-audit) runs inside the QA session for Phase E.

---

## QA SESSION STRUCTURE

### Inputs
- Phase completion package (PHASE-COMPLETE-N.md, SESSION-BRIEF-N.md, EXECUTION-LOG-N.json)
- Acceptance criteria for this task type (from SK-482 or qualityGates[] in contract)
- Previous ISSUE INVENTORY

### Step 1 — Verify completion claims

Do not trust PHASE-COMPLETE claims without verification:

```bash
# Verify test gate was actually zero failures (not just claimed)
cd server && npx jest 2>&1 | tail -5
# Must show 0 failures — not just "passed" without failure count

# Verify STATE.json reflects actual completion
jq '.phases.D.status' FLOW-XX-STATE.json
# Expected: "COMPLETE" — if "PENDING" claim in PHASE-COMPLETE is wrong

# Verify DPO triple count (Phase E QA)
curl -sf "localhost:9200/xiigen-training-data/_count" \
  -d '{"query":{"bool":{"must":[
    {"term":{"flowId.keyword":"FLOW-XX"}},
    {"term":{"countsTowardThreshold":true}}
  ]}}}' | jq '.count'
# Must match dpoTripleCount in STATE.json
```

### Step 2 — Run acceptance criteria checks

Load acceptance criteria from the contract's qualityGates[] field (or SK-482 output
if produced before Phase A):

```bash
# Get all qualityGates for this task type
curl -sf "localhost:9200/xiigen-engine-contracts/_doc/T47" \
  | jq '._source.qualityGates[] | {criterion: .criterion, verifyCommand: .verifyCommand}'

# Run each verify_command
# A failing verify_command = DEFECT that must appear in ISSUE INVENTORY
```

### Step 3 — Client test category coverage (UI-producing flows only)

For flows with `clientArchitecture` in topology:

```bash
# Check C1-C5 coverage per the flow's client_test_breakdown in STATE.json
jq '.client_test_breakdown' FLOW-XX-STATE.json
# Expected: non-zero values in relevant categories

# Run client integration tests if available
npm run test:client-integration --flow=FLOW-XX 2>/dev/null || echo "Not configured yet"
```

### Step 3b — Integration-path verification (always-active, universal)

A QA session must confirm that the interfaces this phase exposes to **downstream**
consumers actually exist and are **not stubs**. A green unit suite can still ship a
method that a later flow will call but which is `TODO`/throws — that is a DEFECT,
not "done". This step runs for EVERY QA session, not only UI flows:

```bash
# 1) Every method the topology says downstream flows call exists and is implemented.
#    No NotImplementedException-equivalent / TODO / `throw new Error('not implemented')`
grep -rnE "TODO|FIXME|not implemented|NotImplemented|throw new Error\(['\"]unimplemented" \
  server/src/engine/flows/FLOW-XX/ | grep -v "\.spec\.ts"
# Expected: 0 hits on any method declared complete by this phase.

# 2) The downstream-facing interface is wired (DI provider exists, not just declared):
grep -rn "provide:.*<IDownstreamInterface>" server/src/**/*.module.ts
# Expected: ≥1 — the consumer can actually resolve it.
```

```
□ No TODO/FIXME/unimplemented marker in any method declared complete this phase
□ Each downstream-facing interface method has a real body (returns DataProcessResult)
□ The interface is registered in a NestJS module (resolvable by consumers)
```
A stub in a method that the completion package calls "complete" is a **BLOCKING**
defect (see severity table) — it is the same masquerade class as a green-but-empty test.

### Step 4 — Training data quality (Phase E QA only)

Load SK-479 (training-data-quality-audit) for Phase E QA sessions.

> **NOTE-ONLY for this project (R5).** Phase-E DPO/training-data quality is a
> *common-model* concern, and the common trainable model + its DPO sets live in
> `llm_mvp_core`, not in mvp. In mvp this step is **conditional/note-only**: run it
> only if a phase here genuinely emits training triples for core (rare). For ordinary
> mvp phases there is no Phase-E DPO output, so Step 4 does not gate the verdict —
> do not block APPROVED on a missing local training-data audit, and do not build a
> local DPO pipeline to satisfy it.

### Step 5 — Produce QA report

```bash
cat > sessions/FLOW-XX/QA-REPORT-PHASE-N.md << 'EOF'
# QA REPORT — FLOW-XX Phase N
## Date: [date]
## Reviewer: [who ran the QA session]
## Verdict: APPROVED | DEFECTS_FOUND

## ACCEPTANCE CRITERIA RESULTS
| Criterion | Command | Result |
|-----------|---------|--------|
| [criterion 1] | [command] | PASS |
| [criterion 2] | [command] | FAIL — see DEFECTS |

## TEST GATE VERIFICATION
- Server tests: failures === 0 ✅ / ❌
- Client tests: N/A | [result]
- DPO triple count: [N] toward threshold

## DEFECTS FOUND (if DEFECTS_FOUND verdict)
| ID | Description | Severity | Assigned |
|----|-------------|----------|---------|
| QA-001 | [description] | BLOCKING | [session] |

## BLOCKING DEFECTS: [N]
## NON-BLOCKING DEFECTS: [N]

## VERDICT: APPROVED | DEFECTS_FOUND
## If APPROVED: this phase may progress.
## If DEFECTS_FOUND: blocking defects must be resolved before progression.
EOF
```

---

## VERDICT IS STRICTLY BINARY (universal — no third state)

The QA verdict is exactly one of two tokens: **`APPROVED`** or **`DEFECTS_FOUND`**.
There is no `PARTIAL`, `CONDITIONAL`, `APPROVED_WITH_CAVEATS`, `APPROVED_PENDING`,
`MOSTLY_PASS`, or any softened variant.

```
✓ Verdict ∈ { APPROVED, DEFECTS_FOUND }
✗ "APPROVED (with 2 non-blocking notes that should be fixed soon)"  → NOT a verdict
✗ "PARTIAL — happy path passes, edge cases pending"                 → that is DEFECTS_FOUND
✗ "CONDITIONAL approval if the team fixes X later"                  → that is DEFECTS_FOUND
```

Rule: **any** BLOCKING defect ⇒ the verdict is `DEFECTS_FOUND`. Non-blocking defects
are recorded but do **not** create a middle verdict — a phase with only non-blocking
defects is `APPROVED` and the non-blocking items are tracked. The binary verdict is
what makes QA a real gate instead of a negotiation. A "partial/conditional" verdict
is itself a process defect: rewrite it as `DEFECTS_FOUND` and list the blocking items.

---

## DEFECT SEVERITY CLASSIFICATION

**BLOCKING:** Phase may not progress until resolved.
- Test failures (P19 violation)
- SILENT_FAILURE class in DPO triple (training data contamination)
- Missing ISSUE INVENTORY entry for known issue
- Acceptance criterion fails

**NON-BLOCKING:** Noted, tracked, may progress with authorization.
- Documentation gaps
- Test coverage below ideal (but not zero)
- Style issues with no behavioral impact

---

## RELATIONSHIP TO ⛔ STOP GATES

The QA session does NOT replace the ⛔ STOP + human approval (Luba). It is a
pre-approval validation step. Sequence:

```
Phase completes → Developer runs ⛔ STOP gate (ISSUE INVENTORY + ENGINE PROGRESS)
→ Developer presents PHASE-COMPLETE → QA session runs (optional Wave 0/1, required Wave 2)
→ QA report produced → Luba reviews QA report + PHASE-COMPLETE → approves progression
```

For Wave 0/1: QA session is the ⛔ STOP gate enriched. Run SK-479 inside it for Phase E.
For Wave 2: QA session is a mandatory step before Luba sees the output.
