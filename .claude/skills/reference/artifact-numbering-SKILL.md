---
name: artifact-numbering-skill
sk_number: SK-420
version: "1.0.0"
load_order: 19
priority: RECOMMENDED
author: luba
updated: "2026-03-18"
description: >
  Artifact numbering integrity for the XIIGen engine. Sequential assignment
  protocol for factory IDs (F-XXXX), task types (T-XXX), skill numbers (SK-XXX),
  BFA rules, and family IDs. Prevents number collisions across sessions.
---

# Artifact Numbering Skill v1.0

## The Core Rule

**NEVER use artifact numbers from a plan file or memory.** Numbers in plans decay. Live canonical documents are the only authoritative source.

At the start of every Phase 9+ session:
```bash
# Read live canonical docs — do not use any cached or plan-file numbers
grep "Factory:\|F-[0-9]" CLAUDE.md | tail -5
grep "Task Type:\|T-[0-9]" CLAUDE.md | tail -5
grep "Skill:\|SK-[0-9]" CLAUDE.md | tail -5
```

---

## When to Invoke

- When assigning a new factory ID (F-XXXX)
- When assigning a new task type number (T-XXX)
- When assigning a new skill number (SK-XXX)
- When assigning a new BFA rule or family ID
- Before any `STATE-Pn.json` is saved with artifact numbers

---

## Numbering Protocol

### Step 1: Read live numbers (MANDATORY at session start)

```bash
# From CLAUDE.md or ENGINE_ARCHITECTURE_MERGED:
grep -i "next.*factory\|last.*factory\|F-[0-9][0-9][0-9][0-9]" CLAUDE.md | tail -3
grep -i "next.*task\|last.*task\|T-[0-9][0-9][0-9]" CLAUDE.md | tail -3
grep -i "next.*skill\|last.*skill\|SK-[0-9][0-9][0-9]" CLAUDE.md | tail -3
```

Record in STATE-Pn.json:
```json
{
  "artifactNumbers": {
    "readAt": "session-start",
    "nextFactory": "F-XXXX (from CLAUDE.md)",
    "nextTaskType": "T-XXX (from CLAUDE.md)",
    "nextSkillNumber": "SK-XXX (from CLAUDE.md)"
  }
}
```

### Step 2: Cross-check ENGINE_ARCHITECTURE_MERGED

Before claiming a number, verify it is not already in use:
```bash
grep "F-1340\|F-1341" server/src/engine-contracts/ -r
grep "T-517\|T-518" server/src/engine-contracts/ -r
```

### Step 3: Assign sequentially

- Factory IDs: next sequential integer after the highest in use
- Task types: next sequential integer after the highest in use
- Skill numbers: next sequential integer after the highest SK-XXX registered in `agent-constitution/SKILL.md`
- Never skip numbers — gaps create audit confusion
- Never reuse a decommissioned number — use the next available

### Step 4: Record in STATE-Pn.json

```json
{
  "reservedThisSession": {
    "factories": ["F-XXXX"],
    "taskTypes": ["T-XXX"],
    "skillNumbers": []
  }
}
```

This prevents a second Claude Code session from claiming the same numbers before the first session's commit is pushed.

---

## Collision Prevention

| Collision type | Prevention |
|----------------|-----------|
| Two sessions assign same F-XXXX | Both check STATE-Pn.json at session start; higher session uses next available |
| Plan file says F-1339 but live CLAUDE.md says F-1342 | Live doc wins; plan file number is stale |
| Skill number already assigned in agent-constitution | Read skill registry before assigning; always use next available |
| Task type T-516 assigned but contract not yet committed | Reserve in STATE-Pn.json; don't reuse until commit confirmed |

---

## Numbers at Plan Creation (REFERENCE ONLY — DO NOT USE)

These numbers are from CLAUDE.md at plan creation time. By the time you read this, they may be stale. Read live canonical docs.

```
F-1339 (plan creation) → READ LIVE before assigning next F-XXXX
T-516  (plan creation) → READ LIVE before assigning next T-XXX
SK-330 (plan creation) → READ LIVE before assigning next SK-XXX
```

---

## Anti-Patterns

1. **"The plan says the next factory is F-1340."** Plan numbers decay. Read live docs.
2. **"I'll assign the number and update the docs later."** Assign only after reading live. Record in STATE-Pn.json immediately.
3. **"Only one session runs at a time."** Multiple sessions can run in different worktrees. STATE-Pn.json reservation prevents collision.
4. **"This skill number is unused — I'll reclaim it."** Never reuse a number. Use next sequential.
