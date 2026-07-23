---
name: flow-portability-test-protocol
sk_number: SK-553
version: "1.0.0"
load_order: null
priority: HIGH
status: APPROVED
category: code-execution
author: luba
updated: "2026-04-23"
contexts: ["claude-code", "web-session"]
description: >
  Converts a MOBILE flow into a TENANT-READY flow. Three layers:
  Layer 1 (unit — available for every flow), Layer 2 (Playwright e2e),
  Layer 3 (visual SK-549). Closes G-12: protocol was a markdown doc with
  no SK number; sessions that cited it could not actually load it.
triggers:
  - "portability test"
  - "tenant-ready"
  - "MOBILE to tenant-ready"
  - "portability protocol"
  - "Layer 1 portability"
  - "Layer 2 portability"
  - "Layer 3 portability"
  - "PROOF-1"
  - "PROOF-5"
  - "flow distribution"
  - "fork repo"
  - "co-install"
  - "requiredCoInstalls"
---

# Flow Portability Test Protocol (SK-553) v1.0

## WHAT THIS SKILL DOES

Converts a MOBILE flow into a TENANT-READY flow. MOBILE means the flow's code
is portable by construction (P-1..P-5 from dna-compliance-guard v1.1.0 all pass).
TENANT-READY means a second tenant can actually fork, adapt, test, and publish
the flow independently — with evidence.

**Prerequisite before running this skill:**
```bash
# Confirm flow is MOBILE first
grep "portabilityStatus" docs/sessions/{slug}/IMPL-STATE.json
# Expected: "MOBILE"
# If "PARTIAL_GAP" or "NOT_PORTABLE": fix portability gaps first (see dna-compliance-guard v1.1.0)
```

---

## THE THREE LAYERS

A flow earns partial certification and upgrades when layers become available.
Never blocked on a layer that does not yet exist.

```
Layer 1 — Unit (available for every flow today)          → Req-1 + Req-4
Layer 2 — Playwright e2e (when Layer 2 tests exist)      → Req-2 + Req-4
Layer 3 — Visual SK-549 (when baseline PNGs exist)       → Req-3
```

**Critical rule (D3-F5):** Do NOT run the AI Adaptation Protocol (Phase 1-5)
concurrently with GAP-01 work on the same flow. Run adaptation AFTER GAP-01
merges, then regenerate the adaptation surface.

---

## LAYER 1 — Unit Test Gate

### Available: immediately for every flow
### Certifies: Req-1 (decoupling) + Req-4 (independent test)

**Step 1 — Pre-flight: confirm baseline**
```bash
cd /path/to/tenant-fork-repo
npm install
npx jest
# Record baseline: N tests, N passing
```

**Step 2 — Connection annotation check (P-2)**
```bash
grep -rn "@connectionType FLOW_SCOPED" server/src/engine/flows/{slug}/ \
  --include="*.service.ts" | wc -l
# Expected: equals service file count
grep -rL "@connectionType" server/src/engine/flows/{slug}/ --include="*.service.ts"
# Expected: no output (all annotated)
```

**Step 3 — DNA compliance scan**
```bash
echo "P-1: No ClsService" && \
  grep -rc "import.*ClsService\|from 'nestjs-cls'" \
  server/src/engine/flows/{slug}/ --include="*.service.ts" \
  | awk -F: '{sum+=$2} END {print sum+0}'
# Expected: 0

echo "DNA-4: all services extend MicroserviceBase" && \
  grep -rn "^export class.*Service" server/src/engine/flows/{slug}/ \
  --include="*.ts" | grep -v "extends MicroserviceBase\|.spec." | wc -l
# Expected: 0
```

**Step 4 — Behavioral assertion check (D2-F1)**
```bash
# Stub test detection
grep -rcE "expect\(true\)\.toBe\(true\)|expect\(result\.success\)\.toBe\(true\)$" \
  server/src/engine/flows/{slug}/ --include="*.spec.ts" | wc -l
# Expected: 0

# Domain-outcome assertions present
grep -rcE "result\.data\[|result\.data\.|toHaveBeenCalledWith" \
  server/src/engine/flows/{slug}/ --include="*.spec.ts" | wc -l
# Expected: > 0
```

**Step 5 — Concurrent tenant isolation test**
```bash
npx jest --testPathPattern="server/src/engine/flows/{slug}" \
  --testNamePattern="concurrent\|tenant.*isolat" --runInBand
# Expected: all pass
```

**Layer 1 PASS criteria:**
- P-2 annotation: 100% service files annotated
- P-1: 0 ClsService imports
- DNA-4: 0 services without MicroserviceBase
- D2-F1: 0 stub tests, ≥1 behavioral assertion per service
- Concurrent tenant isolation: all pass

---

## LAYER 2 — Playwright e2e Gate

### Available: when Playwright tests exist for the flow
### Certifies: Req-2 (forking with code) + Req-4 (independent test)

```bash
# Run Playwright tests for this flow in fork repo
npx playwright test --project=chromium \
  tests/e2e/{slug}/ --reporter=list
# Expected: all pass
```

FREEDOM key adaptation test:
```bash
# Change one FREEDOM key value in the fork's config
# Re-run Playwright — adapted behavior must be visible in the UI
# Evidence: screenshot showing adapted state
```

---

## LAYER 3 — Visual Examination Gate

### Available: when baseline PNG captures exist
### Certifies: Req-3 (AI adaptation surface visible)

**Prerequisites:**
```
Prerequisites: per-image-validation loaded
  Load: read code-execution/per-image-validation-SKILL.md (SK-549) completely
```

Run SK-549 7-axis validation on each captured PNG. Axis D (business-logic phase)
is mandatory for any flow flagged NEEDS_PURPOSE_BUILT_UI.

```bash
# Run SK-549 for each cell in the coverage matrix
# Append results to ROUND-2-COVERAGE-MATRIX.json
# Layer 3 PASS = all primary cells have Axis D: PASS
```

---

## CERTIFICATION RECORD

After each layer passes, update STATE.json:

```json
{
  "portabilityStatus": "MOBILE",
  "portabilityTest": {
    "layer1": {
      "status": "PASS",
      "date": "2026-04-23",
      "evidence": {
        "connectionAnnotations": "12/12 service files annotated",
        "clsServiceHits": 0,
        "stubTests": 0,
        "behavioralAssertions": "3 per service",
        "concurrentIsolation": "PASS"
      }
    },
    "layer2": { "status": "PENDING | PASS | NOT_APPLICABLE" },
    "layer3": { "status": "PENDING | PASS | NOT_APPLICABLE" }
  },
  "tenantReadyStatus": "LAYER_1_CERTIFIED | LAYER_2_CERTIFIED | FULLY_CERTIFIED"
}
```

---

## INTEGRATION

```
flow-portability-test-protocol (SK-553)
  → PREREQUISITE: dna-compliance-guard v1.1.0 P-1..P-5 all PASS
  → PREREQUISITE: flow-implementation-guide v1.2.0 V9 status = MOBILE
  → Layer 1: test-integrity v2.1.0 Rule 6 (behavioral assertions)
  → Layer 3: per-image-validation (SK-549) 7-axis validation
  → Result: portabilityTest.tenantReadyStatus in STATE.json
  → Feeds: PROOF-1 through PROOF-5 (distribution requirement tests)
```

---

## Source document

Full protocol with AI Adaptation Protocol (Phases 1-5), PROOF designation table,
and contingency tiers (Tier 1-3 for signing):
`FLOW-PORTABILITY-TEST-PROTOCOL-v1.2.md`

This skill is the loadable wrapper for that protocol. Load this skill before
citing the protocol in any session file.
