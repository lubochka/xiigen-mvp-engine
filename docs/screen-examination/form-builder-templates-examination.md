# Flow UI examination — FLOW-23 form-builder-templates

## Date: 2026-04-20 · Run: RUN-61 · Batch: G (Grammar 3 Template Gallery + Grammar 5 Builder)

## One-sentence spec (F1)
> When a user creates a form on the XIIGen form builder, save it to the
> template gallery, configure the submission pipeline, and make the form
> available for embedding.

## Roles (F3 — `ROLE-ANALYSIS-BATCH-05.md`)
- **tenant-admin (builder)** — creates templates, publishes to gallery
- **tenant-user** — picks template to instantiate a form
- **anonymous / public-mkt** — browse public templates (if templates are shareable)

## Grammar (compound)
- **G3 Card List (template gallery)** — template cards with preview thumbnail + category + use count + "Use template" CTA
- **G5 Kiosk** for builder (reuses FLOW-21 builder surface)

## Reference
**Typeform template gallery**, **Webflow templates**, **Notion template gallery**, **Canva template search**.

## Classification
- **Q1 CRUD?** 🟡 `TemplateBuilder` exists — need rendering verification.
- **Q2 Error/empty?** Empty template gallery (fresh workspace): "Browse featured templates below" + curated suggestions.
- **Q3 Engineering leak?** "Submission pipeline", "embedding" — ok for builder audience; "save as template" / "embed on your site" are plain.
- **Q4 Role-correct?** ✅ 3-role split.

**Primary finding:** 🟡 partial — template gallery layout + builder link needs verification.

## 6 existing PNGs

## Planned fixes
- **Template gallery** grid view: card per template with preview thumbnail + title + category pill + use-count + "Preview" secondary + "Use template" primary
- Search bar + category filters at top
- Preview modal: full-page-preview + "Use this template" primary
- **Builder integration**: "Save as template" CTA from FLOW-21 builder, opens modal to select category + description + visibility (private / workspace / public)
- Published templates appear in gallery with publisher badge
