# GUIDE-B41 — How to Produce `viz/qa-coverage-state.png`
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 51 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-20

---

## FINAL GOAL (re-read before authoring any viz/qa-coverage-state.png):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

This file is the qa-coverage-state.png guidance: one of the 50 guidance files that
constitute the library. When Claude Code applies this guidance, it will produce a
consistent, readable visualization of a flow's QA coverage state using the XIIGen
design system color palette and chart specifications from ZIP-14.

---

## WHAT THIS FILE IS

`viz/qa-coverage-state.png` is a **QA coverage dashboard visualization** — a static
PNG showing the six QA quality gates (Q1-Q6) for a flow, each with its verdict
(PASS / PASS_WITH_CAVEAT / TBD / FAIL) and key evidence, rendered in a consistent
visual format across all flows.

**Position in the flow documentation:**
```
FLOW-XX-QA-COVERAGE-STATE.json    → source data (machine-readable verdicts)
FLOW-XX-QA-COVERAGE-STATE.md      → human-readable summary table
viz/qa-coverage-state.png         → visual dashboard (this file)
```

**Produced by:** Claude Code running the visualization generation script after
FLOW-XX-QA-COVERAGE-STATE.json is complete.

**Appears alongside:** `viz/reconciliation-state.png` in the same directory.

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-14 | PRIMARY | `src/ui-ux-pro-max/data/colors.csv` — full color palette: 25 product types with Primary, Secondary, Accent, Background, Foreground, Card, Muted, Border, Destructive tokens. XIIGen uses the "Analytics Dashboard" row (#1E40AF primary, #3B82F6 secondary, #D97706 accent, #F8FAFC background) |
| ZIP-14 | PRIMARY | `cli/assets/data/charts.csv` — 25 chart types with best use case, color guidance, accessibility grades, and library recommendations. Status charts use "Performance vs Target" type (row 8): Green/Yellow/Red gradient for PASS/CAVEAT/FAIL |
| ZIP-14 | PRIMARY | `.claude/skills/design-system/references/semantic-tokens.md` — semantic token mapping: `--color-success` → PASS verdicts, `--color-warning` → CAVEAT verdicts, `--color-destructive` → FAIL, `--color-muted` → TBD |
| ZIP-17 | PRIMARY | `FLOW-46/FLOW-46-QA-COVERAGE-STATE.json` and `FLOW-46-QA-COVERAGE-STATE.md` — canonical data source format (Q1-Q6 with verdict, evidence, criticalGaps, claimedCount/actualCount) |
| ZIP-17 | REFERENCE | `docs/sessions/FLOW-01/viz/qa-coverage-state.png` through `FLOW-47/viz/qa-coverage-state.png` — all existing PNGs are ~50KB, confirming consistent size and format across flows |

---

## OUTPUT FILE SPECIFICATION

**Target path:** `docs/sessions/FLOW-XX/viz/qa-coverage-state.png`

The `viz/` subdirectory must be created if it doesn't exist:
```bash
mkdir -p docs/sessions/FLOW-XX/viz/
```

**Expected file size:** ~50KB (consistent across flows — see: FLOW-01 50,862 bytes,
FLOW-02 50,978 bytes, FLOW-05 50,938 bytes). If output is significantly larger or
smaller, the generation parameters need adjustment.

---

## DESIGN SPECIFICATION

### Layout
A horizontal card-grid layout. Six cards arranged in a 2×3 or 3×2 grid:
- Each card: one QA gate (Q1-Q6)
- Card header: gate number + gate name (e.g., "Q1 — Unit Tests")
- Card body: verdict badge + key evidence line
- Card footer: critical gaps count (if any)

**Dimensions:** 900×500px or 1200×600px (maintain 1.8:1 aspect ratio).

### Color palette (from ZIP-14 colors.csv — "Analytics Dashboard" row)
```
Background:    #F8FAFC
Card:          #FFFFFF
Card border:   #DBEAFE
Primary:       #1E40AF  (header text, labels)
Text:          #1E3A8A
Muted text:    #64748B
```

### Verdict badge colors (from ZIP-14 semantic-tokens.md)
```
PASS:               background #D1FAE5  text #065F46  border #10B981
PASS_WITH_CAVEAT:   background #FEF3C7  text #92400E  border #D97706
TBD:                background #E0E7FF  text #3730A3  border #6366F1
FAIL:               background #FEE2E2  text #7F1D1D  border #EF4444
NOT_RUN:            background #F1F5F9  text #475569  border #94A3B8
```

### Typography
```
Title:       18px bold, color #1E3A8A
Gate label:  13px semibold, color #1E40AF
Verdict:     12px bold, uppercase, color per badge
Evidence:    11px regular, color #1E293B, 2-line max
Gaps note:   10px italic, color #64748B
```

---

## THE SIX QA GATES AND WHAT TO SHOW

Each card corresponds to one Q category from `FLOW-XX-QA-COVERAGE-STATE.json`:

| Gate | Name | Key metric to display |
|------|------|-----------------------|
| Q1 | Unit Tests | `serverCount + clientCount` total with `verdict` badge |
| Q2 | Client UI | `uiReflectionVerdict` + route count or "no client" |
| Q3 | Design Simulation | DC test count + snapshot count or "deferred" |
| Q4 | Marketplace UI | `applicabilityToMarketplace` value + verdict |
| Q5 | Cross-Tenant Install | `applicability` description + verdict |
| Q6 | BFA Validation | CF rules count + `verdict` |

**Evidence line:** First item from `evidence[]` array, truncated to 80 characters.
**Critical gaps:** If `criticalGaps.length > 0`, show count as "⚠ N gap(s)" in muted text.

---

## GENERATION SCRIPT

```python
#!/usr/bin/env python3
"""
Generate viz/qa-coverage-state.png for FLOW-XX
Usage: python3 generate_qa_coverage_viz.py FLOW-XX
"""
import json, sys, os
from PIL import Image, ImageDraw, ImageFont
import pathlib

FLOW_ID = sys.argv[1] if len(sys.argv) > 1 else "FLOW-XX"
BASE_DIR = f"docs/sessions/{FLOW_ID}"
INPUT = f"{BASE_DIR}/{FLOW_ID}-QA-COVERAGE-STATE.json"
OUTPUT_DIR = f"{BASE_DIR}/viz"
OUTPUT = f"{OUTPUT_DIR}/qa-coverage-state.png"

# Colors (from ZIP-14 Analytics Dashboard palette)
BG = "#F8FAFC"
CARD_BG = "#FFFFFF"
CARD_BORDER = "#DBEAFE"
PRIMARY = "#1E40AF"
TEXT = "#1E3A8A"
MUTED = "#64748B"

VERDICT_COLORS = {
    "PASS":              {"bg": "#D1FAE5", "text": "#065F46", "border": "#10B981"},
    "PASS_WITH_CAVEAT":  {"bg": "#FEF3C7", "text": "#92400E", "border": "#D97706"},
    "TBD":               {"bg": "#E0E7FF", "text": "#3730A3", "border": "#6366F1"},
    "FAIL":              {"bg": "#FEE2E2", "text": "#7F1D1D", "border": "#EF4444"},
    "NOT_RUN":           {"bg": "#F1F5F9", "text": "#475569", "border": "#94A3B8"},
}

GATE_LABELS = {
    "Q1_unit_tests":          "Q1 — Unit Tests",
    "Q2_client_ui":           "Q2 — Client UI",
    "Q3_design_simulation":   "Q3 — Design Simulation",
    "Q4_marketplace_ui":      "Q4 — Marketplace UI",
    "Q5_cross_tenant_install":"Q5 — Cross-Tenant Install",
    "Q6_bfa_validation":      "Q6 — BFA Validation",
}

def get_key_metric(gate_key, gate_data):
    """Extract the most important number to show for each gate."""
    if gate_key == "Q1_unit_tests":
        s = gate_data.get("serverCount", 0)
        c = gate_data.get("clientCount", 0)
        return f"{s + c} tests ({s} server + {c} client)"
    elif gate_key == "Q2_client_ui":
        return gate_data.get("uiReflectionVerdict", "See evidence")
    elif gate_key == "Q3_design_simulation":
        ev = gate_data.get("evidence", [""])
        return ev[0][:70] if ev else "No evidence"
    elif gate_key == "Q4_marketplace_ui":
        return gate_data.get("applicabilityToMarketplace", "UNCERTAIN")
    elif gate_key == "Q5_cross_tenant_install":
        return gate_data.get("applicability", "See evidence")[:70]
    elif gate_key == "Q6_bfa_validation":
        rules = gate_data.get("cfRules", [])
        return f"{len(rules)} CF rules: {', '.join(rules[:3])}"
    return ""

def render(data):
    pathlib.Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)
    W, H = 1200, 600
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    # Title
    draw.text((24, 16), f"{FLOW_ID} — QA Coverage State", fill=PRIMARY)
    overall = data.get("overallReadiness", "UNKNOWN")
    draw.text((24, 44), f"Overall: {overall}", fill=MUTED)

    # 6 cards: 2 rows × 3 cols
    cols, rows = 3, 2
    pad = 24
    card_w = (W - pad * (cols + 1)) // cols
    card_h = (H - 80 - pad * (rows + 1)) // rows
    y_start = 80

    q_keys = list(GATE_LABELS.keys())
    for i, gate_key in enumerate(q_keys):
        gate_data = data.get("qCategories", {}).get(gate_key, {})
        verdict = gate_data.get("verdict", "NOT_RUN")
        vc = VERDICT_COLORS.get(verdict, VERDICT_COLORS["NOT_RUN"])

        col = i % cols
        row = i // cols
        x = pad + col * (card_w + pad)
        y = y_start + row * (card_h + pad)

        # Card background
        draw.rectangle([x, y, x + card_w, y + card_h],
                       fill=CARD_BG, outline=CARD_BORDER, width=1)

        # Gate label
        label = GATE_LABELS[gate_key]
        draw.text((x + 12, y + 10), label, fill=PRIMARY)

        # Verdict badge
        bx, by = x + 12, y + 34
        bw = len(verdict) * 8 + 16
        draw.rectangle([bx, by, bx + bw, by + 22],
                       fill=vc["bg"], outline=vc["border"], width=1)
        draw.text((bx + 8, by + 4), verdict, fill=vc["text"])

        # Key metric
        metric = get_key_metric(gate_key, gate_data)
        if metric:
            draw.text((x + 12, y + 64), metric[:65], fill=TEXT)

        # Critical gaps count
        gaps = gate_data.get("criticalGaps", [])
        if gaps:
            draw.text((x + 12, y + card_h - 20),
                      f"⚠ {len(gaps)} gap(s)", fill=MUTED)

    img.save(OUTPUT, "PNG", optimize=True)
    print(f"✅ Written: {OUTPUT} ({os.path.getsize(OUTPUT):,} bytes)")

if __name__ == "__main__":
    with open(INPUT) as f:
        data = json.load(f)
    render(data)
```

**Dependencies:** `pip install Pillow`

**Alternative (no Pillow):** Use an SVG-based generator and convert to PNG with
`cairosvg` or `inkscape --export-type=png`. The SVG approach is preferred for
sharper text rendering:

```bash
# Install if needed:
pip install cairosvg

# Generate SVG first, then convert:
python3 generate_qa_coverage_viz_svg.py FLOW-XX
cairosvg docs/sessions/FLOW-XX/viz/qa-coverage-state.svg \
  --output docs/sessions/FLOW-XX/viz/qa-coverage-state.png \
  --output-width 1200
```

---

## VERIFICATION

After generation, verify:

```bash
# 1. File exists and is ~50KB:
ls -la docs/sessions/FLOW-XX/viz/qa-coverage-state.png

# 2. Valid PNG (not corrupt):
python3 -c "
from PIL import Image
img = Image.open('docs/sessions/FLOW-XX/viz/qa-coverage-state.png')
print('Size:', img.size)
print('Mode:', img.mode)
print('Valid PNG confirmed')
"

# 3. All 6 gates represented (check JSON source):
node -e "
const d = JSON.parse(require('fs').readFileSync('docs/sessions/FLOW-XX/FLOW-XX-QA-COVERAGE-STATE.json'));
const gates = Object.keys(d.qCategories);
console.log('Gates in source:', gates.length, '(expected 6)');
console.log('Verdicts:', gates.map(k => k + ':' + d.qCategories[k].verdict).join(', '));
"
```

---

## ACCEPTANCE CRITERIA

Before `viz/qa-coverage-state.png` is considered complete:

- [ ] File exists at `docs/sessions/FLOW-XX/viz/qa-coverage-state.png`
- [ ] File size 40-70KB (consistent with fleet average ~50KB)
- [ ] File is valid PNG (not SVG, not corrupt)
- [ ] All 6 Q-gates are represented (Q1-Q6)
- [ ] Verdict badges use correct color coding (green/yellow/blue/red)
- [ ] Flow ID and overall readiness visible in title area
- [ ] Uses ZIP-14 Analytics Dashboard color palette

---

## KEY RULES

**1. Color palette is fixed — always use the Analytics Dashboard row from ZIP-14.**
XIIGen uses `#1E40AF` primary throughout. Using a different product type from
colors.csv would create visual inconsistency across the fleet.

**2. File size target ~50KB signals correct compression.**
The ~50KB consistency across FLOW-01 through FLOW-46 indicates PNG compression
is working correctly. Files significantly over 100KB suggest unoptimized output.
Always use `optimize=True` in Pillow or equivalent.

**3. The data source is always `FLOW-XX-QA-COVERAGE-STATE.json`.**
Never generate this PNG from PHASE-COMPLETE.md or QA-COVERAGE-STATE.md — those
are human-readable formats derived from the JSON. The JSON is the canonical source.

**4. All six gates must appear even if verdict is TBD.**
Never skip a gate because it has no data. TBD gates render with the neutral blue
badge and "No evidence" text. This ensures visual consistency across flows at
different completion stages.

---

*End of GUIDE-B41 — viz/qa-coverage-state.png*
*List A sources: ZIP-14 (colors.csv Analytics Dashboard row, charts.csv row 8,*
*semantic-tokens.md — verdict color mapping),*
*ZIP-17 (FLOW-46 QA-COVERAGE-STATE.json + .md — canonical data format,*
*FLOW-01 through FLOW-46 viz/qa-coverage-state.png — ~50KB size reference)*
*Target B-type: B-41 — viz/qa-coverage-state.png*
*Round: 51 of 72*
