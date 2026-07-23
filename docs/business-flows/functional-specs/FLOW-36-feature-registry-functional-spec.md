# Functional Spec — FLOW-36 Feature Registry

**Grammar:** G3 Card list with state badge
**Primary role tiers:** PLATFORM_OPS (platform admin), PLATFORM_SUPPORT (read-only)
**Current state:** **Half-built** — 7 services running the FT-record store + porting gate. `FeatureMatrixScreen`, `FeatureMatrixRow`, `PortingProhibitedScreen` exist in components dir but the Page wrapper renders the generic `AdminCrudPanel`. 34 existing PNGs.
**Primary unblock:** apply the FLOW-45 `HistoryBootstrapPage` RUN-52 template to `FeatureRegistryPage.tsx` — 5-line page rewrite.

---

## 1. Summary

A platform admin reviews every feature the engine has built — which are engine-internal (never portable to other platforms), which are portable candidates, which have porting decisions in flight, which were deprecated. They accumulate usage signals (tenants using the feature) to spot porting readiness, gate porting decisions through a cost estimate, and record a PortingDecision that drives FLOW-34 plugin adapter work. Today the services run; the screen exists in components; the page wrapper doesn't wire them together.

---

## 2. Roles & modes

| Role | Route | What they do |
|---|---|---|
| **PLATFORM_OPS** (primary) | `/admin/engine/feature-registry/` | Review, classify, approve porting decisions, accumulate signals |
| **PLATFORM_SUPPORT** | Same, read-only | View only |

**Modes:**
- `?mock=<key>` → BusinessStateCard for canonical feature states (testing / design preview).
- No `?mock` → live mode; full `FeatureMatrixScreen` with real FT records.
- Filter modes: by portability, by source flow, by signal count, by decision state.

---

## 3. User stories

### Story 3.1 — Admin reviews the full feature inventory

**Screens:** `/admin/engine/feature-registry/` → feature detail side panel.

**Trigger:** admin opens the registry page.

**Happy path:**
1. Page loads the `FeatureMatrixScreen` with 6-10 populated FT-record seed cards.
2. Card list shows each feature with: human-readable name (not `FT-XXX`), source flow, portability badge, usage signal count, decision status.
3. Admin clicks a card → side panel slides in with the full feature detail: name, source flow link, dependencies, usage-signal history chart, porting decision timeline if any, actions.
4. No action required — viewing is the primary use case most of the time.

**UI elements:**
- Card grid, one card per feature.
- Card shape: `[icon] [feature name, human-readable] [portability badge] [signal count + trend arrow] [decision state if applicable]`.
- Side panel: slide-in, 480px wide, detailed view; doesn't leave the list context.

### Story 3.2 — Admin classifies a feature as portable or engine-internal

**Trigger:** admin clicks a feature marked "Unclassified".

**Happy path:**
1. Side panel opens. Classification card at the top: *"Portability: Unclassified"*.
2. Admin clicks **Classify** → modal: *"Is this feature portable to other platforms (Canva, Figma, etc.) or is it engine-internal (lives only on XIIGen)?"* with **Portable** / **Engine-internal** buttons, plus a text field for rationale.
3. On confirm: classification saved; card updates with the new badge + rationale stored in the decision timeline.

### Story 3.3 — Admin initiates a porting decision for a portable feature

**Trigger:** admin clicks **Initiate porting** on a Portable feature.

**Happy path:**
1. 3-step wizard: (1) *Target platform* — pick Canva / Figma / Miro / Webflow / Framer / Custom; (2) *Cost estimate* — fetched from the estimation service (engineering effort + legal review + adapter registration fees); (3) *Confirm*.
2. On submit: PortingDecision record created with state "Cost estimated"; card updates; timeline adds entry.
3. Porting state evolves: *Cost estimated → Approved → In adapter build → Shipped → Live* (or *Rejected / On hold*).

### Story 3.4 — Admin rejects a porting attempt on a non-portable feature

**Trigger:** admin (or a system attempt) tries to port an Engine-internal feature.

**Happy path:**
1. `PortingProhibitedScreen` component renders as a full-screen explanation: *"This feature is classified Engine-internal — porting is blocked. To reclassify, open the feature detail."*
2. Two CTAs: **Open feature detail** / **Request reclassification**.

### Story 3.5 — Admin accumulates usage signals to decide when a feature is ready to port

**Trigger:** admin views a Portable feature that's not yet in a porting flow.

**Happy path:**
1. Side panel shows usage-signal chart: *Tenants using this feature over time*. Inflection points marked.
2. *Readiness score* widget: composite of signal count, signal growth rate, time since introduction. Scores 0-100.
3. When score ≥ threshold (configurable per tenant policy), the **Initiate porting** button surfaces automatically with a hint *"Ready to port — readiness score 82"*.

---

## 4. Screen structure & UI elements

### 4.1 `/admin/engine/feature-registry/` (page)

**Layout:**
- **Header:** breadcrumb + count banner *"47 features · 12 portable · 8 in porting · 27 engine-internal"*.
- **Filter bar:** portability chip, source-flow dropdown, decision-state chip, signal-count slider.
- **Card grid:** `FeatureMatrixScreen` renders here.

### 4.2 Feature card (`FeatureMatrixRow`)

Layout:
```
┌────────────────────────────────────────────────────────────┐
│ [icon]  Feature name (human-readable)        Active badge   │
│         Source flow • Last updated 3 days ago               │
│         ▓▓▓▓▓░░░░░ Usage signals: 234 (+12%)                │
│         Porting: Cost estimated                             │
└────────────────────────────────────────────────────────────┘
```

### 4.3 Side panel

Detail sections in order: Summary · Classification · Usage signals (chart) · Porting decision timeline · Dependencies · Actions.

### 4.4 `PortingProhibitedScreen` (full-screen when a porting attempt hits an engine-internal feature)

Centred card with icon, explanation, two CTAs.

---

## 5. Edge cases

| Case | Expected behaviour |
|---|---|
| Feature has no usage signals yet | *"Not enough data — signals arrive as tenants use this feature."* with helpful hint on when first signal expected. |
| Admin tries to reclassify a feature mid-porting | Confirm modal: *"3 adapters are in build for this feature — reclassifying will pause their builds. Continue?"* |
| Two admins classify the same feature simultaneously | Last-save-wins with collision notice: *"Anna classified this 3 seconds ago — your change overwrote hers. Review the timeline if unsure."* |
| Feature's source flow is deprecated | Side panel shows *"Source flow is deprecated"* warning with migration target link. |
| Readiness score drops below threshold after porting initiated | Timeline entry: *"Readiness score dropped to 45 — continue or pause?"* with **Continue** / **Pause porting** actions. |
| Engine-internal feature has 100+ tenants using it | That's fine — engine-internal just means it lives on XIIGen; tenants use it via XIIGen. Portability isn't about usage count. |

---

## 6. Problematic states

| State | What the user sees |
|---|---|
| **Unauthenticated** | Redirect `/login?return=/admin/engine/feature-registry/`. |
| **Permission denied** (TENANT_OPS) | `/404`. |
| **Empty registry** (first boot) | Friendly empty state: *"No features registered yet — they'll appear as flows emit FT records."* with link to FLOW-36 docs. |
| **Loading** | Skeleton card grid; no spinner alone. |
| **Server error** | Top banner: *"Can't load registry right now — try again in a minute."* + **Retry**. Cards stay in skeleton. |
| **Single card fails to load details** | That card shows *"Couldn't load — retry"* inline instead of breaking the whole list. |
| **Side panel data stale** | Live polling refreshes; subtle timestamp *"updated 2s ago"*. |
| **Classification fails to save** | Inline error in modal with **Retry**. |
| **Readiness score unavailable** (model down) | Badge shows *"Readiness unavailable"* instead of 0. |
| **Porting blocked by PortingProhibitedScreen** | See Story 3.4 — full-screen explanation, not a red error. |
| **Danger-zone: permanently deprecate a feature** | Triple confirm; warning if tenants still using. |

---

## 7. Visual direction

**Grammar:** G3 Card list with state badge.

**Feel:** *Orderly · Confident · Precise*. This is the platform's inventory dashboard — should feel like a warehouse manifest, not a cosmetic dashboard.

**Reference UIs:** **LaunchDarkly** (feature flags dashboard), **Split.io**, **Unleash** — clean card lists with state badges.

**Colour world:**
- Neutral blue-grey chrome
- Green for "Portable"
- Amber for "Porting in progress"
- Blue for "Engine-internal"
- Red for "Deprecated" / "Prohibited"
- Numeric signal counts in monospace for alignment

**Signature:** the readiness-score widget (0-100 composite) in the side panel — gives admins a clear "yes it's time to port" signal that doesn't require them to read a chart.

**Anti-patterns:**
- Generic admin CRUD table (the current `AdminCrudPanel` default — this whole spec is about replacing it)
- `FT-XXXX` identifiers as the primary card title (use human-readable name)
- State colour without icon (colour-blind accessibility)

---

## 8. Acceptance criteria

- [ ] `FeatureRegistryPage.tsx` wraps `FeatureMatrixScreen` with the FLOW-45 RUN-52 template (`?mock=<key>` fallback + live `PlatformOpsPage`).
- [ ] 6-10 seed FT records populate the live view (engine-internal + portable + porting-in-progress + deprecated).
- [ ] Card title is the human-readable feature name, not the FT-XXX identifier.
- [ ] Portability badge uses icon + text + colour.
- [ ] Side-panel detail opens inline (doesn't leave the list context).
- [ ] Readiness-score widget computes and renders; falls back gracefully if model unavailable.
- [ ] Classification modal supports Portable / Engine-internal with rationale text.
- [ ] `PortingProhibitedScreen` renders as full-screen when porting attempt hits an engine-internal feature.
- [ ] Filter bar (portability + source-flow + decision-state + signal-count) filters live.
- [ ] All 11 problematic states (§6) documented treatment.
- [ ] Zero `FT-XXXX` raw identifiers in visible copy (only in hover tooltips for debugging).
