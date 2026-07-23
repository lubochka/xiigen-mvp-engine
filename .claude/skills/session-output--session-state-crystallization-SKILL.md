---
name: session-state-crystallization
sk_number: SK-459
version: "1.0.0"
priority: MANDATORY
load_order: 99
category: session-output
author: luba
updated: "2026-03-26"
contexts: ["web-session", "claude-code"]
description: >
  At the end of every planning or investigation session, produce a
  SESSION-STATE-SNAPSHOT.md. The snapshot is ≤40 lines, contains only
  what changed, and enables the next session to start without loading
  any large reference document. This is the execution-side analog of
  SK-443 (session file crystallization) applied to inter-session state.
  A session cannot claim complete without producing this snapshot.
triggers:
  - "end of session"
  - "before we finish"
  - "session complete"
  - "wrap up"
  - "produce snapshot"
  - "session state"
  - "handoff"
  - "what do I need for the next session"
  - "crystallize"
  - "save state"
  - "STOP"
---

# Session State Crystallization Skill (SK-459) v1.0

## WHEN TO INVOKE

At the end of every planning session and every investigation session,
before ⛔ STOP. The snapshot is the last deliverable of every session.

Generation sessions (Claude Code) produce PHASE-COMPLETE.md instead —
the snapshot is produced at the end of the Claude Code session from
the PHASE-COMPLETE file's data.

---

## THE ≤40-LINE RULE

The snapshot must be ≤40 lines. This is a hard cap, not a guideline.
If you cannot fit the session state in 40 lines:
1. You are repeating information that is already in a prior snapshot
2. Write only what CHANGED since the last snapshot
3. Cut anything that can be derived from a verification command

A 300-line snapshot is a HANDOFF-PROMPT replacement, not a snapshot.
The HANDOFF-PROMPT drifts and becomes stale. The snapshot must not drift.

---

## SNAPSHOT FORMAT

Filename: `SESSION-STATE-SNAPSHOT--[YYYY-MM-DD].md`
Replaces: any prior snapshot (only the latest is active)

```markdown
# SESSION-STATE-SNAPSHOT — [YYYY-MM-DD]
# Session type: [PLANNING | INVESTIGATION | MAINTENANCE | GENERATION]
# Produced by: [brief session description]

## EXECUTION POSITION
Next work:    [one sentence — the next executable action]
Can start:    [YES | NO — if NO, list what is blocking]

## BLOCKING PREREQUISITES
[For each blocker: description + verify command + expected result]
Example:
  BUG-6 triples must be deleted
  Verify: curl -sf "localhost:9200/xiigen-training-data/_search?q=curriculumTier:null" | jq .hits.total.value
  Expected: 0

## ACTIVE BUGS
[bug ID | one-line description | status: OPEN/FIXED/DEFERRED]
Example:
  BUG-6 | 3 corrupt DPO triples curriculumTier=null | OPEN
  BUG-7 | xiigen-shadow-runs not initialised | OPEN
  BUG-8 | arbiterConfig missing from T47/T48/T49 contracts | OPEN
  BUG-9 | execute format broken in FLOW-02/03/04 session files | OPEN

## ARTIFACT BOUNDARIES
Next T:      [T-number]
Next F:      [F-number]
Next Family: [number]
Next CF:     [CF-number]
Next SK:     [SK-number]
Test count:  [N — run: cd server && npx jest 2>&1 | grep "Tests:" | tail -1]

## FLOW STATUS
[flow ID | status: COMPLETE/ACTIVE/PENDING/BLOCKED | one-line reason if not COMPLETE]
Example:
  FLOW-01 | PENDING | Phase B re-run required (BUG-6/7/8)
  FLOW-02 | BLOCKED | Waiting for FLOW-01 ACTIVE
  FLOW-03 | PENDING | Session files not yet produced
  FLOW-04..09 | BLOCKED | Wave 2, awaiting Wave 1 completion

## DECISIONS MADE THIS SESSION
[one sentence per decision — only decisions made IN THIS SESSION]
Example:
  D-2026-03-26-1: SK-459 crystallization gate added to every planning session ⛔ STOP

## SKILLS STATUS
Installed through: SK-[latest]
Governance: HOW-TO-USE-SKILLS-v[version].md
```

---

## HOW TO PRODUCE EACH FIELD

### EXECUTION POSITION
From: the last discussed "what to do next" conclusion, confirmed explicit.
Not from memory — state what was explicitly decided in this session.
If not decided: run `planning--session-scope-resolution-SKILL.md` (SK-460).

### BLOCKING PREREQUISITES
From: `planning--prerequisite-chain-SKILL.md` (SK-458) — do not re-derive.
List only the prerequisites that are currently UNMET.
Copy the verification command from SK-458. Do not paraphrase it.

### ACTIVE BUGS
From: the KNOWN BUGS section of the current session start prompt +
any new bugs discovered in this session.
Status FIXED = bug was resolved in this session (include the fix method).
Status DEFERRED = Luba explicit decision to defer.
Status OPEN = unresolved.

### ARTIFACT BOUNDARIES
From: user memories (canonical source) + any artifact numbers allocated
in this session. If new artifacts were allocated this session, update the
boundaries here. If no artifacts were allocated: copy from last snapshot.

Verification command for test count:
```bash
cd server && npx jest 2>&1 | grep "Test Suites:\|Tests:" | tail -2
```

### FLOW STATUS
From: what was explicitly discussed in this session.
Do NOT query ES at the end of a planning session — status comes from discussion.
GENERATION sessions: status comes from Phase E execution results in ES.

Verification for any ACTIVE claim:
```bash
curl -sf localhost:9200/xiigen-flow-status/_doc/FLOW-01 | jq -r '._source.status'
```

### DECISIONS MADE THIS SESSION
Only decisions made IN THIS SESSION. Not historical decisions.
Format: `D-[YYYY-MM-DD]-[N]: [one sentence]`
These feed SK-450 (architecture-decision-capture) — significant decisions
should also appear in ARCHITECTURE-DECISIONS.json at Gate C.

---

## THE GATE

A session cannot claim ⛔ STOP without producing this snapshot.
This gate applies to:
- Planning sessions (web)
- Investigation sessions (web)
- Maintenance sessions (web) — if state changed
- Generation sessions (Claude Code) — produce from PHASE-COMPLETE data

**Line count verification — run before claiming ⛔ STOP:**
```bash
wc -l SESSION-STATE-SNAPSHOT--$(date +%Y-%m-%d).md
# Expected: ≤ 40
# If > 40: you are copying prior snapshot content — rewrite with only what changed
```

The snapshot replaces:
- The HANDOFF-PROMPT (383 lines, manually authored, already stale)
- The CURRENT STATE section of the session start prompt (hardcoded values)
- Loading PHASE-THREE-PREP to find execution position

The snapshot does NOT replace:
- PHASE-COMPLETE.md (generation session output — different purpose)
- SESSION-BRIEF.md (cold-start for next phase — different purpose)
- ARCHITECTURE-DECISIONS.json (design reasoning — different purpose)

---

## WHAT GOES IN THE NEXT SESSION START

After this snapshot exists, the session start prompt CURRENT STATE section becomes:

```markdown
## CURRENT STATE
Read: SESSION-STATE-SNAPSHOT--[latest date].md
If absent: state UNKNOWN. Ask Luba for current execution position.
For session scope: load planning--session-scope-resolution-SKILL.md (SK-460)
```

The large documents (HANDOFF-PROMPT, PHASE-THREE-PREP, EXTENSION-PLAN) are NOT
loaded at session start. They are consulted on demand for deep-dive questions.

---

## ANTI-PATTERNS

```
❌ Snapshot > 40 lines
   → You are copying information from prior snapshots
   → Write only what changed since the last snapshot

❌ Verification commands paraphrased ("check the ES index")
   → Copy the literal command from SK-458
   → A paraphrased command cannot be run at next session start

❌ "No decisions made this session"
   → Every session makes at least one decision (the decision to start the session)
   → If genuinely no decisions: write "No architectural decisions — maintenance session"

❌ Snapshot produced after the session claims complete
   → The snapshot IS the last step of the session
   → ⛔ STOP fires after the snapshot is produced, not before
```

---

## INTEGRATION

```
Invoke at:    Every planning/investigation session ⛔ STOP — LAST deliverable
Reads from:   planning--prerequisite-chain-SKILL.md (SK-458) — blocking prerequisites
              planning--session-scope-resolution-SKILL.md (SK-460) — execution position
Produces:     SESSION-STATE-SNAPSHOT--[date].md (≤40 lines)
Replaces:     XIIGEN-HANDOFF-PROMPT (383 lines) — do not update handoff manually
              CURRENT STATE section of session start prompt (hardcoded values)
References:   planning--output-contract-SKILL.md (SK-448) — output contract gate
              planning--session-file-authoring-SKILL.md (SK-443) — session file analog
```
