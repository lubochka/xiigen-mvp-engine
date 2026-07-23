# XIIGEN SESSION SETUP LIBRARY — v2.0.0
## Updated: 2026-03-25 | Supersedes v1.x
## Canonical home: FLOW-DESIGN-SKILL-INDEX.md

---

## PURPOSE

This library provides ready-to-use session preambles for each session type.
Copy the appropriate preamble to the top of every session file before executing.
Each preamble is self-contained — no cross-references.

---

## SESSION TYPE 1: PHASE B GENERATION (code generation)

```
MISSION STATE (inline — query before proceeding):
  Valid DPO triples to date: [query xiigen-training-data count]
  Shadow gap T47: [query xiigen-shadow-runs / PENDING if not initialised]
  Shadow gap T48: [query xiigen-shadow-runs / PENDING if not initialised]
  Graduation target: 80 valid cross-model triples

GOVERNANCE CHAIN (active for this session):
  □ planning--arbiter-panel-design-SKILL.md (SK-442) loaded
  □ code-execution--learning-signal-capture-SKILL.md loaded
  □ code-execution--flow-implementation-guide-SKILL.md loaded

MANDATORY INLINE REFERENCES:
  DPO REQUIRED FIELDS (P17+P18 — every feedback.handler):
    curriculumTier:         [from tier table — NEVER null]
    chosen.model:           must differ from rejected.model
    rejected.model:         must differ from chosen.model
    modelComparison.shuffleWasApplied: true
    prompt.system:          full genesis prompt text — non-null
    targetModelFamily:      freedomConfig.get('xiigen.oss_target_model') ?? 'deepseek-coder-v2'
    instructionFormat:      freedomConfig.get('xiigen.oss_instruction_format') ?? 'deepseek-coder'
    distillationReadiness:  'READY' | 'TOO_COMPLEX' | 'PENDING_SIMPLIFICATION'

  CURRICULUM TIER TABLE:
    ROUTING: 1 | DATA_PIPELINE: 2 | VALIDATION: 2 | TRANSACTION: 3 | ORCHESTRATION: 4 | SCHEDULED: 5

  TEST GATE (P19 — absolute):
    cd server && npx jest 2>&1 | tail -5   → failures === 0
    cd client && npx jest 2>&1 | tail -5   → failures === 0

BEFORE ⛔ STOP:
  1. Load session-output--mission-progress-SKILL.md (SK-445) → ENGINE PROGRESS section FIRST
  2. ISSUE INVENTORY: every found issue = FIXED or DEFERRED (not "pre-existing")
  3. Test gate: failures === 0
```

---

## SESSION TYPE 2: PLANNING SESSION (web — flow design)

```
MISSION STATE: [query ES or state PENDING]
  Valid DPO triples: N | Shadow gap: N% / PENDING | Target: 80 triples

GOVERNANCE CHAIN (active):
  □ FC-1..FC-31 plan review gates active
  □ FC-26: arbiter panel completeness (min arbiters per archetype)
  □ FC-28: session file self-containment (7 checks before Gate C)
  □ FC-12: M1-M5 + P1-P22 compliance

PRINCIPLE REMINDER (inline — P17/P20):
  Every multi-generate.handler topology needs arbiterConfig.
  key_principles arbiter: isolated:true, blockSemantics: ANY_BLOCK_CLASS_REJECTS.
  No hardcoded model names — use FREEDOM config tokens.

GATE C REQUIREMENTS:
  □ SK-443 session-file-authoring: all 7 self-containment checks pass
  □ ARCHITECTURE-DECISIONS.json: DESIGN_REASONING triples for all decisions
  □ SK uniqueness sweep: grep -rn "SK-44[0-9]" *.md | grep -v SKILL-INDEX | sort
```

---

## SESSION TYPE 3: MAINTENANCE SESSION (skill/file updates)

```
SCOPE: Luba's direct instruction. Execute directly. One ⛔ STOP at end.
No plan gates. Internal plan only.

BEFORE ⛔ STOP (mandatory even in maintenance):
  1. ENGINE PROGRESS (SK-445) — query ES, state PENDING if absent
  2. ISSUE INVENTORY — every issue found = FIXED or DEFERRED
  3. FC-10 propagation sweep: grep for any values changed in this session
     across all affected files
  4. C-6 SK sweep (if any skill files changed):
     grep -rn "SK-44[0-9]" *.md | grep -v SKILL-INDEX | sort
```

---

## SESSION TYPE 4: INVESTIGATION SESSION

```
GOVERNANCE CHAIN:
  □ planning--claim-verification-SKILL.md — SESSION-OPENING STATE PROTOCOL
  □ planning--simulation-protocol-SKILL.md (SK-441) — trace actual handlers
  □ SILENT_FAILURE priority: single-model DPO, same-model score, FLOW-39 masking

OUTPUT REQUIRED:
  session-output--investigation-handoff-SKILL.md (SK-433):
    discoveries[], rejected_claims[], open_questions[]
  session-output--mission-progress-SKILL.md (SK-445):
    Did this investigation unblock any graduation progress?

BEFORE ⛔ STOP:
  1. ENGINE PROGRESS (SK-445)
  2. ISSUE INVENTORY
  3. Investigation handoff document complete
```

---

## SESSION TYPE 5: PHASE A (topology design / seeding)

```
MISSION STATE: [query ES]

GOVERNANCE CHAIN:
  □ planning--bootstrap-boundary-SKILL.md — no premature TypeScript
  □ code-execution--node-convergence-SKILL.md (SK-435) — build NODE first
  □ V12: NODE REPRESENTATION INTEGRITY gate (manual until convergence.handler active)
  □ ARCHITECTURE-DECISIONS.json seeded to RAG at Phase A END (not Phase F)

NODE COMPLETENESS CHECK (V12 — before Phase B):
  For each task type with decision=FLOW:
    □ structure: inputShape, outputShape, dependencies, triggers, emits
    □ intent: purpose, invariants, failureModes, domainConcepts
    □ Seeded to xiigen-rag-patterns as NODE_REPRESENTATION

BEFORE ⛔ STOP:
  1. ENGINE PROGRESS (SK-445)
  2. ISSUE INVENTORY
  3. ARCHITECTURE-DECISIONS.json produced and seeded path confirmed
```

---

## SESSION TYPE 6: PHASE E (DPO/teaching data)

```
MISSION STATE (critical for this session type):
  Valid DPO triples: N | Pending: N | Per-tier breakdown: [ES query]
  Target: 80 valid triples. Invalid (null tier or same-model): 0.

DPO VALIDITY GATE (inline — must run before storing any triple):
  □ chosen.model ≠ rejected.model (different families — P17)
  □ modelComparison.shuffleWasApplied === true
  □ prompt.system non-null (GAP-08)
  If single provider: status='PENDING_COMPARISON', store to xiigen-training-data-pending

V9 GATE (NEVER skip):
  V9-002: chosen.model ≠ rejected.model for all triples this flow
  V9-003: curriculumTier non-null for all triples (ROUTING=1..SCHEDULED=5)
  V9-004: xiigen-shadow-runs has placeholder for each task type

BEFORE ⛔ STOP:
  1. ENGINE PROGRESS (SK-445) — DPO triple count is the primary metric
  2. ISSUE INVENTORY — invalid triples are BLOCKING issues
  3. Test gate: failures === 0
```

---

## SHARED: FOUND-ISSUE PROTOCOL (paste into every session file)

```
FOUND-ISSUE PROTOCOL:
  1. STOP at point of discovery
  2. Record: description | BLOCKING/NON-BLOCKING | root cause | fix or escalate
  3. BLOCKING: fix before next step (or escalate with full context)
  4. NON-BLOCKING: complete current step, fix before ⛔ STOP
  5. Never label "pre-existing" without Luba written authorization
  6. Never skip steps with unresolved BLOCKING issues
  7. POST-FIX VERIFICATION: grep for old value → 0 hits before marking FIXED
```

---

## SESSION TYPE 7: ARCHITECT SESSION (structural thinking, co-architect conversation)

```
DECLARED JOB FOR THIS ROUND:
  [State in one sentence before anything else]
  Current stage: [ ] STAGE 1 — Gather  [ ] STAGE 2 — Analyze  [ ] STAGE 3 — Conclude

CORRECTION THREAD:
  C1: "[verbatim]" — Status: ADDRESSED / OPEN / SESSION-RESTART
  C2: "[verbatim]" — Status: ADDRESSED / OPEN / SESSION-RESTART
  [SESSION-RESTART: declare restart before any other content]

GOAL (verbatim — never paraphrase):
  "[Paste exact words from Luba's request]"

SESSION MODE: [ ] THINKING (prose conversation) / [ ] PLANNING (findings format)

Q0 STATUS:
  [ ] Pipeline position known → answer Q0a–Q0d
  [ ] No pipeline position → Q0 DEFERRED (do not halt at CONTEXT_INSUFFICIENT)

KNOWLEDGE LOAD (governance before domain — complete before Stage 1):
  Round 1: Governance (establishes rules before any output appears)
    [ ] HOW-TO-USE-SKILLS.md read completely
    [ ] XIIGEN-DESIGN-ARCHITECT-SESSION-GUIDE-v1.9.md read completely
        (incl. Mistakes 24–28, Sections 2b/2c/8, P-A8)
  Round 2: Index and domain skills
    [ ] FLOW-DESIGN-SKILL-INDEX.md (v4.0+) read — load orders and invocation guidance
    [ ] SKILL-INDEX-v4.0.0.md read — skill existence authority (117 skills)
    [ ] data-connection-classification read (if domain involves flows or data)
    [ ] planning--system-intake-SKILL.md (SK-454) read
    [ ] [other domain skills identified from index]

--- STAGE 1: GATHER (no analysis or interpretation permitted) ---

RECON REPORT STATUS: [ ] Not started  [ ] In progress  [ ] Complete
File reads: [N] / 20 required
Grep counts: [N] / 8 required
Verbatim excerpts: [N] / 10 required
STATE.recon saved: [ ] YES  [ ] NO

PENDING_VERIFICATION CLAIMS (from session opening — each needs a STATE.recon entry):
  Claim 1: "[verbatim]" — Status: CONFIRMED / DISCONFIRMED / PARTIAL / DEFERRED
  Claim 2: "[verbatim]" — Status: CONFIRMED / DISCONFIRMED / PARTIAL / DEFERRED

STAGE 1 GATE: [ ] All thresholds met  [ ] STATE.recon saved  [ ] All claims resolved or DEFERRED
→ DO NOT proceed to Stage 2 until gate passes

--- STAGE 2: ANALYZE (no conclusions or design proposals permitted) ---

READING ORDER (check before examining any file):
  [ ] (a) Intent first: DECISIONS-LOCKED.md, DD-xxx records (not V2 master plan)
  [ ] (b) Structure: fabric interfaces, patterns, skill classifications
  [ ] (c) Implementation: specific files chosen by questions from (a) and (b)
  [ ] (d) Gaps: carry-forward issues, incomplete phases

THREE PERSPECTIVES (each stated separately — no mixing):
  [ ] Perspective 1 (Implementation): what code actually does — file:line evidence
  [ ] Perspective 2 (Product Intent): what system is supposed to do — DECISIONS-LOCKED only
  [ ] Perspective 3 (Principles): does hypothesis violate M1-M5 / P1-P22 / DNA-1..9?
      Examined WITHOUT domain context or file names.

CONTRADICTIONS FOUND:
  Finding A vs Finding B: "[what A says]" vs "[what B says]"
  Bridging evidence needed: [specific file or grep]
  Status: UNRESOLVED / RESOLVED — "[bridging evidence citation]"

SK-530 SCORE PER FINDING:
  Finding 1: [N] file:line + [N] counts + [N] verbatim = [total] / 11 required

STAGE 2 GATE: [ ] All findings ≥ 11 SK-530 points  [ ] All 3 perspectives stated
              [ ] All PENDING claims resolved  [ ] All contradictions named
→ DO NOT proceed to Stage 3 until gate passes

--- STAGE 3: CONCLUDE (synthesis only — must cite Stage 2 findings) ---

Every synthesis claim must cite a STATE.recon line or named Stage 2 finding.
Claims without citations are assumptions — label them: "ASSUMPTION — needs [specific read]."

UNRESOLVED CONTRADICTIONS CARRIED FORWARD:
  [list each from Stage 2 that was not resolved — each is FLAGGED in synthesis]

COMMITMENT GATE (P-A8 — required before STOP):
  Working hypothesis: [specific architectural claim about the domain examined]
  Evidence that would overturn this: [named file or command, not "further study"]
  Confidence: [HIGH / MEDIUM / LOW]

THE OVERTURNING CHECK (for each conclusion):
  Q1 — Working hypothesis: [stated above]
  Q2 — Overturning condition: [named file or observable]
  Q3 — External disagreement: [source that would likely object + whether it was read]

STAGE 3 GATE: [ ] Every synthesis claim cited  [ ] SK-530 self-check passed
              [ ] All contradictions: RESOLVED (with evidence) or FLAGGED (with action)
              [ ] Commitment gate answered (P-A8)
              [ ] Q3 external disagreement check done
              [ ] No governance artifacts in response body to Luba

BEFORE STOPPING:
  [ ] Correction thread: no OPEN corrections unaddressed
  [ ] Output is prose sentences (THINKING mode) or findings with citations (PLANNING mode)
  [ ] "I now have the full picture" or equivalent — NOT PERMITTED unless Stage 3 gate passes
```
