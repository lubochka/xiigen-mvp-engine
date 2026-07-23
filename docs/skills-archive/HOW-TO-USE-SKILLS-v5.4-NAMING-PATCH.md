# HOW-TO-USE-SKILLS — v5.4 NAMING PATCH
## Adds SK-430 to the skills index and updates scenarios that involve flow planning
## Apply this as an amendment to HOW-TO-USE-SKILLS-v5_3.md (or its successor)
## Date: 2026-03-22

---

## CHANGES TO APPLY

### 1. Add SK-430 to the "FOR DECISION-MAKING" skills block

In the skills index block, after SK-429, add:

```
  SK-430-SKILL.md  NamingConventionsEnforcer ← step 8 of planning pipeline;
                                                6 rules: domain file names, flowId+flowName
                                                in contracts, flow_name in STATE.json,
                                                5-section Jira comments, domain constants,
                                                domain service files
```

### 2. Add to "WHAT EACH SKILL DOES" quick reference table

| SK-430 | Invoke when... | Never invoke when... |
|--------|----------------|---------------------|
| SK-430 NamingConventionsEnforcer | Step 8 of every planning pipeline; reviewing any new file name; before any session file is produced | The flow has no new service files and no new EngineContract factories |

### 3. Update SCENARIO 1 (Step 3 pipeline) — add step 8

In the 7-skill pipeline description, change:

```
① agent-output-format
② xiigen-core-principles
③ SK-416 startup
④ infrastructure-discovery
⑤ planning-skill
⑥ plan-review-skill
⑦ flow-reexamination
```

to:

```
① agent-output-format
② xiigen-core-principles
③ SK-416 startup
④ infrastructure-discovery
⑤ planning-skill
⑥ plan-review-skill
⑦ flow-reexamination    (for user-facing flows)
⑧ SK-430 naming-check  ← NEW: runs before session files are produced
```

### 4. Update EXECUTION ORDER — add FLOW-00.1

After `→ FLOW-00` in the execution order, add:

```
→ FLOW-00.1 (Naming Fix-Up — prerequisite for FLOW-01)
  Phases A–D: schema update, file renames, directory renames, SK-430 registration
  Gate: npm run lint:naming exits 0 before FLOW-01 starts
```

### 5. Add SCENARIO 11 — Naming Compliance Check

```
## SCENARIO 11 — CHECKING OR FIXING NAMING COMPLIANCE

### Checking a single file or class name:
"Does the name 'EventRegistrationManager' comply with naming conventions?"
→ Claude runs SK-430 Rules 1–6 against the proposed name
→ Reports: acceptable (domain-specific Manager exception) with rationale

### Checking a full flow plan:
"Run SK-430 on FLOW-03-REFERENCE-PLAN-v3.md"
→ Claude checks: service file names, directory name, EngineContract fields,
  STATE.json template, Jira comment structure
→ Reports: pass/fail per rule, with specific fixes for any violation

### Checking the live codebase:
"Run naming lint on the current codebase"
→ Claude Code runs: npm run lint:naming
→ Exit 0 = all clean. Exit 1 = violations listed with fix instructions.

### Fixing a violation:
"flow35-contracts.ts needs renaming"
→ Claude invokes FLOW-00.1 Phase B procedure for that specific file
→ Produces: git mv command, constant rename, import path updates
```

### 6. Update DOCUMENT QUICK-LOOKUP

Add these rows to the lookup table:

| I need... | Look in... |
|-----------|-----------|
| Domain name for a flow | DECISIONS-LOCKED.md → D-NAMING-1 |
| Service file naming rule | naming-conventions-SKILL.md + SK-430 Rule 1 |
| Jira comment template | SK-429 SKILL.md (updated in FLOW-00.1 Phase D) |
| Naming lint script | server/scripts/naming-lint.js |
| Whether a Manager/Helper name is ok | naming-conventions-SKILL.md §Context-Aware Exceptions |

### 7. Update THE THREE APPROVAL GATES — Gate A note

In Gate A, add:

```
GATE A — Automated SK-418 checks (V1 through V28)
  All 28 must pass.
  + SK-430 check: naming conventions must pass (step 8 of pipeline) ← NEW
    Rules 1–6 all green before any session file is produced.
```
