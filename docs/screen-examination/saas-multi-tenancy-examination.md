# Flow UI examination — FLOW-15 saas-multi-tenancy

## Date: 2026-04-20 · Run: RUN-61 · Batch: G (Grammar 7 Settings Tabs)

## One-sentence spec (F1)
> When a tenant is provisioned on the XIIGen SaaS platform, initialise
> the 40 contracts for their platform interfaces, wire the 7 required
> named checks, and confirm the 52 CloudEvent schemas are registered.

## Roles (F3 — `ROLE-ANALYSIS-BATCH-03.md`)
- **tenant-admin** — primary; configures own tenant (workspace settings + team members)
- **tenant-user** — view-only (workspace name visible in profile)
- **platform-admin** — cross-tenant provisioning + policy

## Grammar
**G7 Settings Tabs** — left-rail vertical tabs (General / Members / Billing / Integrations / Advanced) + right form area + Danger-zone isolated at bottom.
**Reference:** **Linear workspace settings**, **Notion teamspace settings**, **Vercel team settings**, **GitHub repo settings**, **Stripe account settings**.

## F4 Business doc
`business_flows.zip / 08-multi tenant deep-research-report 1.md` + `2.md`

## Classification
- **Q1 CRUD?** 🟡 2 pages exist (TenantLifecyclePage + TenantProvisioningPage).
- **Q2 Error/empty?** Fresh-tenant state should onboard, not show empty form.
- **Q3 Engineering leak?** "40 contracts", "7 required named checks", "52 CloudEvent schemas" — engineering detail that should NOT leak to tenant-admin UI; these are engine-internal.
- **Q4 Role-correct?** ✅ 3-role split.

**Primary finding:** NEEDS_PURPOSE_BUILT_UI (P0) — settings tabs layout + separation of tenant-admin self-service from platform-admin cross-tenant ops (which belongs in FLOW-30).

## 6 existing PNGs

## Planned fixes
- Left rail tabs: General / Members / Billing / Integrations / Advanced
- General tab: workspace name + slug + description + logo upload
- Members tab: member list with role per member + invite form + pending invites
- Billing tab: current plan card + upgrade CTA (links to FLOW-12 billing portal)
- Integrations tab: installed apps list (links to FLOW-34 plugin adapters)
- Advanced tab: data export, SSO config, Danger-zone (delete workspace) at bottom
- TenantProvisioningPage: platform-admin surface — new-tenant wizard (not in settings)
