---
name: document-hierarchy-navigator
sk: SK-423
description: >
  Prevents the creation of competing or duplicate documents. Ensures every
  concern has exactly one canonical document. Routes planning questions to
  the correct source. Use before producing any new document and before
  answering any architectural question from memory.
layer: planning
version: 1.0.0
createdAt: 2026-03-20
requires: [SK-416]
complements: [SK-417]
---

# DocumentHierarchyNavigator [SK-423]

## Purpose

Competing documents with conflicting numbers are a recurring failure mode
in XIIGen. One document says CF-510, another says CF-537. One plan says
T103, another says T83. The hierarchy navigator prevents new documents
from being produced when an authoritative one already exists, and routes
questions to the single correct source.

## When AF-4 RAG Retrieves This Skill

- "Let me document this decision"
- Before producing any .md or .json file
- When answering an architectural question about the platform
- "Where do I find the X for FLOW-XX?"
- When two documents appear to conflict

## Pattern

### Before producing any document — three checks

**Check 1: Does a canonical document already exist for this concern?**

```
Read: PROJECT_REFERENCE.md → Document Map

If a Tier 1, 2, or 3 document already governs this concern:
  → Do NOT produce a new document
  → Instead: update the existing canonical document
  → Add a section, extend it, version it (v1 → v2)
  → Never create a competing parallel document

Only create a new document if:
  □ No existing document covers this concern
  □ The concern is a NEW flow reference plan (FLOW-XX-REFERENCE-PLAN.md)
  □ The document is a session file (SESSION-FLOW-XX-Y.md)
  □ The document is a STATE.json checkpoint
```

**Check 2: Is the information being produced consistent with existing documents?**

```
Any new document must not contradict:
  □ DECISIONS-LOCKED.md (any decision D1–D18, SDK, CLIENT, E2E)
  □ INFRASTRUCTURE-FLOWS-STATE-v4.json (baseline numbers, artifact ranges)
  □ The canonical Tier 1 documents

If a conflict is found: the existing document is right. Investigate why
the new document produces a different result before writing anything.
```

**Check 3: Is this a superseded document being accidentally referenced?**

```
Superseded documents (DO NOT USE for new planning):
  FLOW-01-REFERENCE-PLAN.md      → use FLOW-01-REFERENCE-PLAN-v5.md
  FLOW-01-REFERENCE-PLAN-v2.md   → use v5
  FLOW-01-REFERENCE-PLAN-v3.md   → use v5
  FLOW-01-REFERENCE-PLAN-v4.md   → use v5
  FLOW-MANAGEMENT-ARCHITECTURE.md → use PLATFORM-SPEC-CONSOLIDATED.md
  PLATFORM-ENGINEERING-SPEC.md   → use PLATFORM-SPEC-CONSOLIDATED.md

If a superseded document is referenced in a question:
  → Note the supersession, use the canonical version instead
  → Do not propagate superseded content
```

### Routing table — "where is the answer to this question?"

```
Architectural decision rationale  → DECISIONS-LOCKED.md
Current test baseline count       → STATE-v4.json → corrected_baseline_chain
Next available artifact number    → STATE-v4.json (last used + 1)
CI pipeline behavior              → PLATFORM-SPEC-CONSOLIDATED.md § 2
SDK architecture                  → PLATFORM-SPEC-CONSOLIDATED.md § 4
Client state behavior             → PLATFORM-SPEC-CONSOLIDATED.md § 5
E2E test structure                → PLATFORM-SPEC-CONSOLIDATED.md § 6
Observability setup               → PLATFORM-SPEC-CONSOLIDATED.md § 7
How meta-arbiters decide          → META-ARBITRATION-LAYER.md
How to modify the engine          → ENGINE-MODIFICATION-PROTOCOLS.md
How to update a flow plan         → FLOW-REEXAMINATION-ALGORITHM.md
What a complete flow plan looks like → FLOW-01-REFERENCE-PLAN-v5.md
Mode C event contract design      → FLOW-INTEGRATION-MODE-C.md
FLOW-35 implementation plan       → FLOW-35-REFERENCE-PLAN.md
BFA CF ranges per flow            → STATE-v4.json → bfa_cf_ranges
```

### When two documents conflict — resolution protocol

```
Step 1: Identify which documents conflict and on which specific value
Step 2: Check document creation dates / version numbers
Step 3: Apply hierarchy:
  STATE-v4.json          > all other documents (numbers)
  DECISIONS-LOCKED.md    > all other documents (decisions)
  Tier 1 docs            > Tier 2, 3, 4, 5 docs
  Higher version number  > lower version number (v5 > v4)
Step 4: Update the lower-authority document to match the higher
Step 5: Note the reconciliation in round-decisions.jsonl
```

## Positive Example

```
Question: "What are the BFA CF rules for FLOW-08?"

CORRECT:
  → Route to STATE-v4.json → bfa_cf_ranges
  → Answer: "CF-64 through CF-79 (16 rules)"
  → Do NOT produce a new document listing CF rules
  → Do NOT answer from memory (may be stale)
```

```
Question: "Let me write up the CI/CD decision"

CORRECT:
  → Check PROJECT_REFERENCE.md → Document Map
  → CI/CD is governed by PLATFORM-SPEC-CONSOLIDATED.md § 2 (Tier 1)
  → Do NOT produce a new CI/CD document
  → If information needs updating: update PLATFORM-SPEC-CONSOLIDATED.md
```

## Negative Example

```
WRONG: Producing a new document when canonical exists
  "I'll create FLOW-08-CICD-DECISIONS.md to document the CI/CD for FLOW-08"
  → CI/CD is in PLATFORM-SPEC-CONSOLIDATED.md. Use that.

WRONG: Answering from stale memory
  "FLOW-08 uses CF-64 through CF-80" (wrong — it's CF-64 through CF-79)
  → Check STATE-v4.json before stating CF ranges

WRONG: Using superseded document
  "According to FLOW-MANAGEMENT-ARCHITECTURE.md..."
  → Superseded by PLATFORM-SPEC-CONSOLIDATED.md. Use that instead.
```

## RECONCILE — core `document-hierarchy` parity (G02 refresh from llm_mvp_core)

SK-423 already has the three pre-creation checks, the routing table, and the
conflict-resolution protocol. Two core facts to reconcile so the hierarchy is
anchored at the top and never reads a baseline from memory:

**(A) Explicit Tier 0–4 ladder (higher tier wins on any conflict):**

```
Tier 0 (supreme):   AGENTS.md + agent-constitution (.agents/skills/agent-constitution/SKILL.md)
                    → override everything else; always current
Tier 1 (primary):   DECISIONS.md / DECISIONS-LOCKED.md, STATE-v4.json (numbers/baselines)
                    → maintained after every session
Tier 2 (reference): PLATFORM-SPEC-CONSOLIDATED.md, ARCHITECTURE_GUIDE.md, KNOWLEDGE_DIGEST.md
Tier 3 (results):   experiment/result maps, HOW-TO-USE-SKILLS / SKILL-INDEX
Tier 4 (session):   FLOW-XX-REFERENCE-PLAN, SESSION-FLOW-XX-Y.md, STATE.json checkpoints
                    → superseded by the corresponding Tier 1 update
```
The existing resolution protocol's `Tier 1 docs > Tier 2,3,4,5` line is kept; this
just names Tier 0 = AGENTS/constitution above it, matching the core.

**(B) The test baseline is the LIVE run, never memory.** Routing for "current test
baseline" is: run `npx jest` (server ≥2342, client ≥220) or read STATE-v4.json's
maintained baseline chain — do NOT state a count from memory ("it was 2342 last
session"). Memory is not a baseline; a paraphrased/remembered number drifts. (Core
uses `dotnet test --list-tests`; the mvp equivalent is `npx jest`.)

---

## Integration

```
requires:    SK-416 (session startup — read PROJECT_REFERENCE.md first)
complements: SK-417 (decision reopening — decisions go in DECISIONS-LOCKED.md)
```

## Test

```
Given: request to "document the Mode C event bridge decision"

Expected:
  - Check PROJECT_REFERENCE.md
  - Identify: DECISIONS-LOCKED.md covers D7 (bidirectional bridge)
  - Identify: FLOW-INTEGRATION-MODE-C.md covers event bridge architecture
  - Response: "This is already documented in DECISIONS-LOCKED.md (D7) and
    FLOW-INTEGRATION-MODE-C.md. I'll reference those rather than create
    a new document."

Failure: creating FLOW-MODE-C-EVENT-BRIDGE-DECISIONS.md
```
