# Flow UI examination — FLOW-32 sharable-flows-marketplace

## Date: 2026-04-20 · Run: RUN-57 · Batch: C (Grammar 3 Card List)

## One-sentence spec (F1)
> When a flow author publishes a template to the XIIGen marketplace, apply
> tripartite signing, store the template in the content-addressed store,
> route it through human review, and confirm the 7 named checks pass.

## Roles (F3 — `ROLE-ANALYSIS-BATCH-07.md`)
- **anonymous** — browse public flow templates
- **public-marketplace-visitor** — permalink landing on specific template
- **tenant-user** — install template into own workspace
- **tenant-admin** — manage workspace-scoped templates
- **tenant-admin (publisher)** — publish own flow as template
- **platform-admin** — marketplace curation + signing verification

## Grammar
**G3 Card List with State Badge** — template cards + install count + version badge.
**Reference:** **GitHub Marketplace** (integrations tab), **npm registry**, **VS Code extension marketplace**.

## F4 Business doc
`business_flows.zip / 32-sharable flows.md`

## Classification
- **Q1 CRUD?** 🟡 Existing `SharableFlowsMarketplacePage.tsx` likely AdminCrudPanel default.
- **Q2 Error/empty?** Empty marketplace (first-tenant scenario) needs teaching copy.
- **Q3 Engineering leak?** "Tripartite signing", "content-addressed store", "7 named checks" — internal; use "Verified by 3 parties", "Template store", "Published".
- **Q4 Role-correct?** ✅ multiple roles — likely needs RoleScopedView.

**Primary finding:** NEEDS_PURPOSE_BUILT_UI (P0) — card grid format for gallery.

## 14 existing PNGs

## Planned fixes
- Template card: name + thumbnail + description + install count + version badge + rating + "Install" CTA
- Detail page with: README / screenshots / changelog / install instructions / reviews
- Publisher console: "Publish new version" wizard (Grammar 5)
- Platform curation: Grammar 2 Verdict Grid for pending submissions (Verify signature / Security audit / Promote / Reject)
