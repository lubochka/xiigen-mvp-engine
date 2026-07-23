---
name: web-session-handoff
sk: SK-428
description: >
  Defines the exact format of SESSION-BRIEF-{phase}.md — the structured
  document Claude Code writes at phase end that enables a web Claude session
  to start cold. The brief contains everything the web session needs without
  requiring STATE.json, prior SESSION files, or any repo access.
layer: session-output
version: 1.0.0
createdAt: 2026-03-20
requires: [SK-426]
complements: [SK-427]
---

# WebSessionHandoff [SK-428]

## Purpose

The development cycle in this project has two distinct actors:
- **Claude Code** — executes phases, writes code, runs tests
- **Claude (web session)** — plans next phases, reviews results, makes decisions

These two actors share no context. When you open a new web session to plan
the next phase, Claude has no memory of what Claude Code just did. Without
a structured handoff, you would need to re-explain the entire project state
from scratch every time.

SESSION-BRIEF-{phase}.md is that structured handoff. Paste it at the start
of any web session (alongside or instead of NEW-TASK-PLANNING-PROMPT-v2.md)
and the web session immediately knows: where things are, what just happened,
what it cost, what needs deciding next.

## File Location and Name

```
sessions/FLOW-XX/SESSION-BRIEF-{phase}.md

Examples:
  sessions/FLOW-35/SESSION-BRIEF-B.md
  sessions/FLOW-01/SESSION-BRIEF-A.md
```

## Schema — Exact Required Sections

```markdown
# SESSION BRIEF — FLOW-XX Phase {letter} → Phase {next_letter}
## For: web planning session | Produced by: Claude Code
## Phase completed: {phase_title} | Next: {next_phase_title}
## Date: {completed_at}

---

## PROJECT STATE

Flow:       FLOW-XX — {flow_title}
Phase done: {letter} — {phase_title}
Phase next: {next_letter} — {next_phase_title}
Tests:      {exit} passing (was {entry} at phase start, +{delta} this phase)
TypeScript: 0 errors
Branch:     {current_branch}

Artifact boundaries (post this phase):
  Last task type:  T{NNN}
  Last factory:    F{NNNN}
  Last BFA rule:   CF-{NNN}
  Last skill:      SK-{NNN}

---

## WHAT PHASE {letter} BUILT

[3–5 sentences. Plain English. What was implemented and why it matters to the project.
Focus on business/architectural value, not file names.]

---

## COST AND AI ACTIVITY

[Include only if AI generation ran this phase. Omit section entirely if not.]

Total spend this phase: ${total_usd:.2f}
Rounds run: {rounds_run}
Models used: {model list}
Final decision: {ACCEPT | RETRY | ESCALATE | HALT}
DPO triples captured: {N}
Budget remaining for FLOW-XX: ${remaining:.2f} of ${total_budget:.2f}

---

## DISCOVERIES — FACTS ESTABLISHED THIS SESSION

discoveries[] — facts found during this session that future sessions need.
Each discovery must have: fact, verified_by (the command that confirmed it),
implication, action_taken_or_deferred.

Format:
  DISCOVERY-N:
    fact:        [precise factual statement — no hedging]
    verified_by: [grep command, query, or observation that confirmed it]
    implication: [what this means for future work in this area]
    action:      RESOLVED: {what was done}
               | DEFERRED: {why and when it will be resolved}

---

## REJECTED CLAIMS

rejected_claims[] — claims from review documents or models that were wrong.
Each entry: claim, source, what_was_actually_true, verified_by, risk_if_accepted.

Purpose: prevents the same wrong claim from being accepted in a future session.
These are seeded to the DESIGN_REASONING RAG with decisionType=CLAIM_REJECTION.

Format:
  REJECTED-N:
    claim:       [exact wrong statement]
    source:      [who/what made it: review document / model / prior session]
    truth:       [what is actually true]
    verified_by: [command or observation that disproved it]
    risk:        [what would have gone wrong if accepted]

---

## OPEN ITEMS — NEED YOUR DECISION

[Include only if items genuinely need Luba's input before next phase can start.
If nothing needs deciding, omit this section entirely.]

DECISION 1: [title]
  Context: [one sentence]
  Options:
    A) [option with consequence]
    B) [option with consequence]
  Recommendation: [A or B, and why]

---

## WHAT PHASE {next_letter} WILL BUILD

[2–3 sentences: what the next phase covers, what it produces, what the gate looks like.]

Estimated time: {N}h
Gate: ≥ {expected_tests} tests, 0 tsc errors

---

## HOW TO USE THIS BRIEF

Paste this file at the start of your web session.
The session will pick up from here without needing STATE.json or repo access.

To plan Phase {next_letter}: say "Plan Phase {next_letter} of FLOW-XX using this brief."
To approve Phase {next_letter}: say "yes" or "proceed to Phase {next_letter}."
To ask about what was built: ask any question — the brief has the context.
```

## Writing Rules

```
1. "PROJECT STATE" section is always present — always current
2. "WHAT PHASE X BUILT" is prose — no file lists, no bullet points
3. "COST AND AI ACTIVITY" omitted if no AI generation ran
4. "OPEN ITEMS" omitted if nothing needs deciding
5. "WHAT PHASE NEXT WILL BUILD" is always present
6. The brief must be self-contained — no references to files the reader
   would need to open to understand the content
7. Artifact boundaries must be exact — read from EXECUTION-LOG, not memory
8. Tests count must be exact — the number from npm test output
```

## Positive Example

```markdown
# SESSION BRIEF — FLOW-35 Phase B → Phase C
## For: web planning session | Produced by: Claude Code
## Phase completed: SpendAndSecurity [FLOW-35-B] | Next: ImprovementDetector [FLOW-35-C]
## Date: 2026-03-21T14:32:00Z

---

## PROJECT STATE

Flow:       FLOW-35 — Meta-Arbitration Engine
Phase done: B — SpendAndSecurity
Phase next: C — ImprovementDetector
Tests:      3,978 passing (was 3,968 at phase start, +10 this phase)
TypeScript: 0 errors
Branch:     flow/meta-arbitration/spend-and-security

Artifact boundaries (post this phase):
  Last task type:  T566 (registered Phase A)
  Last factory:    F1490 (registered Phase A)
  Last BFA rule:   CF-795 (registered Phase A)
  Last skill:      SK-403

---

## WHAT PHASE B BUILT

Phase B adds the two hard-stop meta-arbiters that act as safety rails for
the entire arbitration process. SK-402 SpendGovernorPattern enforces budget
limits per task type, per flow, and per session — when a budget is exceeded,
it halts immediately and surfaces the best result seen so far rather than
continuing to spend. SK-403 SecurityCircuitBreakerPattern prevents any code
with security violations from being accepted; if all models in a round produce
security violations, it escalates to you immediately rather than retrying,
because no amount of retrying will fix a problem in the genesis prompt.
Both hard stops are non-negotiable — no other meta-arbiter can override them.

---

## WHAT PHASE C WILL BUILD

Phase C implements SK-404 ImprovementDetectorPattern, which reads the score
history across rounds and classifies the trajectory as CONVERGING, SLOW,
PLATEAU, STUCK, or REGRESSION. This classification drives whether the
round controller retries, reduces the model set, or escalates to you.
Phase C uses synthetic round histories — no real AI calls needed.

Estimated time: 2.5h
Gate: ≥ 3,986 tests, 0 tsc errors

---

## HOW TO USE THIS BRIEF

Paste this file at the start of your web session.
To plan Phase C: say "Plan Phase C of FLOW-35 using this brief."
To approve Phase C: say "yes" or "proceed to Phase C."
```

## Negative Example

```
WRONG: Brief that references files
  "See EXECUTION-LOG-B.json for details on the factories registered."
  → The brief must be self-contained. The reader may not have repo access.

WRONG: Brief with file lists instead of prose
  "## What Phase B Built
   - Created spend-governor.ts (187 lines)
   - Created security-circuit-breaker.ts (203 lines)
   - Added 10 tests"
  → This is a file manifest, not a brief. Write what it MEANS.

WRONG: Including "OPEN ITEMS" when nothing needs deciding
  "## Open Items — Need Your Decision
   (none)"
  → Omit the section entirely when nothing needs deciding.
```

## Integration

```
requires:    SK-426 (ExecutionLog — reads artifact boundaries and test counts from it)
complements: SK-427 (PhaseCompletionPackager — calls this skill as step 3)
```
