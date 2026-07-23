---
name: meta-escalation-router
sk: SK-422
description: >
  Determines whether a round failure should be resolved algorithmically
  by the meta-arbitration layer or escalated to Claude Code for judgment.
  Includes escalation briefing format, gap analysis production, and
  option generation. Use when meta::round-controller produces ESCALATE
  or HALT decisions.
layer: meta
version: 1.0.0
createdAt: 2026-03-20
requires: []
complements: [SK-423, SK-424]
---

# MetaEscalationRouter [SK-422]

## Purpose

Not all round failures need human judgment. Many are mechanical: add a prompt
injection, drop a model, use the best historical candidate. The escalation
router ensures Claude Code only sees problems that genuinely require judgment —
and when it does, it receives enough context to act without reconstructing history.

## When AF-4 RAG Retrieves This Skill

- meta::round-controller produces ESCALATE decision
- meta::round-controller produces HALT decision
- "Should I escalate this?"
- A round has failed 3+ times with no improvement
- A modification protocol is required (ADD_STATION, CHANGE_ARBITER, etc.)

## Pattern

### Decision hierarchy — try these before escalating

```
1. Is there an accepted winner? → ACCEPT, no escalation needed

2. Is this a security HARD_STOP? → ESCALATE immediately
   (All models produced security violations — no algorithmic fix)

3. Is this a spend HALT? → ESCALATE with best_available
   (Budget limit — no algorithmic fix)

4. Is the improvement trajectory STUCK (never > 60 after 3+ rounds)?
   → ESCALATE with gap analysis
   (Genesis prompt may need fundamental rewrite — judgment needed)

5. Is the improvement trajectory REGRESSION?
   → ESCALATE with best historical result
   (Something changed that made things worse — needs investigation)

6. Everything else → try algorithmic options first:
   REDUCE (drop low-value models)
   RETRY with prompt injection
   JUDGE_ONLY (re-run specific arbiters)
```

### Escalation briefing — what Claude Code needs

The briefing must answer all five questions without Claude Code reading history:

```
1. WHY is this escalating? (one sentence, specific)
2. WHAT happened across all rounds? (score trajectory, not just last round)
3. WHAT is the best candidate so far? (code + scores + failing arbiters)
4. WHAT specifically is failing? (gap analysis per arbiter)
5. WHAT can Claude Code do? (3–4 concrete options with estimated cost)
```

### Gap analysis — mandatory for ESCALATE decisions

For each failing arbiter in the best candidate:
```python
gap = {
    "arbiter_id": "routing::auth-security",
    "score": 0,
    "rounds_failed": 4,
    "violation": "JWT payload contains email field (IR-2 violation)",
    "root_cause": "Genesis prompt says 'no PII' without defining PII. "
                  "All models include email because they consider it non-sensitive.",
    "likely_fix": "Add explicit PII definition to genesis prompt: "
                  "'PII = email, firstName, lastName, phone, address'",
    "fix_type": "prompt_injection",  # or: manual_fix | contract_amendment | split_task
    "estimated_cost": "$0.35 (1 more round with targeted injection)"
}
```

### Options for Claude Code — always 3–4 choices

Format each option as:
```
[A] Action (cost, probability of resolution)
    Specific: what exactly to do, not "try something different"

[B] ...
[C] Manual fix (free, low risk)
    Specific: which lines to change in the accepted candidate

[D] Escalate to human review (last resort)
    Use when the task type contract itself may be wrong
```

### What Claude Code always owns (never algorithmic)

```
- Genesis prompt rewrites (meta provides content, Claude Code writes prose)
- Task type contract amendments (requires CODEOWNERS review)
- Budget reallocations (only Claude Code can request more budget)
- Model additions (only Claude Code adds new models to the pool)
- Accepting a candidate with known gaps (judgment call, not algorithm)
- Deciding when to use engine modification protocols (SK-407–415)
```

### Escalation quality check

Before submitting escalation to Claude Code, verify:
```
□ Score trajectory included (not just current round)
□ Gap analysis has root_cause, not just violation
□ At least 3 options provided
□ At least 1 option is a manual fix (always available)
□ Cost estimate for each retry option
□ No credentials or API keys in briefing content (CF-794)
```

## Positive Example

```
Situation: FLOW-01 T47, 4 rounds, score plateau at 71.4
           routing::auth-security scores 0 every round (email in JWT)

CORRECT escalation:

WHY: Score plateau at 71.4 after 4 rounds. routing::auth-security 
     persistently scores 0 — JWT contains email field in all candidates.

TRAJECTORY: [45, 67, 71, 71] — plateau detected

BEST CANDIDATE: claude-sonnet round 3, composite 71.4
  Failing: routing::auth-security (score=0), routing::path-safety (score=42)

GAP ANALYSIS:
  routing::auth-security (score=0, 4/4 rounds):
    Violation: JWT data.email present (IR-2)
    Root cause: "no PII" in prompt is ambiguous — models include email
    Likely fix: add "PII = email, firstName, lastName, phone, address"
    Fix type: prompt_injection
    Cost: $0.35

OPTIONS:
  [A] JUDGE_ONLY with prompt injection ($0.12, HIGH probability)
      Add PII definition to genesis prompt, re-run failing arbiters only
  [B] Accept round 3 + manual fix (free, LOW risk)
      Remove data.email from JWT builder ~line 47
  [C] Full retry with injection ($0.35, HIGH probability)
      Full round with updated prompt
  [D] Rewrite genesis prompt section (free, MEDIUM risk)
      Rewrite IR-2 section with explicit examples
```

## Negative Example

```
WRONG escalation:
  "Round 4 failed. routing::auth-security is failing."

  Missing: trajectory, gap analysis, root cause, options
  → Claude Code cannot act without reading 4 rounds of history

WRONG: Escalating a RETRY situation
  score trajectory [45, 67, 81, 89] with no security violation
  → This is CONVERGING, not stuck. Should RETRY, not escalate.
  → Escalation wastes Claude Code attention on normal operation.
```

## Integration

```
requires:    [] — standalone, invoked directly by meta::round-controller
complements: SK-423 (document hierarchy — options may reference documents)
             SK-424 (blast radius — modification options need impact assessment)
```

## Test

```
Given: 5 rounds of FLOW-01 T47, score [45, 62, 71, 71, 72], 
       routing::auth-security score=0 in rounds 3,4,5

Expected escalation briefing:
  - Trajectory shows plateau (not stuck, not regression)
  - Gap analysis for routing::auth-security with root cause
  - Option A: JUDGE_ONLY with prompt injection
  - Option B: accept round 3 with manual fix
  - Estimated cost included for retry options
  - No email addresses, API keys, or model responses in briefing text

Failure: escalation without root cause analysis
Failure: escalation of a CONVERGING trajectory (89 → should RETRY)
```
