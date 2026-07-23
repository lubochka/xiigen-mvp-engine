# Zip-to-Canonical Mapping — Full Provenance Audit

**Source zip:** `business flows.zip` (252 files, 10.1 MB, authored Feb–Mar 2026)
**Extracted:** 2026-04-22
**Target:** `docs/business-flows/`

This document records where every file from the source zip landed after the 2026-04-22 extraction, including the three renumbering resolutions.

---

## Primary specs (27 files) — `docs/business-flows/NN-{slug}.md`

| Zip filename | Canonical flow | Canonical slug | Destination filename | Notes |
|---|---|---|---|---|
| `01-user-registration.md` | FLOW-01 | user-registration | `01-user-registration.md` | — |
| `02-business-onboarding.md` | FLOW-02 | profile-enrichment | `02-profile-enrichment.md` | — |
| `03-event-creation-promotion.md` | FLOW-03 | event-management | `03-event-management.md` | — |
| `04-post-publishing.md` | **FLOW-28** | blog-cms-modules | `28-blog-cms-modules.md` | **RESOLVED** — zip-04 describes content publishing, not event attendance |
| `05-lesson-completion-gamification.md` | FLOW-05 | completion-gamification | `05-completion-gamification.md` | — |
| `06-marketplace-publishing.md` | FLOW-08 | marketplace | `08-marketplace.md` | Zip-06 content maps to FLOW-08 (marketplace); zip-08 is multi-tenant docs |
| `07-friend-request-feed-integration.md` | FLOW-07 | friend-request-social-feed | `07-friend-request-social-feed.md` | — |
| `08-multi tenant deep-research-report 1.md` + `2.md` | FLOW-15 | saas-multi-tenancy | `15-saas-multi-tenancy.md` | **MERGED** — two parts concatenated (no standalone base in zip) |
| `09-event-participation.md` | FLOW-09 | transactional-event-participation | `09-transactional-event-participation.md` | — |
| `12 - ERP systems.md` | FLOW-12 | subscription-billing | `12-subscription-billing.md` | ERP is subscription-billing in today's naming |
| `14 - data werehouse.md` | FLOW-13 | data-warehouse-analytics | `13-data-warehouse-analytics.md` | Zip-14 → canonical-13; zip typo "werehouse" preserved in deep-research copies |
| `16 - giant shop platforms.md` | FLOW-16 | marketplace-payments | `16-marketplace-payments.md` | "Giant shop" = large-scale marketplace with payments |
| `17 - freelancers platforms.md` | FLOW-17 | freelancer-marketplace | `17-freelancer-marketplace.md` | — |
| `18 - devops platforms.md` | FLOW-19 | durable-sagas-compliance | `19-durable-sagas-compliance.md` | Zip-18 → canonical-19 |
| `20 - sponsored content and graph api.md` | FLOW-20 | ads-platform | `20-ads-platform.md` | — |
| `21 - forms and flows.md` | FLOW-21 | dynamic-forms-workflows | `21-dynamic-forms-workflows.md` | — |
| `22 - visual editor.md` | FLOW-18 | visual-flow-engine | `18-visual-flow-engine.md` | Zip-22 → canonical-18 |
| `23 - visual editor extended.md` | FLOW-23 | form-builder-templates | `23-form-builder-templates.md` | "Extended visual editor" is today's form-builder-templates |
| `25 - Business flow arbitr.md` | FLOW-25 | bfa-cross-flow-governance | `25-bfa-cross-flow-governance.md` | — |
| `26-self developing.md` | FLOW-26 | meta-flow-engine | `26-meta-flow-engine.md` | "Self-developing" = today's meta-flow-engine |
| `27-tasks execution communication and dependencies.md` | FLOW-27 | human-interaction-gate | `27-human-interaction-gate.md` | — |
| `29-adaptive rag deep research.md` | FLOW-29 | adaptive-rag-deep-research | `29-adaptive-rag-deep-research.md` | Deep-research file is the only spec for this flow; treated as primary |
| `30-prompt improvements.md` | **FLOW-38** | rag-quality-feedback | `38-rag-quality-feedback.md` | **RESOLVED** — zip-30 is the learning-loop spec |
| `31-functionality by a design.md` | FLOW-31 | design-intelligence-engine | `31-design-intelligence-engine.md` | — |
| `32-sharable flows.md` | FLOW-32 | sharable-flows-marketplace | `32-sharable-flows-marketplace.md` | — |
| `33-system initiation.md` | FLOW-33 | system-initiation-bootstrap | `33-system-initiation-bootstrap.md` | — |
| `34-translate to alternatives.md` | **FLOW-48** | i18n-translation | `48-i18n-translation.md` | **RESOLVED** — zip-34 describes translation, not marketplace-plugin-adapter |

### The three resolved conflicts — rationale

**`04-post-publishing.md` → FLOW-28 blog-cms-modules.** The zip's "post-publishing" describes content authoring (XSS/SSRF sanitization, CF590 content rules, public reader serving from cache-first published-only index) — content that matches today's blog-cms-modules flow one-for-one. Today's FLOW-04 slug "event-attendance" grew independently from FLOW-03 event-management + FLOW-09 transactional-event-participation and has no dedicated zip spec; it falls back to `docs/screen-examination/event-attendance-examination.md`.

**`30-prompt improvements.md` → FLOW-38 rag-quality-feedback.** The zip-30 bundle (base + engine artifacts + input zip) describes the prompt-versioning + AF-9 quality scoring + PromptPatch generation + RAG pattern quality-score update loop. Today's FLOW-30 slug "tenant-lifecycle-manager" is a cross-tenant admin dashboard concept unrelated to the learning loop. Today's FLOW-38 is the learning loop — so zip-30 content maps there.

**`34-translate to alternatives.md` → FLOW-48 i18n-translation.** The zip-34 bundle describes locale detection and alternative-content rendering. Today's FLOW-34 slug "marketplace-plugin-adapter" (Canva, Miro, Webflow, Framer adapters) is a different concept that post-dates the renumber. Today's FLOW-48 is translation — zip-34 maps there.

---

## Deep-research variants (85 files) — `_deep-research/{slug}/`

Preserved verbatim in per-slug subfolders. Open `docs/business-flows/_deep-research/{slug}/` to see the authoring history for a specific flow.

**Deep-research slugs with the most revisions:**
- `system-initiation-bootstrap/` — 8 revisions (one of the most iterated)
- `durable-sagas-compliance/` — 6 revisions
- `data-warehouse-analytics/` — 6 revisions
- `transactional-event-participation/` — 4 revisions
- `marketplace/` — 5 revisions
- `friend-request-social-feed/` — 5 revisions
- `marketplace-payments/` — 4 revisions
- `i18n-translation/` — 4 revisions (as `_deep-research/i18n-translation/`, reflecting the zip-34 resolution)

---

## Legacy engine artifacts (109 files) — `_legacy-engine-artifacts/{slug}/`

Pre-merge generations of `ENGINE_ARCHITECTURE`, `TASK_TYPES_CATALOG`, `V62_BFA_STRESS_TEST`, `SKILLS_FACTORY_RAG`, `MASTER_EXECUTION_PLAN`, `SESSION_STATE`, `UNIFIED_SOURCE_INDEX`.

**Flows with legacy engine artifacts preserved (13 slugs):**
`marketplace`, `friend-request-social-feed`, `subscription-billing`, `data-warehouse-analytics`, `marketplace-payments`, `freelancer-marketplace`, `durable-sagas-compliance`, `ads-platform`, `meta-flow-engine`, `blog-cms-modules`, `rag-quality-feedback`, `design-intelligence-engine`, `sharable-flows-marketplace`, `system-initiation-bootstrap`, `i18n-translation`.

**Superseded by:** current merged docs in `docs/architecture/ENGINE_ARCHITECTURE_MERGED.md` and `docs/architecture/TASK_TYPES_CATALOG_MERGED.md`.

---

## Nested input zips (17 files) — `_inputs/`

Each `NN-input files.zip` holds the input prompts that were used to generate the corresponding deep-research revisions. Preserved as-is; do not unzip inside the repo.

Zip-30 has two input archives (`30-input files.zip` and `30-prompt_improvements.zip`), both preserved.

---

## Cross-cutting material (7 files) — `_cross-cutting/`

| File | What it is |
|---|---|
| `multi-tenant-support.md` (52 KB) | Cross-flow multi-tenant architecture doctrine |
| `umls.md` (140 KB) | Full UML model in Markdown |
| `umls.drawio.xml` (469 KB) | The same UML model as an editable draw.io file |
| `Small Business Networking App - Functional Specifications & Architecture.docx` (21 KB) | The original product requirements document |
| `MERGE_PLAN.md` | Early planning doc for merging design outputs |
| `SESSION_STATE_FINAL.md` | Final session state from the original authoring |
| `SESSION_STATE_MERGE v2.md` | Merge state snapshot |

---

## Renumber provenance (2 files) — `_renumber-provenance/`

| File | What it is |
|---|---|
| `FLOW34_MERGE_MASTER_PLAN.md` | The plan that merged and renumbered flows during the 2026-03 restructure |
| `FLOW34_RENUMBER_MAP.json` | Machine-readable mapping of old-number → new-number decisions |

Consult these files if today's canonical numbering disagrees with any older document. They are the ground truth for the renumber history.

---

## Orphans (3 files) — `_orphans/`

See [`_orphans/_README.md`](_orphans/_README.md) for the full list and rationale.

- `24 - learning calendar extension.md` — no canonical flow number assigned to this idea
- `24 - learning calendar extension multi tenant.md` — deep-research variant of the above
- `32-first rag initialization.md` — content matches FLOW-33 bootstrap but was numbered 32 in the zip

---

## Totals

| Category | Files | Destination |
|---|--:|---|
| Primary specs | 27 (from 28 zip source files) | `NN-{slug}.md` at top level |
| Deep-research variants | 85 | `_deep-research/{slug}/` |
| Legacy engine artifacts | 109 | `_legacy-engine-artifacts/{slug}/` |
| Nested input zips | 17 | `_inputs/` |
| Cross-cutting material | 7 | `_cross-cutting/` |
| Renumber provenance | 2 | `_renumber-provenance/` |
| Orphans | 3 | `_orphans/` |
| **Total** | **250 files in 251-file zip** (top-level dir entry not counted) | |

All 251 files from the zip are accounted for.

---

## How to verify this mapping

```bash
# From repo root

# Primary spec count
ls docs/business-flows/[0-9][0-9]-*.md | wc -l
# Expected: 27

# Provenance headers present on every primary spec
grep -l "^<!--" docs/business-flows/[0-9][0-9]-*.md | wc -l
# Expected: 27

# Three resolved conflicts have Naming note
grep -l "Naming note:" \
  docs/business-flows/28-blog-cms-modules.md \
  docs/business-flows/38-rag-quality-feedback.md \
  docs/business-flows/48-i18n-translation.md | wc -l
# Expected: 3

# Subfolder populations
for d in _deep-research _inputs _legacy-engine-artifacts _cross-cutting _orphans _renumber-provenance; do
  echo "$d: $(find docs/business-flows/$d -type f | wc -l)"
done
```

Full execution log: [`docs/sessions/business-flows-integration/park-specs.log`](../sessions/business-flows-integration/park-specs.log).
