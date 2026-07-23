# Artifact Numbering — Quick Reference

## Session-Start Protocol (MANDATORY)

```bash
# Step 1: Read live numbers from CLAUDE.md
grep -i "next.*factory\|last.*factory\|F-[0-9][0-9][0-9][0-9]" CLAUDE.md | tail -3
grep -i "next.*task\|last.*task\|T-[0-9][0-9][0-9]" CLAUDE.md | tail -3
grep -i "next.*skill\|last.*skill\|SK-[0-9][0-9][0-9]" CLAUDE.md | tail -3

# Step 2: Cross-check ENGINE_ARCHITECTURE_MERGED before claiming
grep "F-XXXX" server/src/engine-contracts/ -r   # verify not in use
grep "T-XXX" server/src/engine-contracts/ -r     # verify not in use
```

Record in STATE-Pn.json before assigning anything:
```json
{
  "artifactNumbers": {
    "readAt": "session-start",
    "nextFactory": "F-XXXX (from CLAUDE.md live read)",
    "nextTaskType": "T-XXX (from CLAUDE.md live read)",
    "nextSkillNumber": "SK-XXX (from CLAUDE.md live read)"
  }
}
```

---

## Number Assignment Rules

| Artifact | Source of Truth | Rule |
|----------|----------------|------|
| Factory ID (F-XXXX) | `CLAUDE.md` + `ENGINE_ARCHITECTURE_MERGED` | Next integer after highest in use |
| Task Type (T-XXX) | `CLAUDE.md` + `TASK_TYPES_CATALOG_MERGED` | Next integer after highest in use |
| Skill Number (SK-XXX) | `agent-constitution/SKILL.md` skill registry | Next integer after highest SK-XXX registered |
| BFA Rule / Family ID | BFA conflict registry | Next integer after highest in use |

**Never skip. Never reuse.**

---

## Reservation (multi-session collision prevention)

After reading live numbers, immediately record what you will use:

```json
{
  "reservedThisSession": {
    "factories": ["F-XXXX"],
    "taskTypes": ["T-XXX"],
    "skillNumbers": []
  }
}
```

A second session in another worktree checking STATE-Pn.json at startup will see the reservation and use the next available number.

---

## Collision Scenarios and Fixes

| Scenario | Fix |
|----------|-----|
| Plan says F-1340, live CLAUDE.md says F-1342 | Use F-1342. Plan numbers are stale. |
| Two sessions running simultaneously | Both check STATE-Pn.json. Higher session uses next after reserved. |
| Skill SK-XXX already in registry | Read registry, use next. Never reclaim. |
| Task type T-XXX in uncommitted contract | Reserve in STATE. Don't reuse until commit confirmed. |

---

## Red Flags

```
⛔ "The plan says the next factory is F-1340" — plan numbers decay; read live
⛔ "I'll assign the number and update docs later" — assign only after reading live
⛔ "Only one session runs at a time" — worktrees allow parallel sessions
⛔ "This number is unused — I'll reclaim it" — use next sequential, never reclaim
⛔ Assigning a number without grep-checking ENGINE_ARCHITECTURE_MERGED first
```

---

## Reference Numbers (STALE — DO NOT USE)

These were the numbers in CLAUDE.md at plan creation. They are stale by definition. Read live canonical docs.

```
F-1339  →  READ LIVE
T-516   →  READ LIVE
SK-330  →  READ LIVE
```
