---
name: session-file-authoring
sk_number: SK-443
version: "1.1.0"
priority: CRITICAL
load_order: 98
category: planning
author: luba
updated: "2026-04-16"
supersedes: "1.0.0"
contexts: ["web-session", "claude-code"]
description: >
  Governs the production of Claude Code execution session files (SESSION-N.md).
  Every session file must be self-contained — executable in isolation with zero
  cross-references to other documents. This skill defines the crystallization
  protocol, 8 self-containment verification checks (was 7 in v1.0), mandatory
  inline references, Gate D goal reference requirement (new v1.1), and
  anti-patterns that cause hallucinated execution.
triggers:
  - "session file"
  - "SESSION-N.md"
  - "write the session"
  - "produce the session"
  - "prepare the sessions"
  - "Gate C"
  - "Gate D"
  - "before ⛔ STOP"
  - "Claude Code will execute"
  - "self-contained"
  - "session authoring"
  - "goal advancement"
---

# Session File Authoring Skill (SK-443) v1.1

## WHAT THIS SKILL PREVENTS

A session file with cross-references, undefined variables, or prose descriptions in place of literal commands causes **hallucinated execution**: Claude Code fills the gaps with training data — producing output that looks plausible but executes the wrong thing. Historical examples:

- SESSION-3 referenced "apply P17" without quoting P17 inline → Claude Code applied its training knowledge of P17, not the current overhaul's P17
- SESSION-5 said "see REFERENCE PLAN for scoring brackets" → Claude Code inferred brackets from context, used wrong thresholds, stored corrupted scores
- SESSION-7 had `--model ${JUDGE_MODEL}` undefined in scope → silently fell back to default model, bypassed FREEDOM config, produced wrong DPO provenance

**New in v1.1:** session files that describe work without referencing the user goal produce cumulative goal drift across long efforts. Goal drift is invisible inside individual sessions and becomes visible only at delivery, when the cumulative work fails acceptance. Gate D prevents this by requiring every session file to reference the user goal it advances and the round-trip step (or acceptance criterion) it moves forward.

---

## WHEN TO INVOKE

Load before producing any SESSION-N.md file. Mandatory at Gate C AND Gate D (new v1.1).

Also load when:
- Amending an existing session file
- Any session says "Claude Code will execute this"
- Reviewing session files for another session's Gate C or Gate D
- Goal context changes mid-effort (re-verify Gate D on all active session files)

---

## THE CRYSTALLIZATION PROTOCOL

A session file is a **crystallization** of all planning knowledge into a form that Claude Code can execute without reading anything else. The test:

> **Could Claude Code execute this file starting from a fresh context with only this file and the codebase? If the answer is anything other than "yes, completely", the file is not ready.**

The crystallization protocol has five steps (was four in v1.0):

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

Do NOT abbreviate. "See tier table (ROUTING=1, SCHED=5)" is not sufficient — copy the entire 6-row table.

### Step 3 — Run the 8 self-containment checks (was 7 in v1.0)
See section below. All 8 must return 0 hits / pass.

### Step 4 — Add MANDATORY INLINE REFERENCES
See section below. Required for any session touching generation.

### Step 5 — Add Goal Advancement block (NEW v1.1)
See "GATE D: GOAL REFERENCE" section below. Required for every session file regardless of type.

---

## 8 SELF-CONTAINMENT VERIFICATION CHECKS (was 7 in v1.0)

Run all 8 against every SESSION-N.md before delivery. Expected result: 0 hits / pass.

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

# Check 8 (NEW v1.1): Goal Advancement block present
grep -n "^## Goal advancement" SESSION-*.md
# Expected: ≥1 hit per file (section must exist)
# Additionally verify:
#   - Section contains STATE.goalContext.statement verbatim quote
#   - Section contains "Round-trip step(s) advanced" line (even if "N/A")
#   - Section contains "Concrete progress" line (single sentence, non-empty)
```

**If any check returns failing hits:** crystallize the gaps before delivery (Step 2 or Step 5). A session that fails these checks will cause hallucinated execution OR cumulative goal drift.

---

## MANDATORY INLINE REFERENCES

For any session that touches flow generation, include ALL of the following verbatim in the session file — not as links, not as "see X":

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

### For any session configuring an arbiter panel (updated v1.1)

**Arbiter minimum by archetype (inline — do not reference SK-442):**
```
ARBITER MINIMUM BY ARCHETYPE (inline — P17/P20):
  ROUTING:       goal_delivery, scope_isolation, business_logic, key_principles, iron_rules
  DATA_PIPELINE: goal_delivery, scope_isolation, business_logic, security, key_principles, iron_rules
  VALIDATION:    goal_delivery, scope_isolation, business_logic, key_principles, iron_rules, completeness
  TRANSACTION:   goal_delivery, scope_isolation, business_logic, security, skills_patterns,
                 prompts_compliance, key_principles, iron_rules, completeness
  ORCHESTRATION: (same as TRANSACTION)
  SCHEDULED:     goal_delivery, scope_isolation, business_logic, security, key_principles,
                 iron_rules, completeness

goal_delivery MUST have: isolated: true, expertise: "user-goal-to-turn coverage — two-input isolation"
                         runsFirst: true (governed by SK-534)
scope_isolation governed by SK-526, runs alongside goal_delivery
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

## GATE D: GOAL REFERENCE (NEW v1.1)

Every session file — regardless of session type, regardless of whether it touches tenant-facing work — must reference the user goal it advances. Session files without a "Goal advancement" section are rejected by Gate D.

### Required Section

Every SESSION-N.md must include this section, populated literally (not placeholders):

```markdown
## Goal advancement (SK-443 Gate D / SK-536 integration)

Session advances goal (verbatim from STATE.goalContext.statement):
"[exact verbatim user goal statement — quoted, not paraphrased]"

Round-trip step(s) advanced (SK-533): [step numbers, or N/A if non-tenant-facing]
Round-trip step verification commands:
  [command 1 — expected output]
  [command 2 — expected output]
  [... one per advanced step]

Concrete progress (ONE sentence):
"By [verb] [specific artifact], [specific goal element] moves from [prior state] to [new state]."
```

### Rules

1. **Goal statement is quoted verbatim**, never paraphrased. Paraphrasing loses the user's encoded constraints.
2. **Round-trip step numbers are concrete** — "step 3" or "step 5 → step 6", not "some steps" or "marketplace-related step".
3. **N/A is valid** for non-tenant-facing work (governance sessions, docs, internal engine improvements). State "N/A — this session advances [goal] without touching tenant-visible surfaces" explicitly.
4. **Concrete progress sentence has a verb of change**: "By [X], [Y] moves from [A] to [B]." Phrasings without a state change ("explored", "considered", "made progress on") are rejected as abstract.

### Gate D Enforcement

Session file without a "Goal advancement" section: **Gate D fails**. Session file cannot be handed off to Claude Code until the section is added.

Session file with the section but with abstract concrete-progress sentence (no state change): **Gate D fails**. The sentence must be rewritten with specific before/after states.

Session file with the section but paraphrased goal statement: **Gate D fails**. Verbatim quote required.

### Goal Advancement for Multi-Session Efforts

When a goal requires multiple sessions, each session's "Concrete progress" sentence names a different state change. Cumulative progress should be traceable across session files:

- Session 1: "By authoring SK-529, load-order-0 gate moves from NOT_EXIST to EXISTS."
- Session 2: "By authoring SK-535 + SK-536, session-start governance moves from 1 skill (recon) to 3 skills (recon + mode + goal)."
- Session 3: "By authoring SK-531 + SK-537, verification layer moves from 0 to 2 verification skills."
- ...

Reading the "Concrete progress" sentence from each session file produces a trace of goal delivery over time.

---

## FOUND-ISSUE PROTOCOL

When Claude Code encounters an issue during execution (bug, unexpected state, missing file, test failure), the session file must contain this protocol:

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

## GATE C REQUIREMENTS (updated v1.1 — Gate D added)

Gate C does not pass without:

1. **SESSION files** — pass all 8 self-containment checks above (was 7 in v1.0)
2. **`FLOW-XX-ARCHITECTURE-DECISIONS.json`** — DESIGN_REASONING triples for every non-obvious decision made in this planning session (seeded to RAG at Phase A start, not Phase F)
3. **Gate D** (NEW v1.1) — every session file has a valid "Goal advancement" section

**SESSION file delivery checklist (Gate C + D combined):**
```
□ All 8 self-containment checks return 0 hits / pass
□ Every step has literal commands (not English descriptions)
□ Every gate has literal pass/fail criteria (not "verify it works")
□ DPO required fields inlined (for Phase B sessions)
□ Curriculum tier table inlined (for Phase B sessions)
□ Arbiter minimum table inlined (for sessions with arbiter config — UPDATED v1.1 includes goal_delivery + scope_isolation)
□ Absolute test gate inlined (failures === 0, not delta)
□ FOUND-ISSUE PROTOCOL inlined
□ ISSUE INVENTORY step present before every ⛔ STOP
□ ARCHITECTURE-DECISIONS.json produced and seeded path noted
□ SK uniqueness sweep run: grep -rn "SK-44[0-9]" *.md | sort
□ (NEW v1.1 — Gate D) Goal advancement section present in every session file
□ (NEW v1.1 — Gate D) Goal statement quoted verbatim from STATE.goalContext.statement
□ (NEW v1.1 — Gate D) Round-trip step(s) concrete (step numbers, or explicit N/A)
□ (NEW v1.1 — Gate D) Concrete progress sentence has verb of state change
```

---

## ANTI-PATTERNS (updated v1.1)

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
   → V9 NEVER skips. Write the interim manual path inline.

❌ 200-line session file referencing 5 other skills
   → Size is not the issue. Zero cross-references is the requirement.
   → A 500-line session file that is fully self-contained is better than
     a 50-line file that requires loading 5 other documents to execute.

❌ (NEW v1.1) Session file has no "Goal advancement" section
   → Gate D fails. Session cannot be handed off.
   → Add section with verbatim goal quote + round-trip step + concrete progress.

❌ (NEW v1.1) "This session works on the goal"
   → Abstract. No state change verb, no before/after.
   → Rewrite: "By [verb] [artifact], [goal element] moves from [A] to [B]."

❌ (NEW v1.1) Goal statement paraphrased
   → "Make things visible to tenants" instead of verbatim user text
   → Verbatim quote required. Paraphrase loses encoded constraints.
```

---

## INTEGRATION (updated v1.1)

```
Loaded by:   HOW-TO-USE-SKILLS.md at Gate C + Gate D (mandatory)
Enforced by: FC-28 (session file self-containment) in plan-review-SKILL.md
             FC-14 (goal delivery) in plan-review-SKILL.md v2.0 — requires Gate D section
Verified by: FC-8 (8 checks in v1.1) at every plan review
Feeds into:  Claude Code execution SESSION-N.md files
References:  planning--plan-review-SKILL.md v2.0 (FC-14, FC-15, FC-28, FC-29)
             code-execution--learning-signal-capture-SKILL.md (DPO fields)
             planning--arbiter-panel-design-SKILL.md v1.1 (SK-442, arbiter min table — includes Role 8)
             planning--goal-context-persistence-SKILL.md (SK-536 — provides STATE.goalContext.statement)
             planning--goal-delivery-completeness-SKILL.md (SK-534 — governs FC-14 / Gate D integration)
             planning--mvp-round-trip-verification-SKILL.md (SK-533 — round-trip step vocabulary)
```

---

## BACKWARD COMPATIBILITY — v1.0 → v1.1

Session files authored under v1.0 that passed 7 self-containment checks do NOT automatically pass v1.1's Gate D. Gate D is an additive check — existing session files must add the "Goal advancement" section to pass v1.1 review.

Re-reviewing a v1.0-authored session file under v1.1:
- If "Goal advancement" section absent: Gate D fails. Add the section before handoff.
- If "Goal advancement" section present but abstract: Gate D fails. Rewrite with concrete progress.
- If all 8 checks pass AND Gate D passes: session file is valid under v1.1.

In-flight session files authored under v1.0: may execute under v1.0 for their current session, but next review cycle adopts v1.1.
