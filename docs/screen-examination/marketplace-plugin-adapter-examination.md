# Flow UI examination — FLOW-34 marketplace-plugin-adapter

## Date: 2026-04-20 · Run: RUN-55 · Batch: A (Grammar 4 Topology Canvas — compound with Grammar 3)

## One-sentence spec

**Semantic-slug interpretation** (derived from F3 ROLE-ANALYSIS + PNG state
names + CLAUDE.md):
> A plug-and-play adapter catalog for third-party integrations (Stripe, HubSpot,
> Slack, etc.) — vendors publish adapters, tenant-admins install them, the
> engine handles adapter handshake → payload translation → sync lifecycle.

**STEP-1-INVARIANTS interpretation** (F1):
> When an AI agent task is submitted to the XIIGen engine, route it through
> the thin adapter compliance gate, collect votes from the agent panel, and
> confirm the orchestration result via the voting gate.

**Finding:** F1 and the semantic slug describe different things. The slug,
PNG state names (`state-1-adapter-registered`, `state-2-handshake-pending`,
`state-3-plugin-connected`, etc.), and role-analysis all point to a plugin
marketplace; F1 describes AI-agent orchestration. **This catalogue follows
the semantic slug** (higher priority per Rule 16) and flags the F1
misalignment as a spec gap to file.

## Roles (F3 — `ROLE-ANALYSIS-BATCH-07.md`)

**9 observable viewer roles — broad density:**
- **anonymous** — public catalog browse
- **public-marketplace-visitor** — permalink landing on specific adapter
- **tenant-user** — browse (install gated to admin); "request your admin" CTA
- **tenant-admin** — **primary installer** — pick, configure API keys, manage installed adapters
- **freelancer** — niche publisher of workflow-automation adapters
- **business-partner** — **primary vendor** — publish + metrics + support-tier
- **platform-admin** — marketplace curation / security / promotion gate
- **platform-support** — read-only dispute resolution
- event-organiser / referral-user — inherit tenant-user browse

## State inventory (F2)

**`UI-REFLECTION-STATE.md` says 1 NO_UI process** — `NOT_IMPLEMENTED-FLOW-34`.
Server has no engine dir and no contracts — meaning the back-end isn't
implemented. The client page renders a MOCK.

**Derived states (from PNG filenames — 8 lifecycle states):**
1. `adapter-registered` — vendor published
2. `handshake-pending` — install started
3. `plugin-connected` — OAuth / API-key handshake complete
4. `payload-translating` — data mapping in progress
5. `payload-translated` — mapping done
6. `synced` — first successful sync
7. `schema-mismatch` — error path
8. `rate-limited` — error path

## Business intent (F4)
No entry in `business_flows.zip`. Slug maps to "Plugin Marketplace" domain.

## Real-world reference (MARKET-REFERENCE-CATALOG)

**Primary (catalog view, anonymous + public-mkt + tenant-user + tenant-admin):**
Zapier app directory, VS Code extension marketplace, GitHub Marketplace
(integrations tab), Salesforce AppExchange. Grammar 3 card grid.

**Primary (admin adapter-lifecycle view, tenant-admin installed + platform-admin curation):**
Stripe Connect integrations dashboard, HubSpot integrations list, 1Password
integrations panel. Grammar 3 card list with state badge per installed
adapter.

**Compound G4 Topology canvas (platform-admin deep view):**
Adapter interconnection diagram — which flows use which adapters. n8n-style
nodes for advanced troubleshooting.

## Classification (Step A)

- **Q1 CRUD?** 🟡 **Likely YES** — page named `MarketplacePluginAdapterPage` at `/admin/marketplace-plugin-adapter` — admin console pattern. Needs PNG inspection to confirm.
- **Q2 Error/empty?** 🟡 8 state PNGs exist but 2 (schema-mismatch, rate-limited) depict error states — if captured as "default" they leak error-as-normal.
- **Q3 Engineering leak?** 🟡 `state-1-flow-has.png` filename pattern is the same engineering-leak BFA mock as FLOW-29 / FLOW-18. Needs confirmation.
- **Q4 Role-correct?** ❌ **Only 1 admin page exists** for a flow with 9 observable roles. Missing: public catalog (`/plugins`), partner publisher console, platform curation queue.

**Primary finding:** NEEDS_PURPOSE_BUILT_UI (P0) for three missing surfaces
(public catalog, partner publisher, platform curation). Existing admin page
likely NEEDS_PURPOSE_BUILT_UI too (CRUD → card list with state badges).

Secondary: NEEDS_ROLE_BRANCH_CORRECTION (P1) — 1 admin template for 9 roles
is architecturally wrong.

Tertiary: spec gap — F1 intent says AI-agent orchestration but everything
else says plugin marketplace. File gap finding for product resolution.

## Planned fixes (for later RUNs)

**Spec-resolution step (pre-code):** decide whether FLOW-34 is plugin
marketplace OR AI-agent orchestration, update F1 accordingly, re-align docs.
The slug, role-analysis, and PNGs suggest marketplace — so F1 may be the
outdated one.

**P0 — Public catalog page** at `/plugins`:
- Grammar 3 card grid (Zapier reference)
- Anonymous + public-mkt-visitor + tenant-user (3 overlapping roles, minor variations)
- Per-card: logo, name, vendor, install count, rating, "Install" CTA (gated per role)

**P0 — Installed-adapters admin dashboard:**
- Grammar 3 card list with state badge per installed adapter
- Badges match the 8 lifecycle states (adapter-registered / handshake-pending / plugin-connected / payload-translating / synced / schema-mismatch / rate-limited)
- Retry action for error badges (schema-mismatch, rate-limited)

**P1 — Partner publisher page** at `/partner/plugins/publish`:
- Grammar 5 form wizard (Linear / Typeform reference)
- Vendor fields + metrics dashboard

**P1 — Platform curation queue** at `/admin/platform/plugins`:
- Grammar 2 Verdict Grid (approve / reject / request revision)
- One row per pending adapter submission

**P2 — Delete invalid PNGs:**
- `c-03-before.png`, `crud-*.png`, `default.png`, `state-1-flow-has.png` — all BFA-mock / CRUD leaks

## FLOW-34 inventory rows appended to PNG-INVENTORY.md.

## Next action

Batch A (Grammar 4 Topology) catalogued: FLOW-29 ✅, FLOW-18 🟡, FLOW-26 🟡,
FLOW-34 🟡. Continue with Batch B (Grammar 2 Verdict Grid) in RUN-56+:
FLOW-24 moderator queue, FLOW-25 BFA governance, FLOW-27 human-interaction
gate, FLOW-35 meta-arbitration, FLOW-37 multi-stack porting.
