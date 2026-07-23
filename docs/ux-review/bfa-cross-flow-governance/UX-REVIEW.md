# UX Review — BFA Cross-Flow Governance (`bfa-cross-flow-governance`)

**PNGs reviewed:** 12 | **Blockers:** 0 | **High:** 3 | **Medium:** 5 | **Low:** 4
**Overall verdict:** ⚠️ Needs fixes

## Summary

This ENGINE_INTERNAL flow exposes two UIs: a generic admin-CRUD table (Name/Status/Notes/Actions) and four distinct "mock state" cards illustrating the 4-state BFA machine. The CRUD view works, but its data — `ui-1776451808909` / `active` / "created via UI form" — is indistinguishable from every other ENGINE_INTERNAL admin panel. The state cards are the only thing that make this flow look like BFA. Biggest issue: the 01-03 captures are stateful-looking filenames over the same generic CRUD panel.

## Per-PNG findings

| # | File | Severity | Axis | Finding (user-perspective) | Suggested fix |
|--:|------|:-------:|------|----------------------------|---------------|
| 1 | `01-change-intake-parse-001-t375-content-add.png` | 🟠 | State fidelity | Filename = T375 change-intake parse; shows generic admin CRUD | Re-capture against state-1 mock card (which does exist) |
| 2 | `02-blast-radius-traversal-001-t380-transiti.png` | 🟠 | State fidelity | Filename = T380 transition; shows identical CRUD panel | Use state-2 card for this capture |
| 3 | `03-cross-tenant-guard-001-t387-cross-tenant.png` | 🟠 | State fidelity | Filename = T387 cross-tenant guard; identical CRUD panel | Use state-4 card |
| 4 | `c-03-before.png` | 🟡 | Redundant | Pixel-identical to #1 and #2 | Drop or label clearly |
| 5 | `crud-after-create.png` | 🔵 | Copy | "Name: ui-1776451808909 · Status: active · Notes: created via UI form" — opaque | Require a human-readable name field at create time |
| 6 | `crud-initial-load.png` | 🟡 | Redundant | Pixel-identical to #1 | Merge captures |
| 7 | `crud-list-with-test-row.png` | 🔵 | Copy | "created by bfa-cross-flow-governance-crud.spec.ts" leaks test-harness into UI | Hide spec-originator note or normalize to "via automation" |
| 8 | `default.png` | 🟡 | Redundant | Pixel-identical to #1 | Drop |
| 9 | `state-1-change-intake.png` | 🔵 | Content | CHANGE-INTAKE-PARSE-001 (T375) card — clear, but truncated with "…" | Show full description on hover/click |
| 10 | `state-2-blast-radius.png` | 🔵 | Content | T380 state card — fine | — |
| 11 | `state-3-arbitration-machine.png` | 🔵 | Content | T381 state card — fine | — |
| 12 | `state-4-cross-tenant.png` | 🔵 | Content | T387 state card — fine | — |

## Cross-PNG patterns (flow-level)

- Half the suite (#1, #2, #3, c-03-before, crud-initial-load, default) are the same CRUD list — six copies is excessive.
- state-1 through state-4 do show distinct content; they should be the primary evidence for this flow, not the numbered prefix files.
- The CRUD panel makes no attempt to explain *what* a "BFA governance record" means to the admin.

## Business-logic phase coverage

Topology: 4 state cards cover T375, T380, T381, T387 — complete for the mock layer.
**Visually covered:** change-intake parse, blast-radius traversal, arbitration state machine, cross-tenant guard.
**Missing:** no live example of a gate blocking a real change, no approval/rejection record, no audit trail visible to admin.
