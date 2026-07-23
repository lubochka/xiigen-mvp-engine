# Functional Spec — FLOW-22 CMS Publishing

**Grammar:** G5 Kiosk (public reader) + G3 Card list (author console)
**Primary role tiers:** PUBLIC (reader), TENANT_OPS (author / editor), PLATFORM_OPS (moderator)
**Current state:** **Designed** — 4 services; no purpose-built UI.

## 1. Summary

A general CMS — not blog-specific. A tenant author creates content pieces (articles, press releases, help-centre pages, announcements), chooses a template, publishes to a public URL, organises content into collections, and manages access (public / authenticated / role-gated). Shares infrastructure with FLOW-28 but serves non-blog content types (docs, landing pages, help centre, announcements).

## 2. Roles & modes

| Role | Route | What |
|---|---|---|
| **PUBLIC** | `/pages/:slug`, `/collections/:slug` | Read published content |
| **TENANT_CONSUMER** | Same + auth-gated content | Read member-only content |
| **TENANT_OPS** (author) | `/admin/cms/` | Create, edit, publish, organise |
| **PLATFORM_OPS** | `/admin/engine/cms/` | Cross-tenant moderation |

**Modes:** Public / auth-only / role-gated; draft / scheduled / published / archived; preview token for drafts.

## 3. User stories

### Story 3.1 — Author creates a help-centre article

**Screens:** `/admin/cms/` → **New page** → template picker → editor → publish.

1. Template picker: Help Centre Article / Landing Page / Announcement / Press Release / Custom.
2. Template-aware editor: each template defines expected sections (title, body, related links, etc.).
3. Publish → choose audience + URL slug + SEO → public at `/pages/:slug`.

### Story 3.2 — Author organises content into a collection

**Screens:** `/admin/cms/collections` → **New collection** → add pages → publish.

1. Collections are a group of pages with a common theme (e.g., "Getting started help").
2. Author drags pages into the collection; defines ordering; sets a collection landing page template.
3. Publish → public at `/collections/:slug` with a landing + linked pages.

### Story 3.3 — Reader browses help centre

**Screens:** `/collections/help-centre` → `/pages/:slug`.

1. Collection page: hero + category navigation + search + featured articles.
2. Article page: standard reader layout (title, body, related links at the bottom, was-this-helpful widget).

## 4. Screen structure

- **`/admin/cms/`** — G3 cards by content type + collections.
- **Editor** — similar to FLOW-28 block editor.
- **Public reader** — template-aware layouts (help article vs landing vs announcement vs press release).
- **Collection landing** — hero + nav + content cards.

## 5. Edge cases

| Case | Behaviour |
|---|---|
| Page in a collection is unpublished | Collection still renders without that page; author notified. |
| Role-gated content viewed by unauthorised user | Redirect to upgrade/login with context. |
| SEO slug collision | Author warned + suggested alternative. |
| Template schema changes after publish | Existing pages preserve structure; author prompted to upgrade to new template. |

## 6. Problematic states

- **Empty collection** → *"Add pages to start this collection."*
- **Draft preview expired** → regenerate token.
- **Was-this-helpful no feedback yet** → subtle prompt without count ("Tell us").
- **Public page not found** → friendly 404.
- **Auth-gated page for unauthorised** → friendly *"Members only"* page with login affordance.

## 7. Visual direction

**Grammar:** G5 kiosk (reader) + G3 card list (author).

**Feel:** *Informative · Unfussy · Scannable*. Help content especially — readers are hunting for answers.

**Reference UIs:** Stripe Docs, Linear Help Centre, Intercom articles, Notion public sites.

**Signature:** the **template picker** at creation — sets the right structural expectations up front.

**Anti-patterns:**
- One-size-fits-all page template (help articles != landing pages).
- Auto-generated "related" lists that feel random.

## 8. Acceptance criteria

- [ ] Template picker for content types.
- [ ] Block editor (shared with FLOW-28).
- [ ] Collections group pages with landing.
- [ ] Public + auth-gated + role-gated access.
- [ ] Was-this-helpful feedback widget.
- [ ] All 5 problematic states covered.
