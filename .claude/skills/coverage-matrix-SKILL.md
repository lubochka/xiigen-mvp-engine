---
name: coverage-matrix
sk_number: SK-551
version: "1.0.0"
priority: MANDATORY
load_order: 5.8
category: planning
author: luba
updated: "2026-04-21"
contexts: ["claude-code", "web-session"]
description: >
  Maintains the visual examination coverage matrix — the authoritative record
  of which PNG cells have been examined, what verdict each holds, and what run
  last examined it. The cell unit is flow × screen × role × language × state.
  This is the visual equivalent of SK-543 (work-scope-inventory) but at
  PNG-level granularity. Without this, there is no way to distinguish "we
  examined this flow" from "we examined this flow's populated state for
  tenant-admin in English at desktop" — which is the actual unit of examination.
  Convergence requires coverage_NOT_YET_EXAMINED = 0 for primary cells.
triggers:
  - "coverage matrix"
  - "ROUND-2-COVERAGE-MATRIX"
  - "examination coverage"
  - "cell coverage"
  - "which cells examined"
  - "NOT_YET_EXAMINED"
  - "update matrix"
  - "coverage status"
---

# Coverage Matrix Skill (SK-551)

## Purpose

Track visual examination status at cell granularity. A "cell" is one specific
PNG: one flow, one screen, one role, one language, one state. The matrix answers:

- Which cells have been examined?
- Which cells passed / have concerns / are blocked?
- Which cells have never been looked at?
- What run last examined each cell?

**Why cell-level granularity matters:** "We examined FLOW-21" is not enough.
FLOW-21 (dynamic-forms-workflows) has a tenant-admin builder view AND a
tenant-user respondent view AND an anonymous public form view. Each is a
different cell. Examining the builder view does not tell you whether the
respondent kiosk works. The coverage matrix tracks each cell separately.

**Authority:** `docs/screen-examination/ROUND-2-COVERAGE-MATRIX.json` is the
canonical file. This skill governs how it is read, updated, and queried.

---

## Matrix Structure

The matrix is a JSON file at `docs/screen-examination/ROUND-2-COVERAGE-MATRIX.json`.

```json
{
  "$schema": "round-coverage-matrix.v1",
  "round": 2,
  "branch": "<branch>",
  "date": "<date>",
  "coverage_summary": {
    "total_flows": 48,
    "flows_with_primary_cell_examined": 0,
    "flows_with_any_cell_examined": 0,
    "primary_cells_not_yet_examined": 48,
    "flows_needs_purpose_built_ui_axis_d_verified": 0
  },
  "flows": {
    "FLOW-21": {
      "slug": "dynamic-forms-workflows",
      "grammar": "G7_SETTINGS_TABS + G5_KIOSK",
      "examination_record": "docs/screen-examination/dynamic-forms-workflows-examination.md",
      "needs_purpose_built_ui": true,
      "cells": [
        {
          "screen": "DynamicFormsWorkflowsPage",
          "role": "tenant-admin",
          "language": "en",
          "phase": "BUILDER",
          "state": "populated",
          "is_primary_cell": true,
          "png_path": "docs/e2e-snapshots/dynamic-forms-workflows/role-tenant-admin-populated.png",
          "last_examined": "RUN-61",
          "current_verdict": "NOT_YET_EXAMINED",
          "axis_a_verdict": null,
          "axis_b_verdict": null,
          "axis_d_verdict": null,
          "axis_e_verdict": null,
          "layer4_verdict": null,
          "overall": "NOT_YET_EXAMINED",
          "audit_commit": null
        }
      ]
    }
  }
}
```

---

## Step 0 — Read Before Writing

Before updating the matrix, read the current state:

```bash
# Check coverage summary
python3 - << 'EOF'
import json
m = json.load(open('docs/screen-examination/ROUND-2-COVERAGE-MATRIX.json'))
s = m.get('coverage_summary', {})
print(f"Total flows: {s.get('total_flows', 48)}")
print(f"Primary cells examined: {s.get('flows_with_primary_cell_examined', 0)}")
print(f"Primary cells NOT_YET_EXAMINED: {s.get('primary_cells_not_yet_examined', 48)}")
print(f"NEEDS_PURPOSE_BUILT_UI with Axis D verified: {s.get('flows_needs_purpose_built_ui_axis_d_verified', 0)}")
EOF

# List NOT_YET_EXAMINED flows (primary cell only)
python3 - << 'EOF'
import json
m = json.load(open('docs/screen-examination/ROUND-2-COVERAGE-MATRIX.json'))
not_examined = []
for flow_id, data in m.get('flows', {}).items():
    cells = data.get('cells', [])
    primary = [c for c in cells if c.get('is_primary_cell')]
    if not primary or primary[0].get('current_verdict') == 'NOT_YET_EXAMINED':
        not_examined.append((flow_id, data.get('slug', '')))
print(f"Flows without examined primary cell: {len(not_examined)}")
for fid, slug in not_examined:
    print(f"  {fid} ({slug})")
EOF
```

---

## Adding a Cell Entry

After completing a SK-549 block for a PNG, add or update the matrix entry:

```python
import json

def add_cell_to_matrix(matrix_path, flow_id, slug, cell_data):
    """Add or update a cell in the coverage matrix."""
    with open(matrix_path) as f:
        matrix = json.load(f)
    
    if 'flows' not in matrix:
        matrix['flows'] = {}
    
    if flow_id not in matrix['flows']:
        matrix['flows'][flow_id] = {
            'slug': slug,
            'grammar': '',       # fill from examination record
            'examination_record': f'docs/screen-examination/{slug}-examination.md',
            'needs_purpose_built_ui': False,  # check examination record
            'cells': []
        }
    
    flow = matrix['flows'][flow_id]
    
    # Find existing cell or create new
    existing = None
    for cell in flow['cells']:
        if (cell.get('screen') == cell_data['screen'] and
            cell.get('role') == cell_data['role'] and
            cell.get('language') == cell_data['language'] and
            cell.get('state') == cell_data['state']):
            existing = cell
            break
    
    if existing:
        existing.update(cell_data)
    else:
        flow['cells'].append(cell_data)
    
    # Recalculate summary
    _recalculate_summary(matrix)
    
    with open(matrix_path, 'w') as f:
        json.dump(matrix, f, indent=2)

def _recalculate_summary(matrix):
    flows = matrix.get('flows', {})
    primary_examined = 0
    any_examined = 0
    axis_d_verified = 0
    
    for flow_id, data in flows.items():
        cells = data.get('cells', [])
        
        # Primary cell examined?
        primary = [c for c in cells if c.get('is_primary_cell')]
        if primary and primary[0].get('current_verdict') != 'NOT_YET_EXAMINED':
            primary_examined += 1
        
        # Any cell examined?
        if any(c.get('current_verdict') != 'NOT_YET_EXAMINED' for c in cells):
            any_examined += 1
        
        # NEEDS_PURPOSE_BUILT_UI with Axis D verified?
        if data.get('needs_purpose_built_ui'):
            if any(c.get('axis_d_verdict') == 'PASS'
                   and c.get('state') == 'populated'
                   for c in cells):
                axis_d_verified += 1
    
    total = len(flows) if flows else 48
    matrix['coverage_summary'] = {
        'total_flows': total,
        'flows_with_primary_cell_examined': primary_examined,
        'flows_with_any_cell_examined': any_examined,
        'primary_cells_not_yet_examined': total - primary_examined,
        'flows_needs_purpose_built_ui_axis_d_verified': axis_d_verified
    }
```

---

## Querying the Matrix

### Which flows have BLOCK verdicts?

```bash
python3 - << 'EOF'
import json
m = json.load(open('docs/screen-examination/ROUND-2-COVERAGE-MATRIX.json'))
blocked = []
for flow_id, data in m.get('flows', {}).items():
    for cell in data.get('cells', []):
        if cell.get('current_verdict') == 'BLOCK':
            blocked.append({
                'flow': flow_id,
                'slug': data.get('slug'),
                'role': cell.get('role'),
                'state': cell.get('state'),
                'axis_a': cell.get('axis_a_verdict'),
                'axis_b': cell.get('axis_b_verdict'),
                'axis_d': cell.get('axis_d_verdict'),
            })
print(f"BLOCK cells: {len(blocked)}")
for b in blocked:
    print(f"  {b['flow']} / {b['role']} / {b['state']}")
    print(f"    A:{b['axis_a']} B:{b['axis_b']} D:{b['axis_d']}")
EOF
```

### Which NEEDS_PURPOSE_BUILT_UI flows have unverified Axis D?

```bash
python3 - << 'EOF'
import json, glob, os
m = json.load(open('docs/screen-examination/ROUND-2-COVERAGE-MATRIX.json'))

# Find flows with NEEDS_PURPOSE_BUILT_UI
npbu_flows = set()
for f in glob.glob('docs/screen-examination/*-examination.md'):
    if 'NEEDS_PURPOSE_BUILT_UI' in open(f).read():
        slug = os.path.basename(f).replace('-examination.md', '')
        npbu_flows.add(slug)

print(f"Flows requiring purpose-built UI: {len(npbu_flows)}")
for flow_id, data in m.get('flows', {}).items():
    slug = data.get('slug', '')
    if slug in npbu_flows:
        cells = data.get('cells', [])
        axis_d_passed = any(
            c.get('axis_d_verdict') == 'PASS' and c.get('state') == 'populated'
            for c in cells
        )
        status = "✅" if axis_d_passed else "❌ NOT VERIFIED"
        print(f"  {flow_id} ({slug}): {status}")
EOF
```

### Coverage by role

```bash
python3 - << 'EOF'
import json
from collections import defaultdict
m = json.load(open('docs/screen-examination/ROUND-2-COVERAGE-MATRIX.json'))
role_counts = defaultdict(lambda: {'examined': 0, 'not_examined': 0})
for data in m.get('flows', {}).values():
    for cell in data.get('cells', []):
        role = cell.get('role', 'unknown')
        if cell.get('current_verdict') == 'NOT_YET_EXAMINED':
            role_counts[role]['not_examined'] += 1
        else:
            role_counts[role]['examined'] += 1
for role, counts in sorted(role_counts.items()):
    total = counts['examined'] + counts['not_examined']
    pct = 100 * counts['examined'] / total if total > 0 else 0
    print(f"  {role}: {counts['examined']}/{total} ({pct:.0f}%)")
EOF
```

---

## Coverage Summary Report Format

At every ⛔ STOP that involves visual examination, include:

```
VISUAL EXAMINATION COVERAGE SUMMARY (SK-551)
  Total flows: 48
  Primary cells examined: N / 48 (X%)
  NEEDS_PURPOSE_BUILT_UI with Axis D verified: N / M
  BLOCK cells: N
  CONCERN cells: N
  NOT_YET_EXAMINED cells: N

  This session examined: N flows / N cells
  This session changed: N cells from NOT_YET_EXAMINED → PASS/CONCERN/BLOCK

  Fleet-level claim valid: YES if primary cells ≥ 20% AND STATE.scope present
                           NO if primary cells < 20%
```

---

## Relationship to Other Skills

| Skill | Relationship |
|-------|-------------|
| SK-543 work-scope-inventory | SK-543 counts flows (48 total). SK-551 counts cells within flows. SK-551 provides finer granularity for the SK-543 denominator. |
| SK-549 per-image-validation | SK-549 produces one block per PNG. SK-551 stores those blocks and maintains the aggregate coverage record. |
| SK-550 visual-examination-round | SK-550 organises rounds. SK-551 provides the coverage data that SK-550 uses for the Phase 5 convergence check (Condition 2). |
| SK-546 coverage-completeness-gate | SK-546 blocks fleet claims when coverage is insufficient. SK-551 provides the N_examined / N_total data that SK-546 checks. |
| SK-544 improvement-measurement-protocol | SK-544 requires Layer 2 observable delta. SK-551 records which cells had PNGs examined, providing the denominator for SK-544's scope claim. |

---

## Convergence Gate (consumed by SK-550)

A round converges when SK-551 reports:

```python
def is_converged(matrix_path, grep_score_delta_pct):
    """Check if round converges. Both conditions must hold."""
    with open(matrix_path) as f:
        matrix = json.load(f)
    
    summary = matrix.get('coverage_summary', {})
    total = summary.get('total_flows', 48)
    primary_examined = summary.get('flows_with_primary_cell_examined', 0)
    
    # Condition 1: grep score delta < 1%
    condition_1 = grep_score_delta_pct < 1.0
    
    # Condition 2: all primary cells examined
    condition_2 = primary_examined >= total
    
    # Condition 3: NEEDS_PURPOSE_BUILT_UI flows have Axis D verified
    npbu_total = sum(
        1 for data in matrix.get('flows', {}).values()
        if data.get('needs_purpose_built_ui')
    )
    npbu_verified = summary.get('flows_needs_purpose_built_ui_axis_d_verified', 0)
    condition_3 = npbu_verified >= npbu_total if npbu_total > 0 else True
    
    converged = condition_1 and condition_2 and condition_3
    
    return {
        'converged': converged,
        'condition_1_score_delta': condition_1,
        'condition_2_primary_coverage': condition_2,
        'condition_3_purpose_built_ui': condition_3,
        'primary_examined': f"{primary_examined}/{total}",
        'npbu_verified': f"{npbu_verified}/{npbu_total}"
    }
```

**What prevented V-R7 from being valid convergence:**
- Condition 1 was met (grep score delta ≈ 0%)
- Condition 2 was NOT met (many primary cells NOT_YET_EXAMINED)
- Condition 3 was NOT met (NEEDS_PURPOSE_BUILT_UI flows never had Axis D verified)

V-R7 declared convergence on Condition 1 alone. This skill adds Conditions 2 and 3.

---

## Anti-Patterns

```
❌ Updating the matrix without first reading its current state
   → Always run the coverage summary query before making claims.
     The matrix is the source of truth; memory is not.

❌ Marking a flow as "examined" at flow granularity
   → The unit is a cell (flow × role × language × state), not a flow.
     A flow with examined primary cell may have 20 unexamined cells.

❌ Carrying forward prior verdicts without noting them as estimates
   → Carried-forward verdicts are NOT_YET_EXAMINED for this round.
     They count toward the denominator but not toward Condition 2.

❌ Updating audit_commit without updating current_verdict
   → The verdict is what matters. An updated commit with unchanged
     current_verdict means nothing was re-examined.
```
