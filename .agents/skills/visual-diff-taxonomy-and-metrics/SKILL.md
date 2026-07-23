---
name: visual-diff-taxonomy-and-metrics
doc_type: GUIDE
version: "1.0.0"
sk_number: SK-564
priority: HIGH
load_order: 6.2
category: ui-ux
stack: ["react", "vite", "tailwind", "typescript", "playwright"]
contexts: ["web-session", "claude-code"]
description: >
  The visual-diff taxonomy and metrics contract for XIIGen mvp: eight difference
  categories (layout, typography, color, spacing, responsiveness, image/crop,
  asset-missing, interaction/state), four severities (minor/moderate/major/
  blocking), a metric_breakdown with source/rendered/viewport/hash references,
  and gates for taxonomy-coverage, metric-traceability, single dominant error
  (no DPO binding), and external-AI use only with explicit Luba permission.
triggers:
  - "visual diff"
  - "diff taxonomy"
  - "severity"
  - "metric breakdown"
  - "dominant error"
  - "source vs rendered"
  - "pixel diff"
---

# SK-564 Visual-Diff Taxonomy & Metrics (GUIDE) — source ↔ rendered (React)

When a rendered screen differs from its design source, the difference must be
**classified and measured**, not described as "looks a bit off". This GUIDE
gives the eight-category taxonomy, the severity scale, and the traceable metric
breakdown for mvp React screens.

## Why this guide exists (the gap it closes)

mvp has a grep score (`scripts/ux-quality-score.sh`) and SK-549 examination axes,
but **no formalised visual-diff taxonomy** that maps a *source ↔ rendered*
difference to a category + severity + traceable metric. SK-564 supplies that.
It consumes the render-QA artifacts from SK-563 and the SK-549/SK-550 axis data.
It is an **evidence layer only** — held-out / ablation / negative-DPO machinery
stays in `llm_mvp_core` (Section 5).

## When to Invoke

- When comparing a rendered screen (SK-563 capture) to its design source.
- When reporting why a design-to-code screen does not match intent.
- Before claiming a screen "matches the design" — produce a metric breakdown.

---

## Section 1 — The eight difference categories

| # | Category | What it captures |
|---|----------|------------------|
| 1 | **layout** | element position/order/structure differs (wrong region, reflow) |
| 2 | **typography** | font family/size/weight/line-height/letter-spacing differs |
| 3 | **color** | colour values differ beyond a tolerance (text, fill, border) |
| 4 | **spacing** | padding/margin/gap differs from the source (off the 4pt scale per SK-560) |
| 5 | **responsiveness** | breakpoint behaviour differs (mobile/tablet/desktop, RTL) |
| 6 | **image/crop** | image scaled/cropped/aspect-wrong vs source |
| 7 | **asset-missing** | a required font/image/icon failed to resolve (ties to SK-563 asset report) |
| 8 | **interaction/state** | a state (hover/focus/empty/error/populated) renders wrong |

Every reported difference is assigned **exactly one** primary category (its
dominant cause), even if it has secondary effects.

---

## Section 2 — Severity scale

| Severity | Meaning |
|----------|---------|
| **minor** | cosmetic; does not affect comprehension or use |
| **moderate** | noticeable; mild comprehension/aesthetic cost |
| **major** | breaks hierarchy/readability or a primary affordance |
| **blocking** | screen is unusable, unreadable, or a required asset/state is missing |

`blocking` on any required viewport/state fails the screen.

---

## Section 3 — Metric breakdown (traceable)

Every difference row is traceable back to the exact source, the exact rendered
capture, the viewport, and a content hash so the comparison is reproducible.

```json
{
  "screen_ref": "client/src/pages/adaptive-rag/TopologyPage.tsx",
  "render_run_id": "rqa-2026-06-29-flow-29-topology-001",
  "dominant_error": { "category": "spacing", "severity": "moderate" },
  "metric_breakdown": [
    {
      "category": "spacing",
      "severity": "moderate",
      "viewport": "mobile",
      "source_ref": "docs/design-context/flow-29/source/topology.png",
      "rendered_ref": "artifacts/render-qa/rqa-…/mobile-populated.png",
      "source_hash": "sha256:…",
      "rendered_hash": "sha256:…",
      "metric": { "name": "gap_delta_px", "value": 7, "tolerance": 4 }
    },
    {
      "category": "color",
      "severity": "minor",
      "viewport": "desktop",
      "metric": { "name": "color_delta_e", "value": 3.1, "tolerance": 2.0 }
    }
  ]
}
```

Per-viewport metrics to compute on React screens: layout match-rate, color delta
(ΔE), responsive breakpoint pass-rate, spacing gap-delta (px, vs 4pt scale),
asset-resolution rate.

---

## Section 4 — The four gates

1. **Taxonomy-coverage** — every reported difference has exactly one of the eight
   categories; none is left uncategorised.
2. **Metric-traceability** — every difference cites source_ref, rendered_ref,
   viewport, and hashes; an unbacked "looks off" claim fails.
3. **Single dominant error** — each screen names **one** `dominant_error`
   (category + severity). This is for human triage; it carries **no DPO binding**
   on mvp.
4. **External-AI permission** — using an external AI vision model to compute or
   judge the diff requires explicit current Luba permission (R7). Without it, the
   diff is computed by local deterministic metrics only.

---

## Section 5 — What stays in llm_mvp_core (not here)

Held-out evaluation sets, ablation gates, and negative-DPO pair construction are
**core-ML evaluation/training machinery** and live in `llm_mvp_core` (G12 / R5).
On mvp this GUIDE produces only the *evidence layer*: source ↔ rendered category
+ severity + traceable metric. It must not build DPO pairs, train a model, or
construct held-out/ablation gates — those mark the boundary "evidence ≠ proven
model quality".

## Section 6 — Integration

- **Input:** SK-563 render-QA captures + `asset_resolution_report`; SK-549/SK-550
  axis data; design source under `docs/design-context/<slug>/source/`.
- **Spacing/colour rules:** align with SK-560 (4pt scale, 60-30-10 tokens).
- **Output:** one metric-breakdown artifact per screen under
  `artifacts/visual-diff/`, with one `dominant_error`.
