# ARCHITECT SESSION INFRASTRUCTURE — FIX PLAN v9.1
## Date: 2026-04-21
## Incorporates: all parallel session analyses + Documents 6–11 + execution failure analysis
## Rule: Each phase targets exactly one document
## Structure: Part 1 (10 phases — session infrastructure) + Part 2 (5 phases — UI/UX fleet skills)
## v9.1 fix: Phase 8 corrected from REPLACE to TRANSFORM (v4.5.0 → v4.6.0).
##   Root cause: Document Registry pattern requires HOW-TO-USE to bump whenever a
##   Document Registry entry changes version. Phases 2 and 6 produced v1.9 and v2.1.0.
##   v4.5.0 still referenced v1.8 and v2.0.0. Operation type REPLACE was wrong.
##   Correction note, root cause analysis, and exact sed commands added to Phase 8.
## Core diagnosis: the skills library produces paralysis dressed as rigor — every gate says
##   "gather more before concluding," nothing says "commit to a position now."
##   This plan adds P-A8 (commitment under uncertainty) and Stage 3 commitment gate to fix that.
## v7 fixes: operation type declaration on every phase; pre-condition state checks on
##   every modifying phase; Phase 1 clarified as REPLACE not TRANSFORM.
## v9 fix: Phase 1 (HOW-TO-USE) moved to LAST among file-producing phases.
##   Root cause: HOW-TO-USE is the aggregator — it references all other documents.
##   DOCUMENT-AUTHORITY-MAP confirms: "Session type classification — canonical home:
##   HOW-TO-USE-SKILLS." SESSION-LOAD-PLAN v31 change history confirms: every version
##   bump of HOW-TO-USE in project history happened AFTER the documents it references
##   were updated (SK-538 → v4.1.0; SK-539 → v4.3.0; SK-542 → v4.5.0). Running
##   HOW-TO-USE first means it references v1.9 guide, updated index, and new start
##   prompt before those files exist. Phase 8 (HOW-TO-USE) executes after Phases 1–7.
## Expected result: loadable final versions of all affected files + specs for 5 new skills

---

## HOW TO READ EACH PHASE

Every phase has this structure:

```
Operation type: REPLACE | EDIT | CREATE | TRANSFORM
  REPLACE  — the entire file is swapped. Output is the new file. Nothing from the old file is preserved.
  EDIT     — specific additions are made to an existing file. All other content unchanged.
  CREATE   — a new file that does not yet exist.
  TRANSFORM — a base file plus additions from this plan combined into a new output version.

Pre-condition check (run BEFORE any modification):
  [command] → [expected result]
  If result differs from expected → STOP. State the discrepancy. Do not proceed.

Action: [what to do]

Post-condition check (run AFTER modification):
  [command] → [expected result]
  If result differs from expected → the phase failed. State what was found.
```

The pre-condition check is not optional. It catches assumed state being wrong before the
modification executes. The execution failure that prompted this rule: Phase 1 was executed
against a file the plan assumed was v3.2.0. No pre-condition check ran. The file may have
been any version. The session proceeded blindly.

The operation type declaration is not optional. It determines what inputs are needed and
what the output must contain. A REPLACE produces a file identical to the source. A TRANSFORM
produces a file that is more than any single input. A session that misclassifies the operation
will produce the wrong output even if every other instruction is followed correctly.

---

## CRITICAL PATH

```
Phase 1 (FLOW-DESIGN-SKILL-INDEX — fix navigator first)
  → Phase 2 (Architect Guide v1.9)
    → Phase 3 (Start Prompt v5.0)
      → [Phases 4–7 in any order]
        → Phase 8 (HOW-TO-USE — LAST, after all referenced files exist)
          → Phase 9 VERIFY (all files present in project knowledge)
            → Phase 10 (Human action: update Claude.ai project settings)
```

**Why Phase 1 is last (not first):**

HOW-TO-USE is the aggregator. It references all other governance documents. The
DOCUMENT-AUTHORITY-MAP states: "Session type classification — canonical home:
HOW-TO-USE-SKILLS." Every version bump in project history happened after the documents
it references were updated. SK-542 shipped → then HOW-TO-USE bumped to v4.5.0.
SK-538 shipped → then HOW-TO-USE bumped to v4.1.0. The pattern is consistent.

Running Phase 1 first means the output HOW-TO-USE.md references:
  - XIIGEN-DESIGN-ARCHITECT-SESSION-GUIDE-v1.9.md (does not exist until Phase 3)
  - planning--reconnaissance-gate-SKILL.md v2.1.0 (does not exist until Phase 7)
  - FLOW-DESIGN-SKILL-INDEX v4.0+ (does not exist until Phase 2)

Until those files exist, Phase 1's output references documents that are absent.
Phase 1 executes last so all referenced files are in place before HOW-TO-USE is
finalized.

**Why Phase 2 is first:**

Every subsequent document tells sessions to read FLOW-DESIGN-SKILL-INDEX first for
load orders. It currently stops at SK-519 and does not contain the reconnaissance gate
(SK-529) or any Layer 8–10 skills. Fix the load-order navigator before anything
references it.

---

## WHAT THIS PLAN FIXES AND WHAT IT DOESN'T

**The startup failures are not the bottleneck.**

Every gate and threshold in the skills library is about gathering more evidence before
concluding. SK-529 gates synthesis behind 20 file reads. SK-531 captures claims as
PENDING until verified. SK-536 anchors the goal. The three-stage gate says gather, then
analyze, then conclude. The reconnaissance threshold doubles for wide-scope work. The
entire infrastructure is built around the premise that sessions fail because they gathered
too little evidence.

That is wrong. The sessions in the corpus gathered evidence. They read files. They ran
greps. They met thresholds. Then they enumerated what they found instead of deciding what
it means. They reported "22 to 8 offenses, -63.6%" as a result when they had examined 5
of 48 flows using the wrong measurement. They formed confident pictures from incomplete
reconnaissance and stopped before the picture was complete — not because they didn't read
enough, but because nothing required them to commit to a design decision and defend it.

The real gap is this: no skill in the library requires a session to make a defensible
decision under incomplete information. P-A3 says don't defer product decisions. But none
of the 7 positive habits name the discipline of stating a hypothesis, specifying what
evidence would overturn it, and committing to the hypothesis at the point where further
gathering costs more than deciding.

**What this plan fixes:**

The startup and format failures — governance walls, governance artifacts in output to
Luba, wrong session type recognition, stale index, stale HOW-TO-USE. These are real
problems. Fixing them is necessary.

**What this plan does not fix:**

The library teaches sessions to keep gathering until they are certain. Certainty never
comes. So sessions enumerate instead of deciding. This plan adds more evidence-gathering
gates (T0-0, the three-stage synthesis protocol, reconnaissance thresholds). It adds no
mechanism that says: you have enough, now commit to a position and state what would
change it.

That gap requires a new positive habit (P-A8) in SK-538 and a structural change to
Phase 3's synthesis protocol. Both are specified below as additions to Phase 3. They are
not optional additions — without them, this plan produces sessions that start correctly
and fail at the work.

**The correct expectation for this plan:**

These fixes reduce the probability of startup failures significantly. They add the five
missing UI/UX discipline skills. They do not close the commitment-under-uncertainty gap.
That gap is closed by P-A8 and the Phase 3 synthesis amendment. The first architect
session after Phase 10 should be treated as a verification test, not as guaranteed
correct behavior.

---

## PHASE 1 — FLOW-DESIGN-SKILL-INDEX.md

**Operation type: EDIT**

This is an append operation. All existing v3.2.0 content is preserved unchanged.
New layer sections are appended after the existing content. The output contains
everything the current file contains plus the additions below.

**Note on two index files:** Project knowledge contains both `FLOW-DESIGN-SKILL-INDEX.md`
(v3.2.0, this file) and `SKILL-INDEX-v4.0.0.md` (the master index, already contains
Layer 8–10). They serve different purposes:

- `SKILL-INDEX-v4.0.0.md` — master skill registry, 117 skills, single source of truth
  for SK numbers and skill existence. Already complete. **Do not modify.**
- `FLOW-DESIGN-SKILL-INDEX.md` — integration guide with load orders, session-type
  mapping, and "when to invoke" guidance for Claude.ai web sessions. Currently stale.
  **This is what Phase 2 updates.**

**Pre-condition check (run BEFORE editing):**
```bash
tail -5 FLOW-DESIGN-SKILL-INDEX.md
grep "SK-529\|SK-538\|SK-542" FLOW-DESIGN-SKILL-INDEX.md | wc -l
```
Expected: tail shows v3.2.0 content ending at SK-519; grep returns 0 (these skills absent).
If grep returns > 0 → Layer 8–10 already added. This phase is a no-op. Document as skipped.

**Additions — append after the existing v3.2.0 content:**

```
---

## WHAT CHANGED IN v4.0.0 (Layer 8 — Governance discipline)

Source: Session infrastructure gap analysis 2026-04-20

| Change | What it adds |
|--------|-------------|
| NEW SK-529 | planning--reconnaissance-gate-SKILL.md v2.0.0 — evidence before synthesis; XIIGen Tier-0 search list; thresholds by session type |
| NEW SK-535 | planning--session-mode-declaration-SKILL.md — 5 modes; drift detection |
| NEW SK-536 | planning--goal-context-persistence-SKILL.md — verbatim goal anchor |
| NEW SK-531 | planning--claim-as-hypothesis-SKILL.md — user claims as PENDING_VERIFICATION |
| NEW SK-537 | planning--design-artifact-completeness-SKILL.md — referenced artifact checks |
| NEW SK-532 | planning--materialization-session-type-SKILL.md — MATERIALIZATION constraints |
| NEW SK-533 | planning--mvp-round-trip-verification-SKILL.md — tenant-observable round-trip |
| NEW SK-530 | planning--specificity-calibration-SKILL.md — specificity thresholds by session type |
| NEW SK-534 | planning--goal-delivery-completeness-SKILL.md — FC-14; goal elements → plan turns |
| NEW SK-538 | planning--architect-behavior-classifier-SKILL.md v1.2.0 — 30-habit catalog; 19 negative habits |
| NEW SK-539 | planning--ui-ux-compliance-SKILL.md v1.1.0 — 31 UX checks; grammar types G1-G7 |

## WHAT CHANGED IN v4.1.0 (Layer 9 — Response construction)

| Change | What it adds |
|--------|-------------|
| NEW PROTOCOL | XIIGEN-RESPONSE-CONSTRUCTION-PROTOCOL-v1.md — 7-step protocol; maps to SK-538 habits |

## WHAT CHANGED IN v4.2.0 (Layer 10 — Screen examination + design context)

| Change | What it adds |
|--------|-------------|
| NEW SK-542 | flow-ui-examination-protocol-SKILL.md — session orchestrator for screen examination |
| NEW SK-540 | planning--product-design-context-SKILL.md — pre-design gate; .impeccable.md |
| NEW SK-541 | planning--screen-craft-audit-SKILL.md — four-layer PNG audit |

## LOAD ORDER (v4.0.0+)

For ARCHITECT sessions, read in this order before touching the codebase:

| Load order | Skill | Why |
|-----------|-------|-----|
| 0 | planning--reconnaissance-gate-SKILL.md (SK-529) | Defines what must be read and in what order |
| 1 | planning--session-mode-declaration-SKILL.md (SK-535) | Declares ARCHITECT mode |
| 2 | planning--goal-context-persistence-SKILL.md (SK-536) | Captures verbatim goal |
| 3 | planning--architect-behavior-classifier-SKILL.md (SK-538) | 30-habit catalog — internalize before first response |
| 7 | XIIGEN-RESPONSE-CONSTRUCTION-PROTOCOL-v1.md | 7-step response construction |

For domain-specific architectural exploration (module lifecycle, marketplace,
platform decoupling), additionally read:
  → data-connection-classification-SKILL.md (SUPREME priority)
  → planning--system-intake-SKILL.md (SK-454)
  → self--capability-state-reader-SKILL.md (SK-505) if domain involves engine gaps
  → self--gap-to-proposal-SKILL.md (SK-506) if proposing new flows or extensions

## NEXT AVAILABLE SK: SK-543
```

**Post-condition check:**
```bash
grep "SK-529\|SK-538\|SK-542" FLOW-DESIGN-SKILL-INDEX.md | wc -l
tail -10 FLOW-DESIGN-SKILL-INDEX.md
```
Expected: grep returns ≥ 3 hits; tail shows the NEXT AVAILABLE SK line.

**Gaps closed:** CFI-14 (stale navigator); removes false confidence from stale index.

---

## PHASE 2 — XIIGEN-DESIGN-ARCHITECT-SESSION-GUIDE-v1.9.md

**Operation type: TRANSFORM**

Base file: `XIIGEN-DESIGN-ARCHITECT-SESSION-GUIDE-v1.8.md`
Additions: all sections specified below
Output: new file `XIIGEN-DESIGN-ARCHITECT-SESSION-GUIDE-v1.9.md`

The output contains everything in v1.8 plus the additions. It is not a renamed copy
of v1.8. It is not a standalone new document. Every piece of v1.8 content is present
unchanged. The additions are inserted or appended at the specified locations.

**Pre-condition check (run BEFORE writing):**
```bash
grep -c "^### Mistake" XIIGEN-DESIGN-ARCHITECT-SESSION-GUIDE-v1.8.md
grep "^### Q[0-9]" XIIGEN-DESIGN-ARCHITECT-SESSION-GUIDE-v1.8.md
wc -l XIIGEN-DESIGN-ARCHITECT-SESSION-GUIDE-v1.8.md
```
Expected: Mistake count = 23; Q lines show Q0 through Q10; line count > 300.
If Mistake count ≠ 23 or Q10 is absent → the v1.8 base is wrong. Use the repo version,
not the project knowledge version. Do not proceed with a different base.

**Additions to apply to v1.8 base:**

### Section 1a — Skills before code *(insert after existing Section 1)*

```
## 1a. Skills before code — the operating principle

The project skills library is the operating system for working on XIIGen.
Read skills before reading codebase files. Always. Without exception.

When both the skills library and the codebase are available:
  1. Read relevant project knowledge skills completely — they generate specific questions.
  2. Read codebase files to answer those specific questions.

A session that reads code before reading skills is sampling, not reconnaissance.
```

### Section 1b — Four-layer reading order *(append to Section 1a)*

```
## 1b. Reading order for architectural examination

When examining a new domain, read in this order:

  (a) Intent — what the system is supposed to do
      Authoritative sources (read these, not the V2 master plan or session logs):
        DECISIONS-LOCKED.md — permanently locked architectural decisions
        DD-xxx records — per-flow design decisions in docs/sessions/FLOW-xx/
        planning--product-design-context-SKILL.md (SK-540) — pre-design gate
      If you cannot find a relevant decision record, state that explicitly.
      Do not infer intent from implementation.

  (b) Structure — how it is organized
      Source: fabric interfaces, canonical patterns, domain skill classifications,
              FLOW-DESIGN-SKILL-INDEX (v4.0+ — now includes Layer 8–10)

  (c) Implementation — what it actually does
      Source: service files, bootstrapper, runtime code — chosen by questions
              that (a) and (b) generated. Not open-ended browsing.

  (d) Gaps — what it does not yet do
      Source: carry-forward issues, gap reports, incomplete phases, TODO comments

Do not read (c) before (a).
Do not declare a gap before reading (d).
Reading implementation before intent produces archaeology, not architecture.
Reading a session log or V2 master plan as "intent" produces a plan-of-plans,
not a product understanding.
```

### Q-MINUS-1 *(insert before existing Q0)*

```
### Q-MINUS-1 — What knowledge do I need before I can ask Q0?

Before answering Q0, ask: what project knowledge skills must I read for this domain?

Steps:
  1. Read FLOW-DESIGN-SKILL-INDEX (now includes Layer 8–10) to understand what
     knowledge is available.
  2. Identify which skills apply to this session's domain.
  3. Read those skills completely before proceeding to Q0.

For any session on module lifecycle, marketplace distribution, platform decoupling:
  → data-connection-classification (SUPREME priority — load before any flow planning)
  → system-intake (SK-454) — methodology for examining an existing codebase
  → applicable self-awareness skills (SK-505..SK-509)

State which skills were read and what they told you before proceeding to Q0.
If a skill says "SUPREME priority" — it reads first.
```

### Q0 amendment *(add branch to existing Q0)*

```
If this session is architectural exploration with no named flow and no pipeline
position: Q0 is DEFERRED — not skipped, not a CONTEXT_INSUFFICIENT halt.

Declare explicitly:
  "Q0 deferred — session is architectural exploration, no pipeline position.
   Q0 will be answered once reconnaissance produces the needed context."

Then proceed to Q-MINUS-1. Do not halt at CONTEXT_INSUFFICIENT.
```

### Q1 — THINKING sub-mode *(add to Q1 session type list)*

```
THINKING: exploration and questioning with a human co-architect.
  Output: conversational prose. No phase maps. No locked-decision tables.
  No structured deliverables.
  Goal Reminder Block: INTERNAL ONLY in THINKING mode — informs the session
  but does not appear in output.
  Governance runs internally and shapes what is said, not how it is formatted.
  Scope-out for THINKING: all governance artifacts in output.
  The thinking itself is the output.
```

### Section 3a — Output format for THINKING mode *(add after existing Section 3)*

```
## 3a. Output Format for THINKING Mode

When session mode is THINKING, output is conversation, not findings.

Start each response with one sentence stating this round's job.
Then write in plain prose paragraphs.
Name what is known, what is uncertain, what would change the picture.
Ask at most one question per response.

The Goal Reminder Block required by Section 3.1 is INTERNAL in THINKING mode.
It informs the session's thinking but does not appear in the response body.
Governance artifacts (STATE schemas, RECON REPORTs, D-FORK tables) are
likewise internal. If they appear in output, that is Mistake 25.
```

### Section 4.6 — Whole-session correction *(append to existing Section 4)*

```
### 4.6 Whole-session correction — the session restarts

A point correction says "this specific thing was wrong."
A whole-session correction says "the entire approach or output format is wrong."

Detection signals for whole-session corrections:
  "completely ignoring user request"
  "disconnected from context"
  "bad start" / "not there yet"
  "session is built to communicate with AI not with human"
  "you still think [X] is enough" — repeated correction of the same failure

When a whole-session correction arrives:
  The prior trajectory ends.
  Declare the restart: "Correction received. Prior trajectory stops here.
  New job: [state the implication of the correction]."
  The next response IS the new session's first response.
  Do not continue prior analysis alongside the correction.

Note: Section 4.4 ("don't restart from scratch") applies to point corrections.
Section 4.6 overrides 4.4 when the correction is whole-session.
```

### Mistakes 24–28 *(append to Section 6 Mistakes Catalog)*

```
### Mistake 24 — One round, one job *(NEW v1.9)*

Trigger: Session inventories knowledge, reads skills, examines code, and
synthesizes conclusions all within a single response.

Fix: Declare one job at the start of every response. State it in the first
sentence. Stop when that job is done. Each phase is its own round.


### Mistake 25 — AI-formatted output in human conversation *(NEW v1.9)*

Trigger: STATE schemas, RECON REPORT tables, D-FORK-N locked-decision walls,
or Q0-Q9 artifacts appear in responses to Luba.

Fix: Governance artifacts are internal. What reaches Luba is sentences.
If you cannot say what you found in sentences, you have not understood it yet.


### Mistake 26 — Finding stated without checking cross-session contradiction *(NEW v1.9)*

Trigger: Session states a finding about the system's state without checking
whether the correction thread contains contradictory evidence from prior sessions.

Example: "Generated code lives in ES as strings" stated without checking that
another session found "generated services are compiled TypeScript in the engine."
Both are true at different pipeline stages — missing one produces a false picture.

Fix: Before synthesizing any finding about the system's state, check whether
prior sessions in the correction thread found contradictory evidence. Name
the contradiction. Name what each session read. Read the bridging evidence
before resolving it.


### Mistake 27 — Confidence from partial evidence *(NEW v1.9)*

Trigger: Any completion or improvement claim — not just those containing
"obviously." The trigger is the claim type, not the word.

Specific triggers (all of these, not only the last):
  "I now have the full picture"
  "V-R1 pushed — 22 to 8 offenses, -63.6%"
  "FLOW-32 already has the machinery"
  "The coupling is one seam"
  Any sentence claiming a system property as settled after examining
  fewer than the required proportion of relevant files.
  The word "obviously" — which is memory, not evidence (SK-531 anti-pattern 3).

Signature: a finding or improvement claim stated as settled when the files
that would contradict it have not been read.

Fix: Every finding must state:
  (1) which specific files were read to reach it
  (2) which files were NOT read that could contradict it
  (3) the one file most likely to overturn it, and whether it was read

A finding that would change if a specific unread file were read is a
provisional claim, not a finding. Label it: "PROVISIONAL — would change if
[specific file] shows [specific condition]."

Self-check before every synthesis claim: does this claim pass SK-530 ARCHITECT
threshold (11 points: ≥5 file:line refs + ≥3 integer counts + ≥3 verbatim
excerpts, at least 1 in each dimension)? A claim that cannot be scored at 11
is an assumption.


### Mistake 28 — Internal metric substituted for observable outcome *(NEW v1.9)*

Trigger: An improvement claim derived from internal metrics (grep counts,
TypeScript error counts, test pass rates) without a corresponding observable
user-facing delta.

Signature:
  "Offenses reduced from 22 to 8" — based on grep patterns against source.
  "TypeScript errors: 0" — based on compiler output.
  "All tests pass" — based on test runner output.
  None of these describe what a user sees.

These measurements are necessary. They are not sufficient for a UI improvement
claim. An internal metric can improve while the rendered output is unchanged
or worse (e.g., grep patterns removed by changing the wrong thing, tests fixed
by relaxing assertions).

Fix: For every UI/UX improvement claim, pair the internal metric with an
observable delta:
  "Offenses reduced from 22 to 8. Visual change: [describe what changed in the
  PNG between before and after for each affected screen state]."

If no PNGs were read: no improvement has been measured. State this explicitly
before STOP: "Internal metrics improved. No PNGs read. Visual improvement
unverified."

The observable delta does not require a PNG to have been visually read by the
session in every case — but it requires the session to state what a reader of
the PNG would observe. If the session cannot state this, it has not measured
an improvement.

This mistake maps to SK-544 (planning--improvement-measurement-protocol) once
that skill is authored (Part 2, Phase 12).
```

### Section 2b — Three-perspective examination *(add after existing Section 2)*

```
## 2b. Three-perspective examination before synthesis

Before synthesizing any structural hypothesis, examine it from three perspectives.
Each perspective is examined in isolation. They are combined only in Section 2c.

**Perspective 1 — Implementation**
What does the code actually do?
Evidence required: file:line citations, grep counts, verbatim excerpts.
Must reach SK-530 ARCHITECT threshold (11 points) before this perspective closes.
Sources: service files, bootstrapper, tests, runtime code.
Prohibited in this perspective: reference to what the system should do.

**Perspective 2 — Product intent**
What is the system supposed to do?
Authoritative sources only: DECISIONS-LOCKED.md, DD-xxx records in
docs/sessions/FLOW-xx/, locked decisions in flow session files.
If no decision record exists for the question: state that explicitly.
Do NOT infer intent from implementation (that is Perspective 1 contaminating
Perspective 2).
Prohibited in this perspective: any observation about what the code does.

**Perspective 3 — Principles**
Does the hypothesis violate any XIIGen principles?
Read M1-M5 and P1-P22 in isolation — without Perspective 1 or 2 context.
Ask each principle in turn: does this hypothesis violate it?
This is the Principles Arbiter from SK-442: it receives ONLY the principles
and the hypothesis, nothing else. "Even one sentence of domain context reduces
its reliability."
Prohibited in this perspective: specific file names, implementation details,
product context.

**The synthesis gate:**
Perspectives 1, 2, and 3 must each be stated separately before synthesis begins.
A session that mixes "here's what the code does" with "here's what it should do"
with "here's whether that violates a principle" in the same paragraph has not
completed this section — it has produced a single voice masquerading as three.
```

### Section 2c — Upper judge protocol + commitment gate *(add after Section 2b)*

```
## 2c. When findings contradict — the upper judge protocol

When Perspective 1, 2, or 3 produces findings that contradict each other, or
when findings from different reading passes contradict findings in STATE.recon:

Do NOT resolve by choosing the finding that fits the current hypothesis.
Do NOT note the contradiction and proceed.

Ask instead: what is the bridging evidence?

Bridging evidence is the specific file or command that would show either:
  (a) how both findings can be true at different points in the pipeline, or
  (b) which one is wrong, with the specific evidence that overturns it.

Format for a named contradiction in synthesis:

  "Finding A says [X] [citation].
   Finding B says [Y] [citation].
   These are not yet reconciled.
   Bridging evidence needed: [specific file path or grep command].
   Status: UNRESOLVED — cannot close this finding until bridging evidence is read."

If the bridging evidence has not been read, Stage 3 synthesis cannot mark this
finding as resolved. The session goes back to Stage 1 for that specific read.
This is the upper judge function (SK-442): its question is not "which output
wins?" but "what expertise is missing from this panel that would resolve the
disagreement?"

A synthesis that marks a contradiction as "RESOLVED" without bridging evidence
has not resolved it. It has suppressed it.

## 2c (continued) — Stage 3 commitment gate (before ⛔ STOP)

Before STOP fires, answer these three questions. All three must be answerable
in writing. If any cannot be answered, Stage 3 is incomplete.

**Q1 — Working hypothesis:**
State the architectural conclusion this session's reconnaissance supports.
Not a finding. Not a catalog. A claim: "The architecture does X. This means
the correct intervention is Y."

**Q2 — Overturning condition:**
Name the specific evidence that would require a different conclusion.
Not "more study would help." A named document, a specific file path, a concrete
observable that could be checked: "If DECISIONS-LOCKED.md contains D-xxx that
contradicts this, the hypothesis is wrong."

**Q3 — External disagreement check:**
Name the one source most likely to contradict this hypothesis.
For XIIGen architectural conclusions, this is one of:
  → DECISIONS-LOCKED.md — locked decisions that constrain the design space
  → DD-xxx records — per-flow design decisions that may conflict
  → The orientation map Q-class for this domain — what does Q-08 through Q-26 say?
State whether you have read that source. If not, read it before STOP.

**Why Q3 is external:** The session that formed the hypothesis is the least
reliable judge of what would overturn it. Q3 forces an external reference. It
is not optional. A session that cannot name a source that would likely disagree
has not examined its own conclusion.
```

### Section 8 — Three-stage gate protocol *(new section, append after Section 7)*

```
## 8. Three-stage gate protocol — the operating discipline

The architect process has three stages. Each stage has a hard gate.
No stage may begin until the prior stage's gate is passed.

---

### Stage 1 — Gather

Job: collect factual evidence. No analysis. No interpretation.

Output: RECON REPORT (SK-529 template). Factual only. Every entry is a
raw observation: file exists at path, contains N lines, pattern appears M times,
this text appears at line K. Nothing about what any observation means.

Gate out of Stage 1 (SK-529 ARCHITECT threshold — ALL must be met):
  □ File reads: ≥ 20
  □ Grep counts: ≥ 8
  □ Verbatim excerpts: ≥ 10
  □ STATE.recon saved
  □ Every claim from the session opening that was marked PENDING_VERIFICATION
    (SK-531) has a corresponding STATE.recon entry — either confirming it,
    contradicting it, or showing it is still unverifiable from available files.
    Claims still unverifiable are marked DEFERRED with the specific file that
    would resolve them named.

A session that proceeds to Stage 2 without passing Stage 1's gate is doing
archaeology, not architecture. "I now have the full picture" before the gate
is passed is Mistake 27.

---

### Stage 2 — Analyze

Job: examine the gathered evidence. No conclusions about what to build.
No recommendations. No design proposals.

Output: findings, each with:
  - What was read (specific STATE.recon citation)
  - What it shows (the finding stated as a claim)
  - What perspective it comes from (Implementation / Product Intent / Principles)
  - What would contradict it (the specific unread file most likely to change it)
  - SK-531 verdict for any claim built on prior assertions:
    VERIFIED / DISCONFIRMED / PARTIAL / DEFERRED

Gate out of Stage 2 (SK-530 ARCHITECT threshold — ALL must be met):
  □ Every finding scores ≥ 11 SK-530 points (5 file:line + 3 counts + 3 verbatim,
    at least 1 in each dimension)
  □ Perspectives 1, 2, and 3 (Section 2b) stated separately for the core hypothesis
  □ All PENDING_VERIFICATION claims from Stage 1 resolved to a verdict
  □ All contradictions between findings named with bridging evidence identified
    or marked UNRESOLVED (Section 2c)

A finding that cannot reach SK-530 threshold is an assumption. Label it:
  "ASSUMPTION — insufficient evidence. Needs: [specific read]."

---

### Stage 3 — Conclude

Job: assemble Stage 2 findings into a synthesis. Not re-derived from files —
synthesized from Stage 2's verified findings.

Every synthesis claim cites a specific STATE.recon entry or Stage 2 finding.
No synthesis claim may be made from memory.
No unresolved contradiction from Stage 2 may be silently dropped —
each must appear in the synthesis as either RESOLVED (with bridging evidence)
or FLAGGED (with the specific read that would resolve it).

Gate out of Stage 3 (pre-⛔ STOP):
  □ Every synthesis claim has a citation (STATE.recon line or named Stage 2 finding)
  □ SK-530 self-check passed on the synthesis output
  □ Section 2c contradictions: each is either RESOLVED with bridging evidence
    or explicitly FLAGGED as open
  □ Commitment gate (Section 2c continued): Q1/Q2/Q3 all answered in writing
  □ For each conclusion: "The one finding that would most change this conclusion
    is [X]. I [have / have not] read it. If not: [specific verification action]."

If Stage 3 gate is not passed: the session goes back to Stage 1 or Stage 2
for the specific gap. It does not ⛔ STOP on an incomplete synthesis.
```

### P-A8 — Commitment under uncertainty *(NEW v1.9 — add to Section 5.1 Positive habits)*

```
#### Commitment under uncertainty [P-A8]

**Signature:** When evidence is incomplete but a decision is required, the
architect states a working hypothesis, names the specific evidence that would
overturn it, and commits to the hypothesis explicitly rather than deferring
to "more investigation needed."

Form:
  Working hypothesis: [specific architectural claim]
  Evidence that would overturn this: [named, findable evidence, not "further study"]
  Confidence: [HIGH / MEDIUM / LOW — not based on how much was read, but on how
               close the overturning evidence would be to changing the design]

This is not premature conclusion. It is the discipline of making the session's
best current judgment explicit so the user can grade it.

**Why this habit exists:** Every gate in this skills library asks "did you gather
enough evidence before concluding?" That is necessary but not sufficient. A session
can meet all reconnaissance thresholds and still enumerate findings without
deciding what they mean. P-A8 is the gap: after gathering, commit to a position.

**When it fires:** Any session that has completed Stage 2 (three-perspective analysis)
and is about to produce findings. Before ⛔ STOP, check: have I stated a working
hypothesis about the architectural question this session was examining? If not, P-A8
has not been applied.

**What P-A8 is not:** a requirement to be right. The hypothesis will be graded by
Luba. It will often be wrong. That is fine. A wrong hypothesis with stated overturning
conditions is more useful than a catalog of findings with no conclusion.

**Detection heuristic:** If the output is all findings and no hypothesis — if it
ends with ⛔ STOP and "you grade" without the architect having committed to a
position first — P-A8 is not active. The findings without hypothesis are N-A12
(enumeration substituting for meaning).
```

**Post-condition check:**
```bash
grep -c "^### Mistake" XIIGEN-DESIGN-ARCHITECT-SESSION-GUIDE-v1.9.md
grep "Section 2b\|Section 2c\|Section 8\|P-A8" XIIGEN-DESIGN-ARCHITECT-SESSION-GUIDE-v1.9.md | wc -l
```
Expected: Mistake count = 28 (23 original + 5 new); section references ≥ 4.

**Expected result:** `XIIGEN-DESIGN-ARCHITECT-SESSION-GUIDE-v1.9.md` — all v1.8 content
unchanged plus all additions above.

---

## PHASE 3 — XIIGEN-SESSION-START-PROMPT-v5.0.md

**Operation type: TRANSFORM**

Base file: the current `XIIGEN-SESSION-START-PROMPT-v4.0.md` (or v4.x — use whatever
version exists; all content is preserved).
Additions: PRE-Q0 directive, governance reference update, SESSION TYPE 7 ARCHITECT.
Output: new file `XIIGEN-SESSION-START-PROMPT-v5.0.md`.

The output contains everything in v4.0 plus the additions. The ARCHITECT session type
added here is richer than the entry in HOW-TO-USE-SKILLS — it includes governance-first
steps, HARD RULES A/B/C, and the THINKING sub-mode. These are the executor-facing
instructions. HOW-TO-USE contains the reference version; this file contains the
operational version that fires at session start.

**Pre-condition check (run BEFORE writing):**
```bash
head -3 XIIGEN-SESSION-START-PROMPT-v4.0.md
grep -c "SESSION TYPE" XIIGEN-SESSION-START-PROMPT-v4.0.md
```
Expected: header shows v4.0; SESSION TYPE count shows how many types currently exist.
If file is missing → locate the most recent versioned start prompt and use that as base.

### Header update

```
# XIIGEN SESSION START PROMPT — v5.0
## Updated: 2026-04-21 | Supersedes: v4.0 (2026-03-26)
## What changed: PRE-Q0 absorption directive; ARCHITECT session type 7;
##               governance reference updated to v4.5.0; communication contract;
##               one-round-one-job; whole-session correction handling
```

### PRE-Q0 ABSORPTION DIRECTIVE *(insert before SESSION TYPE CLASSIFICATION)*

```
## PRE-Q0 — ABSORPTION DIRECTIVE

When this session opens with attachments, pasted content, or a long brief:

Write a paraphrase of what was read before any tool call.
In plain English. In your own words. One paragraph. First.

No governance artifacts, tool calls, or session initialization before this.

Format:
  "You want [what was asked], in a session that [what kind of session this is].
  [One sentence on what this means for what this session will produce.]"

If the first response contains a skill-load table, STATE block, or RECON REPORT
before this paraphrase — the response violates the start contract.
Stop. Produce only the paraphrase. Everything else is internal.
```

### Governance reference update

```
Governance:      HOW-TO-USE-SKILLS.md (v4.5.0)
Architect guide: XIIGEN-DESIGN-ARCHITECT-SESSION-GUIDE-v1.9.md
Skill index:     FLOW-DESIGN-SKILL-INDEX.md (v4.0+, includes Layer 8–10)
```

### SESSION TYPE 7 — ARCHITECT *(add to SESSION TYPE CLASSIFICATION)*

```
ARCHITECT: structural thinking, feasibility, system-level decisions,
           co-architect conversation with Luba (a human, not another AI)

→ STEP 0: Produce the PRE-Q0 paraphrase (see above). One paragraph. Then:
→ STEP 1: Read HOW-TO-USE-SKILLS.md completely.
           This establishes the rules before any skill-loading output can appear.
→ STEP 2: Read XIIGEN-DESIGN-ARCHITECT-SESSION-GUIDE-v1.9.md completely.
           This establishes output format, Mistakes 24–28, and correction handling.
→ STEP 3: Read FLOW-DESIGN-SKILL-INDEX.md (v4.0+) to understand what knowledge
           is available. Also read SKILL-INDEX-v4.0.0.md for skill existence.
→ STEP 4: Identify and read domain-relevant project knowledge skills (Q-MINUS-1).
→ STEP 5: Complete Q0 (or declare Q0 deferred) before any substantive output.

Why governance first (Steps 1–2 before Steps 3–4):
Steps 1 and 2 load the rules about what session output must look like.
Without them, skill-loading in Steps 3–4 may produce visible initialization
output before the model knows not to. Governance before domain — always.

Each round has one declared job — state it in the first sentence.
Skills before codebase files. Always.
THINKING is a valid sub-mode within ARCHITECT.

HARD RULE A — Governance scope:
  STATE schemas, RECON REPORT, Q0-Q9 artifacts, D-FORK tables: INTERNAL ONLY.
  They guide thinking. They do not appear in output to Luba.
  Output to Luba is prose conversation.
  In THINKING mode specifically: the Goal Reminder Block is also internal —
  it informs the session but does not appear in the response body.

HARD RULE B — Correction response:
  When Luba gives a correction, the correction becomes the entire job of the
  next response. The prior trajectory stops.
  Whole-session correction signals: "completely ignoring," "bad start,"
  "disconnected from context," "not there yet," "session built for AI not human."

HARD RULE C — Format instruction override (ARCHITECT and THINKING only):
  In ARCHITECT and THINKING sessions, user instructions about output format
  ("thinking session," "no phase maps," "no coding, no final plan") are H0
  overrides of governance output format. They redefine what this session
  produces. Governance output format does not apply.
  Scope boundary: for GENERATION, PLANNING, and other session types, format
  instructions narrow communication style but do not override the structural
  file format required for that session type's consumer (e.g. Claude Code
  requires structured session files regardless of style preference).

→ See XIIGEN-DESIGN-ARCHITECT-SESSION-GUIDE-v1.9.md for Q-MINUS-1,
  Q0 deferral, THINKING mode output, Section 4.6, Mistakes 24–28.
```

**Post-condition check:**
```bash
grep "PRE-Q0\|ARCHITECT\|HARD RULE A" XIIGEN-SESSION-START-PROMPT-v5.0.md | wc -l
head -3 XIIGEN-SESSION-START-PROMPT-v5.0.md
```
Expected: ≥ 3 hits; header shows v5.0.

**Expected result:** `XIIGEN-SESSION-START-PROMPT-v5.0.md` — complete file. Step sequence
is governance-first: HOW-TO-USE and architect guide load before any skill-reading output
can occur.

---

## PHASE 4 — XIIGEN-SESSION-SETUP-LIBRARY.md

**Operation type: EDIT**

All existing content preserved. SESSION TYPE 7 preamble appended at end.

**Pre-condition check (run BEFORE editing):**
```bash
head -4 XIIGEN-SESSION-SETUP-LIBRARY.md
grep -c "SESSION TYPE" XIIGEN-SESSION-SETUP-LIBRARY.md
grep "SESSION TYPE 7" XIIGEN-SESSION-SETUP-LIBRARY.md | wc -l
```
Expected: header shows v2.0.0 (or close); SESSION TYPE count = 6; SESSION TYPE 7 count = 0.
If SESSION TYPE 7 already present → this phase is a no-op. Document as skipped.
If version differs from v2.0.0 → verify SESSION TYPES 1–6 exist before appending.

```
---

## SESSION TYPE 7: ARCHITECT SESSION (structural thinking, co-architect conversation)

DECLARED JOB FOR THIS ROUND:
  [State in one sentence before anything else]
  Current stage: [ ] STAGE 1 — Gather  [ ] STAGE 2 — Analyze  [ ] STAGE 3 — Conclude

CORRECTION THREAD:
  C1: "[verbatim]" — Status: ADDRESSED / OPEN / SESSION-RESTART
  C2: "[verbatim]" — Status: ADDRESSED / OPEN / SESSION-RESTART
  [SESSION-RESTART: declare restart before any other content]

GOAL (verbatim — never paraphrase):
  "[Paste exact words from Luba's request]"

SESSION MODE: [ ] THINKING (prose conversation) / [ ] PLANNING (findings format)

Q0 STATUS:
  [ ] Pipeline position known → answer Q0a–Q0d
  [ ] No pipeline position → Q0 DEFERRED (do not halt at CONTEXT_INSUFFICIENT)

KNOWLEDGE LOAD (governance before domain — complete before Stage 1):
  Round 1: Governance (establishes rules before any output appears)
    [ ] HOW-TO-USE-SKILLS.md read completely
    [ ] XIIGEN-DESIGN-ARCHITECT-SESSION-GUIDE-v1.9.md read completely
        (incl. Mistakes 24–28, Sections 2b/2c/8, P-A8)
  Round 2: Index and domain skills
    [ ] FLOW-DESIGN-SKILL-INDEX.md (v4.0+) read — load orders and invocation guidance
    [ ] SKILL-INDEX-v4.0.0.md read — skill existence authority (117 skills)
    [ ] data-connection-classification read (if domain involves flows or data)
    [ ] planning--system-intake-SKILL.md (SK-454) read
    [ ] [other domain skills identified from index]

--- STAGE 1: GATHER (no analysis or interpretation permitted) ---

RECON REPORT STATUS: [ ] Not started  [ ] In progress  [ ] Complete
File reads: [N] / 20 required
Grep counts: [N] / 8 required
Verbatim excerpts: [N] / 10 required
STATE.recon saved: [ ] YES  [ ] NO

PENDING_VERIFICATION CLAIMS (from session opening — each needs a STATE.recon entry):
  Claim 1: "[verbatim]" — Status: CONFIRMED / DISCONFIRMED / PARTIAL / DEFERRED
  Claim 2: "[verbatim]" — Status: CONFIRMED / DISCONFIRMED / PARTIAL / DEFERRED

STAGE 1 GATE: [ ] All thresholds met  [ ] STATE.recon saved  [ ] All claims resolved or DEFERRED
→ DO NOT proceed to Stage 2 until gate passes

--- STAGE 2: ANALYZE (no conclusions or design proposals permitted) ---

READING ORDER (check before examining any file):
  [ ] (a) Intent first: DECISIONS-LOCKED.md, DD-xxx records (not V2 master plan)
  [ ] (b) Structure: fabric interfaces, patterns, skill classifications
  [ ] (c) Implementation: specific files chosen by questions from (a) and (b)
  [ ] (d) Gaps: carry-forward issues, incomplete phases

THREE PERSPECTIVES (each stated separately — no mixing):
  [ ] Perspective 1 (Implementation): what code actually does — file:line evidence
  [ ] Perspective 2 (Product Intent): what system is supposed to do — DECISIONS-LOCKED only
  [ ] Perspective 3 (Principles): does hypothesis violate M1-M5 / P1-P22 / DNA-1..9?
      Examined WITHOUT domain context or file names.

CONTRADICTIONS FOUND:
  Finding A vs Finding B: "[what A says]" vs "[what B says]"
  Bridging evidence needed: [specific file or grep]
  Status: UNRESOLVED / RESOLVED — "[bridging evidence citation]"

SK-530 SCORE PER FINDING:
  Finding 1: [N] file:line + [N] counts + [N] verbatim = [total] / 11 required

STAGE 2 GATE: [ ] All findings ≥ 11 SK-530 points  [ ] All 3 perspectives stated
              [ ] All PENDING claims resolved  [ ] All contradictions named
→ DO NOT proceed to Stage 3 until gate passes

--- STAGE 3: CONCLUDE (synthesis only — must cite Stage 2 findings) ---

Every synthesis claim must cite a STATE.recon line or named Stage 2 finding.
Claims without citations are assumptions — label them: "ASSUMPTION — needs [specific read]."

UNRESOLVED CONTRADICTIONS CARRIED FORWARD:
  [list each from Stage 2 that was not resolved — each is FLAGGED in synthesis]

COMMITMENT GATE (P-A8 — required before STOP):
  Working hypothesis: [specific architectural claim about the domain examined]
  Evidence that would overturn this: [named file or command, not "further study"]
  Confidence: [HIGH / MEDIUM / LOW]

THE OVERTURNING CHECK (for each conclusion):
  Q1 — Working hypothesis: [stated above]
  Q2 — Overturning condition: [named file or observable]
  Q3 — External disagreement: [source that would likely object + whether it was read]

STAGE 3 GATE: [ ] Every synthesis claim cited  [ ] SK-530 self-check passed
              [ ] All contradictions: RESOLVED (with evidence) or FLAGGED (with action)
              [ ] Commitment gate answered (P-A8)
              [ ] Q3 external disagreement check done
              [ ] No governance artifacts in response body to Luba

BEFORE STOPPING:
  [ ] Correction thread: no OPEN corrections unaddressed
  [ ] Output is prose sentences (THINKING mode) or findings with citations (PLANNING mode)
  [ ] "I now have the full picture" or equivalent — NOT PERMITTED unless Stage 3 gate passes
```

**Post-condition check:**
```bash
grep "SESSION TYPE 7" XIIGEN-SESSION-SETUP-LIBRARY.md
grep "STAGE 1\|STAGE 2\|STAGE 3\|COMMITMENT GATE" XIIGEN-SESSION-SETUP-LIBRARY.md | wc -l
```
Expected: SESSION TYPE 7 present; stage headers ≥ 3; commitment gate present.

**Expected result:** `XIIGEN-SESSION-SETUP-LIBRARY.md` with SESSION TYPE 7 appended.

---

## PHASE 5 — XIIGEN-RESPONSE-CONSTRUCTION-PROTOCOL-v1.md

**Operation type: EDIT**

All existing content preserved. Two passages appended to specific existing steps.

**Pre-condition check (run BEFORE editing):**
```bash
head -4 XIIGEN-RESPONSE-CONSTRUCTION-PROTOCOL-v1.md
grep -c "^## Step" XIIGEN-RESPONSE-CONSTRUCTION-PROTOCOL-v1.md
grep "project knowledge skills\|SESSION-RESTART" XIIGEN-RESPONSE-CONSTRUCTION-PROTOCOL-v1.md | wc -l
```
Expected: header shows Version 1.0; Step count = 7; additions count = 0.
If additions already present → this phase is a no-op. Document as skipped.

### Step 2 addition *(append to "Inputs to absorb" block)*

```
Project knowledge skills loaded in the Claude.ai project are inputs that must
be absorbed before codebase files are read.

A session that reads codebase files before reading relevant project knowledge
skills has not completed Step 2 absorption. Skills are inputs. The codebase
is the verification layer.
```

### Step 3 addition *(append to Prior-correction thread step)*

```
When a correction arrives that names a whole-session failure (see
ARCHITECT-SESSION-GUIDE v1.9 §4.6 for detection signals), declare it as the
session's new declared job — not as one item in the thread:

  "[verbatim correction] — Status: SESSION-RESTART. Prior trajectory stops."

The response's content is the restart. Not analysis that incorporates the correction.
```

**Post-condition check:**
```bash
grep "project knowledge skills\|SESSION-RESTART" XIIGEN-RESPONSE-CONSTRUCTION-PROTOCOL-v1.md | wc -l
```
Expected: ≥ 2 hits.

**Expected result:** Protocol file with both additions in place.

---

## PHASE 6 — planning--reconnaissance-gate-SKILL.md (SK-529 v2.0.0 → v2.1.0)

**Operation type: EDIT**

All existing content preserved. T0-0 entry and narrative inserted before T0-1.

**Pre-condition check (run BEFORE editing):**
```bash
head -4 planning--reconnaissance-gate-SKILL.md
grep "T0-0\|T0-1" planning--reconnaissance-gate-SKILL.md | head -5
```
Expected: header shows version 2.0.0 and sk_number SK-529; T0-0 absent; T0-1 present.
If T0-0 already present → this phase is a no-op. Document as skipped.
If version is not 2.0.0 → STOP. Wrong base file. Locate the correct SK-529 file.

### T0-0 entry *(insert before T0-1 in the Tier-0 table)*

```
| T0-0 | Project knowledge skills for this domain | Read completely | 1 file read per skill | Examining the codebase without the framework that defines how to examine it |
```

### T0-0 narrative *(add after table, before T0-1 discussion)*

```
**T0-0 — Project Knowledge Skills (runs before T0-1)**

Before reading any codebase file, identify and read the project knowledge skills
that govern this session's domain.

Steps:
  1. Read FLOW-DESIGN-SKILL-INDEX (v4.0+, includes Layer 8–10 skills).
  2. Identify which skills apply to this domain.
  3. Read those skills completely.

Domain mapping table (fallback if index unavailable):

For module portability, marketplace distribution, platform decoupling:
  → data-connection-classification (SUPREME priority)
  → planning--system-intake-SKILL.md (SK-454)
  → self--capability-state-reader-SKILL.md (SK-505)
  → self--gap-to-proposal-SKILL.md (SK-506)

For any architectural exploration with no named flow:
  → planning--system-intake-SKILL.md (SK-454) — always
  → data-connection-classification — always if domain touches data

Counting: each project knowledge skill read counts as 1 file read toward
the ARCHITECT threshold of 20.

T0-0 is a prerequisite for T0-1 through T0-8. It is not optional.
```

**Skills consistency check:** The skills listed in T0-0 must match LOAD ORDER 0-PRE
in Phase 7. Any change to one requires the same change to both.

**Post-condition check:**
```bash
grep "T0-0\|T0-1" planning--reconnaissance-gate-SKILL.md | head -5
```
Expected: T0-0 appears before T0-1.

**Expected result:** SK-529 v2.1.0 — Tier-0 begins with T0-0.

---

## PHASE 7 — XIIGEN-SESSION-LOAD-PLAN-v32.md

**Operation type: TRANSFORM**

Base file: `XIIGEN-SESSION-LOAD-PLAN-v31.md` — all content unchanged.
Additions: LOAD ORDER 0-PRE block, ARCHITECT communication contract, CFI status updates.
Output: new file `XIIGEN-SESSION-LOAD-PLAN-v32.md`.

The output is a new version file. v31 is not modified. v32 contains all v31 content
plus the additions below, with the version header updated.

**Pre-condition check (run BEFORE writing):**
```bash
head -3 XIIGEN-SESSION-LOAD-PLAN-v31.md
grep "LOAD ORDER 0-PRE\|ARCHITECT SESSION COMMUNICATION CONTRACT" XIIGEN-SESSION-LOAD-PLAN-v31.md | wc -l
```
Expected: header shows v31; additions count = 0.
If additions already present → check whether they match what is specified below. If they
match, v32 may already exist. If they differ, produce v32 with the correct content.

**Skills consistency:** LOAD ORDER 0-PRE below lists the same domain skills as T0-0
in Phase 6. If you change one, change both.

### LOAD ORDER 0-PRE *(add before existing LOAD ORDER 0)*

```
## LOAD ORDER 0-PRE — Project Knowledge Inventory (before SK-529)

Applies to: all ARCHITECT sessions; any session where project knowledge
skills are relevant to the session domain.

Before running Tier-0 or any codebase reconnaissance:
  1. Read FLOW-DESIGN-SKILL-INDEX (v4.0+) to understand what knowledge exists.
  2. Identify which skills apply to this session type and domain.
  3. Read those skills completely.

For ARCHITECT sessions on any domain:
  MANDATORY: planning--system-intake-SKILL.md (SK-454)
  MANDATORY: XIIGEN-DESIGN-ARCHITECT-SESSION-GUIDE-v1.9.md
  MANDATORY: data-connection-classification if domain involves flows or data

Domain-specific additions:
  Module portability / marketplace / platform decoupling:
    + self--capability-state-reader-SKILL.md (SK-505)
    + self--gap-to-proposal-SKILL.md (SK-506)

Project knowledge reads count toward the ARCHITECT reconnaissance threshold.
LOAD ORDER 0-PRE executes before LOAD ORDER 0. Not optional.
```

### ARCHITECT communication contract *(add after LOAD ORDER 0-PRE)*

```
## ARCHITECT SESSION COMMUNICATION CONTRACT

When session type is ARCHITECT:
  Output to Luba is prose conversation. Always.
  STATE schemas, RECON REPORTs, Q0-Q9 artifacts, locked-decision tables: INTERNAL.
  The opening response is not a session initialization summary.
  In THINKING mode: the Goal Reminder Block is also internal.
```

### CFI status updates

```
CFI-11 — CLOSED 2026-04-21
  HOW-TO-USE-SKILLS.md updated to v4.5.0 (Phase 1).
  FLOW-DESIGN-SKILL-INDEX updated to v4.0+ with Layer 8-10 (Phase 1).
  ARCHITECT session infrastructure created across Phases 2-7.
  See SESSION-STATE-SNAPSHOT-ARCHITECT-INFRASTRUCTURE.md.

CFI-13 — OPEN (NEW)
  Claude.ai project custom instruction must be manually updated to v5.0.
  File: XIIGEN-SESSION-START-PROMPT-v5.0.md
  Human action: copy file content into Claude.ai project settings.
  Prerequisite: verify all Phase 1–8 output files are in project knowledge
  before activating Phase 10 — the start prompt references files that must exist.
  Blocking: YES — all ARCHITECT sessions until done.

CFI-14 — CLOSED 2026-04-21 (resolved in Phase 1)
  FLOW-DESIGN-SKILL-INDEX updated to include Layer 8-10 skills.
```

**Post-condition check:**
```bash
head -3 XIIGEN-SESSION-LOAD-PLAN-v32.md
grep "LOAD ORDER 0-PRE\|ARCHITECT SESSION COMMUNICATION CONTRACT\|CFI-13" XIIGEN-SESSION-LOAD-PLAN-v32.md | wc -l
```
Expected: header shows v32; ≥ 3 hits.

**Expected result:** `XIIGEN-SESSION-LOAD-PLAN-v32.md` with LOAD ORDER 0-PRE,
communication contract, and updated CFIs.

---

## PHASE 8 — HOW-TO-USE-SKILLS.md

**Operation type: TRANSFORM**

Base file: `HOW-TO-USE-SKILLS-v4.5.0.md`
Output: `HOW-TO-USE-SKILLS.md` at version **v4.6.0**

**Correction note (v9 gap):** This phase was originally specified as REPLACE (copy v4.5.0
unchanged). That is wrong. Root cause: the Document Registry pattern.

The v31 cross-references and every version history entry confirm the pattern explicitly:
  v28: SK-529 bumped to v2.0.0 + ARCHITECT-GUIDE bumped to v1.5 → HOW-TO bumped to v4.3.0
  v30: ARCHITECT-GUIDE bumped to v1.7 → HOW-TO bumped to v4.4.0
  v31: ARCHITECT-GUIDE bumped to v1.8 → HOW-TO bumped to v4.5.0

HOW-TO-USE is the registry consumer. Its version header IS the changelog of the
governance stack. Every time a Document Registry entry changes version, HOW-TO-USE
bumps to a new minor version recording that change.

This plan produces:
  - DESIGN-ARCHITECT-SESSION-GUIDE v1.9 (Phase 2)
  - planning--reconnaissance-gate-SKILL.md v2.1.0 (Phase 6)

Both are Document Registry entries. Therefore HOW-TO-USE must bump to v4.6.0.

v4.5.0 still contains 21 occurrences of `SK-529 v2.0.0` and references to
DESIGN-ARCHITECT-SESSION-GUIDE v1.8. Copying it unchanged leaves every session
loading the wrong versions of both — defeating Phases 2 and 6.

**Executes last among file-producing phases — after Phases 1–7.**

Why last: HOW-TO-USE is the aggregator. It references all other governance documents.
Every version bump in project history happened after the documents it references were
updated. Execute Phases 1–7 first so the referenced versions exist before this phase runs.

**Source file:** `HOW-TO-USE-SKILLS-v4.5.0.md` — from the uploaded zip or standalone
uploaded file `HOW-TO-USE-SKILLS-v4_5_0.md`. Both are identical content.

**Pre-condition check (run BEFORE transforming):**
```bash
head -3 HOW-TO-USE-SKILLS.md
grep -c "SK-529 v2\.0\.0" HOW-TO-USE-SKILLS-v4.5.0.md
grep -c "DESIGN-ARCHITECT.*v1\.8" HOW-TO-USE-SKILLS-v4.5.0.md
```
Expected: project file shows version older than v4.6.0; SK-529 v2.0.0 count = 21;
architect guide v1.8 count = 2 (operational references, not changelog history lines).
If project file already shows v4.6.0 → this phase is a no-op. Document as skipped.

**Verify source:**
```bash
head -3 HOW-TO-USE-SKILLS-v4.5.0.md
grep -n "PRE-Q0" HOW-TO-USE-SKILLS-v4.5.0.md | head -1
wc -l HOW-TO-USE-SKILLS-v4.5.0.md
```
Expected: header shows v4.5.0; PRE-Q0 at line ~99; ~832 lines.

**Additions to apply to v4.5.0 base:**

### Header update
```
# HOW TO USE XIIGEN SKILLS — v4.6.0
## Updated: 2026-04-21 | For: Claude.ai Project custom instructions
## Status: Current — supersedes v4.5.0

## What changed in v4.6.0:
##   All SK-529 v2.0.0 references updated to v2.1.0
##     v2.1.0 adds T0-0 (project knowledge skills — prerequisite before T0-1..T0-8)
##   DESIGN-ARCHITECT-SESSION-GUIDE references bumped to v1.9
##     v1.9 adds Q-MINUS-1, Q0 DEFERRED branch, THINKING sub-mode,
##     Sections 2b/2c/8, P-A8, Mistakes 24–28, three-stage gate protocol
##   Changelog entries only — no structural changes to load orders or FC gates
```

### Reference updates (apply globally — sed replacement, not targeted edits)

```bash
# Update all SK-529 version references
sed -i 's/SK-529 v2\.0\.0/SK-529 v2.1.0/g' HOW-TO-USE-SKILLS.md

# Update layer summary line for SK-529
sed -i 's/SK-529 now at v2\.0\.0 — Tier-0 XIIGen search list added/SK-529 now at v2.1.0 — Tier-0 XIIGen search list + T0-0 project knowledge skills/' \
  HOW-TO-USE-SKILLS.md

# Update operational ARCHITECT-GUIDE references (NOT changelog history lines)
# Line: "run Q9 from DESIGN-ARCHITECT-SESSION-GUIDE v1.8 (4-step per-flow read)"
sed -i 's/DESIGN-ARCHITECT-SESSION-GUIDE v1\.8 (4-step per-flow read)/DESIGN-ARCHITECT-SESSION-GUIDE v1.9 (4-step per-flow read; also Q-MINUS-1 + Mistakes 24–28)/g' \
  HOW-TO-USE-SKILLS.md

# Line in worked example: "SESSION-GUIDE v1.8 fires"
sed -i 's/SESSION-GUIDE v1\.8 fires/SESSION-GUIDE v1.9 fires/g' HOW-TO-USE-SKILLS.md
```

What is NOT changed:
  - `## CODE-REVIEW-PROTOCOL reference bumped to v1.8` — changelog history, different doc
  - `## DESIGN-ARCHITECT-SESSION-GUIDE reference bumped to v1.8` — changelog history, leave
  - `Gate 0j in CODE-REVIEW-PROTOCOL v1.8` — CODE-REVIEW is still at v1.8, leave
  - `Re-review under v1.8 may surface...` — historical worked example context, leave

**Post-condition check:**
```bash
head -4 HOW-TO-USE-SKILLS.md
grep -c "SK-529 v2\.0\.0" HOW-TO-USE-SKILLS.md   # expected: 1 (changelog entry only)
grep -c "SK-529 v2\.1\.0" HOW-TO-USE-SKILLS.md   # expected: 21
grep -n "DESIGN-ARCHITECT.*v1\." HOW-TO-USE-SKILLS.md | grep -v "^[0-9]*:##.*bumped"
wc -l HOW-TO-USE-SKILLS.md   # expected: ~840
```
Expected: v4.6.0 header; 1 remaining v2.0.0 (the changelog note itself);
21 v2.1.0 hits; all operational ARCHITECT-GUIDE references at v1.9; ~840 lines.

**Gaps closed:** Document Registry version gap (v4.5.0 referenced stale v1.8 and v2.0.0
after Phases 2 and 6 produced v1.9 and v2.1.0). Every session would have loaded wrong
document versions without this correction.

---

## PHASE 9 — SESSION-STATE-SNAPSHOT-ARCHITECT-INFRASTRUCTURE.md

**Operation type: CREATE**

New file. No base. No prior version. Contents specified in full below.

**Pre-condition check:**
```bash
ls SESSION-STATE-SNAPSHOT-ARCHITECT-INFRASTRUCTURE.md 2>/dev/null | wc -l
```
Expected: 0 (file does not exist).
If file exists → read it. If it already matches the content below, this phase is a no-op.

```markdown
# SESSION STATE SNAPSHOT — ARCHITECT INFRASTRUCTURE MAINTENANCE
## Date: 2026-04-21 | Session type: MAINTENANCE

---

## WHAT WAS FIXED

| Phase | Operation | Document | Change |
|-------|-----------|----------|--------|
| 1 | EDIT | FLOW-DESIGN-SKILL-INDEX.md | Layer 8-10 (SK-529..SK-542) appended |
| 2 | TRANSFORM | XIIGEN-DESIGN-ARCHITECT-SESSION-GUIDE-v1.9.md | New: Sections 1a/1b, Q-MINUS-1, Q0 deferral, THINKING mode, Section 3a, Section 4.6, Mistakes 24-28, Sections 2b/2c/8, P-A8 |
| 3 | TRANSFORM | XIIGEN-SESSION-START-PROMPT-v5.0.md | New: PRE-Q0, ARCHITECT type 7 with governance-first steps, three HARD RULES |
| 4 | EDIT | XIIGEN-SESSION-SETUP-LIBRARY.md | SESSION TYPE 7 appended with three-stage gate preamble and P-A8 commitment gate |
| 5 | EDIT | XIIGEN-RESPONSE-CONSTRUCTION-PROTOCOL-v1.md | Step 2 + Step 3 additions |
| 6 | EDIT | planning--reconnaissance-gate-SKILL.md | T0-0 added before T0-1 in Tier-0 |
| 7 | TRANSFORM | XIIGEN-SESSION-LOAD-PLAN-v32.md | LOAD ORDER 0-PRE + communication contract + CFI updates |
| 8 | REPLACE | HOW-TO-USE-SKILLS.md | Replaced v3.2.0 with v4.5.0 content (executed last — aggregator) |

---

## FILES THAT MUST BE IN PROJECT KNOWLEDGE BEFORE PHASE 10 (human action)

The start prompt (Phase 4 output) references these files. They must exist in
project knowledge before the custom instruction is activated, or sessions will
reference files that don't exist and fail silently.

Required in project knowledge:
  ✓ HOW-TO-USE-SKILLS.md (Phase 8 — now v4.6.0, TRANSFORM not REPLACE)
  ✓ FLOW-DESIGN-SKILL-INDEX.md (Phase 1 — now v4.0+)
  ✓ data-connection-classification-SKILL.md (already present)
  ✓ planning--system-intake-SKILL.md (SK-454) (already present)
  ⚠ XIIGEN-DESIGN-ARCHITECT-SESSION-GUIDE-v1.9.md (Phase 2 — must be added)
  ⚠ planning--reconnaissance-gate-SKILL.md v2.1.0 (Phase 6 — must be added/updated)

Before executing Phase 10: confirm v1.9 guide and SK-529 v2.1.0 are in project
knowledge. If not, add them before updating the project settings.

---

## WHAT STILL REQUIRES HUMAN ACTION (Phase 10)

Copy `XIIGEN-SESSION-START-PROMPT-v5.0.md` content into:
Claude.ai project → Settings → Project instructions

Verification: Open a new session. Type anything. The first response must be a
plain-English paraphrase. No governance wall. No skill-load table. No STATE block.
If you see a governance wall → Phase 10 was not done correctly.

CFI-13 tracks this until done.

---

## OPEN ISSUES REMAINING

CFI-12 (unchanged): FLOW-04, FLOW-09, FLOW-34 F1 spec gaps — no UI design work
until Luba resolves.

---

## ENTRY POINT FOR THE FIRST ARCHITECT SESSION

Goal that remains unresolved:
"Decouple XIIGen module lifecycle from Claude Code execution; extend the module
copy phase to fork+adapt+export+test modules in isolation."

When the next ARCHITECT session opens:
  Round 1: Read FLOW-DESIGN-SKILL-INDEX, data-connection-classification,
           system-intake (SK-454). Report what each says in plain sentences.
  Round 2: Plan the examination approach from what Round 1 found.
  Round 3+: Execute one examination phase per round.

Do NOT begin with codebase reconnaissance.
Q0 is deferred — no named flow, no pipeline position.

Key findings from the corpus — UNRECONCILED, READ BEFORE ANCHORING:

These findings were reported across 20+ parallel sessions. Each must be
verified against the codebase before being used as a design premise.

  - DD-324: tenants get knowledge of a flow, not its code
    Source: design decision record in FLOW-32 session files
    Status: not contradicted in corpus — treat as reliable

  - The coupling is one seam: Flow0ARunner.run() returns instruction record
    Source: sessions reading the Flow0ARunner.run() call site
    Contradicted by: sessions describing distributed coupling across the engine
    Status: UNRECONCILED — read Flow0ARunner.run() and its callers before anchoring

  - FLOW_SCOPED: 1073 occurrences, but generated service code doesn't carry it
    Source: grep across the codebase in one session
    Status: count plausible but implication not independently confirmed —
    verify by examining one generated service file directly

  - FLOW-47: partially implements module lifecycle; consumer side built, not fork-adapt
    Source: sessions reading FLOW-47 session files
    Status: consistent across sessions — treat as reliable starting point

  - The gap is the adaptation loop: no path from consumer to publisher
    Source: inference from the above findings
    Status: depends on unreconciled findings above — verify before treating as settled

The first ARCHITECT session's Round 1 job includes resolving the two UNRECONCILED
findings above before any synthesis.
```

**Post-condition check:**
```bash
grep "WHAT WAS FIXED\|Phase 10\|ENTRY POINT" SESSION-STATE-SNAPSHOT-ARCHITECT-INFRASTRUCTURE.md | wc -l
```
Expected: ≥ 3 hits.

**Expected result:** `SESSION-STATE-SNAPSHOT-ARCHITECT-INFRASTRUCTURE.md` ready for
project knowledge.

---

## PHASE 10 — Claude.ai project settings (human action)

**Operation type: HUMAN ACTION — no file produced by Claude**

**Prerequisite:** Confirm Phase 9's "Files that must be in project knowledge" list is
satisfied. The guide v1.9 and SK-529 v2.1.0 must be in project knowledge before this
step — the start prompt references them and will fail silently if they are absent.

**Action:** Copy content of `XIIGEN-SESSION-START-PROMPT-v5.0.md` into:
Claude.ai project → Settings → Project instructions

**Verify:** Open a new session. Type anything. First response must be a plain-English
paraphrase — no governance wall, no skill-load table, no STATE block.
If you see a governance wall → Phase 10 was not done correctly.

**Tracking:** CFI-13 in XIIGEN-SESSION-LOAD-PLAN-v32.md until done.

---

## CROSS-CONSISTENCY CHECK (run after all phases complete, before Phase 10)

These three lists must match. If any drifted during execution, update all three.

**T0-0 domain skills (Phase 6):**
- data-connection-classification
- planning--system-intake-SKILL.md (SK-454)
- self--capability-state-reader-SKILL.md (SK-505)
- self--gap-to-proposal-SKILL.md (SK-506)

**LOAD ORDER 0-PRE domain skills (Phase 7):**
- planning--system-intake-SKILL.md (SK-454)
- data-connection-classification
- self--capability-state-reader-SKILL.md (SK-505)
- self--gap-to-proposal-SKILL.md (SK-506)

**SESSION TYPE 7 knowledge load (Phase 4):**
- FLOW-DESIGN-SKILL-INDEX
- data-connection-classification
- planning--system-intake-SKILL.md (SK-454)
- [domain skills from index]

---

## SUMMARY TABLE — PART 1 (Session Infrastructure)

Execution order follows the critical path. Phase numbers are preserved for
reference but execution order is 1→2→3→4→5→6→7→8→9→10.

| Exec order | Phase | Operation | Document | Notes |
|-----------|-------|-----------|----------|-------|
| 1 | 2 | EDIT | FLOW-DESIGN-SKILL-INDEX.md → v4.0+ | Append Layer 8–10 |
| 2 | 2 | TRANSFORM | XIIGEN-DESIGN-ARCHITECT-SESSION-GUIDE-v1.9.md | v1.8 base + additions |
| 3 | 3 | TRANSFORM | XIIGEN-SESSION-START-PROMPT-v5.0.md | v4.0 base + PRE-Q0 + ARCHITECT type |
| 4–7 | 5–8 | EDIT/TRANSFORM | Session setup library, protocol, SK-529, load plan | Any order |
| 8 | 1 | REPLACE | HOW-TO-USE-SKILLS.md → v4.5.0 | LAST — aggregator references all above |
| 9 | 9 | CREATE | SESSION-STATE-SNAPSHOT-ARCHITECT-INFRASTRUCTURE.md | New file |
| 10 | 10 | HUMAN ACTION | Claude.ai project settings | Copy Phase 4 output |

---

## PART 2 — UI/UX FLEET DISCIPLINE SKILLS (new skills to write)

These five skills do not exist. They were identified from the session transcript where
a session improved 22 grep offenses to 8 across 5 flows, claimed -63.6% improvement,
and had no governance mechanism to prevent that claim from standing.

All five are independent of Part 1. Each requires its own MAINTENANCE session.
Operation type for each: CREATE (new skill file).

**SK assignments:** SK-543 through SK-547. Next available after these: SK-548.

---


## PART 2 — UI/UX FLEET DISCIPLINE SKILLS (new skills to write)

These five skills do not exist. They were identified from the session transcript where
a session improved 22 grep offenses to 8 across 5 flows, claimed -63.6% improvement,
and had no governance mechanism to prevent that claim from standing.

All five are independent of Part 1. Each requires its own MAINTENANCE session.
Operation type for each: CREATE (new skill file).

**SK assignments:** SK-543 through SK-547. Next available after these: SK-548.

---

### PHASE 11 — planning--work-scope-inventory-SKILL.md (SK-543)

**Operation type: CREATE**

**Gap it closes:** Sessions begin improving individual items without first establishing
the complete universe of items that need work. "63% reduction in offenses" is meaningless
without a denominator. CFI-07 blocked FLOW-32 entirely; the session was improving it
anyway.

**Pre-condition check:**
```bash
grep -rn "denominator\|STATE\.scope\|scope inventory" .claude/skills/ | grep -v "SKILL-INDEX"
```
Expected: empty. If non-empty, the concept may already partially exist. Read the hit
files before authoring to avoid duplication.

**What this skill must contain:**

Trigger: before any UI/UX session touches an individual flow, before any fleet-level
improvement claim.

Protocol — before work begins, establish:
1. Total item count: how many flows are in scope (48 per business-flows-registry)
2. Done count: how many have examination records
   (`docs/screen-examination/{slug}-examination.md` exists and contains a grade)
3. Partial count: examination record exists, no APPROVED status
4. Blocked count: flows blocked by open CFIs
5. Not-started count: total minus done minus partial minus blocked
6. The denominator: state explicitly what fraction of the fleet this session covers

Output: a STATE.scope block that captures all six numbers before the first file is touched.

Rule: a session that cannot produce STATE.scope is not permitted to claim improvement
at the fleet level. It can claim improvement at the individual flow level only for
flows it has fully audited.

---

### PHASE 12 — planning--improvement-measurement-protocol-SKILL.md (SK-544)

**Operation type: CREATE**

**Gap it closes:** Sessions measure improvement using grep pattern counts against
TypeScript source. This measures what the code says, not what users see.

**What this skill must contain:**

Trigger: any session claiming a UI/UX improvement. Any ⛔ STOP that includes an
improvement metric.

Rule: for UI/UX work, the unit of measurement is an observable user-facing delta,
not an internal metric.

Two-layer measurement protocol:
- Layer 1 (necessary but not sufficient): internal metrics — grep pattern counts,
  TypeScript errors, test pass rates, FC-18 check counts. These confirm structural
  correctness.
- Layer 2 (required for improvement claim): observable delta — for each changed
  component, one sentence describing what changed visually in a captured PNG between
  before and after. No sentence = no improvement claim for that component.

Improvement claim validity:
- "This flow's UI improved" requires: Layer 1 pass + at least one Layer 2 sentence
  describing a visible change per changed screen state (empty/loading/populated/error/success)
- "UI/UX fleet is improving" requires: SK-543 denominator established + Layer 2 sentences
  for every flow in the claimed scope

Gate: before any ⛔ STOP that includes an improvement percentage, verify that the
percentage derives from Layer 2 observations, not Layer 1 counts alone.

---

### PHASE 13 — planning--ui-fleet-completion-criteria-SKILL.md (SK-545)

**Operation type: CREATE**

**Gap it closes:** No document defines what "done" means for UI/UX work at the fleet
level. A session can run hundreds of rounds while 30 flows sit unexamined.

**What this skill must contain:**

Minimum state per flow before considered examined:
- `docs/screen-examination/{slug}-examination.md` exists with WHO, VERB, GRAMMAR,
  FEEL declared; at least one PNG audit result; overall grade
- `docs/design-context/{slug}/.impeccable.md` exists and is populated
- FC-18 Audit Trail exists with all mandatory fields populated

Fleet-level done: all 48 flows have reached minimum examined state, except flows
blocked by open CFIs.

Batch tracking:
- BATCH-01 through BATCH-07: FLOW-01..FLOW-34
- BATCH-08: FLOW-35..FLOW-40
- BATCH-09: FLOW-41..FLOW-44 (external adapters)
- BATCH-10: FLOW-45..FLOW-48
Fleet work is not done until all 10 batches have at least one examination record per flow.

Progress metric: N_examined / (48 - N_blocked) — the only valid fleet progress metric.
Any other metric is a session-level metric, not a fleet-level metric.

---

### PHASE 14 — planning--coverage-completeness-gate-SKILL.md (SK-546)

**Operation type: CREATE**

**Gap it closes:** No gate prevents a session from claiming improvement when it has
examined N% of the required scope.

**What this skill must contain:**

Trigger: any ⛔ STOP that claims improvement, completion, or progress.

Gate logic:

| Claim type | Required coverage before claim is valid |
|------------|----------------------------------------|
| "This flow improved" | 100% of that flow's screen states audited (SK-541 four layers) |
| "These N flows improved" | 100% of all N flows fully audited |
| "UI/UX fleet is improving" | SK-543 denominator established; ≥ 20% of non-blocked flows examined |
| "UI/UX fleet work is done" | SK-545 completion criteria met for all non-blocked flows |

When coverage is below threshold:
1. State the coverage explicitly: "N of M flows examined (X%)"
2. Downgrade the claim to match the actual coverage
3. Do not suppress the work — continue — but revise the overclaimed result

Implementation: fires at Step 6 (feedback recheck) of the Response Construction
Protocol. Before STOP, the improvement claim is checked against coverage.

---

### PHASE 15 — planning--output-skepticism-SKILL.md (SK-547)

**Operation type: CREATE**

**Gap it closes:** No skill teaches a session to proactively challenge whether its
claimed improvement is real before reporting it.

**What this skill must contain:**

Trigger: any session claiming a result. Runs before ⛔ STOP.

Three skeptic questions — answer all three before sending:

1. Refutation evidence: "What observable evidence would prove this result wrong?
   Have I looked for that evidence?"
   - For UI results: "If I read the PNG I captured, would I see the improvement I claim?"
   - For metric results: "Is the metric I used the right metric for the goal Luba stated?"

2. Scope validity: "Does the evidence I have cover the scope I am claiming?"
   - Use SK-543 denominator and SK-546 coverage gate

3. Proxy check: "Am I measuring a proxy that could have improved without the underlying
   thing improving?"
   - Grep patterns can drop while PNGs look identical
   - TypeScript errors can reach zero while the UI is broken
   - For every internal metric improvement, name one user-facing observable that should
     have changed

Format before STOP:
```
Refutation check: [what would refute this + whether I looked]
Scope: [N of M scope covered]
Proxy check: [internal metric] correlates with [observable] — verified / not verified
```

If any of the three checks fails: revise the claim before sending.

**Relationship to existing skills:** planning equivalent of SK-429 (self-questioning
for generation). Extends skepticism discipline to audit and planning sessions.

---

## SUMMARY TABLE — PART 2 (UI/UX Fleet Discipline Skills)

| Phase | Operation | Skill | SK | Gap closed |
|-------|-----------|-------|----|------------|
| 11 | CREATE | planning--work-scope-inventory-SKILL.md | SK-543 | No denominator before work begins |
| 12 | CREATE | planning--improvement-measurement-protocol-SKILL.md | SK-544 | Internal metrics substituted for observable outcomes |
| 13 | CREATE | planning--ui-fleet-completion-criteria-SKILL.md | SK-545 | No fleet-level "done" definition |
| 14 | CREATE | planning--coverage-completeness-gate-SKILL.md | SK-546 | Claims made without coverage threshold |
| 15 | CREATE | planning--output-skepticism-SKILL.md | SK-547 | No mechanism to challenge own claimed results |

**Part 2 critical path:** SK-543 first (denominator that makes SK-544, SK-545, SK-546,
SK-547 meaningful). Each subsequent skill can be authored independently. SK-543 and
SK-546 should be in project knowledge before the next UI/UX fleet session begins.

**What all five gaps share:** the existing skills govern what happens within a correctly
scoped session. None govern whether the session's scope is correct in the first place.
These five skills close that gap.
