---
title: Multi Reviewer Design
purpose: Use distinct review lenses to evaluate plans, docs, or implementation before delivery.
source-boundary: Universal process guidance only. Excludes source architecture, algorithms, design patterns, training, DPO, source domains, source classes, and source-specific paths.
status: active
---

# Multi Reviewer Design

## Purpose
Use this when one perspective is likely to miss safety, correctness, usability, or maintainability issues.

## When to Use
Invoke for broad plans, shared contracts, user-facing docs, and changes with cross-module impact.

## Actions
- Choose review lenses relevant to the work, such as scope guardian, implementation reviewer, test reviewer, documentation reviewer, and user-output reviewer.
- Run each lens against the same artifact and record only actionable findings.
- Resolve contradictions by authority, evidence, and user goal.
- Keep reviewer output concise and ordered by risk.
- Turn accepted findings into concrete edits or disclosed residual risk.

## XIIGen Adaptation
- For XIIGen code, include lenses for service result semantics, local async flow, NestJS providers and injection tokens, configuration helpers, structured logging, persistence/search behavior, and test integrity when affected.
- For skill docs, include lenses for universality, XIIGen adaptation, source-boundary exclusion, and index completeness.

## Avoid
- Do not create fictional sign-offs without evidence.
- Do not use reviewers to smuggle in excluded source architecture or patterns.
- Do not produce verbose debates when a simple finding list is enough.

## Completion Signal
- Important risks have been viewed from the right angles and addressed or reported.

---

## G02 universal addition from llm_mvp_core — INDEPENDENT REVIEWER PANEL (not single-axis lenses)

The "lenses" guidance above is single-reviewer/single-axis: one reviewer applies
several angles. The core `multi-reviewer-design` standard is stronger and is what mvp
must use for an interface/architecture decision or a plan >3 phases — **multiple
INDEPENDENT reviewer ROLES, context-isolated, with a convergence protocol where one
BLOCK overrides all APPROVED and is never averaged.** This extends the mvp review
family (`XIIGEN-DESIGN-REVIEW-PROTOCOL`, `planning--node-design-review-SKILL.md`,
`plan-review-SKILL.md`, `.agents/skills/review-fix-loop`); it does not replace them.

### 1. The 5 reviewer roles (select by risk level)

| Role | Context package (what they see) | What they check (mvp) |
|---|---|---|
| **Domain** | capability spec, FLOW invariants, domain context | intent correctness, domain-invariant completeness |
| **Security** | capability spec, DNA Rule 1/2, failure modes | fabric-first (no `= new ConcreteType`), tenant-scope, No-Secrets, failure-mode coverage |
| **Business** | capability spec, downstream contracts, event schemas | cross-module consistency, consumer impact (NestJS controller/DTO, React route/props, CloudEvents) |
| **Principles** | capability spec, all DNA Rules, `DECISIONS.md`/`DECISIONS-LOCKED.md` | DNA + locked-decision adherence |
| **Completeness** | capability spec, structure fields | every output reachable from inputs; no missing path |

**Mandatory minimum reviewer set by risk:**

```
internal utility        → Domain + Principles
public interface (IXxx) → Domain + Security + Principles      (mvp: NestJS controller/DTO contract, React route/props, FastAPI endpoint)
cross-component contract → Domain + Security + Business + Principles
architecture decision   → ALL 5
```
Never add a reviewer for appearance (a Security reviewer on a pure-compute function
that touches no storage/tenant data adds noise, not signal).

### 2. Context-Isolation Rule

Each reviewer sees ONLY their own context package and does NOT see any other
reviewer's verdict. A reviewer who has seen another verdict anchors to it and stops
finding independent issues. Isolation is what makes the panel worth more than one
reviewer.

### 3. Verdict format — APPROVED | CONCERN | BLOCK, with evidence

```markdown
## [Role] Reviewer Verdict
Verdict: APPROVED | CONCERN | BLOCK
BLOCK items (cannot proceed): [issue] — [rule/principle violated] — [what must change]
CONCERN items (may proceed, author responds in writing): [issue] — [risk if unaddressed]
Evidence: [exact file:line on .ts/.tsx + grep / npx jest filter / Playwright spec]
```
BLOCK classes: business-logic violation, security violation (DNA Rule 2 / cross-tenant),
principles violation (DNA Rule 1/10), iron-rule violation. **A single BLOCK overrides
all APPROVED verdicts and is NEVER diluted by averaging.**

### 4. Convergence Protocol (apply in order, stop at first match)

```
Rule 1: any BLOCK            → REJECT. Author addresses the specific BLOCK (generic rewrite ≠ fix).
                               Only the blocking reviewer re-evaluates. The BLOCK becomes a
                               binding Authority Requirements Ledger row for the repair.
Rule 2: all APPROVED, 0–2 CONCERN → ACCEPTED. Author answers CONCERNs in writing before Phase 1.
Rule 3: all APPROVED, 3+ CONCERN  → targeted cycle; affected reviewers re-check only their sections.
Rule 4: same BLOCK after 2 address cycles → ESCALATE to Luba (architectural disagreement,
                               not editorial) with the original BLOCK + both attempts + responses.
Rule 5: all paths BLOCKed (no way forward) → REDESIGN; emit an escalation report.
Maximum 3 cycles. After 3 cycles without full approval → escalate.
```

### 5. Accepted BLOCK/CONCERN → Authority Requirements Ledger (the bridge)

An accepted reviewer gate is **active task authority for downstream repair**, not a
note or wishlist. When a BLOCK or accepted CONCERN is adopted, enter it into the
Authority Requirements Ledger (`authority-chain` / authority-requirement-binding) with
`source_authority=reviewer_gate`. A downstream architect or executor must not silently
narrow or drop it.

### Note-only (NOT ported here — stays in G12, R5)

- The "10 Review Cycle Gate Compatibility" block (Claude/Cursor/Codex three-extensions,
  `requested_model=gpt-5.5`/`xhigh`, Sub-Agent Visibility Ledger) is intentionally NOT
  part of this mvp skill.
- The ML-eval / arbiter-trainable-gate hook is intentionally NOT ported — mvp consumes
  shared models from `llm_mvp_core` via manifests/locators (R5/G12).

### mvp evidence specifics

Evidence = `file:line` on `.ts`/`.tsx` + `grep` + `npx jest` (server ≥2342, client ≥220)
+ Playwright e2e for user-facing surfaces. Security checks DNA Rule 1/2 (fabric-first,
`= new ConcreteType` forbidden, tenantId-context, CloudEvents) and No-Secrets; the
returned type to assert on is the typed `DataProcessResult<T>`/`Result<T>` discriminator,
not the HTTP status. UI risk → Security/Completeness evidence via Playwright.
