---
name: qa-session-type
sk_number: SK-481
version: "2.0.0"
priority: HIGH
load_order: 0
category: planning
author: luba
updated: "2026-04-24"
contexts: ["claude-code", "web-session"]
description: >
  Defines QA as a formal session type. A QA session validates a delivered phase
  against acceptance criteria, runs C1-C5 client test categories, and produces
  a QA report (APPROVED or DEFECTS_FOUND). OPTIONAL for Wave 0/1 sequential
  execution. RECOMMENDED for Wave 2+ parallel execution where self-approval
  across 5 simultaneous flows is inadequate. v2.0.0 adds Step 5b: protocol
  completeness check (SK-553 Layer 1, Phase 0 auth, SK-554 NDJSON counts,
  D-HIST-001, per-role visual, R6, repo evidence, tenantCertTier) — mandatory
  before verdict on any QA session where Phase G, H, or I ran.
triggers:
  - "QA session"
  - "validate this phase"
  - "approve phase"
  - "phase review"
  - "qa review"
  - "acceptance criteria check"
  - "phase sign-off"
  - "protocol completeness check"
  - "auth status check"
  - "portability completeness"
---

# QA Session Type Skill (SK-481 v2.0.0)

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

### Step 4 — Training data quality (Phase E QA only)

Load SK-479 (training-data-quality-audit) for Phase E QA sessions.
This is mandatory before approving any Phase E output.

### Step 5b — Protocol completeness check (NEW v2.0.0 — MANDATORY when Phase G/H/I ran)

Before finalising the verdict in the QA report, verify that all protocol gates
have been run and their status fields are populated in IMPL-STATE.json.
This step runs for every QA session on a phase at or after Phase G.

```bash
IMPL="docs/sessions/FLOW-XX/FLOW-XX-IMPL-STATE.json"

# Read all protocol status fields
PORTABILITY=$(jq -r '.portabilityStatus // "TBD"' $IMPL 2>/dev/null || echo "TBD")
AUTH=$(jq -r '.authStatus // "TBD"' $IMPL 2>/dev/null || echo "TBD")
TIER=$(jq -r '.tenantCertTier // "NONE"' $IMPL 2>/dev/null || echo "NONE")
SK553_L1=$(jq -r '.portabilityTest.layer1.status // "NOT_RUN"' $IMPL 2>/dev/null || echo "NOT_RUN")
SK553_P0=$(jq -r '.portabilityTest.phase0Auth.status // "NOT_RUN"' $IMPL 2>/dev/null || echo "NOT_RUN")
PROTO_L1=$(jq -r '.protocolStatus.sk553Layer1 // "NOT_RUN"' $IMPL 2>/dev/null || echo "NOT_RUN")
SCOPE_ISO=$(jq -r '.protocolStatus.ndjsonScopeIsolation // 0' $IMPL 2>/dev/null || echo "0")
NO_TYPE=$(jq -r '.protocolStatus.ndjsonNoTypeRecords // 0' $IMPL 2>/dev/null || echo "0")
D_HIST=$(jq -r '.protocolStatus.dHist001SdkImports // 0' $IMPL 2>/dev/null || echo "0")

echo "=== PROTOCOL COMPLETENESS CHECK ==="
echo "portabilityStatus : $PORTABILITY"
echo "authStatus        : $AUTH"
echo "tenantCertTier    : $TIER"
echo "SK-553 Layer 1    : $SK553_L1"
echo "SK-553 Phase 0    : $SK553_P0"
echo "NDJSON scope_iso  : $SCOPE_ISO (expected ≥1)"
echo "NDJSON no-type    : $NO_TYPE (expected 0)"
echo "D-HIST-001 SDKs   : $D_HIST (expected 0)"
```

**Per-role visual verification (for flows with React pages):**
```bash
# Check per-role visual evidence exists (required for TIER-C+)
VISUAL_CELLS=$(ls docs/e2e-snapshots/FLOW-XX/per-role/ 2>/dev/null | wc -l)
echo "Per-role visual cells: $VISUAL_CELLS"
# Expected: ≥ N_roles × 3 (en + he-RTL + mobile) for TIER-C

# R6 cross-tenant JWT isolation test (required for TIER-C+)
R6_TESTS=$(grep -rcE "cross.tenant|tenantB.*token"   server/src/engine/flows/{slug}/ --include="*.spec.ts" 2>/dev/null   | awk -F: '{sum+=$2} END {print sum+0}')
echo "R6 cross-tenant tests: $R6_TESTS"   # Expected: ≥1 for TIER-C

# Repo naming evidence (required for TIER-B+)
REPO_EVIDENCE=$(ls docs/e2e-snapshots/FLOW-XX/repo-evidence/ 2>/dev/null | wc -l)
echo "Repo evidence screenshots: $REPO_EVIDENCE"   # Expected: ≥1 for TIER-B
```

**Protocol completeness verdict rules:**

| Check | Expected | Fail condition | Severity |
|-------|----------|---------------|----------|
| `portabilityStatus` | `MOBILE` or `PARTIAL_GAP` | `TBD` on completed flow | **BLOCKING** |
| `authStatus` | `AUTH_READY` or `AUTH_DEFERRED` | `TBD` on completed flow | **BLOCKING** |
| `SK-553 Layer 1` | `PASS` or `NOT_RUN` (if TIER not target) | `FAIL` | **BLOCKING** |
| `NDJSON scope_isolation` | ≥ 1 | 0 | **BLOCKING** (SK-554) |
| `D-HIST-001 SDK imports` | 0 | > 0 | **BLOCKING** |
| `NDJSON no-type records` | 0 | > 0 | NON-BLOCKING (HIGH) |
| `tenantCertTier` | any non-`NONE` (if distributable) | `NONE` when distributable | NON-BLOCKING |
| Per-role visual cells | ≥ N_roles × 3 (TIER-C) | 0 when targeting TIER-C | NON-BLOCKING |
| R6 cross-tenant tests | ≥ 1 (TIER-C) | 0 when targeting TIER-C | NON-BLOCKING |
| Repo evidence PNGs | ≥ 1 (TIER-B) | 0 when targeting TIER-B | NON-BLOCKING |

**When to run Step 5b:**
- **Always:** When IMPL-STATE.json contains fields `portabilityStatus` or `authStatus`
- **Phase G close QA:** portabilityStatus, SK-553 L1, D-HIST-001, NDJSON counts
- **Phase H close QA:** authStatus, SK-553 Phase 0
- **Phase I close QA:** tenantCertTier, per-role visual, R6, repo evidence
- **Skip entirely:** If `phase_status` is PHASE_E or earlier (protocol gates not yet applicable)

**Step 5b findings become QA-NNN defects** in the Step 5 QA report.
BLOCKING findings prevent APPROVED verdict.

---

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

## PROTOCOL COMPLETENESS (Step 5b — NEW v2.0.0)
| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| portabilityStatus | MOBILE / PARTIAL_GAP | [value from IMPL-STATE] | PASS / FAIL |
| authStatus | AUTH_READY / AUTH_DEFERRED | [value from IMPL-STATE] | PASS / FAIL |
| tenantCertTier | non-NONE (if distributable) | [value] | PASS / FAIL / N/A |
| SK-553 Layer 1 | PASS (or NOT_RUN if non-distributable) | [value] | PASS / SKIP |
| NDJSON scope_isolation | ≥ 1 | [count] | PASS / FAIL |
| D-HIST-001 SDK imports | 0 | [count] | PASS / FAIL |
| NDJSON no-type records | 0 | [count] | PASS / WARN |

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

## DEFECT SEVERITY CLASSIFICATION

**BLOCKING:** Phase may not progress until resolved.
- Test failures (P19 violation)
- SILENT_FAILURE class in DPO triple (training data contamination)
- Missing ISSUE INVENTORY entry for known issue
- Acceptance criterion fails
- `portabilityStatus = TBD` on completed flow (Step 5b — Phase G gate never ran)
- `authStatus = TBD` on completed flow (Step 5b — Phase H gate never ran)
- `NDJSON scope_isolation = 0` (Step 5b — SK-554 mandatory record absent)
- `D-HIST-001 SDK imports > 0` (Step 5b — direct SDK usage found in service files)

**NON-BLOCKING:** Noted, tracked, may progress with authorization.
- Documentation gaps
- Test coverage below ideal (but not zero)
- Style issues with no behavioral impact

---

## KEY RULE: STEP 5b IS MANDATORY AFTER PHASE G/H/I

Step 5b is not a "nice to have" audit — it is the QA session's mechanism for
enforcing that V9, V10, and V11 gates in the implementation plan actually ran
and wrote their results.

**The enforcement logic:**
- Phase G close → portabilityStatus must not be TBD in IMPL-STATE.json
- Phase H close → authStatus must not be TBD in IMPL-STATE.json
- Phase I close → tenantCertTier must not be NONE for distributable flows

Without Step 5b, a QA session can APPROVE a phase where Phase G/H/I was declared
in the implementation plan but skipped at execution time. TBD fields in
IMPL-STATE.json are the fingerprint of a skipped gate. Step 5b makes that
fingerprint visible before the APPROVED verdict is issued.

**GOAL_REACHED blocker:** A flow cannot reach GOAL_REACHED with portabilityStatus
= TBD or authStatus = TBD. QA sessions for Phase F or later must detect this
via Step 5b before issuing APPROVED — issuing APPROVED without Step 5b when
these fields are TBD is a SILENT_FAILURE at the QA level.

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

---

*SK-481 v2.0.0 — QA Session Type*
*v1.0.0: QA session type, C1-C5 checks, APPROVED/DEFECTS_FOUND report*
*v2.0.0: Step 5b protocol completeness check (portabilityStatus, authStatus,*
*tenantCertTier, SK-553 L1, SK-553 Phase 0, SK-554 NDJSON counts, D-HIST-001,*
*per-role visual, R6, repo evidence). BLOCKING severity extended. Key rule added:*
*Step 5b mandatory when Phase G/H/I ran; TBD fields = skipped gate = BLOCKED.*
*Closes AUTH-ARBITER-SKILLS-REMEDIATION-PLAN-v3.0 Phase 20.*
