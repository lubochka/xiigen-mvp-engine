# Functional Spec — FLOW-28 Blog & CMS Modules

**Grammar:** G5 Kiosk (public reader) + G3 Card list with state badge (author dashboard) + G5 Kiosk (WYSIWYG editor)
**Primary role tiers:** PUBLIC (reader), TENANT_CONSUMER (subscriber), TENANT_OPS (author / editor), PLATFORM_OPS (cross-tenant moderator)
**Current state:** **Half-built** — **18 services** (content authoring, XSS/SSRF sanitization, CF590 rules, cache-first published-only index, budget gate). **Neither `/blog` nor `/blog/:slug` public routes exist.** Author UI still the default admin table.
**Primary unblock:** two public routes + the reader page + the author dashboard (Medium-style reader + Ghost-style admin)
**Resolved from zip:** primary spec is the zip's `04-post-publishing.md` (resolved 2026-04-22).

---

## 1. Summary

A tenant author writes a blog post in a WYSIWYG editor, schedules or publishes it, and watches engagement. Anonymous and authenticated readers discover posts via a public blog hub `/blog`, read individual posts at `/blog/:slug` with minimal chrome (Medium / Substack / Ghost style — the article is the focal point, no XIIGen sidebar), optionally subscribe for email updates. The author manages drafts, scheduled, published, and archived posts. Platform moderators review flagged posts. The server plumbing is complete; the entire user-facing experience — reader and author — is missing.

---

## 2. Roles & modes

| Role | Route prefix | What they do |
|---|---|---|
| **PUBLIC** (reader) | `/blog`, `/blog/:slug` | Discover posts, read, subscribe to newsletter |
| **TENANT_CONSUMER** (authenticated reader) | Same + `/blog/:slug#comments` | Same + comment, like, bookmark |
| **TENANT_OPS** (author) | `/admin/blog/` | Write, edit, schedule, publish, archive |
| **TENANT_OPS** (editor) | `/admin/blog/` | Same as author + review queue, approve |
| **PLATFORM_OPS** (moderator) | `/admin/engine/blog/review` | Cross-tenant content moderation for reported posts |

**Modes:**
- **Anonymous reader:** no chrome. Just the article + subscribe CTA at the bottom.
- **Authenticated reader:** same + comments, like button, bookmark button at the top-right of the article.
- **Desktop / mobile:** reader article is always single-column, max-width 680px centred, same on both.
- **Dark mode** / **light mode:** reader respects system preference; author console is light-only for now.
- **Draft preview** mode: author clicks "Preview" → their own version of `/blog/:slug?preview=<token>` that shows the post as it would look live, no cache.
- **Scheduled** mode: post is in scheduled-publish state; visible to author and editors; not yet on public index.

---

## 3. User stories

### Story 3.1 — Anonymous reader discovers a blog post from search / social *(PUBLIC, G5 kiosk reader)*

**Screens:** external link → `/blog/:slug` → bottom CTA (subscribe / read next) → `/blog`

**Trigger:** reader clicks a share link or search result.

**Happy path:**
1. `/blog/:slug` loads with zero XIIGen admin chrome. Minimal header: tenant logo + "Blog" link. No sidebar.
2. Hero: article title (large), author avatar + name + date + read time, cover image if provided.
3. Article body: carefully typeset (see §7). Images full-width or 60% inset; captions italic grey.
4. Below the article: *"Enjoyed this? Get new posts by email."* → single email input + **Subscribe** button.
5. Below that: *"Read next"* — 3 related post cards.
6. Further below: comments section (only for authenticated readers — anonymous sees *"Sign in to comment"*).
7. Footer: tenant footer (links, copyright) — **not** the XIIGen platform footer.

**UI elements:**
- Typography: generous line-height (1.65), max article width 680px, drop cap or large first-letter optional.
- Image treatment: parallax disabled; lazy-load; maintain aspect ratio on resize.
- Sticky floating share bar (Twitter, LinkedIn, copy link) on the left rail at desktop widths.
- Reading-progress bar: thin line at the top that fills as the reader scrolls.

### Story 3.2 — Authenticated reader comments and bookmarks *(TENANT_CONSUMER)*

**Trigger:** reader on `/blog/:slug` who is signed in.

**Happy path:**
1. Article has a small action row below the hero: 👍 like (count), 🔖 bookmark, 💬 comment (count).
2. Clicking bookmark toggles it; toast: *"Bookmarked — find it in your reading list."*
3. Clicking 💬 scrolls to the comments section at the bottom.
4. Comments render as a threaded list (max 2 levels). Each comment: avatar, name, body, timestamp, like, reply.
5. User types a comment in the bottom textarea + **Post**. Comment appears immediately (optimistic) with a pending spinner; on server confirm, spinner disappears.

**UI elements:** threaded comment list; markdown-lite allowed (bold, italic, code, link — not headings or images); mention autocomplete `@{user}`.

### Story 3.3 — Reader subscribes to the newsletter *(PUBLIC → TENANT_CONSUMER transition)*

**Trigger:** reader enters email in the subscribe widget + clicks **Subscribe**.

**Happy path:**
1. Widget shows inline loading state on submit.
2. On success: widget replaces with *"Check your inbox — we sent a confirmation email to ben@example.com."*
3. Reader opens email (double opt-in), clicks confirmation link → `/blog/subscribed` landing page: *"You're subscribed — here's what to expect."*

### Story 3.4 — Author writes a new blog post *(TENANT_OPS, G5 WYSIWYG kiosk)*

**Screens:** `/admin/blog/` → **New post** → editor at `/admin/blog/:id/edit` → publish flow.

**Trigger:** author clicks **New post** on the blog dashboard.

**Happy path:**
1. Editor loads. Centre is a full-height writing surface. Top-right: state badge (Draft) + **Preview** + **Publish** buttons.
2. Title field above the body, inline-editable, large serif.
3. Body is a block-based editor (like Notion / Medium / Ghost). Slash menu `/` for block types: heading, paragraph, image, embed, code, quote, divider, bullet list, numbered list, callout.
4. Author types freely. Autosave every 30s with a subtle "Saved" indicator.
5. Right-side sidebar (collapsible): tags, category, SEO title/description, cover image, publish date, canonical URL, custom CSS (power users).
6. Author clicks **Publish** → confirm modal: *"Publishing makes the post live at `/blog/:slug`. Share with your audience — you can unpublish anytime."*
7. On confirm: state Draft → Published, toast *"Published — view post"* with link, redirect to the dashboard with the new post highlighted.

**UI elements:**
- Editor: block-based, keyboard-first (shortcuts), /-menu, drag-handle per block.
- Sidebar: tabbed (Content · SEO · Scheduling · Advanced).
- Autosave indicator: subtle, in top bar, next to the state badge.
- Word count + estimated read time: bottom-right, always visible.

### Story 3.5 — Author schedules a post for later *(TENANT_OPS)*

**Trigger:** author clicks the date picker in the sidebar Scheduling tab.

**Happy path:**
1. Date/time picker; author selects 9 AM next Tuesday in their timezone.
2. Publish button label changes to **Schedule**. Click → confirm: *"This post will go live Tuesday Apr 29 at 09:00 in your local timezone."*
3. State: Scheduled. Dashboard shows scheduled posts separately with their target date + countdown.
4. At the scheduled moment server-side: state → Published automatically. Author gets email: *"Your post went live."*

### Story 3.6 — Author manages the dashboard *(TENANT_OPS, G3 card list)*

**Screens:** `/admin/blog/`

**Happy path:**
1. Top bar: **New post** CTA (primary), search, filter by tag/state.
2. **Tabs** along the top: *All · Drafts · Scheduled · Published · Archived*.
3. Under each tab, a card list of posts. Card: thumbnail, title, excerpt, state badge, author, date, views/likes/comments metrics, action menu (edit, duplicate, archive, delete).
4. Empty state per tab: meaningful copy ("No drafts yet" / "Nothing scheduled — plan ahead!").
5. Clicking a card opens the editor.

### Story 3.7 — Editor reviews a post awaiting approval *(TENANT_OPS editor)*

**Trigger:** author submits a post for editorial review (optional workflow — enabled per tenant).

**Happy path:**
1. Post enters *"In review"* state; editor tab on dashboard shows count.
2. Editor opens the post in the editor with a side-rail "Review" panel: approve / request changes (with comment) / reject.
3. On approve: state → Scheduled or Published per author's setting.
4. On request changes: post returns to Draft; author sees editor's comments inline.

### Story 3.8 — Platform moderator handles a reported post *(PLATFORM_OPS, G2 verdict grid)*

**Screens:** `/admin/engine/blog/review` → verdict grid → post detail → action.

**Happy path:**
1. Grammar-2 verdict grid: rows = reported posts, columns = check verdicts (Content safety, Copyright, Spam, PII leak, Brand safety).
2. Row click → full post content + reports + author history.
3. Actions: Keep / Remove (with reason + author notification) / Warn author / Require edit.

---

## 4. Screen structure & UI elements

### 4.1 `/blog` (Public hub, G5 kiosk-ish with card list)

**Layout:**
- **Hero:** large title ("Community stories"), subtitle, optional featured post with cover image.
- **Filters:** category chips, sort (Newest / Popular).
- **Post list:** card list. Each card: cover thumbnail, title, excerpt (150 chars), author + date + read time, 1-2 category chips.
- **Pagination or infinite scroll:** pick one per tenant config; both supported.
- **Sidebar (desktop only):** newsletter subscribe widget, popular posts (top 5 by views last 30 days), categories list.

**Empty state:** *"No posts yet — check back soon."* (for visitors) or *"Your blog is empty — publish your first post."* (for authors visiting their own blog).

**Zero XIIGen admin chrome.** No admin sidebar. No /admin links anywhere.

### 4.2 `/blog/:slug` (Public reader, G5 kiosk)

**Layout:** see Story 3.1. Single column 680px; sticky share bar on the left (desktop); comments at the bottom.

**Typography:**
- Body: serif (Crimson Pro, Newsreader, or Lora — pick per tenant). 18-20px base, line-height 1.65.
- Headings: sans-serif contrast (Inter for headings only, or Söhne for a more distinctive look).
- Code blocks: monospace with syntax highlighting (Prism theme tuned to the colour world).
- Quotes: italic with left border.

**Interaction:** pointer leaves the article → sticky share bar fades to 40%; cursor enters → 100%.

### 4.3 `/admin/blog/:id/edit` (Author editor, G5 kiosk)

**Layout:** top bar + centre writing surface + optional right sidebar (collapsible).

**Top bar elements (left → right):** back link, form title inline-editable, saved indicator, state badge, **Preview**, **Publish** / **Schedule**.

**Writing surface:** block-based, keyboard-first, drag-handle per block, slash menu.

**Right sidebar tabs:** Content · SEO · Scheduling · Advanced.

### 4.4 `/admin/blog/` (Author dashboard, G3 card list with tabs)

**Layout:** top bar with **New post** + search + filter; tabs (All / Drafts / Scheduled / Published / Archived); card list below.

**Card:** thumbnail + title + excerpt + state badge + metrics row.

---

## 5. Edge cases

| Case | Expected behaviour |
|---|---|
| Author renames a post after publish (slug would change) | Modal: *"Change the URL from /blog/{old} to /blog/{new}? We'll add a redirect so old links still work."* with **Change URL** / **Keep URL, change title only** / **Cancel**. |
| Scheduled post fires but the tenant's billing lapsed | Publish is blocked; author email: *"Your post was scheduled to publish but your subscription is past due — reactivate to publish."* Author sees the state as "Blocked — billing". |
| Reader hits `/blog/:slug` while post is in Draft | 404 unless `?preview=<token>` is provided and valid. |
| Two authors save the same post in the same second | Last save wins with a collision banner in the editor: *"Anna saved changes 3 seconds ago — reload to pull her changes (your current unsaved changes will be kept in a draft)."* |
| Subscriber unsubscribes | Confirmation page: *"You've unsubscribed. Changed your mind?"* with resubscribe link. Never a dead-end. |
| Embed block pasted is from an untrusted domain | Block renders as a link card instead of an iframe; tooltip: *"Embed blocked for safety — click to visit."* |
| Author embeds a video from a CDN we don't allow | Validation error with allowlist + suggestion. |
| Author uploads 50 MB hero image | Inline error *"Max 10 MB — let us compress it?"* with auto-compress option. |
| Post has 10,000+ words | Editor keeps up; reader page loads progressively (first viewport renders under 500ms). |
| Reader turns off JavaScript | Server-rendered article works; comments section shows *"Enable JavaScript to comment."* Reading the article is not gated. |
| Author tries to delete a published post | Triple confirm modal: *"Delete permanently? 247 readers have bookmarked this post. Consider unpublishing instead."* + **Unpublish** shortcut in the confirm. |

---

## 6. Problematic states

| State | What the user sees |
|---|---|
| **Unauthenticated** on `/admin/blog/` | Redirect to `/login?return=/admin/blog/`. |
| **Permission denied** (TENANT_CONSUMER on author page) | `/404` friendly. |
| **Session expired mid-edit** | Toast: *"Signed out — your draft is safe."* + sign-in modal preserving the editor state. |
| **Network offline mid-edit** | Top banner: *"Offline — changes queued."* Autosave queues locally; yellow dot on the "Saved" indicator. |
| **Autosave fails** | Top banner: *"Couldn't save — retry?"* with **Retry** button. Local draft never discarded. |
| **Publish fails (validation — missing SEO description)** | Inline error in Publish modal: *"Add an SEO description (meta tag) for search engines. It helps people find this post."* with inline input to fix. |
| **Publish fails (server 5xx)** | Banner in modal: *"Something's off on our side — try again in a minute. Your post is still in draft."* Never silent. |
| **Reader 404 — post not found** | Friendly: *"This post isn't available — it may have been removed or unpublished."* + search / back-to-blog affordances. |
| **Reader 403 — tenant's blog is private** | *"This blog is private — sign in if you have access."* |
| **Scheduled post missed** (server downtime during schedule window) | State becomes *"Schedule missed — reschedule or publish now"* with both buttons in the editor. |
| **Subscribe fails (invalid email)** | Inline red text under field: *"Hmm, that doesn't look like an email — check the format?"* |
| **Subscribe fails (already subscribed)** | Inline: *"You're already subscribed — we'll email you the next post."* Never "error already exists". |
| **Comment submit fails (network)** | Local optimistic comment stays with a "sending" dot; retries on reconnect. |
| **Comment blocked by moderation** | Comment shows as *"Your comment is pending review"* — visible to the user only. |
| **Moderator sees nothing to review** | *"Clean queue — nice."* |
| **Dangerous delete** (see §5) | Triple confirm + unpublish shortcut. |
| **Stale data** (dashboard open, post scheduled to go live while open) | State badge updates live (polling or WebSocket); subtle animation on change + toast *"Post went live!"* |
| **Reader has ad blocker blocking the subscribe widget** | Widget falls back to a link to `/subscribe` that loads a standalone page. |

---

## 7. Visual direction

**Grammar:** G5 kiosk (reader) + G5 kiosk (editor writing surface) + G3 card list (dashboard + blog hub) + G2 verdict grid (moderation).

**Feel (3 words — reader):** *Readable · Considered · Calm*. The article is the focal point; everything else fades.
**Feel (3 words — editor):** *Frictionless · Expressive · Fast*. No modal clutter, keyboard-first, writing should feel like typing into a page that's already a finished article.

**Domain vocabulary:** post, draft, scheduled, published, archived, reader, author, editor, comment, bookmark, subscribe. Never "CF590", "XSS vector", "published-only index", "budget gate" in any user-facing surface.

**Typography (reader):**
- Body serif: Newsreader, Lora, Crimson Pro (tenant-configurable)
- Headings: Inter, Söhne, or Unica77
- Code: JetBrains Mono or Commit Mono
- Base size: 18-20px; line-height 1.65; measure 60-75 chars per line

**Colour world (reader):**
- Ink black for body text (`#111`)
- Warm paper for background (`#fafaf7` light / `#1a1a18` dark)
- Accent colour for links pulled from the tenant's brand
- No gradient backgrounds anywhere in the reader

**Colour world (author console):**
- Clean, slightly cooler (`#f7f8fa` background, `#2a2d33` text)
- Primary blue for **Publish**; amber for **Schedule**; grey for **Draft**

**Signature element (reader):**
- **Reading-progress bar** at the very top of the viewport — thin (2px), uses the accent colour, fills as the reader scrolls. One tiny visible marker of progress is more useful than all the sidebar meta.

**Signature element (editor):**
- **Slash menu** `/` — keyboard-first block insertion. Brings the editor to the same league as Notion / Ghost / Medium.

**Anti-references (reader):**
- Corporate WordPress blog (dense sidebar, 20 widgets, readability low)
- Medium's full-width card grid on the home page with each card identical
- News sites with autoplay video and cookie banners eating 40% of the viewport

**Anti-references (editor):**
- WordPress Gutenberg (confused block model, ugly default inspector)
- Typepad's 2010 toolbar
- Markdown-only editors that force the author to think in tokens

**Anti-patterns (both):**
- XIIGen admin sidebar on the public reader
- Ads in the middle of the article (this is a paid tool — no ads unless the tenant configures them explicitly)
- FAILED invoice or error state as the dominant anchor when the author opens `/admin/blog/`
- Generic "Lorem ipsum" preview when the editor has no content — empty state must be welcoming, not placeholder text

---

## 8. Acceptance criteria

- [ ] `/blog` public hub renders for anonymous visitors with zero XIIGen admin chrome.
- [ ] `/blog/:slug` reader page loads with server-rendered article (progressive enhancement — JS optional).
- [ ] Reading-progress bar animates smoothly at 60fps.
- [ ] Sticky share bar on left rail (desktop); bottom share bar (mobile).
- [ ] Editor supports all block types listed; slash menu works with keyboard-first navigation.
- [ ] Autosave every 30s with clear visual indicator; offline queuing.
- [ ] Preview URL (`?preview=<token>`) serves fresh (no cache) to author only.
- [ ] Schedule sets a server-side job; state transitions correctly at the scheduled moment.
- [ ] Dashboard shows cards in tabs (Drafts / Scheduled / Published / Archived) with live state badges.
- [ ] Subscribe widget uses double opt-in; already-subscribed case handled gracefully.
- [ ] Comments threaded 2 levels; markdown-lite allowed; optimistic UI on post.
- [ ] Moderator verdict grid renders with colour + text + icon per cell.
- [ ] All 18 problematic states (§6) render the documented treatment.
- [ ] Slug rename offers redirect option; old URLs never 404 after a rename.
- [ ] Zero engineering terminology (CF590, XSS, budget gate) in user-facing copy.
- [ ] WCAG AA contrast in both light and dark reader modes.
- [ ] Danger-zone delete requires triple confirm + unpublish shortcut.
- [ ] Subscribers list export works (CSV / Mailchimp / ConvertKit connectors).
