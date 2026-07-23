# Flow UI examination — FLOW-27 human-interaction-gate

## Date: 2026-04-20 · Run: RUN-56 · Batch: B (Grammar 2 Verdict Grid)

## One-sentence spec (F1)
> When a generation cycle produces an output that requires human review on
> the XIIGen engine, queue the review task, assign it to the review panel,
> and route escalations through the approval gate.

## Roles (F3 — `ROLE-ANALYSIS-BATCH-06.md`)
- **platform-admin** — primary approver for engine-level decisions
- **tenant-admin** — approver for tenant-scoped decisions (when HIG fires from tenant action)
- **platform-support** — read-only audit
- **tenant-user / end-user** — receive status ("Your request is pending review")

## Grammar
**G2 Verdict Grid (queue form)** — human review inbox with preview card + verdict row per item.
Reference: **Intercom inbox, Linear triage inbox, GitHub PR review, Gerrit**.

## Classification
- **Q1 CRUD?** Likely — HumanInteractionGatePage → AdminCrudPanel default.
- **Q2 Error/empty?** Inbox zero should be a celebrated state, not an empty error. "No items awaiting your review. Last item cleared 12 min ago."
- **Q3 Engineering leak?** Possible — "cycle", "arbiter score", "override token" are internal concepts; rework to "Pending decisions", "AI recommendations", "Approve / Override".
- **Q4 Role-correct?** Two approver branches (platform vs tenant) — needs confirmation that existing page forks correctly.

**Primary finding:** NEEDS_PURPOSE_BUILT_UI (P0) — queue inbox with preview + per-item action row; NEEDS_EMPTY_STATE (P1) for inbox-zero.

## 31 existing PNGs
One of the densest PNG directories. Needs inventory sweep. Likely mix of
CRUD + state mocks + role-variants.

## Planned fixes (deferred)

**P0 — Review queue inbox** for tenant-admin / platform-admin:
- Grammar 2 queue format (Linear triage / Intercom inbox)
- Left column: pending items with preview card (one-line summary + SLA timer + "Decide" CTA)
- Right panel: selected item's full context — AI recommendation + confidence score + original input + proposed output
- Action row: Approve / Override / Escalate / Defer / Request more info
- SLA indicator per item (green < 1h / amber < 4h / red > 4h overdue)

**P1 — Inbox-zero empty state:** celebrated ("All caught up. Last item cleared 12 min ago.") + "Recently cleared" collapsible section.

**P1 — Tenant-user status page:** narrow "Your request is under review (ETA < 2h)".
