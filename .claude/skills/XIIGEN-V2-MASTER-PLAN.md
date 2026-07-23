# XIIGEN SKILLS v2.0 — MASTER REMEDIATION PLAN
## Date: 2026-03-25 | Status: AUTHORITATIVE EXECUTION PLAN
## Covers: Skills, Session Setup, Planning, Coding, Review, Debug, Flow Prep

---

## PROBLEM REGISTRY (root causes, not symptoms)

| ID | Problem | Source | Impact |
|----|---------|--------|--------|
| P-01 | Mission 3-layer purpose never encoded as principle | Chat analysis | Every session optimises for code correctness, not engine independence |
| P-02 | Arbiter panel has 1 judge; Gap 3 "deferred" since v1.0.3 | FLOW-DESIGN-SKILL-INDEX gap table | No comparative signal, no expertise specialisation |
| P-03 | Upper judge / dynamic panel expansion never architected | Chat analysis | Panel is a closed system — can't grow when domains disagree |
| P-04 | DPO triples lack OSS teaching fields (curriculumTier, instructionFormat) | PHASE-THREE-PREP-GUIDE stripped them | Fine-tuning corpus is unusable for curriculum learning |
| P-05 | V9 gate disabled with "skip if FLOW-39 not ACTIVE" | flow-implementation-guide-SKILL.md line 301 | Teaching health never checked for any real flow run |
| P-06 | "Pre-existing" used as bug exemption across sessions | Chat transcript | Known bugs accumulate forever, never reach Luba for decision |
| P-07 | Session files reference other documents (not self-contained) | Chat analysis | Claude Code fills gaps with training data → hallucinated execution |
| P-08 | No mission progress visible to Luba | All session outputs | Working blind — no DPO count, no gap score, no cost trajectory |
| P-09 | MODEL_COMPARISON / SHADOW_RUN / ARBITER_VERDICT signals missing | learning-signal-capture-SKILL.md | No per-model performance data → FLOW-39 curriculum blind |
| P-10 | Principles Arbiter does not exist | Chat analysis | P1-P16 are stated but never independently checked against generated code |
| P-11 | SESSION FILE FORMAT GATE missing from HOW-TO-USE | HOW-TO-USE-v1.0.4 | Web-session plans arrive as prose documents Claude Code can't execute |
| P-12 | XIIGEN-SESSION-START-PROMPT stale — missing MISSION STATE block | XIIGEN-SESSION-START-PROMPT.md | New sessions open without knowing distance to goal |
| P-13 | arbiterConfig field missing from EngineContract template | PATCH--contract-template-node-field.md | Arbiter selection is undeclared and unauditable |
| P-14 | Sonnet > Opus for XIIGen work: context allocation, not capability | Chat observation | Wrong model for detailed checking — Sonnet should be judge |
| P-15 | No canonical document ownership map | S1 review finding (Gap A) | Governance content drifts into nearest available file; SK registry appeared in wrong patch |
| P-16 | No PATCH FORMAT STANDARD | S1 review finding (Gap B) | Every code patch missing pre-flight verification; import errors caught at runtime not authoring time |
| P-17 | Machine constants in schema definitions not guarded | S1 review finding (Gap C) | D-EXT-009 fixes fabrics.module.ts but same hardcoded-name problem recurs in schemas/fixtures |

---

## WHAT EACH SESSION PRODUCES (overview)

| Session | Focus | New Files | Updated Files |
|---------|-------|-----------|---------------|
| S1 | Mission Principles (M1-M5, P17–P22) | 2 patch files | 0 |
| S2 | Arbiter Panel Architecture | 3 new skills (SK-442, SK-446, SK-444) | 3 updated files |
| S3 | Learning Signals + DPO Teaching + Mission Progress | 1 new skill | 1 updated skill |
| S4 | FC Checks + Check Catalog + V-Gates | 0 new | 3 updated skills |
| S5 | Session Self-Containment + HOW-TO-USE v2.0 | 1 new skill | 2 updated skills |
| S6 | Session Start + Setup Library + Contract Patch + Index | 2 new | 3 updated docs |
| S7 | Package Assembly (final zip + deliverables) | 4 packages | assembles all above |

---

## SESSION 1 — MISSION PRINCIPLES

### Focus
Write `PATCH--xiigen-core-principles-M1-M5-P17-P22.md` (already delivered)

### Single document to read first (only this one)
`PATCH--xiigen-core-principles-P14-P15-P16.md`
→ Read format, patch style, red-flag structure. Match exactly.

### What to write

**M1-M5: The Mission Layer (five mission principles)**
- Layer 1 TEACH: every run produces structured teaching material for OSS models
- Layer 2 IMPROVE: every run improves prompts, RAG, skills, context, arbiters
- Layer 3 REPLACE: paid model calls replaced by local models as teaching accumulates
- Node as universal decomposition unit (definition: context + skills + prompt + prior results + panel → consensus)
- Upper judge concept: panel is not fixed — upper judge may add specialist arbiters
- Visibility requirement: ENGINE PROGRESS reported every phase, unsolicited
- Red flags: M1-M5 violations (each principle has its own red flag list)

**P17: Arbiter Panel Evaluation (not just "multi-model")**
- Every AI station: generation tier (N≥2 models, shuffled, blind), evaluation tier (5 specialised arbiters), orchestration tier (escalation gate)
- The 5 mandatory arbiters: Business Logic, Security, Skills/Patterns, Prompts Compliance, Key Principles
- Escalation Orchestrator: ANY BLOCK → reject; ≥5 APPROVED → accept; conflict → re-evaluation round → human escalate
- BLOCK semantics: never averaged. Principles violations are always BLOCK class.
- Red flags: single judge, same model for generation+evaluation, score averaging that hides violations

**P18: OSS Model Teaching From Triple One**
- Every DPO triple = teaching artifact, regardless of whether local model deployed
- Required fields from FLOW-01: curriculumTier (never null), targetModelFamily, instructionFormat, distillationReadiness
- Shadow runs begin at FLOW-01 (placeholder records if no local model)
- Economic invariant: paid call cost = teaching return; triple without OSS fields = zero return
- V9 checks apply from FLOW-01, not from FLOW-39 activation
- Red flags: curriculumTier null, V9 skipped, shadow run omitted, "FLOW-39 will handle this"

**P19: Zero Known Defects**
- "Pre-existing" = observed before this session introduced it. Not exempt. This session owns it.
- Disposition options: FIX IT | ESCALATE (report to Luba with root cause) | DEFER (Luba explicit yes only)
- Before every ⛔ STOP: ISSUE INVENTORY listing all warnings/failures/anomalies found
- Delta gate "0 regressions" is necessary but not sufficient. Absolute gate required.
- Red flags: "pre-existing", "unrelated to this session", "out of scope", issue observed but not in inventory

**P20: Dedicated Principles Enforcement**
- Key Principles Arbiter: sole expertise = P1–P(N) full text + 9 DNA patterns + fabric interface registry
- Receives: principles list + generated code ONLY. Nothing else.
- Verdict is BLOCK class — principle violations are not averaged with other scores
- Grows automatically: as new principles added, this arbiter's context grows
- Red flags: principles arbiter shares context with other arbiters, receives iron rules or RAG patterns, produces advisory-only verdict

**P21: Gap Score as First-Class Metric**
- Gap score (expensive_model_score − local_model_score per task type per archetype) tracked from FLOW-01 Phase B
- xiigen-shadow-runs index initialised with placeholder records even when no local model deployed
- Unknown gap = failure state, not neutral state
- Gap score reported in every PHASE-COMPLETE alongside test counts
- Red flags: gap score absent from phase completion, shadow run omitted "because local model not ready"

**P22: Mission Progress Visible at Every Phase**
- ENGINE PROGRESS SECTION mandatory in every PHASE-COMPLETE-N.md
- Must answer: DPO count toward threshold, gap scores, prompt versions improved, RAG quality ≥0.60, flows to graduation
- "Tests passing" without these metrics is an incomplete report
- Red flags: PHASE-COMPLETE without ENGINE PROGRESS section, "we'll track this when FLOW-39 is built"

### Gate
- All principles use identical format as P14/P15/P16 (name, context, red flags, the question)
- M1-M5 are positioned BEFORE P1, as the governing layer
- Insertion instruction: "Add BEFORE P1 — at the top of the principles list"
- P17–P22 follow P16

### Output
`PATCH--xiigen-core-principles-M1-M5-P17-P22.md`

---

## SESSION 2 — ARBITER PANEL ARCHITECTURE

### Focus
Create `planning--arbiter-panel-design-SKILL.md` (SK-442)
Update `code-execution--topology-structure-SKILL.md`
Update `code-execution--node-convergence-SKILL.md`

### Documents to read (one at a time, in order)
1. `code-execution--node-convergence-SKILL.md` — read challenger roles, blind protocol, escalation concept
2. `code-execution--topology-structure-SKILL.md` — read handler table, node format, anti-patterns

### What to write

**SK-442: planning--arbiter-panel-design-SKILL.md**

WHEN TO INVOKE: Before authoring any AF-6, AF-7, or AF-9 prompt, or any topology ai-generate node.

STEP 1: Identify mandatory arbiters for this archetype
- ROUTING: Business Logic + Principles + Iron Rules
- DATA_PIPELINE: Business Logic + Security + Principles + Iron Rules
- ORCHESTRATION: all 7
- Table: archetype → minimum arbiters required

STEP 2: Per-arbiter context package definition
- Business Logic Arbiter: ironRules[] + emitted events + BFA CF rules (ONLY these)
- Security Arbiter: DNA-3, DNA-5, DNA-8 + stackCoupling.failureModes (ONLY these)
- Skills/Patterns Arbiter: RAG-retrieved patterns for this archetype (ONLY these)
- Prompts Compliance Arbiter: genesis prompt text + output format spec (ONLY these)
- Key Principles Arbiter: P1–P(N) full text + 9 DNA patterns (ONLY these, isolated)
- Iron Rules Arbiter: contract.ironRules[] + generated code (ONLY these)
- Completeness Arbiter: NODE structure.inputShape, outputShape, emits[], triggers[] (ONLY these)

STEP 3: Escalation Orchestrator rules
- ANY BLOCK from any arbiter → reject output entirely
- ≥5 of 7 APPROVED, remainder ADVISORY → ACCEPT with notes
- 3-4 CHALLENGE ADVISORY → CYCLE with targeted patch
- Consensus impossible after max cycles → ESCALATE TO HUMAN

STEP 4: Upper Judge protocol
- Upper Judge receives: all arbiter verdicts + unresolved conflict description
- Upper Judge decision: add specialist arbiter for missing expertise OR route to human
- Upper Judge log: every dynamic arbiter addition is a DESIGN_REASONING triple

STEP 5: Produce arbiterConfig for the contract (use PATCH--contract-template-arbiter-config.md format)

ANTI-PATTERNS:
- Single score.handler judge for all 5 evaluator dimensions
- Arbiters that share context packages (isolation broken)
- Escalation gate that averages instead of applying rules
- Principles Arbiter with reference to principles document instead of full text
- Upper Judge never called (fixed panel for all archetypes forever)

**Updates to code-execution--topology-structure-SKILL.md:**
- Add `arbiter-panel.handler` as 8th handler type in the 7 NODE HANDLERS table
- Add `generators[]` field to ai-generate.handler node format
- Add `arbiters{}` block to score.handler node format  
- Add Pattern F: "Multi-arbiter evaluation pipeline" in WIRING PATTERNS
- Add ANTI-PATTERNS for single-judge score.handler, unspecialised arbiters
- Add to "WHAT THIS SKILL PREVENTS": single-model DPO production

**Updates to code-execution--node-convergence-SKILL.md:**
- Add section "RUNTIME APPLICATION — THIS PATTERN EXTENDS TO ALL AF STATIONS"
- Map convergence roles → runtime: proposer=AI_ENGINE, domain challenger=secondary generator, etc.
- State explicitly: the blind multi-model protocol from planning-time also governs AF-1 through AF-9
- Reference P17 and SK-442

### Output
- `planning--arbiter-panel-design-SKILL.md` (NEW, SK-442)
- `planning--escalation-orchestrator-SKILL.md` (NEW, SK-446)
- `planning--principles-arbiter-SKILL.md` (NEW, SK-444)
- Updated `code-execution--topology-structure-SKILL.md`
- Updated `code-execution--node-convergence-SKILL.md`

---

## SESSION 3 — LEARNING SIGNALS + DPO TEACHING + MISSION PROGRESS

### Focus
Update `code-execution--learning-signal-capture-SKILL.md`
Create `session-output--mission-progress-SKILL.md` (SK-445)

### Document to read first (only this one)
`code-execution--learning-signal-capture-SKILL.md` (full file)

### What to update in learning-signal-capture

**Fix DPO_TRIPLE schema — add OSS teaching fields:**
```
curriculumTier:         integer from archetype tier table (NEVER null)
targetModelFamily:      from FREEDOM config ossTargetModelFamily
instructionFormat:      'deepseek-coder' | 'chatml' | 'alpaca'
distillationReadiness:  'READY' | 'TOO_COMPLEX' | 'PENDING_SIMPLIFICATION'
shadowRunId:            reference to parallel OSS run (null if none yet)
chosen:                 { code, model (family string), score }
rejected:               { code, model (family string — DIFFERENT from chosen.model), score }
modelComparison:        { chosen:{model,score}, rejected:{model,score}, discarded, judgeModel, shuffleWasApplied:true }
```

**Add DPO VALIDITY GATE section:**
A triple is stored to xiigen-training-data ONLY when:
- chosen.model ≠ rejected.model (different families)
- modelComparison.shuffleWasApplied === true
- prompt.system non-null
When <2 providers: status='PENDING_COMPARISON', store to xiigen-training-data-pending

**Add signal type 7: MODEL_COMPARISON**
- index: xiigen-model-preference
- data: flowId, taskTypeId, archetype, station, chosen{modelToken,score}, rejected{modelToken,score}, shuffleApplied
- Teaching value: which model family excels at which archetype

**Add signal type 8: SHADOW_RUN**
- index: xiigen-shadow-runs
- data: paidRunId, ossModel, ossScore, paidScore, scoreDelta, archetypeTier, readyForCurriculumSwitch
- Must exist from FLOW-01 even when ossScore=null (placeholder)

**Add signal type 9: ARBITER_VERDICT**
- index: xiigen-arbiter-verdicts
- data: runId, taskTypeId, arbiterRole, verdict (APPROVED/CHALLENGE/BLOCK), violations[], outputLabel (A/B/C), resolvedModel:null (blind until dereference)
- Teaching value: which arbiter roles most frequently block which archetypes

**Add LEARNING-006: OSS Teaching Fields Present** (BUILD_FAILURE if missing)
**Add LEARNING-007: curriculumTier Not Null** (BUILD_FAILURE if null)
**Update LEARNING-003 requiredFields** to include curriculumTier, targetModelFamily, instructionFormat

**Fix V9 skip condition:**
Remove "Skip if: FLOW-39 is not yet ACTIVE" entirely.
Replace with: "FLOW-39 refines curriculum. V9 enforces from FLOW-01 regardless."
Add interim path for when FLOW-39 not ACTIVE: assign curriculumTier manually from table, create SHADOW_RUN placeholder, extract DISTILLED_RULE manually.

### What to write: SK-445

**session-output--mission-progress-SKILL.md**

WHEN TO INVOKE: Before EVERY ⛔ STOP. Load before writing any PHASE-COMPLETE-N.md.

THE 5 MANDATORY QUESTIONS:
1. TEACH: valid DPO triples this phase? Count by tier. Any invalid (null curriculumTier, same-model)?
2. IMPROVE: what improved? Prompt versions advanced, RAG quality updated, skills triggered, arbiters calibrated?
3. REPLACE: current gap scores per archetype? (null if no local model — state PENDING, never omit)
4. BLOCKING: what prevented improvement this phase? State explicitly.
5. DECIDE: what does Luba decide next? Specific options with cost/timeline impact.

ENGINE PROGRESS TABLE template:
```
| Metric | This Phase | Cumulative | Target | Gap |
|--------|-----------|------------|--------|-----|
| Valid DPO triples | +N | TOTAL | 80 | REMAINING |
| Pending DPO triples | +N | TOTAL | 0 | — |
| Shadow gap T47 | null/N% | null/N% | <5% | unknown/N% |
| Prompt versions improved | N | N total | continuous | — |
| RAG patterns score ≥0.60 | N | N total | all | MISSING |
| Flows to graduation test | — | — | 24 | N remaining |
| Estimated cost this phase | $N | $N total | $0 (local) | $N remaining |
```

WHAT IMPROVED (required checkbox):
- [ ] At least one prompt version bumped
- [ ] At least one RAG pattern quality score updated
- [ ] DPO triple count increased (verify count in xiigen-training-data)

### Output
- Updated `code-execution--learning-signal-capture-SKILL.md`
- `session-output--mission-progress-SKILL.md` (NEW, SK-445)

---

## SESSION 4 — FC CHECKS + CHECK CATALOG + V-GATES

### Golden Rule (applies to this session and all subsequent sessions)
Every review finding is a symptom of a missing guard. Fix the instance AND add the
structural guard. See XIIGEN-GOLDEN-RULE.md for Gap A/B/C from S1 review.

### Focus
**Add plan-review skill review** (P-15/16/17 from S1 review findings)
Update `planning--plan-review-SKILL.md` (add FC-26..FC-31)
Update `code-execution--flow-design-check-catalog.md` (add LEARNING-004..007, HEALTH-001, ISSUE-001, ARBITER-001..003)
Update `code-execution--flow-implementation-guide-SKILL.md` (V5, V9, V10, V11)

### Plan-review skill review (read before writing any FC check)
Before adding FC-26..FC-31, read the ENTIRE `planning--plan-review-SKILL.md` to:
- Verify FC-12 still references P1-P16 (must be updated to P1-P22 + M1-M5)
- Verify FC-8 covers session file format (needs the 7-check rewrite)
- Identify any FC check that contains a hardcoded model name (FC-31 violation)
- Identify any FC check referencing a document with wrong canonical home (Gap A)
This review is mandatory — do not skip to adding new FC checks without completing it.

### Documents to read (one at a time, in order)
1. `planning--plan-review-SKILL.md` — read FC-23/24/25 format to match exactly
2. `code-execution--flow-design-check-catalog.md` — read LEARNING-001..003 format
3. `code-execution--flow-implementation-guide-SKILL.md` — read V5, V7, V9 sections

### What to add to plan-review-SKILL.md

**FC-26: Arbiter Panel Completeness (P17)**
For every topology with ai-generate.handler or score.handler:
- Detection script: check arbiters[] has mandatory arbiters for archetype (ROUTING=3 min, ORCHESTRATION=7)
- Checklist: dna-principles arbiter isolated, escalation gate declared, block semantics set
- FAIL if: any mandatory arbiter missing, or principles arbiter not isolated

**FC-27: Teaching Data Quality (P18)**
For every plan with Phase E:
- Checklist: curriculumTier assignment visible per task type, cross-model provenance plan visible, DPO validity gate referenced
- FAIL if: curriculumTier not assigned before Phase E, single-model plan with no PENDING_COMPARISON strategy

**FC-28: Session File Self-Containment (P-plan)**
Per SESSION file:
- No cross-references: grep "see \|follow \|per the \|reference plan" — expected 0 hits
- All variables defined in same file
- All principles quoted, not named
- All tables inline (curriculum tier, arbiter panel, DPO fields)
- Gate commands literal, not described
- Zero placeholders (<INSERT>)
- FAIL if any check fires — non-conforming file = hallucinated execution

**FC-29: Session Completeness Gate (P19)**
Every session file has ISSUE INVENTORY step before ⛔ STOP:
- Format: issue | FIXED | DEFERRED (reason)
- "Pre-existing" banned as a status
- Deferred requires Luba explicit approval
- FAIL if: any session file has ⛔ STOP without preceding ISSUE INVENTORY

**FC-30: Mission Advancement Check (P22)**
For every plan producing session files:
- Phase E shows how DPO triples contribute to Layer 1 TEACH
- Phase F shows Layer 2 IMPROVE actions (what RAG/prompts/skills improve)
- PHASE-COMPLETE template includes ENGINE PROGRESS section
- FAIL if: no layer advancement planned without explanation; PHASE-COMPLETE template missing ENGINE PROGRESS

Update Gate A passing criteria to include FC-26..FC-30.
Update FC-12 P-range from "P1–P16" to "M1-M5 + P1-P22".
FC-12 grep loop must check M1 M2 M3 M4 M5 P1 P2 P3 ... P22 — not M0.

### What to add to flow-design-check-catalog.md

**LEARNING-004: Cross-Model DPO Provenance**
Severity: BUILD_FAILURE
Check: chosen.model ≠ rejected.model in stored DPO triple
Fail: "Same-model DPO triple — not comparative signal"

**LEARNING-005: Arbiter Expertise Coverage**
Severity: BUILD_FAILURE
Check: score.handler evaluators not all routed to same model token
Fail: "Shared single judge — no expertise specialisation"

**LEARNING-006: OSS Teaching Fields Present** (from Session 3)
Severity: BUILD_FAILURE
Check: DPO triple has curriculumTier, targetModelFamily, instructionFormat
Fail: "DPO triple missing OSS teaching fields (P18)"

**LEARNING-007: curriculumTier Not Null**
Severity: BUILD_FAILURE
Check: curriculumTier in [1,2,3,4,5]
Fail: "curriculumTier null — triple unusable for curriculum fine-tuning"

**HEALTH-001: Absolute Test Gate**
Severity: BUILD_FAILURE
Check: failures === 0 AND (skipped === 0 OR each skip has documented justification)
Fail: "Test suite has known failures — delta gate is not sufficient. Fix or escalate to Luba."

**ISSUE-001: No Unresolved Issues in Log**
Severity: BUILD_FAILURE
bannedPhrases: ["pre-existing", "unrelated to this session", "not introduced by", "out of scope"]
requiredResolution: "FIXED | AWAITING_LUBA_DISPOSITION"
Fail: "Issue found and neither fixed nor explicitly escalated"

**ARBITER-001: Principles Arbiter Isolated**
Severity: BUILD_FAILURE
Check: AI_PRINCIPLES_ARBITER context contains only P1–P(N) + generated code
Fail: "Principles arbiter context contaminated — isolation broken"

**ARBITER-002: Escalation Arbiter Present**
Severity: BUILD_FAILURE
Check: score.handler arbiters block includes escalation arbiter as final entry
Fail: "No escalation arbiter — BLOCK verdicts will be averaged"

**ARBITER-003: Block Class Not Averaged**
Severity: BUILD_FAILURE
Check: blockSemantics: ANY_BLOCK_CLASS_REJECTS present on score.handler
Fail: "Missing blockSemantics — principle violations can be diluted by score averaging"

### What to update in flow-implementation-guide-SKILL.md

**V5: Change from delta gate to absolute gate (P19)**
Old: "cd server && npx jest >= baseline (no regressions)"
New:
```
V5: ABSOLUTE TEST GATE (P19)
  failures === 0 (not "no new failures" — zero failures total)
  For each skip: documented justification in ISSUE INVENTORY
  Warnings treated as failures when they indicate open handles or data leaks
  V5-B: if pre-existing failures found during execution: fix or escalate before ⛔ STOP
```

**V9: Remove skip condition (P18)**
Old: "Skip if: FLOW-39 is not yet ACTIVE"
New:
```
V9: LOCAL TEACHING HEALTH (always runs — FLOW-39 refines, does not create)
  V9-001: distilled-rule-count-increased (FLOW-39 interim: extract 1-3 rules manually per passing cycle)
  V9-002: dpo-triple-has-chosen-code AND chosen.model ≠ rejected.model
  V9-003: curriculumTier non-null on every triple this phase
  V9-004: shadow-run-placeholder-created (even if ossScore=null — index must exist)
```

**Add V10: MISSION PROGRESS (always runs)**
```
V10: MISSION PROGRESS (P22)
  V10-001: teaching-data-produced — at least one structurally valid DPO triple (crossModel + curriculumTier + teachingPoint + prompt.system)
  V10-002: learning-rag-updated — at least one positive or negative example added
  V10-003: graduation-progress-recorded — STATE.json has graduation_progress with triple count and tier coverage
  FAIL message: "This phase produced code but ZERO teaching progress. Engine did not improve."
  Severity: WARNING (not BUILD_FAILURE for early phases — but must be VISIBLE)
```

**Add V11: SHADOW RUN HEALTH (always runs)**
```
V11: SHADOW RUN HEALTH (P21)
  V11-001: shadow-run-attempted — SHADOW_RUN signal stored (WARNING if ossKey absent — not BLOCK)
  V11-002: curriculum-tier-assigned — all DPO triples for this flow have curriculumTier in [1,2,3,4,5]
```

**FC-31: Machine Constants in Schemas and Templates (Gap C from S1 review)**
For every schema definition, fixture template, and prompt template:
- Detection: `grep -rn "deepseek\|gpt-4\|claude-opus\|claude-sonnet\|gemini-pro" .claude/skills/ fixtures/ contracts/ | grep -v "FREEDOM config\|xiigen\.\|default:" | grep -v ".spec."`
- FAIL if any model/provider literal string without FREEDOM config reference

**Update FC-12** — change `P1-P16` range to `M1-M5 + P1-P22`

**Add PATCH FORMAT STANDARD** to plan-review or as standalone section in HOW-TO-USE (Gap B):
Every `PATCH--*.md` must have:
- Pre-flight checklist (verify dependencies before touching code)
- Post-flight checklist (tsc --noEmit + delta test gate after changes)
- Canonical document placement note (is this content in the right file?)

**Add simulation-protocol-SKILL.md to S4 scope** (from S1 master plan self-review):
Add 3 SILENT_FAILURE patterns to `planning--simulation-protocol-SKILL.md`:
1. Single-model DPO triple stored as training data
2. All score.handler evaluators through same judge
3. DPO triple stored without curriculumTier

### Output
- Updated `planning--plan-review-SKILL.md` (FC-26..FC-31 + FC-12 update + PATCH FORMAT note)
- Updated `code-execution--flow-design-check-catalog.md`
- Updated `code-execution--flow-implementation-guide-SKILL.md`
- Updated `planning--simulation-protocol-SKILL.md` (+3 SILENT_FAILURE patterns)

---

## SESSION 5 — SESSION SELF-CONTAINMENT + HOW-TO-USE v2.0

### Focus
Create `planning--session-file-authoring-SKILL.md` (SK-443)
**Note: SK-446 = planning--escalation-orchestrator-SKILL.md (produced in S2)**
Update `session-output--investigation-handoff-SKILL.md`
Update `HOW-TO-USE-SKILLS.md` → v2.0

### Document to read first (only this one)
`HOW-TO-USE-SKILLS-v1.0.4.md` (full file — this is the one file that governs everything)

### What to write: SK-443

**planning--session-file-authoring-SKILL.md**

WHEN TO INVOKE: At Gate C, after planning produces session files, before delivery to Claude Code.
KEY PRINCIPLE: A session file must be executable by Claude Code in isolation, with zero reference to any other document.

THE CRYSTALLISATION PROTOCOL:
For each decision made during the planning session:
1. Identify every step that depends on it
2. Inline the decision content into those steps — do not reference the plan
3. If the decision is a table → paste the table into every step that uses it

SELF-CONTAINMENT VERIFICATION (run before delivering any session file):
```bash
# Check 1: no cross-references
grep -n "see \|follow \|per the \|reference plan\|see skill\|apply P" SESSION-*.md
# Expected: 0 hits

# Check 2: no undefined variables  
grep -oP '\$\{[^}]+\}' SESSION-*.md | sort -u > /tmp/vars_used.txt
# Each must have export VAR= or inline definition in the same file

# Check 3: no placeholders
grep -n "<[A-Z_]" SESSION-*.md | grep -v "Content-Type\|<!--"
# Expected: 0 hits
```

MANDATORY INLINE REFERENCES (every session file touching generation):
```
## INLINE — DPO TRIPLE REQUIRED FIELDS
curriculumTier: integer in [1,2,3,4,5] (NEVER null)
chosen.model ≠ rejected.model (different families)
modelComparison.shuffleWasApplied: true
prompt.system: non-null genesis text
fabricProviders: non-empty object

## INLINE — CURRICULUM TIER TABLE
| Archetype       | Tier |
|----------------|------|
| ROUTING        | 1    |
| DATA_PIPELINE  | 2    |
| VALIDATION     | 2    |
| TRANSACTION    | 3    |
| ORCHESTRATION  | 4    |
| SCHEDULED      | 5    |

## INLINE — ARBITER PANEL (7 roles, expertise scopes)
[7 arbiter definitions with expertise strings and verdict classes]
```

ANTI-PATTERNS:
- "Apply P17 to this step" — paste P17 inline
- Calling a skill by name without quoting its decision criteria
- "Same format as FLOW-01" — Claude Code's memory of FLOW-01 is training data, not the actual file
- Gate check referencing a skill file — Claude Code cannot load skill files mid-execution

### What to add to session-output--investigation-handoff-SKILL.md

Add mandatory section at end:
```
## UNRESOLVED ISSUES (mandatory — leave blank only if truly none)

| Issue | Introduced this session? | Reproduction | Disposition needed |
|-------|-------------------------|--------------|-------------------|
| ... | YES/NO | ... | Luba to decide |

If truly none: write "None found." — never omit this section entirely.
A handoff without UNRESOLVED ISSUES means the next session starts with unknown debt.
```

### What to update in HOW-TO-USE-SKILLS.md → v2.0

**Add FOUND-ISSUE PROTOCOL** (applies to ALL session types, after session type definitions):
```
When ANY issue is found during a session — regardless of when introduced:
1. Log it: "Found issue: [description]. Introduced this session: YES/NO."
2. NEVER use "pre-existing", "unrelated", or "out of scope" as resolution.
3. If fixable: fix it. Do not ask.
4. If exceeds scope: report with reproduction steps. Await instruction.
The phrase "pre-existing — not introduced by this session" is BANNED.
Correct: "Found pre-existing issue — awaiting disposition."
```

**Add SESSION FILE FORMAT GATE** (before delivering any Claude Code instruction):
```
□ STATE.json present with current_session field
□ Is this a SESSION-N.md file (not prose+steps combined)?
□ ⛔ STOP marker after a state save?
□ Gate commands are literal (exact commands, expected output specified)?
□ SESSION-0-PLAN-REVIEW ran and passed Gates A/B/C?
ON ANY FAILURE: output failed checks. Do NOT proceed to execution.
```

**Add MISSION PROGRESS CHECK** (before every ⛔ STOP):
```
1. TEACH — valid teaching triples this session? Count + verify crossModel + curriculumTier
2. IMPROVE — anything improved? Prompt versions, RAG scores, skills, arbiters
3. REPLACE — current gap score per archetype? (PENDING if no data)
These answers appear in PHASE-COMPLETE under ENGINE PROGRESS.
A completion package without ENGINE PROGRESS section is incomplete.
```

**Add to trigger table:**
- Before authoring any AF-9 judge config → `planning--arbiter-panel-design-SKILL.md` (SK-442)
- Before delivering any Claude Code instruction → `planning--session-file-authoring-SKILL.md` (SK-443)
- Before every ⛔ STOP → `session-output--mission-progress-SKILL.md` (SK-445)

**Add to "what each skill prevents":**
- SK-442: Single-model evaluation; unspecialised judges; violation averaging
- SK-443: Hallucinated execution; Claude Code filling gaps with training data
- SK-445: Luba working blind; mission progress invisible between sessions

**Update version to v2.0, update "what changed" section.**

**Add to AGENTS.md section:**
```
## SESSION COMPLETENESS RULE
"Pre-existing" = observed before this session. Not exempt. Own it or defer it explicitly.
Before every ⛔ STOP: ISSUE INVENTORY (issue | FIXED | DEFERRED + reason).
Zero items may disappear between observation and ⛔ STOP.

## RECEIVED INSTRUCTION QUALITY GATE
Before executing ANY received instruction, verify:
1. STATE.json present with current_session field?
2. Is this a SESSION-N.md file (not prose + embedded steps)?
3. Explicit ⛔ STOP marker after a state save?
4. Gate commands literal?
5. SESSION-0 ran and passed?
ON ANY FAILURE: output failed checks. Never proceed. Never infer.
```

### Output
- `planning--session-file-authoring-SKILL.md` (NEW, SK-443)
- Updated `session-output--investigation-handoff-SKILL.md`
- Updated `HOW-TO-USE-SKILLS.md` → v2.0

---

## SESSION 6 — SESSION START + SETUP LIBRARY + CONTRACT PATCH + INDEX

### Focus
Write `PATCH--contract-template-arbiter-config.md`
Update `XIIGEN-SESSION-START-PROMPT.md` → v2.0 (already written as XIIGEN-SESSION-START-v2.md)
Update `XIIGEN-SESSION-SETUP-LIBRARY.md` → v2.0
Update `FLOW-DESIGN-SKILL-INDEX.md`
Update `INTEGRATION-INSTRUCTIONS.md`
**Write `XIIGEN-GOLDEN-RULE.md`** (already written in S1 fix — finalize and package)
**Add DOCUMENT AUTHORITY MAP** to FLOW-DESIGN-SKILL-INDEX.md or INTEGRATION-INSTRUCTIONS.md (Gap A canonical fix)

### Documents to read (one at a time, in order)
1. `XIIGEN-SESSION-START-PROMPT.md` (full, short file)
2. `XIIGEN-SESSION-SETUP-LIBRARY.md` (full file — all 6 session types)

### What to write: PATCH--contract-template-arbiter-config.md

Add `arbiterConfig` field to EngineContract (after `ironRules[]`):
```typescript
arbiterConfig: {
  generators: string[];          // ['AI_ENGINE', 'AI_OPENAI_PROVIDER', 'AI_GEMINI_PROVIDER']
  judge: string;                 // 'AI_JUDGE_PROVIDER' — never same family as generators in same run
  blind: true;                   // always
  evaluatorArbiters: {
    business_logic:      ArbiterRole;  // iron rules + domain events
    security:            ArbiterRole;  // DNA-3/5/8 + failureModes
    skills_patterns:     ArbiterRole;  // RAG-retrieved patterns
    prompts_compliance:  ArbiterRole;  // genesis prompt adherence
    key_principles:      ArbiterRole;  // P1–P(N) verbatim, isolated
    iron_rules:          ArbiterRole;  // contract.ironRules[] only
    completeness:        ArbiterRole;  // NODE structure completeness
  };
  escalation: {
    blockRule: 'ANY_BLOCK_REJECTS';
    maxCyclesBeforeHuman: number;
    upperJudgeEnabled: boolean;
  };
}
```

MANDATORY: T47/T48/T49 contracts must be updated. All future contracts must include arbiterConfig.
FC-26 in plan-review enforces this at Gate A.

### What to update in XIIGEN-SESSION-START-PROMPT.md → v2.0

**Correct current state** (Phase B complete, not "Phase B ready"):
- FLOW-01: Phase B complete (real Anthropic, scores 1.0 — prescriptiveness check pending)
- Tests: 5,386 passing (live count, not cached 5,375)
- Providers: AI_ENGINE (Sonnet), AI_JUDGE_PROVIDER (Sonnet), AI_OPENAI_PROVIDER, AI_GEMINI_PROVIDER registered

**Add MISSION STATE block** (immediately after current state):
```
## MISSION STATE (query before acting — do not estimate)

Valid DPO triples:          0 / 80 (threshold for local model switch)
Curriculum tier coverage:   0 triples in any tier
Shadow gap scores:          PENDING — xiigen-shadow-runs not yet initialised
Prompt versions improved:   0 (FLOW-01 first run)
RAG patterns score ≥0.60:   N/A — quality scores not yet populated
Estimated graduation:       > 30 sessions at current triple production rate
Flows to graduation test:   24 remaining (FLOW-01..09 + engine flows)

These numbers must appear in every PHASE-COMPLETE-N.md under ENGINE PROGRESS.
If you cannot compute one of these: state PENDING. Never omit.
```

**Add to KNOWN BUGS section:**
- BUG-6: DPO triples from Phase B mock run have curriculumTier=null, same-model provenance. Must be deleted and regenerated.
- BUG-7: xiigen-shadow-runs index not initialised. Create placeholder records for T47/T48/T49 before Phase C.
- BUG-8: arbiterConfig field missing from T47/T48/T49 contracts. Must be added before Phase B re-run.

**Update ALWAYS-ACTIVE RULES:**
Add:
- Rule 9: M1: Every session must advance at least one layer (TEACH, IMPROVE, or REPLACE). Report which.
- Rule 10: P19: ISSUE INVENTORY before every ⛔ STOP. "Pre-existing" banned.
- Rule 11: P17: Every AI station uses arbiter panel, not single judge.
- Rule 12: P18: Every DPO triple has curriculumTier (non-null), targetModelFamily, cross-model provenance.

### What to update in XIIGEN-SESSION-SETUP-LIBRARY.md → v2.0

For each of the 6 session types, add:

**All session types — add SESSION EXIT PROTOCOL:**
Before every ⛔ STOP:
1. Run SK-445 MISSION PROGRESS CHECK (5 questions)
2. ISSUE INVENTORY (all warnings/failures found)
3. ENGINE PROGRESS section in PHASE-COMPLETE
4. SESSION FILE FORMAT GATE (if producing Claude Code files)

**GENERATION sessions — update Phase B guidance:**
- Phase B now uses multi-model (3 generators, blind Sonnet judge)
- arbiterConfig must be in contract before running
- Expected cycle 1 scores with real iron rules arbiter: 0.55–0.80 (not 1.0)
- V9/V10/V11 always run regardless of FLOW-39 status

**PLANNING sessions — add Gate C requirement:**
- SK-443 session-file-authoring-SKILL must be loaded at Gate C
- Self-containment verification must pass before session files are delivered
- SESSION FILE FORMAT GATE is part of Gate C

**MAINTENANCE sessions — update exit protocol:**
- SK-445 mission progress still required (even maintenance may advance IMPROVE layer)
- ISSUE INVENTORY required
- HEALTH-001 absolute test gate applies (not just delta)

**DEBUG sessions — add:**
- After root cause found: check if it was "pre-existing" — if yes, own it (P19)
- ISSUE INVENTORY includes all issues found during debug, not just the target issue

### What to update in FLOW-DESIGN-SKILL-INDEX.md

Update gap table:
- Gap 3 "Arbiters uniform": RESOLVED — SK-442 + FC-26 + topology updates
- Add Gap 6 "Mission layer absent": RESOLVED — M1-M5/P17–P22 in patch
- Add Gap 7 "Session files not self-contained": RESOLVED — SK-443 + HOW-TO-USE v2.0
- Add Gap 8 "Teaching fields missing from DPO": RESOLVED — P18 + learning-signal updates

Add new skills to table:
- SK-441: planning--simulation-protocol-SKILL.md (already in v1.0.3 analysis skills)
- SK-442: planning--arbiter-panel-design-SKILL.md (NEW — S2)
- SK-443: planning--session-file-authoring-SKILL.md (NEW — S5)
- SK-444: planning--principles-arbiter-SKILL.md (NEW — S2)
- SK-445: session-output--mission-progress-SKILL.md (NEW — S3)
- SK-446: planning--escalation-orchestrator-SKILL.md (NEW — S2)

Update version header to v2.0.

### What to update in INTEGRATION-INSTRUCTIONS.md

Update Step 1 cp block with new files.
Update Step 3 AGENTS.md section with SESSION COMPLETENESS RULE and RECEIVED INSTRUCTION QUALITY GATE.
Update Step 4 SKILL-INDEX section.
Update Step 5 verify section with new skill file names.

### Output
- `PATCH--contract-template-arbiter-config.md` (NEW)
- `XIIGEN-SESSION-START-PROMPT-v2.0.md`
- `XIIGEN-SESSION-SETUP-LIBRARY-v2.0.md`
- Updated `FLOW-DESIGN-SKILL-INDEX.md`
- Updated `INTEGRATION-INSTRUCTIONS.md`

---

## SESSION 7 — PACKAGE ASSEMBLY (FINAL)

### Focus
Assemble all files from Sessions 1–6 into downloadable packages.

### Input (all files produced by sessions 1–6)
All new and updated skill files, patches, and setup docs.

### What to produce

**Package 1: claude-code-flow-design-skills-v2.0.0.zip**
All skills for Claude Code execution environment:
- All carry-forward skills (unchanged from v1.0.3)
- All updated skills from Sessions 2–5
- New skills: SK-442 (arbiter-panel-design), SK-443 (session-file-authoring), SK-444 (principles-arbiter), SK-445 (mission-progress), SK-446 (escalation-orchestrator)
- All patch files: P14-P16 carry-forward + new M1-M5/P17-P22 patch + FREEDOM config patch + arbiter config patch
- FLOW-DESIGN-SKILL-INDEX.md v2.0
- INTEGRATION-INSTRUCTIONS.md updated
- HOW-TO-USE-SKILLS-v2.0.0.md

**Package 2: claude-project-flow-design-skills-v2.0.0.zip**
Same as Package 1 minus Claude Code-specific execution files (same content, project context).

**Package 3: XIIGEN-SESSION-START-PROMPT-v2.0.md** (standalone, paste-ready)

**Package 4: XIIGEN-SESSION-SETUP-LIBRARY-v2.0.md** (standalone, reference)

**Package 5: AGENTS-ADDITIONS.md**
Content to add to the codebase .claude/AGENTS.md:
- SESSION COMPLETENESS RULE
- RECEIVED INSTRUCTION QUALITY GATE
- Provider token registry update (AI_OPENAI_PROVIDER, AI_GEMINI_PROVIDER, AI_JUDGE_PROVIDER)

### S7 Additional Deliverable: FLOW-01 Session File Amendment

Produce updated FLOW-01-SESSION-B.md and FLOW-01-SESSIONS-C-D-E-F.md using v2.0
governance. These files must pass SK-443 self-containment verification before delivery.
Required changes:
- Multi-model generation (3 generators, blind judge per D-EXT-009)
- arbiterConfig block per SK-442 (T47=ROUTING min 3 arbiters, T49=ORCHESTRATION all 7)
- DPO validity gate (cross-model, curriculumTier required — T47=1, T48=5, T49=4)
- ENGINE PROGRESS section as first section of PHASE-COMPLETE template
- ISSUE INVENTORY before every ⛔ STOP
- Shadow run placeholder step (BUG-7 fix inline, not referenced)
- Delete corrupt triples step (BUG-6 fix inline)
This is S8 scope as recommended in reviews, but assigned to S7 to avoid adding a session.

### Pre-packaging gate additions (from review findings)

**Template FC self-check (Golden Rule applied to S2):**
Before packaging S7, run FC-26 against every `arbiterConfig` template in skill files,
not just against flow contracts. Any template that produces a contract failing its own
FC check must be fixed before packaging.
```bash
# FC-26 self-check on templates
grep -A 5 "key_principles" .claude/skills/planning--arbiter-panel-design-SKILL.md \
  | grep "expertise" | grep "M1-M5"
# Expected: "M1-M5 + P1-P22 + DNA-1..9 full text" — if absent, template fails FC-26
```

### Verification before packaging
- Count files in each zip and match INTEGRATION-INSTRUCTIONS cp list
- Verify FLOW-DESIGN-SKILL-INDEX skill count matches actual file count
- Verify HOW-TO-USE trigger table references all skill filenames correctly
- Verify version strings are consistent: v2.0.0 across all files

---

## SELF-REVIEW: DOES THE PLAN COVER EVERYTHING?

### Problems P-01 through P-17
| ID | Problem | Covered in |
|----|---------|------------|
| P-01 | Mission never encoded | S1 (M1-M5) ✅ |
| P-02 | Arbiter panel 1 judge | S2 (SK-442) ✅ |
| P-03 | No upper judge / dynamic panel | S2 (SK-442 Step 4) ✅ |
| P-04 | DPO lacks OSS fields | S1 (P18) + S3 (schema fix) ✅ |
| P-05 | V9 gate disabled | S4 (flow-implementation-guide) ✅ |
| P-06 | Pre-existing bug exemption | S1 (P19) + S4 (ISSUE-001, HEALTH-001) + S5 (HOW-TO-USE) ✅ |
| P-07 | Session files not self-contained | S5 (SK-443 + HOW-TO-USE) ✅ |
| P-08 | No mission visibility | S1 (P22) + S3 (SK-445) + S6 (session start) ✅ |
| P-09 | Signal types missing | S3 (MODEL_COMPARISON, SHADOW_RUN, ARBITER_VERDICT) ✅ |
| P-10 | Principles Arbiter missing | S1 (P20) + S2 (SK-444) ✅ |
| P-11 | SESSION FILE FORMAT GATE missing | S5 (HOW-TO-USE + AGENTS.md) ✅ |
| P-12 | SESSION-START-PROMPT stale | S1 fix (XIIGEN-SESSION-START-v2.md) ✅ |
| P-13 | arbiterConfig missing | S6 (PATCH--contract-template-arbiter-config.md) ✅ |
| P-14 | Judge model hardcoded Opus | S1 (D-EXT-009 + FREEDOM config patch) ✅ |
| P-15 | No canonical document ownership map | S1 fix (GOLDEN-RULE.md Gap A) + S6 (DOCUMENT AUTHORITY MAP in FLOW-DESIGN-SKILL-INDEX) ✅ |
| P-16 | No PATCH FORMAT STANDARD | S1 fix (freedom config patch updated) + S4 (FC-31 + plan-review note) ✅ |
| P-17 | Machine constants in schemas unguarded | S1 fix (S3 carry flag) + S4 (FC-31 detection) ✅ |

### Key principles check (the mission prompt)
- "proper planning → flows → nodes": M2 defines node as universal unit ✅
- "several models at each node": P17 arbiter panel ✅
- "upper judge may add more judges": SK-442 Step 4 dynamic expansion ✅
- "improve prompts/skills/context/RAG": M1 + V10 mission gate ✅
- "learning RAG positive/negative": SHADOW_RUN + ARBITER_VERDICT signals ✅
- "teaching OSS models": P18 + S3 DPO schema ✅
- "independent cost-effective engine": P21 gap score + P22 visibility ✅
- "not reflected during Claude Code running": S5 AGENTS.md additions ✅
- "not communicated back to me": S3 SK-445 + S6 session start MISSION STATE ✅

### Attached files coverage
- XIIGEN-SESSION-START-PROMPT.md → S6 ✅
- XIIGEN-COMMUNITY-GAP-REGISTER.md → context for S6 flow prep ✅
- XIIGEN-HANDOFF-PROMPT-2026-03-24.md → superseded by v2.0 session start ✅
- XIIGEN-EXTENSION-ARCHITECTURE-DECISIONS.json → D-EXT rules encoded in principles ✅
- skills.zip (all skill files) → S1-S6 update, S7 repackages ✅
- PHASE-THREE-PREPARATION-GUIDE.md → curriculumTier stripping fixed in S3/S4 ✅
- XIIGEN-RAG-REFERENCE.md → "infrastructure serves learning" → M1 (self-improvement) ✅
- XIIGEN-SESSION-SETUP-LIBRARY.md → S6 ✅
- chat_history transcripts → problem source ✅
- run_ready_flows.zip / orinal_flows.zip → flow context for S6 ✅
- flow-01-phase-a-fixtures.zip → arbiterConfig additions referenced ✅
- xiigen-mvp-Skills_Creation_Claude.zip → codebase confirms where fixes land ✅

### Missing from plan? Discovered gaps:
1. planning--simulation-protocol-SKILL.md needs 3 SILENT_FAILURE patterns → ADD to Session 4
2. code-execution--node-convergence-SKILL.md "This pattern applies at runtime" → covered in Session 2 ✅
3. PATCH--flow-implementation-guide-V10-PhaseF.md exists as separate patch — should be superseded by inline changes in Session 4, flag for deprecation in S7 ✅

---

## EXECUTION ORDER (start immediately after this plan is approved)

```
S1 → S2 → S3 → S4 → S5 → S6 → S7
Each session: PLANNING type. Gate on completeness before proceeding.
No chaining between sessions without explicit approval.
```
