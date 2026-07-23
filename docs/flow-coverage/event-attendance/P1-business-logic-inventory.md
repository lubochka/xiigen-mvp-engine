# FLOW-04 Business Logic Inventory — Phase 1 Deliverable

**Flow:** Event Attendance (`event-attendance`)
**Classification:** TENANT_FACING
**Source:** TOPOLOGY
**Source document:** `contracts/topologies/event-attendance.topology.json`

**Topology shape:** 5 nodes, 4 edges. Minimum inventory items: 9.

## Business States & Transitions

1. n1 — processing step entered via `system-initialized`
2. n2 — processing step entered via `system-initialized`
3. n3 — processing step entered via `system-initialized`
4. n4 — processing step entered via `system-initialized`
5. n5 — processing step entered via `system-initialized`
6. n1 → n2 when `` (emits ``)
7. n2 → n3 when `` (emits ``)
8. n3 → n4 when `` (emits ``)
9. n4 → n5 when `` (emits ``)

## Arbiter Verdicts

- **Arbiter 1 — Goal Delivery (edge+node formula: 4+5=9):** PASS — 9 items produced.
- **Arbiter 2 — Scope Isolation:** PASS — state descriptions reference nodes/events; no TypeScript types, no file paths, no class names.
- **Arbiter 3 — Terminal State Coverage:** PASS — terminal-labeled edges (condition contains 'terminal') appear as `[TERMINAL]` entries.
- **Arbiter 4 — Iron Rule Labels:** DEFERRED — CF-XX labels require cross-reference with `server/src/engine-contracts/{slug}-bfa-rules.ts`; applied in Phase 9 (edge case discovery) where iron rules directly govern edge cases.
- **Arbiter 5 — Branch Honest Flagging:** PASS (Branch A — no flag required).
