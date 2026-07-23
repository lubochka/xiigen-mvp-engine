# FLOW-01 FILE ORGANIZATION — INSTRUCTIONS FOR CLAUDE CODE
## One-time task. No state file needed.

---

## WHAT TO DO

Two operations in order.

---

## OPERATION 1 — MOVE EXISTING FILES TO ARCHIVE FOLDER

Create this folder if it does not exist:
```
C:\Projects\xiigen mvp\.clone\worktrees\crazy-shannon\docs\sessions\FLOW-01\final flow testing\
```

Move ALL existing files currently in:
```
C:\Projects\xiigen mvp\.clone\worktrees\crazy-shannon\docs\sessions\FLOW-01\
```

INTO the new `final flow testing\` subfolder.

That means these files move:
```
EXECUTION-LOG-A.json
EXECUTION-LOG-B.json
EXECUTION-LOG-C.json
EXECUTION-LOG-D.json
EXECUTION-LOG-E.json
EXECUTION-LOG-F.json
FLOW-01-ARCHITECTURE-DECISIONS.json
FLOW-01-INFRASTRUCTURE-GATE.md
FLOW-01-LIVE-RUN-RESULTS.json
FLOW-01-LIVE-RUN.md
FLOW-01-PREPARATION-STATE.md
FLOW-01-REDESIGN-PLAN.md
FLOW-01-REPLAN-SUMMARY.md
FLOW-01-SESSION-A.md
FLOW-01-SESSION-B.md
FLOW-01-SESSION-C.md
FLOW-01-SESSION-D.md
FLOW-01-SESSION-E.md
FLOW-01-SESSION-F.md
FLOW-01-SESSIONS-C-D-E-F.md
FLOW-01-STATE.json
FLOW-01-TRACES\        (entire subdirectory)
GAP01-MASTER-PLAN.md
GAP01-R0.zip
PHASE-COMPLETE-A.md
PHASE-COMPLETE-B.md
SESSION-BRIEF-A.md
SESSION-BRIEF-B.md
SESSION-BRIEF-D.md
SESSION-BRIEF-E.md
SESSION-GAP-R0.md through SESSION-GAP-R16.md  (all 17 files)
XIIGEN-COMMUNITY-FLOW-MAP.md
```

After the move, `docs\sessions\FLOW-01\` should contain only the
`final flow testing\` subfolder and the new files added in Operation 2.

---

## OPERATION 2 — COPY NEW PREPARATION FILES INTO FLOW-01

Copy these 10 files from `<WORKSPACE>\Documents\xiigen\Missing gaps\`
into `C:\Projects\xiigen mvp\.clone\worktrees\crazy-shannon\docs\sessions\FLOW-01\`:

```
FLOW-01-STEP-1-INVARIANTS.md
FLOW-01-STEP-2-CYCLE1-CONTEXT.md
FLOW-01-STEP-3-CYCLE1-TEST.md
FLOW-01-STEP-4-CYCLE2-TEMPLATE.md
FLOW-01-STEP-5-CYCLE2-TEST.md
FLOW-01-STEP-6-CYCLE3-CONTEXT.md
FLOW-01-STEP-7-CYCLE3-TEST.md
FLOW-01-STEP-8-HANDOFF-CONTRACT.md
FLOW-01-STEP-9-VISIBILITY.md
FLOW-01-STEP-10-CHAIN-REVIEW.md
```

Also copy the state file:
```
FLOW-01-PLAN-STATE.json
```

---

## EXPECTED FINAL STRUCTURE

```
docs\sessions\FLOW-01\
  ├── final flow testing\          ← all prior files archived here
  │     ├── EXECUTION-LOG-A.json
  │     ├── FLOW-01-SESSION-A.md
  │     ├── ... (all moved files)
  │     └── XIIGEN-COMMUNITY-FLOW-MAP.md
  │
  ├── FLOW-01-PLAN-STATE.json
  ├── FLOW-01-STEP-1-INVARIANTS.md
  ├── FLOW-01-STEP-2-CYCLE1-CONTEXT.md
  ├── FLOW-01-STEP-3-CYCLE1-TEST.md
  ├── FLOW-01-STEP-4-CYCLE2-TEMPLATE.md
  ├── FLOW-01-STEP-5-CYCLE2-TEST.md
  ├── FLOW-01-STEP-6-CYCLE3-CONTEXT.md
  ├── FLOW-01-STEP-7-CYCLE3-TEST.md
  ├── FLOW-01-STEP-8-HANDOFF-CONTRACT.md
  ├── FLOW-01-STEP-9-VISIBILITY.md
  └── FLOW-01-STEP-10-CHAIN-REVIEW.md
```

---

## VERIFICATION

After both operations, confirm:
```
□ final flow testing\ exists and contains all prior files
□ FLOW-01\ root contains exactly 11 files (state + 10 step files)
□ No files lost — count before and after the move
```

Print when done:
```
"FLOW-01 organized.
 Archived: [N] files → final flow testing\
 New files placed: 11 files in FLOW-01\ root"
```
