---
name: screen-craft-audit
version: "1.0.0"
sk_number: SK-541
load_order: phase-7-step-5
category: planning
updated: "2026-04-20"
contexts: ["web-session", "claude-code"]
---

# SK-541 Screen Craft Audit — Four-layer review of captured Playwright PNGs

## When to invoke

At Phase 7 Step 5 — after PNGs are captured, before the FC-18 Audit Trail is authored.
Input: one or more Playwright PNGs for the session's flow.
Output: one SK-541 AUDIT record per page → fed into Phase 7 Step 6 (FC-18 Audit Trail).

SK-541 fires for any session that produced React pages. It does not fire for server-only
sessions.

## Authoritative protocol reference

The full classification protocol lives in:

```
docs/screen-examination/REPAIR-GUIDANCE.md
```

Specifically:
- **Part 2 Steps 1–7** — examination procedure (spec read → state list → PNG classification
  → Nielsen scoring → Interface Design domain test)
- **Part 3** — decision tree: NEEDS_PURPOSE_BUILT_UI / NEEDS_ERROR_HANDLING /
  NEEDS_EMPTY_STATE / NEEDS_LABEL_SANITISATION / NEEDS_ROLE_BRANCH /
  PROVIDER_KEYS_BANNER / NO_ACTIVE_NAV_STATE / SIDEBAR_ON_ZERO_CHROME / PASSES
- **Part 4** — build standard (what a passing screen looks like)
- **Part 8** — what Claude Code must not do

Load `docs/screen-examination/REPAIR-GUIDANCE.md` before running any layer.

## Companion documents

```
docs/screen-examination/SPEC-LOCATION-MAP.md      — 6-file read order + exact paths
docs/screen-examination/SPEC-LOCATION-INDEX.md    — per-flow file existence inventory
docs/screen-examination/MARKET-REFERENCE-CATALOG.md — per-flow platform refs + per-state rendering
docs/screen-examination/PNG-INVENTORY.md          — per-PNG verdict catalog
docs/screen-examination/{slug}-examination.md     — prior examination record if it exists
```

## Pre-audit check

Before running any layer, check whether a prior examination record exists:

```bash
cat docs/screen-examination/{slug}-examination.md 2>/dev/null | head -15
```

- **Present:** read the "Classification" and "Primary finding" sections. This is the
  starting verdict. SK-541 layers verify or update it — they do not override without
  evidence from the current session's PNGs.
- **Absent:** run all four layers without a prior baseline.

---

## Layer 1 — Accessibility and interaction (ui-ux-pro-max P1–P2)

**P1 CRITICAL — any failure is a BLOCK:**

| Check | Description |
|-------|-------------|
| `color-not-only` | State communicated by color alone, no label or pattern |
| `aria-labels` | Icon-only interactive elements with no aria-label |
| `form-labels` | Input fields with no associated label |
| `heading-hierarchy` | h1 → h2 → h3 without skipping levels |
| `loading-buttons` | Async action buttons not disabled during operation |
| `error-feedback` | Errors in toast only, not near the offending field |

**P2 — navigation:**

| Check | Description |
|-------|-------------|
| `nav-state-active` | Current page not highlighted in nav → CONCERN |
| `drawer-usage` | Sidebar visible on PUBLIC/KIOSK page → BLOCK |

---

## Layer 2 — AI slop detection (design-for-ai CHECKER mode)

Run the 10-tell checklist. Mark each: present ✗ or absent ✓.

**Typography:**
- [ ] Inter/system-ui with no intentional typographic choice
- [ ] Monospace used to signal "this is technical"

**Color:**
- [ ] Cyan-on-dark "AI dashboard" palette
- [ ] Pure #000 / #fff throughout with no tonal variety
- [ ] Hero metric: big number + small label + gradient background card

**Layout:**
- [ ] Identical card grid — same padding, same radius, same structure repeated
- [ ] Everything centered; no asymmetry, no deliberate hierarchy
- [ ] Uniform spacing everywhere; no breathing room variation

**Detail:**
- [ ] Left-border stripe on cards as the only visual differentiator
- [ ] Gradient text on headings

**Scoring:**
- 0–2 tells: PASS
- 3–5 tells: CONCERN
- 6+ tells: BLOCK

**If CONCERN or BLOCK:**
```bash
cat docs/design-context/{slug}/.impeccable.md 2>/dev/null | head -10
```
- Missing → SK-540 was skipped → BLOCK finding in FC-18 Audit Trail
- Present → verify page implements declared FEEL and rejects declared defaults

---

## Layer 3 — Nielsen heuristics spot check (impeccable critique — 4 heuristics)

Score H1, H2, H8, H9 from 0 to 4.

**H1 Visibility of System Status:**
- 0: No feedback — user is guessing what the system is doing
- 1: Most actions produce no visible response
- 2: Some states communicated, major gaps remain
- 3: Nearly all states visible, minor gaps
- 4: All states clearly communicated with appropriate timing

**H2 Match System / Real World:**
- 0: Engineering jargon throughout (T-numbers, CF-numbers, API paths)
- 1: Mostly technical language, occasional plain copy
- 2: Mixed — domain vocabulary and engineering terms coexist
- 3: Mostly plain language, one or two technical leaks
- 4: Domain language throughout; non-technical reviewer can understand every element

**H8 Aesthetic and Minimalist Design:**
- 0: Everything competes for attention equally; no hierarchy
- 1: Cluttered — hard to find what matters
- 2: Some clutter; main content is findable but crowded
- 3: Mostly clean; minor redundant elements
- 4: Every element earns its place; nothing is decorative noise

**H9 Error Recovery:**
- 0: Errors are cryptic (raw HTTP codes, stack traces) or completely absent
- 1: Error shown but no recovery path offered
- 2: Error shown with generic recovery ("try again")
- 3: Specific error with specific recovery path
- 4: Error prevented where possible; when shown, recovery is immediate and clear

**Thresholds:**
- H1 ≤ 1 → BLOCK
- H2 ≤ 1 → BLOCK
- H9 = 0 → BLOCK
- H8 ≤ 1 → CONCERN
- Total < 8 → BLOCK · Total 8–11 → CONCERN · Total ≥ 12 → PASS

---

## Layer 4 — Grammar verification (UX-30 enforcement)

Read grammar declaration:
```bash
grep "^Type:" docs/design-context/{slug}/.impeccable.md 2>/dev/null
```

Verify PNG against declared grammar. Valid grammar implementations:

| Grammar | What the page must show as primary content |
|---------|-------------------------------------------|
| G1 PROGRESS_STRIP | Horizontal phase strip as the dominant element; phase chips with status |
| G2 VERDICT_GRID | Item × evaluator matrix with verdict badges per cell |
| G3 CARD_LIST | Domain-specific cards with state badges and role-appropriate actions |
| G4 TOPOLOGY_CANVAS | Node graph with human-readable labels; text state labels not color-only |
| G5 KIOSK | Full-width centred layout; single primary action; zero chrome on PUBLIC |
| G6 DASHBOARD | Metric tiles + trend chart + recent list |
| G7 SETTINGS_TABS | Settings panels across tabs; form fields; save confirmation |

**UX-30 BLOCK condition:** page shows a generic Name/Status/Notes/Actions table backed
by `/api/dynamic/xiigen-*` for a TENANT_CONSUMER or PUBLIC page → grammar not implemented.

**Reference implementation (G4 passing):**
Three role PNGs at `docs/e2e-snapshots/c6-role-coverage/flow-29-*.png`.
Platform-admin (stalled run), platform-support (read-only), tenant-user (not-available
fallback) — all passing as of RUN-50. Use as the benchmark for Layer 4 verdicts.

---

## Output format

```
SK-541 AUDIT — {slug} / {PageName}
  Prior examination record:    [present: {primary-finding} | absent]
  Layer 1 (accessibility):     [PASS | BLOCK: {list} | CONCERN: {list}]
  Layer 2 (AI slop):           [{N} tells — PASS | CONCERN | BLOCK]
    Tells present:             [{list or none}]
    .impeccable.md present:    [YES | NO — SK-540 skipped → BLOCK]
  Layer 3 (Nielsen H1/H2/H8/H9): [scores: {H1}/{H2}/{H8}/{H9}] Total: {N}/16
    Threshold breaches:        [{list or none}]
  Layer 4 (grammar):           declared={type} · implemented=[YES | NO | PARTIAL]
    UX-30:                     [PASS | BLOCK: CRUD table on TENANT_CONSUMER/PUBLIC]
  Overall verdict:             [PASS | CONCERN | BLOCK]
  Classification (Part 3):     [{NEEDS_PURPOSE_BUILT_UI | NEEDS_ERROR_HANDLING |
                                  NEEDS_EMPTY_STATE | NEEDS_LABEL_SANITISATION |
                                  NEEDS_ROLE_BRANCH | PASSES | ...}]
  Carry-forward:               [{items or none}]
```

Paste this record into `docs/ux-review/{slug}/FC-18-AUDIT-TRAIL.md` at Phase 7 Step 6.

## One-finding-per-run discipline

Per REPAIR-GUIDANCE.md Part 8: fix one finding per run. This prevents compounding regressions
and keeps each PNG cleanly attributable to one change. Write the finding in the session record
before touching any code:

```
Finding: {classification} for {slug} / {PageName}
Source evidence: {spec file + quote or examination record}
Fix: {one specific code change}
PNG gate: populated state for {role} using ?mock={state-key}
```
