---
name: change-propagation
sk_number: SK-440
version: "1.0.0"
priority: MANDATORY
load_order: -1
category: planning
author: luba
updated: "2026-03-24"
contexts: ["web-session", "claude-code"]
description: >
  Before any task that changes the XIIGen ecosystem is considered started,
  identify every file that carries metadata about the thing being changed.
  That list is the blast radius. The task is not done until every file in
  the blast radius is updated and verified. This skill prevents partial
  updates that look complete but leave stale references across sessions,
  Claude Code instances, and future flows.
triggers:
  - "add a skill"
  - "add a flow"
  - "update artifact numbers"
  - "amend a plan"
  - "new task type"
  - "new factory"
  - "change execution order"
  - "complete a pre-flow task"
  - "before closing any task"
  - "what else needs updating"
---

# Change Propagation Skill v1.0

## THE PRIOR QUESTION

Before any task begins — not after it appears done — ask:

**"What are all the files that will be stale the moment this change is made?"**

That list is the blast radius. Writing it down before starting means nothing
is discovered reactively at the end. The task is not done until every item
on the list is checked off.

---

## THE DEPENDENCY MAP

Six change types, each with a complete blast radius.

---

### CHANGE TYPE 1: SKILL ADDED (new .md file)

**Blast radius — ALL of the following must update:**

```
In the zip / Claude.ai project:
  □ FLOW-DESIGN-SKILL-INDEX.md
      - Add row to "New in v1.0.x" skill table
      - Update header count: "+N new skills"
      - Update "What changed" section
      - Update "Applies immediately vs needs infrastructure" if relevant

  □ HOW-TO-USE-SKILLS.md (project custom instructions)
      - Add to "Activation triggers" table (when to load it)
      - Add to "What each skill prevents" table
      - Update "Applies immediately" or "Needs infrastructure" list
      - Update FILE INVENTORY count and list

In the Claude Code zip:
  □ INTEGRATION-INSTRUCTIONS.md
      - Add to Step 1 cp command block
      - Add to Step 4 SKILL-INDEX.md table
      - Add to Step 3 AGENTS.md load_order block
      - Update Step 5 verify loop

In the codebase — BOTH competing skill catalogs (mvp has two, they MUST stay in sync):
  □ .claude/skills/   (~358 skills — the larger catalog)
      - Create the SKILL.md (single-file planning--*-SKILL.md OR <name>/SKILL.md dir)
      - Add row to .claude/skills/SKILL-INDEX.md (SK number, file, version, description)
  □ .agents/skills/   (~65 skills — the agent catalog)
      - If the skill belongs to the agent surface, mirror the same SKILL.md here
      - Update the .agents index / AGENTS.md (load_order, trigger phrases, category)
  □ .claude/AGENTS.md
      - Add load_order entry, trigger phrases, correct category block
  □ .claude/skills/code-execution/code-execution--skill-registry.md
      (if it exists and tracks SK numbers)
```

**Binding (mvp-specific): the two catalogs are BOTH derived views and must be
updated in the SAME task.** A skill added to `.claude/skills/` but not reflected in
`.agents/skills/` (or vice-versa) is the catalog-drift defect — a future session
loading the other catalog silently misses the skill. When a skill is intentionally
single-catalog, say so explicitly; do not leave the divergence undocumented.

**Before starting:** count how many of these files exist in the current
session context. Note which ones are in the zip vs in the codebase.
The ones in the codebase require a Claude Code session to update.

---

### CHANGE TYPE 2: SKILL UPDATED (content change, no new file)

**Blast radius:**

```
  □ FLOW-DESIGN-SKILL-INDEX.md
      - "What changed" section: describe the update
      - If behavior change: update "What each skill prevents" in HOW-TO-USE

  □ HOW-TO-USE-SKILLS.md
      - Only if the update changes WHEN the skill fires or WHAT it prevents

  □ INTEGRATION-INSTRUCTIONS.md
      - Step 5 verify: if new content is checkable, add a grep test

  □ Any other skill that cross-references this skill by name
      (grep the skill name across all .md files to find references)
```

---

### CHANGE TYPE 3: FLOW ADDED (new FLOW-XX with task types)

**Blast radius:**

```
  □ CLAUDE.md (codebase)
      - Next T, F, Family, CF numbers updated

  □ INFRASTRUCTURE-FLOWS-STATE-v4.json (or successor)
      - New flow entry with artifact ranges
      - Execution order updated

  □ xiigen-rag-patterns
      - ARTIFACT_RANGE document seeded at Phase F
      - NODE_REPRESENTATION documents seeded at Phase A

  □ PARALLEL-EXECUTION-PLAN.md
      - If flow affects wave assignments

  □ Memory entries
      - Execution position section
      - Next T, F, Family numbers

  □ PRE-FLOW-01-TASK-DOCUMENT.md
      - If this flow completes a pre-FLOW-01 task

  □ DECISIONS-LOCKED.md
      - Any decisions made during planning

  □ FLOW-XX-ARCHITECTURE-DECISIONS.json
      - All design reasoning triples from Gate C
      - Seeded to RAG at Phase A start
```

---

### CHANGE TYPE 4: ARTIFACT NUMBERS UPDATED

Triggered by: any merge, renumbering, or phase completion that changes
the next-available T, F, Family, CF, or SK values.

**Blast radius:**

```
  □ CLAUDE.md — update next-available numbers
      (derive from RAG ARTIFACT_RANGE query or live file scan — never edit manually)

  □ INFRASTRUCTURE-FLOWS-STATE-v4.json — update boundaries

  □ xiigen-rag-patterns — update or add ARTIFACT_RANGE document for affected flow

  □ Memory entries — update execution position numbers

  □ PRE-FLOW-01-TASK-DOCUMENT.md — if task references specific numbers

  □ Any open SESSION files or REFERENCE PLANs that used the old numbers
      (grep: old T number, old F number — find every reference)

  □ DECISIONS-LOCKED.md — if the renumbering produces a new decision
```

**Verification command (always run after any number update):**
```bash
# Confirm no old numbers remain
grep -r "T567\|T568\|T569" server/src/engine-contracts/ | wc -l
# Expected: 0 (all old numbers replaced)

# Confirm new numbers not already taken
grep -r "T577\|T578\|T579" server/src/engine-contracts/ | wc -l
# Expected: only the new files (not pre-existing collisions)
```

---

### CHANGE TYPE 5: PLAN PRODUCED OR AMENDED

**Blast radius:**

```
  □ FLOW-XX-REFERENCE-PLAN.md — the plan itself

  □ SESSION-FLOW-XX-A.md through E — if session files already produced,
      check whether amendment affects their content

  □ DECISIONS-LOCKED.md — any new decisions locked by this plan/amendment

  □ FLOW-XX-ARCHITECTURE-DECISIONS.json — capture decisions as DESIGN_REASONING

  □ INFRASTRUCTURE-FLOWS-STATE-v4.json — if execution order changes

  □ Memory entries — if pre-FLOW-01 task status changes

  □ PRE-FLOW-01-TASK-DOCUMENT.md — if this plan satisfies a pre-FLOW-01 task

  □ MASTER_EXECUTION_PLAN_MERGED — if wave assignment changes
```

---

### CHANGE TYPE 6: PRE-FLOW-01 TASK COMPLETED

**Blast radius:**

```
  □ PRE-FLOW-01-TASK-DOCUMENT.md — mark task complete, record what was done

  □ Memory entries — update task status

  □ INFRASTRUCTURE-FLOWS-STATE-v4.json — if task produced new artifact numbers

  □ CLAUDE.md — if numbers changed

  □ The target skill or reference files the task was meant to update
      (each pre-FLOW-01 task has specific target files — check the task description)

  □ FLOW-XX-REFERENCE-PLAN.md for any flow that depended on this task
      (tasks unblock flows — the flow's plan may reference the task's output)
```

---

## HOW TO USE THIS SKILL

### At task start (not end):

```
1. Identify the change type (1-6 above, or combination)
2. Write out the blast radius for that type
3. Cross off files not applicable to this specific change
4. What remains is the definition of "done" for this task
```

### At task end:

```
For each file in the blast radius:
  □ Was it updated?
  □ Can the update be verified? (grep, count, diff)
  □ If in the codebase: does a Claude Code session need to run?
```

### When a file is in the codebase (not in the session):

Flag it explicitly: "The following files require a Claude Code session to
update — they are not in the current zip/project context."

List them. Don't silently skip them.

---

## THE STRUCTURAL PROBLEM THIS ADDRESSES

Information about skills, flows, and artifacts is duplicated across files.
Some files are sources of truth. Most are derived views.

**Sources of truth** (one owner, one writer):
- Each SKILL.md file (owns its own content)
- xiigen-rag-patterns (owns live artifact ranges and NODE representations)
- INFRASTRUCTURE-FLOWS-STATE-v4.json (owns flow registry — until RAG seeded)

**Derived views** (must be kept in sync manually until automation exists):
- FLOW-DESIGN-SKILL-INDEX.md — aggregates from all skill files
- HOW-TO-USE-SKILLS.md — aggregates from skill files + session type rules
- INTEGRATION-INSTRUCTIONS.md — aggregates from skill files + codebase structure
- CLAUDE.md — derived from artifact registry (should be regenerated, not edited)
- .claude/AGENTS.md — derived from skill load orders
- .claude/skills/SKILL-INDEX.md — derived from skill file metadata
- `.claude/skills/` AND `.agents/skills/` — mvp maintains TWO skill catalogs.
  Both are derived views of the same skill set and must change together. The
  source of truth for each skill is its own SKILL.md; the two catalogs are
  parallel projections that drift apart if only one is updated.

**The rule:** when a source changes, every derived view that references it
must update in the same task. Not the next session. Not when noticed.
Same task.

Until automation regenerates derived views from sources, this skill is
the enforcement mechanism.

---

## ANTI-PATTERNS

```
❌ Closing a "skill added" task after updating only the zip files
   → INTEGRATION-INSTRUCTIONS.md and .claude/AGENTS.md in the codebase
   → are still stale — the next Claude Code session will be missing the skill

❌ Updating CLAUDE.md manually after a number changes
   → CLAUDE.md is a derived view — it should be regenerated from a RAG query
   → or a live file scan, not edited directly

❌ "I'll update the other files in the next session"
   → Partial updates are the root cause of the spaghetti dependency problem
   → The next session doesn't have the context to know what was deferred

❌ Discovering the blast radius at the end of a task
   → The blast radius is identified at the START
   → It defines what done means, not what was forgotten
```

---

## INTEGRATION

```
Load order: -1 (alongside level-correction-response — both are prior conditions)
Invoke at:  START of any task that changes skills, flows, artifacts, or plans
Produces:   Named blast radius list → becomes the task's definition of done
References: planning--claim-verification-SKILL.md (verify numbers after update)
            session-output--investigation-handoff-SKILL.md (record what was updated)
```
