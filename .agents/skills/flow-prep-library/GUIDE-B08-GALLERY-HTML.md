# GUIDE-B08 — How to Produce `FLOW-XX-GALLERY.html`
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 18 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-20

---

## FINAL GOAL (re-read before authoring any FLOW-XX-GALLERY.html):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

---

## WHAT THIS FILE IS

`FLOW-XX-GALLERY.html` is a **dark-mode HTML image gallery** that renders all visualization
PNGs in the flow's `viz/` directory as a responsive card grid. It is the human-browsable
view of the flow's visual artifacts — design simulation diagrams, QA coverage grids,
reconciliation severity cards, and teach-QA gap registers.

The gallery is intentionally compact (48–100 lines) and self-contained: no external
dependencies, no JavaScript, pure HTML + inline CSS.

**B-49 enrichment (v6.1 — C36/GUIDE-B49):** This file must also include a role-scoped
CSS token declaration section (B-49) that makes the palette configurable by role tier
and product type. The base dark-mode palette is the starting point; ZIP-14 colors.csv
and ZIP-15 §3 provide the additional tokens. The B-49 section is documented in Round 9
(LIST-B-COVERAGE-REPORT.md) and is produced as part of GUIDE-B08's output.

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-14 | PRIMARY | `slides-html-template.md` (HTML grid structure reference); `token-architecture.md`; `primitive-tokens.md`; `semantic-tokens.md`; `tailwind-integration.md`; `colors.csv`; `typography.csv`; `design.csv` |
| ZIP-15 | REFERENCE | §3 per-role color/token selection → B-49 role-scoped token declarations |

---

## OUTPUT FILE SPECIFICATION

**Target path:** `docs/sessions/FLOW-XX/FLOW-XX-GALLERY.html`
**File size range:** 48–100 lines (grows with number of viz PNGs)
**When authored:** After `viz/` directory has at least one PNG; updated when new PNGs are added

---

## CONFIRMED FIXED PALETTE (from three observed flows)

All three observed gallery files (FLOW-09, FLOW-25, FLOW-32) use an identical dark-mode
palette. These values are **confirmed fixed** — do not change them:

| CSS target | Property | Value | Role |
|-----------|----------|-------|------|
| `body` | background | `#070710` | Page background — near-black indigo |
| `body` | color | `#d8d8f0` | Body text — light lavender |
| `body` | font-family | `monospace` | Consistent with XIIGen tooling aesthetic |
| `body` | padding | `24px` | Page breathing room |
| `h1` | font-size | `15px` | Flow ID header — deliberately small |
| `h1` | color | `#9b8fff` | Accent purple — XIIGen brand |
| `h1` | margin-bottom | `4px` | Tight spacing below header |
| `.sub` | font-size | `10px` | Subtitle (document count) — intentionally tiny |
| `.sub` | color | `#5a5a7a` | De-emphasized grey-purple |
| `.sub` | margin-bottom | `20px` | Space before grid |
| `.grid` | display | `grid` | CSS grid layout |
| `.grid` | grid-template-columns | `repeat(auto-fill, minmax(540px, 1fr))` | Auto-fill columns, min 540px each |
| `.grid` | gap | `14px` | Card gap |
| `figure` (card) | margin | `0` | No default figure margin |
| `figure` (card) | background | `#0d0d1c` | Card background — slightly lighter than page |
| `figure` (card) | border-radius | `8px` | Rounded cards |
| `figure` (card) | overflow | `hidden` | Clip image to card radius |
| `figure` (card) | border | `1px solid #1e1e36` | Subtle card border |
| `img` | width | `100%` | Fill card width |
| `img` | display | `block` | No inline image gap |
| `figcaption` | padding | `8px 12px` | Caption breathing room |
| `figcaption` | font-size | `11px` | Small caption |
| `figcaption` | font-family | `monospace` | Consistent typography |
| `figcaption` | color | `#6060a0` | Muted purple caption text |

---

## STEP-BY-STEP AUTHORING INSTRUCTIONS FOR CLAUDE CODE

### Pre-condition: enumerate viz/ directory

```bash
# List all PNG files in the viz/ directory
ls docs/sessions/FLOW-XX/viz/*.png 2>/dev/null | sort
# Count session documents (for the subtitle)
ls docs/sessions/FLOW-XX/*.md docs/sessions/FLOW-XX/*.json 2>/dev/null | wc -l
```

If `viz/` directory does not exist or contains no PNGs:
```bash
mkdir -p docs/sessions/FLOW-XX/viz/
```
Then produce the viz PNGs first (GUIDE-B37..B40) before authoring the gallery.
The gallery requires at least one PNG to be non-empty.

**Minimum PNG set:** every flow should have at least `viz/qa-coverage-state.png` and
`viz/reconciliation-state.png`. These are the two always-produced visualization files
(B-37, B-38). Additional PNGs depend on flow maturity (see GUIDE-B37..B40).

---

### Step 1: Write the HTML head

```html
<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>body{background:#070710;color:#d8d8f0;font-family:monospace;padding:24px}
    h1{font-size:15px;color:#9b8fff;margin-bottom:4px} .sub{font-size:10px;color:#5a5a7a;margin-bottom:20px}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(540px,1fr));gap:14px}</style>
  </head><body>
```

**Rule:** Keep the CSS inline and minified (all on two lines as shown). No external
stylesheet links. No `<link>` tags. The gallery must be self-contained.

---

### Step 2: Write the header section

```html
  <h1>FLOW-XX</h1>
  <div class="sub">{N} session documents</div>
  <div class="grid">
```

Where `{N}` = the count from `ls docs/sessions/FLOW-XX/*.md *.json | wc -l`.

---

### Step 3: Generate one `<figure>` per PNG in viz/

For each PNG file found in `viz/`, generate one figure card.

```html
    <figure style="margin:0;background:#0d0d1c;border-radius:8px;overflow:hidden;border:1px solid #1e1e36">
      <img src="viz/{filename}.png" alt="{Alt text}" style="width:100%;display:block">
      <figcaption style="padding:8px 12px;font-size:11px;font-family:monospace;color:#6060a0">{Caption}</figcaption>
    </figure>
```

**Caption derivation rules** (filename → caption):

| PNG filename pattern | Caption |
|---------------------|---------|
| `qa-coverage-state.png` | `QA Coverage State` |
| `reconciliation-state.png` | `Reconciliation State` |
| `teach-qa-r0.png` | `Teach QA R0` |
| `teach-qa-r1-final.png` | `Teach QA R1-FINAL` |
| `design-simulation-r1.png` | `Design Simulation R1` |
| `design-simulation-r2.png` | `Design Simulation R2` |
| `teach-t{NNN}-{slug}.png` | `Teach: T{NNN}-{SLUG-UPPERCASE}` |

**General rule:** Replace hyphens with spaces, title-case each word. Exception: `T{NNN}`
patterns become `T{NNN}-{SLUG-ALL-CAPS}` with the task ID kept uppercase.

**Alt text = caption** (same string for both `alt` attribute and `figcaption`).

**Ordering:** Sort figures by filename alphabetically. This gives a consistent order:
design-simulation files first, qa-coverage second, reconciliation third, teach files last.

---

### Step 4: Close the HTML

```html
  </div>
  </body></html>
```

---

### Step 5: Add B-49 role-scoped token declarations (v6.1 requirement)

The B-49 Gallery Design System section is added as an HTML comment block immediately
after the closing `</style>` tag in the `<head>`. It declares role-scoped CSS custom
properties that override the base palette when a role-tier data attribute is present.

This section uses ZIP-14 colors.csv and ZIP-15 §3 for the token values.

```html
<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>body{background:#070710;color:#d8d8f0;font-family:monospace;padding:24px}
    h1{font-size:15px;color:#9b8fff;margin-bottom:4px} .sub{font-size:10px;color:#5a5a7a;margin-bottom:20px}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(540px,1fr));gap:14px}

    /* === B-49: ROLE-SCOPED DESIGN TOKEN DECLARATIONS === */
    /* Source: ZIP-14 colors.csv + ZIP-15 §3 per-role token selection */
    :root {
      --font-mono: monospace;
      --bg-page: #070710;
      --text-primary: #d8d8f0;
      --border-subtle: #1e1e36;
      --accent-purple: #9b8fff;
      /* Verdict semantic tokens (ZIP-14 semantic-tokens.md) */
      --color-pass: #4caf87;
      --color-partial: #e8a838;
      --color-fail: #e05050;
      --color-tbd: #5a5a7a;
      --color-blocking: #e0304a;
      --color-significant: #d4822a;
      --color-minor: #6080c0;
    }
    /* PLATFORM_ENG / PLATFORM_OPS role tier */
    [data-role-tier="platform"] {
      --color-primary: #7c6fff;
      --color-accent: #9b8fff;
      --surface-primary: #0d0d1c;
    }
    /* TENANT_OPS role tier */
    [data-role-tier="tenant-ops"] {
      --color-primary: #4a9eff;
      --color-accent: #6ab4ff;
      --surface-primary: #07101c;
    }
    /* TENANT_CONSUMER / PUBLIC role tier */
    [data-role-tier="consumer"] {
      --color-primary: #38c896;
      --color-accent: #50e0a8;
      --surface-primary: #071410;
    }
    /* Product type tokens (ZIP-14 ui-reasoning.csv) */
    [data-product-type="marketplace"] {
      --color-cta: #ff7c4a;
      --typography-scale: 0.95;
    }
    [data-product-type="platform"] {
      --color-cta: #7c6fff;
      --typography-scale: 0.9;
    }
    [data-product-type="saas"] {
      --color-cta: #4a9eff;
      --typography-scale: 1.0;
    }
    /* === END B-49 === */
  </style>
  </head><body>
```

**Important:** The B-49 tokens are declared but not applied to the base gallery layout.
They are available for downstream tooling (dashboard builders, report generators) that
consumes the gallery and wishes to apply role-tier-specific styling. The base gallery
continues to use the hardcoded dark palette from Step 1.

---

## COMPLETE TEMPLATE (minimal — 2 PNGs)

This is the minimum viable gallery (FLOW-25/FLOW-32 pattern, 3 PNGs):

```html
<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>body{background:#070710;color:#d8d8f0;font-family:monospace;padding:24px}
    h1{font-size:15px;color:#9b8fff;margin-bottom:4px} .sub{font-size:10px;color:#5a5a7a;margin-bottom:20px}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(540px,1fr));gap:14px}
    :root{--color-pass:#4caf87;--color-partial:#e8a838;--color-fail:#e05050;--color-tbd:#5a5a7a;--color-blocking:#e0304a;--color-significant:#d4822a;--color-minor:#6080c0}</style>
  </head><body>
  <h1>FLOW-XX</h1>
  <div class="sub">{N} session documents</div>
  <div class="grid">
    <figure style="margin:0;background:#0d0d1c;border-radius:8px;overflow:hidden;border:1px solid #1e1e36">
      <img src="viz/qa-coverage-state.png" alt="QA Coverage State" style="width:100%;display:block">
      <figcaption style="padding:8px 12px;font-size:11px;font-family:monospace;color:#6060a0">QA Coverage State</figcaption>
    </figure>
    <figure style="margin:0;background:#0d0d1c;border-radius:8px;overflow:hidden;border:1px solid #1e1e36">
      <img src="viz/reconciliation-state.png" alt="Reconciliation State" style="width:100%;display:block">
      <figcaption style="padding:8px 12px;font-size:11px;font-family:monospace;color:#6060a0">Reconciliation State</figcaption>
    </figure>
    <figure style="margin:0;background:#0d0d1c;border-radius:8px;overflow:hidden;border:1px solid #1e1e36">
      <img src="viz/teach-qa-r0.png" alt="Teach QA R0" style="width:100%;display:block">
      <figcaption style="padding:8px 12px;font-size:11px;font-family:monospace;color:#6060a0">Teach QA R0</figcaption>
    </figure>
  </div>
  </body></html>
```

---

## COMPLETE TEMPLATE (rich — 10 PNGs, FLOW-09 pattern)

For a fully implemented flow with teach-QA PNGs:

```html
<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>body{background:#070710;color:#d8d8f0;font-family:monospace;padding:24px}
    h1{font-size:15px;color:#9b8fff;margin-bottom:4px} .sub{font-size:10px;color:#5a5a7a;margin-bottom:20px}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(540px,1fr));gap:14px}
    :root{--color-pass:#4caf87;--color-partial:#e8a838;--color-fail:#e05050;--color-tbd:#5a5a7a;--color-blocking:#e0304a;--color-significant:#d4822a;--color-minor:#6080c0}</style>
  </head><body>
  <h1>FLOW-XX</h1>
  <div class="sub">{N} session documents</div>
  <div class="grid">
    <figure style="margin:0;background:#0d0d1c;border-radius:8px;overflow:hidden;border:1px solid #1e1e36">
      <img src="viz/design-simulation-r1.png" alt="Design Simulation R1" style="width:100%;display:block">
      <figcaption style="padding:8px 12px;font-size:11px;font-family:monospace;color:#6060a0">Design Simulation R1</figcaption>
    </figure>
    <figure style="margin:0;background:#0d0d1c;border-radius:8px;overflow:hidden;border:1px solid #1e1e36">
      <img src="viz/qa-coverage-state.png" alt="QA Coverage State" style="width:100%;display:block">
      <figcaption style="padding:8px 12px;font-size:11px;font-family:monospace;color:#6060a0">QA Coverage State</figcaption>
    </figure>
    <figure style="margin:0;background:#0d0d1c;border-radius:8px;overflow:hidden;border:1px solid #1e1e36">
      <img src="viz/reconciliation-state.png" alt="Reconciliation State" style="width:100%;display:block">
      <figcaption style="padding:8px 12px;font-size:11px;font-family:monospace;color:#6060a0">Reconciliation State</figcaption>
    </figure>
    <figure style="margin:0;background:#0d0d1c;border-radius:8px;overflow:hidden;border:1px solid #1e1e36">
      <img src="viz/teach-qa-r1-final.png" alt="Teach QA R1-FINAL" style="width:100%;display:block">
      <figcaption style="padding:8px 12px;font-size:11px;font-family:monospace;color:#6060a0">Teach QA R1-FINAL</figcaption>
    </figure>
    <!-- One additional <figure> per teach-t{NNN}-*.png in viz/ -->
  </div>
  </body></html>
```

---

## CAPTION DERIVATION ALGORITHM

```python
# Pseudocode — apply to each filename before writing figcaption
def derive_caption(filename: str) -> str:
    # Remove .png extension
    name = filename.replace('.png', '')

    # Special case: teach-t{NNN}-{slug} pattern
    if name.startswith('teach-t') and name[7:10].isdigit():
        task_id = 'T' + name[7:10]          # e.g. 'T105'
        rest = name[11:]                     # e.g. 'compliance-escalation'
        return f"Teach: {task_id}-{rest.upper().replace('-', '-')}"
        # Result: "Teach: T105-COMPLIANCE-ESCALATION"

    # General case: replace hyphens with spaces, title-case each word
    words = name.replace('-', ' ').split()
    titled = ' '.join(w.capitalize() for w in words)

    # Special capitalization preservations
    titled = titled.replace('Qa', 'QA')
    titled = titled.replace('R0', 'R0').replace('R1', 'R1')
    titled = titled.replace('R1-final', 'R1-FINAL')
    return titled
    # Examples:
    # 'qa-coverage-state' → 'QA Coverage State'
    # 'reconciliation-state' → 'Reconciliation State'
    # 'design-simulation-r1' → 'Design Simulation R1'
    # 'teach-qa-r0' → 'Teach QA R0'
```

---

## SELF-CHECK BEFORE SAVING

```
□ Every PNG in docs/sessions/FLOW-XX/viz/ has a corresponding <figure> entry
□ No <figure> references a PNG that does not exist in viz/ (run ls to verify)
□ Document count in <div class="sub"> matches actual file count
  (run: ls docs/sessions/FLOW-XX/*.md docs/sessions/FLOW-XX/*.json | wc -l)
□ Captions use the correct derivation algorithm (QA, R0, R1-FINAL preserved)
□ Fixed palette values unchanged: body bg=#070710, h1 color=#9b8fff, card bg=#0d0d1c
□ B-49 CSS token block present (at minimum: --color-pass, --color-fail, --color-partial)
□ No external CSS or JS dependencies (file must be self-contained)
□ File saved to docs/sessions/FLOW-XX/FLOW-XX-GALLERY.html
```

**SILENT_FAILURE RISK:** Listing a PNG in a `<figure>` that does not yet exist in
`viz/`. The gallery will render broken image icons when opened in a browser. Always
run `ls docs/sessions/FLOW-XX/viz/*.png` before generating figure entries.

---

## THREE CONFIRMED EXAMPLES SUMMARY

| Flow | PNG count | Session docs count | Teach PNGs | Gallery lines |
|------|-----------|--------------------|-----------|--------------|
| FLOW-09 | 10 | 10 | 6 (T99, T105, T108, T112, T113 teach variants) | ~48 |
| FLOW-25 | 3 | 3 | 1 (teach-qa-r0.png) | ~20 |
| FLOW-32 | 3 | 3 | 1 (teach-qa-r0.png) | ~20 |

All three use the identical CSS palette. The only differences are flowId in `<h1>`,
document count in `.sub`, and the number of `<figure>` entries.

---

## C30/C38 SOURCE SPLIT NOTE

The GALLERY.html format is **universal** — same structure for all 49 flows.
The only flow-specific elements are: `<h1>FLOW-XX</h1>`, the session document count,
and the list of PNG files in viz/. All three come from the filesystem, not from specs.

For FLOW-41 (EXEMPT from role-template work): produce gallery normally — FLOW-41 still
has QA coverage and reconciliation visualizations, just no role-screen matrix PNG.

---

## AUTHORING QUALITY GATE

This guidance file is SELF-SUFFICIENT if a Claude Code session can produce a correct
`FLOW-XX-GALLERY.html` using only:
1. This guidance file
2. The contents of `docs/sessions/FLOW-XX/viz/` (for the PNG list)
3. The count of session files in `docs/sessions/FLOW-XX/` (for the subtitle)

No ZIP content or spec reading is needed at runtime — all ZIP-14/ZIP-15 values are
baked into the fixed palette and B-49 token block in this guidance.

---
*GUIDE-B08 | Round 18 | Phase 4 — Guidance File Authoring*
*Sources: ZIP-14 (P — colors.csv, token-architecture.md, semantic-tokens.md), ZIP-15 (R — §3 role-tier tokens)*
*Three confirmed examples: FLOW-09 (10 PNGs), FLOW-25 (3 PNGs), FLOW-32 (3 PNGs)*
*Next: GUIDE-B09 — UI-REFLECTION-STATE.json (Round 19)*
