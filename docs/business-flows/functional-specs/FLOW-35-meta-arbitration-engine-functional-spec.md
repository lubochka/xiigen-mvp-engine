# Functional Spec — FLOW-35 Meta-arbitration Engine

**Grammar:** G2 Verdict grid
**Primary role tiers:** PLATFORM_OPS. Engine-internal.
**Current state:** **Designed** — 0 services.

## 1. Summary

When two primary arbiters disagree on a decision, a meta-arbiter runs a higher-order arbitration — not on the original question, but on *"which arbiter is more reliable for this type of question"*. Platform admin sees the meta-arbiter verdicts and tunes.

## 2. Roles & modes

| Role | Route | What |
|---|---|---|
| **PLATFORM_OPS** | `/admin/engine/meta-arbitration/` | Watch meta-arbiter verdicts, tune arbiter trust weights |

**Modes:** Review / tune / simulate.

## 3. User stories

### Story 3.1 — Admin watches meta-verdicts

**Screens:** `/admin/engine/meta-arbitration/` verdict grid.

1. G2 grid: rows = disputed cases, columns = primary arbiters + meta-verdict + trust-weight change.
2. Cells show which primary arbiter won + why.

### Story 3.2 — Admin tunes arbiter weights

**Screens:** Arbiter tab → weights editor.

1. Each arbiter has a trust weight per question category.
2. Admin adjusts weights; simulates over historical cases; sees verdict changes.
3. Apply → weights updated; logged in audit.

## 4. Screen structure

- **Verdict grid** — G2 per dispute.
- **Arbiter tab** — weights editor + simulation.
- **Audit log** — every tune logged.

## 5. Edge cases

| Case | Behaviour |
|---|---|
| All arbiters agree | No meta-arbitration runs; case skipped. |
| Meta-arbiter disagrees with itself over time | Highlight drift; prompt review. |
| Tune causes mass verdict flip | Require confirmation + dry-run. |

## 6. Problematic states

- **Empty grid** → *"No disputes — arbiters are aligned."*
- **Weights save fails** — inline error + retry.
- **Simulation timeout** — partial results + retry.

## 7. Visual direction

**Grammar:** G2 Verdict grid.

**Feel:** *Deliberative · Evidence-based*.

**Signature:** the **why-this-arbiter-won** column explaining meta-verdicts.

## 8. Acceptance criteria

- [ ] Verdict grid of disputes.
- [ ] Trust-weight editor + simulation.
- [ ] Audit log of tunes.
- [ ] All 3 problematic states covered.
