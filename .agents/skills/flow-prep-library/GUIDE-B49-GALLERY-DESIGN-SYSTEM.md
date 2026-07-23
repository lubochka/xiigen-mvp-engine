# GUIDE-B49 — How to Produce `FLOW-XX-GALLERY.html`
## (Design System Section)
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 59 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-20

---

## FINAL GOAL (re-read before authoring any FLOW-XX-GALLERY.html):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

This file guides the production of `FLOW-XX-GALLERY.html` — the visualization
gallery that displays all PNG documentation artifacts for a flow in a single
browsable HTML page, with role-scoped design token declarations from ZIP-14 and
the structural templates from ZIP-15 §3.

---

## WHAT THIS FILE IS

`FLOW-XX-GALLERY.html` is a **single-page HTML visualization gallery** that collects
all documentation PNGs produced for a flow into a dark-themed card grid. It is the
quick-glance overview of everything documented about a flow — design simulation,
QA coverage, reconciliation state, teach-QA, and teaching session visualizations.

**Position in the flow documentation:**
```
docs/sessions/FLOW-XX/
  viz/design-simulation-r1.png    ← these PNGs are displayed in the gallery
  viz/qa-coverage-state.png
  viz/reconciliation-state.png
  viz/teach-qa-r0.png
  FLOW-XX-GALLERY.html            ← this file
```

**What the gallery shows:**
All PNG files in the flow's `viz/` directory plus any `.png` files linked from
the session documents. The gallery is self-contained HTML — no external dependencies.

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-14 | PRIMARY | `.claude/skills/design-system/references/token-architecture.md` — 3-layer token system: Primitive (raw values) → Semantic (purpose aliases) → Component (per-component overrides). The role-scoped CSS declarations use this hierarchy |
| ZIP-14 | PRIMARY | `.claude/skills/design-system/references/primitive-tokens.md` — base color values: `--color-blue-600: #2563EB`, `--color-gray-50: #F9FAFB`, spacing scale (4px base), typography scale, radius, shadows |
| ZIP-14 | PRIMARY | `.claude/skills/design-system/references/semantic-tokens.md` — purpose aliases: `--color-primary`, `--color-background`, `--color-muted-foreground`, dark mode overrides |
| ZIP-14 | PRIMARY | `src/ui-ux-pro-max/data/colors.csv` — 25 product-type palettes: each row = product type with Primary, Secondary, Accent, Background, Foreground, Card, Muted, Border, Destructive tokens |
| ZIP-14 | REFERENCE | `src/ui-ux-pro-max/data/typography.csv` — 50 font pairings for the gallery header typography |
| ZIP-15 | PRIMARY (§3) | `XIIGEN-ROLE-SCREEN-ARCHITECTURE-GUIDE.md` §3 — 5 structural templates: determines which product-type palette from colors.csv to use per role |
| ZIP-17 | PRIMARY | `docs/sessions/FLOW-07/FLOW-07-GALLERY.html` — richest example: 12 figures, dark theme (`#070710` body, `#0d0d1c` card, `#9b8fff` title, `#1e1e36` border), auto-fill grid (`minmax(540px,1fr)`), monospace font, figure/figcaption pattern |
| ZIP-17 | PRIMARY | `docs/sessions/FLOW-01/FLOW-01-GALLERY.html` — minimal example: 2 figures only (qa-coverage + reconciliation), same HTML structure |
| ZIP-17 | REFERENCE | `docs/sessions/FLOW-09/FLOW-09-GALLERY.html` — mid-size example: 4 figures |

---

## OUTPUT FILE SPECIFICATION

**Target path:** `docs/sessions/FLOW-XX/FLOW-XX-GALLERY.html`

---

## THE GALLERY HTML STRUCTURE

The gallery is a single self-contained HTML file with inline CSS. No external
stylesheets, no JavaScript, no CDN dependencies.

**Exact structure (from FLOW-07 example):**

```html
<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>body{background:#070710;color:#d8d8f0;font-family:monospace;padding:24px}
    h1{font-size:15px;color:#9b8fff;margin-bottom:4px} .sub{font-size:10px;color:#5a5a7a;margin-bottom:20px}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(540px,1fr));gap:14px}
    /* [Role-scoped design token declarations inserted here — see below] */
  </style>
  </head><body>
  <h1>FLOW-XX</h1>
  <div class="sub">[N] session documents</div>
  <div class="grid">
    <figure style="margin:0;background:#0d0d1c;border-radius:8px;overflow:hidden;border:1px solid #1e1e36">
      <img src="viz/[filename].png" alt="[Human label]" style="width:100%;display:block">
      <figcaption style="padding:8px 12px;font-size:11px;font-family:monospace;color:#6060a0">[Human label]</figcaption>
    </figure>
    [additional figures...]
  </div>
  </body></html>
```

**Fixed design tokens for the gallery shell:**
```css
body background:    #070710   (deep navy-black)
body text color:    #d8d8f0   (light lavender-white)
body font:          monospace
h1 color:           #9b8fff   (soft purple — xiigen brand)
.sub color:         #5a5a7a   (dark muted)
card background:    #0d0d1c   (slightly lighter than body)
card border:        #1e1e36   (subtle purple-navy border)
figcaption color:   #6060a0   (muted purple)
grid min width:     540px     (shows 1-2 columns based on viewport)
grid gap:           14px
```

---

## THE ROLE-SCOPED DESIGN TOKEN DECLARATIONS (ZIP-14 + ZIP-15 §3)

The design system addition inserts role-scoped CSS custom property declarations
inside the `<style>` block, after the base gallery styles.

**Format:**
```html
<style>
  /* ... base gallery styles ... */

  /* Role-Scoped Design Token Declarations (ZIP-14 + ZIP-15 §3) */

  /* ROLE-0: [role description — e.g., Public / Unauthenticated] */
  /* Source: colors.csv row "[product type]" (e.g., "E-commerce") */
  :root[data-role="public"] {
    --color-primary:    [Primary hex from colors.csv];
    --color-secondary:  [Secondary hex];
    --color-accent:     [Accent hex];
    --color-background: [Background hex];
  }

  /* ROLE-1: [role description — e.g., Authenticated Tenant User] */
  /* Source: colors.csv row "[product type]" (e.g., "SaaS (General)") */
  :root[data-role="tenant"] {
    --color-primary:    [hex];
    --color-secondary:  [hex];
    --color-accent:     [hex];
    --color-background: [hex];
  }

  /* ROLE-PLATFORM-ADMIN: [description] */
  /* Source: colors.csv row "Analytics Dashboard" */
  :root[data-role="admin"] {
    --color-primary:    #1E40AF;
    --color-secondary:  #3B82F6;
    --color-accent:     #D97706;
    --color-background: #F8FAFC;
  }

  /* [additional roles as needed from ZIP-15 §3 structural templates] */
</style>
```

---

## HOW TO SELECT PRODUCT TYPE FROM COLORS.CSV

For each role, identify which row in ZIP-14 `colors.csv` to use:

**Selection logic (based on ZIP-15 §3 structural templates):**

| Structural template | ROLE-0 | ROLE-1 (tenant) | ROLE-PLATFORM-ADMIN |
|--------------------|--------|-----------------|---------------------|
| Template 1 (RBAC) | row 1 "SaaS (General)" | row 7 "Analytics Dashboard" | row 5 "B2B Service" |
| Template 2 (Two-Sided Marketplace) | row 3 "E-commerce" | row 3 "E-commerce" | row 5 "B2B Service" |
| Template 3 (Approval Chain) | row 1 "SaaS (General)" | row 7 "Analytics Dashboard" | row 5 "B2B Service" |
| Template 4 (Platform Operator) | n/a (platform internal) | row 16 "Productivity Tool" | row 5 "B2B Service" |
| Template 5 (Human Gate) | row 8 "Healthcare App" (caution palette) | row 1 "SaaS (General)" | row 5 "B2B Service" |

**Key colors.csv rows for common XIIGen flows:**

| Row | Product type | Primary | Secondary | Accent | Background |
|-----|-------------|---------|-----------|--------|-----------|
| 1 | SaaS (General) | #2563EB | #3B82F6 | #EA580C | #F8FAFC |
| 3 | E-commerce | #059669 | #10B981 | #EA580C | #ECFDF5 |
| 5 | B2B Service | #0F172A | #334155 | #0369A1 | #F8FAFC |
| 7 | Analytics Dashboard | #1E40AF | #3B82F6 | #D97706 | #F8FAFC |
| 8 | Healthcare App | #0891B2 | #22D3EE | #059669 | #ECFEFF |
| 16 | Productivity Tool | #0D9488 | #14B8A6 | #EA580C | #F0FDFA |
| 17 | Design System/Component | #4F46E5 | #6366F1 | #EA580C | #EEF2FF |

---

## THE THREE-LAYER TOKEN SYSTEM IN THE GALLERY

The gallery uses ZIP-14's three-layer token architecture but simplified for HTML:

**Layer 1 (Primitives):** The fixed hex values in colors.csv are the primitive tokens.
The gallery references them directly in the role-scoped declarations.

**Layer 2 (Semantic):** The `--color-primary`, `--color-background` etc. names from
semantic-tokens.md are the semantic layer. The role-scoped declarations assign
primitives to semantic names: `--color-primary: #2563EB;`

**Layer 3 (Component):** The gallery's figure/figcaption styling uses the semantic
tokens: `background: var(--card-bg, #0d0d1c)` (falls back to the gallery's
hardcoded dark theme if no role override is active).

---

## THE DOCUMENT COUNT

The `<div class="sub">N session documents</div>` line counts the number of
visualization figures in the gallery. To compute N:

```bash
FLOW_ID="FLOW-XX"
ls docs/sessions/$FLOW_ID/viz/*.png 2>/dev/null | wc -l
```

Note: the count in the example says "session documents" but actually counts the
number of PNG figures displayed, not Markdown files. Use the PNG count.

---

## FIGURE ORDERING

Figures appear in this canonical order (when available):

1. `viz/design-simulation-r1.png` — Design Simulation R1
2. `viz/design-simulation-r2.png` — Design Simulation R2 (if exists)
3. `viz/qa-coverage-state.png` — QA Coverage State
4. `viz/reconciliation-state.png` — Reconciliation State
5. `viz/teach-qa-r0.png` — Teach QA R0
6. `viz/teach-qa-r1-final.png` — Teach QA R1-FINAL (if exists)
7. `viz/teach-a0.png` — Teach: A0 (if exists)
8. `viz/teach-b-additions.png` — Teach: B-ADDITIONS (if exists)
9. Additional `viz/teach-*.png` files — Teaching session visualizations
10. Any other `viz/*.png` files in alphabetical order

---

## HOW TO PRODUCE FLOW-XX-GALLERY.HTML

### Step 1 — Collect all PNG files in viz/

```bash
FLOW_ID="FLOW-XX"
VIZ_DIR="docs/sessions/$FLOW_ID/viz"
ls "$VIZ_DIR"/*.png 2>/dev/null | sort
```

### Step 2 — Identify structural template from ZIP-15 §3

```bash
# Find which roles interact with this flow from contracts
grep -n "role\|ROLE-\|persona" server/src/engine-contracts/[slug]-contracts.ts | head -10

# Cross-reference with ZIP-15 §3 to select template 1-5
# Most common: Template 1 (RBAC) for single-sided flows
# Template 2 (Two-Sided) for marketplace flows
```

### Step 3 — Select product type colors from colors.csv

Based on the structural template, select the colors.csv row for each role
using the selection table above.

### Step 4 — Generate the HTML

```python
#!/usr/bin/env python3
"""Generate FLOW-XX-GALLERY.html"""
import os, glob, sys

FLOW_ID = sys.argv[1] if len(sys.argv) > 1 else "FLOW-XX"
BASE_DIR = f"docs/sessions/{FLOW_ID}"
VIZ_DIR = f"{BASE_DIR}/viz"
OUTPUT = f"{BASE_DIR}/{FLOW_ID}-GALLERY.html"

# Collect PNGs in canonical order
CANONICAL_ORDER = [
    "design-simulation-r1.png", "design-simulation-r2.png",
    "qa-coverage-state.png", "reconciliation-state.png",
    "teach-qa-r0.png", "teach-qa-r1-final.png",
]
all_pngs = sorted(glob.glob(f"{VIZ_DIR}/*.png"))
ordered = []
for name in CANONICAL_ORDER:
    path = f"{VIZ_DIR}/{name}"
    if os.path.exists(path):
        ordered.append(name)
# Add remaining PNGs not in canonical order
for path in all_pngs:
    name = os.path.basename(path)
    if name not in ordered:
        ordered.append(name)

# Human label from filename
def human_label(filename):
    name = filename.replace(".png", "").replace("-", " ").replace("_", " ")
    # Capitalize words; preserve "R1", "QA", etc.
    return " ".join(w.upper() if w.lower() in {"r0","r1","r2","qa","png"} else w.capitalize()
                   for w in name.split())

# Role-scoped token declarations (customize per flow)
ROLE_TOKENS = """
  /* Role-Scoped Design Token Declarations (ZIP-14 colors.csv + ZIP-15 §3) */
  :root[data-role="admin"] {
    --color-primary: #1E40AF; --color-secondary: #3B82F6;
    --color-accent: #D97706; --color-background: #F8FAFC;
  }
  :root[data-role="tenant"] {
    --color-primary: #2563EB; --color-secondary: #3B82F6;
    --color-accent: #EA580C; --color-background: #F8FAFC;
  }
  :root[data-role="public"] {
    --color-primary: #059669; --color-secondary: #10B981;
    --color-accent: #EA580C; --color-background: #ECFDF5;
  }"""

figures = []
for name in ordered:
    label = human_label(name)
    figures.append(
        f'    <figure style="margin:0;background:#0d0d1c;border-radius:8px;overflow:hidden;border:1px solid #1e1e36">\n'
        f'      <img src="viz/{name}" alt="{label}" style="width:100%;display:block">\n'
        f'      <figcaption style="padding:8px 12px;font-size:11px;font-family:monospace;color:#6060a0">{label}</figcaption>\n'
        f'    </figure>'
    )

html = f"""<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>body{{background:#070710;color:#d8d8f0;font-family:monospace;padding:24px}}
    h1{{font-size:15px;color:#9b8fff;margin-bottom:4px}} .sub{{font-size:10px;color:#5a5a7a;margin-bottom:20px}}
    .grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(540px,1fr));gap:14px}}{ROLE_TOKENS}
  </style>
  </head><body>
  <h1>{FLOW_ID}</h1>
  <div class="sub">{len(figures)} session documents</div>
  <div class="grid">
{chr(10).join(figures)}</div>
  </body></html>"""

with open(OUTPUT, 'w') as f:
    f.write(html)
print(f"✅ Written: {OUTPUT}")
print(f"   Figures: {len(figures)}")
```

### Step 5 — Verify

```bash
# Check file is valid HTML:
python3 -c "
from html.parser import HTMLParser
class V(HTMLParser): pass
V().feed(open('docs/sessions/FLOW-XX/FLOW-XX-GALLERY.html').read())
print('Valid HTML')
"

# Count figures:
grep -c '<figure' docs/sessions/FLOW-XX/FLOW-XX-GALLERY.html
```

---

## ACCEPTANCE CRITERIA

Before `FLOW-XX-GALLERY.html` is considered complete:

- [ ] File exists at `docs/sessions/FLOW-XX/FLOW-XX-GALLERY.html`
- [ ] Valid HTML (no syntax errors)
- [ ] Dark theme: body background `#070710`, h1 color `#9b8fff`
- [ ] At least one `<figure>` per PNG in `viz/` directory
- [ ] Canonical PNG order followed (design-sim, qa-coverage, reconciliation, teach-qa first)
- [ ] Figure count in `.sub` matches actual figure count
- [ ] Role-scoped token declarations present in `<style>` block
- [ ] Token declarations reference colors.csv rows appropriate to this flow's structural template
- [ ] All images use relative path `viz/[filename].png`

---

## KEY RULES

**1. The gallery HTML is self-contained — no external dependencies.**
No CDN, no external CSS, no JavaScript. The gallery must open correctly from
any file path, including local filesystem opens. All styles are inline or in
the `<head><style>` block.

**2. The dark theme is fixed — the role-scoped tokens affect a separate CSS layer.**
The gallery shell always uses `#070710` background and `#9b8fff` title. The
role-scoped token declarations (`--color-primary`, etc.) are CSS custom properties
that apply to the DATA layer — they describe what the flow's actual UI should use,
not the gallery's display palette. They exist in the gallery for documentation
purposes, not for gallery styling.

**3. Token declarations must use the three-layer structure from token-architecture.md.**
Do not place raw hex values directly in component CSS. The pattern is: primitive
tokens reference hex values, semantic tokens reference primitives, component tokens
reference semantics. The role-scoped declarations assign primitive hex to semantic
names: `--color-primary: #2563EB;` (not `--button-bg: #2563EB;`).

**4. Figure ordering matches the documentation progression.**
Design simulation first (what was planned), then QA coverage (what was verified),
then reconciliation (did reality match?), then teaching sessions (how it was taught).
This ordering lets a reader scan the gallery and follow the flow's development arc.

**5. The document count in `.sub` counts figure tags, not Markdown files.**
FLOW-07's gallery says "12 session documents" and has 12 `<figure>` tags. This
is not a count of `.md` files in the session directory — it's the count of PNGs
displayed. The misleading label "session documents" is preserved from the existing
format for consistency.

---

*End of GUIDE-B49 — FLOW-XX-GALLERY.html*
*List A sources: ZIP-14 (token-architecture.md — 3-layer system,*
*primitive-tokens.md — base values, semantic-tokens.md — purpose aliases,*
*colors.csv — product-type palettes, typography.csv — font pairings),*
*ZIP-15 §3 (structural templates for role-palette selection),*
*ZIP-17 (FLOW-07 GALLERY.html richest example 12 figures,*
*FLOW-01 GALLERY.html minimal 2-figure example,*
*FLOW-09 GALLERY.html mid-size 4-figure example)*
*Target B-type: B-49 — FLOW-XX-GALLERY.html*
*Round: 59 of 72*
