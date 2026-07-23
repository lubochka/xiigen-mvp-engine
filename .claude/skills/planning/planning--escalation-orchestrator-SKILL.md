---
name: escalation-orchestrator
sk_number: SK-446
version: "1.0.0"
priority: HIGH
load_order: 2
category: planning
author: luba
updated: "2026-03-25"
contexts: ["web-session", "claude-code"]
description: >
  Defines how the Escalation Orchestrator collects arbiter panel verdicts and
  applies decision rules to reach an accept/cycle/escalate outcome. Never averages.
  Always applies rules. Covers within-session resolution and cross-session
  arbitration conflicts.
triggers:
  - "escalation orchestrator"
  - "arbiter consensus"
  - "panel disagreement"
  - "verdict collection"
  - "escalate to human"
  - "block verdict"
  - "three-way tie"
  - "arbiter conflict"
---

# Escalation Orchestrator Skill (SK-446) v1.0

## WHAT THE ESCALATION ORCHESTRATOR DOES

The Escalation Orchestrator is the entity above the arbiter panel. It:
1. Receives all arbiter verdicts (anonymized by output label A/B/C — no model attribution)
2. Applies 6 decision rules in order
3. Routes to: ACCEPT | CYCLE_WITH_PATCH | ESCALATE_TO_UPPER_JUDGE | ESCALATE_TO_HUMAN | UNDECIDED

It never averages. A BLOCK from one arbiter cannot be diluted by PASS from others.

---

## THE 6 DECISION RULES (applied in order — stop at first match)

### Rule 1: ANY BLOCK → Reject Output

If any arbiter returns BLOCK severity on any output label:
- That output is removed from the candidate pool entirely
- If all outputs are removed: proceed to Rule 6 (UNDECIDED)
- If some outputs remain: re-evaluate remaining outputs against remaining rules

**BLOCK class arbiters:** Business Logic, Security, Key Principles, Iron Rules.
A single BLOCK from any of these rejects the output. No discussion, no averaging.

The violating arbiter returns the violation text. This becomes the targeted prompt
patch in Rule 2 (CYCLE_WITH_PATCH) — not a generic re-run.

---

### Rule 2: One Output Survives All BLOCK Checks → ACCEPTED (with advisory review)

After Rule 1 removes BLOCK-class-failed outputs:
- If exactly one output has no BLOCK verdicts:
  - Check its CHALLENGE_OR_PASS arbiter verdicts
  - If 0-2 CHALLENGE advisories: ACCEPTED, store advisory violations in triple.arbiterNotes
  - If 3+ CHALLENGE advisories: CYCLE_WITH_PATCH targeting those specific challenges

---

### Rule 3: Multiple Outputs Survive → Winner by Score

- Judge (AI_JUDGE_PROVIDER, Sonnet) scores surviving outputs against iron rules
- Highest score = chosen, lowest score = rejected, middle (if 3) = discarded
- Tie-break: alphabetical label order (A beats B beats C) — deterministic, unbiased
- chosen + rejected = DPO triple with modelComparison field populated

---

### Rule 4: Max Cycles Reached Without Consensus → ESCALATE_TO_UPPER_JUDGE

If Rule 2 sends to CYCLE_WITH_PATCH and max cycles (from taskTypeCycleBudgets) is reached:
- The Upper Judge (defined in SK-442 Step 4) receives: all arbiter verdicts + unresolved conflict
- Upper Judge may spawn a specialized arbiter for this run
- If specialized arbiter resolves: continue from Rule 1 with its verdict included
- If still unresolved after Upper Judge: proceed to Rule 5

**Also triggers Rule 4 when:**
- Business Logic + Security arbiters both CHALLENGE the same code section (conflicting domains)
- Principles Arbiter returns BLOCK on all candidate outputs (task type may need redesign)

---

### Rule 5: ESCALATE_TO_HUMAN

Human escalation produces:
```json
{
  "escalationType": "HUMAN_JUDGMENT_REQUIRED",
  "taskTypeId": "T47",
  "flowId": "FLOW-01",
  "arbiterVerdicts": { "A": [...], "B": [...], "C": [...] },
  "unresolvedConflict": "Business Logic: T47 iron rule 3 requires setIfAbsent but Security: atomicity not guaranteed",
  "upperJudgeAttempted": true,
  "upperJudgeResult": "conflict persists after domain-specific arbiter spawn",
  "humanQuestion": "Which interpretation of iron rule 3 is correct for ROUTING+SLA archetype?"
}
```

Flow is SUSPENDED. No Phase D until human resolves.
After resolution: record as DESIGN_REASONING triple. Seed to RAG.

---

### Rule 6: All Outputs Blocked OR Three-Way Tie → UNDECIDED

If all outputs were removed in Rule 1 (every generator failed every arbiter), or if
three outputs score exactly equal:

- Do NOT store to `xiigen-training-data` (main index)
- Store all outputs to `xiigen-training-data-review` with `status: UNDECIDED`
- Emit `human.review.required` event
- Record DESIGN_FLAW signal: the genesis prompt produced no acceptable output

**Three-way tie handling:**
Three equally-scored outputs means the arbiter panel cannot differentiate quality.
This is a teaching opportunity: what distinguishes these outputs is too subtle for
the current panel. The DESIGN_FLAW signal triggers a genesis prompt review.

---

## VERDICT COLLECTION FORMAT

The Orchestrator receives verdicts in this format (model attribution stripped):

```json
{
  "outputLabel": "A",
  "arbiters": {
    "business_logic":     { "verdict": "APPROVED", "violations": [] },
    "security":           { "verdict": "BLOCK", "violations": [
      { "rule": "DNA-5", "evidence": "write at line 34 missing tenantId", "severity": "BLOCK" }
    ]},
    "skills_patterns":    { "verdict": "APPROVED", "violations": [] },
    "prompts_compliance": { "verdict": "CHALLENGE", "violations": [
      { "issue": "selfQuestion 3 unanswered", "severity": "ADVISORY" }
    ]},
    "key_principles":     { "verdict": "APPROVED", "passed": ["M1","M2","P3","DNA-3","DNA-5",...] },
    "iron_rules":         { "verdict": "APPROVED", "violations": [] },
    "completeness":       { "verdict": "APPROVED", "violations": [] }
  }
}
```

Note: `key_principles` lists ALL passed principles, not just violations. Absence
of a passed entry is ambiguous — the full list makes the check auditable.

---

## ARBITER_VERDICT SIGNAL (emitted per arbiter per output)

Every arbiter verdict is stored as an ARBITER_VERDICT learning signal:

```json
{
  "type": "ARBITER_VERDICT",
  "index": "xiigen-arbiter-verdicts",
  "data": {
    "runId": "${runId}",
    "taskTypeId": "${taskTypeId}",
    "flowId": "${flowId}",
    "arbiterRole": "security",
    "verdict": "BLOCK",
    "violations": [{ "rule": "DNA-5", "evidence": "...", "severity": "BLOCK" }],
    "outputLabel": "A",
    "resolvedModel": null
  }
}
```

`resolvedModel` stays null until after the DPO triple is finalized and the shuffle
mapping is dereferenced. This preserves blind judging through the entire process.

**Teaching value:** After N flows, `xiigen-arbiter-verdicts` shows which arbiter role
most frequently blocks which archetype. Business Logic blocking ROUTING often →
genesis prompt for ROUTING needs better iron rule guidance. This data feeds FLOW-38C
(prompt evolution).

---

## ARBITER_DISAGREEMENT signal (cross-session conflicts)

When two arbiters in different flows contradict each other about the same domain concept:

```json
{
  "type": "ARBITER_DISAGREEMENT",
  "index": "xiigen-arbiter-disagreements",
  "data": {
    "arbiterRoleA": "business_logic",
    "flowA": "FLOW-01", "taskTypeA": "T47",
    "verdictA": "APPROVED",
    "arbiterRoleB": "business_logic",
    "flowB": "FLOW-02", "taskTypeB": "T51",
    "verdictB": "BLOCK",
    "conflictDimension": "setIfAbsent atomicity interpretation",
    "resolvedBy": "DESIGN_REASONING_TRIPLE",
    "resolution": "FLOW-02 interpretation is correct — see D-02-4"
  }
}
```

This is the cross-session arbitration gap identified in plan review. FLOW-38 will
process these to improve arbiter prompt quality over time.

---

## WHAT THIS SKILL PREVENTS

- BLOCK verdicts diluted by averaging with PASS verdicts from other dimensions
- Human escalation never happening because no Rule 5 exists
- Three-way tie stored as valid training data (it is not — it is undecided)
- Cross-session arbiter disagreements lost (no ARBITER_DISAGREEMENT signal)
- Upper judge never called (no Rule 4 trigger defined)
