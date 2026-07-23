---
name: session-file-authoring
sk_number: SK-443
version: "1.0.0"
priority: CRITICAL
load_order: 98
category: planning
author: luba
updated: "2026-03-25"
contexts: ["web-session", "claude-code"]
description: >
  Governs the production of Claude Code execution session files (SESSION-N.md).
  Every session file must be self-contained — executable in isolation with zero
  cross-references to other documents. This skill defines the crystallization
  protocol, 7 self-containment verification checks, mandatory inline references,
  and anti-patterns that cause hallucinated execution.
triggers:
  - "session file"
  - "SESSION-N.md"
  - "write the session"
  - "produce the session"
  - "prepare the sessions"
  - "Gate C"
  - "before ⛔ STOP"
  - "Claude Code will execute"
  - "self-contained"
  - "session authoring"
---

# Session File Authoring Skill (SK-443) v1.0

## WHAT THIS SKILL PREVENTS

A session file with cross-references, undefined variables, or prose descriptions
in place of literal commands causes **hallucinated execution**: Claude Code fills
the gaps with training data — producing output that looks plausible but executes
the wrong thing. Historical examples:

- SESSION-3 referenced "apply P17" without quoting P17 inline → Claude Code
  applied its training knowledge of P17, not the current overhaul's P17
- SESSION-5 said "see REFERENCE PLAN for scoring brackets" → Claude Code
  inferred brackets from context, used wrong thresholds, stored corrupted scores
- SESSION-7 had `--model ${JUDGE_MODEL}` undefined in scope → silently fell back
  to default model, bypassed FREEDOM config, produced wrong DPO provenance

---

## WHEN TO INVOKE

Load before producing any SESSION-N.md file. Mandatory at Gate C.

Also load when:
- Amending an existing session file
- Any session says "Claude Code will execute this"
- Reviewing session files for another session's Gate C

---

## THE CRYSTALLIZATION PROTOCOL

A session file is a **crystallization** of all planning knowledge into a
form that Claude Code can execute without reading anything else. The test:

> **Could Claude Code execute this file starting from a fresh context with
> only this file and the codebase? If the answer is anything other than
> "yes, completely", the file is not ready.**

The crystallization protocol has four steps:

### Step 1 — Identify all cross-references
List every phrase in the draft that points outside the file:
- "see PLAN.md"
- "per P17"
- "apply the convergence protocol"
- "use the archetype tier table"
- "per SK-442"
- "follow the FREEDOM config pattern"

Every item on this list is a crystallization gap.

### Step 2 — Resolve each gap
For each cross-reference:

| Gap type | Resolution |
|----------|-----------|
| Principle reference ("per P17") | Quote the principle verbatim inline in a > blockquote |
| Table reference ("use tier table") | Copy the full table into the session file |
| Skill reference ("per SK-442") | Extract the specific section needed and paste inline |
| Config pattern reference | Write the literal command with actual values |
| Plan reference ("see REFERENCE") | Extract only what's needed for this session's steps |

Do NOT abbreviate. "See tier table (ROUTING=1, SCHED=5)" is not sufficient —
copy the entire 6-row table.

### Step 3 — Run the 7 self-containment checks
See section below. All 7 must return 0 hits.

### Step 4 — Add MANDATORY INLINE REFERENCES
See section below. Required for any session touching generation.

---

## 7 SELF-CONTAINMENT VERIFICATION CHECKS

Run all 7 against every SESSION-N.md before delivery. Expected result: 0 hits.

```bash
# Check 1: no cross-references
grep -n "see \|follow \|per the \|reference plan\|see skill\|apply P[0-9]\|per P[0-9]" SESSION-*.md
# Expected: 0 hits

# Check 2: no undefined variables (every ${VAR} must be defined in same file)
grep -oP '\$\{[^}]+\}' SESSION-*.md | sort -u > /tmp/vars_used.txt
grep -oP '(?<=export )[A-Z_]+(?==)' SESSION-*.md | sort -u > /tmp/vars_defined.txt
comm -23 /tmp/vars_used.txt /tmp/vars_defined.txt
# Expected: empty output

# Check 3: no principle references (principles must be quoted, not named)
grep -n "apply M[0-9]\|apply P[0-9]\|per M[0-9]\|per P[0-9]\|see P[0-9]\|see M[0-9]" SESSION-*.md
# Expected: 0 hits

# Check 4: no unfilled placeholders
grep -n "<[A-Z_][A-Z_]*>" SESSION-*.md | grep -v "Content-Type\|<!--\|<br>"
# Expected: 0 hits

# Check 5: gate commands are literal, not English descriptions
grep -n "verify that \|check whether \|ensure the \|confirm that " SESSION-*.md
# Expected: 0 hits (use literal bash/curl/node commands, not English)

# Check 6: no mid-session skill file references
grep -n "see.*SKILL\.md\|load.*SKILL\|per.*SKILL\|read.*SKILL" SESSION-*.md
# Expected: 0 hits (skills are loaded before session starts, not during)

# Check 7: no partial API call bodies
grep -n "<insert\|<fill\|<contract here\|<full \|<paste" SESSION-*.md
# Expected: 0 hits (every API call has complete literal request body)
```

**If any check returns hits:** crystallize the gaps before delivery (Step 2).
A session that fails these checks will cause hallucinated execution.

---

## MANDATORY INLINE REFERENCES

For any session that touches flow generation, include ALL of the following
verbatim in the session file — not as links, not as "see X":

### For any session running Phase B (generation)

**DPO required fields (inline — do not reference learning-signal-capture-SKILL.md):**
```
DPO REQUIRED FIELDS (inline — P17+P18, every feedback.handler in this session):
  curriculumTier:          [1-5] — assign from tier table below, NEVER null
  chosen.model:            model family string — MUST differ from rejected.model
  rejected.model:          model family string — MUST differ from chosen.model
  modelComparison.shuffleWasApplied: true
  prompt.system:           full genesis prompt text — non-null (GAP-08)
  targetModelFamily:       freedomConfig.get('xiigen.oss_target_model') ?? 'deepseek-coder-v2'
  instructionFormat:       freedomConfig.get('xiigen.oss_instruction_format') ?? 'deepseek-coder'
  distillationReadiness:   'READY' | 'TOO_COMPLEX' | 'PENDING_SIMPLIFICATION'
```

**Curriculum tier table (inline):**
```
CURRICULUM TIER TABLE (inline — assign curriculumTier from this):
  ROUTING:       1   (simplest — idempotency, rate limiting, DNA-8)
  DATA_PIPELINE: 2   (requires Tier 1 fabric foundation)
  VALIDATION:    2   (requires Tier 1 validate.handler patterns)
  TRANSACTION:   3   (complex state — compensation, saga ordering)
  ORCHESTRATION: 4   (multi-step, event contracts, gate events)
  SCHEDULED:     5   (most complex — SLA windows, virtual clock, state machine)
```

### For any session configuring an arbiter panel

**Arbiter minimum by archetype (inline — do not reference SK-442):**
```
ARBITER MINIMUM BY ARCHETYPE (inline — P17/P20):
  ROUTING:       business_logic, key_principles, iron_rules
  DATA_PIPELINE: business_logic, security, key_principles, iron_rules
  VALIDATION:    business_logic, key_principles, iron_rules, completeness
  TRANSACTION:   business_logic, security, skills_patterns, prompts_compliance,
                 key_principles, iron_rules, completeness
  ORCHESTRATION: business_logic, security, skills_patterns, prompts_compliance,
                 key_principles, iron_rules, completeness
  SCHEDULED:     business_logic, security, key_principles, iron_rules, completeness

key_principles MUST have: isolated: true, expertise: "M1-M5 + P1-P22 + DNA-1..9 full text"
blockSemantics: ANY_BLOCK_CLASS_REJECTS (never averaged)
```

### For any session running test gates

**Absolute test gate (inline — P19):**
```
TEST GATE (inline — P19 absolute, not delta):
  cd server && npx jest 2>&1 | tail -5  → failures must === 0
  cd client && npx jest 2>&1 | tail -5  → failures must === 0
  Each skipped test: document justification inline
  "No new failures" is insufficient — failures === 0 required
```

---

## FOUND-ISSUE PROTOCOL

When Claude Code encounters an issue during execution (bug, unexpected state,
missing file, test failure), the session file must contain this protocol:

```
FOUND-ISSUE PROTOCOL (inline in every session file):
  1. STOP at the point of discovery — do not continue to next step
  2. Record in ISSUE INVENTORY:
     Issue: [description]
     Severity: BLOCKING | NON-BLOCKING
     Root cause: [one sentence]
     Fix: [literal commands] OR Escalate: [question for Luba]
  3. If BLOCKING: fix before proceeding (or escalate with full context)
  4. If NON-BLOCKING: complete current step, then fix before ⛔ STOP
  5. NEVER label as "pre-existing" without Luba written authorization
  6. NEVER skip to next step when current step has unresolved BLOCKING issue
  7. POST-FIX VERIFICATION (structural guard — prevents false FIXED claims):
     After applying any fix, grep for the old value in the file:
       grep -n "old-value" changed-file.md
     Expected: 0 hits. If hits remain, the fix is incomplete — do NOT mark FIXED.
```

**ISSUE INVENTORY format (required before every ⛔ STOP):**
```markdown
## ISSUE INVENTORY
| Issue | Status | Guard added |
|-------|--------|------------|
| [description] | FIXED: [what was done] | [structural prevention] |
| [description] | DEFERRED: [explicit Luba authorization] | — |
```

---

## GATE C REQUIREMENTS

Gate C does not pass without both:

1. **SESSION files** — pass all 7 self-containment checks above
2. **`FLOW-XX-ARCHITECTURE-DECISIONS.json`** — DESIGN_REASONING triples for every
   non-obvious decision made in this planning session (seeded to RAG at Phase A
   start, not Phase F)

**SESSION file delivery checklist (Gate C):**
```
□ All 7 self-containment checks return 0 hits
□ Every step has literal commands (not English descriptions)
□ Every gate has literal pass/fail criteria (not "verify it works")
□ DPO required fields inlined (for Phase B sessions)
□ Curriculum tier table inlined (for Phase B sessions)
□ Arbiter minimum table inlined (for sessions with arbiter config)
□ Absolute test gate inlined (failures === 0, not delta)
□ FOUND-ISSUE PROTOCOL inlined
□ ISSUE INVENTORY step present before every ⛔ STOP
□ ARCHITECTURE-DECISIONS.json produced and seeded path noted
□ SK uniqueness sweep run (C-6): grep -rn "SK-44[0-9]" *.md | sort
```

---

## ANTI-PATTERNS

```
❌ "Apply the FREEDOM config pattern from D-EXT-009"
   → Claude Code will apply training knowledge of FREEDOM config, not D-EXT-009
   → Write the literal command: freedomConfig.get('xiigen.key') ?? 'fallback'

❌ "Per P17, ensure cross-model comparison"
   → Claude Code will apply training knowledge of P17
   → Quote: "P17 (MACHINE OUTPUTS): chosen.model must != rejected.model.
     Store triple with status PENDING_COMPARISON if single provider."

❌ "Use the minimum arbiter table from SK-442"
   → SK-442 is not loaded during session execution — only at session authoring time
   → Copy the 6-row archetype table inline (see MANDATORY INLINE REFERENCES)

❌ "See REFERENCE PLAN for score brackets"
   → REFERENCE PLAN is not in scope during Claude Code execution
   → Extract the exact brackets needed and paste inline

❌ "Fix any pre-existing test failures"
   → "Pre-existing" is not a disposition — it is an unresolved issue
   → Every failure gets FIXED or AWAITING_LUBA_DISPOSITION (never "pre-existing")

❌ "Run V9 gate when FLOW-39 is active"
   → Conditional execution based on infrastructure state leads to V9 being skipped
     every session until FLOW-39 is built, at which point all triples have null tiers
   → V9 NEVER skips. Write the interim manual path inline.

❌ 200-line session file referencing 5 other skills
   → Size is not the issue. Zero cross-references is the requirement.
   → A 500-line session file that is fully self-contained is better than
     a 50-line file that requires loading 5 other documents to execute.
```

---

## INTEGRATION

```
Loaded by:   HOW-TO-USE-SKILLS.md at Gate C (mandatory)
Enforced by: FC-28 (session file self-containment) in plan-review-SKILL.md
Verified by: FC-8 (7 checks) at every plan review
Feeds into:  Claude Code execution SESSION-N.md files
References:  planning--plan-review-SKILL.md (FC-28, FC-29)
             code-execution--learning-signal-capture-SKILL.md (DPO fields)
             planning--arbiter-panel-design-SKILL.md (SK-442, arbiter min table)
```

---

## Universal Bits (UUS G07) — crystallization for a cold reader, Gate D, TS check commands

These are the universal cross-project bits this skill must carry (imported from core via the universal-skills mapping), TS-adapted for the mvp stack (NestJS + React, Jest/Playwright). The `DataProcessResult<T>` domain wrapper is the mvp convention; the core `OperationResult<T>` stays in `llm_mvp_core` and never leaks here.

### Crystallization = self-contained for a cold reader (8 self-containment checks)

The crystallization test ("could a fresh-context reader execute this file with only this file + the codebase?") is the universal core. A self-contained session file has **no references to past session files, no implicit state, and every abbreviation expanded on first use**. The 7 checks above are mvp-specific; the universal set is **8 checks** — the 8th is **Gate D (goal advancement)** below, which is mandatory, not optional.

### Gate D — goal advancement (mandatory)

A session file is not admissible unless it advances the stated goal — not merely "does some work." Add this block to every session file and verify it at Gate C:

```markdown
## GATE D — GOAL ADVANCEMENT (mandatory)
Goal (verbatim):        [the goal this session advances, copied exactly]
This session advances:  [which concrete part of the goal moves from not-done to done]
Done-state difference:  [what is true after this session that was not true before]
Verify advancement:     [one binary command whose output proves the difference]
                        Expected: [exact expected result]
```

If the session cannot name a goal-state difference plus a binary command that proves it, the file fails Gate D. "Wrote files / ran tests" with no goal delta is a Gate-D failure.

### Check commands adapted to the mvp stack

The bash self-containment checks above target generic `SESSION-*.md`. For mvp, the live baseline and naming commands are:

```bash
# Test baseline (Check 7) — Jest, not dotnet test:
cd server && npx jest 2>&1 | grep "Tests:" | tail -1
cd client && npx jest 2>&1 | grep "Tests:" | tail -1
# Optional e2e baseline:
npx playwright test --list 2>&1 | tail -1

# Self-containment scan over the mvp session-file naming family:
grep -rn "see \|follow \|per the \|apply P[0-9]" XIIGEN-SESSION-*.md SESSION-*.md
# Expected: 0 hits
```

When the repo uses `XIIGEN-SESSION-*` names, the `grep "SESSION-P[0-9]"` / `dotnet test` patterns inherited from core do not run as-is — substitute the Jest commands and the `XIIGEN-SESSION-*` glob above so the checks actually execute. The header template lives next to `SESSION-0-PLAN-REVIEW-TEMPLATE.md`.
