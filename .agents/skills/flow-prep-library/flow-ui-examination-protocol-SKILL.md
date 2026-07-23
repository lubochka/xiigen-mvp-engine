---
name: flow-ui-examination-protocol
version: "1.1.0"
sk_number: SK-542
load_order: 5.3
category: planning
updated: "2026-04-20"
contexts: ["web-session", "claude-code"]
---

# SK-542 Flow UI Examination Protocol — Session orchestrator for screen work

## v1.1.0 changelog (RUN-87, design-skills refresh)

- **Step 0 added (mandatory):** read `/.impeccable.md` design context at
  worktree root before any examination or rebuild.
- **Step 2c added:** run the interface-design **pre-JSX checkpoint** — state
  Intent / Palette / Depth / Surfaces / Typography / Spacing with a *why* for
  each. Connects every technical choice to `.impeccable.md`.
- **Step 3 extended:** add AI-tell classification (design-for-ai Detection
  Checklist) alongside existing classifications.
- **Step 6 extended:** PNG gate now runs the **six mandate checks** from the
  refreshed skills (swap / squint / signature / AI-slop / token /
  non-technical-reviewer) — not just "populated state + no engineering IDs".
- **Absolute bans added:** side-stripe borders, gradient text, emoji-as-icons,
  Inter-without-rationale on new surfaces, provider-keys banner on non-admin.

Trigger for this version: Luba's feedback on RUN-83..86 — the recent FLOW-07
social feed, FLOW-08 event discovery, and FLOW-20 ads rebuilds regressed on
craft vs the earlier FLOW-36..45 bar. Four external skills (ui-ux-pro-max,
impeccable, interface-design, design-for-ai) and eleven critique docs were
re-loaded and their primary-source protocols are now embedded below.

---

## When to invoke

- At session start for any session **examining, repairing, or rebuilding** a flow's React pages
- Before SK-540 (load_order 5.4) and SK-539 (load_order 5.5)
- Whenever a flow's PNGs, page files, or examination record are the subject of work

SK-542 is **conditional**: it fires for screen examination/repair sessions. Sessions
producing only new pages with no examination of existing pages do not need SK-542 — they
go directly to SK-540 at 5.4.

## What this skill does

Loads the root design context and four companion documents, checks for a prior
examination record, routes the session to the correct procedure (SK-540 for
first-time design, SK-541 for audit), enforces one-finding-per-run discipline,
and runs the six mandate checks from the external skills before the PNG gate
closes. It does not perform the examination itself — that is SK-541. It ensures
the session starts with the right context and ends with the right verification.

---

## Step 0 — Read `/.impeccable.md` (mandatory, v1.1.0)

```bash
head -60 .impeccable.md
```

The root `.impeccable.md` states XIIGen's aesthetic direction, brand
personality, three audiences, token vocabulary, signature elements, rejected
defaults, and anti-references. Every subsequent decision traces back to it.

**If this file is absent:** the /impeccable teach protocol has not been run.
Do not proceed to JSX. Run teach mode (or ask Luba to re-supply context) first.

**What to extract before Step 1:**
- Primary audience for this flow (engine / tenant / public).
- Relevant reference platform (the row in `.impeccable.md`'s reference table).
- Relevant token subset (`--ink` / `--paper` for tenant, `--rack` / `--signal-live`
  for engine).
- Which defaults this page must reject (identical card grid? hero metric
  template? centered everything? side-stripe borders?).

This step takes 2 minutes. Skipping it is how RUN-83..86 regressed.

---

## Step 1 — Load companion documents (5 minutes total)

Read in this order:

**1. `docs/screen-examination/REPAIR-GUIDANCE.md`**
Read Part 1 (spec sources), Part 3 (decision tree), Part 4 (build standard), Part 8
(what not to do). Parts 2, 5, 6, 7 are reference — read on demand during Step 3 classification.

**2. `docs/screen-examination/SPEC-LOCATION-MAP.md`**
Read the 6-file table and resolution rule. Bookmark for Step 2.

**3. `docs/screen-examination/MARKET-REFERENCE-CATALOG.md`**
Scan the grammar groupings table. Read the specific section for this flow's grammar type.
The per-state rendering notes answer "what does the empty/populated/error state look like?"
without asking the user.

**4. `planning--business-flows-registry.md`**
Find the row for this flow. Read: grammar, CFI notes, examination record presence, F4 spec
availability.

---

## Step 2 — Read the flow's spec files

Using `docs/screen-examination/SPEC-LOCATION-MAP.md` as the read order:

```bash
# F1 — user intent (verbatim)
grep -A 5 "user_intent" docs/sessions/FLOW-XX/FLOW-XX-STEP-1-INVARIANTS.md

# F2 — process + state list
head -60 docs/sessions/FLOW-XX/UI-REFLECTION-STATE.md

# F3 — roles (batch from planning--business-flows-registry.md)
grep -A 25 "FLOW-XX\|{slug}" docs/design-reviews/ROLE-ANALYSIS-BATCH-NN.md 2>/dev/null | head -25

# Examination record (read before F4-F6 — this is ground truth where present)
cat docs/screen-examination/{slug}-examination.md 2>/dev/null | head -60

# F6 — reconciliation (check verdict before reading F4/F5)
grep "Verdict\|verdict\|DEMONSTRABLY" \
  docs/sessions/FLOW-XX/FLOW-XX-RECONCILIATION-STATE.md 2>/dev/null | head -5
```

**F6 resolution rule:** If verdict = DEMONSTRABLY_WRONG, do not use existing components as
the baseline. Base the UI on F1 + F2 + F3 + F4 instead.

**CFI-12 halt (FLOW-04, FLOW-09, FLOW-34):** if this flow has a CFI-12 flag in the registry,
halt and request spec alignment from Luba before any UI work. F1 contradicts slug and pages.

### Step 2b — Declare WHO / VERB / GRAMMAR (from spec, not inference)

Before any JSX, declare in the session log:

```
WHO:     [specific role + context sentence — from F3 role-analysis]
VERB:    [the one action they are here to take — from F1 user_intent]
GRAMMAR: [PROGRESS_STRIP | VERDICT_GRID | CARD_LIST | TOPOLOGY_CANVAS | KIOSK]
```

If any of the three cannot be answered from F1 + F3: the spec has not been
read. Do not proceed. Read the sources again until all three are clear.

### Step 2c — Pre-JSX checkpoint (new v1.1.0, from interface-design skill)

Before writing any JSX, state — with a *why* for each choice, referencing
`.impeccable.md`:

```
Intent:     [who is this human, what must they do, how should it feel]
Palette:    [which tokens from .impeccable.md apply — and why these fit
             this audience (engine / tenant / public)]
Depth:      [borders-only / subtle-shadows / layered / surface-tint —
             chosen ONE strategy, justified by this page's density]
Surfaces:   [which elevation steps this page uses (paper → paper-elevated?
             rack → rack-elevated?) — and why]
Typography: [which size steps, which weights — referencing the scale from
             .impeccable.md, not Tailwind defaults]
Spacing:    [base unit: 4px. Scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64]
Signature:  [how this page incorporates XIIGen's signature — budget strip
             if the page has a running process, state counter bar if it
             has monitoring content, or N/A with reason]
Rejects:    [which 2-3 defaults this page specifically rejects — taken
             from .impeccable.md "Defaults rejected" list]
```

If you cannot answer with specifics, stop and read `.impeccable.md` again.

---

## Step 3 — Classify the work

From the companion documents and spec reads, classify the session's primary finding:

| Classification | Severity | What to do |
|---------------|----------|-----------|
| NEEDS_PURPOSE_BUILT_UI | P0 | Throw out CRUD table. Build new page using spec + states + grammar reference. |
| NEEDS_ERROR_HANDLING | P0 | Add specific error message + retry action. Never "Failed to fetch". |
| NEEDS_EMPTY_STATE | P1 | Add empty state with domain-appropriate explanation + CTA. |
| NEEDS_LABEL_SANITISATION | P1 | Replace all T-numbers/CF-numbers/task IDs with plain language. |
| NEEDS_ROLE_BRANCH | P1 | Each declared role needs its own view scoped to that role's task. |
| NEEDS_SIGNATURE (new v1.1.0) | P1 | Operational screen missing budget strip and/or state counter bar. Add the signature element before shipping. |
| NEEDS_DOMINANCE (new v1.1.0) | P1 | Action-required items (FAILED, EXPIRED, REJECTED) have the same visual weight as resolved items. Promote state hierarchy. |
| AI_SLOP_DEFAULT (new v1.1.0) | P1 | Page matches 3+ tells from `ai-tells.md` — identical card grid, hero metric template, emoji-as-icons, centered everything, cyan-on-dark, side-stripe borders, bounce easing, sparklines-as-decoration. Rebuild with varied presentation. |
| CFI-05 PAGE_REWRITE | P0 | Page wrapper defaults to AdminCrudPanel despite purpose-built component existing. Apply FLOW-45 RUN-52 template. |
| PASSES | — | Capture PNG evidence. Add inventory row. Move on. |

**CFI-05 Page rewrite template (from FLOW-45 RUN-52):**

```tsx
// Pattern: PlatformOpsPage wrapping purpose-built screen
// ?mock=<state-key>  → BusinessStateCard for each canonical state
// no ?mock           → PlatformOpsPage wrapping the purpose-built screen
//                      with populated seed data (6–10 records)
```

Apply this pattern to:
- FLOW-36 → `FeatureMatrixScreen` (G3 CARD_LIST)
- FLOW-37 → `StackPortingScreen` (G2 VERDICT_GRID)
- FLOW-38 → `RagQualityScreen` (G6 DASHBOARD)
- FLOW-39 → `OssCurriculumScreen` (G1 PROGRESS_STRIP)
- FLOW-40 → `ClientPushScreen` (G3 CARD_LIST)

---

## Step 4 — Route to the correct skill

| Work type | Next skill |
|-----------|-----------|
| Designing new page for first time (no `.impeccable.md`) | SK-540 (design context) → SK-539 §1 (compliance) |
| Auditing or repairing existing page | SK-541 (screen craft audit) → REPAIR-GUIDANCE Part 2 |
| Verifying after repair | SK-541 Layer 4 grammar check → Phase 7 → SK-541 full audit |
| Capturing PNG evidence | Playwright spec with `?mock=<state-key>` param → PNG-INVENTORY.md row |

**Routing logic:**

```bash
# Does root .impeccable.md exist? (new v1.1.0 — this is now the primary gate)
head -3 .impeccable.md

# If absent → run /impeccable teach first
# If present → proceed to SK-541 for audit or to implementation
```

---

## Step 5 — One-finding-per-run discipline

Per REPAIR-GUIDANCE.md Part 8: fix one finding per run. This prevents compounding
regressions and keeps each PNG cleanly attributable to one change.

Write the finding in the session record **before touching any code**:

```
Finding:        {classification} for {slug} / {PageName}
Source evidence: {spec file + quote, or examination record + primary finding}
Fix:            {one specific code change}
PNG gate:       populated state for {role} using ?mock={state-key}
Mandate checks: swap / squint / signature / ai-slop / token / reviewer
```

Do not fix more than one finding per run. After the single fix is committed and the PNG
gate passes, close the run and start a new one for the next finding.

---

## Step 6 — PNG gate + six mandate checks (extended v1.1.0)

After the fix is applied:

```bash
# Run Playwright spec with populated mock state
npx playwright test client/e2e/{slug}.spec.ts

# Verify PNG shows populated state (not empty, not error)
ls docs/e2e-snapshots/{slug}/*.png
```

### PNG gate basics (unchanged from v1.0.0)

1. A non-technical reviewer can read the screen and state what the flow does
2. Primary action matches what the spec says the user is here to do
3. No engineering identifiers visible (T-numbers, CF-numbers, API paths, spec file names)
4. At least one non-default state shown (use `?mock=` param — not the default empty render)

### The six mandate checks (new v1.1.0)

Run visually on the PNG before closing the run:

**(1) The swap test** — if you swapped the typeface for a different one,
would anyone notice? If you swapped the layout for a standard admin-panel
template, would it feel different? Places where swap wouldn't matter are
places you defaulted. Rebuild those.

**(2) The squint test** — blur your eyes. Can you still perceive hierarchy?
Is the action-required item dominant? Is anything jumping out harshly?
Borders should not be the first thing you see.

**(3) The signature test** — can you point to where XIIGen's signature
appears on this page? The budget strip on running nodes? The state counter
bar at the top of monitoring screens? The domain-token naming? If the
answer is "the overall feel" — it does not exist.

**(4) The AI slop test** — if I told someone AI made this, would they
believe me immediately? Count tells from `ai-tells.md`:
  - Inter / Roboto / Open Sans / system-ui as primary font
  - Cyan-on-dark background or purple-to-blue gradient
  - Identical card grid with rounded corners, same padding, repeated 6×
  - Hero metric template (big number + small label + supporting stats)
  - Everything centered, no asymmetry
  - Same spacing everywhere
  - Side-stripe border > 1px on cards / list items / callouts
  - Gradient text (`background-clip: text` + gradient background)
  - Glassmorphism used decoratively
  - Emoji as action icons (♥ 💬 ↻ → etc. inside buttons)
  - Sparklines as decoration conveying no meaning
  - Bounce / elastic easing on motion

  0–2 tells = PASS · 3–5 = CONCERN · 6+ = BLOCK (rebuild).

**(5) The token test** — read the CSS class / variable usage of this page.
Does it reference XIIGen tokens (`--ink`, `--signal-live`, `--paper-elevated`,
`--budget-amber`) or Tailwind-default utilities (`text-gray-500`, `bg-white`,
`border-blue-600`)? During the current Tailwind transition period, tenant
pages may still use Tailwind utilities — but operator surfaces and new
signature components must use token-mapped classes.

**(6) The non-technical-reviewer test** — can a person who knows nothing
about XIIGen architecture look at this PNG and answer YES to all three:
  1. I understand what this feature does.
  2. I can see what I should do next.
  3. Nothing on this screen looks like it was left there by a developer.

If any answer is NO, the screen has not passed. Iterate before committing.

---

## Absolute bans (from impeccable skill — never ship)

Match-and-refuse: if you find yourself about to write any of these, stop
and rewrite the element with a different structure entirely.

1. **Side-stripe borders** — `border-left:` or `border-right:` greater than
   1px on cards / list items / callouts / alerts, regardless of whether
   the color is hard-coded or comes from a variable. This is the single
   most overused "design touch" in admin and dashboard UIs. Use full
   borders, background tints, leading numbers/icons, or no indicator.

2. **Gradient text** — `background-clip: text` (or `-webkit-background-clip: text`)
   combined with any gradient background. Decorative rather than meaningful.
   Solid color for text; weight for emphasis.

3. **Emoji as action icons** — ♥ 💬 ↻ → 📧 🔔 📝 etc. inside buttons or
   card action rows. They break alignment, cannot be styled consistently,
   and signal "no icon decision was made". Use Lucide / Heroicons, or text-only.

4. **Inter / Roboto / Open Sans / system-ui** as primary body font on a
   new surface *without* a rationale in `.impeccable.md`. (Existing
   Tailwind surfaces keep Inter for now; migration tracked as a separate
   governance task.)

5. **Provider-keys engineering banner** ("Missing provider keys: openai,
   gemini. DPO triples will be MONO_MODEL_CALIBRATION") visible to any
   role except `platform-admin`. Gate with:
   `{role === 'platform-admin' && <ProviderKeysBanner />}`.

6. **Native `<select>` and `<input type="date">`** for styled UI. They
   render OS-native controls that cannot be styled. Build custom
   trigger + positioned dropdown components.

7. **Generic Name / Status / Notes / Actions CRUD table backed by
   /api/dynamic/xiigen-** on a TENANT_CONSUMER or PUBLIC page. This is
   development scaffolding. It is not a grammar. UX-30 BLOCK.

---

## Integration with SK-540 and SK-541

SK-542 is the **session orchestrator**. It does not replace SK-540 or SK-541.

```
SK-542 (5.3) — loads .impeccable.md + 4 companion docs, runs Step 2c
               pre-JSX checkpoint, classifies work, routes
    ↓
SK-540 (5.4) — per-flow design context (if per-flow .impeccable.md absent
               under docs/design-context/{slug}/)
    ↓
SK-539 (5.5) — compliance gate (Section 0 + role questions + UX-30 grammar)
    ↓
[implementation]
    ↓
SK-541 (Phase 7 Step 5) — four-layer PNG audit + six mandate checks from Step 6
    ↓
FC-18 Audit Trail
```

The root `/.impeccable.md` is the source of truth for brand / aesthetic /
token vocabulary. Per-flow `docs/design-context/{slug}/.impeccable.md`
files, if they exist, inherit from the root and add flow-specific details.
They never contradict the root.

---

## Common regressions this protocol prevents

These are the failure modes Luba's RUN-83..86 feedback surfaced. They
happen when sessions skip Step 0 / Step 2c / Step 6 mandate checks:

- **Emoji-as-icons on a card action row** (FLOW-07 RUN-86 SocialFeedPage:
  ♥ 💬 ↻ → used for Like / Comment / Repost / Share). AI slop tell #10.
- **Identical card grid with generic styling** on a tenant page where the
  reference platform has a recognised card shape (FLOW-08 RUN-84
  EventDiscoveryPage seed cards vs. Etsy's price-prominent listing card).
- **Hero metric template** on a dashboard where metric-in-context would
  serve the decision better (FLOW-20 RUN-79 CampaignDashboard's 4 metric
  tiles above the campaign cards).
- **No signature element** on an operational page that monitors a running
  process (applies across FLOW-11 / 14 / 19 / 26 / 29 / 33 / 35 / 45 /
  47 — state counter bar + budget strip should be visible).

A Step 0 read + Step 2c pre-JSX checkpoint + Step 6 six mandate checks
would have caught each regression before PNG capture.
