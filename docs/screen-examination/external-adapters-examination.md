# Flow UI examination — FLOW-41/42/43/44 external adapters + Batch H sweep

## Date: 2026-04-20 · Run: RUN-62 · Batch: H (External adapters + orphan directory sweep)

## FLOW-41/42/43/44 — External vendor-SDK adapters

Per `SPEC-LOCATION-MAP-ADDENDUM-FLOW36-45.md` and confirmed by the flows'
own `UI-REFLECTION-STATE.md` files:

| Flow | Slug | Adapter | Verdict |
|------|------|---------|---------|
| FLOW-41 | canva-adapter | Canva App SDK plugin | `INTERNAL_ONLY` |
| FLOW-42 | miro-adapter | Miro SDK plugin | `INTERNAL_ONLY` |
| FLOW-43 | webflow-adapter | Webflow Designer Extension | `INTERNAL_ONLY` |
| FLOW-44 | framer-adapter | Framer plugin | `INTERNAL_ONLY` |

**All four have `INTERNAL_ONLY` verdict with 1 process each.** The "UI" for
these flows is the vendor's plugin panel rendered inside Canva / Miro /
Webflow / Framer — NOT a XIIGen React surface.

**Verified: no mis-captured PNGs exist.** `docs/e2e-snapshots/` has no
`canva-adapter/`, `miro-adapter/`, `webflow-adapter/`, or `framer-adapter/`
directories. Clean inventory state.

**Action:** no examination, no repair, no PNG capture for these four flows.
The skill file `.claude/skills/flow-ui-examination-protocol-SKILL.md`
Section 6 already documents this gate.

---

## Batch H sweep — orphan PNG directories

`docs/e2e-snapshots/` contains 5 additional directories that did NOT map to
Batches A-G. These are engine-internal admin console flows with their own
pages in `client/src/pages/{slug}/` and routes in `App.tsx` at `/admin/{slug}`.
They need basic classification even though they're out of the primary
batch taxonomy.

### adapter-ci-cd-bridge (0 PNGs)

- Page: `AdapterCiCdBridgePage.tsx` at `/admin/adapter-ci-cd-bridge`
- No e2e-snapshots yet — clean slate
- Classification: engine-internal admin CI/CD bridge for external adapters
- Grammar: G1 Progress Strip (pipeline run with step list) — reference GitHub Actions / CircleCI
- Status: PENDING first examination + PNG capture when admin sweep is run

### rag-quality-graph (13 PNGs)

- Page: `RagQualityGraphPage.tsx` at `/admin/rag-quality-graph`
- F1 intent (from `FLOW-42-STEP-1-INVARIANTS.md` or similar): RAG quality trace graph — related to FLOW-38 rag-quality-feedback
- Grammar: compound G4 Topology (trace graph) + G6 Dashboard (quality metrics)
- Reference: **LangSmith trace graph** + LangSmith dashboard
- 13 PNGs follow standard 3-group pattern (CRUD scaffold / BFA leak / state mocks)
- Status: likely AdminCrudPanel default, needs purpose-built rebuild

### meta-flow-orchestration (13 PNGs)

- Page: `MetaFlowOrchestrationPage.tsx` at `/admin/meta-flow-orchestration`
- F1 intent (derived from slug): orchestrate meta-flows across the engine — higher-level than FLOW-26 meta-flow-engine
- Grammar: G4 Topology Canvas (meta-orchestration graph)
- Reference: **Temporal UI** + **Airflow DAG**
- 13 PNGs follow 3-group pattern
- Status: likely CRUD default, needs topology-canvas rebuild

### ai-self-modification (13 PNGs)

- Page: `AiSelfModificationPage.tsx` at `/admin/ai-self-modification`
- F1 intent (derived from slug): proposals where the engine modifies its own code/flows — requires HIG approval
- Grammar: G4 Topology Canvas (proposal graph) + G2 Verdict Grid (HIG reviewer panel)
- Reference: proprietary AI-ops tools + LangSmith
- 13 PNGs follow 3-group pattern
- Status: likely CRUD default, CRITICAL — HIG gate must enforce before any
  self-modification ships

### cycle-chain-extension (14 PNGs)

- Page: `CycleChainExtensionPage.tsx` at `/admin/cycle-chain-extension`
- F1 intent (derived from slug): extend a running cycle-chain with new task types — engine self-extension
- Grammar: G1 Progress Strip (extension run) + G3 Card List (extensions history)
- Reference: **Flyway migration runner** (extension = new migration)
- 14 PNGs follow 3-group pattern
- Status: likely CRUD default, needs purpose-built rebuild

### UNKNOWN (6 PNGs)

These PNGs don't fit any slug directory:
- `banner-disappears-after-keys-provisioned-before.png` — KeyStatusBanner regression test evidence; relates to RUN-49 G1 fix
- `chat-02-submit-shows-super-judge-verdict-before.png` + `-after.png` — FLOW-46 platform-agent chat test evidence
- `provisioning-form-appears-when-configure-before.png` — KeyProvisioningForm test evidence
- `r-04-after.png` + `r-04-before.png` — unclear; possibly RUN-04 regression evidence

**Action:** relocate these to appropriate slug directories:
- banner PNGs → `c6-role-coverage/` or `key-status-banner/`
- chat PNGs → `platform-agent/`
- provisioning PNGs → `c6-role-coverage/`
- r-04 PNGs → inspect and relocate or delete if superseded

Or just delete as superseded by later PNG captures.

---

## Batch H summary

- **FLOW-41/42/43/44:** confirmed no-XIIGen-UI; no work needed.
- **5 orphan admin dirs:** briefly classified; deferred to post-all-docs code
  sweep for purpose-built rebuilds.
- **UNKNOWN/ dir:** 6 test-evidence PNGs for relocation or deletion.

**Batch A-H docs sweep is now COMPLETE.** 48 flows catalogued across 7
grammars + 1 no-UI classification + 1 orphan-dir sweep. **~980 fleet PNGs
indexed**, each tagged ✅ / 🟡 / ❌ with batch + group provenance.
