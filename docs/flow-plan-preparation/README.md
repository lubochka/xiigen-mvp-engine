# Flow Plan Preparation — Governing Documents

This directory contains all governing documents for the XIIGen flow plan preparation process.
These documents define the 4-cycle AI-driven system that takes a user sentence to a running flow.

---

## Session Load (read first, every session)

| Document | Role |
|----------|------|
| `XIIGEN-SESSION-LOAD-PLAN-v3.md` | **FIRST READ** — mental model, gap checklist, next actions, RAG document index, absolute rules |
| `XIIGEN-ARCHITECTURAL-DECISION-ADDENDUM.md` | **MANDATORY before convergence work** — two-layer context rule, failure modes, three-signal test |

---

## Governance

| Document | Role | Load when |
|----------|------|-----------|
| `XIIGEN-EXECUTION-PROTOCOL-v1.1.md` | Session discipline — 3-min checks, state, paths, 8 never-dos | Every Claude Code session before touching files |
| `HOW-TO-USE-SKILLS-v3.0.0.md` | Skill triggers, session types, Q2 table | Every session start (SESSION-START GATE) |
| `XIIGEN-FLOW-PLAN-PREPARATION-GUIDE-v2.md` | 10-step flow plan process, skills per step | Any FLOW-PLAN session |
| `XIIGEN-PLANNING-SKILLS-AUDIT.md` | QUESTION YOURSELF audit across planning skills | Reviewing or extending any planning skill |
| `XIIGEN-DESIGN-VISION-plain-language.md` | 4-cycle model, players, grades, visibility | Any session start; before any FLOW-PLAN step |

---

## Investigation / Context

| Document | Role | Load when |
|----------|------|-----------|
| `XIIGEN-GAP-REVIEW-2026-04-01.md` | 5-gap analysis, root causes, simulation verdict | INVESTIGATION; verifying what still needs building |
| `XIIGEN-SKILL-GAP-ANALYSIS-2026-04-01.md` | Per-cycle skill status: exists / needs extension / missing | Before writing or reviewing any skill |

---

## Skills Specification

| Document | Role | Load when |
|----------|------|-----------|
| `XIIGEN-MISSING-SKILLS-PREPARATION-PLAN-v2.md` | Spec for SK-520..SK-525 | Writing any AI-topology skill |
| `planning--meta-arbiter-SKILL.md` (SK-525) | Meta-Arbiter governance | Step 9 visibility contracts; any grade < 0.85 |

Note: SK-525 is also in `.claude/skills/` for live loading.

---

## Implementation

| Document | Role | Load when |
|----------|------|-----------|
| `FLOW-01-CYCLES-1-3-IMPLEMENTATION-PLAN.md` | Phase A/B/C/D handler specs, prompts, test specs | Implementing any cycle handler |
| `FLOW-01-FILE-ORGANIZATION.md` | Directory structure for FLOW-01 | Organizing FLOW-01 files |

---

## Flow Patching (FLOW-06..34)

| Document | Role | Load when |
|----------|------|-----------|
| `FLOW-06-34-PATCH-INSTRUCTIONS.md` | Per-flow user_intent + PRIOR_ART + arbiter tables | Applying per-flow content to FLOW-06..34 |

Note: `patch_flows_perflow.py` is at project root (`[PROJECT_ROOT]\patch_flows_perflow.py`) — **NOT YET RUN**.

---

## Skills Written (all in `.claude/skills/`)

| SK Number | File | Status |
|-----------|------|--------|
| SK-520 | `planning--intent-to-plan-SKILL.md` | COMPLETE |
| SK-521 | `planning--depth-decision-SKILL.md` | COMPLETE |
| SK-522 | `planning--ai-context-package-authoring-SKILL.md` | COMPLETE |
| SK-524 | `planning--cycle-visibility-design-SKILL.md` | COMPLETE |
| SK-525 | `planning--meta-arbiter-SKILL.md` | COMPLETE |

---

## How to Start a Session

1. Read `XIIGEN-SESSION-LOAD-PLAN-v3.md` — full document, not skimmed
2. Read `XIIGEN-ARCHITECTURAL-DECISION-ADDENDUM.md` if doing convergence or context package work
3. Read `XIIGEN-EXECUTION-PROTOCOL-v1.1.md` — session discipline rules
4. Check git log: what was the last committed action?
5. Identify next action from SESSION-LOAD-PLAN-v3 NEXT ACTIONS table
6. Load required skills by reading the files (view tool) — print ✅ [filename] (SK-NNN) for each
7. Confirm test baseline: `cd server && npx jest 2>&1 | tail -5` → failures === 0
8. State the output contract for round 1 in one sentence before starting
9. BEGIN — one action, one phase, one step at a time

`SKILL-PREP-STATE.json` in this directory tracks skill preparation status.

---

## Superseded (do not load)

| Document | Superseded by |
|----------|---------------|
| `XIIGEN-EXECUTION-PROTOCOL.md` (v1) | `XIIGEN-EXECUTION-PROTOCOL-v1.1.md` |
| `XIIGEN-FLOW-PLAN-PREPARATION-GUIDE.md` (v1) | `XIIGEN-FLOW-PLAN-PREPARATION-GUIDE-v2.md` |
| `XIIGEN-MISSING-SKILLS-PREPARATION-PLAN.md` (v1) | `XIIGEN-MISSING-SKILLS-PREPARATION-PLAN-v2.md` |
