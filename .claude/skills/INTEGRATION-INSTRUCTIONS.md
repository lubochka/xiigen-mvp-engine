# INTEGRATION INSTRUCTIONS — Claude Code
## claude-code-flow-design-skills-v2.0.0 (supersedes v1.0.3)
## Date: 2026-03-25

---

## STEP 1: COPY NEW SKILL FILES

```bash
cd /path/to/xiigen-mvp

cp planning--problem-decomposition-SKILL.md          .claude/skills/planning/
cp planning--claim-verification-SKILL.md             .claude/skills/planning/
cp planning--root-cause-ladder-SKILL.md              .claude/skills/planning/
cp planning--solution-scope-gate-SKILL.md            .claude/skills/planning/
cp planning--node-design-review-SKILL.md             .claude/skills/planning/
cp planning--architectural-decision-testing-SKILL.md .claude/skills/planning/
cp session-output--investigation-handoff-SKILL.md    .claude/skills/session-output/
cp code-execution--node-convergence-SKILL.md         .claude/skills/code-execution/
cp code-execution--github-lab-SKILL.md               .claude/skills/code-execution/
cp planning--level-correction-response-SKILL.md      .claude/skills/planning/
cp planning--change-propagation-SKILL.md             .claude/skills/planning/

# Replace updated files
cp planning--plan-review-SKILL.md                    .claude/skills/planning/
cp code-execution--learning-signal-capture-SKILL.md  .claude/skills/code-execution/
cp code-execution--flow-implementation-guide-SKILL.md .claude/skills/code-execution/
cp code-execution--flow-design-check-catalog.md      .claude/skills/code-execution/
cp code-execution--topology-structure-SKILL.md       .claude/skills/code-execution/
cp code-execution--node-convergence-SKILL.md         .claude/skills/code-execution/
cp planning--simulation-protocol-SKILL.md            .claude/skills/planning/
cp planning--flow-vs-service-gate-SKILL.md           .claude/skills/planning/
cp planning--bootstrap-boundary-SKILL.md             .claude/skills/planning/
cp planning--flow-design-cycle-SKILL.md              .claude/skills/planning/
cp code-execution--flow-restructure-SKILL.md         .claude/skills/code-execution/
cp code-execution--flow-design-rag-seeds.md          .claude/skills/code-execution/
cp FLOW-DESIGN-SKILL-INDEX.md                        .claude/skills/
cp DOCUMENT-AUTHORITY-MAP.md                         .claude/skills/
cp HOW-TO-USE-SKILLS-v2.0.0.md                       .claude/

# New v2.0.0 skills
cp planning--arbiter-panel-design-SKILL.md           .claude/skills/planning/
cp planning--session-file-authoring-SKILL.md         .claude/skills/planning/
cp planning--principles-arbiter-SKILL.md             .claude/skills/planning/
cp planning--escalation-orchestrator-SKILL.md        .claude/skills/planning/
cp session-output--mission-progress-SKILL.md         .claude/skills/session-output/
```

---

## STEP 2: APPLY PATCH FILES

Each PATCH file has "HOW TO APPLY" at the top with exact insertion points.

| Patch file | Target |
|------------|--------|
**Apply in this exact order:**

| # | Patch file | Target | Notes |
|---|------------|--------|-------|
| 1 | `PATCH--xiigen-core-principles-P14-P15-P16.md` | `.claude/skills/planning/planning--xiigen-core-principles-SKILL.md` | Apply FIRST — adds P14/P15/P16 |
| 2 | `PATCH--xiigen-core-principles-M1-M5-P17-P22.md` | `.claude/skills/planning/planning--xiigen-core-principles-SKILL.md` | Apply SECOND — adds M1-M5 + P17-P22 |
| 3 | `PATCH--judge-model-freedom-config.md` | FREEDOM config + project setup | D-EXT-009 — judge model via config |
| 4 | `PATCH--how-to-prepare-a-plan-NODE-prereq-Gate-C.md` | `.claude/skills/planning/planning--how-to-prepare-a-plan-SKILL.md` | DESIGN_REASONING inlined (S-5 fix) |
| 5 | `PATCH--contract-template-node-field.md` | `.claude/skills/reference/reference--contract-template.md` | Adds node: field |
| 6 | `PATCH--contract-template-arbiter-config.md` | `.claude/skills/reference/reference--contract-template.md` | Adds arbiterConfig: field (v2.0.0) |
| 7 | `PATCH--web-session-handoff-discoveries.md` | `.claude/skills/session-output/session-output--web-session-handoff-SKILL.md` | — |
| 8 | `PATCH--infrastructure-discovery-RAG-steps.md` | `.claude/skills/pipeline/pipeline--infrastructure-discovery-SKILL.md` | — |
| 9 | `PATCH--fabric-interfaces-IScheduler-ICodeRepo.md` | `.claude/skills/reference/reference--fabric-interfaces.md` | — |
| 10 | `PATCH--flow-implementation-guide-V10-PhaseF.md` | `.claude/skills/code-execution/code-execution--flow-implementation-guide-SKILL.md` | V10 Phase F (V12 in v2.0.0 file) |

---

## STEP 3: UPDATE AGENTS.MD

Add to `.claude/AGENTS.md` skill loading section:

```markdown
## v2.0.0 FLOW DESIGN SKILLS (add after v1.0.3 entries)

load_order  1: planning--arbiter-panel-design-SKILL.md      (writing multi-generate/arbiter-panel nodes)
load_order  1: planning--principles-arbiter-SKILL.md        (configuring key_principles arbiter)
load_order  1: planning--escalation-orchestrator-SKILL.md   (arbiter panel escalation)
load_order 98: planning--session-file-authoring-SKILL.md    (Gate C — ALL session file production)
load_order 99: session-output--mission-progress-SKILL.md    (before every ⛔ STOP)

## v1.0.3 FLOW DESIGN SKILLS

load_order  0: planning--solution-scope-gate-SKILL.md       (before ANY proposal)
load_order  0: planning--problem-decomposition-SKILL.md     (problem-driven sessions)
load_order  0: planning--root-cause-ladder-SKILL.md         (recurring problems)
load_order  1: code-execution--node-convergence-SKILL.md    (before genesis prompt)
load_order  1: planning--node-design-review-SKILL.md        (after NODE, before Phase B)
load_order  0: code-execution--github-lab-SKILL.md          (cross-branch analysis)
load_order 99: session-output--investigation-handoff-SKILL.md (end of investigation)
load_order 99: planning--architectural-decision-testing-SKILL.md (Gate C + arch review)
load_order -1: planning--level-correction-response-SKILL.md  (challenge response)
load_order -1: planning--change-propagation-SKILL.md         (blast radius at task start)

# Invoke planning--claim-verification-SKILL.md whenever:
#   - a review document arrives
#   - a renumbering map is proposed
#   - a model states an artifact number
```

---

## STEP 4: UPDATE SKILL-INDEX.MD

Add to `SKILL-INDEX.md`:

```markdown
## v1.0.3 — Added 2026-03-24

| File | SK | What it does |
|------|----|-------------|
| planning--problem-decomposition-SKILL.md | SK-430 | Decompose before acting |
| planning--claim-verification-SKILL.md | SK-431 | 3-class verification before trusting claims |
| planning--root-cause-ladder-SKILL.md | SK-432 | Act at the right level |
| session-output--investigation-handoff-SKILL.md | SK-433 | discoveries[] + rejected_claims[] |
| planning--solution-scope-gate-SKILL.md | SK-434 | Minimum scope ladder |
| code-execution--node-convergence-SKILL.md | SK-435 | Build NODE via convergence |
| code-execution--github-lab-SKILL.md | SK-436 | 4-call branch analysis |
| planning--node-design-review-SKILL.md | SK-437 | NODE readiness gate |
| planning--architectural-decision-testing-SKILL.md | SK-438 | Decision validation |
| planning--level-correction-response-SKILL.md | SK-439 | Abandon frame on level challenge; load order -1 |
| planning--change-propagation-SKILL.md | SK-440 | Blast radius before any task; prevents partial updates |

## v2.0.0 — Added 2026-03-25

| File | SK | What it does |
|------|----|-------------|
| planning--arbiter-panel-design-SKILL.md | SK-442 | 7 specialized arbiters + upper judge + arbiterConfig template |
| planning--session-file-authoring-SKILL.md | SK-443 | Crystallization protocol; 7 self-containment checks; Gate C mandatory |
| planning--principles-arbiter-SKILL.md | SK-444 | Isolation rule; growth rule; self-reinforcement |
| session-output--mission-progress-SKILL.md | SK-445 | 5 mission questions; DECISION THRESHOLDS; ENGINE PROGRESS table |
| planning--escalation-orchestrator-SKILL.md | SK-446 | 6 decision rules; ARBITER_VERDICT/DISAGREEMENT signals |
```

---

## STEP 5: VERIFY

```bash
# All 9 new skills present
for skill in problem-decomposition claim-verification root-cause-ladder \
  investigation-handoff solution-scope-gate node-convergence \
  github-lab node-design-review architectural-decision-testing \
  level-correction-response change-propagation; do
  find .claude/skills -name "*${skill}*" | head -1 || echo "MISSING: ${skill}"
done

# FC-23/24/25 in plan-review
grep -c "FC-23\|FC-24\|FC-25" .claude/skills/planning/planning--plan-review-SKILL.md
# Expected: >= 3

# New signals in learning-signal-capture
grep -c "DESIGN_REASONING\|CONVERGENCE_SESSION" \
  .claude/skills/code-execution/code-execution--learning-signal-capture-SKILL.md
# Expected: >= 2

# v2.0.0 verification
# FC-26..31 in plan-review
grep -c "FC-26\|FC-27\|FC-28\|FC-29\|FC-30\|FC-31" .claude/skills/planning/planning--plan-review-SKILL.md
# Expected: >= 6

# 9 signal types in learning-signal-capture
grep -c "MODEL_COMPARISON\|SHADOW_RUN\|ARBITER_VERDICT" \
  .claude/skills/code-execution/code-execution--learning-signal-capture-SKILL.md
# Expected: >= 3

# arbiterConfig in contract template
grep -c "arbiterConfig" .claude/skills/reference/reference--contract-template.md
# Expected: >= 2

# SK-443 session-file-authoring installed
find .claude/skills -name "planning--session-file-authoring*" | head -1 || echo "MISSING"

# SK-445 mission-progress installed
find .claude/skills -name "session-output--mission-progress*" | head -1 || echo "MISSING"
```

---

## DEFERRED ITEMS (not in this zip)

| Item | Task | Unblocks |
|------|------|---------|
| convergence.handler | Task 7 — pre-FLOW-01 | SK-435, SK-437, V10 |
| Semantic RAG indexing | Task 6 — pre-FLOW-01 | P16, Phase F self-model |
| ~~Arbiter selection gate~~ | ~~Task 9~~ | RESOLVED — SK-442/446/444 + FC-26/30 (v2.0.0) |
| SK placeholder resolution (5 files) | C-9/C-10 in CARRY-FORWARD-ISSUES.md — first Claude Code session: `grep -r "topology-structure\|bootstrap-boundary\|flow-vs-service\|flow-restructure\|flow-design-cycle\|learning-signal-capture" .claude/skills/SKILL-INDEX.md` and assign real numbers | Cosmetic only — no functional block |
