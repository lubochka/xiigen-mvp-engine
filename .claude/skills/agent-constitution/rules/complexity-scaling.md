# Complexity Scaling

Governance intensity scales with the risk level of the work being done.

## Scale Levels

### Level 1 — Skill files only (no engine code changes)
- Session start protocol: full
- DNA check: not required (skill files are Markdown, not TypeScript)
- BFA check: not required
- Build: required (verify nothing broken)
- Tests: required (count must not decrease)
- DECISIONS.md: only if architectural decisions made about skill content

**Sessions:** P1–P10

### Level 2 — Engine code modification (Phase 11)
- Session start protocol: full
- Per-file approval gate BEFORE writing any code
- DNA check: required for every modified file
- BFA check: required if new entities/events/routes added
- Build: required after each file
- Tests: required after each file (count must increase by ≥ test count specified in plan)
- DECISIONS.md: required for every structural decision

**Sessions:** P11

### Level 3 — Bug fix (any phase)
- Bug-to-tests protocol: 3 FAILING tests written BEFORE any fix
- All 3 tests must FAIL (confirm bug reproduces)
- Fix the engine (not the test)
- All 3 tests must PASS after fix
- Test count increases by ≥ 3
- Full Level 2 checks apply

### Level 4 — Existing skill modification (Phase 12)
- Backward-compat check: verify ADDITIVE only (no renamed/removed sections)
- Version bump: v2.1 in skill.yaml
- Consumer grep: check all files referencing this skill before modifying

**Sessions:** P12

## Escalation Trigger

If a task's actual complexity exceeds its expected level (e.g., a "skill file only" session requires changing engine code), stop and escalate. Do not silently expand scope.
