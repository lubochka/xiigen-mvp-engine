# UX Review — Client Push (`client-push`)

**PNGs reviewed:** 6 | **Blockers:** 1 | **High:** 1 | **Medium:** 2 | **Low:** 1
**Overall verdict:** 🚫 Not representative

## Summary

Generic ENGINE_INTERNAL admin CRUD table. 4 of 5 CRUD captures look near-identical (4-row tables with small row count variation); only `crud-list-with-test-row.png` shows the 5-row post-insert state. `state-1-client-push.png` is a mock card reading "State 1: Client Push Infrastructure-specific patterns TBD" — another TBD placeholder. A user expecting a notification/push console (device token management, broadcast/campaign, delivery status) sees none of it.

## Per-PNG findings

| # | File | Severity | Axis | Finding (user-perspective) | Suggested fix |
|--:|------|:-------:|------|----------------------------|---------------|
| 1 | `default.png` | 🟡 | Redundant | Same as crud-initial-load / crud-after-create / c-03-before | Keep one |
| 2 | `crud-initial-load.png` | 🟡 | Redundant | Same 4-row table | Remove |
| 3 | `crud-after-create.png` | 🟡 | Redundant | Same | Capture true transition |
| 4 | `c-03-before.png` | 🟡 | Redundant | Same | Remove |
| 5 | `crud-list-with-test-row.png` | 🟢 | Useful | Shows 5-row post-insert state | Keep |
| 6 | `state-1-client-push.png` | 🔴 | State fidelity | Content: "Client Push Infrastructure-specific patterns TBD" — a TBD placeholder | Replace fixture with real push-infra visualization |
| — | Admin CRUD | 🟠 | Information appropriateness | A push-notification flow reduced to Name/Status/Notes rows — no device tokens, no campaign/message, no delivery stats | Build dedicated push console: campaign composer + delivery stats |
| — | Admin CRUD | 🟡 | Copy | Test spec name leaks to Notes column | Filter test rows |
| — | Chrome | 🔵 | Banner | Missing-provider-keys banner | Dismissable |

## Cross-PNG patterns (flow-level)

- **4 of 5 CRUD PNGs are byte-identical.**
- **state-1 is a TBD placeholder.**
- No push-specific affordances surfaced.

## Business-logic phase coverage

- ✅ State 1 stub (TBD)
- ❌ Device / token registry
- ❌ Campaign / message composer
- ❌ Delivery status (sent / delivered / failed)
- ❌ Per-platform breakdown (iOS / Android / Web)
