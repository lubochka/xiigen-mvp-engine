# Flow UI examination — FLOW-28 blog-cms-modules

## Date: 2026-04-20 · Run: RUN-57 · Batch: C (Grammar 5 public reader + Grammar 3 admin list)

## One-sentence spec (F1)
> When a blog post is published on the XIIGen platform, enforce CF590 content
> rules, sanitize XSS and SSRF vectors, apply the budget gate, and serve
> the post from the cache-first published-only search index.

## Roles (F3 — `ROLE-ANALYSIS-BATCH-06.md`)
- **anonymous** — public reader (zero chrome — no sidebar, minimal header)
- **public-marketplace-visitor** — same reader + share-link context
- **tenant-user** — reader + subscribe to newsletter
- **tenant-admin (author / editor)** — write + edit + publish posts; manage drafts
- **platform-admin** — cross-tenant content moderation

## Grammar (compound)
- **G5 Kiosk** for public reader (zero chrome, article = focal point, no sidebar per RUN-49 G3)
- **G3 Card List with State Badge** for author dashboard (Draft / Published / Scheduled / Archived)
- **G5 Kiosk** for article editor (WYSIWYG)

## Reference
Public reader: **Medium, Substack, Ghost** (zero chrome article with author + date + read-time).
Admin list: **Ghost admin**, **WordPress admin**, **Notion**.

## F4 Business doc
`business_flows.zip / 04-post-publishing.md` (long-form variant)

## Classification
- **Q1 CRUD?** 🟡 BlogCmsModulesPage likely AdminCrudPanel default. Needs PNG inspection.
- **Q2 Error/empty?** "No posts yet — publish your first" empty state.
- **Q3 Engineering leak?** "CF590", "XSS/SSRF vectors", "budget gate", "cache-first published-only search index" — MUST not leak to anonymous reader.
- **Q4 Role-correct?** **CRITICAL** — anonymous reader must render WITHOUT AppShell (RUN-49 G3 applies). Per REPAIR-GUIDANCE Part 5: `FLOW-22 cms-publishing` was flagged with `P1: sidebar visible on anonymous view` — same check applies here.

**Primary finding:** NEEDS_SIDEBAR_HIDDEN_ON_ANONYMOUS (P1, uses RUN-49 G3 mechanism) + NEEDS_PURPOSE_BUILT_UI for author list + reader.

## 13 existing PNGs

## Planned fixes
- **Public reader** at `/blog/:slug`: zero chrome, h1 title, author + date + read-time below, body with typographic care, "Subscribe" email form at bottom
- **Author list** at `/admin/blog`: card list with Draft / Published / Scheduled badges + "New post" CTA
- **Article editor**: WYSIWYG with "Save draft" + "Publish" (primary only when draft is complete)
