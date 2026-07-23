# GUIDE-B46 — How to Produce Client Screen Specification Sections
## Within `FLOW-XX-DESIGN-SIMULATION-R1.md`
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 56 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-20

---

## FINAL GOAL (re-read before authoring any client screen specification):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

This file guides how to produce the **client screen specification sections** that
appear within `FLOW-XX-DESIGN-SIMULATION-R1.md` for flows that have CLIENT-archetype
task types (e.g., T656 AgentChatClient, T-[+N] ReviewPage). These sections define
what the React page renders, what API it calls, which components it reuses, and what
role matrix governs its visibility.

---

## WHAT THIS GUIDANCE COVERS

Client screen sections are **not a separate file** — they appear as task type entries
within the DESIGN-SIMULATION-R1.md for any task type whose archetype ends in `—CLIENT`
(e.g., `ROUTING — CLIENT`, `ATTENDANCE — CLIENT`).

**Position in the design simulation document:**
```
[Server task types: T650-T655 as ORCHESTRATION/ROUTING/PROCESSING...]
↓
## T656 — AgentChatClient (ROUTING — CLIENT)  ← this guidance covers this section
  #### PROMPT       — constraints + step
  #### CONNECTIONS  — receives/invokes/renders/reuses
  #### ARBITERS     — 5-arbiter panel (ROUTING minimum)
  #### EXAMPLES     — chosen + rejected + why
```

**When this section exists:** Only flows that introduce new user-visible React pages
get client task type entries. If a flow is entirely server-side (no new pages), no
client section exists and this guidance declares "No CLIENT task types — section N/A."

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-14 | PRIMARY | `src/ui-ux-pro-max/data/ui-reasoning.csv` — 53KB, per product-type UI patterns: Recommended_Pattern, Style_Priority, Color_Mood, Decision_Rules, Anti_Patterns. For SaaS admin flows use row 1 (SaaS General): Glassmorphism + Flat Design, trust blue, professional hierarchy |
| ZIP-14 | PRIMARY | `src/ui-ux-pro-max/data/landing.csv` — landing page layout patterns: Hero+Features+CTA, section order, CTA placement, color strategy |
| ZIP-14 | REFERENCE | `cli/assets/data/products.csv` — product showcase patterns for flows with marketplace/discovery screens |
| ZIP-14 | REFERENCE | `.claude/skills/design-system/references/component-specs.md` — Button/Badge/Card/Table/Progress component specs with exact sizes and states |
| ZIP-15 | PRIMARY (§2) | `XIIGEN-ROLE-SCREEN-ARCHITECTURE-GUIDE.md` §2 — Screen Visibility Matrix format: which roles see which screens |
| ZIP-15 | PRIMARY (§3) | §3 — 5 structural templates (RBAC Hierarchy, Two-Sided Marketplace, Approval Chain, Platform Operator, Human Gate): determines which roles get which screen variant |
| ZIP-15 | PRIMARY (§5) | §5 — Visibility Mechanism Levels: which Level (1=Route, 2=Screen, 3=Panel, 4=Field) applies per screen element |
| ZIP-17 | PRIMARY | `FLOW-46/FLOW-46-DESIGN-SIMULATION-R1.md` §T656 — canonical CLIENT task type section: CONSTRAINTS block with MACHINE rules + QUESTION YOURSELF, STEP block, CONNECTIONS block (receives from/invokes/receives response/renders left+right panel/reuses), ARBITERS (5 total), EXAMPLES (chosen/rejected/why) |
| ZIP-17 | PRIMARY | `docs/ux-review/UX-REVIEW-ROLLUP.md` — **FP-1 evidence**: 29 of 47 flows are 🚫 not representative due to CRUD_FALLBACK instead of domain screens. Among blockers: 14/14 PNGs byte-identical for marketplace; `ads-platform` actively broken. Rule: TENANT_FACING and PUBLIC flows MUST have ≥1 DOMAIN_SCREEN per role |

---

## WHEN TO ADD A CLIENT SCREEN SECTION

Add a CLIENT task type section in the design simulation when:

1. The flow introduces a **new React page** at a new route (e.g., `/chat`, `/events/:id`)
2. The flow introduces a **new React component** that tenant users interact with
3. A task type is explicitly marked with archetype ending in `— CLIENT`
4. The implementation plan's Phase B or D mentions client file creation

**Do NOT add a client section when:**
- The flow only modifies existing pages (no new task type needed)
- The flow is engine-internal only (ADMIN-only config, no tenant interaction)
- All UI work is a pure extension of an existing component without new business logic

---

## STEP 0 — EXAMINATION RECORD + DESIGN CONTEXT (NEW — run before classification gate)

Before applying the domain-screen classification gate, check whether this flow
already has an examination record and design context:

```bash
# Step 0a — Check examination record (38 flows already examined)
cat docs/screen-examination/{slug}-examination.md 2>/dev/null | head -30
# If present: Grammar type and user intent are pre-declared ground truth.
#   Extract: Grammar (G1-G7), WHO, VERB, planned fixes. Use these as inputs
#   to the classification gate below — do not re-derive.

# Step 0b — Check design context file
cat docs/design-context/{slug}/.impeccable.md 2>/dev/null | head -10
# If present: SK-540 already ran. Grammar type is declared. Skip to classification gate.
# If absent: load SK-542 → SK-540 to produce .impeccable.md before continuing.

# Step 0c — Confirm grammar type from registry
grep -A 3 "FLOW-{XX}\|{slug}" planning--business-flows-registry.md 2>/dev/null
# Registry pre-declares G1-G7 for every flow. Use to confirm examination record grammar.
```

**Grammar type drives the entire screen specification:**

| Grammar | User's question | Real-world reference | Key XIIGen flows |
|---------|-----------------|---------------------|-----------------|
| G1 PROGRESS_STRIP | "Where is this in its lifecycle?" | Vercel deploy, GitHub Actions | FLOW-00, 11, 14, 19, 33, 39, 45, 47 |
| G2 VERDICT_GRID | "What did each evaluator decide?" | Linear review, PR diff | FLOW-24(mod), 25, 27, 35, 37 |
| G3 CARD_LIST | "Which items need attention?" | Trello, Stripe invoice list | FLOW-06..08, 10, 12, 16, 17, 20, 28, 32, 36, 40 |
| G4 TOPOLOGY_CANVAS | "How do the parts connect?" | n8n, Zapier, Retool | FLOW-18, 26, 29, 34 |
| G5 KIOSK | "I have one task" | Stripe Checkout, Typeform | FLOW-01..05, 09, 22, 24(report) |
| G6 DASHBOARD | "What are my key metrics?" | Stripe Dashboard, Datadog | FLOW-13, 20(admin), 30, 31, 38 |
| G7 SETTINGS_TABS | "Which setting do I need?" | Notion settings, Vercel project | FLOW-15, 21, 23, 48 |

Reference: `docs/screen-examination/MARKET-REFERENCE-CATALOG.md` — per-grammar
real-world platform references and per-state rendering conventions.

CFI-12 halt: FLOW-04/09/34 have stale F1 spec docs. Do not specify client screens
for these flows until Luba confirms the correct direction.

---

## THE DOMAIN SCREEN CLASSIFICATION GATE (REQUIRED — FP-1)

**Before specifying any client screen**, classify it as DOMAIN_SCREEN or CRUD_FALLBACK.
This classification must appear at the top of every CLIENT task type section.

```markdown
### Screen Classification Gate (C31/FP-1 required)

Classification: DOMAIN_SCREEN | CRUD_FALLBACK

DOMAIN_SCREEN criteria (all must be true):
  ✅ Shows flow-specific business states beyond generic CRUD
  ✅ Has ≥1 business-phase-specific visual state (not just "loading" → "table")
  ✅ Presents domain concepts (not generic record IDs or raw JSON)
  ✅ Role matrix produces visibly different output for at least 2 roles

CRUD_FALLBACK criteria (any makes it CRUD_FALLBACK):
  ❌ Shows a generic admin table/form identical to any other flow's admin table
  ❌ Cannot produce a business-phase-specific visual state
  ❌ Only shows data that would render identically for any flow's records

Rule: A TENANT_FACING or PUBLIC flow MUST have ≥1 DOMAIN_SCREEN per role.
If this screen is CRUD_FALLBACK AND no other screen provides DOMAIN_SCREEN for this
role: flag as BLOCKER and describe the missing domain screen.
```

**Evidence from UX-REVIEW-ROLLUP:** 29 of 47 flows were rated 🚫 not representative.
The dominant pattern: flows that generate a generic admin table and screenshot it
14-20 times producing byte-identical PNGs. The marketplace flow had all 14 PNGs
byte-identical with "No bootstrap records." This classification gate prevents this
at design time.

---

## THE CLIENT SECTION STRUCTURE

Each CLIENT task type section in the design simulation follows the same structure
as server task type sections — PROMPT/CONNECTIONS/ARBITERS/EXAMPLES — with these
client-specific additions:

```markdown
### T[NNN] — [ComponentName] ([ARCHETYPE] — CLIENT)

#### Screen Classification Gate (C31/FP-1 required)
Classification: [DOMAIN_SCREEN | CRUD_FALLBACK]
[Evidence or BLOCKER flag if CRUD_FALLBACK + no domain alternative]

#### PROMPT

**System:**
```
CONSTRAINTS:
1. MACHINE: [specific reuse constraint — what existing components must be used]
   Reason: [which AD or GE principle this enforces]

2. MACHINE: [specific API shape constraint — how the payload matches server shape]
   Reason: [why shape consistency matters]

3. MACHINE: [specific routing constraint — where the page lives in nav]
   Reason: [which routing AD]

[Add 1-2 more constraints as flow-specific requirements emerge]

QUESTION YOURSELF:
1. Single responsibility? ([what single thing this page does])
2. All constraints reflected?
3. Failure modes? ([loading fail, empty state, server error])
4. Technology names? ([are you using domain terms not framework names])
```

**User:**
```
STEP: [Imperative sentence describing the client page's core action]

UPSTREAM CONTEXT: [What the server returns that this page renders]

PRIOR NODES: [server endpoint or service this calls]
RAG: [relevant RAG pattern IDs for client patterns]
```

#### CONNECTIONS

```
Receives from: [user interaction — keyboard input, route navigation, etc.]
  { [input fields] }

Invokes: [HTTP method + route] via apiClient
  { [request payload shape] }

Receives response: { [response fields] }

Client-side writes: [React state updates triggered by response]

Renders:
  [Panel 1 label]: [what this panel shows — existing or new component]
  [Panel 2 label]: [what this panel shows]

Tenant interaction:
  [User action 1] → [resulting event/state change]
  [User action 2] → [resulting event/state change]

Reuses: [list of existing components, hooks, utilities — critical to prevent AD violations]
```

#### Role Matrix (ZIP-15 §2 + §3)

```
Structural template: [Template 1-5 from ZIP-15 §3]

| Role | Sees this screen? | Screen variant | Level |
|------|-------------------|----------------|-------|
| ROLE-0 (anonymous) | No | 403 / redirect | Level 1 — route guard |
| ROLE-1 (authenticated) | Yes | [what they see] | Level 2 — screen |
| ROLE-PLATFORM-ADMIN | Yes (admin path) | [admin variant] | Level 2 — screen |
| [Flow-specific role] | [Yes/No] | [variant] | [Level] |

INTERNAL_ONLY check: [which elements on this page, if any, are INTERNAL_ONLY?]
```

#### ARBITERS — [N] total

*Note: Client task types use the same arbiter structure as server task types.
ROUTING — CLIENT minimum: 5 arbiters (Role 8 goal_delivery + scope_isolation +
Business Logic + Key Principles + Iron Rules).*

**Role 8 goal_delivery:** PASS if T[NNN] advances [which GE goals from session start].

**scope_isolation:** [how tenant data is isolated in client-side state]

**Business Logic:**
```
BLOCK if: [what constitutes a business logic violation in the client]
PASS if: [what constitutes correct implementation]
```

**Key Principles:**
```
[P1 multi-tenant]: [how this applies to client code]
DNA-3: N/A (client — React components do not use DataProcessResult)
```

**Iron Rules:**
```
IR-[N]: [specific client constraint from the design]
```

#### EXAMPLES

**POSITIVE (chosen — [model] round [N], score [X.XX]):**
```json
{
  "constraints": [
    "[first constraint example from positive implementation]",
    "[second constraint]"
  ]
}
```

**NEGATIVE (rejected — [model] round [N], score [X.XX]):**
```json
{
  "constraints": [
    "[what the bad implementation did — usually: added unnecessary component, wrong API shape]"
  ]
}
```

**Why rejected:**
```
[One sentence: which constraint was violated and why it matters]
```
```

---

## ZIP-14 UI-REASONING.CSV — CLIENT SCREEN STYLE GUIDANCE

For each CLIENT task type, select the appropriate UI pattern from `ui-reasoning.csv`:

| Flow context | ui-reasoning row | Pattern | Notes |
|--------------|-----------------|---------|-------|
| SaaS admin dashboard | Row 1: SaaS General | Hero + Features + CTA | Professional hierarchy, trust blue |
| Marketplace tenant screen | Row 3: E-commerce | Feature-Rich Showcase | Vibrant, card hover lift |
| B2B service admin | Row 5: B2B Service | Conservative + Feature-Heavy | Navy primary |
| AI / agent interface | Row 18: AI/Chatbot Platform | Conversational + Modern | AI purple + cyan |
| Analytics-heavy screen | Row 7: Analytics Dashboard | Data-dense + Card Grid | Blue data + amber highlights |

The `Decision_Rules` column in `ui-reasoning.csv` provides conditional switching logic:
```
if_ux_focused → switch to Motion-Driven style
if_price_listed → Hero + Trust + Social Proof pattern
if_luxury → switch to Clean Minimal
```

Apply these rules to select the correct `Style_Priority` for the client screen before
writing the CONSTRAINTS block.

---

## ZIP-15 §2 SCREEN VISIBILITY MATRIX FORMAT

For every CLIENT screen, include a role matrix using the ZIP-15 §2 format:

```
Screen × Role Visibility Matrix for [Page name]:

| Screen | ROLE-0 | ROLE-1 | ROLE-TENANT-ADMIN | ROLE-PLATFORM-ADMIN | [Flow role] |
|--------|--------|--------|-------------------|---------------------|-------------|
| /chat | 403 | ✅ Full | ✅ Full | ✅ Admin overlay | — |
| Agent Sessions tab | — | — | ✅ Admin tab | ✅ Full | — |
```

**Template selection (ZIP-15 §3):**
- Flows with platform admin + tenant admin: **Template 4 (Platform Operator Stack)**
- Flows with creator + viewer: **Template 1 (5-Tier RBAC Hierarchy)**
- Flows with buyer + seller: **Template 2 (Two-Sided Marketplace)**
- Flows with approval workflow: **Template 3 (Approval Chain)**
- Flows with human gate actors: **Template 5 (Human Gate Actor)**

---

## HOW TO PRODUCE THE CLIENT SECTION

### Step 1 — Identify CLIENT task types

```bash
# Find task types marked as CLIENT archetype in contracts
grep -n "CLIENT\|client.*archetype\|archetype.*CLIENT" \
  server/src/engine-contracts/[slug]-contracts.ts | head -10
```

### Step 2 — Classify each screen

For each CLIENT task type, apply the Domain Screen Classification Gate:
- Read the flow spec to understand what business state the page shows
- Check UX-REVIEW-ROLLUP for this flow's verdict — does it have domain screens?
- If the spec describes only a list view of records: CRUD_FALLBACK
- If the spec describes business-phase-specific states (e.g., ticket purchase → confirmed): DOMAIN_SCREEN

### Step 3 — Select UI pattern from ui-reasoning.csv

Match the flow's product type to the appropriate `ui-reasoning.csv` row to determine
Style_Priority and color approach for the CONSTRAINTS block.

### Step 4 — Write the CONSTRAINTS block

From the design simulation's prior nodes and the flow spec:
- MACHINE constraint 1: what existing components MUST be reused (references an AD)
- MACHINE constraint 2: API shape alignment with server endpoint
- MACHINE constraint 3: routing and nav placement
- QUESTION YOURSELF: single responsibility + constraints + failure modes + tech names

### Step 5 — Write the CONNECTIONS block

The CONNECTIONS block is the most critical section. It must explicitly list:
- What the page receives from user interaction
- What API endpoint it calls (method + route)
- What it receives in response
- What React state it writes
- What it renders (left panel / right panel / etc.)
- What tenant interactions trigger what events
- What existing components it REUSES (to enforce AD constraints)

### Step 6 — Apply the Role Matrix

Using ZIP-15 §2 format, declare which roles see which screen and at what visibility level.
Every client screen must have this matrix — even if all authenticated roles see the same screen.

---

## ACCEPTANCE CRITERIA FOR CLIENT SCREEN SECTIONS

Before a CLIENT task type section is considered complete:

- [ ] Screen Classification Gate present with DOMAIN_SCREEN or CRUD_FALLBACK verdict
- [ ] CRUD_FALLBACK + no domain alternative → BLOCKER flag with description of missing screen
- [ ] PROMPT has CONSTRAINTS block (MACHINE rules with reasons) + QUESTION YOURSELF
- [ ] CONNECTIONS block has all 6 sub-fields: receives from, invokes, receives response, client-side writes, renders, reuses
- [ ] Role Matrix present (ZIP-15 §2 format with template identified from §3)
- [ ] INTERNAL_ONLY check in Role Matrix
- [ ] ARBITERS — minimum 5 for ROUTING—CLIENT: Role 8 + scope_isolation + BL + Principles + Iron Rules
- [ ] EXAMPLES: one positive + one negative + why rejected
- [ ] REUSES list in CONNECTIONS is explicit (not "uses existing components")

---

## KEY RULES

**1. The Domain Screen Classification Gate is mandatory — no exceptions.**
29 of 47 flows in the fleet are rated 🚫 not representative because they produced
CRUD tables instead of domain screens. The classification gate catches this at
design time, before any code is written.

**2. The REUSES list in CONNECTIONS is the most important anti-over-engineering guard.**
The FLOW-46 T656 example explicitly lists: "FlowLibraryPage row component, TopologyViewer,
existing apiClient, existing pendingActions state machine." This prevents the rejected
pattern where a model creates an `AgentApprovalQueue` component when the existing
`pendingActions` protocol already handles it (AD-4 / AD-10 violation).

**3. DNA-3 is N/A for all client task types.**
Client React components do not use `DataProcessResult<T>`. The DNA-3 annotation must
explicitly state "N/A (client)" rather than being silently omitted — omission could
be confused with a gap.

**4. The API payload shape must mirror the server endpoint shape.**
The MACHINE constraint in the PROMPT block always includes a constraint that the
client payload matches the server controller's expected shape. This prevents shape
drift between client and server that causes runtime type errors.

**5. ui-reasoning.csv selection drives the visual design direction.**
The Style_Priority from the appropriate ui-reasoning.csv row should be reflected in
the component constraints. An AI-platform flow should reference the "AI/Chatbot"
row's conversational + modern style, not the generic SaaS admin style.

---

*End of GUIDE-B46 — Client Screen Specification Sections in DESIGN-SIMULATION-R1.md*
*List A sources: ZIP-14 (ui-reasoning.csv — product-type UI patterns,*
*landing.csv — layout patterns, products.csv — product showcase, component-specs.md),*
*ZIP-15 §2 (Screen Visibility Matrix), §3 (5 structural templates), §5 (visibility levels),*
*ZIP-17 (FLOW-46 DESIGN-SIMULATION-R1.md §T656 — canonical CLIENT section,*
*UX-REVIEW-ROLLUP.md — FP-1 CRUD_FALLBACK fleet finding)*
*Target B-type: B-46 — CLIENT sections within FLOW-XX-DESIGN-SIMULATION-R1.md*
*Round: 56 of 72*
