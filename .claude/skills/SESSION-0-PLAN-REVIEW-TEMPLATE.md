# SESSION 0 — PLAN REVIEW GATE v2.0
## Updated: 2026-03-20 — adds FC-13 to FC-15 (Mode C, client-side, meta-arbitration)
## Adapt this template for each project. Replace [PLACEHOLDERS] with actual values.
## Runs BEFORE Session 1. Claude Code self-reviews the plan.

---

## Why This Exists

Plans consistently ship with latent inconsistencies. This session catches them
before Claude Code starts executing. It does NOT modify the plan — only verifies it.

⛔ SESSION-0 REQUIRES THREE GATES BEFORE SESSION 1 MAY START:
  Gate A — FC Checks (Steps 1–15): all 15 automated checks pass
  Gate B — AI Cross-Review: 2 additional models review independently
  Gate C — Human Approval: explicit written approval after A and B

None of these gates may be skipped or combined.

---

## STEPS 1–12 (unchanged from v1.0)
## [Keep all original FC-1 through FC-12 steps here]

---

## STEP 13 — FC-13: Mode C Contract Completeness

```python
# Check that event contracts exist for every task type in the flow
import os, json

FLOW = "[FLOW-XX]"
CONTRACTS_DIR = f"contracts/events/{FLOW}"
PLAN_FILE = "[YOUR-PLAN-FILE.md]"

with open(PLAN_FILE) as f:
    plan = f.read()

# Extract task types from plan
import re
task_types = re.findall(r'T(\d+)', plan)
task_types = list(set(task_types))

# Check contracts directory exists
if not os.path.exists(CONTRACTS_DIR):
    print(f"❌ FC-13 FAIL — contracts/events/{FLOW}/ does not exist")
    print(f"   Required by P9 (Mode C). Create in Phase A NEW-A1.")
else:
    schemas = os.listdir(CONTRACTS_DIR)
    server_schemas = [s for s in schemas if not 'RolledBack' in s and not s.startswith('_')]
    client_schemas = [s for s in schemas if 'Requested' in s or 'Completed' in s or 'Skipped' in s]
    comp_schemas = [s for s in schemas if 'RolledBack' in s]
    
    print(f"Server events: {len(server_schemas)}")
    print(f"Client events: {len(client_schemas)}")
    print(f"Compensation events: {len(comp_schemas)}")
    
    # Check each schema has required fields
    missing_fields = []
    for schema_file in schemas:
        if schema_file.endswith('.json'):
            with open(f"{CONTRACTS_DIR}/{schema_file}") as sf:
                schema = json.load(sf)
            required = schema.get('required', [])
            for field in ['correlationId', 'tenantId', 'timestamp', 'source']:
                if field not in required:
                    missing_fields.append(f"{schema_file}: missing '{field}' in required[]")
    
    if missing_fields:
        print("❌ FC-13 FAIL — schemas missing required correlation fields:")
        for m in missing_fields:
            print(f"  {m}")
    else:
        print(f"✅ FC-13 PASS — {len(schemas)} schemas, all have required correlation fields")

# Check no PII in event data fields
pii_terms = ['email', 'firstName', 'lastName', 'phone', 'address', 'dateOfBirth']
pii_violations = []
with open(PLAN_FILE) as f:
    plan = f.read()
for term in pii_terms:
    # Look for PII in event payload definitions (data: { ... })
    if f'"data":' in plan and term in plan:
        lines = [i+1 for i,l in enumerate(plan.split('\n')) if term in l and 'data' in l.lower()]
        if lines:
            pii_violations.append(f"'{term}' near event data at lines {lines[:3]}")

if pii_violations:
    print("❌ FC-13 WARN — possible PII in event payload definitions:")
    for v in pii_violations:
        print(f"  {v}")
    print("  Verify these are not in event schema data fields (P9 rule)")
```

Expected: PASS means contracts/events/FLOW-XX/ exists with ≥ 6 schemas,
all schemas have correlationId + tenantId + timestamp + source in required[],
no PII fields in event data schemas.

---

## STEP 14 — FC-14: Client-Side Completeness

```python
import re

PLAN_FILE = "[YOUR-PLAN-FILE.md]"
TOPOLOGY_FILE = "contracts/topologies/[FLOW-XX].topology.json"
TEST_MATRIX = "contracts/tests/[FLOW-XX].test-matrix.json"

with open(PLAN_FILE) as f:
    plan = f.read()

checks = []

# Check 1: clientStateMap section exists in plan
if 'CLIENT STATE MAP' in plan or 'clientStateMap' in plan:
    checks.append(('✅', 'Client state map section present in plan'))
else:
    checks.append(('❌', 'Missing CLIENT STATE MAP section (Pass 3 of reexamination)'))

# Check 2: FlowStateSnapshot defined
if 'FlowStateSnapshot' in plan or 'currentStep' in plan:
    checks.append(('✅', 'FlowStateSnapshot defined'))
else:
    checks.append(('❌', 'Missing FlowStateSnapshot (P10: every flow needs app-reopen recovery)'))

# Check 3: Optimistic UI contracts
optimistic_count = plan.count('optimisticState')
if optimistic_count > 0:
    checks.append(('✅', f'Optimistic UI contracts found ({optimistic_count} occurrences)'))
else:
    checks.append(('⚠️', 'No optimistic UI contracts found — is this flow user-interactive?'))

# Check 4: test matrix exists
import os
if os.path.exists(TEST_MATRIX):
    import json
    with open(TEST_MATRIX) as f:
        matrix = json.load(f)
    virtual_clock = [t for t in matrix if t.get('virtualClock')]
    bfa_tests = [t for t in matrix if t.get('assertBFA')]
    checks.append(('✅', f'Test matrix: {len(matrix)} scenarios, {len(virtual_clock)} virtual clock, {len(bfa_tests)} BFA'))
    
    # Check mandatory categories
    descriptions = ' '.join(t.get('description','') for t in matrix)
    if 'happy path' not in descriptions.lower():
        checks.append(('❌', 'Test matrix missing happy path scenario'))
    if 'compensation' not in descriptions.lower() and 'cancel' not in descriptions.lower():
        checks.append(('⚠️', 'Test matrix may be missing compensation chain test'))
else:
    checks.append(('❌', f'Test matrix not found at {TEST_MATRIX}'))

# Check 5: topology file exists
if os.path.exists(TOPOLOGY_FILE):
    with open(TOPOLOGY_FILE) as f:
        topology = json.load(f)
    if 'clientStateMap' in str(topology) or any('clientState' in str(n) for n in topology.get('nodes', [])):
        checks.append(('✅', 'Topology file has clientStateMap'))
    else:
        checks.append(('❌', 'Topology file missing clientStateMap (Pass 3 output)'))
else:
    checks.append(('❌', f'Topology file not found at {TOPOLOGY_FILE}'))

for status, msg in checks:
    print(f"{status} FC-14: {msg}")

fails = [c for c in checks if c[0] == '❌']
print(f"\n{'✅ FC-14 PASS' if not fails else f'❌ FC-14 FAIL — {len(fails)} issues'}")
```

Expected: PASS means client state map exists, FlowStateSnapshot defined,
topology has clientStateMap, test matrix exists with ≥ 8 scenarios,
virtual clock tests present for any time-based flow.

---

## STEP 15 — FC-15: Meta-Arbitration and DECISIONS-LOCKED Compliance

```python
import re, os

PLAN_FILE = "[YOUR-PLAN-FILE.md]"
DECISIONS_FILE = "sessions/DECISIONS-LOCKED.md"

with open(PLAN_FILE) as f:
    plan = f.read()

checks = []

# Check 1: No decision reopening without ADR
# Look for phrases that suggest reconsidering locked decisions
reopen_phrases = ['reconsider', 'change the decision', 'instead of mode c', 
                  'mode a instead', 'http instead of queue']
for phrase in reopen_phrases:
    if phrase in plan.lower():
        checks.append(('❌', f"Plan contains possible decision reopening: '{phrase}' — needs ADR entry first"))

# Check 2: Artifact numbers match DECISIONS-LOCKED
# Check for post-FLOW-33 boundaries used in plan
if 'F641' in plan or 'T254' in plan or 'SK-154' in plan:
    checks.append(('❌', 'Plan uses pre-FLOW-35 artifact numbers (F641/T254/SK-154 are post-FLOW-33, not post-FLOW-35)'))
    checks.append(('❌', 'Correct post-FLOW-35: F1491+, T567+, SK-426+'))
else:
    checks.append(('✅', 'No obvious stale artifact numbers detected'))

# Check 3: DECISIONS-LOCKED.md referenced or consulted
if 'DECISIONS-LOCKED' in plan or 'decisions-locked' in plan.lower():
    checks.append(('✅', 'DECISIONS-LOCKED.md referenced in plan'))
else:
    checks.append(('⚠️', 'DECISIONS-LOCKED.md not referenced — was it consulted? (SK-416 requires this)'))

# Check 4: If plan touches meta-arbitration, verify blast radius
if 'meta-arbiter' in plan.lower() or 'SK-402' in plan or 'SK-415' in plan:
    if 'CRITICAL' in plan or 'blast radius' in plan.lower():
        checks.append(('✅', 'Meta-arbiter change has blast radius assessment'))
    else:
        checks.append(('❌', 'Plan modifies meta-arbiters without blast radius assessment (SK-424 required)'))

# Check 5: Mode C compliance in genesis prompts
genesis_count = plan.count('::genesis')
mode_c_count = plan.count('MODE C EVENT CONTRACTS') + plan.count('CONSUMES:') + plan.count('EMITS:')
if genesis_count > 0:
    if mode_c_count >= genesis_count:
        checks.append(('✅', f'All {genesis_count} genesis prompts appear to have Mode C section'))
    else:
        checks.append(('❌', f'{genesis_count} genesis prompts found but only {mode_c_count//3} with Mode C sections'))
        checks.append(('❌', 'Each genesis prompt needs CONSUMES + EMITS + INTEGRATION BOUNDARY'))

# Check 6: No direct HTTP between services in Mode C flows
http_violations = re.findall(r'HTTP (?:call|request|endpoint) (?:to|between|from) (?:service|flow|T\d)', plan, re.I)
if http_violations:
    checks.append(('❌', f'Direct HTTP between services found (P9/Mode C violation): {http_violations[:2]}'))
else:
    checks.append(('✅', 'No direct inter-service HTTP calls detected'))

for status, msg in checks:
    print(f"{status} FC-15: {msg}")

fails = [c for c in checks if c[0] == '❌']
print(f"\n{'✅ FC-15 PASS' if not fails else f'❌ FC-15 FAIL — {len(fails)} issues'}")
```

Expected: PASS means no stale artifact numbers, DECISIONS-LOCKED.md consulted,
meta-arbiter changes have blast radius assessment, all genesis prompts have
Mode C section, no direct HTTP between services.

---

## GATE A — Automated FC Summary

```
Run all 15 steps. Count results.
□ FC-1  through FC-12: [results from original template]
□ FC-13: Mode C Contract Completeness — PASS / FAIL
□ FC-14: Client-Side Completeness — PASS / FAIL
□ FC-15: Meta-Arbitration + DECISIONS Compliance — PASS / FAIL

Total: [N]/15 PASS

If any FAIL: fix before Gate B. Gate B never runs on a failed plan.
```

## GATE B — AI Cross-Review

Two models review the plan independently:

```
Model 1 review prompt:
"Review this XIIGen plan against the 10 principles in xiigen-core-principles-skill.
Focus on P9 (Mode C event contracts) and P10 (client architecture).
List any principle violations or gaps."

Model 2 review prompt:
"Review this XIIGen plan for structural consistency.
Check: artifact numbers match STATE-v4.json, no competing documents created,
all task types have genesis prompts with Mode C section,
flow completeness checklist (SK-418) items are addressed."

Present both reviews. Neither may be skipped.
```

## GATE C — Human Approval

```
Present to Luba:
  - FC-1 through FC-15 results (all 15)
  - Model 1 review summary
  - Model 2 review summary
  - Any items that require judgment (escalations, decision reopening)

Wait for explicit written approval before SESSION-1.
"yes" / "approved" / "proceed to session 1" = approval.
```
