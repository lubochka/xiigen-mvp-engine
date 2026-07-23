---
name: agent-output-format-skill
description: >
  Enforces that deliverables produced during web sessions (Codex.ai with Opus or
  Sonnet) are formatted for their STATED CONSUMER — typically Codex (Opus).
  Prevents the failure mode where deep analysis in a web session produces
  human-readable reports instead of agent-executable instructions. Must be invoked
  at the START of any web session that will produce plans, skills, or instructions
  for Codex.
metadata:
  author: luba
  version: "2.0.0"
  created: "March 2026"
  updated: "March 2026"
  environment: "Web sessions (Codex.ai) — Opus and Sonnet models"
  failure_it_prevents: >
    Analysis drift — when deep investigation causes the stated output requirement
    ("plans for Codex") to be replaced by human-readable analysis documents
    that Codex treats as deliverables to commit, not instructions to execute.
---

# Agent Output Format Skill v2.0
## For: Web Sessions (Codex.ai, Opus/Sonnet) producing work for Codex

---

## The Problem This Skill Solves

In web sessions, when the user says "make a plan for Codex to execute,"
the web model (Opus/Sonnet) naturally produces output for the HUMAN it's talking
to — analysis, catalogs, risk matrices, comparison tables. These are valuable
reference materials, but they are NOT executable by Codex.

Codex receiving a 479-line analysis document will:
- Commit it as a file ✓
- NOT execute it as instructions ✗
- NOT stop between sessions ✗
- NOT run gate checks ✗
- NOT save state ✗

The deeper the web session goes into analysis, the more the output drifts away
from the stated consumer (Codex) toward the actual audience (the human in
the web chat).

**This skill prevents that drift.**

---

## When to Invoke

**At the START of any web session where:**
- The user says "make a plan for Codex" or similar
- The user says "make instructions for autonomous sessions"
- The deliverable will be consumed by an AI agent, not just read by a human
- The user mentions "Codex", "Opus", "autonomous", "self-implementing"

**Re-check BEFORE producing each deliverable:**
- Before creating any .md file
- Before creating any .json state file
- Before packaging any ZIP

---

## The Rule

> **Every deliverable file must be structured for its STATED CONSUMER,
> not for the human you're currently talking to.**

If the user said "make plans for Codex" → every plan file must be
formatted so Codex can execute it step by step.

Analysis and reference material is FINE — but it must be in SEPARATE files
clearly marked as reference, not mixed into the execution instructions.

---

## The Three-File Rule

Every plan delivery MUST produce at minimum:

### File 1: REFERENCE (for context)
Human-readable analysis. Defect catalogs, root causes, risk matrices,
architecture diagrams, phase-by-phase detail.
Codex reads this for understanding but does NOT execute it.

**Naming:** `docs/REFERENCE-PLAN.md`, `docs/ANALYSIS-*.md`, etc.
**Header:** `# REFERENCE DOCUMENT — Do not execute. Read for context only.`

### File 2: STATE (for navigation)
Machine-readable JSON. Tells Codex which session is current,
what's pending, what's complete. Codex loads this FIRST.

**Naming:** `STATE.json`
**Required fields:** `current_session`, `total_sessions`, `status`, `sessions`

### File 3: EXECUTION (for action)
Agent-formatted instructions. One session at a time. Explicit commands.
Gate checks. Stop markers. State saves.

**Naming:** `SESSION-0-PLAN-REVIEW.md`, `SESSION-1-*.md`, `SESSION-2-*.md`, etc.
**Header:** `# EXECUTION INSTRUCTIONS — Session N of TOTAL`

**Codex should NEVER receive a single document that mixes analysis
with execution instructions.** That is the exact failure mode this skill prevents.

---

## SESSION-0: The Plan Review Gate (NEW in v2.0)

Before producing SESSION-1, produce SESSION-0 — a plan validation gate.

SESSION-0 is NOT optional. This session's experience showed that plan content
errors (wrong paths, stale counts, phantom skills) are MORE dangerous than
format errors. A perfectly formatted SESSION-1 with wrong file paths is worse
than no SESSION-1 at all.

SESSION-0 runs three gates:
- **Gate A:** Automated FC checks (15 failure classes — see plan-review-skill)
- **Gate B:** 2 independent AI models review the plan for consistency
- **Gate C:** Human (Luba) approves after seeing Gate A + Gate B results

Session 1 does NOT start until all three gates pass.
See plan-review-skill for the complete SESSION-0 format.

---

## Execution File Format (What Codex Can Actually Follow)

Every session execution file MUST have this structure:

```markdown
# SESSION [N] OF [TOTAL] — [Title]
## Prerequisites: [what must be true before starting]
## Estimated time: [hours]

---

## ⚡ PREREQUISITE CHECK (if Session 1)
[Verify branch, test baselines, artifact numbers, build green]

## STEP 1: [name]
**File:** [exact file path — verified with ls/grep]
**Action:** [exactly what to change]
**Code:**
\```[language]
[exact code to write or modify — copy-paste ready]
\```
**Test:** [exact test command + expected result]

## STEP 2: [name]
...

---

## SESSION GATE (mandatory before proceeding)
\```bash
# Replace with YOUR project's actual commands from package.json:
cd server && npm run build    # must exit 0
cd server && npm test         # must show ≥ [baseline] passing, 0 failing
cd client && npm run build    # must exit 0 (if project has client)
cd client && npm test         # must show ≥ [baseline] passing, 0 failing
\```
⚠️ Gate commands must match package.json exactly. Do not use yarn if
   the project uses npm. Do not use "run the tests" — use the literal command.
⚠️ Test baselines must be TEST COUNTS (number of passing tests), not
   file counts (number of spec files). These are different numbers.

## STATE UPDATE
Save to `STATE.json`:
\```json
{
  "current_session": [N],
  "status": "complete",
  "tests_added": [count],
  "server_tests_total": [actual count from gate],
  "client_tests_total": [actual count from gate],
  "next_session": [N+1],
  "escalation_needed": [true/false],
  "escalation_topic": "[what decision is needed]"
}
\```

## ⛔ STOP HERE
Do NOT proceed to Session [N+1] without explicit approval.
Save all files. Report results with actual test counts. Wait.
```

**Key elements that make it agent-executable:**
- `## STEP N:` — numbered, sequential, unambiguous
- `**File:**` — exact path, verified against actual repo with ls/grep
- `**Code:**` — actual code block to write, not description of what to change
- `## SESSION GATE` — literal commands from package.json
- `## ⛔ STOP HERE` — literal stop marker, not a suggestion
- `## STATE UPDATE` — exact JSON to save, not "update the state"

---

## State File Format

Every plan must include an initial `STATE.json`:

```json
{
  "project": "[project name]",
  "version": "[plan version]",
  "current_session": 0,
  "status": "not_started",
  "total_sessions": 5,
  "sessions": {
    "0": { "status": "pending", "title": "Plan Review Gate", "phase": "P0" },
    "1": { "status": "pending", "title": "[Phase 1 title]", "phase": "P1" },
    "2": { "status": "pending", "title": "[Phase 2 title]", "phase": "P2" }
  },
  "test_baselines": {
    "note": "Use live npx jest output, not hardcoded. Count must not decrease.",
    "server_tests": "[number from npm test]",
    "client_tests": "[number from npm test, if applicable]"
  },
  "gate_results": {},
  "escalations": []
}
```

Codex loads this file → reads `current_session` → opens that session's
execution file → executes → updates state → STOPS.

---

## Checklist — Run Before EVERY Deliverable

Before creating any file that Codex will consume, verify:

- [ ] **Consumer identified.** Who executes this — Codex or human?
- [ ] **Format matches consumer.** If Codex: numbered steps, exact paths,
      code blocks, gate commands, stop markers. If human: prose is fine.
- [ ] **Analysis separated from execution.** No merged document that mixes
      defect catalogs with fix code snippets.
- [ ] **One session per file.** Codex should open ONE file and execute it.
      Not scan a multi-session plan to find its current session.
- [ ] **State file exists.** Codex needs to know which session is current
      without the human telling it.
- [ ] **Stop marker exists.** Every session file ends with ⛔ STOP.
- [ ] **Gate commands are literal.** From package.json, not paraphrased.
- [ ] **Gate baselines are test COUNTS.** Not file counts (spec files ≠ tests).
- [ ] **Code blocks are complete.** Copy-paste ready, not pseudocode.
- [ ] **File paths are real.** Verified with ls/grep on actual repo, not assumed.
- [ ] **Build commands match package.json.** npm vs yarn, tsc vs webpack, etc.
- [ ] **SESSION-0 exists.** Plan review gate runs before Session 1.

---

## Anti-Pattern Gallery — What Goes Wrong Without This Skill

### Anti-Pattern 1: The Analysis Report
```
DEFINITIVE-FIX-PLAN.md (479 lines)
├── Visual Defect Catalog (120 lines of tables)
├── Root Cause Classification (60 lines)
├── Fix Plan with code snippets scattered in prose
├── Risk Assessment (40 lines)
└── Metrics table

Codex's reaction: git add → git commit → done
```

### Anti-Pattern 2: The Merged Everything Doc
```
MERGED-EXECUTION-PLAN.md (800+ lines)
├── Infrastructure discovery report
├── 6 phases with interleaved analysis and code
├── State schema (but no actual state FILE)
└── Files manifest

Codex's reaction: "Where do I start? I'll commit this."
```

### Anti-Pattern 3: The Beautiful README
```
README.md (400 lines)
├── Package contents list
├── Quick start guide (for human)
├── 7 phase descriptions
├── Success metrics
├── Troubleshooting FAQ
└── "When all boxes checked → BEGIN PHASE 1"

Codex's reaction: Reads it, doesn't know what to DO
```

### Anti-Pattern 4: The Unchecked Plan (NEW — from this session)
```
SESSION-1-GOVERNANCE.md (perfect format)
├── 12 steps with exact code blocks
├── SESSION GATE with literal commands
├── ⛔ STOP marker
└── STATE UPDATE with JSON

But: file paths use .Codex-skill/ (repo uses .Codex/skills/)
But: test gate says ≥ 98 (that's file count, test count is 2,342)
But: skill-advisor-skill built in Session 1 AND Session 3

Codex's reaction: Creates files in wrong location,
  gate passes with regressions, duplicate files created
```

### Correct Pattern:
```
docs/REFERENCE-PLAN.md           ← REFERENCE (human reads for context)
docs/ROOT-CAUSE-ANALYSIS.md      ← REFERENCE
STATE.json                       ← STATE (Codex loads first)
SESSION-0-PLAN-REVIEW.md         ← VALIDATION (15 FC checks + 2 model reviews + approval)
SESSION-1-GOVERNANCE.md          ← EXECUTION (Codex follows step by step)
SESSION-2-PLANNING.md            ← EXECUTION
SESSION-3-OUTPUT-FORMAT.md       ← EXECUTION
...

Codex's reaction:
  1. Load STATE.json → current_session: 0
  2. Open SESSION-0-PLAN-REVIEW.md → run FC checks → report → await approval
  3. After approval: current_session: 1
  4. Open SESSION-1-GOVERNANCE.md
  5. Execute Step 1, Step 2, Step 3...
  6. Run gate (BOTH server AND client)
  7. Update STATE.json
  8. ⛔ STOP
```

---

## Why This Is a Web Session Problem

Codex natively works in steps — it runs a command, reads output, runs
the next command. It doesn't need a "stop here" marker because its execution
model is already sequential.

But in web sessions (Codex.ai), the model produces ALL output at once —
the entire plan, all sessions, all analysis. There's no built-in "stop between
sessions" because the web session is producing a document, not executing code.

The disconnect: the web session produces a COMPLETE document (because that's
how web chat works), but Codex needs INCREMENTAL instructions (because
that's how agent execution works).

This skill bridges that gap by forcing the web session to produce output in
Codex's native format — even though the web session could produce
everything at once.

---

## Integration with Other Skills

```
Web session producing work for Codex:

  1. agent-output-format-skill     ← THIS SKILL (who is the consumer? format check)
  2. infrastructure-discovery-skill ← Ground plan in real code (verify paths, counts)
  3. planning-skill (8 gates)       ← Validate plan correctness (architecture, tests)
  5. plan-review-skill (15 FCs)     ← Validate plan consistency (counts, paths, principles)
     └── SESSION-0: Gate A (FC checks) + Gate B (2 AI reviews) + Gate C (Luba approval)
  5. SESSION-1 through SESSION-N    ← Only after plan-review-skill passes all 3 gates

  Before EVERY file creation:
     Re-check: Is this file for Codex or for the human?
     If Codex: use execution file format
     If human: use reference file format
     NEVER mix the two in one file
```

---

## What Changed in v2.0

| Item | v1.0 | v2.0 |
|------|------|------|
| File rule | Two-File (REFERENCE + EXECUTION) | Three-File (+ STATE.json) |
| SESSION-0 | Not mentioned | Mandatory plan review gate before Session 1 |
| Gate commands | `yarn build` / `yarn test` (project-specific) | Generic + "match your package.json" warning |
| Test baselines | Not mentioned | Explicit: test COUNTS, not file counts |
| Integration | 3 skills | 5 skills including plan-review-skill |
| Anti-patterns | 3 | 4 (added "Unchecked Plan" from this session) |
| Gate B/C | Not mentioned | 2 AI cross-reviews + Luba approval required |
| Checklist | 9 items | 12 items |
| STATE.json | Project-specific format | Generic with test_baselines |

---

## One-Line Summary

> **The human reads the analysis. Codex reads the instructions.
> They must be DIFFERENT FILES — and the instructions must be VALIDATED
> before Codex starts.**

---

END OF SKILL
