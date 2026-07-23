---
name: extension-session-type
sk_number: SK-509
version: "1.0.0"
priority: HIGH
load_order: -2
category: self
layer: engine-self-awareness
author: luba
updated: "2026-03-26"
contexts: ["claude-code", "web-session"]
description: >
  Defines SELF-EXTENSION as a formal session type alongside GENERATION, PLANNING,
  MAINTENANCE, INVESTIGATION, DEBUG, and QA. A SELF-EXTENSION session follows a
  specific governance chain: capability read → gap proposal → human approval →
  implementation → integrity verification → training data audit. Without this
  session type being formal, self-extension happens ad hoc, driven by whoever
  notices a gap rather than by systematic detection.
triggers:
  - "extend the engine"
  - "build missing capability"
  - "self-extension session"
  - "add fabric interface"
  - "engine needs new capability"
  - "capability gap resolution"
---

# Extension Session Type Skill (SK-509)

## SESSION TYPE: SELF-EXTENSION

A SELF-EXTENSION session extends the engine's own capabilities — adding fabric
interfaces, implementing providers, installing named checks, updating the capability
manifest — so that blocked flows can proceed.

**HOW-TO-USE addition** (to be applied to HOW-TO-USE-SKILLS):

```
SELF-EXTENSION SESSION: adding a capability the engine is missing
→ Step 1: SK-505 (capability-state-reader) — READ current state first
→ Step 2: SK-506 (gap-to-proposal) — CLASSIFY and PROPOSE resolution
→ ⛔ STOP: present proposal to Luba. Await explicit "yes" before building.
→ Step 3: Execute using appropriate session type for the build work:
    - Fabric interface only → MAINTENANCE SESSION
    - New flow required → PLANNING SESSION + GENERATION SESSION
    - Config/gate update → MAINTENANCE SESSION
→ Step 4: SK-507 (implementation-integrity) — VERIFY closure
→ Step 5: SK-508 (training-data-gap-audit) — AUDIT affected triples
→ Final ⛔ STOP: present integrity report + audit results.
```

---

## THE GOVERNANCE CHAIN

```
SELF-EXTENSION session:

START
  SK-505: Read capability manifest
    ↓
  SK-506: Classify gap + produce proposal
    ↓
  ⛔ STOP — present proposal — await Luba approval
    ↓ (approved)
  Execute build work (session type determined by proposal)
    ↓
  SK-507: Verify implementation integrity
    ↓
  SK-508: Audit training data affected by gap window
    ↓
  ⛔ STOP — present integrity report — await Luba sign-off
END
```

---

## WHAT SELF-EXTENSION IS NOT

```
❌ Unilaterally deciding to build a new fabric interface mid-GENERATION session
❌ Adding a named check without checking if it breaks existing flows
❌ Re-running Phase B of a flow because "the infrastructure seems ready now"
   → Must use SK-505 to confirm, SK-507 to verify, not assumptions
❌ Treating SELF-EXTENSION as a MAINTENANCE session without the proposal step
   → Maintenance skips planning gates. Self-extension requires a proposal + approval.
```

---

## WHEN TO INITIATE

A SELF-EXTENSION session is initiated when:
1. SK-505 detects a MISSING capability that blocks a planned flow
2. SK-492 (requirement-to-flow) identifies a fabric interface not in the manifest
3. A GENERATION session discovers a missing dependency during Phase A STEP 0
4. FC-19 (multi-stack test coverage) flags a provider gap

It is NOT initiated by Claude autonomously. The detection is systematic; the
initiation requires Luba's direction.

---

## RELATIONSHIP TO OTHER SESSION TYPES

| Session type | Scope | Gates |
|-------------|-------|-------|
| GENERATION | Build a flow | SK-457 preflight, ⛔ per phase |
| PLANNING | Design a flow | Plan gates, Gate C |
| MAINTENANCE | Fix/update files | One ⛔ at end |
| INVESTIGATION | Analyze gaps | Analysis pipeline, SK-459 |
| DEBUG | Fix a failure | SK-484 baseline, SK-473 triage |
| QA | Validate a phase | SK-481 protocol, QA report |
| **SELF-EXTENSION** | **Close a capability gap** | **SK-505→506→⛔→build→507→508→⛔** |

---

## RECONCILE — core `self-extension-session` parity (G02 refresh from llm_mvp_core)

SK-509 already carries the two ⛔ STOP gates (after the proposal, and after the
integrity+audit report) and the "**NOT initiated autonomously**" rule — keep both;
they are the core's load-bearing gates. Two reconcile completions:

**(A) The Step 5 gap-window training-data audit has a named classification.** The
gap window is the period between when the gap was introduced and when it was closed.
Runs during that window may have produced learning signal that is now wrong; SK-508
must classify each affected DPO triple before the next training run:

```
RECOVERABLE   context package was correct, only the signal handler was missing →
              re-run with the fixed handler and UPDATE the triple
CONTAMINATED  the context package itself was wrong (e.g. the named check was absent,
              so a violation went unflagged) → REMOVE from the training index; it
              teaches the model to accept violations and cannot be fixed by re-running
CALIBRATION   triple is valid but its confidence score was computed on wrong data →
              keep it, RECALCULATE the confidence/edge seed
```
Closing a SELF-EXTENSION before this classification is the anti-pattern, regardless
of how short the gap window was.

**(B) R5/G12 boundary for mvp.** mvp does NOT hold common ML units locally — shared
models are consumed from `llm_mvp_core` via `.xiigen` manifests/locators and only the
adaptive (user) leg trains locally. So when the closed gap touches NO local adaptive
learning signal, Step 5 is recorded explicitly as **N/A (no local training signal to
audit; shared model consumed via manifest)** — not silently skipped. Steps 1→4 and
both STOP gates stay full. Build/verify in Step 4 = `npm run build` + `npx jest`
(server ≥2342, client ≥220) via SK-507 (implementation-integrity).
