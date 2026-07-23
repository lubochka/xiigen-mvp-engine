# Cross-Validation Protocol — AF-9

## Why Cross-Validation

A model that generates code cannot reliably evaluate the governance quality of its own context selection. The advisor (Claude) and the judge (GPT-4o or Gemini) must be different models — this is the only way to get a genuine second opinion.

## Judge Criteria

The cross-validation model evaluates these questions:
1. **Archetype match:** Are the selected blocks appropriate for this archetype? (e.g., SK-BFA active for an archetype that generates no new entities = wasted token budget)
2. **Completeness:** Would excluding any of the non-selected blocks create a risk of DNA or BFA violation?
3. **Coherence:** Is the rationale for each selected block logically consistent with the activation rules?

## Judgment Outcomes

| Outcome | Action |
|---------|--------|
| ACCEPT | Proceed with selected blocks |
| REJECT with substitution | AF-4 re-selects once with judge feedback as context |
| REJECT without substitution | Escalate — do not loop |

## Re-Selection Protocol

Maximum **2 re-selection attempts** before escalation.

```
Round 1: AF-4 selects blocks → AF-9 judges → REJECT
Round 2: AF-4 re-selects with rejection reason → AF-9 judges → REJECT
Result: Escalate with full selection history
```

If both selections are rejected:
- Record in STATE.json: `skillSelectionBlocked: true`
- Show Luba the three proposed selections and both rejection reasons
- Wait for explicit guidance on which blocks to use

## What REJECT Means

REJECT means the judge believes the selected blocks will not prevent violations for this specific generation call. It does NOT mean:
- The generation should be skipped
- A different skill should be used
- The activation rules are wrong (those are product decisions)

## scoreDelta Recording

Every judgment (ACCEPT or REJECT) results in a scoreDelta record in AF-11:
- ACCEPT: `scoreDelta = post_generation_quality - pre_generation_quality` (computed after generation)
- REJECT: `scoreDelta = -0.1` (immediate penalty — selected blocks were not useful)

The rolling average of scoreDelta per skill key drives future selection priority.

## Model Configuration (FREEDOM)

The cross-validation model is configured in the FREEDOM layer:
```typescript
// In freedom config:
CROSS_VALIDATE_MODEL: process.env.CROSS_VALIDATE_MODEL || 'gpt-4o'
// Alternatives: 'gemini-pro', 'claude-opus-4' (different instance)
```

This is FREEDOM (configurable) — the model assignment is NOT MACHINE.
What IS MACHINE (non-configurable): that cross-validation uses a DIFFERENT model than the primary.
