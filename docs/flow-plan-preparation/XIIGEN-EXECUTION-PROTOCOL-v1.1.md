# FLOW PLAN PREPARATION — MANDATORY EXECUTION PROTOCOL
## Version: 1.1 | For: Claude Code
## Changed from v1.0:
##   - Fixed output paths (/mnt/user-data/outputs/ does not exist in Claude Code)
##   - Added temp directory creation at session start
##   - Added SELF-CHECK reminder to 3-minute check
##   - Added graph metadata fields to skill format reference
## Every rule is absolute. No exceptions. No "I'll do it at the end."

---

## ON SESSION START — BEFORE ANY WORK

```
1. CREATE → docs\flow-plan-prep-temp\ if it does not exist
            This is the working output directory for Part 1.
            All state files and skill drafts save here.
            In Part 2, contents move to docs\flow-plan-preparation\.

2. READ   → docs\flow-plan-prep-temp\SKILL-PREP-STATE.json
            (or FLOW-XX-PLAN-STATE.json for flow plan sessions)
            If file does not exist: this is a new session — initialize state.

3. PRINT  → current_step + step_status

4. CHECK  → missing_skills
            If non-empty: STOP. Print blocked steps. Do not proceed.

5. LOAD   → every skill file listed for current step
            Read the file — do not name it, do not summarize it, read it.

6. PRINT  → ✅ [filename] (SK-NNN) — one line per skill loaded

7. BEGIN  → the current step only
```

**Working directory rules:**
```
Part 1 (skill writing):
  State file:    [PROJECT_ROOT]\docs\flow-plan-prep-temp\SKILL-PREP-STATE.json
  Skill drafts:  [PROJECT_ROOT]\docs\flow-plan-prep-temp\[skill-filename].md
  Live skills:   [PROJECT_ROOT]\.claude\skills\[skill-filename].md
                 (save to BOTH locations every time a skill is written)

Part 2 (directory creation):
  Move all files from docs\flow-plan-prep-temp\ to docs\flow-plan-preparation\
  Delete docs\flow-plan-prep-temp\ after move is confirmed
```

---

## EVERY 3 MINUTES — MANDATORY CHECK

Stop what you are doing. Run this. Every time. No exceptions.

```
⏱️  3-MINUTE CHECK

PROGRESS   What did I produce in the last 3 minutes?
           (name the artifact or "nothing yet")

AGENTS     Which AI calls ran? Did all return a result?
           Any call that did not return → record in state.issues[] now.

DRIFT      Am I doing what this step requires?
           Writing instructions instead of a context package → STOP.
           Re-read the step spec. Resume from the correct action.

SELF-CHECK Am I producing content that tells the AI WHAT to produce?
           That is an instruction file (SK-443), not a context package (SK-522).
           Does the document I am writing have QUESTION YOURSELF guidance?
           If producing a context package or skill without self-check → ADD IT.

STATE      Is state saved? → Save now if not.
           Saved to: docs\flow-plan-prep-temp\[state-file].json

NEXT       One sentence: what is the single next action?
```

Write one entry to `state.progress_log[]` after every check:
```json
{ "time": "HH:MM", "step": 1, "action": "assembled invariants list", "agents_ok": true }
```

---

## ON STEP COMPLETE — BEFORE MOVING ON

```
1. RUN    → every EXPECTED RESULTS check (each must be TRUE — no partial)
2. RUN    → SK-443 checks 1-7 on every document produced (0 hits required)
3. FIX    → every BAD RESULT found before writing state
4. WRITE  → all state keys listed in step's STATE WRITE section
5. SAVE   → state file to docs\flow-plan-prep-temp\[state-file].json
6. SAVE   → step document to docs\flow-plan-prep-temp\[STEP-N-NAME].md
            AND to .claude\skills\ if the document is a skill file
7. PRINT  → "STEP N COMPLETE — [filename] saved — state saved"
8. STOP   → do not start next step without explicit approval from Luba
```

---

## WHEN AN AGENT FAILS OR STALLS

```
1. RECORD → state.issues[]:
   { "step": N, "agent": "model name or call type",
     "failure": "what happened", "action": "retried / escalated / skipped" }

2. RETRY  → once with same input
3. If retry fails → mark step as BLOCKED_AGENT_FAILURE, save state, report:
   "Step N blocked — [agent] failed after retry. Awaiting instruction."
4. STOP   → do not substitute a different model without explicit approval
```

---

## WHEN A SKILL IS MISSING

```
1. RECORD → state.missing_skills[]: "SK-NNN skill-name"
2. SET    → step_status = "BLOCKED_PENDING_SKILL"
3. SAVE   → state
4. REPORT → "Step N blocked. Required skill SK-NNN does not exist.
             Steps N through M cannot complete until SK-NNN is written."
5. STOP   → do not approximate. Do not use a substitute skill without
             explicit approval. The skill exists to prevent wrong approximations.
```

---

## WHEN CONTEXT IS RUNNING LOW

```
1. COMPLETE the current atomic action (do not stop mid-step)
2. SAVE   → state immediately to docs\flow-plan-prep-temp\[state-file].json
3. SAVE   → any in-progress document to docs\flow-plan-prep-temp\ even if incomplete
            (name it [STEP-N-NAME]-PARTIAL.md)
4. PRINT  → "Context low. Step N in progress. Saved partial output.
             Resume: read state, load skills for step N, continue from [action]."
5. STOP
```

---

## SKILL FILE FORMAT REFERENCE (mandatory for all new skills)

Every skill file written in this session must include these frontmatter fields.
The graph-aware fields (player_types through relevant_when) are NEW — required
for Graph RAG retrieval. Do not omit them.

```yaml
---
name: [skill-name-kebab-case]
sk_number: SK-NNN
version: "1.0.0"
priority: HIGH
load_order: [0=before other work | 1=during | 99=at completion]
category: planning
author: luba
updated: "2026-04-01"
contexts: ["web-session", "claude-code"]
description: >
  [2-4 sentences. What this skill governs. What it prevents.
  When to load it.]
triggers:
  - "[phrase that means this skill is needed]"

# --- GRAPH RAG FIELDS (required for retrieval) ---
player_types:    [executor | arbiter | main_arbiter | escalation_unit |
                  planner | depth_decider | judge | meta_arbiter]
node_types:      [ROUTING | ORCHESTRATION | DATA_PIPELINE |
                  VALIDATION | SCHEDULED | ANY]
decision_point:  [generate | evaluate_node | judge_output | escalate |
                  plan | depth_decide | configure | evaluate_system |
                  propose_improvement]
tree_types:      [ANY | specific-tree-type-name]
relevant_when:
  parent_is:     [node_type | ANY]
  has_siblings:  [node_type | ANY]
  at_depth:      [1 | 2 | leaf | ANY]
  is_leaf:       true | false | ANY
---
```

---

## NEVER DO THESE

```
❌ Start a step without reading state first
❌ Name a skill without reading its file
❌ Skip the 3-minute check because "I'm almost done"
❌ Write state keys without saving the file
❌ Mark a step COMPLETE with any EXPECTED RESULTS item still FALSE
❌ Begin the next step without Luba's explicit approval
❌ Substitute a missing skill with training knowledge
❌ Retry a failed agent more than once without reporting
❌ Save files to /mnt/user-data/outputs/ — that path does not exist in Claude Code
❌ Omit graph RAG fields from skill frontmatter
❌ Write a context package without a QUESTION YOURSELF section
```

---

## STATE STATUS VALUES — ONLY THESE ARE VALID

```
NOT_STARTED            step has not begun
IN_PROGRESS            step is running
COMPLETE               all expected results TRUE, state written, file saved
BLOCKED_PENDING_SKILL  required skill does not exist
BLOCKED_AGENT_FAILURE  agent failed after one retry
BLOCKED_PENDING_INPUT  waiting for Luba response
```

Any other value in step_status is invalid. Replace with the closest valid value.
