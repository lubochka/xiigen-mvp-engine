---
name: output-contract-design
sk_number: SK-448
version: "1.0.0"
priority: MANDATORY
load_order: -1
category: planning
author: luba
updated: "2026-03-26"
contexts: ["web-session", "claude-code"]
description: >
  Before any session starts, define what "done" means in machine-readable form:
  exact file names, exact verification commands, binary pass/fail criteria.
  Not a list of things to do — a list of things that must be true when done.
  Prevents every session from drifting on scope. The S1-S7 rework demonstrated
  the failure mode: sessions claimed complete without verifying against the original
  request. This skill closes that structurally.
triggers:
  - "what should this session produce"
  - "what are the deliverables"
  - "define done"
  - "output contract"
  - "before we start"
  - "scope of this session"
  - "what counts as complete"
  - "session deliverables"
  - "completion criteria"
---

# Output Contract Design Skill (SK-448) v1.0

## WHEN TO INVOKE

Before any session starts. Before any code is written. Before any skill is loaded.
The output contract is the zeroth deliverable — it exists before the work begins.

If a session starts without an output contract, one of two things happens:
1. The session over-delivers (produces things not requested, consuming time)
2. The session under-delivers (misses things that were implied, causing rework)

Both happened across S1-S7. Seven sessions and a partial package were the result.

---

## WHAT AN OUTPUT CONTRACT IS

A machine-readable specification of exactly what "done" means for this session.

Three parts:

### Part 1 — Exact file list

```
## OUTPUT CONTRACT — [SESSION NAME]

### Deliverables
| File | Location | Must contain |
|------|----------|-------------|
| planning--iron-rule-derivation-SKILL.md | /mnt/user-data/outputs/ | sk_number: SK-449, triggers section, STEP 1-4 |
| SESSION-GROUP-A.md | /mnt/user-data/outputs/ | FIX A-1 through A-4b, test gates, ISSUE INVENTORY |
| FLOW-01-ARCHITECTURE-DECISIONS.json | /mnt/user-data/outputs/ | at least 3 decisions in architectureDecisions[] |
```

No ambiguity. No "and any other relevant files." Every deliverable is named or the session
is not scoped correctly.

### Part 2 — Verification commands

For each deliverable, one or more bash commands that produce a binary result:

```bash
# SK-449 exists and has correct SK number:
grep -n "sk_number: SK-449" planning--iron-rule-derivation-SKILL.md
# Expected: 1 hit

# Session file has no cross-references (FC-28):
grep -n "see \|follow \|per the \|apply P[0-9]" SESSION-GROUP-A.md
# Expected: 0 hits

# Architecture decisions has 3+ entries:
jq '.architectureDecisions | length' FLOW-01-ARCHITECTURE-DECISIONS.json
# Expected: >= 3
```

### Part 3 — Specification-level question

After verification commands pass, answer this before claiming done:

> "Does this deliverable match what was originally requested?"

Not: "Are the file internals consistent?"
Not: "Does the content make sense?"
Not: "Did I produce something for each topic?"

The question is about the original request. Read the request again. Does the deliverable
satisfy it exactly?

---

## THE CONTRACT FORMAT

```markdown
## OUTPUT CONTRACT — [SESSION NAME]
## Requested by: [reference to original instruction]
## Session type: MAINTENANCE | PLANNING | GENERATION

### Deliverables
| # | File | Location | Verification command | Expected output |
|---|------|----------|---------------------|-----------------|
| 1 | [filename] | [path] | [bash command] | [expected result] |
| 2 | [filename] | [path] | [bash command] | [expected result] |

### Specification gate (run last, before claiming done)
- [ ] Read the original request again
- [ ] Every named deliverable in the request exists
- [ ] No deliverable was silently merged into another file
- [ ] The two-package split (or equivalent separation) was done if requested
- [ ] Files written from memory of prior content were verified against the original source

### What this session does NOT produce
[Explicit list of in-scope-but-not-this-session items]
```

The "does NOT produce" section is as important as the deliverables list. It prevents scope
creep from "while I'm here I'll also fix..." and prevents the next session from assuming
the current session already did something it didn't.

---

## ANTI-PATTERNS

```
❌ Starting to write code or session files before the output contract exists
   → Output contract is the zeroth step. Code is at least the second.

❌ Output contract written in prose: "This session will produce updated skills..."
   → Prose cannot be verified. Name the files. Write the verification commands.

❌ "And any other relevant files" in the deliverables list
   → This is not a contract. It is permission to produce anything.
   → If it's relevant, name it. If you don't know what's relevant, that's a scoping problem.

❌ Claiming done before running the verification commands
   → The commands exist to run. Run them. If they don't pass, the session is not done.

❌ Merging two requested deliverables into one file without noting it
   → The S1-S7 failure: two packages requested, one undifferentiated zip delivered.
   → The contract must list each requested deliverable separately.

❌ Writing an "updated" file from memory instead of reading the original first
   → S1-S7 failure: session start prompt written from memory of prior version.
   → Read-before-write is part of the output contract: if updating a file, the
     source file must be read in full before a single character is changed.
```

---

## THE TWO-FILE MINIMUM RULE

A session that produces one output can verify it. A session that produces multiple
outputs must verify each one independently. If any deliverable cannot be verified
independently, it is either incomplete or not a real deliverable.

For skill packages specifically: the two-package split (claude-code vs claude-project)
is two deliverables, not one. They must be verified separately:

```bash
# claude-code package:
unzip -l claude-code-skills-v2.3.0.zip | awk '{print $NF}' | sort > /tmp/code_files.txt
diff expected-code-files.txt /tmp/code_files.txt
# Expected: 0 diff lines (exact match)

# claude-project package:
unzip -l claude-project-skills-v2.3.0.zip | awk '{print $NF}' | sort > /tmp/project_files.txt
diff expected-project-files.txt /tmp/project_files.txt
# Expected: 0 diff lines (exact match)
```

---

## INTEGRATION WITH SK-443 (Session File Authoring)

SK-443 (session-file-authoring) governs what SESSION-N.md files look like internally.
SK-448 (output-contract-design) governs whether the session produces the right files at all.

Both must pass. SK-448 runs at session start. SK-443 runs at Gate C when producing session files.

```
SK-448 at session start  →  defines what files the session produces
SK-443 at Gate C         →  verifies the session files are self-contained
Both passing together    →  the session produces the right files and they work
```

---

## WHAT THIS SKILL PREVENTS

- Sessions claiming complete after producing partial deliverables (S1-S7 pattern)
- Deliverables merged without acknowledgment ("the two-package split")
- Files written from memory instead of from source
- Scope drift: "while I'm here" additions that consume time without being requested
- Review cycles caused by discovered scope gaps after delivery
