---
name: blast-radius-assessor
sk: SK-424
description: >
  Assesses the impact scope before executing any engine modification,
  contract change, or architectural update. Classifies changes as
  LOW/MEDIUM/HIGH/CRITICAL and identifies all affected documents,
  flows, tests, and sessions. Use before any engine modification protocol
  and before any contract change in contracts/.
layer: planning
version: 1.0.0
createdAt: 2026-03-20
requires: [SK-416]
complements: [SK-417, SK-422]
---

# BlastRadiusAssessor [SK-424]

## Purpose

Before touching any file in the engine or contracts layer, assess how far
the change propagates. A change that seems isolated — "just update this
arbiter threshold" — may invalidate 40 accepted bundles across 10 flows.
The blast radius assessment makes this visible before any file is modified.

## When AF-4 RAG Retrieves This Skill

- Before executing any engine modification protocol (SK-407–414)
- Before changing any file in contracts/
- "What will this change break?"
- "Is it safe to modify X?"
- When an escalation option involves modifying platform infrastructure

## Pattern

### Classification levels

```
CRITICAL — change affects the arbitration pipeline for ALL task types
  Triggers: StationContext schema change, pipeline.config.ts change,
  standard arbiter with scope="all", meta-arbiter logic change
  Impact: every existing accepted bundle may need re-validation
  Protocol: full baseline verification before and after

HIGH — change affects all task types in one archetype or all flows
  Triggers: archetype-scoped arbiter change, cross-flow BFA rule change,
  platform SDK change (NestJS or React), event contract change for a live flow
  Impact: all sessions for affected archetype must re-verify
  Protocol: run affected flow simulations before merge

MEDIUM — change affects one flow or one domain
  Triggers: flow-specific arbiter change, flow reference plan update,
  session file update, domain-specific skill change
  Impact: only sessions for that flow need re-verification
  Protocol: run integration gate for affected flow

LOW — change affects only future sessions, not existing accepted results
  Triggers: new arbiter added (no retroactive scoring), new skill added,
  documentation update, test matrix addition, new genesis prompt version
  Impact: future sessions only
  Protocol: standard CI gate
```

### Assessment procedure

**Step 1 — Identify change type and location**
```
contracts/events/   → depends on classification (new file = LOW, change to existing = HIGH)
contracts/topologies/ → HIGH (DAG changes affect flow execution)
engine/arbiter-registry/ → depends (new = LOW, existing = HIGH for scope="all")
engine/arbitration-loop/pipeline.config.ts → CRITICAL
engine/arbitration-loop/station-context.schema.ts → CRITICAL
sdk/ → HIGH (all tenants using SDK are affected)
.claude/skills/SK-402–415 → CRITICAL (meta-arbiter behavior)
.claude/skills/SK-001–040 → HIGH (platform skills affect all flows)
sessions/ → LOW (session files only affect that session)
```

**Step 2 — Find all dependents**
```
For CRITICAL/HIGH changes, enumerate all dependents:
  Grep codebase for the changed identifier
  Check ArbiterRegistry for arbiters that reference changed components
  Check all topology files for references
  Check all session files for references

Never claim "this is isolated" without running the grep.
```

**Step 3 — Identify protection gates**

```
CRITICAL:
  □ Pre-modification baseline snapshot (mandatory)
  □ Full test suite before and after
  □ All existing pipeline simulations must pass after change
  □ Human review required before merge

HIGH:
  □ Pre-modification baseline snapshot
  □ Affected flow integration tests must pass
  □ At least 2 pipeline simulations for affected archetype

MEDIUM:
  □ Standard CI gate passes
  □ Flow-specific integration tests pass

LOW:
  □ Standard CI gate passes
```

**Step 4 — Write impact summary**
```
Format for round-decisions.jsonl:
{
  "protocol": "CHANGE_ARBITER",
  "target": "routing::auth-security",
  "change": "threshold 80 → 75",
  "blast_radius": "MEDIUM",
  "affected_flows": ["FLOW-01", "FLOW-02", "FLOW-07"],
  "affected_task_types": ["T47", "T50", "T77"],
  "protection_gates": ["baseline snapshot", "FLOW-01 integration test"],
  "estimated_remediation": "30min if any regression"
}
```

### Special cases requiring extra care

**Changing a criticalRules entry (score-0 rule)**
```
Adding a new score-0 rule: MEDIUM → watch for 5 rounds, start as WARNING
Removing a score-0 rule:   HIGH   → explicit human confirmation required
                                     append to round-decisions.jsonl with reason
```

**Changing a live event schema**
```
Any change to an event schema in contracts/events/ for a deployed flow:
  → HIGH blast radius
  → Requires schema migration (add optional fields only, never remove required)
  → Consumers of the old schema must not break
  → CloudEvents backward compatibility (data.legacyPayload pattern)
```

**Changing meta-arbiter logic (SK-402–415)**
```
→ CRITICAL blast radius
→ Must test proposed change using SKILL.proposed.md copy (not live file)
→ Full 6-round simulation required before activating
→ See MODIFY_SKILL protocol (SK-410)
```

## Positive Example

```
Change: add new arbiter "routing::jwt-strict-pii" with scope="archetype:ROUTING"

Assessment:
  Type: new arbiter, archetype-scoped
  Blast radius: MEDIUM
  Affected: all ROUTING task types (T47, T50, T51, T77, T84)
  Affected flows: FLOW-01, FLOW-02, FLOW-07, FLOW-08, FLOW-10
  
  Protection gates:
  □ Start at threshold=80 (not 100 — prevents STUCK situations)
  □ Run calibration round: verify no existing accepted bundle scores 0
  □ If any existing accepted bundle scores 0: review the bundle
  □ Standard CI gate after registration

  Impact summary recorded in round-decisions.jsonl
  Estimated remediation if regression found: 1h
```

## Negative Example

```
Change: update StationContext schema to add tenantRegion field

WRONG assessment: "This is just adding a field, LOW blast radius"

CORRECT assessment:
  StationContext is the data flowing through every station
  Every station reads/writes context
  This is CRITICAL blast radius
  
  Required:
  □ Pre-modification baseline snapshot
  □ Every station that reads context must be checked
  □ New field must be optional (backward compat)
  □ Migration script for existing documents
  □ Full pipeline simulation (not just unit tests)
  □ Human review before merge
```

## Integration

```
requires:    SK-416 (session startup)
complements: SK-417 (decision reopening — new decisions may have blast radius)
             SK-422 (escalation router — escalation options need blast radius)
```

## Test

```
Given: proposed change — modify meta::spend-governor (SK-402) SKILL.md
       to change 80% warning threshold to 70%

Expected blast radius: CRITICAL
  - SK-402 is a meta-arbiter skill
  - Affects all arbitration rounds (all flows, all task types)
  - Requires SKILL.proposed.md testing before live change
  - Full 6-round simulation required
  - Human review before activating

Failure: classifying this as MEDIUM or LOW
```
