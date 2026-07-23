---
name: score-zero-investigation
sk_number: SK-475
version: "1.0.0"
priority: HIGH
load_order: 0
category: code-execution
author: luba
updated: "2026-03-26"
contexts: ["claude-code"]
description: >
  When any named check produces score-0, stop immediately and investigate
  before any other action. Covers: identifying which check fired, tracing to
  the violated iron rule, classifying the fix, and the SILENT_FAILURE subtype
  where code looks correct but violates a security invariant. Score-0 is the
  highest-severity generation finding. Do not remove named checks before
  completing this investigation.
triggers:
  - "score-0 on a named check"
  - "machine_constant check fired"
  - "named check blocking"
  - "check is wrong"
  - "score-0 investigation"
  - "named check score zero"
  - "BLOCK class verdict"
---

# Score-Zero Investigation Skill (SK-475)

## WHAT THIS SKILL PREVENTS

Removing named checks because they "fire incorrectly" — when in fact they were
catching a SILENT_FAILURE that the developer didn't recognize as a violation
because the code functionally worked. This is the most dangerous error in the
skill set: a removed named check means the wrong pattern enters DPO training
data unchallenged, degrades future generation, and the cause is invisible.

**Rule 0:** The named check is never removed until this investigation completes.
If the investigation concludes the check fires on an acceptable case, that case
is added to the check as an exception — the check itself stays.

---

## STEP 1 — IDENTIFY WHICH CHECK FIRED

```bash
# Get the score breakdown including named check that produced score-0
curl -sf "localhost:9200/xiigen-training-data/_search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": {"bool": {"must": [
      {"term": {"flowId.keyword": "FLOW-XX"}},
      {"term": {"taskTypeId.keyword": "T47"}}
    ]}},
    "sort": [{"timestamp": "desc"}],
    "size": 1
  }' | jq '.hits.hits[0]._source.scoreBreakdown.namedChecks // empty'

# Or from the Phase B score output directly
grep -rn "score.*0\b\|score_zero\|BLOCK\|score-0" /tmp/jest-output.txt | head -10
```

Write down: which named check ID produced score-0?

---

## STEP 2 — TRACE TO THE VIOLATED IRON RULE

Every named check maps to a CF-N rule in the EngineContract. Find the mapping:

```bash
# Get the contract for this task type
curl -sf "localhost:9200/xiigen-engine-contracts/_doc/T47" \
  | jq '.hits.hits[0]._source.namedChecks[] | select(.checkId == "[check-id-from-step-1]")'

# Expected output:
# {
#   "checkId": "machine_constant_no_freedom_config",
#   "severity": "score-0",
#   "description": "QR token TTL must be literal 60 — never from config.get()",
#   "trigger": "config.get.*ttl",
#   "crossReference": "CF-806 — D-04-1"
# }
```

Read the `crossReference` field. Look up the CF rule in the BFA document:

```bash
grep -A 5 "CF-806" V62_BFA_STRESS_TEST_MERGED.md
```

---

## STEP 3 — LOCATE THE VIOLATION IN GENERATED CODE

```bash
# Use the check's trigger pattern to find the violation
grep -n "config\.get\|freedomConfig\.get" \
  server/src/engine/flows/FLOW-XX/t47-*.service.ts

# Or for a named check with a different pattern:
grep -n "[trigger-pattern-from-step-2]" \
  server/src/engine/flows/FLOW-XX/t47-*.service.ts
```

The line number confirms: the check fired on real code, not a false positive.

---

## STEP 4 — CLASSIFY THE FIX

Three possible fix classes:

### Fix Class A: Prompt addition (model didn't know the rule)
The generated code violates the check because the genesis prompt didn't communicate
the MACHINE constant requirement. The code is wrong; the check is correct.

**Confirm:** Does the genesis prompt mention this iron rule? If not → Fix Class A.

**Response:** Add a WRONG/CORRECT pair to the genesis prompt via SK-472 (prompt-patch-authoring).
The WRONG example is the exact pattern that triggered the check.

### Fix Class B: Named check over-fires (check pattern too broad)
The check pattern matches code that is actually acceptable for a specific case.
The code may be correct; the check is catching a false positive.

**Confirm:** Is there a legitimate reason for this pattern in this specific context?
Example: the check fires on `config.get('serviceName', 'default')` — a service name
is not a security invariant and FREEDOM classification is correct for it.

**Response:** Narrow the check trigger pattern. Add an exception comment in the
check definition. DO NOT remove the check — narrow it.

```bash
# Before narrowing, verify: does the narrowed pattern still catch the actual violation?
echo "test: config.get('qrTokenTtl', 60)" | grep -E "[narrowed-pattern]"
# Must match the violation pattern
echo "test: config.get('serviceName', 'default')" | grep -E "[narrowed-pattern]"
# Must NOT match the acceptable case
```

### Fix Class C: Contract iron rule is wrong
The iron rule itself is incorrect or the MACHINE/FREEDOM classification was wrong
when the rule was written. This requires a contract revision, not a code fix.

**Confirm:** Apply the SK-451 security-break test. "If a tenant changes this value
to the maximum, does a security guarantee break?" If NO → the value is FREEDOM,
the named check is wrong, and the contract rule must be revised.

**Response:** Update the contract via SK-485 (contract-authoring). Update the
ARCHITECTURE-DECISIONS.json to record why the classification changed.

---

## STEP 5 — THE SILENT_FAILURE SUBTYPE

Score-0 fired but the code LOOKS correct — it compiles, passes tests, and the
developer believes it's right. This is the most dangerous case.

**Protocol before concluding the check is wrong:**

1. Run the full simulation (SK-441) on the generated code with this failure
2. Ask: if this code were `chosen` in a DPO triple, what does it teach?
3. Ask: under what tenant configuration would this code produce incorrect behavior?

For MACHINE constants specifically:

```
Code: const ttl = this.config.get('qrTokenTtl', 60);
Developer thinks: "It defaults to 60, so it's equivalent."
Simulation shows:
  - In standard tenant: works correctly (60 seconds)
  - With tenant override: tenant sets qrTokenTtl=600 → replay window is 10 minutes
  - QR tokens from cycle 1 remain valid during cycle 2
  - Prediction: false check-in possible if same QR token is captured

Conclusion: code is WRONG even though it appears to work.
DPO triple with this as chosen: teaches "configure security TTLs per tenant" to all future models.
```

**If the simulation shows the code is actually correct** despite the check firing:
proceed to Fix Class B. But run the simulation first — never skip it.

---

## STEP 6 — RESOLUTION RECORD

After investigation, document the resolution:

```bash
jq --argjson resolution '{
  "checkId": "machine_constant_no_freedom_config",
  "scoreZeroFiredAt": "cycle-1",
  "violationLine": 47,
  "code": "const ttl = this.config.get(\"qrTokenTtl\", 60)",
  "fixClass": "CLASS_A",
  "silentFailureSubtype": true,
  "simulationRan": true,
  "simulationVerdict": "code teaches wrong pattern — config.get for security TTL",
  "fix": "PromptPatch: WRONG config.get example; CORRECT literal 60 example",
  "checkRetained": true
}' '.scoreZeroInvestigations.T47_cycle1 = $resolution' \
  FLOW-XX-STATE.json > tmp.json && mv tmp.json FLOW-XX-STATE.json
```

---

## ANTI-PATTERNS

```
❌ Removing the named check because "it fires incorrectly"
   → Run the full simulation first. "Fires incorrectly" requires proof.

❌ Concluding Fix Class B without the security-break test
   → The test is mandatory. Skip it and you may remove a check that catches T65-class bugs.

❌ Patching the code without determining fix class
   → Code patch is only correct for Fix Class A. Other classes need different responses.

❌ Proceeding to Phase E capture while score-0 is unresolved
   → A score-0 resolution record must exist before any DPO capture for this task type.

❌ Inheriting a "the check fires but we ignore it" convention from a previous cycle
   → No convention survives this investigation. Classify fresh each time.
```
