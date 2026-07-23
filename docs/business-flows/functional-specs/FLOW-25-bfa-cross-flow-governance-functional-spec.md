# Functional Spec — FLOW-25 BFA Cross-flow Governance

**Grammar:** G2 Verdict grid
**Primary role tiers:** PLATFORM_OPS. Engine-internal.
**Current state:** **Designed** — 0 services; 22 session files of spec.

## 1. Summary

Before a flow ships, the BFA (Backward-Forward-Arbiter) engine checks it against every existing flow for conflicts — shared entities, overlapping routes, duplicate event names, contradictory arbiter verdicts. A platform admin reviews the BFA verdict grid, resolves conflicts, and approves the ship.

## 2. Roles & modes

| Role | Route | What |
|---|---|---|
| **PLATFORM_OPS** | `/admin/engine/bfa/` | Review conflict verdict grid, resolve, approve ship |

**Modes:** Ship-review (before flow goes live), Audit-review (retroactive), Simulation (what would this flow conflict with if shipped).

## 3. User stories

### Story 3.1 — Admin reviews a pending flow's BFA verdict

**Screens:** `/admin/engine/bfa/pending/:flowId`.

1. Page loads verdict grid: rows = conflict dimensions (Entity overlap, Route collision, Event duplication, Arbiter contradiction, CF-POLICY), columns = existing flows that share those dimensions with the candidate flow.
2. Cells: Pass / Concern / Fail / Needs-review with icon + colour + label.
3. Click cell → popover: specific conflict detail (e.g., *"FLOW-08 marketplace already uses entity `Product` — candidate FLOW-X redefines it with different shape"*).

### Story 3.2 — Admin resolves a conflict

**Trigger:** admin clicks a Fail cell.

1. Detail panel: conflict description + suggested resolutions (rename entity / merge with existing / extend existing / reject flow).
2. Pick resolution → candidate flow updated with the resolution choice; re-run BFA.
3. On re-run all-pass → **Approve ship** button enables.

### Story 3.3 — Admin runs a simulation for a proposed flow

**Screens:** `/admin/engine/bfa/simulate`.

1. Upload candidate flow draft → simulate → verdict grid without committing.
2. Useful for flow authors before they even submit.

## 4. Screen structure

- **Pending reviews list** — G3 cards of flows awaiting BFA verdict.
- **Verdict grid** — G2 per pending flow.
- **Detail panel** — conflict description + resolutions.
- **Simulation** — same verdict grid, non-committing.

## 5. Edge cases

| Case | Behaviour |
|---|---|
| Flow has 50+ conflicts | Paginate verdict grid; summary stats at top. |
| Auto-resolvable conflicts | Offer **Auto-resolve all trivial conflicts** button. |
| Circular conflict (A conflicts with B which conflicts with A) | Highlight cycle; require admin to pick order. |
| Override + audit | If admin overrides a Fail without fixing, logged in audit + flag for re-review. |

## 6. Problematic states

- **Empty queue** → *"No flows awaiting BFA review."*
- **Loading** — skeleton grid.
- **BFA engine unavailable** — banner with retry.
- **Resolution fails** — inline error + retry.

## 7. Visual direction

**Grammar:** G2 verdict grid.

**Feel:** *Rigorous · Bureaucratic (in a good way) · Traceable*. This is regulatory — should feel like compliance, not casual.

**Colour world:** same as FLOW-37 (verdict grids share palette — green/amber/orange/red).

**Signature:** the **override audit log** — every override leaves a trail.

**Anti-patterns:**
- One-click "approve anyway" without override rationale.
- Hiding fail cells by default.

## 8. Acceptance criteria

- [ ] Verdict grid with rows = dimensions × columns = flows.
- [ ] Cell detail + resolution suggestions.
- [ ] Resolve + re-run + approve flow.
- [ ] Simulation mode.
- [ ] Override audit log.
- [ ] All 4 problematic states covered.
