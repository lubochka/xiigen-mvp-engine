---
title: Challenger Round Design
purpose: Run a pre-acceptance challenger round — role panel by archetype, context-isolated reviewers, genuine-disagreement gate, explicit termination.
source-boundary: Universal process guidance only. Excludes source architecture, algorithms, design patterns, training, DPO, source domains, source classes, and source-specific paths.
status: active
---

# Challenger Round Design

## Purpose
Use this before accepting a design or a plan so that convergence is earned through independent,
context-isolated challenge — not declared because one reviewer said "looks fine".

## When to Use
Invoke before the Gate-B acceptance of any design/plan with real risk (a public interface, a
cross-component contract, an architecture decision, a plan >3 phases).

## Why this exists for mvp
mvp already has multi-model cross-review (`planning--plan-review-SKILL.md` Gate B "AI
Cross-Review", FC-14 Goal-Delivery Arbiter, FC-20 arbiter NDJSON, `XIIGEN-DESIGN-REVIEW-PROTOCOL`,
`planning--node-design-review-SKILL.md`). What it lacks are the FOUR universal elements below.
This skill raises those four over the existing cross-review; it does NOT duplicate the FC-classes
and does NOT replace the existing protocols — cite them for the detailed checks.

---

## G08 universal content from llm_mvp_core — the four challenger-round elements

### 1. Role panel BY ARCHETYPE (do not add reviewers for appearance)

```
Minimal panel (always)        : Domain + Completeness + DNA/Rules.
Add Security                  : only when the design touches session/tenant data or crosses a trust boundary.
Add Business                  : only when there is cross-component/consumer impact.

Mandatory minimum by risk:
  internal utility            → Domain + DNA/Rules
  public interface (IXxx)     → Domain + Security + DNA/Rules
  cross-component contract    → Domain + Security + Business + DNA/Rules
  architecture decision       → ALL roles
```

A Security reviewer on a pure-compute function that touches no storage/tenant data adds noise,
not signal. Never add a challenger for the look of rigor.

mvp context packages per role:
```
Domain       : the capability spec + FLOW/domain invariants.
Completeness  : the structure fields — every output reachable from inputs, no missing path.
DNA/Rules    : fabric-first (no `= new ConcreteType`), typed DataProcessResult<T>/Result<T>,
               tenant scope, No-Secrets, and the mvp DNA-guards/DECISIONS — NOT core Rules 1–10.
Security      : session/tenant data paths, failure modes (only when present).
Business      : downstream NestJS controller/DTO, React route/props, CloudEvents consumers.
```

### 2. Context-isolation per reviewer

Each reviewer sees ONLY their own context package and does NOT see any other reviewer's verdict.
A reviewer who has seen another verdict anchors to it and stops finding independent issues.
Isolation is what makes the panel worth more than one reviewer.

### 3. Genuine-disagreement gate

A challenge counts ONLY if the fix would change the generated code (the `.ts`/`.tsx`/`.py` that
ships), and it traces to a concrete field + invariant. "All APPROVED on round 1" means either
the design is trivial or no one actually challenged — re-examine, do not celebrate.

```
Verdict per reviewer : APPROVED | CONCERN | BLOCK, each with evidence
  evidence = file:line on .ts/.tsx/.py + grep / `npx jest` filter / Playwright spec
BLOCK classes        : domain-logic violation, security/tenant violation, DNA/rules violation,
                       iron-rule violation.
A single BLOCK overrides all APPROVED and is NEVER diluted by averaging.
```

### 4. Termination conditions (three, and STALLED ≠ CONSENSUS)

```
CONSENSUS_REACHED   : all APPROVED (CONCERNs answered in writing) → accept.
DEFERRED_CONSTRAINT : a real issue parked by explicit decision with an owner + revisit trigger.
STALLED             : same BLOCK persists after 2 address cycles, or all paths BLOCKed →
                      ESCALATE to Luba (architectural disagreement, not editorial).
Maximum 3 cycles. STALLED is an escalation, never a silent "consensus".
```

An accepted BLOCK/CONCERN becomes binding authority for the downstream repair (an Authority
Requirements Ledger row), not a note a later executor may quietly drop.

### mvp verify
```
challenger evidence : file:line on .ts/.tsx/.py + `npx jest --testPathPattern=...` +
                      `npx playwright test <spec>` for user-facing surfaces.
the type to assert on is the typed DataProcessResult<T>/Result<T> discriminator, not the HTTP status.
```

## Avoid
- Do not add a reviewer role for appearance.
- Do not let any reviewer see another's verdict before issuing their own.
- Do not count a challenge that would not change shipped code.
- Do not report STALLED as CONSENSUS; escalate it.
- Do not import source architecture, algorithms, design patterns, training, DPO, source domains,
  source classes, or source-specific paths.

## Completion Signal
- The right roles (by archetype) challenged the design in isolation, every challenge was genuine
  (would change shipped code), and the round ended in CONSENSUS, an explicit DEFERRED constraint,
  or an escalation for STALLED.

## Note-only (NOT ported — stays in G12, R5)
- The "DNA Compliance Arbiter" hard-bound to `CLAUDE.md` Rules 1–10 and Rule-1/Rule-2
  `OperationResult<T>` wording is NOT ported; mvp's DNA challenger uses its own DNA-guards /
  governance prose + the domain `DataProcessResult<T>`.
- The convergence-training-signal integration ("feeds DomainModelRegistry via
  ContinuousLearningPipeline") and the `multi-reviewer-design`/`arbiter-panel-design`/
  `diagnostic-escalation`/`context-package-design` ML-coupled internals stay in `llm_mvp_core`
  (R5/R6) and are tracked in G12 as a forward-note.
