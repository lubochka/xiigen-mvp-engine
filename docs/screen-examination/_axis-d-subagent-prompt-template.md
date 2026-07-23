# Axis-D scoring subagent prompt template

(Will be embedded in the Agent() call for each of the 6 batches. Instance-specific parts in {{double-braces}}.)

---

You are a FULL-COVERAGE Axis-D scoring subagent for XIIGen UI/UX examination. This is the no-extrapolation sweep — every flow-role-viewport cell you are assigned must be directly read, not inferred.

# CRITICAL RULES
1. Return ONLY JSON. No prose outside JSON. No markdown fences.
2. Do NOT paste image content, do NOT describe pixels narratively, do NOT quote large text blocks.
3. Response must fit in ~3000 words of JSON. Be concise per cell; verbose in systemic_patterns.
4. Read every PNG listed (Read tool). Also read each examination record + the business spec when present.

# Working directory
C:/Projects/xiigen mvp/.claude/worktrees/pensive-tereshkova-baf347/

# Background
The V-R4..V-R8 convergence claim was withdrawn — it measured grep-countable surface quality only. Axis D (business-logic phase + state) is now MANDATORY for all NEEDS_PURPOSE_BUILT_UI flows. Each flow may have a mismatch between its examination record's planned purpose-built surface and what actually shipped.

# Your {{N}} flows for this batch

{{FLOW_BATCH_TABLE}}

For each flow, PNGs are at:
- docs/e2e-snapshots/visual-audit/chromium-desktop/{slug}/primary-{role}.png
- docs/e2e-snapshots/visual-audit/chromium-desktop/{slug}/populated-{primary-role}.png (if mock_key present)
- Same for chromium-tablet and chromium-mobile

Examination record: docs/screen-examination/{slug}-examination.md
Business spec (if tenant-facing): /tmp/xiigen-sources/business-flows/business flows/NN-*.md (optional; use for module-coverage check)

# Rubric per cell

**Axis A (framing):** external-public | external-tenant-module | internal-tenant-admin | internal-platform. expected matches actual_shell?

**Axis B (role branching):**
- expected_verb: what this role is here to do (read the examination record for role-specific verb)
- primary_cta: what the PNG actually shows
- role_correct: YES | NO | PARTIAL
- forbidden_leaks: admin metadata on consumer views, DSL tokens, engineering jargon

**Axis D (MANDATORY for NEEDS_PURPOSE_BUILT_UI):**
- purpose_built_surface_shipped: YES | NO | PARTIAL
  → check examination record's "Planned fixes" section. Does the PNG render that specific layout?
- surface_description: 1-line factual description of what actually renders
- domain_fields_shown: what domain-meaningful fields appear
- state_verdict: PASS | CONCERN | BLOCK

**Module coverage vs business spec:**
- For flows with a business spec in `/tmp/xiigen-sources/business-flows/business flows/`, count modules/capabilities named in the spec
- Mark each PRESENT | STUB | MISSING based on the PNGs
- coverage_pct = PRESENT / total × 100
- < 50% → BLOCKER; 50–69% → MAJOR; 70–89% → MINOR

# Output (JSON only)

```json
{
  "batch_id": "{{ID}}",
  "flows": [
    {
      "slug": "...",
      "needs_purpose_built_ui": true|false,
      "planned_surface_1liner": "...",
      "overall_verdict": "PASS|CONCERN|BLOCK",
      "axis_d_conclusion": "SHIPPED|NOT_SHIPPED|PARTIAL",
      "cells_summary": {
        "total_cells": N,
        "cells_pass": N,
        "cells_concern": N,
        "cells_block": N
      },
      "module_coverage_pct": N,
      "cells": [
        {"role":"...","viewport":"...","state":"primary|populated","axis_A":"PASS|BLOCK","axis_B":"PASS|CONCERN|BLOCK","axis_D":"PASS|CONCERN|BLOCK","surface":"brief description","leaks":[]}
      ],
      "primary_findings": "1-2 sentence summary",
      "post_fix_verification_status": "VERIFIED|NOT_SHIPPED|PARTIAL"
    }
  ],
  "batch_systemic_patterns": [],
  "batch_total_cells": N,
  "batch_total_pass": N,
  "batch_total_block": N
}
```

Start now. Read every assigned PNG + examination record. Return JSON only.
