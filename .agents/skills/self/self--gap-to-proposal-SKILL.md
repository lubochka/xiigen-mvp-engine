---
name: gap-to-proposal
sk_number: SK-506
version: "1.0.0"
priority: HIGH
load_order: 0
category: self
layer: engine-self-awareness
author: luba
updated: "2026-03-26"
contexts: ["web-session"]
description: >
  Translates a detected capability gap (from SK-505) into a structured proposal:
  resolution type, estimated effort, prerequisite gaps to resolve first, and
  the approval gate. Applies the CONVENTION → ADAPTATION → EXTENSION → NEW FLOW
  ladder (SK-434) to gaps in the engine's own infrastructure rather than
  customer requirements. Fires after SK-505 detects a MISSING or STUB item.
triggers:
  - "how to fix this gap"
  - "gap resolution proposal"
  - "what to build for this capability"
  - "missing interface proposal"
  - "extension proposal"
  - "self-extension planning"
---

# Gap-to-Proposal Skill (SK-506)

## THE RESOLUTION LADDER (applied to engine gaps)

Before proposing a new flow or session, climb the ladder:

```
LEVEL 1 — CONVENTION: Can this gap be fixed by updating AGENTS.md or a config value?
  Example: scoring_weights_from_freedom_config named check is missing
  → Add to plan-review-SKILL.md as FC-32 + register FREEDOM config keys
  → No new flow needed. 30-minute maintenance session.

LEVEL 2 — ADAPTATION: Does an existing fabric interface cover this?
  Example: Need to send WhatsApp messages
  → IMessagingService exists as a stub
  → Add WhatsAppProvider (adapt existing interface)
  → No new interface needed. One implementation session.

LEVEL 3 — EXTENSION: Does an existing flow cover this with a small addition?
  Example: IFeedService needs a new read method
  → FLOW-09 owns IFeedService
  → Add getFeedForMember() to IFeedService and update FLOW-09 contract
  → Phase A addition to FLOW-09, not a new flow.

LEVEL 4 — NEW FLOW: None of the above apply.
  Example: Need IGamificationService from scratch for FLOW-07
  → No existing interface. No existing flow owns this domain.
  → New fabric interface + new flow or pre-flow infrastructure session.
```

---

## STEP 1 — CLASSIFY THE GAP

```
Gap: IMLService is MISSING (from SK-505 capability snapshot)

Q1: Can it be fixed by CONVENTION (config/AGENTS.md)?
    No — an interface must be defined and a provider implemented.

Q2: Does ADAPTATION work (existing interface covers it)?
    No — IAiService covers text generation. IMLService is model training/inference.
    Different domain, different contract.

Q3: Does EXTENSION work (add to existing flow)?
    Partially — IMLService stub can be defined in the same session that defines
    IGamificationService, before FLOW-07 design.

Q4: NEW flow or infrastructure session needed?
    Yes — a pre-FLOW-07 infrastructure session that defines IMLService + IGamificationService.
```

---

## STEP 2 — PRODUCE THE PROPOSAL

```markdown
## GAP RESOLUTION PROPOSAL — IMLService

**Gap detected by:** SK-505 capability snapshot
**Resolution level:** LEVEL 4 — new infrastructure session

**What will be built:**
  - IMLService fabric interface (predict + updateModel methods)
  - InMemoryMLProvider mock (for local dev and Phase B generation)
  - FREEDOM config keys: ml.provider, ml.defaultModelId
  - Named check: ml_calls_via_fabric_not_direct (score-0)

**Prerequisite gaps to resolve first:**
  - D-ML-001 architecture decision must be recorded (D-ML-001 not found in
    xiigen-rag-patterns — create before this session)

**Estimated effort:** 1 MAINTENANCE session (define interfaces + mock only)
**Builds on:** Pattern from IMessagingService (same structure)

**⛔ STOP REQUIRED BEFORE:** Beginning FLOW-07 Phase A design

**Approval needed from Luba:**
  - D-ML-001 decision: shared ML infrastructure vs separate? (Option A or B)
  - Should IGamificationService be in the same session?
```

---

## STEP 3 — DEPENDENCY ORDER FOR MULTIPLE GAPS

When multiple gaps exist, order them by dependency:

```
Gap A (IFeedService) → blocks FLOW-05, FLOW-08, FLOW-09
Gap B (IRankingService) → blocks FLOW-05 scoring
Gap C (IMLService) → blocks FLOW-07 only
Gap D (IGamificationService) → blocks FLOW-07 only

Order: A before B before (C, D in parallel)
Rationale: A blocks more flows. B is needed before A's first consumer (FLOW-05). C+D can be parallel.
```

---

## ⛔ STOP GATE

Every proposal requires human approval before work begins. The proposal is the input
to the approval, not the permission to start. No capability extension session begins
without Luba's explicit "yes" on the proposal.

---

## G08 universal addition from llm_mvp_core — general NEW COMPONENT ladder (not only engine-self), UI gap branch

The ladder above is framed for engine self-infrastructure gaps (SK-505) and tops out at
"NEW FLOW". The universal `gap-to-proposal` standard applies to ANY product gap, and the top
rung is **NEW COMPONENT**, not specifically a flow. This block generalizes the ladder for
mvp product work and adds the React/Playwright UI branch the engine-only version lacks.

### A. The ladder for ordinary mvp product gaps

```
LEVEL 1 — CONVENTION  : fix via governance (AGENTS.md / a config value / a named check / DECISIONS).
LEVEL 2 — ADAPTATION  : a new NestJS provider under an EXISTING interface (no new contract).
                        e.g. add WhatsAppProvider implementing existing IMessagingService.
LEVEL 3 — EXTENSION   : a new method on an existing service + its contract update.
                        e.g. add getFeedForMember() to IFeedService; update the owning module.
LEVEL 4 — NEW COMPONENT: none of the above fit → new module + DTO/contract + provider +
                        DI registration + *.spec.ts. ("NEW FLOW" is one *kind* of NEW COMPONENT,
                        not the only kind — a cross-cutting service is also LEVEL 4.)
```

Justify why each lower rung is insufficient before claiming a higher one. Climbing one rung
too high is over-engineering; staying one rung too low leaves the gap's root in place.

### B. UI gap branch (React + Playwright) — mvp has a frontend

A user-facing gap has its own LEVEL-4 shape:

```
LEVEL 4 (UI) : new React component/route + typed props + state wiring +
               a Playwright e2e that drives the user action.
               Acceptance evidence for a UI gap is the Playwright spec passing,
               not just the component compiling.
```

### C. Proposal must name the verify/acceptance command per level

```
LEVEL 2/3 acceptance : npx jest --testPathPattern=<service>  → N passed, 0 failed
LEVEL 4 (service)    : npx tsc --noEmit + provider registered in *.module.ts + spec green
LEVEL 4 (UI)         : npx playwright test <spec>            → passed
RAG-touching gap     : sidecar route present (grep rag/) + contract match before LEVEL is chosen
```

### Note-only (NOT ported — stays in G12, R5)

A gap that is "the shared model needs retraining" is a `llm_mvp_core` proposal, not a mvp
one; the mvp proposal stops at "consume the new shared-model version via its `.xiigen`
manifest/locator".
