# Escalation Protocol

Use this when you are blocked by a governance rule and cannot proceed without breaking it.

## When to Escalate

- A forbidden decision is required to unblock progress
- Two governance rules conflict with each other
- The actual scope of work exceeds the phase's planned scope
- A DNA or BFA violation cannot be fixed within the session's constraints
- An artifact number conflict is detected between sessions
- A test count decreased and the cause is unclear

## Escalation Format

```
⛔ ESCALATION — [brief title]

BLOCKED BY: [which rule/constraint]
SITUATION: [what you were doing when you hit the block]
OPTIONS:
  A) [option A] — consequence: [...]
  B) [option B] — consequence: [...]
RECOMMENDATION: [which option and why]
WAITING FOR: Luba's decision
```

## What NOT to Escalate

- Questions you can answer by reading canonical docs
- Uncertainty about which DNA pattern applies (read dna-patterns.md)
- Uncertainty about which fabric to use (read fabric-interfaces.md)
- Formatting preferences for skill files

## After Escalation

Wait for Luba's explicit instruction. Do not:
- Pick an option yourself while waiting
- Continue with adjacent work that might be affected by the decision
- Assume the answer and proceed

Record the escalation and resolution in DECISIONS.md:
```
DR-XXX: [date] — [escalation title]
Decision: [what Luba decided]
Rationale: [why]
```
