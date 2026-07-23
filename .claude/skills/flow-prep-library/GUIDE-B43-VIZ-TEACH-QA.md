# GUIDE-B43 — How to Produce `viz/teach-qa-r0.png`
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 53 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-20

---

## FINAL GOAL (re-read before authoring any viz/teach-qa-r0.png):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

This file is the teach-qa-r0.png guidance: one of the 50 guidance files that
constitute the library. When Claude Code applies this guidance, it will produce a
clear visual overview of a flow's TEACH-QA-R0 session plan — showing which phases
must be built, what each phase produces, and what the critical gaps are.

---

## WHAT THIS FILE IS

`viz/teach-qa-r0.png` is a **teaching pipeline session plan visualization**. It
renders a card-per-phase overview of the `FLOW-XX-TEACH-QA-R0.md` session document,
making the teaching infrastructure gap list and work plan immediately scannable.

**Position in the flow documentation:**
```
FLOW-XX-TEACH-QA-R0.md     → source session plan document (what phases to build)
viz/teach-qa-r0.png        → visual summary (this file)
viz/teach-qa-r1-final.png  → companion (after R1 corrections are applied)
```

**When it exists:** `viz/teach-qa-r0.png` exists for flows that have a
TEACH-QA-R0.md session file. The PNG summarizes the R0 plan before execution.
After corrections, `viz/teach-qa-r1-final.png` summarizes the post-correction state.

**Fleet-wide sizing:** ~33-35KB consistently across flows: FLOW-07 34,598 bytes,
FLOW-08 35,609 bytes, FLOW-10 34,286 bytes, FLOW-25 33,887 bytes, FLOW-26 34,567 bytes.

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-14 | PRIMARY | `src/ui-ux-pro-max/data/typography.csv` — 50 font pairings with category, heading font, body font, mood keywords, best-for context. For tech/infrastructure dashboards use "Tech Startup" (Space Grotesk + DM Sans) or "Modern Professional" (Poppins + Open Sans) |
| ZIP-14 | PRIMARY | `.claude/skills/design-system/references/component-specs.md` — Button, Badge, Card, Table, Progress components with exact sizes, states, colors. Badge component used for phase status indicators |
| ZIP-17 | PRIMARY | `FLOW-25/FLOW-25-TEACH-QA-R0.md` (4KB) — compact 6-phase plan: PHASE 1 Design-Reasoning Fixtures + RAG Patterns, PHASE 2 Contracts + Topologies + Arbiters + Event Schemas, PHASE 3 Design Contract Tests (DC-01..DC-10), PHASE 4 Seed Script + TVQ, PHASE 5 Integration Tests, PHASE 6 Gate |
| ZIP-17 | PRIMARY | `FLOW-07/FLOW-07-TEACH-QA-R0.md` (60KB) — extended plan: SESSION PREAMBLE with gap inventory (6 missing items listed with bash existence checks), COLD START verification block, 5 new RAG pattern names, SEED number coordination rule, then same 6-phase structure with detailed DC tests |
| ZIP-14 | REFERENCE | `.claude/skills/design-system/data/slide-typography.csv` — content_type × size matrix: for metric callouts use 48-96px; for phase labels use "feature-grid" (28px/600 weight) |

---

## OUTPUT FILE SPECIFICATION

**Target path:** `docs/sessions/FLOW-XX/viz/teach-qa-r0.png`

```bash
mkdir -p docs/sessions/FLOW-XX/viz/
```

**Expected file size:** 33-35KB.

---

## DATA SOURCE: FLOW-XX-TEACH-QA-R0.MD

The visualization is generated from the TEACH-QA-R0.md session document.

**Key elements to extract:**

### 1. SESSION PREAMBLE (gap inventory)
The preamble lists what is missing from the teaching infrastructure:
- `fixtures/design-reasoning/` — which file is missing
- `fixtures/rag-patterns/` — which patterns are missing
- `fixtures/contracts/` — which contract files missing (T range)
- `fixtures/event-schemas/` — whether the directory exists
- `rag-benchmark/` — which seed script is missing
- `server/test/e2e/[slug]/` — which proper-flow spec is missing

Compact flows (FLOW-25 style) embed this in PHASE 1 inventory checks.
Extended flows (FLOW-07 style) have an explicit gap list in the preamble.

### 2. PHASES (what each phase produces)
Phases always follow this sequence:

| Phase | Standard name | Output type |
|-------|--------------|-------------|
| Phase 1 | Design-Reasoning Fixtures + RAG Patterns | JSON fixture files |
| Phase 2 | Contracts + Topologies + Arbiters + Event Schemas | JSON fixture files |
| Phase 3 | Design Contract Tests (DC-01..DC-10) | TypeScript spec file |
| Phase 4 | Seed Script + TVQ | Python + TypeScript files |
| Phase 5 | Integration Tests | TypeScript spec file |
| Phase 6 | Gate | bash test command |

### 3. DELIVERABLES count
From Phase 1 header: "What this phase produces: N items."
Sum across all phases for a total deliverable count.

### 4. RAG pattern names
Phase 1 lists new RAG pattern names introduced by this flow. These are notable because
each pattern represents a design principle or code idiom that the engine will learn.

---

## DESIGN SPECIFICATION

### Layout
A **vertical phase pipeline** with a preamble gap section on top and phase cards below.

```
┌────────────────────────────────────────────────────────────┐
│  FLOW-XX Teaching Pipeline — R0 Plan                       │ (header)
├────────────────────────────────────────────────────────────┤
│  GAP INVENTORY  [N missing items]                          │ (preamble section)
│  ● fixtures/design-reasoning/[slug]-design-decisions.json  │
│  ● fixtures/contracts/t[NNN].contract.json (T range)       │
│  ● server/test/e2e/[slug]/[slug]-proper-flow.e2e.spec.ts   │
├──────────┬──────────┬──────────┬──────────┬───────────────-┤
│ Phase 1  │ Phase 2  │ Phase 3  │ Phase 4  │ Phase 5  │ P6 │ (phase cards row)
│ DR+RAG   │ Contracts│ DC Tests │ Seed+TVQ │ Integration│Gate│
│ N items  │ N items  │ 10 DCs   │ 2 files  │ 5 INTs   │bash│
└──────────┴──────────┴──────────┴──────────┴───────────────-┘
```

**Dimensions:** 1000×420px (wider than reconciliation, accommodating 6 phase columns).

### Typography (from ZIP-14 typography.csv)

For technical pipeline dashboards use **"Tech Startup" pairing** (Space Grotesk heading
+ DM Sans body). Space Grotesk renders well at small sizes for badge labels.

```
Title:           20px Space Grotesk Bold, color #1E40AF
Phase label:     13px Space Grotesk SemiBold, color #1E293B  (matches "feature-grid" from slide-typography.csv)
Phase content:   11px DM Sans Regular, color #475569
Gap item text:   11px DM Sans Regular, color #DC2626  (destructive — items are gaps)
Deliverable count: 28px Space Grotesk Bold, color #1E40AF  (metric-callout style)
```

### Colors (from ZIP-14 colors.csv Analytics Dashboard + component-specs.md Badge)

```
Background:        #F8FAFC
Header bar:        #1E40AF
Phase card:        #FFFFFF  border #DBEAFE
Phase card hover:  #EFF6FF
Gap section:       #FEF2F2  border #FECACA  (light red — these are gaps)

Phase status badge colors (component-specs.md Badge variants):
  PRESENT (fixture exists): bg #D1FAE5  text #065F46
  MISSING (gap):            bg #FEE2E2  text #7F1D1D
  PRODUCES:                 bg #DBEAFE  text #1E40AF
  GATE:                     bg #FEF3C7  text #92400E
```

---

## PARSING FLOW-XX-TEACH-QA-R0.MD

```python
import re

def parse_teach_qa_r0(md_text):
    """Parse FLOW-XX-TEACH-QA-R0.md into structured data for visualization."""

    # Extract flow and date from header
    flow_match = re.search(r'## (FLOW-\d+)', md_text)
    date_match = re.search(r'## Date: (\S+)', md_text)
    flow_id = flow_match.group(1) if flow_match else "FLOW-XX"
    date = date_match.group(1) if date_match else ""

    # Extract gap inventory from SESSION PREAMBLE
    gaps = []
    preamble_match = re.search(r'## SESSION PREAMBLE(.*?)(?=## PHASE|## COLD START)', md_text, re.DOTALL)
    if preamble_match:
        preamble = preamble_match.group(1)
        # Find lines with MISSING
        missing_lines = re.findall(r'`([^`]+)` +[—–-]+.*MISSING.*|MISSING.*`([^`]+)`', preamble)
        gaps = [m[0] or m[1] for m in missing_lines if m[0] or m[1]]
    # Also find bash echo "MISSING" patterns
    bash_gaps = re.findall(r'echo "MISSING[^"]*".*\n.*ls ([^\s]+)', md_text)
    gaps.extend(bash_gaps[:6])  # cap at 6

    # Extract phases
    phases = []
    phase_pattern = re.compile(
        r'## PHASE (\d+) — ([^\n]+)\n(.*?)(?=## PHASE |\Z)',
        re.DOTALL
    )
    for m in phase_pattern.finditer(md_text):
        phase_num = m.group(1)
        phase_name = m.group(2).strip()
        phase_body = m.group(3)

        # Count deliverables from "What this phase produces"
        produces_match = re.search(
            r'### What this phase produces(.*?)###',
            phase_body, re.DOTALL
        )
        deliverable_count = 0
        deliverables = []
        if produces_match:
            bullets = re.findall(r'^- `([^`]+)`', produces_match.group(1), re.MULTILINE)
            deliverable_count = len(bullets)
            deliverables = bullets[:4]  # show max 4 in visualization

        # Extract DC test IDs for Phase 3
        dc_tests = re.findall(r'DC-\d+', phase_body)

        # Extract gate command for Phase 6
        gate_cmd = ""
        if "Gate" in phase_name or phase_num == "6":
            gate_match = re.search(r'```bash\n(.*?)```', phase_body, re.DOTALL)
            if gate_match:
                gate_cmd = gate_match.group(1).strip()[:60]

        phases.append({
            "number": phase_num,
            "name": phase_name[:35],  # truncate for card
            "deliverable_count": deliverable_count,
            "deliverables": deliverables,
            "dc_tests": len(set(dc_tests)) if dc_tests else 0,
            "gate_cmd": gate_cmd
        })

    # Extract new RAG pattern names (FLOW-07 style)
    rag_patterns = re.findall(
        r'- ([A-Z_]{10,})\s+\([^)]+\)',
        md_text
    )

    return {
        "flow_id": flow_id,
        "date": date,
        "gaps": gaps[:6],
        "phases": phases[:6],
        "rag_patterns": rag_patterns[:5],
        "total_deliverables": sum(p["deliverable_count"] for p in phases)
    }
```

---

## GENERATION SCRIPT

```python
#!/usr/bin/env python3
"""
Generate viz/teach-qa-r0.png for FLOW-XX
Usage: python3 generate_teach_qa_viz.py FLOW-XX [--r1-final]
"""
import sys, os, re, pathlib
from PIL import Image, ImageDraw

FLOW_ID = sys.argv[1] if len(sys.argv) > 1 else "FLOW-XX"
IS_R1 = "--r1-final" in sys.argv
SUFFIX = "r1-final" if IS_R1 else "r0"

BASE_DIR = f"docs/sessions/{FLOW_ID}"
# Try two possible paths:
INPUT_MD = (f"{BASE_DIR}/{FLOW_ID}-TEACH-QA-R1-FINAL.md" if IS_R1
            else f"{BASE_DIR}/{FLOW_ID}-TEACH-QA-R0.md")
OUTPUT_DIR = f"{BASE_DIR}/viz"
OUTPUT = f"{OUTPUT_DIR}/teach-qa-{SUFFIX}.png"

# Colors
BG        = "#F8FAFC"
HEADER_BG = "#1E40AF"
CARD_BG   = "#FFFFFF"
CARD_BD   = "#DBEAFE"
GAP_BG    = "#FEF2F2"
GAP_BD    = "#FECACA"
TEXT_PRI  = "#1E40AF"
TEXT_DARK = "#1E293B"
TEXT_MUT  = "#475569"
TEXT_GAP  = "#DC2626"

PHASE_COLORS = [
    "#EFF6FF",  # Phase 1 - very light blue
    "#F0FDF4",  # Phase 2 - very light green
    "#FFF7ED",  # Phase 3 - very light amber
    "#F5F3FF",  # Phase 4 - very light purple
    "#ECFDF5",  # Phase 5 - very light teal
    "#FFFBEB",  # Phase 6 - very light yellow (gate)
]

def render(data):
    pathlib.Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)
    W, H = 1000, 420
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    # Header bar
    draw.rectangle([0, 0, W, 48], fill=HEADER_BG)
    title = f"{data['flow_id']} Teaching Pipeline — {'R1 Final' if IS_R1 else 'R0 Plan'}"
    draw.text((20, 14), title, fill="#FFFFFF")
    if data["date"]:
        draw.text((W - 120, 16), data["date"], fill="#93C5FD")

    # Total deliverables callout
    draw.text((W - 200, 58), f"{data['total_deliverables']} total deliverables", fill=TEXT_PRI)

    # Gap inventory section
    GAP_Y = 56
    if data["gaps"]:
        draw.rectangle([16, GAP_Y, W // 3 - 8, GAP_Y + 16 + len(data["gaps"]) * 16],
                       fill=GAP_BG, outline=GAP_BD)
        draw.text((20, GAP_Y + 2), f"⚠ Gap inventory — {len(data['gaps'])} missing:", fill=TEXT_GAP)
        for i, gap in enumerate(data["gaps"][:5]):
            short = gap.split("/")[-1][:50]
            draw.text((24, GAP_Y + 18 + i * 15), f"• {short}", fill=TEXT_GAP)

    # Phase cards row
    n_phases = len(data["phases"])
    if n_phases == 0:
        img.save(OUTPUT, "PNG", optimize=True)
        print(f"✅ Written (empty): {OUTPUT}")
        return

    PHASE_ROW_Y = 190
    card_w = (W - 20) // n_phases - 4
    card_h = H - PHASE_ROW_Y - 16

    for i, phase in enumerate(data["phases"]):
        x = 10 + i * (card_w + 4)
        y = PHASE_ROW_Y
        bg = PHASE_COLORS[i % len(PHASE_COLORS)]

        # Card
        draw.rectangle([x, y, x + card_w, y + card_h], fill=bg, outline=CARD_BD, width=1)

        # Phase number badge
        draw.rectangle([x + 4, y + 4, x + 32, y + 22], fill=HEADER_BG)
        draw.text((x + 8, y + 6), f"P{phase['number']}", fill="#FFFFFF")

        # Phase name (wrap at 20 chars)
        name = phase["name"]
        draw.text((x + 6, y + 28), name[:20], fill=TEXT_DARK)
        if len(name) > 20:
            draw.text((x + 6, y + 42), name[20:40], fill=TEXT_DARK)

        # Deliverable count
        if phase["deliverable_count"] > 0:
            draw.text((x + 6, y + 60), f"{phase['deliverable_count']} items", fill=TEXT_PRI)

        # DC test count
        if phase["dc_tests"] > 0:
            draw.text((x + 6, y + 76), f"DC-01..{phase['dc_tests']}", fill=TEXT_MUT)

        # Gate command (truncated)
        if phase["gate_cmd"]:
            draw.text((x + 6, y + 76), "bash gate", fill=TEXT_MUT)

    img.save(OUTPUT, "PNG", optimize=True)
    print(f"✅ Written: {OUTPUT} ({os.path.getsize(OUTPUT):,} bytes)")

if __name__ == "__main__":
    with open(INPUT_MD, encoding="utf-8") as f:
        text = f.read()
    data = parse_teach_qa_r0(text)
    render(data)
```

**Also generate the R1-FINAL version** if a TEACH-QA-R1-FINAL.md exists:
```bash
python3 generate_teach_qa_viz.py FLOW-XX            # → viz/teach-qa-r0.png
python3 generate_teach_qa_viz.py FLOW-XX --r1-final # → viz/teach-qa-r1-final.png
```

---

## THE TEACH-QA DOCUMENT RELATIONSHIP

The `viz/teach-qa-r0.png` is one of potentially two visualization files:
- `teach-qa-r0.png` — the initial R0 plan (before any corrections)
- `teach-qa-r1-final.png` — after R1 corrections are applied (some flows only)

FLOW-07 and FLOW-08 have both; FLOW-25 and later compact flows often have only R0.

Both PNGs use the same generation script; the `--r1-final` flag changes the source
document and output filename.

---

## THE SIX-PHASE STRUCTURE

Every TEACH-QA-R0.md follows the same phase structure. This is what makes the
visualization meaningful — the phases are consistent, so the card positions are
always the same across flows:

| Card position | Always this phase | Always produces |
|--------------|-------------------|-----------------|
| P1 (leftmost) | Design-Reasoning Fixtures + RAG Patterns | `fixtures/design-reasoning/[slug]-design-decisions.json` + RAG pattern fixtures |
| P2 | Contracts + Topologies + Arbiters + Event Schemas | Multiple fixture JSONs |
| P3 | Design Contract Tests DC-01..DC-10 | One TypeScript `.e2e.spec.ts` file |
| P4 | Seed Script + TVQ | One Python `.py` + one TypeScript topology spec |
| P5 | Integration Tests | One TypeScript integration spec |
| P6 (rightmost) | Gate | `npx jest` command |

This consistency means the six phase cards always appear in the same visual positions
and represent the same types of work. Any flow missing a phase is immediately obvious
as a gap in the card row.

---

## ACCEPTANCE CRITERIA

Before `viz/teach-qa-r0.png` is considered complete:

- [ ] File exists at `docs/sessions/FLOW-XX/viz/teach-qa-r0.png`
- [ ] File size 30-38KB (consistent with fleet ~34KB average)
- [ ] Gap inventory section visible if source has gaps
- [ ] Six phase cards visible (even if some are empty)
- [ ] Phase numbers visible (P1-P6)
- [ ] Total deliverable count shown
- [ ] Uses Analytics Dashboard + Space Grotesk typography from ZIP-14

---

## KEY RULES

**1. The source is FLOW-XX-TEACH-QA-R0.md, not a JSON.**
Like reconciliation-state.png, this visualization parses a Markdown document.
There is no separate JSON data source for the teach-QA plan.

**2. The six-phase structure is always the same — missing phases are gaps.**
If a TEACH-QA-R0.md only has 4 phases (missing Phase 4 and 5), the visualization
shows 4 cards and marks the positions of Phase 4 and 5 as "NOT PRESENT". This
makes missing work immediately visible.

**3. Typography pairing from ZIP-14 typography.csv: Tech Startup.**
Space Grotesk (heading) + DM Sans (body) is the correct pairing for infrastructure
and pipeline dashboards. Never use a serif pairing for technical visualizations.

**4. R0 and R1-FINAL use the same script with different input/output.**
The `--r1-final` flag is the only difference. Run both if both source files exist.

**5. Gap items always render in red — they are work to be done.**
The gap inventory section background is `#FEF2F2` (light red) and text is
`#DC2626` (red). This signals to the reader that these items must be resolved
before the teaching pipeline is complete.

---

*End of GUIDE-B43 — viz/teach-qa-r0.png*
*List A sources: ZIP-14 (src/ui-ux-pro-max/data/typography.csv — font pairings,*
*component-specs.md — Badge component specs for phase status),*
*ZIP-17 (FLOW-25 TEACH-QA-R0.md compact 6-phase format,*
*FLOW-07 TEACH-QA-R0.md extended format with SESSION PREAMBLE gap inventory)*
*Target B-type: B-43 — viz/teach-qa-r0.png*
*Round: 53 of 72*
