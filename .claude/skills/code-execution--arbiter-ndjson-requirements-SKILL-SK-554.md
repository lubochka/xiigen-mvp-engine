---
name: arbiter-ndjson-requirements
sk_number: SK-554
version: "1.0.0"
priority: MANDATORY
load_order: null
category: code-execution
author: luba
updated: "2026-04-24"
contexts: ["claude-code", "web-session"]
description: >
  Defines minimum arbiter type requirements for fixtures/arbiters/{slug}-arbiters.bulk.ndjson.
  Distinct from arbiter-panel-design-SKILL (SK-442) which governs TypeScript arbiterConfig
  in EngineContracts — that is a different system. This skill governs the Elasticsearch
  bulk-load fixture files that seed arbiter records per flow.
  Closes: B-gap from AUTH-ARBITER-SKILLS-REMEDIATION-PLAN-v3.0 — no skill previously
  defined which arbiter types a flow NDJSON must contain.
triggers:
  - "arbiter NDJSON"
  - "arbiter types"
  - "bulk.ndjson"
  - "scope_isolation missing"
  - "arbiterType"
  - "arbiter coverage"
  - "which arbiters required"
  - "flow plan arbiter"
  - "examine flow plan"
  - "plan review arbiter"
  - "TEACH-QA arbiter"
---

# Arbiter NDJSON Requirements Skill (SK-554) v1.0

## WHY THIS SKILL EXISTS

When reviewing a flow plan or examining a flow's arbiter fixture, there was no guidance
on which arbiter types the `fixtures/arbiters/{slug}-arbiters.bulk.ndjson` file must
contain. The existing check — "scope_isolation must be the last record" — verified
ordering but not presence, type coverage, or field completeness.

The review of 49 flows (XIIGEN-AUTH-ROLES-GROUPS-PLAN-v2 review, 2026-04-24) found:
- ~540 arbiter records with no `arbiterType` field across the corpus
- 3 flows with no NDJSON at all (FLOW-00, FLOW-24, FLOW-47)
- 14 distinct arbiter types in the corpus with no minimum specification

This skill defines what a compliant NDJSON must contain so that:
1. Plan reviewers know what to check (FC-20 in plan-review-skill v2.1)
2. TEACH-QA reviewers know what to flag (UC-7 in GUIDE-B19 v2)
3. GUIDE-B17 Phase A gate checks type coverage, not just ordering
4. QA sessions (SK-481 v2.0 Step 5b) have concrete pass/fail criteria

---

## THE TWO ARBITER SYSTEMS — DO NOT CONFUSE

| System | Governed by | What it covers |
|--------|------------|----------------|
| TypeScript `arbiterConfig` in `EngineContract` | SK-442 arbiter-panel-design + FC-32 | AI pipeline judges during code generation (business_logic, security, key_principles, etc.) |
| NDJSON fixture files `fixtures/arbiters/{slug}-arbiters.bulk.ndjson` | **This skill (SK-554)** | ES bulk-load records seeded at bootstrap; define arbiter rules per flow operation |

A flow can have a correct TypeScript arbiterConfig and still have a broken NDJSON.
Both systems must be compliant independently.

---

## MINIMUM TYPE MATRIX

The minimum required `arbiterType` values depend on flow characteristics.
Assess each characteristic for the flow under review, then verify the corresponding
types are present.

| Flow characteristic | Required arbiterType | Minimum count | FAIL condition |
|--------------------|---------------------|---------------|----------------|
| **Any flow** | `scope_isolation` | ≥1 per service that reads/writes tenant data | 0 records = CRITICAL FAIL |
| PII flow (email, names, payment data) | `security` | ≥1 | Absent on PII/payment flow = CRITICAL FAIL |
| Flow has BFA CF rules | `iron_rules` | ≥1 per CF rule | Absent when CF rules exist = HIGH |
| Flow has domain business logic | `domain` | ≥3 | Fewer than 3 on business-logic flow = HIGH |
| Flow uses DNA-8 outbox pattern | `outbox_pattern` | ≥1 | Absent when outbox used = HIGH |
| Flow exposes HTTP endpoints | `http_contract` | ≥1 per controller | Absent when controllers exist = HIGH |
| CLS-era flow (ClsService present) | `cls_switch_boundary` | ≥1 | Absent on CLS-era flow = HIGH |
| Auth/JWT flow (login, token issuance) | `security` | ≥3 | Fewer than 3 on auth flow = CRITICAL FAIL |
| Identity-critical (FLOW-15, FLOW-46) | `security` + `iron_rules` | ≥2 each | Either absent = CRITICAL FAIL |

**Universal rule:** Every record in the NDJSON file must have `arbiterType` field
populated (non-empty string). Records with null or empty `arbiterType` = HIGH finding.

---

## DETECTION COMMANDS

Run these commands against any flow's arbiter NDJSON file. Replace `{slug}` with
the flow's canonical slug (e.g. `user-registration`, `marketplace`).

```bash
NDJSON="fixtures/arbiters/{slug}-arbiters.bulk.ndjson"

# ── COMMAND 1 — Type distribution (shows what's present) ──────────────────
jq '[.[]] | group_by(.arbiterType) | map({type: .[0].arbiterType, count: length})' \
  $NDJSON

# Expected output (example for a business-logic PII flow):
# [
#   {"type":"domain","count":5},
#   {"type":"iron_rules","count":2},
#   {"type":"scope_isolation","count":4},
#   {"type":"security","count":1}
# ]

# ── COMMAND 2 — Records without arbiterType (must be 0) ───────────────────
jq '[.[] | select(.arbiterType == null or .arbiterType == "")] | length' $NDJSON
# Expected: 0
# If > 0: HIGH finding — backfill arbiterType on each affected record

# ── COMMAND 3 — scope_isolation count (must be ≥1) ────────────────────────
jq '[.[] | select(.arbiterType == "scope_isolation")] | length' $NDJSON
# Expected: ≥1
# If 0: CRITICAL FAIL — every flow touching tenant data needs scope_isolation

# ── COMMAND 4 — security count (for PII/auth flows) ──────────────────────
jq '[.[] | select(.arbiterType == "security")] | length' $NDJSON
# Expected: ≥1 for PII flow; ≥3 for auth/JWT flow

# ── COMMAND 5 — scope_isolation ordering (must be LAST record) ─────────────
tail -1 $NDJSON | jq '.arbiterType'
# Expected: "scope_isolation"
# Note: FC-32 governs this ordering. SK-554 governs type presence (different checks).

# ── COMMAND 6 — Full type summary script ──────────────────────────────────
echo "=== ARBITER NDJSON AUDIT: {slug} ==="
echo "Total records: $(jq 'length' $NDJSON)"
echo ""
echo "Type distribution:"
jq -r '[.[]] | group_by(.arbiterType) | .[] | "  \(.[0].arbiterType // "NO_TYPE"): \(length)"' \
  $NDJSON | sort
echo ""
echo "Records without arbiterType: $(jq '[.[] | select(.arbiterType == null or .arbiterType == "")] | length' $NDJSON)"
echo "scope_isolation count: $(jq '[.[] | select(.arbiterType == "scope_isolation")] | length' $NDJSON)"
echo "security count: $(jq '[.[] | select(.arbiterType == "security")] | length' $NDJSON)"
echo "Last record type: $(tail -1 $NDJSON | jq -r '.arbiterType')"
```

---

## ASSESSMENT PROTOCOL

When reviewing a flow plan or TEACH-QA document, run this protocol:

### Step 1 — Identify flow characteristics
```
□ Does this flow touch PII? (email, names, payment)
□ Does this flow have BFA CF rules? (grep for CF- references in contracts)
□ Does this flow have domain business logic? (most flows — yes)
□ Does this flow use the DNA-8 outbox pattern?
□ Does this flow expose HTTP controllers?
□ Is this flow CLS-era? (grep for ClsService in services)
□ Is this flow an auth/JWT flow?
□ Is this flow identity-critical? (FLOW-15 masterTenantId, FLOW-46 superJudge.model)
```

### Step 2 — Run detection commands 1-6

### Step 3 — Apply minimum type matrix

For each characteristic that applies, verify the required type is present at the
required count. Record the verdict per type.

### Step 4 — Issue findings

| Severity | Finding | Action required |
|----------|---------|----------------|
| 🔴 CRITICAL | `scope_isolation` absent (any flow) | Produce TEACH-QA R1-FINAL; block plan approval |
| 🔴 CRITICAL | `security` absent on PII/auth/identity-critical flow | Produce R1-FINAL |
| 🟠 HIGH | Records with null/empty arbiterType | Produce R1-FINAL |
| 🟠 HIGH | `domain` < 3 on business-logic flow | Produce R1-FINAL |
| 🟠 HIGH | `iron_rules` absent when BFA CF rules exist | Produce R1-FINAL |
| 🟡 MEDIUM | `outbox_pattern` absent when DNA-8 used | Note in TEACH-QA |
| 🟡 MEDIUM | `http_contract` absent when controllers exist | Note in TEACH-QA |

---

## VERDICTS USED IN FC-20 AND UC-7

When this skill is invoked by:
- **FC-20** (plan-review-skill v2.1): return PASS | WARN | FAIL per type
- **UC-7** (GUIDE-B19 v2 TEACH-QA): return CRITICAL | HIGH | MEDIUM | PASS per finding

**FC-20 verdict rules:**
- `FAIL`: scope_isolation absent, OR security absent on PII/auth flow
- `WARN`: empty arbiterType records > 0, OR domain < 3, OR iron_rules absent
- `PASS`: all required types present at required counts, all records have arbiterType

**UC-7 verdict rules:** See detection commands 2-4. Each CRITICAL or HIGH finding
triggers R1-FINAL production. Multiple findings produce one R1-FINAL, not one per finding.

---

## RELATIONSHIP TO EXISTING SKILLS

```
SK-554 arbiter-ndjson-requirements
  ← loaded by: plan-review-skill v2.1 (FC-20)
  ← loaded by: GUIDE-B19 TEACH-QA v2 (UC-7)
  ← loaded by: GUIDE-B17 Phase A gate (type coverage check)
  ← loaded by: QA session type SK-481 v2.0 (Step 5b protocol completeness)

  ↔ distinct from: SK-442 arbiter-panel-design (TypeScript arbiterConfig — different system)
  ↔ distinct from: SK-526 scope-isolation-arbiter (runtime arbiter execution — different layer)
  ↔ complements: FC-32 scope_isolation ordering (SK-554 checks presence; FC-32 checks ordering)
```

---

## ANTI-PATTERNS

| Anti-pattern | Why it fails |
|-------------|-------------|
| Only checking "scope_isolation is last" | Ordering ≠ presence. A file with scope_isolation last can have 540 records without arbiterType. |
| Treating arbiterType absence as cosmetic | ~540 corpus records had no arbiterType. The coverage matrix cannot be calculated without it. |
| Assuming arbiter-panel-design covers NDJSON types | arbiter-panel-design covers TypeScript arbiterConfig (different system). |
| Calling a NDJSON compliant because it has many records | Record count does not imply type coverage. FLOW-11 has 204 records; FLOW-32 has 8. Count is not correctness. |
| Requiring a fixed record count | There is no minimum total record count. The minimum is type coverage per characteristic. |
