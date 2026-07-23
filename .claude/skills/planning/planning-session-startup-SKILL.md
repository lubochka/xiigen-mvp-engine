---
name: planning-session-startup
version: "1.2.0"
description: >
  Orients any planning session. Establishes execution context (implementation
  mode + scope), baseline numbers, locked decisions, and governing documents.
  v1.2 adds Question 0: extract implementationMode + stackTargets/clientTargets
  BEFORE any content review. Without this, a plan can pass all checks and
  still route to the wrong executor or contain out-of-scope content.
layer: planning
createdAt: 2026-03-20
updatedAt: "2026-03-22"
requires: []
complements: [decision-reopening, document-hierarchy, blast-radius-assessor, implementation-mode-gate]
---

# Planning Session Startup v1.2

## Purpose

Every planning session starts with the same five risks: wrong executor,
wrong scope, stale baseline numbers, reopened decisions, and competing
documents. This skill eliminates all five before a single line of plan
is written.

## When to Invoke

- Session begins with "let's plan", "continue from", "start the next flow"
- Any message referencing a flow number for the first time in a session
- After a conversation compaction or context reset
- When STATE.json or baseline numbers are referenced

## Pattern

**Five questions. Answer all five before writing anything.**

### Question 0: Who writes the code and what's in scope? (NEW v1.2)

```
Read: STATE.json → implementationMode
  If absent: STOP. Declare implementationMode FIRST.

  af-pipeline: XIIGen AF pipeline generates .service.ts files.
    Claude Code writes contracts, prompts, schemas, topology.
    SESSION files must reference afPipeline.run(), not create_file.
    Valid for: FLOW-01..24, FLOW-25+, FLOW-34, FLOW-36.

  manual: Claude Code writes everything.
    Valid for: FLOW-00.x, FLOW-35 Phase A-C.
    Justification REQUIRED.

  hybrid: Claude Code writes scaffold, AF pipeline generates services.
    Valid for: FLOW-35 Phase D+.

Read: STATE.json → stackTargets, clientTargets
  If absent: STOP. Declare targets FIRST.

  These become the SCOPE FILTER for the entire session:
    - Topology stateNotes: ONLY for clientTargets
    - Coupling maps: full entries ONLY for stackTargets + platforms
    - V31/FC-21 checks: ONLY for clientTargets
    - Everything else: APPENDIX A (not plan body)

This question GATES all other questions.
If implementationMode is wrong, nothing else matters.
If scope is wrong, every review item checks the wrong content.
```

### Question 1: What is the current baseline?

```
Read: sessions/STATE-v4.json → corrected_baseline_chain
Find: the last entry (most recently completed flow's exit count)
This is your FLOOR. Any plan that claims a lower entry count is wrong.

If the conversation claims a number — verify it against STATE.json.
If they disagree: STATE.json wins. Always.
```

### Question 2: What has already been decided?

```
Read: DECISIONS-LOCKED.md (Tier 1 — mandatory)
Scan: D1–D18, SDK-1–5, CLIENT-1–4, E2E-1–5, D-FT-1, D-36-1 through D-36-5

For each decision relevant to your planned work:
  → "This is already decided: [decision]. I will not reopen it."
  → If it needs changing: add ADR entry FIRST, then update the plan.

Key decisions to check for Feature Registry work:
  D-FT-1:  FT-001+ namespace reserved — DO NOT use FT-prefix for other artifacts
  D-36-1:  canonicalImplementation TBD until source flow executes
  D-36-4:  porting threshold is FREEDOM config (tenant-tunable)
  D-36-5:  portingCandidate=false can only be changed via ADR — never via tenant config

Never re-derive a locked decision from first principles.
Never "re-examine" a decision without an ADR entry.
```

### Question 3: Which document governs this work?

```
Read: PROJECT_REFERENCE.md → Document Map

Tier 1: Always read if not already loaded this session
  - DECISIONS-LOCKED.md
  - PLATFORM-SPEC-CONSOLIDATED.md
  - INFRASTRUCTURE-FLOWS-STATE-v4.json

Tier 2: Read if planning a user-facing flow (FLOW-01 through FLOW-24)
  - FLOW-REEXAMINATION-ALGORITHM.md
  - FLOW-01-REFERENCE-PLAN-v5.md (as template)

Tier 3: Read if planning engine or arbitration changes
  - FLOW-35-REFERENCE-PLAN-v2.md
  - META-ARBITRATION-LAYER.md
  - ENGINE-MODIFICATION-PROTOCOLS.md

Tier 3 (NEW): Read if planning Feature Registry work
  - FEATURE-REGISTRY-S1-PLAN-v2.md  ← addendum v2.0 (runs after FLOW-33)
  - FLOW-36-REFERENCE-PLAN-v2.md    ← Feature Registry flow (runs after FLOW-35)
  - contracts/features/             ← existing FT records and schema

Tier 3 (Flow visibility — read before planning any FLOW-01..24 session):
  - docs/FLOW-EXECUTION-VISIBILITY-PLAN.md  ← 5 additions, gate templates

Tier 3 (Parallel execution — read before planning Wave 2+ sessions):
  - docs/PARALLEL-EXECUTION-PLAN.md  ← wave structure, pre-allocation

Tier 3 (Feature Registry groundwork):
  - docs/FEATURE-REGISTRY-S1-PLAN-v2.md  ← schema v2.0, xiigen self-scan (Option B)

Tier 3 (Bundle activation):
  - docs/FLOW-00-REFERENCE-PLAN-v1.md  ← Bundle Activation flow

Tier 3 (Client architecture — read before planning any user-facing flow):
  - docs/CLIENT-ARCHITECTURE-SPEC.md     ← useFlow hook, offline queue, draft state, background signals (V24–V28)
  - docs/CLIENT-TESTING-PLAN.md          ← C1–C5 test categories, test infrastructure
  - docs/CLIENT-ARCHITECTURE-ADDENDUM.md ← per-flow client values for FLOW-01..12
```

**Only after all three questions are answered: begin the plan.**

## Execution Order (authoritative — verify against STATE-v4.json)

```
FLOW-0A → SKILL-GRAPH-S1
→ FLOW-25 → FLOW-27 → FLOW-29 → FLOW-30 → FLOW-26
→ FLOW-31 → FLOW-33 (v3)
→ FEATURE-REGISTRY-S1 (S1-A + S1-B, schema v2.0)
→ FLOW-35 (v2) → FLOW-36 → FLOW-00 → FLOW-34
→ FLOW-01 (Wave 0) → FLOW-02 (Wave 1) → FLOW-03..24 (Wave 2+ parallel)
```

## Positive Example

```
Session start: "Let's plan FLOW-02"

CORRECT:
  1. Read STATE-v4.json → baseline: verify live (after FLOW-35 + FLOW-36 ≈ 4,270+)
  2. Read DECISIONS-LOCKED.md → D8 (SDK), D3 (Mode C), D-FT-1 (FT namespace)
     DPO triples for FLOW-02 will include ftId — FLOW-36 already ran.
  3. Read PROJECT_REFERENCE.md → FLOW-02-REFERENCE-PLAN-v2.md is Tier 4.
     FLOW-REEXAMINATION-ALGORITHM.md applies — run 7 passes.
  4. Check contracts/features/ — T50/T51/T52 FT records exist, portingCandidate=true.
  5. Begin FLOW-02 re-examination plan.
```

## Negative Example

```
Session start: "Let's plan FLOW-02"

WRONG:
  → Immediately produce FLOW-02 session files
  → Claim test baseline is 3,993 (FLOW-01 estimate, not live count)
  → Re-discuss whether Mode C should be the default
  → Create a new FT record without checking contracts/features/ for existing ones
  → Use FT-prefix for a factory or task type artifact
```

## Integration

```
requires:    [] — this is the entry point, no prerequisites
complements: SK-417 (decision reopening)
             SK-423 (document hierarchy — check contracts/features/ before creating FT docs)
             SK-424 (blast radius — portingCandidate changes have wide blast radius)
```

## Test

```
Given: new session, message "let's plan FLOW-03"
Expected:
  - STATE.json consulted before any number is stated
  - DECISIONS-LOCKED.md checked including D-FT-1 and D-36-x decisions
  - PROJECT_REFERENCE.md consulted for which Tier 2/3/4 documents apply
  - contracts/features/ checked if task involves Feature Registry
  - No plan produced until all 3 questions answered

Failure indicators:
  - Session produces a plan with unchecked baseline numbers
  - Session re-debates a locked decision
  - Session produces a document that duplicates an existing one
  - Session uses FT-prefix for a non-Feature-Registry artifact
  - Session calls PortingCostEstimator without checking portingCandidate first
```
