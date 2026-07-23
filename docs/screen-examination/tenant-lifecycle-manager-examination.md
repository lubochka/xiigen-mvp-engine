# Flow UI examination — FLOW-30 tenant-lifecycle-manager

## Date: 2026-04-20 · Run: RUN-60 · Batch: F (Grammar 6 Dashboard + compound Grammar 7 Settings)

## One-sentence spec (F1)
> When a tenant is deprovisioned on the XIIGen platform, transition the
> lifecycle state, execute the cleanup cascade across all tenant-scoped
> indices, and confirm the tenant scope is fully cleared.

## Roles (F3 — `ROLE-ANALYSIS-BATCH-06.md`)
- **platform-admin** — primary; tenant CRUD + lifecycle operations
- **platform-support** — read-only + support-ticket-scoped investigation

Engine-internal: no tenant/consumer surface.

## Grammar (compound)
- **G6 Dashboard** for platform metrics (active tenants / churn / MRR)
- **G3 Card List with State Badge** for tenant list (Active / Trial / Suspended / Deprovisioning / Archived)
- **G7 Settings Tabs** for platform policies (tier definitions, lifecycle automations)

## Reference
**Stripe Connect dashboard** (platform tenants), **Vercel teams** (team management),
**Linear workspaces admin**.

## F4 Business doc
`business_flows.zip / 08-multi tenant deep-research-report 1.md` + `2.md`

## Classification
- **Q1 CRUD?** 🟡 `TenantLifecycleManagerPage` likely AdminCrudPanel default.
- **Q2 Error/empty?** Empty tenant list for a fresh platform: teaching copy.
- **Q3 Engineering leak?** "Cleanup cascade", "tenant-scoped indices", "tenant scope cleared" — internal; UI: "Data deletion in progress", "Cleanup complete".
- **Q4 Role-correct?** 2-role admin scope.

**Primary finding:** NEEDS_PURPOSE_BUILT_UI (P0) — compound G6+G3+G7 layout.

## 14 existing PNGs

## Planned fixes
- Top tiles: Active tenants / Trial conversions 30d / Churn rate / MRR
- Tenant list: card per tenant with status badge + plan chip + seats used + last-active
- Per-tenant inspect: lifecycle timeline (Created → Trial → Active → Suspended → Deprovisioning → Archived) + cleanup cascade progress
- Settings tabs for Tier definitions + Lifecycle automations + Deprovisioning policies
