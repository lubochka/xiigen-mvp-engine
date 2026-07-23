# BEHAVIORAL-CORRECTIONS-REGISTRY.md
## Version: 1.0 | Date: 2026-04-23
## Location: docs/sessions/BEHAVIORAL-CORRECTIONS-REGISTRY.md
## Tier-0 position: T0-4.5 — read immediately after DECISIONS-LOCKED.md at every session start

---

## PURPOSE

This registry captures session governance failures that recurred across sessions
despite the correct behavior being described in the governance documents.

The HISTORY-RAG-INDEX captures 202 architectural decisions (what the system should do).
The DPO training system captures code quality learning (how generated code should look).
This registry captures behavioral corrections (how sessions should operate).

Without this registry, behavioral corrections exist only in session transcripts.
Agent digests of transcripts extract architectural findings, not behavioral rules.
A correction that took three rounds to land in session N reappears in session N+1
because nothing carried it forward as an indexed rule.

**Read this file at session start alongside DECISIONS-LOCKED.md.**
Every entry is a correction that has already been paid for by a failed session.
Reading it costs 2 minutes. Not reading it costs the correction cycle again.

---

## HOW TO READ EACH ENTRY

```
## BC-NNN — [Failure pattern name]

Closes: H[N] from confirmed nine-pattern corpus (April 2026)
Detection: [observable signal that this pattern is happening]
Corpus: [session file + lines where this failure occurred]
Correct behavior: [what to do instead]
Governed by: [which skill, rule, or document contains the correct behavior]
Date: [when this entry was added]
```

---

## ENTRIES

---

## BC-001 — Images read into chat in Claude Code

Closes: H5 (ignored feedback — took 3 rounds per session), H9 (recurred in next session)

Detection:
- A PNG, JPG, or image file is opened via the Read tool in Claude Code
- Visual content appears in the chat stream (rendered image or base64 block)
- User corrections: "do not send images in chat" / "you need to examine images,
  just don't upload them here"

Corpus:
- claude_code_session.txt lines 5035–5043: "Do not send messages in chat!!!" →
  "Sorry do not send images in chat" → "You need to examine images, just don't
  upload them here!!!" — three separate corrections on the same failure
- module_separation_3.txt lines 4159–4197: same failure in web session

Correct behavior:
  In Claude Code: navigate to the URL via computer_use. Observe the rendered page
  on-screen. Save the screenshot to the specified disk path as an audit artifact.
  Never read the PNG file back into context after saving. For multi-image
  examination: dispatch an agent whose only output is axis verdicts written to
  docs/screen-examination/ROUND-2-COVERAGE-MATRIX.json. Images never travel
  through the chat conversation.

  In web sessions: cannot navigate, cannot use computer_use, cannot examine PNGs
  visually. Run only grep-based axes (Axis C, Axis E). Declare Axis D
  NOT_EXAMINABLE and flag for Claude Code handoff.

Governed by: SK-549 §For Claude Code (Phase 1 addition); dev-safety Rule VE-01

Date: 2026-04-23

---

## BC-002 — Governance wall as first response (HARD RULE A violation)

Closes: H4 (protocol forgotten — HARD RULE A violated in every new ARCHITECT session)

Detection:
  First response to Luba contains any of:
  - STATE.mode: / declared: ARCHITECT / justification: ...
  - STATE.goalContext: / statement: ... / elements: [...]
  - LOAD ORDER 0 — SK-529 v2.4.0 Reconnaissance Gate
  - Session type: ARCHITECT. Threshold: 20 file reads...
  - Q-MINUS-2 Classification: / Goal type: REMEDIATION...
  - Any numbered checklist of skill loads

Corpus:
- module_separation_3.txt lines 23–82: full governance wall after correct paraphrase
- module_separation_4.txt lines 14–48: identical pattern, STATE.mode dumped to output

Root cause: the SESSION-START GATE checklist in HOW-TO-USE creates pressure to
"show work." Sessions read "paraphrase before the wall" instead of "paraphrase
instead of the wall." The paraphrase was written correctly. Then the governance
wall was appended to the same response.

Correct behavior:
  PRE-Q0 paraphrase IS the entire first response. One paragraph. Then stop.
  STATE schemas, RECON REPORTs, Q0-Q9 artifacts, D-FORK tables: INTERNAL ONLY.
  They guide thinking. They do not appear in output to Luba.
  Governance initialization runs silently after the paraphrase. Never visibly.

Governed by: HARD RULE A in SESSION-START-PROMPT v5.1; Mistake 32 in ARCHITECT
  SESSION GUIDE (to be added in a future version)

Date: 2026-04-23

---

## BC-003 — Goal lost between STOPs

Closes: H1 (focus on main goal lost each time it wasn't reminded)

Detection:
  - Luba re-pastes the session goal at the start of a "Continue" message
  - Multiple rounds pass with no visible connection to the product goal
  - SK-536 Goal Reminder Block appears only because Luba re-injected the goal,
    not because the session produced it independently

Corpus:
- module_separation_3.txt: Luba pasted "Don't loose focus on main goal of this
  session" 25 times across the transcript — once per round, injected by Luba
  at the start of each "Continue" message, not self-triggered by the session
- Goal Reminder Blocks appeared at STOPs only when the goal was re-pasted
  in the preceding user message

Root cause: SK-536 §4 turn checkpoints are self-triggering (session counts its
own turns). There is no external enforcement. Goal reminders appeared because
Luba provided them, not because the governance enforced them.

Correct behavior:
  ROUND CONTRACT Check 1 requires verbatim goal quote before every response draft.
  SESSION GOAL field required in MANDATORY STOP FORMAT — visible to Luba.
  If goal cannot be quoted verbatim: stop, re-read session opening, then draft.

Governed by: SESSION-START-PROMPT v5.1 ROUND CONTRACT Check 1 and MANDATORY
  STOP FORMAT SESSION GOAL field

Date: 2026-04-23

---

## BC-004 — ⛔ STOP fires without Mandatory Checks executing

Closes: H3 (definition of done absent), H4 (protocol forgotten mid-session)

Detection:
  - ⛔ STOP appears in response
  - No SESSION GOAL / OUTPUT CONTRACT / LAST CORRECTION fields present
  - The STOP closes when the response ends, not when a contract is verified
  - Mandatory Checks 1–15 described in HOW-TO-USE are not evidenced in output

Corpus:
- Both web sessions (module_separation_3.txt, module_separation_4.txt):
  no Mandatory Check evidence at any mid-session STOP. STOPs close when
  response ends. "⛔ STOP — you grade" without any preceding contract verification.
- The cascade test session (claude_code_session.txt) is the counterexample:
  "SESSION CLOSE: FLOW-01-PLAN-STATE.json must show P1–P6: CAPTURED,
  SK-549 verdicts: all PASS, R3: PROVEN" — binary, verifiable, correct.

Root cause: HOW-TO-USE lists 15 Mandatory Checks but provides no template that
forces them to produce visible output. Checks ran (or didn't) internally.
The STOP is self-declared; Luba cannot see whether the contract was met.

Correct behavior:
  MANDATORY STOP FORMAT block (SESSION-START-PROMPT v5.1) required at every STOP.
  Four visible fields: SESSION GOAL, THIS ROUND PRODUCED, OUTPUT CONTRACT STATUS,
  LAST CORRECTION STATUS. PARTIAL or NOT MET holds next round open.

Governed by: SESSION-START-PROMPT v5.1 MANDATORY STOP FORMAT section;
  Q4 FORMAT RULE (binary done criterion required at session start)

Date: 2026-04-23

---

## BC-005 — Correction ignored across sessions

Closes: H5 (ignoring user feedback from previous messages), H9 (didn't learn)

Detection:
  - A behavioral correction made in session N recurs in session N+1
  - Prior session transcript was loaded and digested by an agent
  - Agent digest returned architectural findings, not behavioral corrections
  - The session that loaded the transcript did not know the behavioral rule

Corpus:
- computer_use image discipline: correction in module_separation_3.txt lines
  4159–4197 (3 rounds to land) → same failure in claude_code_session.txt lines
  5035–5037 → same correction required again
- Agent digest of 367 KB transcript extracted hypothesis verdicts and
  architectural patterns. "Don't send images to chat" is a behavioral rule,
  not an architectural finding. It did not appear in the digest output.

Root cause: HISTORY-RAG-INDEX contains 202 architectural decisions. No equivalent
registry existed for behavioral corrections. Behavioral corrections lived only
in session transcripts. Agent digests of transcripts surface architecture, not
behavior. The correction was permanently lost at the boundary between sessions.

Correct behavior:
  This registry (BC-001 through BC-NNN) is Tier-0 T0-4.5 — read at session start
  alongside DECISIONS-LOCKED.md. Behavioral corrections are indexed rules, not
  knowledge buried in transcripts. When a correction from a prior session is
  relevant, it is here, not in a 367 KB file that requires an agent digest.

  When a correction recurs in a session: add it to this registry before closing.
  The correction costs one session. The registry entry prevents the next session
  from paying the same cost.

Governed by: This document; SK-529 Tier-0 T0-4.5 (to be added in Phase 6)

Date: 2026-04-23

---

## BC-006 — Task switch without scope confirmation

Closes: H6 (switching to other tasks)

Detection:
  - A new file arrives mid-session via upload
  - Session processes the new file without asking whether to finish current task
  - Tasks from different domains begin co-mingling in the same session
  - Session mode stays constant (no SK-535 drift detected) but pipeline position
    changes completely

Corpus:
- claude_code_session.txt: flow 1-48 examination JSON → business flows zip analysis
  → git merge with Skills_Creation_Claude → GitHub token scopes.
  Four distinct tasks. No scope confirmation between any of them.
  Each task was executed correctly in isolation; none closed cleanly before the next.

Root cause: SK-535 mode drift detection fires on abstraction-level drift
(ARCHITECT→EXECUTOR). It does not fire on topical drift — staying in EXECUTOR
mode while shifting from flow examination to git operations is not a mode violation.
No rule governed "new upload = potential scope shift requiring confirmation."

Correct behavior:
  ROUND CONTRACT Check 4: new file arrives mid-session → ask before processing:
  "This appears to be [X]. Should I finish [current task] first, or switch to this?"
  Do not process the file until Luba confirms scope.

Governed by: SESSION-START-PROMPT v5.1 ROUND CONTRACT Check 4

Date: 2026-04-23

---

## BC-007 — Session classified as MAINTENANCE when task was PLANNING

Closes: H6 (task switching), H7 (general protocol became flow-specific)

Detection:
  - User asks to "produce a plan," "make recommendations," "design fixes,"
    or "propose what to change"
  - Session classifies as MAINTENANCE → executes directly → creates files
    without presenting plan → Luba correction required ("I asked for a plan")
  - Or: user says "we have to do something" and session reads urgency as
    authorization to create files

Corpus:
- Parallel session (document index 3, April 2026): "These points are absolutely
  not acceptable, we have to do something" → session started creating SK-553
  before any plan was presented → interrupted → correction: "I asked for a plan,
  why did you try to deliver results?"

Root cause: HOW-TO-USE MAINTENANCE classification: "Execute directly." No plan-first
requirement. H0 says "Luba's direct instruction always wins." Session read
"do something" as authorization to execute. "Do something" is urgency, not approval.

Correct behavior:
  ROUND CONTRACT Check 5: will this response create a file?
  → Was a plan presented AND did Luba say "yes" / "proceed" / "go ahead"?
  → NO approval: produce the plan instead. Do not create the file.
  → MAINTENANCE exception: only when the task was directly instructed as a
    specific file operation ("update file X," "fix line Y") — not when the task
    is to design, recommend, or plan something.

Governed by: SESSION-START-PROMPT v5.1 ROUND CONTRACT Check 5;
  ARCHITECT session scope-out (SK-535): "file edits, diffs, shell commands"
  are out of scope for ARCHITECT mode

Date: 2026-04-23

---

## BC-008 — General skill displaced by flow-specific instantiation

Closes: H7 (failed to proceed with general protocol — became flow-specific)

Detection:
  - Flow-specific document references a skill by name: "Run SK-549," "Apply SK-410"
  - The referenced skill is not in active context
  - Session executes against the flow-specific protocol and treats the skill
    reference as an inert label
  - Custom arbiter set replaces general FC battery (F1-F4 instead of FC-1..FC-14)

Corpus:
- module_separation_4.txt: FLOW-PORTABILITY-TEST-PROTOCOL v1.1 says "Run SK-549
  on every PNG" three times. SK-549 was not in active context. Session could not
  determine what "running SK-549" meant in Claude Code → required 3-round correction.
- Same session: F1/F2/F3/F4 arbiters developed as task-specific replacements for
  SK-410 FC battery. FC-7 (DNA compliance), FC-6 (iron rules), FC-4 (pipeline
  contract) became inaccessible. Plan passed all custom arbiters with DNA violations.

Root cause: no rule required the general skill to be loaded before the flow-specific
document was used. Flow prep documents (GUIDE-B01..B50, STEP-1-INVARIANTS,
per-flow RECONCILIATION files) treat skill references as citations, not as
active prerequisites.

Correct behavior:
  Any flow-specific document that references a skill by name must include a
  Prerequisites section before the reference point:
    Prerequisites before this section:
    - [skill name] loaded and active
  "Run SK-549" without this header is an inert citation.
  When examining a flow-specific document: load any referenced skills before
  using the document. Do not treat skill name mentions as loaded behavior.

Governed by: FLOW-DOCUMENT-AUTHORING-GUIDE Rule 36 (Phase 6 addition)

Date: 2026-04-23

---

## BC-009 — Examination ran indefinitely without a freeze point

Closes: H3 (definition of done), H8 (didn't run code, went in circles)

Detection:
  - Plan version count exceeds v3.0 in a single session
  - Each arbiter pass finds new corrections; those corrections trigger new
    plan versions; new plan versions trigger more examination
  - Items marked "not done yet" accumulate without any being executed
  - No test has been run to verify that the first correction works

Corpus:
- module_separation_3.txt: fix plan grew v2.0 → v4.9 (18 versions).
  Six arbiter passes (A through F), 20 corrections per pass, per flow range.
  Lines 2957–2958: three consecutive "not done yet" items never executed.
  E-arbiter finding at line 1853: "each pass examined a range, each corrected
  what it found, but no pass ever asked 'which pattern should apply uniformly
  across all 49 flows?'" — the accumulation debt problem named explicitly.
- No test ran to verify that "remove ClsService, add explicit tenantId" actually
  worked in any of the 15 flows where it was proposed.

Root cause: no gate closed examination and opened execution. ARCHITECT mode
scope-out prohibits running code — correct by design. The problem is there is
no transition gate: "examination complete when [conditions], hand off to Claude
Code." Without the gate, ARCHITECT sessions examine indefinitely.

Correct behavior:
  Q4 must be binary at session start (Q4 FORMAT RULE in v5.1).
  SK-552 Examination Freeze Gate (Phase 7): three conditions must hold
  simultaneously before synthesis: completeness (all N records complete),
  convergence (no new finding classes in last two passes), and IMPLEMENTATION
  evidence (at least one finding per hypothesis verified in actual code, not
  in a RECONCILIATION-STATE document).
  When Gate 3 (SK-529) fails: produce HANDOFF block for Claude Code (Phase 5),
  not an indefinitely growing plan.

Governed by: SK-552 v1.1.0 §10 Examination Freeze Gate (Phase 7 addition);
  SK-529 v2.5.0 Gate 3 routing (Phase 5 addition);
  SESSION-START-PROMPT v5.1 Q4 FORMAT RULE

Date: 2026-04-23

---

## BC-010 — Plan review applied only to code-generation plans, not remediation plans

Closes: H2 (no plan review caught DNA/tenant/fabric-first gaps)

Detection:
  - Remediation fix plan goes through custom arbiter passes without SK-410 FC battery
  - FC-7 (DNA compliance) not applied to proposed solution patterns in plan
  - Plan says "remove ClsService, add explicit tenantId" for N flows without
    verifying that the proposed pattern is DNA-5 (ALS scoping) compliant
  - DNA violations found in implementation that would have been caught at
    plan review time

Corpus:
- module_separation_4.txt: fix plan v2.0–v4.9 went through A/B/C/D/E/F arbiter
  passes. FC-7 DNA compliance never applied. DNA-8 (outbox-before-queue) appeared
  as a CONCERN at line 3118 when reviewing actual implementation — not at plan
  review time where it should have been caught.
- CODE-REVIEW-PROTOCOL v1.8 FC-7 scope line 3: "Per-plan review for Claude Code
  execution plans, FLOW implementation plans, MVP plans" — remediation plans
  are not in scope. FC-7 text: "Generated code specifications in the plan honor
  DNA-1 through DNA-9" — applies to code generation only.

Root cause: FC-7 was written for GENERATION sessions where plans specify code.
Remediation plans describe what to change, not what code to generate. The FC
battery has a scope gap: it reviews code-generation correctness but not the
DNA compliance of proposed solution patterns in non-generation plans.

Correct behavior:
  FC-7b extension (Phase 4 addition to CODE-REVIEW-PROTOCOL v1.9):
  For REMEDIATION plans, every proposed solution pattern must be verified against
  at least one of DNA-3 (DataProcessResult), DNA-5 (ALS scoping), DNA-7
  (fabric-first), DNA-8 (outbox-before-queue) with IMPLEMENTATION evidence.
  A plan that says "add explicit tenantId" without citing the actual service file
  that proves this pattern is DNA-5 compliant fails FC-7b.

Governed by: CODE-REVIEW-PROTOCOL v1.9 FC-7b (Phase 4 addition)

Date: 2026-04-23

---

## BC-011 — Autonomous session ends with question on genuine external blocker

Closes: behavioural recurrence within a single session — same failure twice
in different clothing (Phase C9 close → Phase C11 close).

Detection:
  - Session is operating under an autonomous directive ("just continue
    development until [goal]")
  - A step requires an external dependency that is genuinely not in scope
    (real GitHub PAT, live infra credentials, a human action outside the
    repo, a vendor API key)
  - The session output ends with a **question to the human** about that
    dependency: "Want me to also wire X if you can supply Y, or leave that
    for a future session?" / "Holding here for your direction." / "Should I
    proceed with Path 1 or Path 2?"
  - The blocker is **infrastructural**, not a judgment call. The autonomous
    directive's answer is obvious: if the credential were available, the
    session would continue; if not, the work is documented and the session
    is clean.

Corpus:
- vigorous-margulis 2026-04-26 session (this conversation):
  - Phase C9 close: "⛔ Holding here for your direction. Want me to proceed
    with Path 2 (real repos), keep Path 1 (synthetic) and document the
    deferment more visibly, or something in between?" — synthetic-vs-real
    repo provisioning is itself a judgment call (acceptable as a question)
    BUT the question was issued before doing FC-29 issue inventory and
    classifying the blocker type, so the human had to answer with a
    re-frame of the goal ("the importance is not in repos but to actually
    check copying and CI/CD") rather than a yes/no on the menu offered.
  - Phase C11 close: "Want me to also wire the integration spec to a test
    GitHub org if you can supply a PAT, or leave that for a future
    session?" — pure infrastructural blocker (PAT not in session). Should
    have been classified as [CARRY-FORWARD] genuine external blocker and
    closed with ⛔ STOP, not converted into a question.

Root cause: the session conflates two distinct blocker classes:
  - **Genuine external blocker** (credentials, live infra, human action
    outside the repo): nothing the session can do; correct response is
    carry-forward + STOP, no question needed.
  - **Willingness blocker** (a real architectural / product judgment call
    where the human's intent is not derivable from the autonomous
    directive): correct response is to surface the question with full
    framing and wait.

When the session treats a genuine external blocker as a willingness
blocker, it (a) wastes a turn of the human's attention on a non-decision
and (b) implicitly relinquishes the autonomous-mode contract, because
the session is no longer continuing toward the goal — it is asking
permission to continue.

Correct behavior:
  At the close of every autonomous-session round, before any "what's next"
  text, run this two-step classification:

  1. **Identify carry-forward items** (FC-29 issue inventory):
     For each unfinished thread, classify as:
       - GENUINE EXTERNAL BLOCKER (no decision needed; documented and
         picked up automatically when the dependency arrives)
       - WILLINGNESS BLOCKER (real judgment call; surface with framing,
         wait for input)
       - SCOPE BOUNDARY (the goal explicitly excluded this; document
         and stop)

  2. **Close pattern**:
     ```
     ISSUE INVENTORY (FC-29):
       [CARRY-FORWARD] <item> — <classification>
       [CARRY-FORWARD] <item> — <classification>
       ...

     ⛔ STOP
     Goal reminder: "<exact autonomous directive>"
     This round produced: <one-sentence delta>
     Output contract: MET ✓ — <which acceptance criteria are now satisfied>
     Carry-forward: <count> item(s), all classified above.
     ```

     Then stop. **No trailing question.** The carry-forward items make
     re-entry obvious in a future session; the STOP makes the round
     complete.

  Only convert a blocker into a question when its classification is
  genuinely WILLINGNESS — and even then, ask once, not as part of a
  menu of options.

Detection rule the session can apply to itself: if the answer to
  "would the autonomous directive's owner answer this with anything
  other than 'continue when the dependency arrives'?" is NO,
  the blocker is genuine external — do not ask.

Governed by:
  - Rule 15 (Explicit STOP Gates Are Absolute) in CLAUDE.md
  - feedback_pulse_and_convergence.md ("no middle approvals")
  - feedback_phase_gate_autopilot.md ("when Luba says proceed, no internal
    approvals; only stop on architectural/product concerns")
  - FC-29 (ISSUE INVENTORY format required before every ⛔ STOP) in
    code-execution--flow-restructure-SKILL.md

Date: 2026-04-26

---

## HOW TO EXTEND THIS REGISTRY

When a behavioral correction lands in a session:

1. Add an entry before the session closes.
2. Entry must have: Detection, Corpus (session + line), Correct behavior, Governed by.
3. Add to Tier-0 index in SK-529 §10.2 if not already present.
4. The correction is not "learned" until it is in this registry.
   A correction that exists only in a session transcript will be lost.

Entry count: 11 (BC-001 through BC-011)
Next available: BC-012

---

## TIER-0 REGISTRATION

This document must be added to SK-529 Tier-0 as T0-4.5:

| T0-4.5 | `docs/sessions/BEHAVIORAL-CORRECTIONS-REGISTRY.md` | Full file | 1 file read | Repeating behavioral failures from prior sessions |

Read immediately after DECISIONS-LOCKED (T0-4).
Same reading discipline: read completely before any synthesis.
Grep count: not required (registry is already indexed — read for content, not counts).

---

## END OF BEHAVIORAL-CORRECTIONS-REGISTRY v1.0
