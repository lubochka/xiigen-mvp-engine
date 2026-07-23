---
name: web-session-handoff-additions
version: "1.0.0"
updated: "2026-03-26"
applies_to: session-output--web-session-handoff-SKILL.md
description: >
  discoveries[] and rejected_claims[] fields for session handoff output.
  Ensures session discoveries are preserved across session boundaries.
---



## NEW SECTION: DISCOVERIES

```
## DISCOVERIES — FACTS ESTABLISHED THIS SESSION

discoveries[] — facts found during this session that future sessions need.
Each discovery must have: fact, verified_by (the command that confirmed it),
implication, action_taken_or_deferred.

Format:
  DISCOVERY-N:
    fact:        [precise factual statement — no hedging]
    verified_by: [grep command, query, or observation that confirmed it]
    implication: [what this means for future work in this area]
    action:      RESOLVED: {what was done}
               | DEFERRED: {why and when it will be resolved}

Example:
  DISCOVERY-1:
    fact:        T567-T573 consumed by FLOW-36 in feature-registry-contracts.ts
    verified_by: grep -r "taskTypeId.*'T56" server/src/engine-contracts/
    implication: FLOW-0A must start at T574 or later (T574-576 also taken by FLOW-00)
    action:      RESOLVED — renumbering map uses T577-T579

  DISCOVERY-2:
    fact:        bfa-conflict-arbitration/ has 14 services (superset of heyrovsky's 12)
    verified_by: ls server/src/engine/flows/bfa-conflict-arbitration/ | wc -l
    implication: heyrovsky FLOW-25 files NOT needed — Skills_Creation_Claude has them
    action:      RESOLVED — excluded from merge plan
```

---

## NEW SECTION: REJECTED CLAIMS

```
## REJECTED CLAIMS

rejected_claims[] — claims from review documents or models that were wrong.
Each entry: claim, source, what_was_actually_true, verified_by, risk_if_accepted.

Purpose: prevents the same wrong claim from being accepted in a future session.
These are seeded to the DESIGN_REASONING RAG with decisionType=CLAIM_REJECTION.

Format:
  REJECTED-N:
    claim:       [exact wrong statement]
    source:      [who/what made it: review document / model / prior session]
    truth:       [what is actually true]
    verified_by: [command or observation that disproved it]
    risk:        [what would have gone wrong if accepted]

Example:
  REJECTED-1:
    claim:       "Skills_Creation_Claude test count is 4,429"
    source:      branch analysis document
    truth:       4,393 — 36 tests rolled back with FLOW-01 service files
    verified_by: sessions/FLOW-01/STATE.json "test_baseline": 4393
    risk:        Gate check passes at wrong baseline; 36 regressions missed

  REJECTED-2:
    claim:       "FLOW-25 services do not exist in Skills_Creation_Claude"
    source:      original branch analysis
    truth:       bfa-conflict-arbitration/ has 14 services (superset of heyrovsky's 12)
    verified_by: ls server/src/engine/flows/bfa-conflict-arbitration/
    risk:        Would have wasted a full merge session porting files that exist

  REJECTED-3:
    claim:       "Renumber F1339 → F1492"
    source:      verification document renumbering map
    truth:       F1492-F1501 taken by FLOW-36 and FLOW-00 bundle-activation
    verified_by: grep -r factoryId feature-registry-contracts.ts | sort | tail -5
    risk:        Silent factory ID collision at runtime
```

---

## ALSO ADD TO STATE.JSON TEMPLATE

Add these two fields to the STATE.json template produced at each phase:

```json
{
  "current_phase": "...",
  "discoveries": [],
  "rejected_claims": [],
  "investigations": []
}
```

Write to `discoveries[]` continuously during investigation — not just at end.
Session compaction destroys unwritten discoveries.
