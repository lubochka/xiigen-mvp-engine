# MARKET REFERENCE CATALOG — per-flow real-world platforms + per-state rendering

**Purpose.** For every flow in XIIGen, name the 1–3 dominant real-world
platforms whose UI conventions govern the visual grammar for that flow, then
describe how those platforms render each business state (empty / loading /
populated / error / success) so that Claude Code can make design decisions
**without asking the user** what "good" looks like in a familiar domain.

This file is **Source 5** in the prior 5-source model and the fallback
reference in the 6-file model. It is used when FILES 1–4 are silent on a
specific UI pattern (spacing, card layout, button hierarchy, empty-state
copy tone).

**Hard rule (per Luba, 2026-04-18):** there is almost no module in XIIGen
that is NOT a well-known category. Claude Code must not ask "what should
this look like?" when the answer is "like Stripe Billing" or "like n8n."
Use this catalog; if the catalog is silent, name the closest reference and
justify in one line.

---

## Companion documents

- `REPAIR-GUIDANCE.md` — the 8-part governance doc (Part 5 has the seed table)
- `SPEC-LOCATION-MAP.md` — file-level spec map
- `SPEC-LOCATION-INDEX.md` — per-flow file inventory
- `PNG-INVENTORY.md` — per-PNG verdicts, cites this catalog in the "Ref platform" column

---

## Grammar groupings (5 canonical + 2 compound, 1 non-grammar)

Every XIIGen flow that renders in the XIIGen client lands on one of five
canonical UI grammars (or a compound of two). Four flows (FLOW-41..44) have
no XIIGen UI at all — they are excluded.

| Grammar | Purpose | Flows | Catalog section |
|---------|---------|-------|-----------------|
| **G1 — Progress Strip** | Lifecycle phases with status chips + log output | FLOW-00, FLOW-11, FLOW-14, FLOW-19, FLOW-33, FLOW-45, FLOW-47 | §1 |
| **G2 — Verdict Grid** | Item × reviewer matrix with APPROVED/REJECTED/NEEDS_REVISION per cell | FLOW-24 (mod view), FLOW-25, FLOW-27, FLOW-35, FLOW-37 | §2 |
| **G3 — Card List with State Badge** | List of entities each carrying lifecycle status | FLOW-06, FLOW-07, FLOW-08, FLOW-10, FLOW-12, FLOW-16, FLOW-17, FLOW-20, FLOW-28, FLOW-32, FLOW-36, FLOW-40, FLOW-46 | §3 |
| **G4 — Topology Canvas** | n8n-style nodes+edges with state colour + side panel | FLOW-18, FLOW-26, FLOW-29, FLOW-34 | §4 |
| **G5 — Kiosk / Single Action** | One clear primary action, minimal chrome, often celebratory | FLOW-01, FLOW-02, FLOW-03, FLOW-04, FLOW-05, FLOW-09, FLOW-22 (public), FLOW-24 (report form) | §5 |
| **G6 — Dashboard (compound G3+chart)** | Metrics + trend chart + recent list | FLOW-13, FLOW-20 (admin), FLOW-30, FLOW-31, FLOW-38, FLOW-39 | §6 |
| **G7 — Settings Tabs (compound G3+form)** | Org/tenant/user settings across tabs | FLOW-15, FLOW-21, FLOW-23, FLOW-48 | §7 |
| **— (no UI)** | External vendor-SDK plugin panel | FLOW-41 Canva, FLOW-42 Miro, FLOW-43 Webflow, FLOW-44 Framer | excluded |

---

## §1 — G1 Progress Strip

**Canonical references:** Vercel deploy, Docker Desktop, Render, Railway,
CircleCI step list, GitHub Actions run view.

**Visual skeleton (top to bottom):**
1. Top header: run name / ID + overall status chip + total elapsed time
2. Horizontal strip of phase chips (e.g. `Queued → Cold → Seeding → Indices → Warm`), each with:
   - Phase label
   - Status icon (dot + colour + text: "Complete" / "Running" / "Pending" / "Failed")
   - Elapsed time per phase
3. Expanded detail for the currently-running / last-failed phase (log tail, resource usage)
4. Action row: Retry / Cancel / Inspect logs (role-gated)

**Per-state rendering:**

| State | How reference platforms show it |
|-------|--------------------------------|
| empty | "No deployments yet" card with a single "Deploy" CTA. Vercel: illustration + "Import Project" button. |
| loading | Skeleton strip of 5 grey chips; phase names visible, status hidden until stream connects. |
| populated — in-progress | First N chips green with checkmark + time; current chip animated (spinner ring) with "Running"; remaining chips grey pending. |
| populated — success | All chips green checkmark, total time prominent, artifact URL / preview link. |
| error | Failing chip red with × icon; log tail auto-expanded; "Retry from this step" CTA prominent. |
| success (transient) | Green success banner at top for ~5s, then collapses into "Deployed N min ago". |

**Do not:** use a progress bar (0–100%) — phases are discrete, not continuous.
**Do not:** hide the log tail — lifecycle flows always expose logs by default for admin roles.

---

## §2 — G2 Verdict Grid

**Canonical references:** GitHub PR review (reviewers × files), Linear issue review,
Jira approval board, Gerrit code review, Reddit modqueue (moderator view).

**Visual skeleton:**
1. Left column: list of items pending review (one per row), each with a status badge
2. Main panel: selected item's content preview (top) + reviewer/arbiter grid (bottom)
3. Grid cells show per-reviewer verdict: ✅ APPROVED / ❌ REJECTED / 🟡 NEEDS_REVISION / ⏳ PENDING
4. Right rail: consensus result + action row (Approve / Override / Escalate / Defer)

**Per-state rendering:**

| State | How reference platforms show it |
|-------|--------------------------------|
| empty | "Inbox Zero" state: illustration + "No items awaiting your review" + link to recently closed. |
| loading | Skeleton of 3–5 item rows; content preview area shows shimmer placeholder. |
| populated — reviewing | Selected item highlighted left; grid shows all reviewer cells with clear verdict; consensus computed and labelled. |
| populated — blocked | Item with red NEEDS_REVISION rows; "Reply to reviewer" primary action inline. |
| error | Per-action error inline (e.g. "Couldn't submit verdict — retry" next to the button). Grid never shows engineering error text. |
| success | Approved item moves to "Recently approved" collapsible; toast "Approved by N reviewers". |

**Do not:** display the full arbiter rationale in the grid cell — use a popover or side panel.
**Do not:** use red/green only — every cell also carries an icon + text label (ui-ux-pro-max `color-not-only`).

---

## §3 — G3 Card List with State Badge

**Canonical references:** Stripe Dashboard invoice list, Stripe payment intents,
Shopify orders, LinkedIn job listings, Etsy shop listings, Upwork job board.

**Visual skeleton:**
1. Filter/search bar at top (category, state, date range)
2. Card grid (3-col desktop) or list (mobile)
3. Each card:
   - Primary identifier (name, title) prominent
   - Status badge top-right (`PAID`, `FAILED`, `VOIDED`, `OPEN`, `DRAFT`, etc.)
   - Secondary metadata (amount, date, counterparty)
   - Hover or click → detail panel slides in from right
4. Empty state copy teaches the next step

**Per-state rendering:**

| State | How reference platforms show it |
|-------|--------------------------------|
| empty | Stripe: illustration + "You haven't received any payments yet" + "Create a payment link" primary CTA + "View docs" secondary. Never shows an empty table with zero rows. |
| loading | Skeleton of 6 grey cards with shimmer bars for title/amount/badge. |
| populated | Cards with crisp typography; status badges only use category colour + explicit text; most-recent first. |
| error — list-level | Banner above list: "Couldn't load orders. Retry" with button; cards still show cached data if available. |
| error — item-level | Failed card has red border + "Payment failed — Retry" inline action; does not drop the row. |
| success | Toast for the action that just succeeded; card's badge animates from previous state to new one. |

**Do not:** lead with a `FAILED` or `$0.00` card as the visual anchor (FLOW-12 pre-RUN-49 bug).
**Do not:** show raw database IDs or task-type codes (T226, FT-003) in the card — use the domain label.

---

## §4 — G4 Topology Canvas

**Canonical references:** n8n workflow canvas, Zapier editor, Temporal UI workflow
view, Dagster op graph, LangSmith trace graph, draw.io UML, Retool app canvas.

**Visual skeleton (XIIGen reference implementation: FLOW-29):**
1. Top bar: run selector + status pill + primary action ("Run now" / "Stop" / "Inspect")
2. Main canvas: ReactFlow with
   - Phase groups as dashed translucent background boxes with tinted accent
   - Processing nodes: human-readable label + state icon+text+colour on border + optional budget strip
   - Edges with plain-English data labels ("query embedding", "vector hits", "fused candidates")
3. Right side panel: selected node's detail — description, current state, elapsed, owner, action row
4. Top-right: accessible zoom controls (aria-labelled +/−/Fit + keyboard shortcuts +/=/−/_/0)
5. Collapsible `<details>` path-summary table below canvas (chart #25 A11y fallback for screen readers)

**Per-state rendering:**

| State | How reference platforms show it |
|-------|--------------------------------|
| empty | n8n: blank canvas with dotted grid + "Drop your first node" overlay. XIIGen: "No runs yet" card with "Start a dry run" CTA. |
| loading | Canvas visible with skeleton nodes (grey boxes, no labels); side panel shows shimmer. |
| populated — idle | All nodes grey outline, neutral state. Run button prominent. |
| populated — in-progress | Upstream nodes green (complete), running nodes amber with pulsing ring + elapsed time, downstream nodes grey pending. Edges highlight the active path. |
| populated — failed | Failing node red × + "Retry from this node" inline action; side panel opens to failure detail with stack trace hidden behind "Show technical details" disclosure. |
| error (canvas-level) | "Couldn't load topology — backend may be unreachable. Retry" banner; canvas greyed but last-known nodes preserved. |
| success | Final node green checkmark with "Completed in N seconds"; synthesised result displayed in side panel or dedicated result screen. |

**Signature element (XIIGen-specific):** budget consumption strip embedded
inside the currently-running node — fuel-gauge-on-vehicle pattern. Consumed
time / total budget with threshold colour (`--budget-consumed` → `--budget-critical`).

**Do not:** use pure icons for state — always icon + text + colour (ui-ux-pro-max P1).
**Do not:** expose internal process IDs (`MONO_MODEL_CALIBRATION`, `T621`) as the node label.

---

## §5 — G5 Kiosk / Single Action

**Canonical references:** Airbnb signup, Linear onboarding, Eventbrite checkout
confirmation, Duolingo lesson complete, Typeform one-question-per-screen,
Medium article reader, Substack post.

**Visual skeleton:**
1. Full-viewport single focal point
2. Clear one-line headline ("You're in.", "Complete!", "Thanks for your order.")
3. Secondary supporting content (QR code, receipt, next lesson, social share)
4. Exactly ONE primary action + at most ONE secondary action
5. No sidebar, no nav chrome for public / celebratory variants (AppShell excluded per RUN-49 G3)

**Per-state rendering:**

| State | How reference platforms show it |
|-------|--------------------------------|
| empty (N/A) | Kiosk flows don't have an empty state — they celebrate an event. If there's nothing to celebrate, the user shouldn't see this screen. |
| loading | Full-screen spinner + label "Completing your order..." — never a blank card. |
| populated (the core state) | Celebratory animation (streak counter, confetti, QR), metric reveal, clear next step. |
| error | Full-screen friendly failure: "We couldn't process your payment" + "Try again" + "Contact support" + actual reason in plain language. |
| success | Same as populated — success IS the screen for this grammar. |

**Do not:** show two equal-weight primary CTAs (FLOW-18 pre-RUN-47 bug).
**Do not:** wrap in AppShell with sidebar for anonymous public variants (fixed RUN-49 G3).

---

## §6 — G6 Dashboard (compound)

**Canonical references:** Stripe Dashboard home, QuickBooks home, Vercel project home,
Google Ads dashboard, Mixpanel home, Amplitude home.

**Visual skeleton:**
1. Top row of metric tiles (3–5): headline number + trend delta + sparkline
2. Middle: primary chart (time-series line or bar) + period selector (7d/30d/90d/YTD)
3. Bottom: "Recent activity" card list (G3 grammar embedded)
4. Right rail or top-right: notifications + account / settings

**Per-state rendering:**

| State | Rendering |
|-------|-----------|
| empty | Metric tiles show "–" with "Once you have data, it appears here" helper text + primary CTA to produce data (e.g. "Create your first campaign"). |
| loading | Tile skeletons, chart skeleton with no axis. |
| populated | Numbers crisp; sparklines alongside each tile; chart animated on entry. |
| error | Per-widget inline error ("Couldn't load revenue") + retry; don't fail the whole dashboard on one widget. |
| success | Not a dashboard state — toasts for underlying actions appear over the dashboard. |

---

## §7 — G7 Settings Tabs (compound)

**Canonical references:** Stripe account settings, Linear settings, Vercel team settings,
GitHub repo settings, Notion workspace settings.

**Visual skeleton:**
1. Left rail: vertical tab list (General / Members / Billing / Integrations / Advanced)
2. Main column: section header + description + form groups
3. Destructive actions isolated in a red-bordered "Danger zone" at the bottom
4. Save button sticky at the bottom of the viewport when changes are pending

**Per-state rendering:**

| State | Rendering |
|-------|-----------|
| empty | Most settings are never "empty" — they have defaults. If a sub-section is ("No integrations installed"), show illustration + "Install first integration" CTA. |
| loading | Form skeleton with greyed labels + disabled inputs. |
| populated | Standard form; each row `label → control → helper-text` three-column; validation inline per field. |
| error — field | Red outline on the field + message below; other fields still editable. |
| error — save | Toast "Couldn't save changes" + retry; form state preserved. |
| success — save | Toast "Changes saved", sticky bar dismisses. |

---

## Per-flow assignment (the full 48)

Every flow has a row here. The Reference column is what governs the visual
grammar; the Notes column calls out the specific pattern to borrow.

| Flow | Slug | Grammar | Reference platform(s) | Key pattern to borrow | Hard rules |
|------|------|---------|-----------------------|----------------------|------------|
| FLOW-00 | bundle-activation | G1 | Vercel deploy, Railway | Phase chips + log tail | Retry from failed step |
| FLOW-01 | user-registration | G5 | Airbnb signup, Linear onboarding | SSO buttons stacked above email form; single page; progress indicator after verify; personalised dashboard on first load — never empty state | No engineering jargon; no sidebar for anonymous |
| FLOW-02 | profile-enrichment | G5 → multi-step | Typeform, LinkedIn setup | Step indicator; one question group per screen; skip secondary; progress bar | Never one giant form |
| FLOW-03 | event-management | G5 wizard | Eventbrite create event, Luma | Details → Tickets → Promotion → Publish; right panel live preview; AI match score on publish | Save draft explicitly |
| FLOW-04 | event-attendance | G3 | Eventbrite attendee list, Airbnb reservations | Capacity bar; attendee avatars; role badge; check-in action | QR scan flow |
| FLOW-05 | completion-gamification | G5 celebratory | Duolingo, Khan Academy | Full-screen completion; animated badge/XP reveal; streak counter; next lesson dominant | Celebration is the screen |
| FLOW-06 | user-groups-communities | G3 | Facebook Groups, Discord server list | Group cards with member count + last active; join/request button; filter by category | Public/private badge visible |
| FLOW-07 | friend-request-social-feed | G3 | Twitter/X, LinkedIn feed | Card per post; author avatar+name+timestamp top-left; like/comment/share row bottom; infinite scroll | Author sees edit; reader sees share/report |
| FLOW-08 | marketplace | G3 | Etsy, Shopify storefront | Product card grid; price top-right; rating stars; filters left sidebar | "Post" CTA top-right for sellers |
| FLOW-09 | transactional-event-participation | G5 checkout → G5 confirmation | Eventbrite checkout, Airbnb booking | Capacity bar; ticket type selector; order summary sidebar; QR on confirmation | Single Pay button |
| FLOW-10 | reviews-reputation | G3 + inline form | Yelp, Google Maps reviews | Review card with rating + body + author; "Write a review" opens modal with star picker | Can't review own listings |
| FLOW-11 | schema-registry-dag | G1 + G4 hybrid | Confluent Schema Registry, Apollo Studio | DAG of schema nodes; version chips; compatibility verdict per edge | Engine-internal; admin-only |
| FLOW-12 | subscription-billing | G3 | Stripe billing portal, Paddle | Current plan card top; invoice list with PAID/FAILED/VOIDED badges; Retry on FAILED; Download PDF | FAILED never dominant anchor |
| FLOW-13 | data-warehouse-analytics | G6 | QuickBooks, Mixpanel, Looker | Metric tiles + line chart + period selector + recent transactions | Period selector defaults 30d |
| FLOW-14 | etl-data-integration | G1 | Airbyte, Fivetran, Stitch | Pipeline runs list; per-run phase strip; row counts per phase | Re-run with backfill |
| FLOW-15 | saas-multi-tenancy | G7 | Linear Workspaces, Notion Teamspaces | Workspace switcher top-left; settings tabs; member roles table; billing tab | Destructive actions in Danger zone |
| FLOW-16 | marketplace-payments | G5 checkout | Stripe Checkout, Shopify checkout | Left order summary; right payment form; single "Pay $X" button; trust indicators below | No Cart ID field |
| FLOW-17 | freelancer-marketplace | G3 | Upwork, Fiverr | Gig card: title + price range + bids + Place bid CTA; freelancer profile with portfolio + rating | Milestone timeline on active gigs |
| FLOW-18 | visual-flow-engine | G4 | n8n, Zapier, Make, Retool | Three-column: node palette ∥ canvas ∥ assistant/properties; dotted canvas bg; zoom controls; keyboard shortcuts | Exactly one primary CTA |
| FLOW-19 | durable-sagas-compliance | G1 | Temporal UI, Cadence | Saga timeline with compensation branches; status per step | Compensation path visible |
| FLOW-20 | ads-platform | G3 + G6 | Google Ads, Meta Ads Manager | Campaign cards with status badge + budget-consumed bar + CTR chart; bid amount editable inline | Failed-to-fetch not a normal state |
| FLOW-21 | dynamic-forms-workflows | G7 form builder | Typeform, Google Forms, Jotform | Left field palette; centre form preview; right field properties | Drag-drop re-order |
| FLOW-22 | cms-publishing | G5 public → G3 admin | Medium/Substack (public); WordPress admin | Public: zero chrome article, title h1, author+date+read-time; Admin: post list with Draft/Published badges | No sidebar on public reader |
| FLOW-23 | form-builder-templates | G3 template gallery | Typeform template gallery, Webflow templates | Template cards with preview thumb + install count + category + "Use template" CTA | Preview opens modal |
| FLOW-24 | ai-safety-moderation | G5 (report) + G2 (moderate) | Discord AutoMod, Reddit modqueue, Trust & Safety forms | Anonymous report: category tiles + reason textarea + submit. Moderator: report queue preview card + Keep/Remove/Escalate | No sidebar on anonymous |
| FLOW-25 | bfa-cross-flow-governance | G2 | GitHub PR review, Gerrit | Pending rules × flows matrix; per-cell verdict; consensus column; Approve/Override/Escalate | Engine-internal; admin-only |
| FLOW-26 | meta-flow-engine | G4 | n8n meta-workflow view | Topology of flows; state colour per flow node | Engine-internal |
| FLOW-27 | human-interaction-gate | G2 queue | Intercom inbox, Linear triage inbox | Item queue with previews; per-item verdict; SLA timer; escalate action | Engine-internal; admin-only |
| FLOW-28 | blog-cms-modules | G5 (public) + G3 (admin) | Medium, Substack (public); Ghost admin | Public: article reader zero chrome; Admin: post list G3 | No sidebar on public |
| FLOW-29 | adaptive-rag-deep-research | G4 | Perplexity AI, Elicit (researcher); n8n + Temporal UI (admin) | Search input prominent; source cards with citations; synthesised answer numbered refs; budget/time consumed strip | Engine-internal admin topology view |
| FLOW-30 | tenant-lifecycle-manager | G6 + G7 | Stripe Connect dashboard, Vercel teams | Metric tiles (active tenants, churn, MRR) + tenant list with plan chip; settings tabs for platform policies | Engine-internal admin |
| FLOW-31 | design-intelligence-engine | G6 + G4 | LangSmith, W&B dashboards | Metric tiles + topology of design decisions | Engine-internal |
| FLOW-32 | sharable-flows-marketplace | G3 | GitHub Marketplace, npm, VS Code extensions gallery | Flow cards: name + description + install count + version badge + rating + Install button | Search + category filters |
| FLOW-33 | system-initiation-bootstrap | G1 | Vercel deploy, Docker setup, Stripe onboarding | Progress strip: Cold → Seeding → Indices ready → Warm; each step chip + log; expandable | Retry per step |
| FLOW-34 | marketplace-plugin-adapter | G4 + G3 | Zapier app directory, VS Code extension marketplace | Topology of adapters + adapter card grid for configuration | Engine-internal |
| FLOW-35 | meta-arbitration-engine | G2 | GitHub PR review, Linear issue approval | Pending conflicts list; per-conflict arbiter grid (APPROVED/REJECTED/NEEDS_REVISION); consensus + Approve/Override/Escalate | Purpose-built, not CRUD |
| FLOW-36 | feature-registry | G3 | LaunchDarkly, Split.io, Unleash | FT-ID cards: name + port status + source → target arrow + simulator verdict + actions per card | Purpose-built, not CRUD |
| FLOW-37 | design-system-governance / multi-stack porting | G2 + G3 | Flyway migration runner, SonarQube compatibility report, Percy diff matrix | Coupling-dimension matrix (CONCEPT_NEUTRAL / IMPL_VARIES / STACK_COUPLED / INCOMPATIBLE) × 10 dimensions with colour badges; compatibility report per target stack; porting-job progress strip | Engine-internal; **NOT** Figma-style component governance — the flow is about stack coupling for engine self-porting |
| FLOW-38 | rag-quality-feedback | G6 | LangSmith, Humanloop, PromptLayer | Quality score tiles + scored-runs list + feedback widgets | Engine-internal |
| FLOW-39 | oss-curriculum / local-model teaching | G6 (dashboard, not lesson player) | LangSmith curriculum view, W&B experiments, Humanloop training dashboards | Curriculum-tier distribution chart (T1 ROUTING → T5 SCHEDULED); shadow-run dashboard; DPO corpus-size readiness bars | **NOT** Khan Academy; this is DPO corpus / local-model training — admin-only. **CFI-05: route missing.** |
| FLOW-40 | client-push SSE | G3 (connection monitor) | New Relic connection inspector, OneSignal admin dashboard | Active SSE connection table (tenantId, correlationId, state); event delivery log; keepalive rate tiles | Admin-only debug surface — tenant-users have NO UI here. **CFI-05: route missing.** |
| FLOW-41 | canva-adapter | — | — | — | **No XIIGen UI.** Vendor-SDK plugin panel in Canva. Any XIIGen PNG for this flow is invalid. |
| FLOW-42 | miro-adapter | — | — | — | **No XIIGen UI.** Vendor-SDK plugin panel in Miro. Any XIIGen PNG for this flow is invalid. |
| FLOW-43 | webflow-adapter | — | — | — | **No XIIGen UI.** Vendor-SDK plugin panel in Webflow. Any XIIGen PNG for this flow is invalid. |
| FLOW-44 | framer-adapter | — | — | — | **No XIIGen UI.** Vendor-SDK plugin panel in Framer. Any XIIGen PNG for this flow is invalid. |
| FLOW-45 | history-bootstrap | G1 | Flyway migration runner, Liquibase, Elasticsearch index rebuild status | Phase strip: `COLD → SEEDING → ARCH_PATTERNS_INGESTED → PHILOSOPHY_DIGESTED → WARM` + per-phase ingest counts; `PhilosophySummaryRow` shows distilled principles in plain English | **CFI-05: route missing.** Re-run is destructive — confirm dialog required. |
| FLOW-46 | platform-agent | G3 + G6 | Intercom, Zendesk agent console | Agent card list + conversation panel + action history | Engine-internal admin |
| FLOW-47 | module-lifecycle | G1 | npm version history, Docker image tags | Module version timeline with lifecycle phase per version | Engine-internal |
| FLOW-48 | admin-i18n / i18n-translation | G7 + G3 | Crowdin, Lokalise, Phrase | Locale list + translation table per namespace + contributor tabs | Engine-internal |

---

## Platform-level conventions to inherit (always)

Regardless of flow, these conventions apply across the fleet:

**Typography ladder (borrowed from Stripe / Linear / Vercel):**
- Display (h1): 32–40px, −0.02 tracking, weight 600
- Section (h2): 20–24px, weight 600
- Body: 14–15px, 1.5 leading
- Caption / metadata: 12–13px, colour `text-muted`

**Colour discipline (borrowed from Linear / Vercel):**
- Foundation: slate 50 / 100 / 200 / 900 for background ladder
- Exactly one brand accent per flow (not "blue everywhere")
- State colours carry text + icon (ui-ux-pro-max `color-not-only`)
- Never cyan-on-dark (design-for-ai AI-tell #2)

**Density (borrowed from Linear):**
- Dense lists: 32–40px row height
- Cards: 16px padding, 8px between cards
- Forms: 12px row gap, labels above inputs (not placeholder-as-label)

**Empty-state copy tone (borrowed from GitHub / Stripe):**
- First line: what appears here when the user has data
- Second line: teach the next step
- CTA: imperative verb ("Create your first X", not "Click here")

**Loading skeletons (borrowed from Facebook / LinkedIn):**
- Shape-preserving (card skeleton = card silhouette, not generic grey box)
- Shimmer animation at 1.5s cadence
- Never show "Loading..." text alone

---

## When the catalog is silent

If a specific design question falls outside this catalog, the protocol is:

1. Re-read files 1–5 for FLOW-XX — the answer may be in DESIGN-SIMULATION-R1.md.
2. Check if a similar flow (same grammar, adjacent domain) has a row — borrow.
3. Name the closest real-world reference not yet listed and justify in one line.
4. Add the new reference to this catalog so the next Claude session finds it.

**Never** answer a design question with "I'll match the rest of the app." That
is how every flow landed on generic CRUD rows in the first place.

---

## Cross-reference checklist (required for every new inventory row)

When adding a PNG row to `PNG-INVENTORY.md`:

- [ ] "Ref platform" column names a row from this catalog
- [ ] The named grammar matches the flow's grammar group (§1–§7)
- [ ] The "Notes" column, if ❌ contradicts, describes the gap in terms of the reference platform ("no status badge on card" / "grid shows engineering IDs")
- [ ] If the reference for this flow is not yet in this catalog, the row is added before the inventory update ships
