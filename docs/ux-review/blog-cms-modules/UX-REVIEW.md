# UX Review — Blog / CMS Modules (`blog-cms-modules`)

**PNGs reviewed:** 6 | **Blockers:** 2 | **High:** 2 | **Medium:** 1 | **Low:** 1
**Overall verdict:** 🚫 Not representative

## Summary

This flow is uniquely classified `TENANT_FACING` — meaning end customers (tenant users, not platform admins) will see this — yet the UI is THE SAME generic ENGINE_INTERNAL admin CRUD (Name/Status/Notes/Actions). For a blog-authoring / CMS flow this is a shipping blocker: no rich-text editor, no preview, no publish workflow, no categories/tags, no media library, no SEO fields. The `state-1-flow-has.png` returns the "no documented states" fallback for FLOW-28. Tenant users dropped into this UI will not recognize it as a blog tool.

## Per-PNG findings

| # | File | Severity | Axis | Finding (user-perspective) | Suggested fix |
|--:|------|:-------:|------|----------------------------|---------------|
| 1 | `default.png` | 🟡 | Redundant | Same as crud-initial-load / crud-after-create / c-03-before | Keep one |
| 2 | `crud-initial-load.png` | 🟡 | Redundant | Same | Remove |
| 3 | `crud-after-create.png` | 🟡 | Redundant | Same | Capture true create transition |
| 4 | `c-03-before.png` | 🟡 | Redundant | Same | Remove |
| 5 | `crud-list-with-test-row.png` | 🟢 | Useful | Shows 3-row post-insert state | Keep |
| 6 | `state-1-flow-has.png` | 🔴 | State fidelity | "FLOW-28 has no documented states — topology and product spec both missing" for a TENANT_FACING CMS flow | Author topology + replace fallback with CMS-specific state |
| — | Admin CRUD | 🔴 | Information appropriateness | TENANT_FACING blog tool rendered as raw CRUD — no article editor, no preview, no publish queue | Build a blog post composer: title, rich body, hero image, tags, publish workflow |
| — | Admin CRUD | 🟠 | Trust / classification | `TENANT_FACING` badge visible next to an internal API path (`/api/dynamic/xiigen-blog-cms-modules`) — an end customer would see "xiigen" branding + internal URL | Hide internal URL entirely for TENANT_FACING classification |
| — | Admin CRUD | 🟠 | Copy | Row name `e2e-1776602489272` with Notes "created by blog-cms-modules-crud.spec.ts" visible to tenants | Filter internal test rows out |
| — | Chrome | 🔵 | Banner | Missing-provider-keys banner | Dismissable |

## Cross-PNG patterns (flow-level)

- **4 of 5 CRUD PNGs are byte-identical.**
- **state-1 fallback + TENANT_FACING classification** combine to ship an incomplete experience directly to end customers.
- No differentiation from ENGINE_INTERNAL flows despite the audience difference.

## Business-logic phase coverage

- ❌ Post list (drafts / published)
- ❌ Rich-text editor
- ❌ Preview / publish / schedule
- ❌ Categories / tags / SEO
- ❌ Media library
- ✅ Debug CRUD list — over-captured
