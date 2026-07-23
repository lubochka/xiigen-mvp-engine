# UX Review — SaaS Multi-Tenancy (`saas-multi-tenancy`)

**PNGs reviewed:** 6 | **Blockers:** 1 | **High:** 2 | **Medium:** 2 | **Low:** 1
**Overall verdict:** 🚫 Not representative

## Summary

All 6 PNGs show the IDENTICAL "Tenant Lifecycle" page with a single ACTIVE badge and three large action buttons (Suspend / Reactivate / Terminate). The filenames 01-06 encode DNA/architecture assertion rules, NOT the actual business states (ACTIVE / SUSPENDED / TERMINATED / PROVISIONING). The page itself is extremely sparse — a single status chip and three stacked buttons; "Reactivate" is disabled but no label tells the user why (it's greyed without tooltip). A non-technical user cannot tell which tenant they're looking at (no tenant name, ID, or metadata) nor the downstream effect of the red "Terminate" button.

## Per-PNG findings

| # | File | Severity | Axis | Finding (user-perspective) | Suggested fix |
|--:|------|:-------:|------|----------------------------|---------------|
| 1 | `01-every-task-type-in-t201-t240-has-at-leas.png` | 🔴 | State fidelity | File name promises evidence for "every task type has at least [coverage]"; depicts the Tenant Lifecycle page with no tenant identity shown | Either capture the ACTUAL tenant-list / admin screen, or rename file to `tenant-lifecycle-active.png` |
| 2 | `02-every-plan-step-is-scoped-to-a-single-re.png` | 🟡 | Redundant | Identical to #01 | Remove |
| 3 | `03-no-step-imports-provider-sdks-directly-f.png` | 🟡 | Redundant | Identical to #01 | Remove |
| 4 | `04-no-step-creates-entity-specific-controll.png` | 🟡 | Redundant | Identical to #01 | Remove |
| 5 | `05-all-steps-return-dataprocessresult-t.png` | 🟡 | Redundant | Identical to #01 | Remove |
| 6 | `06-focus-areas-covered-40-contracts-52-clou.png` | 🟡 | Redundant | Identical to #01 | Capture a distinct state (SUSPENDED with amber badge, TERMINATED with grey) |
| — | Page content (all 6) | 🟠 | Information appropriateness | No tenant name, ID, plan, or member count visible — user has no idea WHICH tenant this is | Add tenant identity header (name, ID, plan tier) above the status chip |
| — | Page content (all 6) | 🟠 | Affordances | "Reactivate Tenant" is greyed but has no tooltip/helper text explaining why (tenant is already ACTIVE) | Conditional render or inline helper "Only available for suspended tenants" |
| — | Page content (all 6) | 🟡 | Destructive action | Red "Terminate Tenant" has no inline warning about irreversibility or what happens to tenant data | Add subtext: "Permanent. Data retained 30 days then purged." + require typed confirm |

## Cross-PNG patterns (flow-level)

- **All 6 PNGs are byte-identical content.** Single state captured, duplicated across 6 filenames.
- The lifecycle has at least 3 distinct states (ACTIVE / SUSPENDED / TERMINATED) and several transitions (provisioning, suspending) — none are captured.
- No "who is this tenant" context anywhere on the page.

## Business-logic phase coverage

Tenant lifecycle states expected:
- ✅ ACTIVE — covered (repeated 6x)
- ❌ PROVISIONING (creation in progress)
- ❌ SUSPENDED (with reactivate enabled)
- ❌ TERMINATING / TERMINATED
- ❌ Confirmation modal for Terminate
