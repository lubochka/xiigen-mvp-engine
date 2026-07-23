# Business Flows — What the User Wants in Each Flow

> Back to the [XIIGen project overview](../../README.md)

**Date extracted:** 2026-04-22
**Source:** `business flows.zip` — the original product playbooks, 252 files, 10.1 MB

## What this directory is

Every primary business-flow spec lives here, one per canonical flow. Each spec is the PM's original narrative answering "what does the user actually want to do in this flow?" — preserved verbatim from the source zip, with a provenance header naming its origin.

**Start here, not in the engine code.** When you're planning a flow, designing a page, or asking "what is this flow for?", the file at `NN-{slug}.md` is the product source of truth.

## How to navigate

### Top level: primary specs

`NN-{slug}.md` — one per canonical flow with a dedicated PM spec. File number and slug both match today's canonical naming (e.g., `01-user-registration.md`, `28-blog-cms-modules.md`). Open the file; the top comment block (provenance header) tells you which zip file it came from and whether the number changed during the 2026-03 renumber.

### Subfolders

- **`_deep-research/{slug}/`** — Revision rounds for each flow ("deep search", "deep search engine", "deep search multi tenant"). Authoring history, not primary. Read only if the primary spec is unclear.
- **`_legacy-engine-artifacts/{slug}/`** — Pre-merge generations of engine artifacts (ENGINE_ARCHITECTURE, TASK_TYPES_CATALOG, V62_BFA_STRESS_TEST, SKILLS_FACTORY_RAG, MASTER_EXECUTION_PLAN, SESSION_STATE, UNIFIED_SOURCE_INDEX). Superseded by today's merged docs in `docs/architecture/`. Kept for historical context.
- **`_inputs/`** — Nested zips of the input prompts used to generate each deep-research revision. Deep provenance. Unzip in-place in a `/tmp` dir if you need to look inside; don't unzip here.
- **`_cross-cutting/`** — Architecture material that applies across all flows: the UML model (`umls.md`, `umls.drawio.xml`), the original PRD (`.docx`), multi-tenant doctrine, merge plans.
- **`_orphans/`** — Zip content that doesn't map to any single canonical flow. See `_orphans/_README.md`.
- **`_renumber-provenance/`** — The FLOW-34 merge-and-renumber decision trail. Consult when today's numbering disagrees with an older document.

### Helper files at top level

- `README.md` — this file
- `ZIP-TO-CANONICAL-MAPPING.md` — full table of every zip file → destination
- `PRODUCT-STATE.md` — the product state map: what's live, half-built, designed, sketched (created by Step 2 of the integration session)

## Naming conflicts in this corpus — resolved 2026-04-22

Three zip files describe intents that no longer match their numbered slug after the 2026-03 flow renumber. The primary spec is parked under today's canonical number:

- `04-post-publishing.md` → `28-blog-cms-modules.md`
- `30-prompt improvements.md` → `38-rag-quality-feedback.md`
- `34-translate to alternatives.md` → `48-i18n-translation.md`

See `PRODUCT-STATE.md` § "Naming conflicts" for rationale. Every resolved spec carries a `Naming note:` in its provenance header explaining why it lives under a different number than its original.

## What's NOT here

- **Per-flow implementation state** — that's `docs/sessions/47-FLOW-CURRENT-STATE-MASTER.md` (aggregate) or `docs/sessions/FLOW-NN/FLOW-NN-IMPL-STATE.json` (per flow).
- **Per-flow user-intent WHO/VERB/GRAMMAR distillation** — that's `docs/screen-examination/{slug}-examination.md` (45 files).
- **The canonical flow registry** — that's `.claude/skills/flow-prep-library/planning--business-flows-registry.md`.
- **Today's merged engine documentation** — that's `docs/architecture/ENGINE_ARCHITECTURE_MERGED.md`, `TASK_TYPES_CATALOG_MERGED.md`, etc.

## How sessions should use this directory

**Planning a flow:**
1. Read `PRODUCT-STATE.md` for the product overview.
2. Open `NN-{slug}.md` for the specific flow.
3. Cross-check against `docs/screen-examination/{slug}-examination.md` for the distilled WHO/VERB/GRAMMAR.
4. Check implementation state in `docs/sessions/47-FLOW-CURRENT-STATE-MASTER.md`.

**Designing a page:**
1. Open the relevant `NN-{slug}.md` primary spec.
2. Extract user intent.
3. Apply the SK-540 product-design-context flow.

**Understanding the engine's retrieval of these specs:**
Each primary spec is chunked and seeded into `fixtures/rag-patterns/business-flows-corpus/` as `BUSINESS_FLOW_SPEC` records. See that directory's `MANIFEST.md` for the retrieval query template.
