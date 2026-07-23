# GUIDE-B44 — How to Produce `viz/design-simulation-r1.png`
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 54 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-20

---

## FINAL GOAL (re-read before authoring any viz/design-simulation-r1.png):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

This file is the design-simulation-r1.png guidance: the last of the four
visualization guidance files and number 44 of 50 in the library. When Claude Code
applies this guidance, it will produce a visual summary of a flow's design
simulation — showing the task type topology, the key design reasoning decisions,
and the simulation's SF-CHECK findings.

---

## WHAT THIS FILE IS

`viz/design-simulation-r1.png` is a **design simulation overview visualization**.
It renders the key outputs of `FLOW-XX-DESIGN-SIMULATION-R1.md` in a compact
visual format: the task type pipeline, the critical design reasoning triples (DR),
and the silent-failure checks (SF-CHECKs) that were tested.

**Position in the flow documentation:**
```
FLOW-XX-DESIGN-SIMULATION-R1.md     → full simulation document (source)
viz/design-simulation-r1.png        → visual summary (this file)
viz/design-simulation-r2.png        → if a second simulation round was run (some flows)
```

**Fleet-wide sizing:** Sizes vary more than the other viz files — FLOW-07 17,924 bytes
(compact), FLOW-09 38,589 bytes (rich), FLOW-10 18,527 bytes (compact). The range
reflects content density differences between flows.

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-14 | PRIMARY | `src/ui-ux-pro-max/data/design.csv` (106KB) — design styles: minimalism/swiss (clean/spacious/high-contrast), glassmorphism (translucent layers), brutalism (raw/stark). For technical architecture diagrams use "Minimalism & Swiss Style" — grid-based, geometric, functional |
| ZIP-14 | PRIMARY | `cli/assets/data/styles.csv` — visual styles with keywords, primary/secondary colors, effects, best-for context, performance/accessibility ratings. Style row 1 (Minimalism) has `Conversion-Focused: High`, `Accessibility: AAA` |
| ZIP-17 | PRIMARY | `FLOW-07/FLOW-07-DESIGN-SIMULATION-R1.md` (51KB) — canonical example: INVENTORY CHECK, WHAT FLOW-07 INHERITS (inherited patterns table), SESSION START CHECKLIST (Q0-Q4: user ask, accomplishment, five silent-failure concerns, completion event, payload), SF-CHECK-1..5, ROUND 1 FLOW TOPOLOGY (node list), task type cards (T73-T82 with PROMPT/CONNECTIONS/ARBITERS/EXAMPLES), DESIGN_REASONING TRIPLES (DR-07-A through DR-07-E with context/chosen/rejected/teaching) |
| ZIP-17 | COMPARISON | `FLOW-09/FLOW-09-DESIGN-SIMULATION-R1.md` (73KB) — 20 task types (T99-T118); shows how the visualization scales to larger flows |

---

## OUTPUT FILE SPECIFICATION

**Target path:** `docs/sessions/FLOW-XX/viz/design-simulation-r1.png`

```bash
mkdir -p docs/sessions/FLOW-XX/viz/
```

**Expected file size:** 18-40KB (varies with number of task types and DR triples).

---

## DATA SOURCE: FLOW-XX-DESIGN-SIMULATION-R1.MD

**Key structural sections of the design simulation document:**

### 1. HEADER (task type range + date)
From the document header lines:
```
## T73-T82: FriendRequestProcessor | FriendRequestResponder | ...
## Date: 2026-04-12
```

### 2. SESSION START CHECKLIST (Q0-Q4)
Four key questions answered before simulation begins:
- **Q0:** What the user asked for (verbatim user intent)
- **Q1:** What the flow accomplishes (3-5 bullet outcomes)
- **Q2:** Five concerns that collapse in naive designs (the SF-CHECK source)
- **Q3:** The completion event name (locked here, never re-derived)
- **Q4:** Downstream minimum payload

### 3. SF-CHECK-N (silent failure checks)
Each SF-CHECK covers one failure mode from Q2. Format:
```markdown
### SF-CHECK-N: [Title — short description of the failure]
[Explanation of what goes wrong in the naive design]
[What the correct pattern is]
```

### 4. ROUND 1 — FLOW TOPOLOGY
The node list: which task types exist, their archetypes (ROUTING, AI_GENERATION,
PROCESSING, ATTENDANCE, etc.), and the flow structure (which nodes branch, which
are inline gates, which are async).

### 5. DESIGN_REASONING TRIPLES
Each triple has: context, chosen approach, rejected alternative, teaching point.
Format:
```
DR-XX-A: [Short title]
  context:   [When the designer faces this decision]
  chosen:    [What was decided]
  rejected:  [What was explicitly NOT chosen]
  teaching:  [Why — what to teach Claude Code]
```

---

## DESIGN SPECIFICATION

### Layout
A **three-section vertical layout**:

```
┌─────────────────────────────────────────────────────────────┐
│  FLOW-XX Design Simulation R1   │  T[NNN]-T[NNN+M]  │ Date │ (header)
├─────────────────────────────────────────────────────────────┤
│  TASK TYPE TOPOLOGY                                          │
│  [T73] → [T74] → [T75]  SocialConnectionEstablished⚡       │
│          ↘ [T76] → [T77] → [T78]                            │ (topology row)
│            [T79] [T80] [T81]                                 │
├─────────────────────────────────────────────────────────────┤
│  SF-CHECKS [N]        │  DESIGN REASONING TRIPLES [N]       │
│  ❌ SF-1: Queue gate   │  DR-A: Privacy → INLINE_ONLY        │
│  ❌ SF-2: Partial write │  DR-B: Atomic graph write           │ (findings cols)
│  ❌ SF-3: Zero filter  │  DR-C: Two-phase privacy gate       │
└─────────────────────────────────────────────────────────────┘
```

**Dimensions:** 1100×480px.

### Style (from ZIP-14 design.csv — Minimalism & Swiss Style)
Design simulations are architecture documents. The correct style from `design.csv`
is **Minimalism & Swiss Style** (row 1): clean, spacious, high-contrast, grid-based,
geometric, sans-serif. Keywords: "functional, essential, white space."

From `styles.csv` row 1: Primary colors monochromatic (Black/White), Secondary
Neutral Gray. Accessibility: AAA. Mobile-friendly, performance excellent.

Translated to the XIIGen palette (from colors.csv Analytics Dashboard row):
```
Background:        #F8FAFC  (Swiss white)
Header bar:        #1E40AF  (primary blue — brand anchor)
Grid lines:        #DBEAFE  (very light blue — subtle)
Task node:         #FFFFFF  fill, #1E40AF border, #1E293B text
Completion event:  #D1FAE5  (success green — this is the design goal)
SF-CHECK:          #FEE2E2  (red — failure modes)
DR triple:         #EFF6FF  (light blue — design decisions)
```

### Typography (reusing Minimalism + Swiss Style recommendation)
Swiss Style → Inter or similar geometric sans-serif for all text:
```
Title:          16px Inter Bold, #FFFFFF (on header)
Section label:  12px Inter SemiBold, #1E40AF
Node label:     10px Inter Medium, #1E293B
DR title:       10px Inter SemiBold, #1E293B
DR content:     9px Inter Regular, #475569
SF label:       10px Inter Medium, #7F1D1D
```

---

## PARSING FLOW-XX-DESIGN-SIMULATION-R1.MD

```python
import re

def parse_design_sim(md_text):
    """Extract key elements from FLOW-XX-DESIGN-SIMULATION-R1.md."""

    # Task range and flow title from header
    task_range_match = re.search(r'## (T\d+[-–]T\d+):', md_text)
    task_range = task_range_match.group(1) if task_range_match else ""

    flow_title_match = re.search(r'^## (.+)\n## T\d+', md_text, re.MULTILINE)
    flow_title = flow_title_match.group(1).strip() if flow_title_match else ""

    date_match = re.search(r'## Date: (\S+)', md_text)
    date = date_match.group(1) if date_match else ""

    # Extract task type names from header line
    task_names_match = re.search(r'## T\d+-T\d+:\s+(.*?)(?=## |$)', md_text, re.DOTALL)
    task_names = []
    if task_names_match:
        raw = task_names_match.group(1).replace('\n', ' ').replace('##', '')
        task_names = [t.strip() for t in re.split(r'\|\s*', raw) if t.strip()]

    # Extract SF-CHECKs
    sf_checks = []
    for m in re.finditer(r'### SF-CHECK-(\d+):\s*([^\n]+)', md_text):
        sf_checks.append({
            "number": m.group(1),
            "title": m.group(2).strip()[:60]
        })

    # Extract Design Reasoning Triples
    dr_triples = []
    dr_section = re.search(r'## DESIGN_REASONING TRIPLES(.*?)(?=## |\Z)', md_text, re.DOTALL)
    if dr_section:
        for m in re.finditer(
            r'(DR-\w+-\w+):\s*([^\n]+)\n\s+context:\s+([^\n]+)\n\s+chosen:\s+([^\n]+)',
            dr_section.group(1)
        ):
            dr_triples.append({
                "id": m.group(1),
                "title": m.group(2).strip()[:55],
                "chosen": m.group(4).strip()[:55]
            })

    # Extract Q3 completion event
    q3_match = re.search(r'Q3:.*?([A-Z][a-z]+(?:[A-Z][a-z]+)+Completed|[A-Z][a-z]+(?:[A-Z][a-z]+)+Established)', md_text)
    completion_event = q3_match.group(1) if q3_match else ""

    # Extract completion event context from ROUND 1 topology
    round1_match = re.search(r'## ROUND 1 — FLOW TOPOLOGY(.*?)(?=### T\d+|## ROUND 2|## DESIGN)', md_text, re.DOTALL)
    topology_summary = ""
    if round1_match:
        topology_summary = round1_match.group(1).strip()[:200]

    return {
        "task_range": task_range,
        "flow_title": flow_title,
        "date": date,
        "task_count": len(task_names),
        "task_names": task_names[:10],
        "sf_checks": sf_checks[:6],
        "dr_triples": dr_triples[:6],
        "completion_event": completion_event,
        "topology_summary": topology_summary
    }
```

---

## GENERATION SCRIPT

```python
#!/usr/bin/env python3
"""
Generate viz/design-simulation-r1.png for FLOW-XX
Usage: python3 generate_design_sim_viz.py FLOW-XX [r2]
"""
import sys, os, pathlib, re
from PIL import Image, ImageDraw

FLOW_ID = sys.argv[1] if len(sys.argv) > 1 else "FLOW-XX"
ROUND = sys.argv[2] if len(sys.argv) > 2 else "r1"

BASE_DIR = f"docs/sessions/{FLOW_ID}"
INPUT_MD = f"{BASE_DIR}/{FLOW_ID}-DESIGN-SIMULATION-R1.md"
OUTPUT_DIR = f"{BASE_DIR}/viz"
OUTPUT = f"{OUTPUT_DIR}/design-simulation-{ROUND}.png"

# Analytics Dashboard palette — Minimalism style
BG        = "#F8FAFC"
HEADER_BG = "#1E40AF"
NODE_BG   = "#FFFFFF"
NODE_BD   = "#1E40AF"
EVENT_BG  = "#D1FAE5"
EVENT_BD  = "#10B981"
SF_BG     = "#FEE2E2"
SF_BD     = "#EF4444"
DR_BG     = "#EFF6FF"
DR_BD     = "#BFDBFE"
SECTION_BG= "#F1F5F9"
TEXT_H    = "#FFFFFF"
TEXT_PRI  = "#1E40AF"
TEXT_DARK = "#1E293B"
TEXT_MUT  = "#475569"
TEXT_SF   = "#7F1D1D"
TEXT_DR   = "#1E3A8A"
GRID      = "#DBEAFE"

def render(data):
    pathlib.Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)
    W, H = 1100, 480
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    # ── Header ──────────────────────────────────────────────────
    draw.rectangle([0, 0, W, 46], fill=HEADER_BG)
    title = f"{FLOW_ID} — Design Simulation R1: {data['flow_title'][:40]}"
    draw.text((16, 14), title, fill=TEXT_H)
    range_str = f"{data['task_range']}  ({data['task_count']} types)"
    draw.text((W - 200, 16), range_str, fill="#93C5FD")
    if data["date"]:
        draw.text((W - 100, 32), data["date"], fill="#CBD5E1")

    # ── Topology section ─────────────────────────────────────────
    TOPO_Y = 56
    draw.rectangle([8, TOPO_Y, W - 8, TOPO_Y + 80], fill=SECTION_BG, outline=GRID)
    draw.text((16, TOPO_Y + 6), "FLOW TOPOLOGY", fill=TEXT_PRI)

    # Draw task nodes as small boxes
    names = data["task_names"][:10]
    if names:
        node_w = min(95, (W - 32) // max(len(names), 1) - 4)
        for i, name in enumerate(names):
            nx = 16 + i * (node_w + 4)
            ny = TOPO_Y + 24
            draw.rectangle([nx, ny, nx + node_w, ny + 34], fill=NODE_BG, outline=NODE_BD)
            short = name[:12] if len(name) > 12 else name
            draw.text((nx + 4, ny + 4), f"T{i}", fill=TEXT_PRI)
            draw.text((nx + 4, ny + 18), short, fill=TEXT_DARK)
            # Arrow to next (except last)
            if i < len(names) - 1:
                ax = nx + node_w + 1
                draw.line([(ax, ny + 17), (ax + 3, ny + 17)], fill=NODE_BD, width=1)

    # Completion event badge
    if data["completion_event"]:
        ex = W - 250
        ey = TOPO_Y + 28
        draw.rectangle([ex, ey, ex + 230, ey + 26], fill=EVENT_BG, outline=EVENT_BD)
        draw.text((ex + 6, ey + 6), f"⚡ {data['completion_event']}", fill="#065F46")

    # ── Two-column lower section ──────────────────────────────────
    COL_Y = TOPO_Y + 92
    col_w = (W - 24) // 2

    # Left column: SF-CHECKs
    draw.rectangle([8, COL_Y, 8 + col_w, H - 8], fill=SF_BG, outline=SF_BD)
    draw.text((16, COL_Y + 6), f"SILENT FAILURE CHECKS ({len(data['sf_checks'])})", fill=TEXT_SF)

    for i, sf in enumerate(data["sf_checks"][:6]):
        sy = COL_Y + 28 + i * 36
        if sy + 30 > H - 12:
            break
        draw.rectangle([14, sy, 8 + col_w - 6, sy + 30], fill="#FFFFFF", outline=SF_BD)
        draw.text((18, sy + 4), f"SF-{sf['number']}", fill=TEXT_SF)
        # Wrap title at ~45 chars
        title = sf["title"][:45]
        draw.text((18, sy + 16), title, fill=TEXT_DARK)

    # Right column: DR Triples
    dr_x = 16 + col_w
    draw.rectangle([dr_x, COL_Y, W - 8, H - 8], fill=DR_BG, outline=DR_BD)
    draw.text((dr_x + 8, COL_Y + 6),
              f"DESIGN REASONING TRIPLES ({len(data['dr_triples'])})", fill=TEXT_DR)

    for i, dr in enumerate(data["dr_triples"][:6]):
        dy = COL_Y + 28 + i * 36
        if dy + 30 > H - 12:
            break
        draw.rectangle([dr_x + 6, dy, W - 14, dy + 30], fill="#FFFFFF", outline=DR_BD)
        draw.text((dr_x + 10, dy + 4), dr["id"], fill=TEXT_PRI)
        draw.text((dr_x + 10, dy + 16), dr["title"][:55], fill=TEXT_DARK)

    img.save(OUTPUT, "PNG", optimize=True)
    print(f"✅ Written: {OUTPUT} ({os.path.getsize(OUTPUT):,} bytes)")

if __name__ == "__main__":
    with open(INPUT_MD, encoding="utf-8") as f:
        text = f.read()
    data = parse_design_sim(text)
    render(data)
```

---

## VERIFICATION

```bash
# 1. File size (18-40KB depending on flow complexity):
ls -la docs/sessions/FLOW-XX/viz/design-simulation-r1.png

# 2. Valid PNG:
python3 -c "
from PIL import Image
img = Image.open('docs/sessions/FLOW-XX/viz/design-simulation-r1.png')
print('Size:', img.size, '(expected 1100x480)')
print('Mode:', img.mode)
"

# 3. Source document exists:
ls docs/sessions/FLOW-XX/FLOW-XX-DESIGN-SIMULATION-R1.md

# 4. Generate R2 if it exists:
[ -f docs/sessions/FLOW-XX/FLOW-XX-DESIGN-SIMULATION-R2.md ] && \
  python3 generate_design_sim_viz.py FLOW-XX r2 && \
  echo "R2 generated" || echo "No R2 to generate"
```

---

## THE FOUR VISUALIZATION FILES — COMPLETE FLEET

With GUIDE-B44, all four visualization guidance files are complete:

| File | Size range | Source | Key data |
|------|-----------|--------|----------|
| `viz/qa-coverage-state.png` | ~50KB | QA-COVERAGE-STATE.json | Q1-Q6 gate verdicts |
| `viz/reconciliation-state.png` | ~25KB | RECONCILIATION-STATE.md | Discrepancy counts and verdict |
| `viz/teach-qa-r0.png` | ~34KB | TEACH-QA-R0.md | 6-phase pipeline plan |
| `viz/design-simulation-r1.png` | 18-40KB | DESIGN-SIMULATION-R1.md | Topology + SF-checks + DR triples |

**Full batch generation for a flow:**
```bash
FLOW_ID="FLOW-XX"
python3 generate_qa_coverage_viz.py $FLOW_ID
python3 generate_reconciliation_viz.py $FLOW_ID
python3 generate_teach_qa_viz.py $FLOW_ID
python3 generate_design_sim_viz.py $FLOW_ID

ls -la docs/sessions/$FLOW_ID/viz/
# Expected: 4 PNG files totaling ~130KB
```

---

## ACCEPTANCE CRITERIA

Before `viz/design-simulation-r1.png` is considered complete:

- [ ] File exists at `docs/sessions/FLOW-XX/viz/design-simulation-r1.png`
- [ ] File size 15-45KB (varies with flow complexity)
- [ ] Header shows flow ID, task range, date
- [ ] Task type topology visible (nodes in header row)
- [ ] Completion event badge visible (green) if found in source
- [ ] SF-CHECK section visible (red background with SF titles)
- [ ] Design Reasoning section visible (blue background with DR IDs)
- [ ] Uses Minimalism/Swiss Style from ZIP-14 design.csv (clean, grid-based)

---

## KEY RULES

**1. Design.csv Minimalism/Swiss Style drives the visual choices.**
Architecture diagrams must be clean, functional, high-contrast. No gradients, no
shadows, no decorative elements. Grid-based layout. The visualization is a tool for
engineers, not a marketing asset.

**2. Styles.csv provides color guidance for technical contexts.**
Row 1 (Minimalism): monochromatic primary with AAA accessibility. Applied to the
XIIGen Analytics Dashboard palette — `#1E40AF` primary replaces the generic black,
but the layout principles (white space, grid, geometric) apply unchanged.

**3. The completion event always gets a green badge.**
The completion event (from Q3 of the SESSION START CHECKLIST) is the most important
single fact in the design simulation — it's the contract between this flow and all
downstream consumers. The green badge makes it immediately findable in the visualization.

**4. SF-CHECKs are failure modes — they render in red.**
SF-CHECKs document what goes wrong in naive implementations. They are not errors
in the current design — they are warnings about patterns to avoid. The red background
communicates "this is a danger zone in design space."

**5. R2 exists for flows where the simulation ran a second refinement round.**
Only FLOW-09 shows `viz/design-simulation-r2.png` in the fleet. Run the generator
with `r2` argument only if the source document exists.

---

*End of GUIDE-B44 — viz/design-simulation-r1.png*
*This completes the four-file visualization guidance set (GUIDE-B41 through GUIDE-B44).*
*List A sources: ZIP-14 (src/ui-ux-pro-max/data/design.csv — Minimalism/Swiss Style row,*
*cli/assets/data/styles.csv — row 1 Minimalism colors and specs),*
*ZIP-17 (FLOW-07 DESIGN-SIMULATION-R1.md — canonical 10-type example,*
*FLOW-09 DESIGN-SIMULATION-R1.md — 20-type extended example)*
*Target B-type: B-44 — viz/design-simulation-r1.png*
*Round: 54 of 72*
