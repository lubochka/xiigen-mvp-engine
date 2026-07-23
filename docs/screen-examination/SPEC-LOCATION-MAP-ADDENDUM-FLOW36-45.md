# SPEC LOCATION MAP — ADDENDUM: FLOW-36 through FLOW-45
## Correction to previous guidance that said these flows had no specs
## Date: 2026-04-20

---

## LUBA WAS RIGHT

FLOW-36 through FLOW-45 do have specs. They are in the same List B zip as
every other flow — `FLOW_1-47_List_B.zip / FLOW-XX /`. The previous guidance
was wrong to say these flows were undocumented.

What IS different about FLOW-36 to FLOW-45 is their category:

- **FLOW-36 to FLOW-40** — Engine-internal platform flows (feature registry,
  multi-stack porting, RAG quality, OSS curriculum, client push). These have
  STEP-1-INVARIANTS with user_intent, UI-REFLECTION-STATE with process tables,
  and DESIGN-SIMULATION-R1. Specs are complete.

- **FLOW-41, 42, 43, 44** — External adapter flows (Canva, Miro, Webflow, Framer).
  These are `INTERNAL_ONLY` by design — they live in vendor SDKs, not in the
  XIIGen client. `UI-REFLECTION-STATE.md` explicitly says "EXTERNAL_REPO — adapter
  lives in vendor SDK, no XIIGen UI." **No XIIGen screen to design for these.**

- **FLOW-45** — History Bootstrap (`history-bootstrap`). Has React components
  and processes. Specs are complete.

---

## CORRECTED SPEC TABLE: FLOW-36 TO FLOW-45

### FLOW-36 — Feature Registry

**What it does (from STEP-1-INVARIANTS):**
```
user_intent: "When the XIIGen platform evaluates a feature for porting to a new
platform, classify each FT-ID as engine-internal (portingCandidate=false) or
portable (portingCandidate=true), accumulate usage signals to detect porting
readiness, and when porting is initiated, gate it through a cost estimation and
decision pipeline."
```

**Slug:** `feature-registry`

**UI state (from UI-REFLECTION-STATE):**
- 7 processes, all PARTIAL_UI — route NOT wired in App.tsx
- React components already exist:
  - `client/src/components/feature-registry/FeatureMatrixRow.tsx`
  - `client/src/components/feature-registry/FeatureMatrixScreen.tsx`
  - `client/src/components/feature-registry/PortingProhibitedScreen.tsx`
- 0 React pages — components exist but are not mounted as pages

**What the screen should show (derived from intent + components):**
A platform-admin view showing FT records laid out as a matrix. Each row is a
feature (FT-ID). Columns show: porting candidate status (portingCandidate
true/false), current signals accumulated, cost estimate, decision status.
`PortingProhibitedScreen` is shown when portingCandidate=false and someone
tries to initiate porting.

**Real-world reference:** LaunchDarkly feature flags dashboard, Split.io.

**Primary spec files:**
```
FLOW_1-47_List_B.zip / FLOW-36 / FLOW-36-STEP-1-INVARIANTS.md
FLOW_1-47_List_B.zip / FLOW-36 / UI-REFLECTION-STATE.md
FLOW_1-47_List_B.zip / FLOW-36 / FLOW-36-DESIGN-SIMULATION-R1.md
FLOW_1-47_List_B.zip / FLOW-36 / FLOW-36-IMPLEMENTATION-PLAN-v1.md
```

---

### FLOW-37 — Design System Governance (Multi-Stack Porting / Engine Self-Awareness)

**What it does (from STEP-1-INVARIANTS):**
```
user_intent: "When the XIIGen engine plans a genesis prompt for a task type,
apply the coupling taxonomy (CONCEPT_NEUTRAL / IMPL_VARIES / STACK_COUPLED /
INCOMPATIBLE) to each element across the 10 coupling dimensions, substitute
stack-specific implementation patterns for IMPL_VARIES stacks, provide
compatibility reporting for unsupported stacks."
```

**Slug:** `design-system-governance`

**UI state (from UI-REFLECTION-STATE):**
- 5 processes: T590-StackCouplingAuditor (PARTIAL), T591-HybridGenesisPromptBuilder
  (INTERNAL_ONLY), T592-StackCompatibilityReporter (PARTIAL), T593-StackPortingOrchestrator
  (PARTIAL), design-system-governance-cluster (NO_UI)
- Components exist: `StackPortingScreen.tsx`, `StackCouplingBadge.tsx`,
  `CompatibilityReportCard.tsx`, `PortingStatusTag.tsx`
- Route NOT wired in App.tsx for any component

**What the screen should show:**
Platform-admin view. Three sections:
1. Stack coupling audit — a grid showing each task type dimension vs coupling level
   (CONCEPT_NEUTRAL / IMPL_VARIES / STACK_COUPLED / INCOMPATIBLE) with colour badges.
2. Compatibility report — which target stacks are compatible/incompatible for a
   given task type, with reasons.
3. Porting orchestration status — current porting jobs, their status, progress strips.

**Primary spec files:**
```
FLOW_1-47_List_B.zip / FLOW-37 / FLOW-37-STEP-1-INVARIANTS.md
FLOW_1-47_List_B.zip / FLOW-37 / UI-REFLECTION-STATE.md
FLOW_1-47_List_B.zip / FLOW-37 / FLOW-37-DESIGN-SIMULATION-R1.md
```

---

### FLOW-38 — RAG Quality Feedback (Learning Loop)

**What it does (from STEP-1-INVARIANTS):**
```
user_intent: "When a generation round completes and a DPO triple is stored,
automatically update the qualityScore of each RAG pattern that was retrieved
during that round using the cycle outcome (SUCCESS_WITHIN_BUDGET or
WASTED_CYCLE) as the learning signal, so that future context package
assemblies retrieve higher-quality patterns."
```

**Slug:** `rag-quality-feedback`

**UI state (from UI-REFLECTION-STATE):**
- 5 processes: DpoToRagPromoter (PARTIAL), CycleOutcomeClassifier (PARTIAL),
  DistilledRuleExtractor (PARTIAL), RagQualityUpdater (INTERNAL_ONLY),
  RagQualitySeedsService (INTERNAL_ONLY)
- Components: `RagQualityScreen.tsx`, `DistilledRuleCard.tsx`
- Route NOT wired in App.tsx

**What the screen should show:**
Platform-admin monitoring view. Shows the quality learning loop in action:
- RAG pattern cards with current qualityScore, trend (improving/degrading), and
  usage count
- Recent DPO triple promotions — which patterns were updated and by how much
- Distilled rules extracted — plain-English rule cards derived from accumulated
  DPO triples
- Cycle outcome log — list of recent generation rounds with SUCCESS/WASTED verdict

**Primary spec files:**
```
FLOW_1-47_List_B.zip / FLOW-38 / FLOW-38-STEP-1-INVARIANTS.md
FLOW_1-47_List_B.zip / FLOW-38 / UI-REFLECTION-STATE.md
FLOW_1-47_List_B.zip / FLOW-38 / FLOW-38-DESIGN-SIMULATION-R1.md
```

---

### FLOW-39 — OSS Curriculum / Local Model Teaching Pipeline

**What it does (from STEP-1-INVARIANTS):**
```
user_intent: "When a DPO triple is created for a task type, automatically assign
curriculumTier based on the task type's archetype (ROUTING=Tier 1,
DATA_PIPELINE=Tier 2, PROCESSING=Tier 3, ORCHESTRATION=Tier 4, SCHEDULED=Tier 5),
run a shadow comparison of the winning NODE against the local model, and accumulate
learning signals for model improvement."
```

**Slug:** `oss-curriculum`

**UI state (from UI-REFLECTION-STATE):**
- 4 processes: T597-OssCurriculumOrchestrator (PARTIAL), T598-OssShadowRunner (PARTIAL),
  T599-LearningSignalAggregator (PARTIAL), T600-DpoCorpusBuilder (INTERNAL_ONLY)
- Components: `OssCurriculumScreen.tsx`, `CurriculumTierBadge.tsx`,
  `ShadowRunStatusCard.tsx`
- Route NOT wired in App.tsx — this is one of the 5 Potemkin UI flows in CFI-05

**What the screen should show:**
Platform-admin view showing the local model training curriculum:
- Curriculum tier breakdown — how many DPO triples per tier (Tier 1 ROUTING through
  Tier 5 SCHEDULED), shown as a distribution chart
- Shadow run dashboard — active shadow comparisons: which task type, winning model
  (local vs external), gap score
- Learning signal accumulation — which archetypes are accumulating enough signal
  to trigger a model update
- DPO corpus size per tier — readiness indicator for each tier

**Primary spec files:**
```
FLOW_1-47_List_B.zip / FLOW-39 / FLOW-39-STEP-1-INVARIANTS.md
FLOW_1-47_List_B.zip / FLOW-39 / UI-REFLECTION-STATE.md
FLOW_1-47_List_B.zip / FLOW-39 / FLOW-39-DESIGN-SIMULATION-R1.md
```

---

### FLOW-40 — Client Push Infrastructure (SSE)

**What it does (from STEP-1-INVARIANTS):**
```
user_intent: "When clients connect to wait for long-running flow steps, accept
SSE connections authenticated by tenantId and correlationId, register each
connection in ISseConnectionPool, push real-time events when flow state changes
(email.verified, verification.expired, onboarding.step.N), send keepalive pings,
and gracefully clean up on disconnect."
```

**Slug:** `client-push`

**UI state (from UI-REFLECTION-STATE):**
- 3 processes: T587-ClientPushSseGateway (PARTIAL), T588-ClientPushKeepalive (PARTIAL),
  T589-ClientPushEventDispatcher (PARTIAL)
- Components: `ClientPushScreen.tsx`, `SseConnectionStatusBadge.tsx`,
  `EventDeliveryTag.tsx`
- Endpoint: `GET /api/client-push/stream`
- Route NOT wired in App.tsx

**What the screen should show:**
Platform-admin / platform-support view. This is an SSE connection monitor:
- Active SSE connections table — tenantId, correlationId, connected at, last event,
  connection state (CONNECTED / KEEPALIVE / DISCONNECTING)
- Event delivery log — recent events pushed per connection, with delivery confirmation
- Connection health metrics — connections/min, avg lifetime, keepalive rate
- Tenant-user branch: NOT a monitoring screen — for tenant users this is invisible
  infrastructure. The ClientPushScreen is an admin debug tool, not a user feature.

**Primary spec files:**
```
FLOW_1-47_List_B.zip / FLOW-40 / FLOW-40-STEP-1-INVARIANTS.md
FLOW_1-47_List_B.zip / FLOW-40 / UI-REFLECTION-STATE.md
FLOW_1-47_List_B.zip / FLOW-40 / FLOW-40-DESIGN-SIMULATION-R1.md
```

---

### FLOW-41 — Canva Text Elements Adapter

**What it does:** External Canva App SDK adapter. Ports XIIGen text element pipeline
to Canva's plugin environment.

**UI-REFLECTION-STATE verdict:** `INTERNAL_ONLY — EXTERNAL_REPO — adapter lives in
vendor SDK, no XIIGen UI`

**XIIGen screen needed:** NO. This flow has no XIIGen client UI. The "screen" is the
Canva plugin panel itself — rendered inside Canva's environment, not in XIIGen's React
app. Any PNG showing a XIIGen page for FLOW-41 is wrong by definition.

**Primary spec files:**
```
FLOW_1-47_List_B.zip / FLOW-41 / FLOW-41-STEP-1-INVARIANTS.md  (adapter constraints)
FLOW_1-47_List_B.zip / FLOW-41 / ADAPTER-CICD-BRIDGE-DESIGN.md  (CI/CD bridge design)
FLOW_1-47_List_B.zip / FLOW-41 / C5-PIPELINE-ADAPTATION.md      (Canva-specific pipeline)
```

---

### FLOW-42 — Miro Adapter

**UI-REFLECTION-STATE verdict:** `INTERNAL_ONLY — EXTERNAL_REPO`
**XIIGen screen needed:** NO. Same as FLOW-41.

---

### FLOW-43 — Webflow Designer Extension

**UI-REFLECTION-STATE verdict:** `INTERNAL_ONLY — EXTERNAL_REPO`
**XIIGen screen needed:** NO. Same as FLOW-41.

---

### FLOW-44 — Framer Component Namer Adapter

**UI-REFLECTION-STATE verdict:** `INTERNAL_ONLY — EXTERNAL_REPO`
**XIIGen screen needed:** NO. Same as FLOW-41.

---

### FLOW-45 — History Bootstrap

**What it does (from STEP-1-INVARIANTS):**
Slug: `history-bootstrap`. Bootstraps the RAG history index by seeding architectural
patterns from past sessions, ingesting architecture decision patterns, and digesting
platform philosophy documents into the knowledge graph.

**UI state (from UI-REFLECTION-STATE):**
- 3 processes: T602-HistoryBootstrapSeeder (PARTIAL), T603-ArchPatternIngester (PARTIAL),
  T604-PhilosophyDigestor (PARTIAL)
- Components: `HistoryBootstrapScreen.tsx`, `BootstrapStatusBadge.tsx`,
  `PhilosophySummaryRow.tsx`
- Hook: `useBootstrapStatus.ts`
- Route NOT wired in App.tsx

**What the screen should show:**
Platform-admin view. Bootstrap is a one-time or periodic maintenance operation:
- Bootstrap progress strip: COLD → SEEDING → ARCH_PATTERNS_INGESTED → PHILOSOPHY_DIGESTED → WARM
  (Grammar 1 — Progress Strip)
- Per-phase detail: how many patterns/documents ingested, time elapsed
- PhilosophySummaryRow: shows which philosophy documents were digested and their
  distilled key principles (plain English, not internal IDs)
- Re-run button for maintenance (with confirmation dialog — this is destructive)

**Real-world reference:** Database migration runners (Flyway, Liquibase), Elasticsearch
index rebuild status pages.

**Primary spec files:**
```
FLOW_1-47_List_B.zip / FLOW-45 / FLOW-45-STEP-1-INVARIANTS.md
FLOW_1-47_List_B.zip / FLOW-45 / UI-REFLECTION-STATE.md
FLOW_1-47_List_B.zip / FLOW-45 / FLOW-45-DESIGN-SIMULATION-R1.md
```

---

## THE COMPLETE CORRECTED SOURCE TABLE (all flows, final)

| Flow | Slug | Has XIIGen UI? | Primary spec source | Category |
|------|------|---------------|---------------------|----------|
| FLOW-01 | user-registration | YES | `FLOW-01/FLOW-01-STEP-1-INVARIANTS.md` | Tenant-facing |
| FLOW-02 | business-onboarding | YES | `FLOW-02/FLOW-02-STEP-1-INVARIANTS.md` | Tenant-facing |
| FLOW-03 | event-creation | YES | `FLOW-03/FLOW-03-STEP-1-INVARIANTS.md` | Tenant-facing |
| FLOW-04 | post-publishing | YES | `FLOW-04/FLOW-04-STEP-1-INVARIANTS.md` | Tenant-facing |
| FLOW-05 | lesson-completion | YES | `FLOW-05/FLOW-05-STEP-1-INVARIANTS.md` | Tenant-facing |
| FLOW-06 | marketplace | YES | `FLOW-06/FLOW-06-STEP-1-INVARIANTS.md` | Tenant-facing |
| FLOW-07 | friend-request | YES | `FLOW-07/FLOW-07-STEP-1-INVARIANTS.md` | Tenant-facing |
| FLOW-09 | event-participation | YES | `FLOW-09/FLOW-09-STEP-1-INVARIANTS.md` | Tenant-facing |
| FLOW-10 | shops | YES | `FLOW-10/FLOW-10-STEP-1-INVARIANTS.md` | Tenant-facing |
| FLOW-11 | social-network | YES | `FLOW-11/FLOW-11-STEP-1-INVARIANTS.md` | Tenant-facing |
| FLOW-12 | billing | YES | `FLOW-12/FLOW-12-STEP-1-INVARIANTS.md` | Tenant-facing |
| FLOW-13 | finance | YES | `FLOW-13/FLOW-13-STEP-1-INVARIANTS.md` | Tenant-facing |
| FLOW-14..17 | various | YES | `FLOW-XX/FLOW-XX-STEP-1-INVARIANTS.md` | Tenant-facing |
| FLOW-18 | visual-flow-engine | YES | `FLOW-18/FLOW-18-STEP-1-INVARIANTS.md` | Tenant-facing |
| FLOW-19..35 | various | YES | `FLOW-XX/FLOW-XX-STEP-1-INVARIANTS.md` | Platform/Tenant |
| FLOW-36 | feature-registry | YES | `FLOW-36/FLOW-36-STEP-1-INVARIANTS.md` | Platform-admin |
| FLOW-37 | design-system-governance | YES | `FLOW-37/FLOW-37-STEP-1-INVARIANTS.md` | Platform-admin |
| FLOW-38 | rag-quality-feedback | YES | `FLOW-38/FLOW-38-STEP-1-INVARIANTS.md` | Platform-admin |
| FLOW-39 | oss-curriculum | YES | `FLOW-39/FLOW-39-STEP-1-INVARIANTS.md` | Platform-admin |
| FLOW-40 | client-push | YES (admin monitor) | `FLOW-40/FLOW-40-STEP-1-INVARIANTS.md` | Platform-admin |
| FLOW-41 | canva-adapter | **NO** — external SDK | `FLOW-41/ADAPTER-CICD-BRIDGE-DESIGN.md` | External adapter |
| FLOW-42 | miro-adapter | **NO** — external SDK | `FLOW-42/FLOW-42-STEP-1-INVARIANTS.md` | External adapter |
| FLOW-43 | webflow-adapter | **NO** — external SDK | `FLOW-43/FLOW-43-STEP-1-INVARIANTS.md` | External adapter |
| FLOW-44 | framer-adapter | **NO** — external SDK | `FLOW-44/FLOW-44-STEP-1-INVARIANTS.md` | External adapter |
| FLOW-45 | history-bootstrap | YES | `FLOW-45/FLOW-45-STEP-1-INVARIANTS.md` | Platform-admin |
| FLOW-46..47 | various | YES | `FLOW-XX/FLOW-XX-STEP-1-INVARIANTS.md` | Platform |

**All files are in:** `FLOW_1-47_List_B.zip / FLOW-XX /`
**Repository path:** `docs/sessions/FLOW-XX/`

---

## KEY FINDING: THE POTEMKIN UI PROBLEM (CFI-05)

FLOW-36, 37, 38, 39, 40, and 45 all share the same critical failure:

```
Route registered in App.tsx: False
```

The React components EXIST in the codebase. They were built. But they are not
mounted as pages in the router. A user (or a Playwright spec) cannot navigate
to them. The PNGs for these flows either show a 404, show the wrong page, or
were captured using a direct component mount in the spec — not via the actual
application route.

This is documented in `XIIGEN-SESSION-LOAD-PLAN-v30.md` as **CFI-05**:
"5 flows (FLOW-37, 38, 39, 40, 45) with Potemkin UI (React pages not routed
in App.tsx)."

**The fix for all six flows:**
Add routes to `client/src/App.tsx` for each flow's slug before running any
Playwright spec. Without the route, the PNG evidence is meaningless.

```
/feature-registry        → FeatureMatrixScreen
/design-system-governance → StackPortingScreen
/rag-quality             → RagQualityScreen
/oss-curriculum          → OssCurriculumScreen
/client-push             → ClientPushScreen (admin only)
/history-bootstrap       → HistoryBootstrapScreen
```

---

## END OF ADDENDUM
