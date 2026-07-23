# UX Review — Marketplace Plugin Adapter (`marketplace-plugin-adapter`)

**PNGs reviewed:** 6 | **Blockers:** 2 | **High:** 1 | **Medium:** 1 | **Low:** 1
**Overall verdict:** 🚫 Not representative

## Summary

Generic admin CRUD table, but — uniquely — this flow is tagged `ADMIN_FACING` (not ENGINE_INTERNAL). Despite the elevated classification, the UI is visually indistinguishable from the engine-internal pages. State-1 capture reads "FLOW-34 has no documented states — topology and product spec both missing, and n...". An admin who manages marketplace plug-ins has no way to install, configure, test, or disable a plug-in — only Name/Status/Notes rows.

## Per-PNG findings

| # | File | Severity | Axis | Finding (user-perspective) | Suggested fix |
|--:|------|:-------:|------|----------------------------|---------------|
| 1 | `default.png` | 🟡 | Redundant | Same as crud-initial-load / crud-after-create / c-03-before | Keep one |
| 2 | `crud-initial-load.png` | 🟡 | Redundant | Same | Remove |
| 3 | `crud-after-create.png` | 🟡 | Redundant (state fidelity) | Same before/after | Capture real transition |
| 4 | `c-03-before.png` | 🟡 | Redundant | Same | Remove |
| 5 | `crud-list-with-test-row.png` | 🟢 | Useful | Shows 3-row post-insert state | Keep |
| 6 | `state-1-flow-has.png` | 🔴 | State fidelity | "no documented states — topology and product spec both missing" fallback | Author topology |
| — | Admin CRUD | 🔴 | Consistency / classification | Badge says `ADMIN_FACING` but UI is the same bare CRUD as `ENGINE_INTERNAL` pages — no visual distinction for admins | Apply a distinct admin-facing layout: plugin cards with logo, config toggle, test button |
| — | Admin CRUD | 🟠 | Copy | Internal path `/api/dynamic/xiigen-marketplace-plugin-adapter` visible | Hide internal path |
| — | Chrome | 🔵 | Banner | Missing-provider-keys banner | Dismissable |

## Cross-PNG patterns (flow-level)

- **4 of 5 CRUD PNGs are byte-identical.**
- **state-1 is "no topology" fallback.**
- ADMIN_FACING classification is not reflected in the design.

## Business-logic phase coverage

- ❌ Plug-in list (installed, available)
- ❌ Install / uninstall
- ❌ Plug-in config (secrets, endpoints)
- ❌ Test connection + health status
- ✅ Debug CRUD list — over-captured
