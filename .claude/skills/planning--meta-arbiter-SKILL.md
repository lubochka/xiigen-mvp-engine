---
name: meta-arbiter
sk_number: SK-525
version: "1.0.0"
priority: HIGH
load_order: 99
category: planning
author: luba
updated: "2026-04-01"
contexts: ["web-session", "claude-code"]
description: >
  Governs the Meta-Arbiter — the player that evaluates not what was produced
  but HOW the system produced it. Fires on bad grade (below threshold). Runs
  a 4-step diagnosis protocol to identify which layer failed: retrieval,
  assembly, prompt, or skill content. Produces improvement proposals
  (PROMPT_PATCH or SKILL_EDIT in Phase 1). A second blind-ranking call
  ranks proposals before they reach Luba for approval. Nothing is applied
  without explicit approval. Phase 1 scope: PROMPT_PATCH + SKILL_EDIT only.
  CONNECTION_CHANGE and RETRIEVAL_CHANGE deferred to Phase 2.
triggers:
  - "meta-arbiter"
  - "grade below threshold"
  - "repeated failure"
  - "improve the skill"
  - "prompt improvement proposal"
  - "skill edit proposal"
  - "system self-improvement"
  - "execution review"
  - "why did this fail"
  - "what should we change"
player_types:   [meta_arbiter]
node_types:     [ANY]
decision_point: [evaluate_system, propose_improvement]
tree_types:     [ANY]
relevant_when:
  grade_below_threshold: true
  at_depth: ANY
  is_leaf: ANY
---

# Meta-Arbiter Skill (SK-525) v1.0

## WHAT THIS SKILL PREVENTS

1. **Silent degradation.** A system that fails repeatedly without diagnosing
   why will keep failing. The Meta-Arbiter ensures every bad grade produces
   a traceable diagnosis and a concrete improvement proposal — not just a
   re-run with the same inputs.

2. **Wrong-layer fixes.** Patching the prompt when the skill content is wrong
   treats the symptom. Editing the skill when the retrieval path is the problem
   wastes effort. The 4-step diagnosis protocol identifies which layer failed
   before any proposal is made.

3. **Self-referential ranking bias.** The model that diagnosed the problem ranks
   its own proposals highest. Blind ranking by a separate model prevents this —
   the ranker sees the proposals and the execution record but not the diagnosis
   reasoning.

4. **Unapproved system changes.** A Meta-Arbiter that applies its own proposals
   can corrupt the system silently. Every proposal requires explicit Luba
   approval before anything changes. Proposals are stored as PROPOSED — never
   applied automatically.

---

## WHEN TO INVOKE

The Meta-Arbiter fires when ANY of these conditions is true:

```
SITUATION 1 — Single bad grade:
  grade < threshold
  (first occurrence — diagnosis runs, one proposal produced)

SITUATION 2 — Repeated failure pattern:
  grade < threshold
  AND same node_type + neighborhood context failed N ≥ 3 times
  (pattern — diagnosis runs across all N executions, up to 3 proposals ranked)

SITUATION 3 — Regression:
  grade < threshold
  AND grade < prior_grade for this node_type + neighborhood context
  (something changed and made things worse — regression diagnosis runs first)
```

The Meta-Arbiter does NOT fire when:
- grade ≥ threshold (even if grade dropped slightly from prior run)
- grade < threshold but this is the node_type's very first execution
  (no prior art to compare — Situation 1 applies but regression check skips)

---

## SECTION 1 — THE EXECUTION RECORD

The Meta-Arbiter receives one execution record. This is the complete picture
of what happened in the failed cycle. The diagnosis protocol reads every field.

```json
{
  "execution_id":    "unique identifier for this cycle execution",
  "flow_id":         "FLOW-XX",
  "node_id":         "unique identifier for this task node",

  "grade":           0.72,
  "threshold":       0.85,
  "passed":          false,
  "grade_delta":     -0.08,

  "node_type":       "ROUTING",
  "tree_type":       "member-registration",
  "player_type":     "executor",
  "decision_point":  "generate",

  "neighborhood": {
    "parent_type":    "ORCHESTRATION",
    "sibling_types":  ["ROUTING", "ROUTING"],
    "depth":          2,
    "topology_layer": 2
  },

  "retrieval": {
    "query":          "player=executor node_type=ROUTING tree_type=member-registration depth=2 parent=ORCHESTRATION",
    "skills_retrieved": ["SK-449", "SK-442", "SK-437"],
    "retrieval_path": ["direct:SK-449", "CONTAINS:ROUTING→SK-442", "GOVERNED_BY:SK-437"],
    "skills_expected": ["SK-449", "SK-442", "SK-437", "SK-452"],
    "retrieval_gap":  ["SK-452"]
  },

  "prompt": {
    "context_package_hash": "abc123",
    "sections_present":     ["INTENT", "DOMAIN", "CONSTRAINTS", "PRIOR_ART", "SUCCESS"],
    "self_check_present":   false,
    "iron_rules_count":     3,
    "arbiter_config":       "ROUTING minimum panel"
  },

  "model": {
    "generator_models": ["anthropic/claude", "google/gemini"],
    "judge_model":      "anthropic/claude-sonnet",
    "winner_label":     "B",
    "scores":           {"A": 0.72, "B": 0.81, "C": 0.64}
  },

  "arbiter_verdicts": {
    "iron_rules":       "BLOCK — CF-1 email uniqueness not enforced before write",
    "key_principles":   "PASS",
    "business_logic":   "CONCERN — idempotency key format does not match DNA-7"
  },

  "prior_grades": [0.88, 0.85, 0.79, 0.72],

  "recent_changes": [
    {
      "type":      "SKILL_EDIT",
      "target":    "SK-449 Section 3",
      "changed_at": "2026-03-28",
      "approved_by": "luba"
    }
  ]
}
```

---

## SECTION 2 — THE 4-STEP DIAGNOSIS PROTOCOL

Run steps in order. Stop at the first step that identifies the failure layer.
Do not run all 4 steps and average — the first match is the root cause.

### Step 1 — Check retrieval

**Question:** Were the right skills retrieved for this node's context?

```
Compare:
  execution_record.retrieval.skills_retrieved
  vs
  execution_record.retrieval.skills_expected

If skills_expected contains items NOT in skills_retrieved:
  → retrieval_gap is non-empty
  → The failure is at the RETRIEVAL layer
  → In Phase 1: flag the gap, note it in the proposal
    (Phase 2 will produce CONNECTION_CHANGE or RETRIEVAL_CHANGE)
  → Proceed to Step 2 anyway — retrieval gap may compound a skill gap

If retrieval_gap is empty:
  → All expected skills were retrieved
  → Retrieval layer is not the primary cause
  → Proceed to Step 2
```

### Step 2 — Check prompt assembly

**Question:** Were the retrieved skills correctly reflected in the context package?

```
Check:
  execution_record.prompt.self_check_present
  execution_record.prompt.iron_rules_count vs expected for this node_type
  execution_record.prompt.sections_present (all 5 SK-522 fields present?)

If self_check_present = false:
  → The QUESTION YOURSELF section was not included in the prompt
  → The generating model had no instruction to check its own output
  → Failure layer: ASSEMBLY — prompt was missing a required section
  → Proposal type: PROMPT_PATCH (add QUESTION YOURSELF section)
  → STOP diagnosis here — this is the primary cause

If iron_rules_count < expected_minimum for this node_type:
  → Fewer iron rules than the node type requires were included
  → Failure layer: ASSEMBLY — constraint layer was incomplete
  → Proposal type: PROMPT_PATCH (add missing iron rules section)
  → STOP diagnosis here

If all sections present and self_check present:
  → Assembly layer is not the primary cause
  → Proceed to Step 3
```

### Step 3 — Check prompt effectiveness

**Question:** Did the model follow the prompt, or did the prompt fail to guide it?

```
Evidence from execution_record:
  arbiter_verdicts — which arbiters fired BLOCK or CONCERN?
  model.scores — how far apart were the candidates?

If arbiter verdict is BLOCK on iron_rules:
  → The prompt stated iron rules but the model did not apply them
  → Two sub-cases:
    A) The iron rule was stated vaguely → PROMPT_PATCH (add WRONG/CORRECT pair)
    B) The iron rule was stated correctly → go to Step 4 (skill content problem)

  Distinguish A from B:
    Read the iron rule as stated in the context package
    Apply quality test from SK-449:
      □ Is it stated without stack names?
      □ Does it have a testable failure consequence?
      □ Does it derive from a specific failure mode?
    If ANY check fails → Sub-case A → PROMPT_PATCH
    If ALL checks pass → Sub-case B → proceed to Step 4

If arbiter verdict is CONCERN on business_logic:
  → The model produced output that partially satisfied the constraint
  → The prompt guidance was insufficient — not wrong, just too weak
  → Failure layer: PROMPT — guidance needs strengthening
  → Proposal type: PROMPT_PATCH (increase specificity per SK-472 Rule 2)
  → STOP diagnosis here

If scores are clustered (all candidates within 0.05 of each other):
  → The prompt over-specified — all models produced the same output
  → The judge had no meaningful choice
  → Failure layer: PROMPT — over-specified, reducing model contribution
  → Proposal type: PROMPT_PATCH (reduce specificity)
  → STOP diagnosis here

If model scores spread widely (>0.20 between best and worst):
  → Models diverged significantly — the prompt was unclear
  → Failure layer: PROMPT — ambiguous guidance
  → Proposal type: PROMPT_PATCH (clarify the ambiguous section)
  → STOP diagnosis here

If no prompt effectiveness signal found:
  → Proceed to Step 4
```

### Step 4 — Check skill content

**Question:** Was the skill content itself incorrect, incomplete, or missing a case?

```
This step only runs when Steps 1-3 found no primary cause in retrieval or prompt.

Evidence:
  execution_record.arbiter_verdicts — what specific violation was found?
  execution_record.recent_changes — was a skill recently edited?

Check for regression first:
  If recent_changes contains a SKILL_EDIT on a skill that governs this node_type:
    AND grade_delta is negative (grade dropped since the edit):
    → The edit introduced a regression
    → Proposal type: SKILL_EDIT (revert or correct the recent change)
    → Priority: HIGHEST — regression proposals are ranked first always

Check for missing case:
  The arbiter named a specific violation (e.g. "CF-1 email uniqueness not enforced")
  Find which skill governs this constraint for this node_type
  Read that skill's content for this constraint
  If the skill does not cover this case or covers it incorrectly:
    → Failure layer: SKILL CONTENT
    → Proposal type: SKILL_EDIT (add missing case or correct wrong guidance)

Check for missing skill:
  If no skill in skills_retrieved governs the constraint that was violated:
    → Failure layer: SKILL MISSING
    → Proposal type: SKILL_ADD (new skill needed for this constraint + node_type)
    → Flag: add to GAP_NODES in graph (PROVISIONAL node for this combination)
```

---

## SECTION 3 — PROPOSAL FORMAT

Every proposal uses this format. Incomplete proposals are rejected by the ranker.

### PROMPT_PATCH proposal

```json
{
  "proposal_id":    "unique identifier",
  "proposal_type":  "PROMPT_PATCH",
  "situation":      1,
  "diagnosis_layer": "ASSEMBLY | PROMPT",
  "diagnosis_step":  2,
  "confidence":     0.85,

  "target": {
    "context_package": "the specific context package hash or file",
    "section":         "QUESTION_YOURSELF | iron_rules | SUCCESS | CONSTRAINTS",
    "action":          "add_section | replace_section | strengthen | weaken"
  },

  "evidence": {
    "what_model_did":   "exact pattern observed in the failing output",
    "what_went_wrong":  "one sentence — which constraint was violated",
    "arbiter_verdict":  "the specific arbiter verdict that caught it"
  },

  "draft": {
    "wrong_example":   "exact pattern the model produced (from execution record)",
    "correct_example": "what the model should produce instead",
    "reason_wrong":    "one sentence — why the wrong pattern violates the constraint",
    "reason_correct":  "one sentence — what invariant the correct pattern preserves"
  },

  "regression_check": {
    "existing_checks_reviewed": ["list of existing NAMED CHECKs in this prompt"],
    "conflict_found":           false,
    "conflict_detail":          null
  },

  "expected_grade_delta": "+0.08 to +0.15 on iron_rules sub-score",
  "risk_of_regression":   "LOW | MEDIUM | HIGH",
  "risk_detail":          "what other sub-score might be affected"
}
```

### SKILL_EDIT proposal

```json
{
  "proposal_id":    "unique identifier",
  "proposal_type":  "SKILL_EDIT",
  "situation":      1,
  "diagnosis_layer": "SKILL_CONTENT",
  "diagnosis_step":  4,
  "confidence":     0.78,

  "target": {
    "skill":    "SK-NNN skill-name",
    "section":  "Section N — section title",
    "action":   "add | edit | copy_with_changes | cut"
  },

  "evidence": {
    "what_skill_says":     "current content of the target section (verbatim)",
    "what_execution_showed": "what happened when this guidance was followed",
    "gap_or_error":        "what the skill should say but does not"
  },

  "draft": {
    "proposed_content":    "the new or modified content for the target section",
    "positive_example":    "what good output looks like with this guidance",
    "negative_example":    "what bad output looks like without this guidance",
    "why_this_fixes_it":   "one sentence — how this draft closes the gap"
  },

  "impact": {
    "affects_node_types":  ["ROUTING"],
    "affects_player_types": ["executor"],
    "affects_skills_via_feeds_edges": ["SK-NNN"]
  },

  "escalation_required":  false,
  "escalation_reason":    null
}
```

### SKILL_ADD proposal

```json
{
  "proposal_id":    "unique identifier",
  "proposal_type":  "SKILL_ADD",
  "situation":      2,
  "diagnosis_layer": "SKILL_MISSING",
  "diagnosis_step":  4,
  "confidence":     0.65,

  "target": {
    "proposed_sk_number": "SK-NNN",
    "proposed_name":      "skill-name-kebab-case",
    "player_types":       ["executor"],
    "node_types":         ["ROUTING"],
    "decision_point":     ["generate"]
  },

  "evidence": {
    "gap_description":   "what capability or constraint has no governing skill",
    "executions_affected": 3,
    "pattern":           "same failure across N executions of same node_type"
  },

  "draft": {
    "proposed_frontmatter": "complete YAML frontmatter for the new skill",
    "proposed_sections":    ["Section 1 title", "Section 2 title"],
    "minimum_content":      "what the skill must contain to close this gap"
  },

  "graph_action": {
    "create_provisional_node": true,
    "contains_edges":          ["ROUTING", "executor"],
    "gap_node_added_to":       "GAP_NODES list"
  }
}
```

---

## SECTION 4 — THE TWO-CALL EXECUTION

The Meta-Arbiter runs as two sequential AI calls. The second call does not
see the reasoning of the first.

### Call 1 — Diagnosis and proposal generation

```
Model:    best available reasoning model (not the model that failed)
Input:    execution_record (full)
          SK-472 (prompt-patch-authoring) — loaded for PROMPT_PATCH proposals
          SK-449 (iron-rule-derivation) — loaded for SKILL_EDIT diagnosis
          This skill (SK-525) — governs the diagnosis protocol and formats
Task:     run 4-step diagnosis protocol
          produce proposals in Section 3 format
          do NOT rank proposals
          do NOT suggest which proposal to approve first
Output:   list of proposals (unranked), each with confidence score
          diagnosis trace: which step identified the failure layer
          escalation flags: which proposals require Luba review before ranking
```

### Call 2 — Blind ranking

```
Model:    different model from Call 1 (never the same model)
Input:    proposals from Call 1 (labels only — A, B, C — not the proposal type)
          execution_record (full — same as Call 1)
          EXCLUDES: diagnosis reasoning from Call 1
Task:     rank proposals by likely impact on the execution record
          score each: how much would this proposal have changed the grade?
          flag: which proposals risk regression on other sub-scores?
Output:   ranked list with impact scores and regression risk per proposal
          ranked_proposals[0] = highest impact, lowest regression risk
```

### What Luba receives

```
1. The execution record (summary — grade, node_type, neighborhood, what failed)
2. The ranked proposals (ranked_proposals[0] first, with impact score)
3. The diagnosis trace (which step found the failure — for context)
4. Escalation flags (if any proposal requires architectural review)

Luba's response options per proposal:
  APPROVED  → system applies the change, graph updated, RAG re-seeded
  REJECTED  → proposal stored with rejection reasoning (becomes training data)
  DEFERRED  → revisit after N more executions of same node_type
  ESCALATE  → route to architectural review before any decision
```

---

## SECTION 5 — ESCALATION TRIGGERS

Some proposals must be escalated before ranking reaches Luba. The Meta-Arbiter
flags these automatically.

```
Escalate immediately when:
  □ Proposal targets a foundational skill:
    SK-435 (node-convergence), SK-442 (arbiter-panel), SK-441 (simulation-protocol)
    SK-443 (session-file-authoring), SK-449 (iron-rule-derivation)
    → These skills govern every flow. A wrong edit propagates everywhere.

  □ Proposal would affect > 5 other skills via FEEDS edges
    → Cascade risk — architectural review required

  □ Proposal contradicts an existing iron rule or DNA pattern
    → The Meta-Arbiter must state which rule is contradicted and why
    → No proposal that contradicts DNA-1 through DNA-9 may be approved without
       architectural review

  □ Same proposal type has fired on same skill 3+ times without approval
    → The pattern suggests the approval process has a gap, not the skill
    → Escalate the pattern, not just the proposal

Do NOT escalate:
  □ Proposals targeting non-foundational skills with no FEEDS edges affected
  □ PROMPT_PATCH proposals that add a QUESTION YOURSELF section
    (these are always safe — they add self-check, they do not change constraints)
  □ PROMPT_PATCH proposals that strengthen a WRONG/CORRECT pair
    (safe unless the CORRECT example contradicts an existing check)
```

---

## SECTION 6 — GOOD AND BAD PROPOSALS (EXAMPLES)

### PROMPT_PATCH — Good proposal

```
Situation: ROUTING executor, grade 0.72, iron_rules arbiter BLOCK
  "CF-1 email uniqueness not enforced before write"

Diagnosis Step 3: iron rule was stated vaguely in prompt
  Current prompt says: "check email uniqueness"
  Quality test: no failure consequence stated → Sub-case A → PROMPT_PATCH

Good proposal:
  target.section: iron_rules
  target.action: strengthen
  draft.wrong_example: "const existing = await this.db.find({email}); this.db.create({email})"
                       (find and create without checking the result)
  draft.correct_example: "const existing = await this.db.find({email});
                           if (existing.length > 0) return DataProcessResult.failure('DUPLICATE_EMAIL', ...);
                           await this.db.create({email})"
  draft.reason_wrong: "find without checking result allows duplicate creation on race condition"
  draft.reason_correct: "explicit failure return before create enforces CF-1 email uniqueness"
  regression_check.conflict_found: false
```

### PROMPT_PATCH — Bad proposal

```
Bad: patching two issues in one proposal
  target.section: "iron_rules AND self_check"
  action: "add both the WRONG/CORRECT pair AND the QUESTION YOURSELF section"

Why bad: violates SK-472 Rule 0 — one bottleneck per patch.
  Cannot attribute grade change to either fix.
  Fix: split into two proposals. Ranker selects which to apply first.
```

### SKILL_EDIT — Good proposal

```
Situation: Situation 2 — same ROUTING node failed 4 times
  grade < threshold each time, arbiter: "idempotency key format does not match DNA-7"
  Diagnosis Step 4: SK-449 Section 3 does not cover idempotency key format for ROUTING

Good proposal:
  target.skill: SK-449
  target.section: Section 3 — Example Derivation
  target.action: add (new row to derivation table)
  draft.positive_example: "Idempotency key: 'auth_attempt:{userId}:{correlationId}'
                            — checked before any write, format is deterministic"
  draft.negative_example: "Idempotency key: '{timestamp}-{random}'
                            — non-deterministic, breaks deduplication on retry"
  impact.affects_node_types: [ROUTING]
  escalation_required: false (SK-449 is not in the foundational skills list)
```

### SKILL_EDIT — Bad proposal

```
Bad: editing SK-442 (arbiter panel design) based on one bad grade
  target.skill: SK-442
  diagnosis_step: 1 (retrieval gap — SK-452 was not retrieved)

Why bad: SK-442 is a foundational skill. Escalation is required.
  Also: the root cause is a retrieval gap (Step 1), not skill content (Step 4).
  The Meta-Arbiter ran all 4 steps and proposed a SKILL_EDIT at Step 4
  when Step 1 already identified a retrieval gap.
  Fix: flag SK-452 retrieval gap. In Phase 2, produce CONNECTION_CHANGE.
       Do not edit SK-442 to compensate for a retrieval gap.
```

---

## ANTI-PATTERNS

**"The Meta-Arbiter approved its own proposal."**
Found: Call 1 produced the proposal. The same model ranked it and approved it.
Fix: Call 2 is mandatory. The ranker must be a different model.
     Approval requires Luba's explicit response. No self-approval.

**"The proposal was applied without waiting for approval."**
Found: state shows SKILL_EDIT applied, no APPROVED entry in proposal log.
Fix: Every proposal status starts as PROPOSED. Only transitions to APPLIED
     after explicit APPROVED response. This is enforced by the graph — a
     PROPOSED node cannot trigger system changes.

**"The Meta-Arbiter fired on the first execution of a node_type."**
Found: node_type has no prior_grades. Meta-Arbiter produced Situation 2 proposal.
Fix: Situation 2 requires N ≥ 3 prior executions of the same node_type and
     neighborhood. First execution → Situation 1 only. No pattern diagnosis.

**"The diagnosis stopped at Step 1 and produced a SKILL_EDIT."**
Found: retrieval_gap non-empty. Proposal type is SKILL_EDIT on the missing skill.
Fix: A retrieval gap is not a skill content gap. The skill may exist and be correct
     but unreachable. In Phase 1: flag the gap and note it. In Phase 2:
     CONNECTION_CHANGE or RETRIEVAL_CHANGE will close it.
     Do not edit skill content to compensate for retrieval failures.

**"The Meta-Arbiter produced 5 proposals for one bad grade."**
Found: Situation 1 (single occurrence), 5 proposals produced.
Fix: Situation 1 → one proposal, most likely root cause.
     Situation 2 (pattern, N ≥ 3) → up to 3 proposals, ranked by impact.
     More proposals than the situation allows → reduce before ranking.

---

## INTEGRATION

**What invokes SK-525:**
- Any cycle execution where grade < threshold
- The flow execution runner — checks grade after every cycle

**What SK-525 receives:**
- The execution record (Section 1 format)
- SK-472 (prompt-patch-authoring) — for PROMPT_PATCH proposal drafting
- SK-449 (iron-rule-derivation) — for SKILL_EDIT diagnosis at Step 4

**What SK-525 produces:**
- Call 1: unranked proposals with diagnosis trace
- Call 2: ranked proposals with impact scores and regression risk
- Luba receives: ranked proposals + execution summary + escalation flags

**What uses SK-525's output:**
- Luba — reviews and approves / rejects / defers each proposal
- The graph — stores proposals as PROPOSED nodes with TARGETS edges to
  the skill or prompt being proposed for change
- The learning loop (SK-515) — rejected proposals with reasoning become
  training signal for improving the Meta-Arbiter's own diagnosis

**Phase 2 additions (deferred):**
- CONNECTION_CHANGE proposals (when retrieval_gap persists across N flows)
- RETRIEVAL_CHANGE proposals (when traversal path fails systematically)
- These require graph execution history that does not yet exist at Phase 1
