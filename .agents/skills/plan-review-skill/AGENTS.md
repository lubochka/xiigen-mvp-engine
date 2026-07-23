# Plan Review Skill — Agent Instructions

## Load this skill when
- A plan is about to be handed to Claude Code
- "Is this plan ready?" is asked
- Any plan number, phase, or skill list was just edited
- SESSION-0 is running

## When to invoke (ALWAYS before "ready for handoff")
Not after code is written. BEFORE approval. The FC checks are preventive, not diagnostic.

## Three Gates Required (no exceptions)

| Gate | Who runs it | What it catches |
|------|-------------|-----------------|
| A | Claude Code (SESSION-0) | Structural: counts, paths, phantoms, placements |
| B | 2 independent AI models | Content: wrong architecture, missing requirements |
| C | Luba (written, this session) | Product: is this the RIGHT plan to build? |

Automated checks (Gate A) cannot replace human judgment (Gate C). Both are required.

## The 12 Failure Classes — Quick Reference

| FC | Name | One-line check |
|----|------|----------------|
| FC-1 | Count Drift | All count occurrences = same number |
| FC-2 | Path Errors | Zero wrong-convention paths |
| FC-3 | Phantom Skills | Every numbered skill has a creating phase |
| FC-4 | Duplicate Numbers | No number appears twice |
| FC-5 | Missing Items | Skill presence matrix — zero empty cells |
| FC-6 | Stale Numbers | Live-state numbers have live-read protocol |
| FC-7 | Phase Placement | Phase Map = Deliverable = SESSION file |
| FC-8 | Format | STATE.json + SESSION files + labeled REFERENCE |
| FC-9 | Requirement Ambiguity | Every req has project-specific done-definition |
| FC-10 | Propagation Failure | Old-value grep across ALL docs = 0 hits |
| FC-11 | Overview-Detail Mismatch | Phase header skill list = deliverable block |
| FC-12 | Principles Compliance | All 8 P-gate questions answered (P1–P8) |

## Quick Detection Commands

```bash
# FC-1: Count check
grep -n "23\b" PLAN.md | grep -i "skill\|yaml"

# FC-2: Path check
grep -n "claude-skill\b" PLAN.md  # should be 0

# FC-10: Propagation sweep after any fix
OLD="old_value"
grep -rn "$OLD" .claude/skills/ PLAN.md 2>/dev/null
```

## Gate A Pass Criteria

All 12 FCs must show PASS before Gate B. A plan with any FC failure does not enter Gate B review.

## The Rule

All three gates are needed. Gate A catches bugs. Gate B catches gaps. Gate C catches wrong decisions. None replaces the others.
