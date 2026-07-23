# Skill Advisor — Agent Instructions

Load this skill when:
- Working on AF-4 (rag-context station)
- Working on AF-9 (judge station)
- Working on AF-11 (feedback station)
- Adding or modifying skill block content
- Debugging why generated code has DNA violations (skill blocks may not have been injected)
- Debugging why AF-9 is always accepting or always rejecting selections

## When You Encounter AF-4 Code

Check these before making changes:
1. Does `selectSkillsForContext()` return ≤ 3 blocks? (hard limit)
2. Are the activation thresholds unchanged from the approved values?
3. Is the priority order DNA > BFA > PLAN > TEST > DOCS when candidates > 3?
4. Does it call `getSkillEffectiveness()` to inform selection?

If any threshold looks wrong: do NOT change it. That's a product decision. Log and escalate.

## When You Encounter AF-9 Code

Check these before making changes:
1. Is a DIFFERENT model used for cross-validation vs. generation?
2. Is there a maximum retry limit (≤ 2) before escalation?
3. Does rejection result in `scoreDelta` negative tracking?

## When You Encounter AF-11 Code

Check these before making changes:
1. Is every record scoped by `tenantId`?
2. Does `getSkillEffectiveness()` return a rolling average, not just the last value?
3. Is `scoreDelta` being recorded for both successful and rejected selections?

## Anti-Patterns to Flag

- `const blocks = ALL_SKILL_BLOCKS` → truncates AF-1 context window
- `if (model === primaryModel) validate()` → same model judging its own selection
- `effectiveness[skillKey] = lastScore` → point-in-time, not rolling average
- `if (rejected) throw new Error()` → should return DataProcessResult.failure(), not throw
