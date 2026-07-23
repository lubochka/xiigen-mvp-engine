# AGENTS.md — Root Agent Instructions for XIIGen

> Note: this is an internal engineering/methodology document — session-boundary
> rules for the AI coding agents that build XIIGen. It is part of how XIIGen is
> built, not user-facing product documentation; see the top-level README.md for
> that.

# This file is loaded automatically by Claude Code before every session.
# It is the authoritative source for session-boundary rules.
# Last updated: 2026-04-20 — v3: CFI-11 governance sync (Layer 8-10 stack,
#                                SK-540/541/542, SESSION-LOAD-PLAN v31,
#                                Round-2 matrix + per-image template +
#                                coverage JSON, /.impeccable.md, v4.5.0
#                                promoted to default HOW-TO-USE-SKILLS.md)
# Prior: 2026-04-13 v2 (OP-7 pre-commit gate + TECH DEBT TRACKER)

---

## HUMAN OVERRIDE PROTOCOL (HIGHEST PRIORITY)

**This rule is prior to everything else in this file.**

```
1. Luba's direct instruction in this conversation      ← ALWAYS WINS
2. This file (AGENTS.md)
3. CLAUDE.md rules
4. Any other governance document
5. Claude's training defaults
```

A contradiction between levels 1 and 2–5: **Execute Luba's instruction first.
State the contradiction. Ask for exception type. Never self-resolve.**

---

## OPERATIONAL PROTOCOL — 7 ABSOLUTE RULES

**These 7 rules apply to every task, every session, without exception.**

---

### RULE OP-1 — Never Override User Instructions

**The user's stated execution sequence IS the execution plan.**

When Luba says "do A, then B, then C" — that is the binding execution order.
It cannot be reordered for efficiency. It cannot be parallelised without
explicit approval. It cannot be skipped because a prerequisite appears done.

**The only exception:** Luba gives explicit written permission in the current message.

---

### RULE OP-2 — Never Introduce Technical Debt

**Replacing an error with a suppression comment is NOT a fix.**

| Forbidden | Why |
|---|---|
| `/* eslint-disable @typescript-eslint/no-explicit-any */` in production | Silences warning, root cause remains |
| `// eslint-disable-next-line ...` in production code | Same — line-level suppression |
| `as any` in service constructors or production logic | Violates the no-typed-models rule (all business data must use `Record<string, unknown>`) |
| Em-dash `—` in eslint-disable comments | Malformed — causes "rule not found" CI errors |
| `@ts-ignore` or `@ts-expect-error` | Type system bypassed |
| `TODO: fix later` in committed code | Deferred debt |
| Disabling a failing test | Signal lost |

**The only permitted suppression in production code:**
```typescript
// When structural type mismatch must be deferred:
const obj = rawValue as unknown as TargetType; // CARRY-FORWARD: ISSUE-NNN — reason
```
This must be accompanied by a CARRY-FORWARD issue entry AND an entry in the TECH DEBT
TRACKER at the bottom of this file.

**If a fix cannot happen in this session:** document it explicitly:
```
ISSUE INVENTORY:
  ISSUE-001: cycle-chain.service.ts uses 'any' for injected deps →
             DEFERRED — needs typed fabric interface; Jira XIIGEN-NNN
```

---

### RULE OP-3 — Stop Immediately When Requested

**Any instruction to stop is effective immediately.** Applies to:
1. `⛔ STOP` markers in session or plan files
2. Direct instructions ("stop", "pause", "halt", "wait")
3. Any question from Luba implying a decision is needed before proceeding
4. Discovery of a BLOCKER

**When stopped:** write required output, present it, wait for written approval.
Do NOT: diagnose next problem, run one more command, start a background agent.

**Agent extension:** If a background agent is running:
1. Note the agent ID and its last known state
2. Do NOT launch additional agents
3. Report: "Agent [ID] still running. Await your instruction to continue or terminate."

---

### RULE OP-4 — Exactly One Working Tree: claude/vigorous-margulis

**All code changes happen on `claude/vigorous-margulis` in the main working tree.**

Prohibited: `git worktree add`, any other branch, isolated directories, parallel worktrees.

```bash
# Verify at session start:
git branch --show-current
# Expected: claude/vigorous-margulis — if wrong: STOP immediately
```

---

### RULE OP-5 — Commit, Push, Update Jira, Report After Every Phase

**A phase is NOT complete until all four handoff steps finish:**

1. **Commit** — only after OP-7 pre-commit gate passes (all 7 checks)
2. **Push** — `git push origin claude/vigorous-margulis` — verify no rejection
3. **Jira** — find or create ticket; add comment; move to In Review or Done;
   use domain names only (never T-numbers or FLOW-XX codes in Jira)
4. **Report:**
```
PHASE COMPLETE: <phase name>
Files written:   [list with CREATE/EDIT/DELETE]
Tests:           [before] → [after] (Δ +N, 0 failures)
Jira:            DEV-NNN updated — <ticket title>
Commit:          <hash> pushed to claude/vigorous-margulis
Open issues:     NONE | [list with FIXED/DEFERRED+tracking]
Next phase:      <name> — continuing unless Luba explicitly stops or redirects
```

**Proceed to the next phase automatically after the four handoff steps complete,
unless Luba explicitly says stop, pause, wait, or redirects the work.**

---

### RULE OP-6 — Check Running Agents Every 3 Minutes

```
T+0:  Agent spawned — note ID
T+3:  "Agent [ID]: running | N files modified"
T+6:  same
...until complete or terminated
```

On completion: report immediately; show files changed + test delta; await approval.
Hard limit: 30 minutes no progress → report as stuck, ask whether to terminate.

---

### RULE OP-7 — Pre-Commit Gate: All 7 Checks Must Pass

**This gate runs BEFORE every `git commit`. No exceptions.**

Run `scripts/pre-commit-check.sh` before committing.
If any check fails: **fix the root cause**, re-run from check 1, then commit.

The script checks:
1. Server lint — 0 errors, 0 warnings
2. Server TypeScript — 0 errors
3. Server tests — 0 failures
4. Client TypeScript — 0 errors
5. No malformed eslint-disable comments (em-dash/en-dash instead of --)
6. No new file-level eslint-disable banners in staged files
7. No new `as any` or `: any` introduced in staged production files

---

## SESSION LOAD — Claude Code only

**This section applies to Claude Code sessions running in the repo. It does not apply to Claude.ai web sessions — the web session boot protocol in the session start prompt governs those.**

Every Claude Code session reads, in this order, before any other work:

| # | File | Purpose |
|---|------|---------|
| 1 | `AGENTS.md` (this file) | Session-boundary rules and operational rules 1 through 8 |
| 2 | `CLAUDE.md` | Repo-level architecture rules (Rules 0 through 17, directory map, anti-patterns) |
| 3 | `/.impeccable.md` | XIIGen design context — three audiences, brand personality, aesthetic direction, 10-concept domain vocabulary, 7-colour world, two signature elements, token vocabulary, 5 design principles, six mandate checks, seven absolute bans |
| 4 | `.claude/skills/HOW-TO-USE-SKILLS.md` | Current skill-loading governance — registers the product design context skill, the screen craft audit skill, and the flow interface examination skill; Layer 8–10 stack; session-start gate session-type matrix |
| 5 | `.claude/skills/XIIGEN-SESSION-LOAD-PLAN-v31.md` | Carry-forward issue ledger, document registry, cross-session carry-forward |
| 6 | `.claude/skills/flow-prep-library/FLOW-PREP-LIBRARY-SKILL.md` | Master entry for the flow preparation library — guides B01 through B50, plus the product design context skill, the screen craft audit skill, the flow interface examination skill, and the business flows registry |
| 7 | `docs/screen-examination/ROUND-2-MATRIX-PLAN.md` | Active per-cell UX protocol: screen × language × role × phase × state × skills |
| 8 | `docs/screen-examination/PER-IMAGE-VALIDATION-TEMPLATE.md` | One-PNG-per-block seven-axis audit checklist |
| 9 | `docs/screen-examination/ROUND-2-COVERAGE-MATRIX.json` | Which cells are PASS / CONCERN / BLOCK / NOT_YET_EXAMINED |
| 10 | `docs/screen-examination/SESSION-STATE.json` | Cross-round commit register |

**The default `HOW-TO-USE-SKILLS.md` (no version suffix) is v4.5.0 as of 2026-04-20.**
Do not read `HOW-TO-USE-SKILLS-v3.0.0.md` or earlier — those predate the product design context skill, the screen craft audit skill, and the flow interface examination skill, and are retained only for version history. Sessions that land on v3.0.0 by accident will miss those three skills, the per-image template, and the flow preparation library entirely.

**The three new skill source files are in the repo at:**
  `.claude/skills/flow-prep-library/planning--product-design-context-SKILL.md`
  `.claude/skills/flow-prep-library/planning--screen-craft-audit-SKILL.md`
  `.claude/skills/flow-prep-library/flow-ui-examination-protocol-SKILL.md`
plus their `--skill.yaml` companions and `planning--business-flows-registry.md`.

**Flat-structure external skill libraries (impeccable / interface-design /
design-for-ai / critique / ui-ux-pro-max) are in the repo at:**
  `.claude/skills/impeccable-SKILL.md` + `.claude/skills/impeccable--*.md`
  `.claude/skills/interface-design-SKILL.md` + `.claude/skills/interface-design--*.md`
  `.claude/skills/design-for-ai-SKILL.md` + `.claude/skills/design-for-ai--*.md`
  `.claude/skills/critique-SKILL.md` + `.claude/skills/critique--*.md`
  `.claude/skills/ui-ux-pro-max-SKILL.md`

---

## ROUND-2 ACTIVE ARTEFACTS (for any UX examination or rebuild session)

Before writing any JSX that touches an existing flow page, the session MUST:

1. Read `/.impeccable.md` (the design context file — step 0 of the flow interface examination skill protocol).
2. Read the flow's `docs/flow-coverage/{slug}/P1-business-logic-inventory.md` and `P5-ui-specs.md`.
3. Consult `ROUND-2-COVERAGE-MATRIX.json` for the flow's row:
   - If cells marked PASS at en × primary role × populated with recent `audit_commit`, treat as a baseline — extend rather than rewrite.
   - If cells marked NOT_YET_EXAMINED, run `PER-IMAGE-VALIDATION-TEMPLATE.md` fresh against the applicable PNG.
4. Run the flow interface examination skill pre-JSX checkpoint: state Intent / Palette / Depth / Surfaces / Typography / Spacing / Signature / Rejects with a *why* for each.
5. After the edit, run the six mandate checks (swap / squint / signature / AI-slop / token / non-technical-reviewer) before the PNG gate closes.

**Plain-language audit (Luba directive, 2026-04-20):** the acronym substitution table in `ROUND-2-MATRIX-PLAN.md` applies to every session. A grep finding any of the following patterns on a tenant-consumer page is an automatic block under Nielsen usability heuristic 2 (match between system and real world):

```
\bBFA\b | \bDNA-[1-9]\b | \bAF[- ]station\b | \barbiter\b
| FREEDOM config | MACHINE code | DataProcessResult | ENGINE_INTERNAL
| \bT[0-9]{3}\b | \bCF-[0-9]{3}\b
```

**Module versus admin-panel shell:** tenant-user and referral-user are treated as consumer shells. They do NOT see the XIIGen admin sidebar. Adding a new page must set `isConsumerShell` correctly via the existing AppShell role branch.

**Right-to-left support:** `document.documentElement.dir` flips to `rtl` for locales in `{he, ar, fa, ur}`. New pages must use logical Tailwind properties (`ms-*`, `me-*`, `ps-*`, `pe-*`, `text-start`, `text-end`) not physical (`ml-*`, `mr-*`, `text-left`, `text-right`).

---

## TECH DEBT TRACKER

**Outstanding no-tech-debt violations inherited from prior sessions.**
Every session that creates a deferred item MUST add it here.
Items are resolved in the order Luba schedules, not opportunistically.

| ID | File(s) | Issue | Status | Jira |
|---|---|---|---|---|
| debt-001 | `cycle-chain.service.ts` | File-level `eslint-disable` banner (removed in DEV-111 fix session) | RESOLVED | DEV-111 |
| debt-002 | `expand-consumer.handler.ts` | File-level `eslint-disable` banner | OPEN | — |
| debt-003 | `event-participation/*.service.ts` (6 files) | File-level `eslint-disable` banners | OPEN | — |
| debt-004 | `feature-registry/*.service.ts` (6 files) | File-level `eslint-disable` banners | OPEN | — |
| debt-005 | `generation-loop/*.service.ts` (2 files) | File-level `eslint-disable` banners | OPEN | — |
| debt-006 | `marketplace/*.service.ts` (6 files) | File-level `eslint-disable` banners | OPEN | — |
| debt-007 | `learning/*.ts` (4 files) | File-level `eslint-disable` banners | OPEN | — |
| debt-008 | `api/*.controller.ts` (4 files) | File-level `eslint-disable` banners | OPEN | — |
| debt-009 | `profile-enrichment-matching-contracts.ts` | T51/T52 arbiterConfig uses pre-ArbiterPanelConfig format — suppressed with `as unknown as ArbiterPanelConfig` | OPEN | — |
| debt-010 | `reviews-reputation/*.service.ts` (4 files) | `: any` in constructor injection — violates the no-typed-models rule | OPEN | — |
| debt-011 | `.github/workflows/*.yml` | Node.js 20 deprecation — pin to Node 24 actions | OPEN | — |

**Total outstanding: 10 open items across approximately 34 files. debt-001 resolved.**

**Recommended resolution order:**
1. debt-010 — reviews-reputation constructor types: replace `: any` with typed fabric interfaces
2. debt-002 — expand-consumer core engine file
3. debt-009 — migrate T51/T52 arbiterConfig to ArbiterPanelConfig schema
4. debt-003 through debt-008 — per-flow group (one session per group)
5. debt-011 — GitHub Actions workflow YAML

---

## ROOT CAUSE ANALYSIS

### Why OP-1 was violated (sequence reordering)
Rule 15 in CLAUDE.md only covers `⛔ STOP` markers. Claude Code treated Luba's stated
sequence as advisory. Starting FLOW-12 before CI fixes were reviewed eliminated the
inter-phase review gate.

### Why OP-2 was violated (tech debt)
No rule prohibited `eslint-disable` banners. The lint agent also used em-dash (`—`) in
inline disable comments instead of `--` — causing ESLint to parse the description as
additional rule names ("rule not found" errors in the next CI run). Both patterns
must now be checked in the pre-commit gate (checks 5 and 6).

### Why OP-3 was violated (not stopping)
The loophole: "I'm just monitoring an agent, not doing code work." After Luba flagged
the worktree violation, a monitoring agent was launched. Stopping applies to agents too.

### Why OP-4 was violated (multiple worktrees)
`claude/vigorous-margulis` was not named in any governance file. Claude Code used
`git worktree add` as a standard isolation practice without knowing it was prohibited.

### Why OP-5 was violated (no per-phase reporting)
AGENTS.md had only a session-end protocol. No per-phase commit/report/Jira requirement
was documented. Claude Code treated the session as one batch.

### Why OP-6 was violated (3-minute polling)
Not documented. Luba stated it mid-conversation; Claude Code applied it briefly then stopped.

### Why OP-7 did not exist (no pre-commit gate)
There was no automated gate before push. Every broken commit became visible only in CI,
not locally. The pre-commit script now makes CI failures impossible if the gate is run.

---

## ABSOLUTE SESSION-END RULE — NEVER SKIP

At the end of every session, before the stop gate:

1. Run the master plan gates (foundation through packaging) against the next session's plan
2. Run the full failure-class check battery against the next session's deliverables
3. Write Section A (this session results) to the plan file — NOT to chat
4. Write Section B (next session reviewed plan) to the plan file
5. Update the tech debt tracker with any new deferred items
6. Only then: ⛔ STOP HERE — await Luba's written approval

---

## QUICK REFERENCE — 7 RULES

| # | Rule | One-line test | Violation example |
|---|------|--------------|-------------------|
| OP-1 | No sequence override | "Did Luba state an order? Am I following it exactly?" | Start FLOW-12 during lint agent |
| OP-2 | No tech debt | "Am I fixing root cause or silencing symptom?" | `eslint-disable` banner or em-dash comment |
| OP-3 | Stop immediately | "Did Luba say stop? Is anything still running?" | Spawn monitoring agent after stop instruction |
| OP-4 | One working tree | "Am I on claude/vigorous-margulis main tree?" | `git worktree add` |
| OP-5 | Commit+push+Jira+report | "Did all 4 handoff steps complete before next phase?" | Skip Jira update |
| OP-6 | 3-min agent polling | "When did I last check the running agent?" | No report for 15 minutes |
| OP-7 | Pre-commit gate | "Did pre-commit-check.sh show 7/7 ✅ before I committed?" | Push without running checks locally |

---

## XIIGen Universal Skills Overlay

The universal overlay lives at `.claude/skills/universal/**`. It is process, safety,
review, and verification guidance only; it supplements this file and the active XIIGen
source truth without replacing either one.

Do not import, copy, or adapt `llm_mvp_core` internals, algorithms, design patterns,
training or DPO material, source domains, classes, or paths into this worktree. Universal
guidance may shape how work is planned, reviewed, and verified, but implementation
decisions must come from XIIGen-owned contracts, local governance, and active source.
