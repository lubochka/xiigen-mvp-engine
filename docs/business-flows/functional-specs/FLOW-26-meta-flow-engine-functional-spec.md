# Functional Spec — FLOW-26 Meta-flow Engine (Self-developing)

**Grammar:** G4 Topology canvas + G3 Card list (proposals)
**Primary role tiers:** PLATFORM_OPS. Engine-internal.
**Current state:** **Designed** — 0 services.

## 1. Summary

The XIIGen engine reads its own state, identifies capability gaps, and proposes new flows or extensions. A platform admin reviews proposals in a card list, inspects the proposed topology, approves or modifies before the engine generates code.

## 2. Roles & modes

| Role | Route | What |
|---|---|---|
| **PLATFORM_OPS** | `/admin/engine/meta/` | Review proposals, approve, reject, iterate |

**Modes:** Gap-driven (automatic proposals from detected gaps), Request-driven (admin describes desired capability, engine proposes), Review-and-edit.

## 3. User stories

### Story 3.1 — Admin reviews automated proposals

**Screens:** `/admin/engine/meta/proposals/` → proposal detail.

1. List: G3 cards, one per proposal. Each: gap description, proposed solution summary, confidence score, affected flows, estimated effort.
2. Click card → proposal detail: gap analysis, proposed topology (G4 canvas), generated contract stubs, impact on existing flows, confidence reasoning.
3. Actions: **Approve** (engine generates flow code) / **Request variant** (engine generates 2-3 alternative proposals) / **Reject** / **Edit before approve**.

### Story 3.2 — Admin requests a capability

**Screens:** `/admin/engine/meta/request` → wizard → proposal.

1. Admin describes: *"We need a flow that does X when Y happens"*.
2. Engine processes: 30-120 seconds. Progress shown.
3. Proposal appears for review (same detail view as Story 3.1).

## 4. Screen structure

- **Proposal list** — G3 cards with confidence + impact.
- **Proposal detail** — topology canvas + contract stubs + gap analysis.
- **Request wizard** — simple description-to-proposal flow.

## 5. Edge cases

| Case | Behaviour |
|---|---|
| Proposal conflicts with existing flow | BFA checks run (FLOW-25); conflicts surfaced. |
| Confidence too low | Card shows *"Low confidence — request variant"* hint. |
| Generation timeout | Proposal enters "Pending" state; retry available. |
| Admin wants human spec input | Inline spec editor; engine regenerates with updates. |

## 6. Problematic states

- **No proposals** → *"Nothing to review — engine's not detecting gaps right now."*
- **Generation fails** → retry with alternative prompt.
- **Approval blocked by BFA** → redirect to FLOW-25 verdict grid.

## 7. Visual direction

**Grammar:** G4 topology canvas + G3 proposal cards.

**Feel:** *Collaborative · Transparent · Iterative*. The engine isn't black-boxing — admin sees the reasoning.

**Signature:** the **confidence reasoning panel** on each proposal — explains *why* the engine thinks this is a good idea (or not). Builds trust.

**Anti-patterns:**
- Hiding engine reasoning.
- One-shot generation without variants.

## 8. Acceptance criteria

- [ ] Proposal list + detail with topology canvas.
- [ ] Confidence scoring visible.
- [ ] Request wizard for admin-initiated proposals.
- [ ] Variants on request.
- [ ] BFA integration for conflict checks.
- [ ] All 3 problematic states covered.
