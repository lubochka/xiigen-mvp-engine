---
name: phase-git-report
sk: SK-429
description: >
  Generates a structured git report at phase end, linking commits to the
  SESSION file and phase that produced them. Appended to PHASE-COMPLETE.md.
  Enables tracing any code change back to the plan that requested it.
layer: session-output
version: 1.0.0
createdAt: 2026-03-20
requires: [SK-426]
complements: [SK-427]
---

# PhaseGitReport [SK-429]

## Purpose

After a phase completes, there should be a clear record linking:
- Which SESSION file drove this phase
- Which commits were produced
- Which files changed and why
- Whether the commit message follows the convention

This creates a bidirectional trace: SESSION file → commits → files.
You can look at any commit and know exactly which plan produced it.
You can look at any SESSION file and find every commit it generated.

## When to Invoke

After the gate passes, as part of the SK-427 PhaseCompletionPackager
procedure. The git report is appended to PHASE-COMPLETE-{phase}.md.

## Procedure

```bash
# 1. Find commits since phase start (since baseline snapshot was taken)
git log --oneline --since="{phase_start_time}" HEAD

# 2. Get summary of changed files
git diff --stat HEAD~{n_commits}..HEAD

# 3. Check commit message convention
# Expected format: "FLOW-XX Phase {letter}: {description}"
# Example: "FLOW-35 Phase B: implement SpendGovernorPattern SK-402"
```

## Output Format

Append this section to PHASE-COMPLETE-{phase}.md:

```markdown
## Git Changes

**Branch:** {branch_name}
**Session file:** SESSION-{FLOW-XX}-{letter}.md
**Commits this phase:** {n}

### Commits
| Hash | Message |
|------|---------|
| `{hash7}` | FLOW-35 Phase B: implement SpendGovernorPattern SK-402 |
| `{hash7}` | FLOW-35 Phase B: implement SecurityCircuitBreakerPattern SK-403 |
| `{hash7}` | FLOW-35 Phase B: add tests for SK-402 and SK-403 (10 tests) |

### Changed Files Summary
```
{git diff --stat output}
```

### Commit Convention Check
[✅ All commits follow "FLOW-XX Phase Y: description" convention]
OR
[⚠️  {N} commits have non-standard messages: {list them}]
```

## Commit Message Convention

Every commit during a phase MUST follow this format:
```
FLOW-{XX} Phase {letter}: {what was done}

Examples:
  FLOW-35 Phase A: add META_COLLECTION and META_DECISION archetypes
  FLOW-35 Phase B: implement SpendGovernorPattern SK-402
  FLOW-35 Phase B: add 10 tests for spend governor and security circuit breaker
  FLOW-01 Phase C: implement T47 SSOAndEmailAuth service
```

**Why this matters:** Any git blame, git log, or git bisect immediately
reveals which FLOW and phase produced the change. Without this convention,
you cannot trace a regression back to the plan that introduced it.

## Commit Discipline Rules (from dev-safety skill)

```
□ One logical change per commit — never batch unrelated changes
□ Commit message says WHAT changed, not HOW
  WRONG: "fixed the thing"
  WRONG: "updated spend-governor.ts"
  RIGHT: "FLOW-35 Phase B: implement SpendGovernorPattern SK-402"
□ Never commit commented-out code
□ Never commit a failing test
□ Never commit with tsc errors
□ Tests and implementation in separate commits when possible
```

## Positive Example

```markdown
## Git Changes

**Branch:** flow/meta-arbitration/spend-and-security
**Session file:** SESSION-FLOW-35-B.md
**Commits this phase:** 3

### Commits
| Hash | Message |
|------|---------|
| `a3f7c2e` | FLOW-35 Phase B: implement SpendGovernorPattern SK-402 |
| `b8d12f1` | FLOW-35 Phase B: implement SecurityCircuitBreakerPattern SK-403 |
| `c4e89a3` | FLOW-35 Phase B: add 10 tests for SK-402 and SK-403 |

### Changed Files Summary
 server/src/engine/meta-arbitration/spend-governor.ts      | 187 +++++++++++
 server/src/engine/meta-arbitration/security-circuit.ts    | 203 ++++++++++++
 server/test/flow35/spend-governor.spec.ts                  |  89 ++++++
 server/test/flow35/security-circuit-breaker.spec.ts        |  94 ++++++
 4 files changed, 573 insertions(+)

### Commit Convention Check
✅ All commits follow "FLOW-XX Phase Y: description" convention
```

## Negative Example

```
WRONG: Non-standard commit messages
  "wip"
  "fixed tests"
  "add files"
  → Cannot be traced back to any plan or phase

WRONG: Giant single commit
  "FLOW-35 Phase B: implement everything"
  → One commit per logical unit. Spend governor and security circuit
  breaker are separate skills — they belong in separate commits.

WRONG: Skipping git report
  Phase complete, but no ## Git Changes section in PHASE-COMPLETE.md
  → The git report is mandatory. It closes the traceability loop.
```

## Before/After Test Gate in the Report (G04 universal addition from llm_mvp_core)

The git report is not only "which commits" — it must also record the
**before→after test counter**, so the trace proves the phase did not regress the
suite. Add this block to the `## Git Changes` section (numbers from a real run,
never estimated):

```markdown
### Test Gate (before → after)
| Suite | Before phase | After phase | Floor | Verdict |
|-------|--------------|-------------|-------|---------|
| server (`cd server && npx jest`) | 2342 | 2351 | ≥ 2342 | ✅ 0 failed, +9 |
| client (`cd client && npx jest`) | 220  | 220  | ≥ 220  | ✅ 0 failed |
| e2e (`cd client && npx playwright test`) | n/a | 14 | — | ✅ 0 failed (user-facing change) |
```

Rules: **0 failed means 0 failed** (no pre-existing-failure carve-out — see
`dev-safety`); the "after" number must be **≥** the "before" floor; a green build
that printed test failures is not a pass and blocks the report. If a count went
up, name what added the tests; if it stayed flat, that is fine for a non-test
phase — but the row must still be present, not omitted.

## Docs In the Same Commit (traceability closes only with docs)

A behavior/contract/manifest/report change and its documentation update belong in
the **same phase** (and, where practical, the same commit). The git report's
`### Changed Files Summary` must show the doc file alongside the code file when
the code change made a doc stale. A phase whose code changed a contract but left
`ENGINE_ARCHITECTURE_MERGED` / `TASK_TYPES_CATALOG_MERGED` / `CLAUDE.md` stale is
not traceable — `documentation-sync` is part of the same gate, not a later phase.

## Commit-Boundary Honesty (who committed)

The report states the commit/push **owner**. Artifact/code sub-agents return a
packet and stop; the parent owns commit/push after review (see `skill-injection`
bounded-subagent fields). If a sub-agent committed/pushed without a commit-only
order, the report records the violation — a clean worktree is not evidence the
boundary was respected.

---

## Integration

```
requires:    SK-426 (ExecutionLog — provides phase metadata for the report header)
complements: SK-427 (PhaseCompletionPackager — calls this skill as step 4)
complements: dev-safety (test floors: server ≥ 2342, client ≥ 220, 0 failed)
complements: documentation-sync (docs land in the same phase/commit as the code)
complements: skill-injection (commit/push boundary owner + sub-agent honesty)
```
