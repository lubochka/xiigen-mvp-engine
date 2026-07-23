# Skill Registry

Tracks SK numbers assigned to governance/session skills in this migration.

## Protocol for Assigning New SK Numbers

1. Read `SKILL-MIGRATION-STATE.json` → get last assigned SK
2. Read `CLAUDE.md` → get SK from "Artifact Numbers" section
3. Use max(STATE.json, CLAUDE.md) as starting point
4. Assign sequentially, no gaps
5. Record in STATE-Pn.json under `skillCounts.lastAssignedSK`

## Numbers at Migration Start

From CLAUDE.md at plan creation: **SK-330**
From plan memory (higher): **SK-402**
→ **Use SK-402+ for all migration skills**

## Migration Skill Registry (Phase 1 assignments)

| SK | Skill Name | Phase |
|----|-----------|-------|
| SK-402 | agent-constitution | P1 |
| SK-403 | no-product-decisions | P1 |
| SK-404 | dev-safety | P1 |
| SK-405 | skill-advisor-skill | P1 |
| SK-406 | tracker-skill | P1 |
| SK-407 | infrastructure-discovery | P2 |
| SK-408 | planning-skill | P2 |
| SK-409 | agent-output-format | P3 |
| SK-410 | three-level-verification | P4 |
| SK-411 | test-integrity | P4 |
| SK-412 | bug-to-tests | P4 |
| SK-413 | engine-qa | P5 |
| SK-414 | code-examination | P6 |
| SK-415 | mental-debug | P6 |
| SK-416 | self-verification | P7 |
| SK-417 | dna-compliance-guard | P9 |
| SK-418 | artifact-numbering | P9 |
| SK-419 | retroactive-development | P9 |
| SK-420 | docker-local-testing | P10 |
| SK-421 | documentation-sync | P10 |

## Anti-Patterns

- NEVER assign the same SK to two skills
- NEVER skip numbers (SK-403 → SK-405 is invalid)
- NEVER use numbers from canonical docs without verifying they aren't already taken
- If two in-flight sessions might assign the same number, record reserved ranges in STATE.json immediately
