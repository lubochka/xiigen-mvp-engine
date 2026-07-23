# GUIDE-B12 — How to Produce `FLOW-XX-DESIGN-SIMULATION-R1.md`
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 22 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-20

---

## FINAL GOAL (re-read before authoring any FLOW-XX-DESIGN-SIMULATION-R1.md):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

---

## WHAT THIS FILE IS

`FLOW-XX-DESIGN-SIMULATION-R1.md` is the **complete design simulation document** for a flow.
It is the most complex, highest-value document in List B — 800 to 2,000+ lines depending
on the number of task types. FLOW-09 (20 task types) is 1,936 lines.

This document drives AIgen code generation quality. The per-task PROMPT sections provide:
- Exact CONSTRAINTS Claude Code must enforce (MACHINE rules — no override)
- QUESTION YOURSELF checklists Claude Code must answer before submitting output
- UPSTREAM CONTEXT: step-by-step execution trace
- PRIOR NODES RAG references that prevent re-inventing solved patterns
- POSITIVE examples (chosen designs with scores)
- NEGATIVE examples (rejected designs with failure reasons)

**The design simulation is the primary source of architectural truth.** Any future session
implementing a task type must read this document first. The POSITIVE examples show what
correct implementations look like. The NEGATIVE examples show exactly what NOT to do and why.

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-02 | PRIMARY + STRUCTURE | LIBRARY-1-DESIGN-SIMULATION.md (Q0-Q5 process; ROUND structure; DPO triple format) |
| ZIP-04 | PRIMARY + STRUCTURE | SIMULATION-MASTER-PLAN.md (session-level simulation rounds R0-R8); SESSION-SIM-R0.md template |
| ZIP-08 | FIXTURE | Architecture RAG patterns (hist_arch_* IDs → PRIOR NODES references) |
| ZIP-09 | FIXTURE | Design-reasoning fixtures (hist_fd_* IDs → PRIOR NODES references) |
| ZIP-10 | FIXTURE | Per-flow locked decisions (D-HIST items → WHAT FLOW-XX INHERITS table) |
| ZIP-14 | REFERENCE | `ui-reasoning.csv` (product type → style); `states-and-variants.md` (B-46 client screens) |
| ZIP-15 | PRIMARY | §2 Screen Visibility Matrix; §3 structural templates; §5 flow-to-template mapping; §6 special categories |
| ZIP-16 | PRIMARY | Flow's business spec `{NN}-{slug}.md` → Q0 verbatim user question, Q2 five concerns, task type names |
| ZIP-17 | REFERENCE | ROLE-ANALYSIS-BATCH-{N} → which roles are in this flow (for B-46 section) |

**C30 note:** For FLOW-35..47 (no ZIP-16): derive Q0-Q4 from CURRENT-STATE.json +
DESIGN-SIMULATION-R1.md (existing sim as primary spec). For FLOW-01..34: ZIP-16 is primary.

---

## OUTPUT FILE SPECIFICATION

**Target path:** `docs/sessions/FLOW-XX/FLOW-XX-DESIGN-SIMULATION-R1.md`
**File size range:** 800-2000+ lines
**Sections:** 12 (see sequence below)
**When authored:** After STEP-8 (HANDOFF-CONTRACT) is complete; before implementation Phase A

---

## THE 12-SECTION STRUCTURE

```
1.  HEADER
2.  INVENTORY CHECK
3.  WHAT FLOW-XX INHERITS — NO RE-DERIVATION
4.  SESSION START CHECKLIST (Q0-Q5)
5.  PRE-DESIGN STEP TABLE (SF-CHECKs)
6.  ROUND 1 — TOP-LEVEL FLOW
7.  ROUND 2 — SUBFLOW DECISION
8.  COMPLETE FLOW ASSEMBLY
9.  FIVE DIMENSIONS — EVERY NODE
10. Per-task-type sections (T{N} through T{N+K})
11. DPO TRIPLES — NEW PATTERNS
12. FLOW-XX SUMMARY
+ B-46 CLIENT SCREEN INVENTORY (appended after ROUND 2 or COMPLETE FLOW ASSEMBLY)
```

---

## STEP-BY-STEP AUTHORING INSTRUCTIONS FOR CLAUDE CODE

### Pre-condition: read all source documents first

```bash
# Confirm flow spec exists (FLOW-01..34)
ls docs/flow-plan-preparation/business-flows/{NN}-{slug}.md 2>/dev/null || \
ls docs/flow-plan-preparation/*{slug}* 2>/dev/null | head -3

# Confirm prior STEP files exist
ls docs/sessions/FLOW-XX/FLOW-XX-STEP-*.md 2>/dev/null | wc -l
# All 10 STEP files should exist before authoring design sim

# Read STEP-1 (invariants) for DNA rules
head -30 docs/sessions/FLOW-XX/FLOW-XX-STEP-1-INVARIANTS.md

# Read STEP-8 (handoff contract) for iron rules and I/O contract
head -50 docs/sessions/FLOW-XX/FLOW-XX-STEP-8-HANDOFF-CONTRACT.md

# Get task type range
grep "task_range\|T[0-9]\{3\}" docs/sessions/FLOW-XX/FLOW-XX-PLAN-STATE.json | head -3
```

**CRITICAL:** Do NOT start writing the design simulation until all 10 STEP files are read.
The INVENTORY CHECK section must list what was actually read.

---

### Step 1: Write the HEADER

```markdown
# FLOW-XX — COMPLETE DESIGN SIMULATION
## {Flow Title}
## T{N} {TaskTypeName1} | T{N+1} {TaskTypeName2} | ... |
## T{N+K} {TaskTypeNameLast}
## Simulated by: XIIGen design co-architect mode
## Date: {YYYY-MM-DD}
```

Task type names come from `server/src/engine-contracts/{slug}-contracts.ts` or from the
flow's business spec. List every task type as `T{NNN} {ClassName}`.

---

### Step 2: Write the INVENTORY CHECK

```markdown
## INVENTORY CHECK

Documents confirmed read before this session:
\`\`\`
{Prior flows already simulated, e.g.:}
FLOW-01 R4                              ✅
FLOW-02 R1 + R2                         ✅
...
FLOW-{XX-1} R1                          ✅
Domain: {NN}-{slug}.md                  ✅ (spec v{N} — {brief description})
Deep research: {slug}_deep_research.md  ✅
Engine: {slug}-contracts.ts             ✅
Plan state: FLOW-XX-PLAN-STATE.json     ✅
\`\`\`
```

**Rule:** List only documents that were actually read. Do not fabricate inventory entries.
If a prior flow's design sim was read for inheritance patterns, list it here.

---

### Step 3: Write WHAT FLOW-XX INHERITS — NO RE-DERIVATION

This section lists design decisions from prior flows that this flow reuses. The table
prevents re-debating closed questions.

```markdown
## WHAT FLOW-XX INHERITS — NO RE-DERIVATION

| Pattern | Teaching for FLOW-XX |
|---|---|
| DR-{N} ({pattern name}) | {How this applies to FLOW-XX's specific task types} |
| {PATTERN-ID-001} | {Teaching point — what this pattern does for this flow} |
```

**Sources for inheritance patterns:**
- ZIP-10 (per-flow locked decisions: D-HIST items)
- ZIP-08/09 (ARCH_PATTERN + hist_fd patterns applicable to this domain)
- STEP-1-INVARIANTS.md §WHAT FLOW-XX INHERITS section (if it exists)

Only list patterns that are genuinely reused. Do not copy-paste all patterns from all
prior flows — be selective and specific to this flow's domain.

---

### Step 4: Write the SESSION START CHECKLIST (Q0-Q5)

This is the most important single section. Every question must be answered precisely
from the flow spec before writing any ROUND content.

```markdown
## SESSION START CHECKLIST

\`\`\`
Q0: User asked for — "{verbatim from the flow's business spec acceptance criteria
    or goal statement — copy exactly, do not paraphrase}"

Q1: Accomplishes — a user who {initial state} becomes:
    (a) {primary outcome} (sync — T{N}→T{N+1}→...→T{N+K})
        OR {alternative outcome} if {condition}
    (b) {secondary outcome} (async — T{...})
    (c) {tertiary outcome} (async — T{...})
    {CompletionEventName} fires when (a) is done.
    (b) and (c) are time-decoupled and do not block the completion signal.

Q2: Five concerns that collapse in naive designs:
    (a) {Concern title — specific domain failure mode}
        Natural order: {what someone would naively do}
        Wrong: {exactly what goes wrong — be concrete, name the race/bug}
        Correct: {what to do instead — be specific}

    (b) {Concern title}
        {same format: natural order → wrong → correct}

    (c) {Concern title}
        {same format}

    (d) {Concern title}
        {same format}

    (e) {Concern title}
        {same format}

Q3: Completion event — {EventName} (named NOW)
    NOT {wrong event 1} ({why it's wrong — which step it belongs to})
    NOT {wrong event 2} ({why it's wrong})
    {EventName} fires when T{N} completes {specific condition}.
    {Cross-flow consumers that depend on this event}

Q4: Downstream minimum payload:
    { {field1}, {field2}, ..., {fieldN} }
    {Consumer flow}: needs {subset of fields} for {purpose}
    {Consumer flow 2}: {subset} for {purpose}

Q5: Session type — DESIGN
\`\`\`
```

**Q2 rules — the five concerns must be:**
1. Specific to THIS flow's domain (not generic DNA rules)
2. Scenarios where naive code produces wrong behavior silently
3. Each scenario has three parts: naive path → wrong outcome → correct approach
4. Derived from the flow spec's domain risks + ZIP-08/09 failure mode patterns

**Q3 rule:** Name the completion event NOW. Never write `{TBD}` or `{see Round 1}`.
The completion event is derived from Q1's primary outcome: when does the primary state
transition finish? That's when the completion event fires.

---

### Step 5: Write the PRE-DESIGN STEP TABLE (SF-CHECKs)

One SF-CHECK per Q2 concern (minimum 5; may have more):

```markdown
## PRE-DESIGN STEP TABLE — {N} SILENT_FAILURE CHECKS

### SF-CHECK-{N}: {Q2 concern title}

\`\`\`
Step: T{NNN} {TaskTypeName} does {what}

Question: {the specific ordering/behavior question this check addresses}

Naive path: {what someone would write naturally}
  {concrete scenario with specific service names, data, timing}
  Wrong outcome: {what breaks — be specific, name the symptom}

Correct: {what the right design is}
  {specific mechanism: TTL hold, inline injection, transaction, etc.}
  {why this prevents the wrong outcome}

Verdict: SILENT_FAILURE if {specific wrong condition}
         {What silently breaks — no error, wrong data, race condition}
Fix: {what the IronRules BLOCK condition is}
     {what the POSITIVE example must show}
     Named check: {check_name_kebab_case} ({what the check verifies})\`\`\`
```

---

### Step 6: Write ROUND 1 — TOP-LEVEL FLOW

```markdown
## ROUND 1 — TOP-LEVEL FLOW

{One paragraph explaining the top-level decomposition decision:
 why these task types were chosen, what the primary flow branch is,
 where the sync/async split happens}

| # | Task Type | Archetype | Purpose |
|---|-----------|-----------|---------|
| 1 | T{N} {Name} | ROUTING | {what it orchestrates} |
| 2 | T{N+1} {Name} | VALIDATION | {what it validates} |
...
```

---

### Step 7: Write ROUND 2 — SUBFLOW DECISION

```markdown
## ROUND 2 — SUBFLOW DECISION

{Explain the branching decisions: what triggers each subflow,
 which task types belong to which path, where time-decoupling happens}
```

---

### Step 8: Write COMPLETE FLOW ASSEMBLY and FIVE DIMENSIONS

```markdown
## COMPLETE FLOW ASSEMBLY

{The assembled flow with all branches shown — describes how
 the task types connect via events and queues}

## FIVE DIMENSIONS — EVERY NODE

For each node in the flow, five dimensions are verified:
1. Structure: archetype, input event/trigger, output event
2. Intent: what business goal this node achieves
3. Constraints: MACHINE rules (no override) + FREEDOM configs
4. Quality: DPO score threshold, pattern type
5. Events: completion event fired + consumed events list
```

---

### Step 9: Write per-task-type sections (core of the document)

One section per task type T{N} through T{N+K}. This is the main body of the document.

```markdown
## T{NNN} — {TaskTypeName}

### PROMPT

**System:**
\`\`\`
CONSTRAINTS:
{N}. {Iron rule from STEP-8 HANDOFF CONTRACT — MACHINE rule only}
    {Description of what violates this rule}
    This is a MACHINE rule — no FREEDOM override exists.

{N+1}. {Another iron rule}
    {Description}

QUESTION YOURSELF:
1. {Yes/No question derived from constraint 1}
2. {Yes/No question derived from constraint 2}
...
\`\`\`

**User:**
\`\`\`
STEP: {What this task type does — one sentence}

UPSTREAM CONTEXT:
  {Event or trigger that reaches this task type}.
  {userId/tenantId/key fields} from ALS or event payload.
  STEP 1: {First action — service class (F{N}), method, what it returns}
  STEP 2: {Second action — with specific condition checks}
  STEP 3: {Third action}
  {Continue for all steps}
  Idempotency key: {if applicable — SETNX on what fields}

PRIOR NODES: [RAG: {pattern-id-001}, {pattern-id-002}]
\`\`\`

### CONTEXT

\`\`\`
Pattern: {PATTERN_NAME_001} (from ZIP-08/09 hist_arch_* or hist_fd_* fixtures)
  teachingPoint: "{multi-sentence teaching point — transferable to future flows}"
  qualityScore: 0.NN
  observedIn: [{FLOW-XX (T{NNN})}]
  applies_to: [{list of future flows}]

Pattern: {PATTERN_NAME_002} (from prior flow DPO)
  teachingPoint: "{teaching point}"
  qualityScore: 0.NN
\`\`\`

### CONNECTIONS

\`\`\`
Triggers: {CloudEvent or @EventPattern that fires this task type}
Emits: {output event(s)}
Consumes from queue: {queue fabric messages, if any}
Cross-flow consumers: {other flows that consume this task type's events}
\`\`\`

**POSITIVE (chosen — {model} round {N}, score {N.N}):**
\`\`\`typescript
// Iron rule confirmed: {what the positive example demonstrates}
// Named check: {check_name} — verified
export class {ServiceName}Handler {
  // ... correct implementation showing the MACHINE rule
}
\`\`\`

**NEGATIVE (rejected — {model} round {N}, score {N.N}):**
\`\`\`typescript
// SILENT_FAILURE: {what is wrong here}
// {Specific line that violates the iron rule}
// {What wrong outcome this produces}
export class {ServiceName}Handler {
  // ... wrong implementation
}
\`\`\`
```

**PRIOR NODES population rule:**
Read ZIP-08 (hist_arch_*) and ZIP-09 (hist_fd_*) for patterns applicable to this
task type's domain. Cross-reference with ZIP-10 (per-flow locked decisions) for
inherited patterns from prior flows.

Pattern ID format: `{domain}-{mechanism}-{sequential-number}` e.g.:
- `seat-before-payment-001` (domain: seat, mechanism: payment-ordering)
- `inline-fraud-check-001` (domain: fraud, mechanism: inline-injection)
- `setnx-idempotency-001` (domain: idempotency, mechanism: set-if-not-exists)

---

### Step 10: Write DPO TRIPLES — NEW PATTERNS

```markdown
## DPO TRIPLES — {N} NEW PATTERNS PRODUCED

\`\`\`
PATTERN-NAME-001
  teachingPoint: "{transferable principle applicable to ≥2 future flows}"
  qualityScore: 0.NN
  observedIn: [FLOW-XX (T{NNN})]
  applies_to: [FLOW-{XX+N}, FLOW-{XX+M}]
\`\`\`
```

Only include patterns that are NEW to this flow — not already in ZIP-08/09/10/11/12.
Each pattern must be applicable to ≥2 future flows.

---

### Step 11: Write FLOW-XX SUMMARY

```markdown
## FLOW-XX SUMMARY

{3-5 paragraph summary:
 1. What the flow does end-to-end
 2. The primary architectural decision and why
 3. The five SILENT_FAILURE risks and how they're prevented
 4. What patterns are new and which future flows benefit
 5. Cross-flow connections (which flows consume this flow's events)}
```

---

### Step 12: Add B-46 CLIENT SCREEN INVENTORY (v6.1 addition — C31)

After ROUND 2 or COMPLETE FLOW ASSEMBLY, insert the B-46 section:

```markdown
## CLIENT SCREEN INVENTORY — FLOW-XX (B-46)

### FP-1 Gate: Domain Screen vs CRUD Fallback Classification

| Screen | Classification | Primary role | Route | Justification |
|--------|---------------|-------------|-------|---------------|
| {ScreenName}Page | DOMAIN_SCREEN | {role from SK-539 §3} | /{route} | {business state rendered} |

### Screen: {ScreenName}Page

**Q1 ROLE_TIER:** {PLATFORM_ENG | PLATFORM_OPS | TENANT_OPS | TENANT_CONSUMER | PUBLIC}
**Q2 ROLE_GATE:** {specific role from SK-539 §3 taxonomy}
**Q3 ROUTE_GUARD:** {/{route} — /admin/... for platform roles; /... for consumer}
**Q4 VISIBILITY:** {from 12-scope registry — V-{scope}}

### Role visibility matrix:
| Role | Sees this screen? | What they see | Variant |
|------|------------------|---------------|---------|
| {role-A} | YES | {description} | FULL |
| {role-B} | NO  | Redirect to {route} | — |

### Screen template (SK-539 §5):
Template: {T-N — TemplateName} | NOT APPLICABLE

### Missing-page registry check (SK-539 §6):
{Only for FLOW-20, 21, 28, 48 — add required page status}
```

Sources for B-46: ZIP-15 §2+§3+§5+§6, ZIP-14 `ui-reasoning.csv`,
ZIP-16 spec personas, ZIP-17 ROLE-ANALYSIS-BATCH-{N}.
**B-50 MUST be generated before B-46** (C35 — see GUIDE-B50).

---

## SELF-CHECK BEFORE SAVING

```
□ INVENTORY CHECK: lists documents actually read (not fabricated)
□ Q0: verbatim from spec (not paraphrased)
□ Q2: five concerns are domain-specific (not generic DNA rules)
□ Q3: completion event named NOW (not deferred, not TBD)
□ Q4: downstream payload includes all cross-flow consumer fields
□ SF-CHECKs: one per Q2 concern, with 3-part structure (naive/wrong/correct)
□ Per-task sections: CONSTRAINTS are from STEP-8 HANDOFF CONTRACT iron rules
□ PRIOR NODES: pattern IDs from ZIP-08/09/10 (not invented)
□ POSITIVE examples have scores (N.N format)
□ NEGATIVE examples explain why they fail (not just "wrong")
□ DPO TRIPLES: only new patterns applicable to ≥2 future flows
□ B-46 section: present for TENANT_FACING/PUBLIC flows; omitted for INTERNAL_ONLY
□ File saved to docs/sessions/FLOW-XX/FLOW-XX-DESIGN-SIMULATION-R1.md
```

**SILENT_FAILURE RISK 1:** Paraphrasing Q0 instead of copying verbatim. The Q0 statement
is what the iron rule derivation checked against. Paraphrase changes meaning and can
make iron rules appear to cover concerns they don't.

**SILENT_FAILURE RISK 2:** Writing PRIOR NODES pattern IDs from memory rather than
consulting ZIP-08/09. Pattern IDs must exist in the fixture corpus or the generation
pipeline won't find them. Check: `grep -r "{pattern-id}" fixtures/rag-patterns/ | head -3`

**SILENT_FAILURE RISK 3:** Q2 concerns that are generic DNA rules (e.g., "don't forget
tenantId"). Generic rules go in STEP-1 INVARIANTS. Q2 is for domain-specific failure
modes specific to THIS flow's business logic.

**SILENT_FAILURE RISK 4:** Omitting the B-46 section for TENANT_FACING flows. Without it,
Claude Code will implement generic CRUD panels instead of domain screens (FP-1 failure pattern).

---

## OBSERVED EXAMPLE: FLOW-09

FLOW-09 has 20 task types (T99-T118), 1,936 lines, 7 SF-CHECKs, and ~20 PRIOR NODES
pattern IDs across the task sections. The Q2 five concerns are:
1. Seat claimed after payment → double-booking race
2. Fraud gate fail-closed → all purchases blocked when fraud service down
3. Group booking non-transactional → partial group tickets silently created
4. Refund failure without compliance queue push → orphaned refunds
5. FeeCalculator with database writes → orphaned fee records on crash

Each SF-CHECK directly maps to one Q2 concern with a named check (iron rule label).
The named checks appear in STEP-1-INVARIANTS.md and in each task type's CONSTRAINTS.

---

## C30/C38 SOURCE SPLIT NOTE

**FLOW-01..34 (ZIP-16 primary):** Q0 comes from spec verbatim. Task type names from
spec's deep research or engine file. ZIP-16 `{NN}-{slug}.md` is the primary source.

**FLOW-35..47 (no ZIP-16):** Q0 from CURRENT-STATE.json goal statement or existing
DESIGN-SIM text. Task type names from IMPL-STATE.json task_types object.

**FLOW-48 (`i18n-translation`):** ZIP-17 BATCH-10 provides role-template data.
The B-46 section must include `/settings/language` page (missing-page from SK-539 §6).

---

## AUTHORING QUALITY GATE

This guidance file is SELF-SUFFICIENT if a Claude Code session can produce a correct
`FLOW-XX-DESIGN-SIMULATION-R1.md` using only:
1. This guidance file
2. The flow's business spec (ZIP-16 for FLOW-01..34)
3. The flow's STEP-1-INVARIANTS.md and STEP-8-HANDOFF-CONTRACT.md
4. ZIP-08/09 fixture catalog (for PRIOR NODES pattern IDs)
5. ZIP-15 (for B-46 role visibility matrix)

---
*GUIDE-B12 | Round 22 | Phase 4 — Guidance File Authoring*
*Sources: ZIP-02 (P+S), ZIP-04 (P+S), ZIP-08/09/10 (F — PRIOR NODES), ZIP-14 (R), ZIP-15 (P — B-46), ZIP-16 (P), ZIP-17 (R — B-46 roles)*
*Most complex guidance file in library: 12 sections, 800-2000 lines output, 10 ZIP sources*
*Next: GUIDE-B13 — SESSION-SIM-RN family (Round 23)*
