# Functional Spec — FLOW-48 i18n Translation

**Grammar:** G7 Settings tabs (user locale) + G6 Dashboard (translator console) + G3 Card list (translation jobs)
**Primary role tiers:** TENANT_CONSUMER (end user), TENANT_OPS (translator / localisation manager), PLATFORM_OPS
**Current state:** **Half-built** — `UserPreferencesManager` service exists; **`/settings/language` route doesn't exist** — users can't change their language
**Primary unblock:** add the language settings route + page; wire the translator console
**Resolved from zip:** primary spec is the zip's `34-translate to alternatives.md` (resolved 2026-04-22).

---

## 1. Summary

A user picks their preferred language from a settings page and the whole product renders in that language. If content exists in multiple locales, the user sees the preferred locale; otherwise they see the fallback (tenant's default) with a small banner offering the original. A localisation manager on the tenant side reviews what's translated, what needs translation, what auto-translations exist, and commissions professional translation where the tenant cares about quality. A platform admin watches coverage + translation-job health across tenants.

---

## 2. Roles & modes

| Role | Route prefix | What they do |
|---|---|---|
| **TENANT_CONSUMER** | `/settings/language` | See current locale, change it, see RTL/LTR preview |
| **TENANT_OPS** (localisation manager) | `/admin/localisation/` | See coverage per surface, commission translation jobs, review quality |
| **TENANT_OPS** (translator) | `/admin/localisation/jobs/` | Pick up jobs, translate, submit for review |
| **PLATFORM_OPS** | `/admin/engine/localisation/` | Cross-tenant coverage metrics, auto-translation fallback policy, translator pool mgmt |

**Modes:**
- **LTR locale** (en, es, fr, de, zh, ja, ko) vs **RTL locale** (ar, he, fa, ur): UI mirrors — text direction, navigation position, icons that imply direction flip.
- **First-time locale switch:** show a confirm preview before committing (the whole app mirrors — can be disorienting).
- **Returning:** change locale silently with a toast.
- **Partial translation:** if the user's locale has only 70% coverage, surfaces with no translation fall back to the tenant's default locale with a subtle *"translated from en"* label.
- **Machine-translated mode:** if a string has only MT (machine translation), render it with a subtle indicator (🤖) and link to "improve this translation" for opted-in contributors.

---

## 3. User stories

### Story 3.1 — End user changes their display language *(TENANT_CONSUMER, G7)*

**Screens:** Profile menu → `/settings/language` → confirm RTL modal (if applicable) → page reload → toast.

**Trigger:** user clicks "Language" in the profile menu or settings sidebar.

**Happy path:**
1. `/settings/language` loads. Left rail shows settings tabs (Privacy / Language / etc.).
2. Right pane shows: current language highlighted in a long scrollable list; search at the top ("Search 40 languages"); flag / native-name / English-name per row.
3. User searches "he" → Hebrew appears. Clicks it.
4. **Preview panel** on the right: *"Hebrew is right-to-left — here's how things will look"* + a small animated preview of the sidebar flipping and text mirroring.
5. Button **Apply Hebrew** (primary); **Cancel** below.
6. On apply: page reloads; everything mirrors; toast top-right: *"השפה שונתה לעברית"* with an **Undo** link (10s window).

**UI elements:**
- Language list with search; group by region (Europe / Asia / Middle East / Americas / Africa / Oceania).
- Each row: flag emoji / ISO code / Native name ("עברית") / English name ("Hebrew") / coverage bar ("87% translated").
- Coverage bar colours: 90%+ green, 70-90% amber, <70% red.
- RTL preview panel triggers only when switching from LTR → RTL or vice versa.
- **Undo** toast: 10 seconds; click → revert + toast *"Back to {previous}"*.

### Story 3.2 — End user sees partial translation fallback *(TENANT_CONSUMER)*

**Trigger:** user in Hebrew (87% coverage) navigates to a new surface that's only 40% translated.

**Happy path:**
1. Page renders. Untranslated strings show in the tenant's default language (usually English) inline.
2. Small banner top: *"חלק מהטקסט כאן עדיין באנגלית — עוזרים בתרגום?"* (*"Some text here is still in English — help translate?"*) with **Contribute** link.
3. Clicking **Contribute** opens a slide-in panel showing the untranslated strings with the source text on the left and an empty translation input on the right. User can suggest translations that queue for review by the tenant's localisation manager.

**UI elements:**
- Fallback strings rendered inline (no visual distinction except language itself). No italicisation or brackets.
- Banner appears at most once per session per surface (respects dismissal).
- Contribution panel auto-fills machine-translation suggestions the user can accept / edit / reject.

### Story 3.3 — Localisation manager reviews translation coverage *(TENANT_OPS, G6)*

**Screens:** `/admin/localisation/` dashboard.

**Happy path:**
1. Dashboard loads with four metric tiles: *Languages live* (8) · *Average coverage* (73%) · *Pending review* (142 strings) · *Machine-translated* (1,240 strings).
2. **Coverage matrix** (main widget): rows = surfaces (Home / Events / Marketplace / Settings / Emails / Push / Blog / SMS), columns = locales. Cells: coverage % with colour (green 90+, amber 70-90, red <70).
3. Click a cell → side panel shows the specific untranslated or MT-only strings for that surface × locale pair.
4. **Commission translation** button → wizard: pick surface(s), pick locale(s), pick translator (in-house / vendor / community), pick deadline, confirm cost.
5. Job appears in "Active jobs" card list with state (Queued / In progress / In review / Completed).

**UI elements:**
- Matrix with colour + numeric + cell-click-to-detail.
- Side panel: list of strings with source + current translation (if any) + edit inline.
- Job cards: translator avatar, deadline, progress (e.g., "42 of 128 strings"), state badge.

### Story 3.4 — Translator picks up a job and translates *(TENANT_OPS translator, specialised workspace)*

**Screens:** `/admin/localisation/jobs/` → job detail → translate workspace.

**Happy path:**
1. Jobs list (G3 cards): available jobs (filter: my-queue / team-queue / all); each card shows source lang, target lang, word count, deadline, pay rate if applicable.
2. Translator clicks **Claim** on a job → job moves to "In progress"; redirect to translate workspace.
3. Translate workspace: three-pane.
    - Left: source string list (en) with surrounding context (e.g., *"Button label on event creation page"*, screenshot thumbnail).
    - Centre: translation input for each string — pre-filled with machine translation, editable.
    - Right: glossary (pinned terms + tenant-specific terminology), translation memory matches (similar strings already translated), quality hints (length warnings, placeholder checks).
4. Translator types; autosave per string.
5. Keyboard shortcuts: Ctrl+Enter to confirm + next; Ctrl+K to search glossary.
6. Progress bar at the top ("42 of 128 done"). Finish → **Submit for review**.

**UI elements:**
- Three-pane with adjustable column widths.
- Every string shows context screenshot + plural forms + variable placeholders.
- Placeholder safety: if translator removes `{count}` from the translation, inline error.
- Machine-translation suggestion pre-filled; translator visibly edits it.
- Glossary: pin + enforce (tenant-specific terms like product name, feature names must not be translated).

### Story 3.5 — Reviewer approves translations *(TENANT_OPS localisation manager, G2-style review)*

**Trigger:** a job enters "In review" state.

**Happy path:**
1. Reviewer opens the job → same three-pane workspace with an added "Review" column on the right showing each translation's status (Pending / Approved / Needs edit).
2. Per string: **Approve** (green checkmark) / **Request change** (textbox for comment) / **Reject**.
3. Batch: **Approve all remaining** for trivial jobs.
4. On full approval, translations go live (with cache invalidation). Reviewer gets a summary.

### Story 3.6 — User contributes a community translation *(TENANT_CONSUMER → translation queue)*

**Trigger:** user clicks **Contribute** on the fallback banner (§3.2).

**Happy path:**
1. Slide-in panel lists untranslated strings on current surface.
2. User types suggestions; on submit, each suggestion queues as a "community suggestion" in the translator workspace.
3. User sees *"Thanks — your suggestions are in the queue."*

### Story 3.7 — Platform admin watches cross-tenant coverage *(PLATFORM_OPS, G6)*

**Screens:** `/admin/engine/localisation/`.

**Happy path:**
1. Dashboard: global metrics (total languages supported, total strings in system, global coverage, total translators), heat map (tenants × languages), trend chart (coverage over time).
2. Alerts section: tenants whose coverage dropped below threshold in the last 7 days.

---

## 4. Screen structure & UI elements

### 4.1 `/settings/language` (G7 settings tab)

**Layout:** settings-tabs left rail + right pane with searchable language list + preview panel for RTL.

**Language list item:**
```
[flag]  [Native name]      [English name]     [coverage bar]
        עברית               Hebrew              ▓▓▓▓▓▓▓░░░ 87%
```

**States:**
- Empty search: *"No match — try a different name or ISO code."*
- Loading: skeleton rows.
- Locale apply failure: inline banner *"Couldn't switch — try again"* + **Retry**.

### 4.2 `/admin/localisation/` (TENANT_OPS dashboard, G6)

**Layout:**
- Metric tiles (top row).
- Coverage matrix (main).
- Active jobs card list (below).
- Recent approvals (right rail).

### 4.3 `/admin/localisation/jobs/` and translate workspace

Three-pane translate workspace; string-level autosave; inline placeholder safety; glossary enforcement; keyboard shortcuts.

### 4.4 `/admin/engine/localisation/` (PLATFORM_OPS dashboard, G6)

Metric tiles, heat map, trend chart, alerts list.

---

## 5. Edge cases

| Case | Expected behaviour |
|---|---|
| User picks a locale that isn't live for this tenant yet | Confirm modal: *"Arabic isn't fully supported yet (45% covered) — switch anyway and help translate?"* with **Switch and contribute** / **Pick a more complete locale** / **Cancel**. |
| User in RTL locale lands on a page with embedded LTR content (code blocks, URLs) | LTR content in embedded blocks stays LTR (code, URLs, numbers). Directional isolation via Unicode `LRM`/`RLM` markers. |
| Translator removes a `{variable}` placeholder | Inline error on that string: *"This translation is missing `{userName}` — add it back so the app fills in the right name."* + quick-insert link. |
| Translator translates a protected glossary term | Warning: *"`XIIGen` shouldn't be translated — it's a brand name."* with **Keep as-is** button. |
| Two translators submit overlapping work on the same string | First-submitted-wins for auto-acceptance; second gets *"Already translated — your version was saved as an alternative."* |
| Tenant disables community contributions | Fallback banner on `/settings/language` just says *"Some text is still in English — we're working on it."* No contribute link. |
| Reviewer approves translations but cache doesn't invalidate | Top-bar banner on the dashboard: *"Some of your approved translations may take up to 5 minutes to appear for users."* |
| User switches locale mid-flow (e.g., during checkout) | Confirm modal: *"Switching language now will reload the page — your current progress is saved."* with **Switch and continue** / **Cancel**. |
| Pluralisation rule mismatch (English has 2 forms, Russian has 4) | Translator UI shows all 4 required forms with examples; can't submit until all filled. |
| Variable formatting (date, currency, number) locale-specific | Automatic server-side formatting based on locale; translator doesn't need to think about it, but can override per-string if needed. |

---

## 6. Problematic states

| State | What the user sees |
|---|---|
| **Unauthenticated** on `/settings/language` | Redirect to `/login?return=/settings/language`. |
| **Permission denied** (TENANT_CONSUMER on `/admin/localisation/`) | `/404` friendly. |
| **Session expired** mid-switch | Toast: *"Signed out — sign in again to apply."* Language change not persisted. |
| **Network offline on language change** | Inline banner: *"Can't switch right now — we'll apply when you're back online."* Queue change, apply on reconnect. |
| **Server 5xx on locale-bundle load** | Fall back to previous locale's cached bundle; top banner: *"Couldn't load Hebrew bundle — showing previous language."* with **Retry**. |
| **Locale bundle corrupt** | Fall back to English (or tenant default); log error to platform admin; no crash. |
| **Translation job fails to submit** | Translator workspace: top banner *"Submit failed — retrying"*; auto-retry with exponential backoff; translations never lost locally. |
| **Machine-translation provider down** | Translator workspace: MT pre-fill column shows *"MT unavailable — enter manually"*; job still workable. |
| **Empty jobs queue** (translator) | Friendly empty state: *"No jobs available right now — check back later or subscribe to job alerts."* |
| **Empty contributions** (from user) | Slide-in panel shows encouraging copy, not raw CRUD table. |
| **RTL preview broken** (browser doesn't support `dir` properly) | Show static screenshot of RTL layout instead of live preview. |
| **Stale coverage** (dashboard open for 30min while jobs completed) | Live update via polling; badge *"updated 2s ago"*. |
| **Conflict** (two localisation managers commissioning same surface simultaneously) | *"Anna is already commissioning translation for this surface — coordinate with her before proceeding."* |
| **Danger-zone: delete a locale with in-progress jobs** | Triple confirm: *"Removing Spanish will archive 3 active jobs and stop rendering Spanish for 1,247 users. Continue?"* |

---

## 7. Visual direction

**Grammar:** G7 settings tabs (user), G6 dashboard (admin), G3 card list (jobs), G2-ish review workspace.

**Feel (3 words):** *Respectful · Inclusive · Precise*. Translation deserves care; this isn't a drop-down-buried afterthought.

**Domain vocabulary:** language, locale, translation, translator, reviewer, glossary, coverage, fallback, RTL, contribute. Never "locale bundle", "string catalog", "i18n key", "placeholder variable" in user-facing copy.

**Colour world:**
- Neutral, multicultural-safe palette (avoid red-and-green-only to help colour-blind users)
- Coverage bars: green (≥90%) / amber (70-90) / red (<70) — always paired with numeric %
- Per-locale: no flag-only reliance (flags don't = language; Hebrew ≠ Israel flag for all speakers; use native name + ISO code as primary identity)

**Signature element:** the **live RTL preview** — the miniature UI that flips direction in the preview panel. A small piece of choreography that makes a jarring change feel considered.

**Anti-references:**
- Gmail's buried language setting (hard to find)
- Facebook's locale switcher that requires relogin
- Apps that only show flags (assumes users know flags = language, and many don't)

**Anti-patterns:**
- Flag-only locale identification (offensive and often incorrect)
- Auto-detecting locale without asking (can be wrong; always let the user confirm)
- Hiding locale changes behind 3 levels of menus
- Showing coverage only as a number without a bar (much harder to compare)
- Engineering terminology ("bundle", "key", "catalog") in user copy

---

## 8. Acceptance criteria

- [ ] `/settings/language` renders for any TENANT_CONSUMER; redirect anonymous.
- [ ] Language list supports 40+ languages, searchable by native or English name or ISO code.
- [ ] Coverage bar accompanies every language with colour + numeric %.
- [ ] Switching to RTL locale shows the preview panel + confirm modal; apply triggers page reload + mirrored layout.
- [ ] Undo toast works within 10s window.
- [ ] Partial translation renders fallback inline with "Some text is still in English" banner (dismissible, remembers dismissal).
- [ ] Community contribute flow opens slide-in, queues suggestions, thanks the user.
- [ ] Localisation manager dashboard renders metric tiles + coverage matrix + job list.
- [ ] Coverage matrix cells are colour + numeric + click-to-detail.
- [ ] Translate workspace three-pane with context screenshots, glossary enforcement, placeholder safety.
- [ ] Keyboard shortcuts work (Ctrl+Enter advance, Ctrl+K glossary).
- [ ] Reviewer workspace with approve / request change / reject per string, plus batch approve.
- [ ] Machine-translation provider integrates; falls back gracefully if provider down.
- [ ] All 14 problematic states (§6) have the documented treatment.
- [ ] Zero engineering terminology (bundle, key, catalog) in user-facing copy.
- [ ] Plural rules per locale enforced; translator can't submit with missing plural forms.
- [ ] Directional isolation of LTR content (code, URLs, numbers) in RTL views.
- [ ] WCAG AA contrast in both light and dark modes, both LTR and RTL.
- [ ] No flag-only locale identification anywhere.
