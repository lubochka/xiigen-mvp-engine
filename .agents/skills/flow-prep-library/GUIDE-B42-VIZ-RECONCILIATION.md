# GUIDE-B42 — How to Produce `viz/reconciliation-state.png`
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 52 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-20

---

## FINAL GOAL (re-read before authoring any viz/reconciliation-state.png):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

This file is the reconciliation-state.png guidance: one of the 50 guidance files
that constitute the library. When Claude Code applies this guidance, it will produce
a consistent visual summary of a flow's reconciliation state — showing the top-line
verdict, discrepancy count and severity breakdown, and confirmed claims count.

---

## WHAT THIS FILE IS

`viz/reconciliation-state.png` is a **reconciliation audit summary visualization**.
It visually communicates the reconciliation verdict for a flow: whether the
documentation (IMPL-STATE.json claims) matches the actual codebase state.

**Position in the flow documentation:**
```
FLOW-XX-RECONCILIATION-STATE.md    → source document (narrative audit)
viz/reconciliation-state.png       → visual summary (this file)
```

**Relationship to qa-coverage-state.png:**
Both PNGs live in the same `viz/` directory and are produced together. They serve
complementary purposes:
- `qa-coverage-state.png` → shows the QA gate verdicts (Q1-Q6 quality checks)
- `reconciliation-state.png` → shows whether the documentation matches reality

**Fleet-wide sizing:** All reconciliation-state PNGs are consistently ~22-28KB,
smaller than qa-coverage-state (~50KB), reflecting a simpler layout with fewer data
points. Confirmed sizes: FLOW-01 22,451 bytes, FLOW-02 27,287 bytes, FLOW-03 28,171
bytes, FLOW-07 27,496 bytes.

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-14 | PRIMARY | `src/ui-ux-pro-max/data/colors.csv` — Analytics Dashboard row: `#1E40AF` primary, `#F8FAFC` background; semantic color mapping for verdicts |
| ZIP-14 | PRIMARY | `.claude/skills/design-system/references/semantic-tokens.md` — `--color-destructive` for DEMONSTRABLY_WRONG, `--color-success` for RECONCILED, `--color-warning` for PARTIAL_RECONCILIATION |
| ZIP-17 | PRIMARY | `FLOW-46/FLOW-46-RECONCILIATION-STATE.md` — canonical reconciled example: top-line verdict RECONCILED, 2 discrepancies (SIGNIFICANT/MINOR), ~10 confirmed claims, conclusion |
| ZIP-17 | PRIMARY | `FLOW-01/FLOW-01-RECONCILIATION-STATE.md` — failed reconciliation example: DEMONSTRABLY_WRONG, 6 discrepancies (BLOCKING×2 + SIGNIFICANT×2 + MINOR×2), confirmed claims still present |
| ZIP-17 | PRIMARY | `FLOW-03/FLOW-03-RECONCILIATION-STATE.md` — partial example: DEMONSTRABLY_WRONG with mixed severities, contracts exist but services not bound |

---

## OUTPUT FILE SPECIFICATION

**Target path:** `docs/sessions/FLOW-XX/viz/reconciliation-state.png`

Same `viz/` directory as `qa-coverage-state.png`. Both are always produced together.

```bash
mkdir -p docs/sessions/FLOW-XX/viz/
```

**Expected file size:** 22-28KB (smaller than qa-coverage, simpler layout).

---

## DATA SOURCE: FLOW-XX-RECONCILIATION-STATE.MD

Unlike `qa-coverage-state.png` which reads from a JSON, the reconciliation
visualization reads from the Markdown document directly (or from a parsed version).

**Key fields to extract:**

### 1. Top-line verdict
Extract the verdict from the `## Top-line verdict` section:
- `RECONCILED` — documentation matches reality
- `RECONCILED_WITH_CAVEATS` — mostly matches, minor discrepancies only
- `DEMONSTRABLY_WRONG` — major claimed vs actual gaps
- `PARTIAL_RECONCILIATION` — some phases verified, others not

### 2. Discrepancies by severity
Count discrepancies from `## Discrepancies found` section by severity:
- `BLOCKING` — prevents downstream automation from working correctly
- `SIGNIFICANT` — naming mismatches, ownership confusion, competing sources of truth
- `MINOR` — test count mismatches, documentation hygiene only

### 3. Confirmed claims count
Count items in the `## Confirmed claims` section.

### 4. Cross-references summary
From the `## Cross-references` section:
- Services bound fraction (e.g., "6 of 7")
- UI verdict mix (FULL_UI / PARTIAL_UI / NO_UI counts)

---

## DESIGN SPECIFICATION

### Layout
A **vertical summary card** layout — one wide card with four horizontal sections
stacked top-to-bottom:

```
┌────────────────────────────────────────────────────┐
│  FLOW-XX Reconciliation State                      │  (title bar)
├────────────────────────────────────────────────────┤
│  [VERDICT BADGE — large, full-width colored badge] │
├────────────────────────────────────────────────────┤
│  Discrepancies: [N total]                          │
│  ● BLOCKING ×N  ● SIGNIFICANT ×N  ● MINOR ×N      │  (dot chart row)
├────────────────────────────────────────────────────┤
│  Confirmed: [N claims]                             │
│  ▓▓▓▓▓▓▓▓░░░░  Services bound: 6/7                │  (progress bars)
│  UI mix: FULL×2 PARTIAL×2 INTERNAL×3              │
├────────────────────────────────────────────────────┤
│  Conclusion (1-2 lines from final paragraph)       │
└────────────────────────────────────────────────────┘
```

**Dimensions:** 800×450px (narrower than qa-coverage, portrait-ish ratio).

### Colors (from ZIP-14 colors.csv Analytics Dashboard + semantic-tokens.md)

```
Background:        #F8FAFC
Card:              #FFFFFF
Card border:       #DBEAFE
Title text:        #1E40AF
Muted text:        #64748B
```

**Verdict badge colors (from semantic-tokens.md):**
```
RECONCILED:                  background #D1FAE5  text #065F46  border #10B981
RECONCILED_WITH_CAVEATS:     background #FEF3C7  text #92400E  border #D97706
DEMONSTRABLY_WRONG:          background #FEE2E2  text #7F1D1D  border #EF4444
PARTIAL_RECONCILIATION:      background #E0E7FF  text #3730A3  border #6366F1
```

**Discrepancy severity dot colors:**
```
BLOCKING:    #EF4444  (red — destructive)
SIGNIFICANT: #D97706  (amber — warning)
MINOR:       #94A3B8  (gray — muted)
```

**Progress bar colors:**
```
Fill:       #1E40AF  (primary blue)
Background: #DBEAFE  (primary-100)
```

---

## PARSING THE RECONCILIATION STATE MARKDOWN

```python
import re

def parse_reconciliation_state(md_text):
    """Parse FLOW-XX-RECONCILIATION-STATE.md into structured data."""
    result = {
        "verdict": "UNKNOWN",
        "discrepancies": {"BLOCKING": 0, "SIGNIFICANT": 0, "MINOR": 0},
        "confirmed_count": 0,
        "services_bound": None,  # e.g., "6 of 7"
        "ui_mix": {},
        "conclusion": ""
    }

    # Extract top-line verdict
    verdict_match = re.search(
        r'\*\*(RECONCILED|DEMONSTRABLY_WRONG|RECONCILED_WITH_CAVEATS|PARTIAL_RECONCILIATION)',
        md_text
    )
    if verdict_match:
        result["verdict"] = verdict_match.group(1)

    # Count discrepancies by severity
    severity_pattern = re.compile(r'- \*\*Severity:\*\* (BLOCKING|SIGNIFICANT|MINOR)')
    for m in severity_pattern.finditer(md_text):
        sev = m.group(1)
        result["discrepancies"][sev] = result["discrepancies"].get(sev, 0) + 1

    # Count confirmed claims
    confirmed_section = re.search(
        r'## Confirmed claims.*?(?=## |$)', md_text, re.DOTALL
    )
    if confirmed_section:
        bullets = re.findall(r'^- ', confirmed_section.group(), re.MULTILINE)
        result["confirmed_count"] = len(bullets)

    # Extract services bound
    services_match = re.search(r'Services bound.*?:\s*\*\*(\d+ of \d+)\*\*', md_text)
    if services_match:
        result["services_bound"] = services_match.group(1)

    # Extract UI verdict mix
    ui_match = re.search(r'UI verdict mix:.*?FULL_UI=(\d+).*?PARTIAL_UI=(\d+)', md_text)
    if ui_match:
        result["ui_mix"] = {
            "full": int(ui_match.group(1)),
            "partial": int(ui_match.group(2))
        }

    # Extract conclusion (last paragraph)
    conclusion_match = re.search(r'## Conclusion\n(.*?)$', md_text, re.DOTALL)
    if conclusion_match:
        result["conclusion"] = conclusion_match.group(1).strip()[:200]

    return result
```

---

## GENERATION SCRIPT

```python
#!/usr/bin/env python3
"""
Generate viz/reconciliation-state.png for FLOW-XX
Usage: python3 generate_reconciliation_viz.py FLOW-XX
"""
import sys, os, re, pathlib
from PIL import Image, ImageDraw

FLOW_ID = sys.argv[1] if len(sys.argv) > 1 else "FLOW-XX"
BASE_DIR = f"docs/sessions/{FLOW_ID}"
INPUT_MD = f"{BASE_DIR}/{FLOW_ID}-RECONCILIATION-STATE.md"
OUTPUT_DIR = f"{BASE_DIR}/viz"
OUTPUT = f"{OUTPUT_DIR}/reconciliation-state.png"

# Colors
BG = "#F8FAFC"
CARD_BG = "#FFFFFF"
CARD_BORDER = "#DBEAFE"
PRIMARY = "#1E40AF"
TEXT_DARK = "#1E293B"
MUTED = "#64748B"

VERDICT_COLORS = {
    "RECONCILED":             {"bg": "#D1FAE5", "text": "#065F46", "border": "#10B981"},
    "RECONCILED_WITH_CAVEATS":{"bg": "#FEF3C7", "text": "#92400E", "border": "#D97706"},
    "DEMONSTRABLY_WRONG":     {"bg": "#FEE2E2", "text": "#7F1D1D", "border": "#EF4444"},
    "PARTIAL_RECONCILIATION": {"bg": "#E0E7FF", "text": "#3730A3", "border": "#6366F1"},
    "UNKNOWN":                {"bg": "#F1F5F9", "text": "#475569", "border": "#94A3B8"},
}

SEV_COLORS = {
    "BLOCKING": "#EF4444",
    "SIGNIFICANT": "#D97706",
    "MINOR": "#94A3B8",
}

def parse_md(path):
    with open(path) as f:
        text = f.read()

    verdict = "UNKNOWN"
    m = re.search(r'\*\*(RECONCILED|DEMONSTRABLY_WRONG|RECONCILED_WITH_CAVEATS|PARTIAL_RECONCILIATION)', text)
    if m:
        verdict = m.group(1)

    discs = {"BLOCKING": 0, "SIGNIFICANT": 0, "MINOR": 0}
    for sev_match in re.finditer(r'- \*\*Severity:\*\* (BLOCKING|SIGNIFICANT|MINOR)', text):
        discs[sev_match.group(1)] += 1

    confirmed_sec = re.search(r'## Confirmed claims(.*?)(?=## |\Z)', text, re.DOTALL)
    confirmed_count = len(re.findall(r'^- ', confirmed_sec.group(1), re.MULTILINE)) if confirmed_sec else 0

    services = None
    sm = re.search(r'Services bound[^:]*:\s*\*\*(\d+ of \d+)\*\*', text)
    if sm:
        services = sm.group(1)

    conc_sec = re.search(r'## Conclusion\n(.*?)$', text, re.DOTALL)
    conclusion = conc_sec.group(1).strip()[:180] if conc_sec else ""

    return {
        "verdict": verdict,
        "discrepancies": discs,
        "confirmed_count": confirmed_count,
        "services_bound": services,
        "conclusion": conclusion
    }

def render(data):
    pathlib.Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)
    W, H = 800, 450
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    # Title bar
    draw.rectangle([0, 0, W, 50], fill=PRIMARY)
    draw.text((20, 14), f"{FLOW_ID} — Reconciliation State", fill="#FFFFFF")

    # Verdict badge (full-width, tall)
    vc = VERDICT_COLORS.get(data["verdict"], VERDICT_COLORS["UNKNOWN"])
    draw.rectangle([20, 62, W - 20, 116], fill=vc["bg"], outline=vc["border"], width=2)
    verdict_text = data["verdict"].replace("_", " ")
    draw.text((30, 78), verdict_text, fill=vc["text"])

    # Discrepancies section
    draw.text((20, 130), "Discrepancies:", fill=PRIMARY)
    discs = data["discrepancies"]
    total = sum(discs.values())
    draw.text((160, 130), f"{total} total", fill=TEXT_DARK)

    dot_x = 20
    for sev, count in discs.items():
        if count > 0:
            color = SEV_COLORS[sev]
            # Draw filled circle
            draw.ellipse([dot_x, 158, dot_x + 16, 174], fill=color)
            draw.text((dot_x + 22, 158), f"{sev} ×{count}", fill=TEXT_DARK)
            dot_x += len(sev) * 9 + 60

    # Confirmed claims + progress
    draw.text((20, 194), f"Confirmed claims: {data['confirmed_count']}", fill=PRIMARY)

    if data["services_bound"]:
        draw.text((20, 220), f"Services bound: {data['services_bound']}", fill=MUTED)
        # Progress bar
        parts = data["services_bound"].split(" of ")
        if len(parts) == 2:
            try:
                ratio = int(parts[0]) / int(parts[1])
                bar_w = 300
                draw.rectangle([20, 240, 20 + bar_w, 256], fill="#DBEAFE")
                draw.rectangle([20, 240, 20 + int(bar_w * ratio), 256], fill=PRIMARY)
            except:
                pass

    # Conclusion
    draw.text((20, 274), "Conclusion:", fill=PRIMARY)
    conc = data["conclusion"]
    # Word-wrap at ~90 chars
    lines = []
    current = ""
    for word in conc.split():
        if len(current) + len(word) > 90:
            lines.append(current.strip())
            current = word + " "
        else:
            current += word + " "
    if current:
        lines.append(current.strip())

    for i, line in enumerate(lines[:3]):
        draw.text((20, 296 + i * 20), line, fill=TEXT_DARK)

    img.save(OUTPUT, "PNG", optimize=True)
    print(f"✅ Written: {OUTPUT} ({os.path.getsize(OUTPUT):,} bytes)")

if __name__ == "__main__":
    data = parse_md(INPUT_MD)
    render(data)
```

---

## VERIFICATION

```bash
# 1. File exists and is ~22-28KB
ls -la docs/sessions/FLOW-XX/viz/reconciliation-state.png

# 2. Valid PNG
python3 -c "
from PIL import Image
img = Image.open('docs/sessions/FLOW-XX/viz/reconciliation-state.png')
print('Size:', img.size, '(expected 800x450)')
print('Valid PNG confirmed')
"

# 3. Source document exists
ls docs/sessions/FLOW-XX/FLOW-XX-RECONCILIATION-STATE.md
```

---

## THE TWO-PNG WORKFLOW

Always generate BOTH visualization files together:

```bash
# Step 1 — generate qa-coverage
python3 generate_qa_coverage_viz.py FLOW-XX

# Step 2 — generate reconciliation  
python3 generate_reconciliation_viz.py FLOW-XX

# Step 3 — verify both
ls -la docs/sessions/FLOW-XX/viz/
# Expected: qa-coverage-state.png (~50KB) + reconciliation-state.png (~25KB)
```

The two PNGs complement each other: qa-coverage shows whether the quality gates
pass; reconciliation shows whether what was built matches what was claimed.

---

## RECONCILIATION VERDICT DECISION TREE

For authoring the verdict in FLOW-XX-RECONCILIATION-STATE.md:

```
No discrepancies → RECONCILED
All discrepancies are MINOR → RECONCILED_WITH_CAVEATS
Any BLOCKING discrepancy → DEMONSTRABLY_WRONG
Any SIGNIFICANT discrepancy (no BLOCKING) → RECONCILED_WITH_CAVEATS or DEMONSTRABLY_WRONG
  → If core contract/service binding exists → RECONCILED_WITH_CAVEATS
  → If fundamental documentation drift → DEMONSTRABLY_WRONG
Mixed: some phases verified, others not → PARTIAL_RECONCILIATION
```

The verdict is set in the `## Top-line verdict` section of the Markdown document.
The visualization reads it from there.

---

## ACCEPTANCE CRITERIA

Before `viz/reconciliation-state.png` is considered complete:

- [ ] File exists at `docs/sessions/FLOW-XX/viz/reconciliation-state.png`
- [ ] File size 15-35KB (smaller than qa-coverage's ~50KB)
- [ ] Verdict badge visible with correct color for the verdict
- [ ] Discrepancy counts shown (even if 0 for each severity)
- [ ] Confirmed claims count shown
- [ ] Conclusion text visible (even truncated)
- [ ] Uses Analytics Dashboard color palette from ZIP-14

---

## KEY RULES

**1. The source is always FLOW-XX-RECONCILIATION-STATE.md — never a JSON file.**
The reconciliation state is authored as a Markdown narrative. The visualization
reads the Markdown, not a separate JSON. This is different from qa-coverage-state.png
which reads from a JSON.

**2. DEMONSTRABLY_WRONG does not mean the flow is broken.**
FLOW-01 and FLOW-03 are both `DEMONSTRABLY_WRONG` in their reconciliation state,
but their code exists on disk. The verdict describes documentation accuracy, not
implementation quality. The red badge signals "the documentation does not match
reality" — fix the documentation or the implementation, not the badge.

**3. Discrepancy severity must match the impact definition.**
- BLOCKING = prevents downstream automation (CI, contract binding, BFA validation)
- SIGNIFICANT = causes human confusion (wrong names, competing truth sources)
- MINOR = cosmetic mismatch (test count off by ≤5, file naming inconsistency)

**4. Always generate both PNGs in the same batch.**
The two visualizations are a set. Creating one without the other leaves the viz/
directory inconsistent. They are always committed together.

---

*End of GUIDE-B42 — viz/reconciliation-state.png*
*List A sources: ZIP-14 (colors.csv Analytics Dashboard row, semantic-tokens.md — verdict colors),*
*ZIP-17 (FLOW-46 RECONCILIATION-STATE.md — RECONCILED example,*
*FLOW-01 RECONCILIATION-STATE.md — DEMONSTRABLY_WRONG example,*
*FLOW-03 RECONCILIATION-STATE.md — partial example)*
*Target B-type: B-42 — viz/reconciliation-state.png*
*Round: 52 of 72*
