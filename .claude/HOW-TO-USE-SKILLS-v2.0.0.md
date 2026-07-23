# HOW TO USE XIIGEN SKILLS — v2.0.0
## Updated: 2026-03-25 | For: Claude.ai Project custom instructions
## Supersedes: v1.0.4 (2026-03-24)

---

## SESSION TYPE CLASSIFICATION

BEFORE applying any governance rule, classify the session:

**GENERATION SESSION:** producing flow phases, service code, topology contracts
→ Full governance chain applies. Plan gates. ⛔ STOP after each phase.

**MAINTENANCE SESSION:** fixing files, updating skills, creating zips, documentation
→ Execute directly. Plan is internal. No intermediate stops.
→ Luba's direct instruction is the scope. Complete it fully. One ⛔ STOP at end.

**PLANNING SESSION (web):** designing flows, reviewing plans
→ Plan gates apply. Present plan. Await "yes" before session files.

The word "fix" = MAINTENANCE SESSION. Execute, do not plan-gate.
"prepare a plan" in a MAINTENANCE SESSION = internal artifact, not a gate.
"I can reload" = full directory mirror zip, not a diff.

---

## MANDATORY CHECKS BEFORE EVERY ⛔ STOP

These three checks are NON-NEGOTIABLE. Every ⛔ STOP in every session type.

### 1. MISSION PROGRESS CHECK (SK-445)
Load `session-output--mission-progress-SKILL.md` (SK-445) before producing
PHASE-COMPLETE or SESSION-BRIEF. Its output is the FIRST section.
Query ES — never estimate. State PENDING if index absent.

### 2. ISSUE INVENTORY CHECK (FC-29)
```markdown
## ISSUE INVENTORY
| Issue | Status | Guard added |
|-------|--------|------------|
| [description] | FIXED: [what was done] | [structural prevention] |
| [description] | DEFERRED: [Luba written authorization] | — |
```
"Pre-existing — not introduced by this session" is NOT a valid status.
Every issue gets FIXED or explicit DEFERRED with authorization.

### 3. TEST GATE — ABSOLUTE (P19, HEALTH-001)
```bash
cd server && npx jest 2>&1 | tail -5   # failures must === 0
cd client && npx jest 2>&1 | tail -5   # failures must === 0
```
"No regressions" is insufficient. `failures === 0` is required.
Each skipped test needs documented justification inline.

---

## SESSION FILE FORMAT GATE (FC-28 — Gate C)

Every Claude Code execution file (SESSION-N.md) must pass ALL 7 checks:

```bash
# Check 1: no cross-references
grep -n "see \|follow \|per the \|reference plan\|apply P[0-9]\|per P[0-9]" SESSION-*.md

# Check 2: no undefined variables
grep -oP '\$\{[^}]+\}' SESSION-*.md | sort -u > /tmp/vars_used.txt
grep -oP '(?<=export )[A-Z_]+(?==)' SESSION-*.md | sort -u > /tmp/vars_defined.txt
comm -23 /tmp/vars_used.txt /tmp/vars_defined.txt

# Check 3: no principle references (must be quoted inline)
grep -n "apply M[0-9]\|per M[0-9]\|apply P[0-9]\|per P[0-9]\|see P[0-9]" SESSION-*.md

# Check 4: no unfilled placeholders
grep -n "<[A-Z_][A-Z_]*>" SESSION-*.md | grep -v "Content-Type\|<!--\|<br>"

# Check 5: gate commands are literal, not English
grep -n "verify that \|check whether \|ensure the " SESSION-*.md

# Check 6: no mid-session skill references
grep -n "see.*SKILL\.md\|load.*SKILL\|per.*SKILL" SESSION-*.md

# Check 7: no partial API bodies
grep -n "<insert\|<fill\|<contract here\|<paste" SESSION-*.md
```
All 7 must return 0 hits. See `planning--session-file-authoring-SKILL.md` (SK-443).

---

## FOUND-ISSUE PROTOCOL

When ANY issue is discovered during a session (execution or planning):

1. STOP at the point of discovery
2. Record immediately:
   - Issue description (one sentence)
   - Severity: BLOCKING | NON-BLOCKING
   - Root cause (one sentence — not "unexpected state")
   - Proposed fix (literal commands) OR escalation question for Luba
3. If BLOCKING: fix before next step (or escalate)
4. If NON-BLOCKING: complete current step, fix before ⛔ STOP
5. Never label "pre-existing" without Luba written authorization
6. Never skip steps with unresolved BLOCKING issues
7. POST-FIX VERIFICATION: after applying any fix, grep for the old value:
     `grep -n "old-value" changed-file.md` → expected 0 hits
   If hits remain, the fix is incomplete — do NOT mark FIXED in ISSUE INVENTORY.

Applying Golden Rule to every found issue: the instance fix AND the structural guard.

---

## SKILL ACTIVATION TRIGGERS

### Always-on (load at session start based on session type)

| When | Load |
|------|------|
| Any session where a problem is presented | `planning--problem-decomposition-SKILL.md` |
| Any review document, map, or claimed number received | `planning--claim-verification-SKILL.md` |
| Before any solution is proposed | `planning--solution-scope-gate-SKILL.md` |
| When person challenges the LEVEL (not content) of a proposal | `planning--level-correction-response-SKILL.md` (SK-439) |
| At the START of any task that changes skills, flows, artifacts, or plans | `planning--change-propagation-SKILL.md` (SK-440) |
| Planning session start | `planning--planning-session-startup-SKILL.md` (SK-416) |
| Any planning session | `pipeline--infrastructure-discovery-SKILL.md` (with steps 0.5 + 1.5) |
| At the START of every analysis or planning session | `planning--claim-verification-SKILL.md` — SESSION-OPENING STATE PROTOCOL section |
| Before ANY proposal in a planning session | `planning--architectural-decision-testing-SKILL.md` — DECISION LOADING section |

### Flow design (load during planning and generation)

| When | Load |
|------|------|
| Before any Phase A content | `planning--bootstrap-boundary-SKILL.md` |
| For each capability in plan | `planning--flow-vs-service-gate-SKILL.md` |
| Before Phase A seeding | Node convergence: build NODE for each task type |
| Writing topology contracts | `code-execution--topology-structure-SKILL.md` (SK-428) |
| Writing any multi-generate or arbiter-panel node | `planning--arbiter-panel-design-SKILL.md` (SK-442) |
| Escalation orchestrator configuration | `planning--escalation-orchestrator-SKILL.md` (SK-446) |
| Principles arbiter configuration | `planning--principles-arbiter-SKILL.md` (SK-444) |
| Writing ai-generate prompts | `code-execution--self-questioning-SKILL.md` |
| Writing feedback.handler | `code-execution--learning-signal-capture-SKILL.md` |
| After NODE built | `planning--node-design-review-SKILL.md` |
| Reviewing flow plans | `planning--flow-design-cycle-SKILL.md` |
| Gate C approval → SESSION files | `planning--session-file-authoring-SKILL.md` (SK-443) ← MANDATORY |
| Gate C approval | Produce `ARCHITECTURE-DECISIONS.json` + `planning--architectural-decision-testing-SKILL.md` |

### Session output (before every ⛔ STOP)

| When | Load |
|------|------|
| Before every ⛔ STOP (all session types) | `session-output--mission-progress-SKILL.md` (SK-445) |
| End of investigation session | `session-output--investigation-handoff-SKILL.md` |

### Investigation and analysis

| When | Load |
|------|------|
| Cross-branch work, merge analysis | `code-execution--github-lab-SKILL.md` |
| Problem has recurred ("we fixed this before") | `planning--root-cause-ladder-SKILL.md` |
| Evaluating whether XIIGen can handle a scenario | `planning--simulation-protocol-SKILL.md` (SK-441) |
| Gap analysis — after simulations, before planning | `planning--simulation-protocol-SKILL.md` (SK-441) + `planning--solution-scope-gate-SKILL.md` + `planning--root-cause-ladder-SKILL.md` |
| Before drafting ANY session files after analysis | `planning--level-correction-response-SKILL.md` — PROACTIVE REFRAME SCAN section |

---

## THE PLANNING PIPELINE — STEP ORDER (v2.0.0)

```
⓪     solution-scope-gate          Before ANY solution is proposed
⓪     problem-decomposition        If session is problem-driven
⓪     root-cause-ladder            If problem has recurred
⓪     implementation-mode-gate     Who writes code?
⓪.5   flow-vs-service-gate         FLOW or SERVICE for each capability?
①     agent-output-format-skill
②     xiigen-core-principles       M1-M5 + P1-P22 (v2.0: M-layer added)
③     planning-session-startup
③.5   architectural-decision-testing  DECISION LOADING — before any proposal
④     infrastructure-discovery     Steps 0.5 + 1.5
④.5   NODE CONVERGENCE             Before Phase A content — build verified NODE
⑤     planning-skill (8 gates)     node: field required in all FLOW task types
⑥     plan-review-skill            FC-1..FC-31 (v2.0: FC-26..31 added)
⑦     flow-reexamination
⑧     naming-conventions-enforcer
⑨     stack-coupling-auditor
⑩     node-design-review           After NODE built, before Phase B
GATE C → session-file-authoring (SK-443) ← MANDATORY v2.0 addition
GATE C → ARCHITECTURE-DECISIONS.json (required before session files)
⑪     architectural-decision-testing (immediate tests at Gate C)

Before every ⛔ STOP → session-output--mission-progress (SK-445) ← MANDATORY v2.0

ANALYSIS PIPELINE (when evaluating gaps, not designing a flow):
⓪     claim-verification           SESSION-OPENING STATE PROTOCOL
⓪.5   architectural-decision-testing  DECISION LOADING
①     simulation-protocol (SK-441) Trace actual handlers per scenario — L1/L2/L3
②     solution-scope-gate          GAP CLASSIFICATION + deduplication + distribution
③     root-cause-ladder            CROSS-GAP CONVERGENCE — collapse N gaps to K roots
④     level-correction-response    PROACTIVE REFRAME SCAN — before session files
⑤     PLAN — rooted in simulation evidence
```

---

## GATE C MANDATORY OUTPUT (v2.0.0)

Gate C does NOT pass without ALL THREE:

1. **SESSION files** — pass all 7 self-containment checks (FC-28, SK-443)
2. **`FLOW-XX-ARCHITECTURE-DECISIONS.json`** — DESIGN_REASONING triples for every
   non-obvious decision (seeded to RAG at Phase A start)
3. **SK uniqueness sweep** — `grep -rn "SK-44[0-9]" .claude/skills/ *.md | grep -v SKILL-INDEX | sort`
   → Zero collisions before delivery (C-6)

---

## WHAT CHANGED IN v2.0.0

Source: XIIGen Skills Overhaul — S1-S5 (2026-03-25)

v1.0.4 added analysis rigor (simulation, gap taxonomy, reframe scans).
v2.0.0 adds the teaching/independence layer: arbiter panels, DPO quality gates,
mission progress visibility, and session file integrity enforcement.

| Change | Skill | What it adds |
|--------|-------|-------------|
| NEW SK-442 | arbiter-panel-design | 7 specialized arbiters, upper judge, arbiterConfig template |
| NEW SK-443 | session-file-authoring | Crystallization protocol, 7 self-containment checks, mandatory inline refs |
| NEW SK-444 | principles-arbiter | Isolation rule, growth rule, self-reinforcement |
| NEW SK-445 | mission-progress | 5 mandatory mission questions, DECISION THRESHOLDS, ENGINE PROGRESS table |
| NEW SK-446 | escalation-orchestrator | 6 decision rules, ARBITER_VERDICT/DISAGREEMENT signals |
| EXTEND | plan-review | FC-26..31 added, FC-8 expanded, FC-12 updated to M1-M5+P1-P22 |
| EXTEND | learning-signal-capture | 9 signal types, DPO VALIDITY GATE, MODEL_COMPARISON/SHADOW_RUN/ARBITER_VERDICT |
| EXTEND | flow-implementation-guide | V5 absolute gate, V9 skip removed, V9-002..004, V10 MISSION PROGRESS, V11 SHADOW RUN |
| EXTEND | flow-design-check-catalog | LEARNING-003..007, HEALTH-001, ISSUE-001, ARBITER-001..003 |
| EXTEND | simulation-protocol | 3 SILENT_FAILURE patterns: single-model DPO, same-model score, FLOW-39 masking |
| EXTEND | node-convergence | Runtime Application section — convergence roles to runtime arbiters |
| EXTEND | topology-structure | 9 handlers, Pattern F multi-arbiter, P17 anti-patterns |
| EXTEND HOW-TO-USE | this file | MANDATORY CHECKS, SESSION FILE FORMAT GATE, FOUND-ISSUE PROTOCOL |

**New mandatory additions to every ⛔ STOP:**
- MISSION PROGRESS CHECK (SK-445) — load before PHASE-COMPLETE
- ISSUE INVENTORY CHECK (FC-29) — "pre-existing" banned
- ABSOLUTE TEST GATE (P19/HEALTH-001) — failures === 0

**New mandatory Gate C requirement:**
- `planning--session-file-authoring-SKILL.md` (SK-443) — all session files
  must pass 7 self-containment checks before Claude Code receives them

---

## SK UNIQUENESS GUARD (C-6)

Before any session assigns a new SK number or delivers files:
```bash
grep -rn "SK-44[0-9]" .claude/skills/ *.md | grep -v SKILL-INDEX | sort
```
Any SK number appearing with two different skill names = collision. Resolve before
proceeding. This guard prevented a recurring collision across 5 reviews in S2.

---

## WHAT EACH SKILL PREVENTS (v2.0.0 additions)

| Skill | What it prevents |
|-------|-----------------|
| arbiter-panel-design (SK-442) | Single judge with no domain expertise averaging all outputs |
| session-file-authoring (SK-443) | Hallucinated execution from cross-reference gaps |
| principles-arbiter (SK-444) | Domain context contaminating principle compliance checks |
| mission-progress (SK-445) | Luba working blind after every session on graduation timeline |
| escalation-orchestrator (SK-446) | BLOCK verdicts averaged away instead of enforced |
| FC-26 (plan-review) | Topologies with missing arbiters deploying to production |
| FC-28 (plan-review) | SESSION files requiring other documents to execute |
| FC-29 (plan-review) | "Pre-existing" used as a resolution for real bugs |
| FC-31 (plan-review) | Hardcoded model names in schemas breaking FREEDOM config |
| DPO VALIDITY GATE (learning-signal) | Same-model triples corrupting fine-tuning data |
| SHADOW_RUN signal (learning-signal) | Independence timeline unknown indefinitely |
| V9-never-skip (flow-implementation) | 24 flows with null curriculumTier when FLOW-39 activates |
| SILENT_FAILURE: single-model DPO | Training on intra-model style drift, not quality comparison |
| SILENT_FAILURE: same-model score | Inflated scores reinforcing bad patterns in learning loop |
| SILENT_FAILURE: FLOW-39 masking | V9 skipping every session → entire DPO corpus unusable |

---

## APPLIES IMMEDIATELY vs NEEDS INFRASTRUCTURE

### Use now (no infrastructure needed):
- All 5 new skills (SK-442..446)
- FC-26..31 plan review checks
- DPO VALIDITY GATE (enforced at authoring time)
- SHADOW_RUN placeholder creation (ossScore:null)
- SK-443 session file self-containment (manual authoring discipline)
- SK-445 mission progress (ES queries, manual if ES absent)
- MISSION PROGRESS in every ⛔ STOP (SK-445)
- FOUND-ISSUE PROTOCOL in every session
- SESSION FILE FORMAT GATE (7 checks before every Gate C)
- V9 never-skip (manual interim path when FLOW-39 inactive)

### Needs Task 7 (convergence.handler):
- SK-435 node-convergence (automated execution)
- CONVERGENCE_SESSION signal capture
- Automated convergence NODE building

### Needs Task 6 (semantic RAG):
- Infrastructure-discovery full validation
- Phase F self-model update steps
- P16 verification

### Needs FLOW-39 (curriculum sequencer):
- Automatic curriculumTier assignment (manual path available without it)
- DISTILLED_RULE count increase (V9-001)
- OSS target model sequencing

---

## THE DEPENDENCY MAP — BLAST RADIUS BY CHANGE TYPE

**Use `planning--change-propagation-SKILL.md` (SK-440) at the START of any task.**

### SKILL ADDED
```
□ FLOW-DESIGN-SKILL-INDEX.md     — skill table, header count, "what changed"
□ HOW-TO-USE-SKILLS.md           — triggers table, prevents table, inventory count+list
□ INTEGRATION-INSTRUCTIONS.md   — Step 1 cp block, Step 3 AGENTS.md, Step 4 SKILL-INDEX
□ .claude/skills/SKILL-INDEX.md  — add row (Claude Code session)
□ .claude/AGENTS.md              — load_order + triggers (Claude Code session)
□ SK uniqueness guard (C-6):     grep -rn "SK-44[0-9]" .claude/skills/ | sort
```

### SKILL UPDATED (content change, no new file)
```
□ FLOW-DESIGN-SKILL-INDEX.md     — "what changed" section
□ HOW-TO-USE-SKILLS.md           — only if when/what-prevents changes
□ INTEGRATION-INSTRUCTIONS.md   — Step 5 verify if new content is checkable
□ Any skill that cross-references this skill by name
□ FC-10 propagation sweep:       grep -rn "old-phrase" *.md — verify 0 remaining
```

### FLOW ADDED
```
□ CLAUDE.md                       — next T, F, Family, CF numbers
□ INFRASTRUCTURE-FLOWS-STATE      — new flow entry + execution order
□ xiigen-rag-patterns             — ARTIFACT_RANGE (Phase F), NODE_REPRESENTATION (Phase A)
□ PARALLEL-EXECUTION-PLAN.md      — if wave assignment affected
□ Memory entries                  — execution position + next numbers
□ DECISIONS-LOCKED.md             — decisions from planning
□ FLOW-XX-ARCHITECTURE-DECISIONS  — DESIGN_REASONING triples from Gate C
```

### PLAN PRODUCED OR AMENDED
```
□ FLOW-XX-REFERENCE-PLAN.md       — the plan itself
□ Existing SESSION files          — if amendment affects them (must re-pass FC-28)
□ DECISIONS-LOCKED.md             — new locked decisions
□ FLOW-XX-ARCHITECTURE-DECISIONS  — DESIGN_REASONING triples
□ INFRASTRUCTURE-FLOWS-STATE      — if execution order changes
□ Memory entries                  — if pre-FLOW-01 task status changes
```

**Rule:** files in the codebase (`.claude/`) require a Claude Code session.
Flag them explicitly — don't silently skip them.

---

## FILE INVENTORY (v2.0.0 project zip — 22 files in overhaul package + 28 carry-forward)

**New in v2.0.0 (17 files, S1-S5):**

**2 patch files:**
- `PATCH--xiigen-core-principles-M1-M5-P17-P22.md` — M1-M5 mission layer + P17-P22
- `PATCH--judge-model-freedom-config.md` — D-EXT-009 FREEDOM config for judge model

**4 setup/governance docs:**
- `XIIGEN-SESSION-START-PROMPT-v2.md` — rewritten session start with MISSION STATE
- `XIIGEN-GOLDEN-RULE.md` — Gap A/B/C, canonical document homes, FC-31 detection
- `XIIGEN-V2-MASTER-PLAN.md` — full 7-session overhaul plan
- `CARRY-FORWARD-ISSUES.md` — 20 tracked issues with session owners

**5 new skills:**
- `planning--arbiter-panel-design-SKILL.md` (SK-442)
- `planning--session-file-authoring-SKILL.md` (SK-443) ← THIS FILE'S CATEGORY
- `planning--principles-arbiter-SKILL.md` (SK-444)
- `session-output--mission-progress-SKILL.md` (SK-445)
- `planning--escalation-orchestrator-SKILL.md` (SK-446)

**6 updated skills:**
- `planning--plan-review-SKILL.md` — FC-26..31, FC-8 expanded, FC-12 updated
- `code-execution--learning-signal-capture-SKILL.md` — 9 signal types, DPO VALIDITY GATE
- `code-execution--flow-design-check-catalog.md` — LEARNING-003..007, HEALTH-001, ISSUE-001, ARBITER-001..003
- `code-execution--flow-implementation-guide-SKILL.md` — V5/V9/V10/V11 updated
- `planning--simulation-protocol-SKILL.md` — 3 new SILENT_FAILURE patterns
- `code-execution--topology-structure-SKILL.md` — 9 handlers, Pattern F
- `code-execution--node-convergence-SKILL.md` — Runtime Application section

**Carry-forward from v1.0.4 (unchanged):**
All 28 v1.0.4 skills not listed above carry forward unmodified.
