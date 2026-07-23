# PLANNING SKILLS AUDIT
## Four questions: coverage, examples, self-check, prompt construction
## Date: 2026-04-01

---

## THE FOUR QUESTIONS

1. Do we have enough planning skills for the new model?
2. Do skills have positive and negative examples?
3. Do skills guide the AI how to check itself?
4. Do planning and architecture skills feed into proper prompts at each phase step?

---

## QUESTION 1 — DO WE HAVE ENOUGH PLANNING SKILLS?

### What exists and is well-covered

The engine internals are well-covered. We have skills for:
- NODE convergence (SK-435) — how to build a verified representation
- Convergence round design (SK-452) — challenger roles, prompt templates per role
- Arbiter panel design (SK-442) — 7 arbiter roles, minimum panel by archetype
- Node design review (SK-437) — 4 checks on a completed NODE before generation
- Iron rule derivation (SK-449) — how to derive rules from failure modes
- Freedom/Machine classification (SK-451) — what is configurable vs fixed
- Plan review (SK-431 FC-1..FC-31) — 31 failure classes for plan structure
- Simulation protocol (SK-441) — tracing what handlers actually do
- Root cause ladder (SK-432) — three-level cause analysis

### What is missing for the new model (confirmed by flow plan guide)

Four new skills were identified in the gap analysis (SK-520, SK-521, SK-522, SK-524)
and are being written. But there is a fifth gap the current skill set does not cover:

**Missing: A skill that governs how the planning decisions made in Cycles 1-3
feed into the prompt construction in Cycle 4.**

The chain is:
```
User sentence → plan steps (SK-520)
Plan steps → NODEs (SK-435 + SK-452)
NODEs → iron rules (SK-449)
Iron rules → genesis prompt (???)
```

SK-449 derives the iron rules from failure modes. SK-472 (prompt patch authoring)
patches an existing prompt. But there is no skill that governs:
- How the verified NODE's 4 fields translate into the genesis prompt's sections
- Which part of the NODE becomes the system prompt
- Which part becomes the user prompt
- How the arbiter panel from planning time maps to the judge configuration at runtime

SK-435 has a section called "GENESIS PROMPT DERIVATION" but it is 6 lines and
describes the mapping at the concept level without telling Claude Code how to
construct the actual prompt text.

**Verdict on Question 1:** Good coverage of engine internals. One structural gap:
no skill bridges from verified NODE to genesis prompt construction. This is the
seam between planning and generation — currently ungoverned.

---

## QUESTION 2 — DO SKILLS HAVE POSITIVE AND NEGATIVE EXAMPLES?

### What was found

Reading the files directly: the `Good:` / `Bad:` pattern that SK-520, SK-521,
SK-522, SK-524 all use does NOT exist in most of the older planning skills.

**Skills with positive/negative example pairs:**
- SK-449 (iron-rule-derivation) — YES: full derivation table with 5 failure modes → 5 rules,
  plus anti-patterns with ❌ wrong and ✅ correct restatements
- SK-437 (node-design-review) — PARTIAL: red flags with ✗ wrong pattern and
  "Rewrite:" showing the correct version — effectively a paired example
- SK-452 (convergence-round-design) — PARTIAL: challenger prompts include what
  constitutes a genuine challenge vs noise

**Skills WITHOUT positive/negative example pairs (critical gaps):**
- SK-442 (arbiter-panel-design) — describes 7 arbiter roles but no example of
  a good vs bad arbiter context package
- SK-435 (node-convergence) — describes the NODE format but no example of a
  NODE that passes all 4 checks vs one that fails
- SK-451 (freedom-machine-classification) — the classification test is well-stated
  but has no paired example of a correctly vs incorrectly classified constraint
- SK-441 (simulation-protocol) — step table format described but no example
  of a correctly completed step table vs one that misses a SILENT_FAILURE

### The pattern

Older skills (SK-426 to SK-470) describe what to do. The four new skills
(SK-520 to SK-524) consistently show what good and bad looks like side by side.
The new pattern is better — it gives the AI something to compare against.

**Verdict on Question 2:** Inconsistent. Newer skills have paired examples.
~60% of planning skills do not. The most critical missing examples are in
SK-442 (arbiter panels — used in every cycle), SK-435 (NODE format — the
central data structure), and SK-441 (simulation step table — the debugging tool).

---

## QUESTION 3 — DO SKILLS GUIDE THE AI HOW TO CHECK ITSELF?

### What was found

**The only skill explicitly designed for self-checking is SK-429
(code-execution--self-questioning-SKILL.md).** It defines the QUESTION YOURSELF
template that every ai-generate.handler prompt must include for design artifacts.
This is well-designed: the model asks itself 3+ questions, answers each, and
modifies its output before returning.

However SK-429 is in the code-execution category. It governs prompts that
generate code or design artifacts. It does NOT govern:
- Whether the Planner AI checks its own plan for coverage gaps
- Whether the Depth Decider AI checks its own LEAF/EXPAND verdict for consistency
- Whether the Node Generator AI checks its own NODE for technology neutrality

**Self-check mechanisms in planning skills:**

| Skill | Self-check mechanism | Strength |
|-------|---------------------|---------|
| SK-437 (node-design-review) | 4 checks listed as □ checkboxes | EXTERNAL — something else runs the check, not the generating AI |
| SK-443 (session-file-authoring) | 7 SK-443 bash checks | EXTERNAL — run after the file is written |
| SK-449 (iron-rule-derivation) | 4-item quality test with □ boxes | EXTERNAL — reviewer checks the rule |
| SK-452 (convergence-round-design) | "genuine vs noise" test | PARTIAL INTERNAL — the challenger is told to apply this test before raising a challenge |
| SK-429 (self-questioning) | QUESTION YOURSELF template | INTERNAL — generating model applies it |

**The gap:** SK-429's pattern (instruct the AI to question its own output before
returning it) is only applied in code generation prompts. The planning cycle
context packages do not include equivalent self-check instructions.

The Cycle 1 context package (SK-520) tells the Planner AI what to produce but
does not tell it to check its own output for coverage gaps before returning.
The Cycle 3 context package (SK-521) tells the Depth Decider what signals to
weigh but does not instruct it to verify its justification references an actual
NODE field before returning EXPAND.

**Verdict on Question 3:** Self-check exists but only in code generation
(SK-429). Planning cycle context packages do not include QUESTION YOURSELF
equivalents. The Planner AI, Depth Decider AI, and Node Generators do not
have a built-in instruction to check their own output before returning it.
This is a structural gap — it means external reviewers catch problems that
the generating AI could have caught itself.

---

## QUESTION 4 — DO PLANNING SKILLS FEED INTO PROPER PROMPTS AT EACH PHASE STEP?

### The chain that should exist

```
For each phase step:
  Planning skills determine: what the AI needs to know
  Architecture skills determine: what constraints apply
  Both together should produce: a well-structured prompt for that step's AI call
```

### What actually exists

**Planning → Prompt:** Partially connected.

SK-449 derives iron rules → these go into `contract.ironRules[]` → these go into
the genesis prompt via `buildPrompt()` in the engine. The chain exists but is
implicit — SK-449 does not say "the output of this skill becomes Section N of
the genesis prompt."

SK-442 defines arbiter context packages → these ARE the prompts for each arbiter.
The connection is explicit and well-structured. This is the best example of a
planning skill that directly governs prompt construction.

SK-452 has full challenger prompt templates → these are the prompts for
convergence challengers. Also well-structured and direct.

**Architecture skills → Prompt:** Weakly connected.

SK-437 (node design review) checks whether a NODE is ready for generation.
It does not say how the NODE's 4 fields translate into the 4 sections of the
genesis prompt. The connection is implied, not stated.

SK-435 (node-convergence) has a GENESIS PROMPT DERIVATION section. It says:
```
Section 1: intent.purpose + intent.invariants + constraints (stack-neutral)
Section 2: structure.inputShape + structure.outputShape (stack-neutral)
Section 3: quality.scoringCriteria (stack-neutral)
Section 4: stackProfiles[targetStack].implementationNotes (stack-specific)
```
This mapping exists — but it is 6 lines in a 270-line skill. Claude Code is
unlikely to find it or apply it consistently.

**What is missing:**

A skill (or explicit section in SK-435) that governs:
1. The 4-section genesis prompt structure, mapped from NODE fields
2. What makes each section strong vs weak (with examples)
3. How the QUESTION YOURSELF template (SK-429) is embedded in the prompt
4. How the arbiter panel (SK-442) connects to the judge configuration
   in the same generation cycle

Currently these four elements exist in four different skills with no
single document that assembles them for a given phase step.

**Verdict on Question 4:** The individual components exist. The arbiter
prompts (SK-442, SK-452) are well-structured. The iron rule derivation
(SK-449) feeds cleanly into prompt content. But the assembly — the skill
that says "for Phase B of any flow, here is how you take the NODE and the
iron rules and the arbiter configuration and produce the complete prompt
package for that step" — does not exist.

---

## SUMMARY TABLE

| Question | Answer | Gap severity |
|----------|--------|-------------|
| Enough planning skills? | Good coverage of engine internals. One structural gap: no skill bridges verified NODE to genesis prompt construction. | MEDIUM — affects every Cycle 4 generation |
| Positive/negative examples? | Inconsistent. New skills (SK-520-524) have paired examples. ~60% of older planning skills do not. Critical gaps in SK-442, SK-435, SK-441. | MEDIUM — affects AI's ability to self-correct |
| AI self-check guidance? | SK-429 exists for code generation only. Planning cycle context packages have no QUESTION YOURSELF equivalent. | HIGH — Planner, Depth Decider, and Node Generators run without self-check |
| Planning skills → prompt construction? | Components exist but are scattered across 4 skills with no assembly document. Arbiter prompts are well-structured. NODE→genesis prompt mapping is 6 lines buried in SK-435. | HIGH — the seam between planning and generation is ungoverned |

---

## WHAT NEEDS TO BE ADDED

In priority order:

**Priority 1 — Self-check instructions in context packages (no new skill needed)**
Add a QUESTION YOURSELF section to SK-520, SK-521, and the Cycle 2 context
template. This extends SK-429's pattern to the planning cycles. Example for
the Planner AI in SK-520:

```
QUESTION YOURSELF before returning the plan:
1. Does every intent clause from the INTENT field appear as the primary
   subject of at least one step? List each clause and its step.
2. Does any step contain a technology name? Name it if found.
3. Does any step contain "and" where each part could be a separate step?
   If yes, flag it.
If any answer reveals a problem — fix the plan before returning it.
```

**Priority 2 — NODE to genesis prompt assembly (extend SK-435 or new skill)**
The 6-line GENESIS PROMPT DERIVATION section in SK-435 needs to become a
full section with: the 4-section structure, what makes each section strong
(with a good/bad example for each section), and how SK-429's self-check
template is embedded.

**Priority 3 — Positive/negative examples for SK-442 and SK-441**
SK-442 needs one example of a correctly vs incorrectly assembled arbiter
context package. SK-441 needs one example of a step table that catches a
SILENT_FAILURE vs one that misses it. These are the two most-used skills
in every cycle and both lack paired examples.

---

## WHAT DOES NOT NEED CHANGING

The convergence challenger prompt templates in SK-452 are well-structured
and should not change. The iron rule derivation sequence in SK-449 is solid —
the derivation table with failure modes → rules is the right format and
should be the model for other skills that need examples.

The 31 FC checks in SK-431 (plan-review) are thorough for plan structure.
They do not need to be extended — they cover what they cover.
