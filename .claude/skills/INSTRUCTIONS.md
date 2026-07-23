# INSTRUCTIONS — Planning Skills Package v4.0
## How to use these skills in every new XIIGen planning session

---

## 1. WHAT THIS PACKAGE DOES

Before you write a single line of plan, three things need to be settled:

1. **Format** — Is every output file structured for its actual consumer (Claude Code or you)?
2. **Principles** — Does the plan address all 8 architectural requirements (multi-tenant, safe configs, RAG, etc.)?
3. **Consistency** — Are all counts, paths, and phase assignments internally consistent?

These 4 skills enforce all three. Miss any one and Claude Code will either execute the wrong thing or ship a broken plan.

---

## 2. ONE-TIME SETUP

### Option A — Project that already has `.claude/skills/`
Copy the 5 skill folders into `.claude/skills/`:
```
.claude/skills/
  agent-output-format-skill/
  how-to-prepare-a-plan-skill/
  plan-review-skill/
  xiigen-core-principles-skill/
  v17-skill-library-reference/   ← reference companion (infrastructure-discovery consults this)
```

### Option B — New project or web session without project files
Attach this ZIP to the web session. Claude reads it directly.
Say: _"Load the skills in the attached ZIP before we start."_

### Option C — Claude Code session
Place skills in `.claude/skills/` in the repo root. They load automatically when Claude Code runs.

---

## 3. HOW TO START A NEW PLANNING SESSION

### Step 1 — Open a new claude.ai web session (Opus or Sonnet)

### Step 2 — Load the skills
Paste this at the top of your first message:

```
Load these skills in order before doing anything else:
1. agent-output-format-skill
2. xiigen-core-principles-skill  
3. (infrastructure-discovery, planning-skill, plan-review-skill activate later)

Skills are in .claude/skills/ [or: in the attached ZIP].
Do not produce any plan content until I confirm Gate 0 passes.
```

### Step 3 — Describe the task
Use `NEW-TASK-PLANNING-PROMPT.md` as your template.
Fill in the 7 brackets, especially the **P1–P8 principle answers** — these are the most important. Every "TBD" blocks the plan.

### Step 4 — Let the session run its checks
Claude will:
- Run infrastructure discovery (verify live artifact numbers)
- Check all 8 principles (Gate 0)
- Produce a no-code plan summary with positive/negative examples
- ⛔ STOP and wait for your review

### Step 5 — Review and approve
Read the plan. If it looks right, say `"yes"` or `"approved"`.
Claude then produces the SESSION files.

### Step 6 — Hand to Claude Code
Give Claude Code:
```
STATE.json                    ← entry point (current_session: 0)
SESSION-0-PLAN-REVIEW.md      ← Claude Code runs this first
SESSION-1-[TITLE].md          ← first executable phase
docs/REFERENCE-PLAN.md        ← context only (do not execute)
```
Claude Code: load `STATE.json` → open `SESSION-0` → run FC checks → report → wait for approval → `SESSION-1`.

---

## 4. THE 5-SKILL ORDER (never change this)

```
SESSION START
    │
    ▼
① agent-output-format-skill ──── "Who reads each file — Claude Code or human?"
    │                              Three-File Rule: REFERENCE + EXECUTION + STATE.json
    │                              Invoke at START. Not at end. Not optional.
    ▼
② xiigen-core-principles-skill ── Gate 0: 8 principles × 32 checklist items
    │                              ALL must have explicit design answers.
    │                              "We'll add it later" = plan is INCOMPLETE.
    ▼
③ infrastructure-discovery ────── Verify everything against live code:
    │                              paths, test counts, artifact numbers, existing skills.
    │                              Consults v17-skill-library-reference — check what
    │                              already exists before proposing anything new.
    │                              Never plan from memory.
    ▼
④ planning-skill (8 gates) ─────── Content correct? DNA safe? Fabrics mapped?
    │                              Tests specified? DR entries written? Docs synced?
    ▼
⑤ plan-review-skill (15 FCs) ──── Structurally consistent?
    │                              FC-1 through FC-15. Then:
    │                              Gate A: automated checks
    │                              Gate B: 2 independent AI models review
    │                              Gate C: your written approval
    ▼
    SESSION-1 begins
```

---

## 5. THE 8 PRINCIPLES — QUICK REFERENCE

Answer all 8 before writing plan content. Every "no" is a blocker.

| # | Principle | The one question |
|---|-----------|-----------------|
| P1 | Multi-Tenant | Does `tenant_id` appear on every new entity, index, cache key, and event? |
| P2 | Safe Configs | Are all credentials resolved via `ISecretsService` per-tenant? No `process.env.*` for business values? |
| P3 | Prompt Improvement | Are prompts versioned `PromptAsset` objects? Does AF-9 verdict create a `PromptPatch`? |
| P4 | Dual RAG | Is there both a global RAG tier (ES) and a local RAG tier (docker-compose.test.yml)? |
| P5 | Self-Developing | Does this fix go into the ENGINE (AF station, skill, DNA guard), not just the output file? |
| P6 | BFA Arbitration | Are new entities/events/routes registered in BFA? Is there a DR entry for each architectural decision? |
| P7 | Local Testability | Do all 4 test layers (unit/sim/e2e/docker) exist? Does `npm test` pass with zero cloud credentials? |
| P8 | Local Model | Are high-quality run traces captured as training data? Is there a cost-tracking mechanism? |

**Red flags — say these and the plan is REJECTED:**
```
"we'll add tenant isolation later"      → P1 violation
"global config"                         → P1 + P2 violation
"hardcoded prompt string"               → P3 violation
"tests need an API key"                 → P7 violation
"fixed directly in the output file"     → P5 violation
"just use Claude by default"            → P6 violation (no arbiter)
```

---

## 6. THE 15 FC CLASSES — QUICK REFERENCE

Plan-review-skill catches these. If any fires, fix it before proceeding.

| FC | What it catches | Most common cause |
|----|----------------|------------------|
| FC-1 | Count drift | Updated in one place, stale in 4 others |
| FC-2 | Wrong file paths | Copied from memory, not from `find` output |
| FC-3 | Phantom skills | Conceptual placeholder left in numbered load order |
| FC-4 | Duplicate numbers | Two sections both use numbers 18–20 |
| FC-5 | Missing from a list | Skill added to Phase 1 but not to load order or B-0 |
| FC-6 | Stale numbers | Artifact numbers from memory vs live CLAUDE.md |
| FC-7 | Wrong phase | Skill moved to P1, P3 still claims it |
| FC-8 | Wrong format | Merged analysis+execution doc sent to Claude Code |
| FC-9 | Undefined requirement | "UI e2e" with no project-specific definition |
| FC-10 | Propagation failure | Fixed in overview, stale in Phase 12 session-end |
| FC-11 | Overview≠detail | Phase header says 2 skills, deliverable has 3 |
| FC-12 | Principles missing | Plan exists without addressing P1–P8 |
| FC-13 | Chain arithmetic | baseline + Σ(deltas) ≠ final expected count |
| FC-14 | Blast radius untagged | CI file edited with no syntax validation gate |
| FC-15 | API shape assumed | Test import not verified against actual source export |

---

## 7. APPROVING PHASES

Claude Code stops after every phase and waits. Your signals:

| What you type | What happens |
|--------------|-------------|
| `"yes"` / `"continue"` | Execute next phase |
| `"yes 3 only"` | Execute phase 3, then stop regardless |
| `"proceed to 5"` | Execute phase 5 specifically |
| `"no"` / `"stop"` | Do not proceed, present current state |

Claude Code **never** chains phases without your explicit per-phase approval. Time pressure is not a reason to proceed.

---

## 8. WHAT CLAUDE CODE RECEIVES

The handoff package is always these 4 files:

```
STATE.json
├── current_session: 0          ← Claude Code reads this first
├── total_sessions: N
├── test_baselines:
│   ├── server: ≥ 2,342
│   └── client: ≥ 220
└── artifact_numbers: READ_FROM_LIVE_DOCS

SESSION-0-PLAN-REVIEW.md        ← FC-1 through FC-15 checks
SESSION-1-[TITLE].md            ← first executable phase
docs/REFERENCE-PLAN.md          ← context only (labeled: DO NOT EXECUTE)
```

Claude Code workflow:
1. Read `STATE.json` → `current_session: 0`
2. Open `SESSION-0-PLAN-REVIEW.md`
3. Run all 15 FC checks
4. Produce structured report → ⛔ STOP → present to you
5. After Gate B (2 AI models) and Gate C (your approval) → open `SESSION-1`

---

## 9. FILES IN THIS PACKAGE

```
INSTRUCTIONS.md                         ← this file
NEW-TASK-PLANNING-PROMPT.md             ← paste at session start, fill in brackets
README.md                               ← package overview and skill inventory

.claude/skills/
├── agent-output-format-skill/          ← FORMAT enforcement
│   ├── SKILL.md
│   ├── AGENTS.md
│   ├── skill.yaml
│   └── references/foundational-principles.md
│
├── xiigen-core-principles-skill/       ← 8 PRINCIPLES gate
│   ├── SKILL.md
│   ├── AGENTS.md
│   └── skill.yaml
│
├── plan-review-skill/                  ← 15 FC CONSISTENCY checks + 7 SFA
│   ├── SKILL.md
│   ├── AGENTS.md
│   ├── skill.yaml
│   ├── SESSION-0-PLAN-REVIEW-TEMPLATE.md
│   └── references/
│       ├── foundational-principles.md
│       ├── failure-class-catalog.md    ← 23 real issues with timeline
│       ├── root-cause-analysis.md      ← WHY each FC class recurs
│       └── detection-commands.md       ← grep/python scripts for each FC
│
├── how-to-prepare-a-plan-skill/        ← ORCHESTRATOR (sequences 1-5)
│   ├── SKILL.md
│   ├── AGENTS.md
│   └── skill.yaml
│
└── v17-skill-library-reference/        ← LOOKUP TABLE (used by infrastructure-discovery)
    ├── SKILL.md                        (64-skill index: layer map, descriptions, Node.js alt paths)
    ├── AGENTS.md                       (top-10 skills, NestJS adaptation rules)
    └── skill.yaml

Note: v17-skill-library-reference is a reference companion, not a numbered pipeline step.
Load it when infrastructure-discovery needs to check "does this already exist?"

v17-skill-library-reference/            ← REFERENCE COMPANION (not a pipeline gate)
├── SKILL.md   (64 skills indexed, language alts per skill, 50 framework alternatives)
├── AGENTS.md  (top-10, NestJS adaptation table, pre-check list)
└── skill.yaml
```

---

## 10. TROUBLESHOOTING

**"Claude isn't loading the skills"**
→ Explicitly say: _"Load how-to-prepare-a-plan-skill from .claude/skills/ and follow its pipeline."_

**"Claude keeps asking clarifying questions instead of planning"**
→ Fill in all 8 principle answers (P1–P8) in the planning prompt before sending. Unanswered principles cause back-and-forth.

**"SESSION-0 keeps failing FC checks"**
→ The detection commands in `plan-review-skill/references/detection-commands.md` show exact grep/python scripts for each FC class. Run them manually if needed.

**"Claude Code is executing multiple phases without stopping"**
→ Check that SESSION files end with `## ⛔ STOP HERE`. If missing, add it. Claude Code treats this as a hard stop.

**"Test counts don't match expected baseline"**
→ The baselines in STATE.json are minimums from the codebase at plan time. Run `npm test` live and update STATE.json with the current actual count before starting.

**"Artifact numbers conflict"**
→ Always read from `ENGINE_ARCHITECTURE_MERGED.md` at session start. Never use the numbers in CLAUDE.md or this package as gospel — they are the floor, not the ceiling.


## CRITICAL SETUP NOTE

Copy `AGENTS.md` from this package to the PROJECT ROOT (not inside `.claude/`). Claude Code loads root-level AGENTS.md automatically before every session. Without it, the session-end protocol is skipped.
