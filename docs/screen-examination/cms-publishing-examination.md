# Flow UI examination — FLOW-22 cms-publishing

## Date: 2026-04-20 · Run: RUN-58 · Batch: D (Grammar 5 public reader + Grammar 3 admin list)

## One-sentence spec (F1)
> When an editor publishes content on the XIIGen CMS, advance the editorial
> workflow to published state, register the slug, and emit the versioned
> publish event to downstream consumers.

## Roles (F3 — `ROLE-ANALYSIS-BATCH-05.md`)
- **anonymous** — public reader (zero chrome, RUN-49 G3)
- **public-mkt-visitor** — permalink landing
- **tenant-user** — reader + subscribe
- **tenant-admin (editor)** — write / edit / publish
- **platform-admin** — cross-tenant content moderation

## Grammar (compound)
- **G5 Kiosk** for public reader (zero chrome, article focal)
- **G3 Card List with State Badge** for editorial dashboard (Draft / Scheduled / Published / Archived)
- **G5 Kiosk** for WYSIWYG editor

## Reference
**Medium + Substack + Ghost** (public reader);
**Ghost admin + WordPress admin + Notion** (editorial list).

## F4 Business doc
`business_flows.zip / 04-post-publishing.md` (long-form variant, overlap with FLOW-28)

## Classification
- **Q1 CRUD?** 🟡 CmsPublishingPage likely AdminCrudPanel default.
- **Q2 Error/empty?** Empty draft list: "No posts yet — start writing" CTA.
- **Q3 Engineering leak?** "Editorial workflow", "versioned publish event" — internal; UI copy: "Publish status", "Scheduled for X".
- **Q4 Role-correct?** **CRITICAL** — anonymous reader must render without AppShell (RUN-49 G3). Per REPAIR-GUIDANCE Part 5: FLOW-22 was explicitly flagged `P1: sidebar visible on anonymous view`.

**Primary finding:** NEEDS_SIDEBAR_HIDDEN_ON_ANONYMOUS (P1) + NEEDS_PURPOSE_BUILT_UI for reader + editorial list.

## 24 existing PNGs

## Planned fixes
- Public reader at `/cms/:slug`: zero chrome (no sidebar), h1 title, author + date + read-time, body, optional subscribe email at bottom
- Verify `isPublicRoute` match pattern in AppShell includes `/cms/:slug`
- Editorial dashboard at `/admin/cms`: Grammar 3 card list with Draft / Scheduled / Published / Archived badges, "New post" CTA
- WYSIWYG editor: Grammar 5 kiosk (focused writing surface), Save draft secondary, Publish primary when draft is complete
