# Planning Skill — Agent Instructions

## Load this skill when
- About to write any code or skill files
- Phase Transition Protocol Step 3 runs
- Luba approves a new phase and asks you to proceed

## The One Rule

Gates are pre-code, not post-code. Run them before writing anything, not to justify what you already wrote.

## Quick Gate Status Checklist

Before marking any gate PASS, verify the specific condition — do not assert PASS without checking:

| Gate | Quick Verification |
|------|--------------------|
| 0: Discovery | `preExistingFailures[]` in STATE? Every plan ref has file:line? |
| 1: DNA | `grep -r "class.*Model {"` returns 0 hits in new scope? |
| 2: Fabric | All touched fabrics have interface mapping in the plan? |
| 3: Flow | New task types have AF-9 judge threshold defined? |
| 4: Decisions | Every arch decision has DR-XXX in DECISIONS.md? |
| 5: Tests | Test matrix complete with file paths for every new component? |
| 6: Docs | All 7 merged docs checked — update list written to STATE? |
| 7: Principles | All 8 P-gate questions answered YES or Luba N/A signed? |

## What Blocks Execution

Any gate failing = session blocked. Do not proceed to code.

Escalation format (from escalation-protocol.md):
```
GATE FAILURE: Gate N — [gate name]
FAILING CHECK: [what specifically failed]
OPTIONS: [option A] / [option B]
DECISION NEEDED: Luba must choose
```

## What Feeds Forward

Gate results → STATE-Pn.json `gateResults{}`. plan-review-skill FC-9 checks that every gate has a project-specific "done" definition (not a generic phrase).
