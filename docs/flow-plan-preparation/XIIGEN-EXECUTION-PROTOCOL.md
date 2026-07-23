# FLOW PLAN PREPARATION — MANDATORY EXECUTION PROTOCOL
## Version: 1.0 | For: Claude Code
## Every rule is absolute. No exceptions. No "I'll do it at the end."

---

## ON SESSION START — BEFORE ANY WORK

```
1. READ  → FLOW-XX-PLAN-STATE.json
2. PRINT → current_step + step_status
3. CHECK → missing_skills
           If non-empty: STOP. Print blocked steps. Do not proceed.
4. LOAD  → every skill file listed for current step (read the file — not name it)
5. PRINT → ✅ [filename] (SK-NNN) — one line per skill loaded
6. BEGIN → the current step only
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

STATE      Is state saved? → Save now if not.

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
5. SAVE   → FLOW-XX-PLAN-STATE.json
6. SAVE   → step document to /mnt/user-data/outputs/FLOW-XX-STEP-N-NAME.md
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
2. SAVE   → state immediately
3. SAVE   → any in-progress document to /mnt/user-data/outputs/ even if incomplete
            (name it FLOW-XX-STEP-N-NAME-PARTIAL.md)
4. PRINT  → "Context low. Step N in progress. Saved partial output.
             Resume: read state, load skills for step N, continue from [action]."
5. STOP
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
