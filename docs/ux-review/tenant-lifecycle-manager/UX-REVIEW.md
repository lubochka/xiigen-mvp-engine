# UX Review — Tenant Lifecycle Manager (`tenant-lifecycle-manager`)

**PNGs reviewed:** 6 | **Blockers:** 2 | **High:** 1 | **Medium:** 2 | **Low:** 1
**Overall verdict:** 🚫 Not representative

## Summary

This flow's captures are the generic dynamic-CRUD admin pattern (`/api/dynamic/xiigen-tenant-lifecycle-manager`). Four of the six CRUD PNGs are byte-identical (1-row table). Only `crud-list-with-test-row.png` differs (2-row table). The `state-1` capture reveals FLOW-30 has NO documented topology at all — it renders the fallback text "FLOW-30 has no documented states — topology and product spec both missing, and n..." (truncated!). Given this flow's claim to manage tenant lifecycles (a high-stakes operation), shipping a CRUD table that only lets the user create "Name / Status / Notes" rows is not a lifecycle UI.

## Per-PNG findings

| # | File | Severity | Axis | Finding (user-perspective) | Suggested fix |
|--:|------|:-------:|------|----------------------------|---------------|
| 1 | `default.png` | 🟡 | Redundant | Identical to `crud-initial-load.png`, `crud-after-create.png`, `c-03-before.png` | Keep one, drop three |
| 2 | `crud-initial-load.png` | 🟡 | Redundant | Same 1-row table | Remove |
| 3 | `crud-after-create.png` | 🟡 | Redundant (state fidelity) | Name says "after create" but shows the same 1-row state — the create transition is not visible | Capture a true before/after pair around the POST |
| 4 | `c-03-before.png` | 🟡 | Redundant | Same 1-row table | Remove |
| 5 | `crud-list-with-test-row.png` | 🟢 | Useful | The only PNG showing the 2-row state after e2e insertion; this is the one capture that proves the list grows | Keep |
| 6 | `state-1-flow-has.png` | 🔴 | State fidelity | Shows "FLOW-30 has no documented states — topology and product spec both missing, and n..." — truncated error text standing in for the flow's business topology | Either author a real topology fixture for FLOW-30 or remove this surface from production |
| — | Admin CRUD (all) | 🔴 | Information appropriateness | Labelled "Tenant Lifecycle Manager" but the only columns are Name/Status/Notes/Actions — there is NO suspend/terminate action, no tenant plan, no member count, no billing link. This is a generic doc table masquerading as a lifecycle manager | Build a real lifecycle UI (status transitions, confirmation, audit) or rename to "Tenant Records (internal)" |
| — | Admin CRUD | 🟠 | Copy | "FLOW-30 admin console backed by /api/dynamic/xiigen-tenant-lifecycle-manager" exposes internal URL + flow number to anyone who loads the page | Hide internal API path behind an info-icon tooltip |
| — | Chrome | 🔵 | Banner | Persistent yellow "Missing provider keys" banner occupies top 48px | Dismissable |

## Cross-PNG patterns (flow-level)

- **4 of 5 CRUD PNGs are byte-identical.** Real capture coverage is 2 frames (1-row list and 2-row list).
- **state-1 shows "no documented states" fallback** — the flow has no topology; the capture is architectural-debt evidence, not a business phase.
- `ENGINE_INTERNAL` badge is correct for this debug console but the flow name suggests a customer-facing manager.

## Business-logic phase coverage

- ❌ Tenant creation (provisioning)
- ❌ Tenant suspend
- ❌ Tenant terminate (destructive action)
- ❌ Plan / billing link
- ✅ Debug CRUD list — over-captured
