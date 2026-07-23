# Infrastructure Discovery — Agent Instructions

## Load this skill when
- Starting any new planning session
- Luba says "discover the codebase" or "verify paths"
- About to write a plan, spec, or architectural decision
- Phase Transition Protocol Step 2 triggers Gate 0

## The One Rule

A plan fact without a live file:line reference is an assumption, not a fact.

## Quick Checklist (run before any plan element)

- [ ] Step 0: Pre-existing failures captured (`npx jest | grep FAIL`) and stored
- [ ] Step 1: Artifact numbers read from live CLAUDE.md (not from plan file)
- [ ] Step 2: Directory structure verified with `find`
- [ ] Step 3: ENGINE_ARCHITECTURE_MERGED, TASK_TYPES_CATALOG_MERGED read
- [ ] Step 4: All 6 fabrics + 11 AF stations + 9 DNA guards confirmed present
- [ ] Step 5: Every file the plan modifies — read in full, line count recorded
- [ ] Step 6: Factory completeness map built (COMPLETE / PARTIAL / MISSING)
- [ ] Step 7: DNA-1 audit — zero typed model classes in src/
- [ ] Step 8: No direct SDK imports in non-provider code
- [ ] Step 9: Every plan element → SK-XX + factory ID + file:line

## Red Flags That Stop the Session

| Flag | Action |
|------|--------|
| No factory ID for a new service | Do not write spec — register factory first |
| Direct SDK import in business logic | Flag as DNA violation before planning fix |
| Plan artifact number not in live docs | Re-read live docs before claiming number |
| Proposed pattern already in v17 library | Use existing pattern, do not reinvent |
| Pre-existing failure not captured | Run step 0 before anything else |

## What Feeds Forward

Discovery output is the input to planning-skill Gate 0. Every gate in planning-skill assumes discovery is complete. If discovery is incomplete, the gates produce wrong results.
