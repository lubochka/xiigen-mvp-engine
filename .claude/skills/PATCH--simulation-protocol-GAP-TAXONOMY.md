# PATCH: planning--simulation-protocol-SKILL.md — Gap Class Taxonomy A-I
## Applies to: planning--simulation-protocol-SKILL.md (SK-441)
## Version: v2.2.0 | Date: 2026-03-26
## Source: Multi-review synthesis — architectural layer classification for gaps

---

## HOW TO APPLY

**Addition A** — In the Gap column section (after `fix_class: CONTENT | INTERFACE | EXTENSION | NEW_HANDLER | INFRASTRUCTURE`), add `gap_class` as a second classification field.

**Addition B** — Add the GAP CLASS TAXONOMY section after the SILENT_FAILURE section and before the DEPTH LEVELS section.

---

## ADDITION A: Extend gap column format

Replace the existing gap column format:
```
root_cause:    [one sentence — what doesn't exist that should]
symptom_test:  [if root cause is fixed, does this symptom disappear? yes/no]
fix_class:     CONTENT | INTERFACE | EXTENSION | NEW_HANDLER | INFRASTRUCTURE
```

With:
```
root_cause:    [one sentence — what doesn't exist that should]
symptom_test:  [if root cause is fixed, does this symptom disappear? yes/no]
fix_class:     CONTENT | INTERFACE | EXTENSION | NEW_HANDLER | INFRASTRUCTURE
gap_class:     A | B | C | D | E | F | G | H | I  (see GAP CLASS TAXONOMY below)
```

`fix_class` answers: what type of work is the fix?
`gap_class` answers: what architectural layer does the gap live in?

Both are required for BREAKS and SILENT_FAILURE verdicts.

---

## ADDITION B: GAP CLASS TAXONOMY section

Insert after the SILENT_FAILURE section, before DEPTH LEVELS:

---

## GAP CLASS TAXONOMY

Nine gap classes, organized by architectural layer. Every gap belongs to exactly one class.
The class determines which flows, skills, and principles are responsible for closing it.

```
Class A — EXTERNAL_KNOWLEDGE_INTAKE
  The engine cannot read and understand artifacts from outside its codebase.
  Gaps: no intake protocol for artifact type, no domain context package produced,
        CONTEXT_INSUFFICIENT not resolved because no retrieval path exists.
  Responsible: planning--system-intake-SKILL.md (SK-454), IntakePipelineService
  Example: "Pascal system cannot be analyzed because no legacy code intake protocol exists"

Class B — DOMAIN_REPRESENTATION
  The engine has no verified NODE representation for the capability.
  Gaps: no node: field in contract, genesis prompt stack-specific not derived,
        convergence.handler absent, NODE built without convergence.
  Responsible: code-execution--node-convergence-SKILL.md (SK-435), PATCH--contract-template-node-field
  Example: "T47 generates NestJS directly — no stack-neutral NODE exists"

Class C — SEMANTIC_RETRIEVAL
  The engine cannot retrieve relevant patterns by meaning, only by field filter.
  Gaps: IRagService not wired, patterns lack semanticContent, no vector index.
  Responsible: rag-retrieve.handler (Group A fix), PATCH--infrastructure-discovery-RAG-steps
  Example: "WordPress generation context not retrieved — pattern search uses NestJS tags"

Class D — MULTI_STACK_GENERATION
  The engine cannot generate for a target stack because the generation path doesn't exist.
  Gaps: HybridGenesisPrompt not used, stackTarget not passed, Section 4 missing for stack.
  Responsible: planning--stack-portability-design-SKILL.md (SK-453), Group D fix
  Example: "stackTarget='php-wordpress' produces NestJS output — no WordPress frame"

Class E — LEARNING_SIGNAL_CAPTURE
  The engine runs but captures wrong or no training data.
  Gaps: DPO validity gate absent, curriculumTier null, prompt.system null,
        fabricProviders empty, MODEL_COMPARISON not written, single-model DPO.
  Responsible: code-execution--learning-signal-capture-SKILL.md, Group A/B fixes
  Example: "Phase B produces 0 valid DPO triples — chosen.model === rejected.model"

Class F — ARBITER_SPECIALIZATION
  The engine evaluates quality without domain-specialized judgment.
  Gaps: single AI judge for all 5 dimensions, BLOCK semantics not enforced,
        key_principles arbiter not isolated, per-arbiter context packages absent.
  Responsible: planning--arbiter-panel-design-SKILL.md (SK-442), Group B fix
  Example: "DNA compliance check uses same model as iron rules — no specialization"

Class G — CROSS_FLOW_COORDINATION
  An invariant that holds within each flow is violated at the boundary between flows.
  Gaps: event field transformed by intermediate handler, BFA CF rule missing,
        cross-flow dependency not registered, wave assignment wrong.
  Responsible: CROSS_FLOW_TRACE (SK-441 extension), planning--wave-assignment-SKILL.md (SK-455)
  Example: "userId hyphen-stripping in FLOW-25 consumer breaks FLOW-01's idempotency key"

Class H — MISSION_VISIBILITY
  The engine produces work but does not report progress toward independence.
  Gaps: ENGINE PROGRESS absent from PHASE-COMPLETE, gap score not tracked,
        RagQualityTracker not persisted, shadow runs not seeded.
  Responsible: session-output--mission-progress-SKILL.md (SK-445), Group A/B/D fixes
  Example: "After 5 sessions: DPO count unknown, gap score PENDING, graduation date unknown"

Class I — MULTI_MODAL_OUTPUT
  The engine can generate code but not other output types from the same pipeline.
  Gaps: documentation generation not wired, migration plan output not supported,
        test file generation not an archetype, diagram output not a topology node.
  Responsible: New flows required for each output type (Q1-Q4 gate applies)
  Example: "Figma plugin improvement cannot produce documentation — only TypeScript code"
```

---

## GAP CLASS QUICK REFERENCE

| Class | Layer | Typical fix scope |
|-------|-------|-------------------|
| A | Intake | NEW FLOW (intake pipeline) or EXTENSION (intake skill) |
| B | Representation | EXTENSION (NODE field) + NEW FLOW (convergence.handler) |
| C | Retrieval | EXTENSION (handler wiring + semantic indexing) |
| D | Generation | EXTENSION (HybridGenesisPrompt + stackTarget) |
| E | Learning | EXTENSION (feedback/score handler fixes) |
| F | Evaluation | EXTENSION (arbiter dispatch + BLOCK semantics) |
| G | Cross-flow | CONVENTION (BFA rule) + EXTENSION (cross-flow trace) |
| H | Visibility | EXTENSION (ES write-back + mission progress commands) |
| I | Output types | NEW FLOW (Q1-Q4 gate applies per output type) |

---

## CROSS-GAP CONVERGENCE (update existing section)

When multiple gaps are found, classify each by gap_class before applying
root-cause-ladder-SKILL.md (SK-432):

```
Gaps with the same gap_class → share a root cause → likely one session fixes all
Gaps spanning A→B→C → ordered dependency → fix in class order (A first, C last)
Gaps in F that trace to E → arbiter gaps compound learning gaps → fix E before F
```

The gap_class distribution from a simulation run tells you which architectural
layer needs the most work. If 12 of 20 gaps are Class E: the learning signal
capture layer is the bottleneck. Fix Group A/B before designing new flows.

---

## ADDITION: Update HOW-TO-USE ANALYSIS PIPELINE

In HOW-TO-USE v2.3.0, the ANALYSIS PIPELINE step ② reads:
```
② solution-scope-gate  GAP CLASSIFICATION + deduplication + distribution
```

After this patch, step ② should read:
```
② solution-scope-gate  GAP CLASSIFICATION (fix_class) + gap_class taxonomy
   + deduplication + distribution by class
```
