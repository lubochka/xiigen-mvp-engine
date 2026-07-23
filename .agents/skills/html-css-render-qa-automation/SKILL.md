---
name: html-css-render-qa-automation
doc_type: GUIDE
version: "1.0.0"
sk_number: SK-563
priority: HIGH
load_order: 6.1
category: ui-ux
stack: ["react", "vite", "tailwind", "typescript", "playwright"]
contexts: ["web-session", "claude-code"]
description: >
  The server-side render-QA contract for XIIGen mvp design-to-code evidence:
  a deterministic viewport-matrix render of built React/Vite screens with a
  fixed artifact schema (render_run_id, candidate_ref, viewport_results,
  rendered_screenshot_ref, asset_resolution_report, qa_status) and gates for
  multi-resolution, server-side rendering, stability re-render, timeout/cost,
  and asset isolation. Render-QA blocks but does NOT prove model quality.
triggers:
  - "render qa"
  - "render-QA contract"
  - "viewport matrix"
  - "qa_status"
  - "asset resolution"
  - "stability re-render"
  - "design-to-code evidence"
---

# SK-563 HTML/CSS Render-QA Automation (GUIDE) — Server-side render contract

Design-to-code needs *evidence that the produced screen actually renders* across
resolutions, deterministically, server-side — not an ad-hoc local browser look.
This GUIDE wraps the existing mvp Playwright capture into a deterministic
render-QA contract with a fixed artifact schema.

## Why this guide exists (the gap it closes)

mvp already has a PNG harness (`e2e/`, `client/e2e/`,
`client/playwright.config.ts`, `scripts/ux-quality-score.sh`,
`docs/screen-examination/*-matrix`). What it lacked is a **formal render-QA
contract**: fixed viewports, deterministic fonts/seed, a stability re-render, an
asset-resolution report, and a `qa_status` artifact schema. SK-563 supplies that
contract over the existing capture. It is design-to-code *evidence*, not model
training (that boundary stays in `llm_mvp_core` — see Section 6).

## When to Invoke

- When producing render evidence for a generated/built screen (design-to-code).
- Before accepting a screen's visual evidence as a QA artifact.
- When wiring or extending `e2e/` / `client/e2e/` capture into a repeatable run.

---

## Section 1 — The five render-QA gates

1. **Multi-resolution** — every screen is rendered at a fixed viewport matrix,
   minimum **desktop / tablet / mobile**. RTL (he) is a distinct state, not a
   viewport.
2. **Server-side / deterministic** — render through the built app driven by
   Playwright headless with pinned browser, pinned fonts, and a fixed
   `?mock=<state>` seed. No "looked fine on my machine" capture.
3. **Stability** — render twice; the two captures must match within tolerance
   (pixel-diff under a declared threshold). A flaky screen fails until stable.
4. **Timeout / cost** — each render has a max wall-time and a max retry budget;
   exceeding it is a recorded failure, not a silent hang.
5. **Asset isolation** — a missing font/image/CSS asset is **evidence** in the
   `asset_resolution_report`, never silently ignored. Missing assets fail the
   gate for that viewport.

---

## Section 2 — Fixed viewport matrix (mvp defaults)

| Viewport | Width × Height | Tailwind breakpoint intent |
|----------|----------------|----------------------------|
| desktop | 1440 × 900 | `lg`/`xl` layout |
| tablet | 768 × 1024 | `md` layout |
| mobile | 375 × 812 | base layout, tap targets ≥44px (FC-18 UX-09) |

States captured per viewport: `loading`, `empty`, `populated`, `error` (drive
with `?mock=`). The **populated** capture is the one that satisfies FC-18 UX-06b
as visual evidence. RTL (he) is captured as an additional state where the flow is
world-facing.

```ts
// playwright.config.ts projects encode the matrix (desktop/tablet/mobile),
// each test navigates `?mock=<state>` and screenshots into the run folder.
```

---

## Section 3 — Artifact schema (`qa_status`)

Every render run writes one artifact (JSON) per candidate screen:

```json
{
  "render_run_id": "rqa-2026-06-29-flow-29-topology-001",
  "candidate_ref": "client/src/pages/adaptive-rag/TopologyPage.tsx",
  "viewport_results": [
    {
      "viewport": "desktop",
      "state": "populated",
      "rendered_screenshot_ref": "artifacts/render-qa/rqa-…/desktop-populated.png",
      "stability": { "second_render": true, "pixel_diff_ratio": 0.004, "within_tolerance": true },
      "render_ms": 1820,
      "status": "PASS"
    }
  ],
  "asset_resolution_report": {
    "fonts_loaded": ["Inter"],
    "images_requested": 4,
    "images_resolved": 4,
    "missing_assets": []
  },
  "timeout_budget_ms": 8000,
  "qa_status": "PASS"
}
```

`qa_status` is `PASS` only when every required viewport/state rendered, every
render was stable within tolerance, no required asset is missing, and no render
exceeded the timeout budget. Otherwise `qa_status` is `FAIL` with the failing
viewport/state named. Write artifacts under `artifacts/render-qa/<render_run_id>/`
for the React/Vite build.

---

## Section 4 — Run procedure

1. Build the client (`vite build`) or run a pinned preview server.
2. For each candidate screen, for each viewport, for each state: navigate
   `?mock=<state>`, wait for deterministic ready signal, screenshot.
3. Re-render once for the stability check; compute pixel-diff ratio.
4. Collect the asset-resolution report from network responses.
5. Emit the `qa_status` artifact; fail the run on any gate breach.

Oversized capture scripts must live as a **script-file runner** under the run
folder and be executed by path (not pasted inline), with stdout/stderr and exit
code captured.

## Section 5 — Internal-authority boundary

Render-QA is a **blocking gate**, not a quality proof. A `qa_status=PASS` means
"the screen renders deterministically across resolutions with all assets" — it
does **not** mean the design is good (that is SK-560 + SK-541) and does **not**
mean a model is accurate. Do not let a green render-QA artifact stand in for
visual-craft acceptance or model evaluation.

## Section 6 — What stays in llm_mvp_core (not here)

Any trainable render/visual model — DPO triples, held-out/ablation evaluation,
checkpoints, promotion of common models — lives in `llm_mvp_core` (G12 / R5/R6).
On mvp, SK-563 is purely the evidence-layer render contract; it does not build,
train, or promote a model.
