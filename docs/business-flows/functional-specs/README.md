# Functional Specs for the Flows That Stayed in Planning

**Date:** 2026-04-22
**Audience:** Product designer, engineer, or AI session that's about to build or audit one of these flows
**Scope:** Every flow with verdict **Half-built** or **Designed** in [`../FLOW-BY-FLOW-STATUS.md`](../FLOW-BY-FLOW-STATUS.md)

---

## What these specs are for

Each file in this directory is a **functional specification** for one flow — the next level of detail below the business-flow spec at `../NN-{slug}.md`. It answers the questions an engineer or designer needs before opening an editor:

- **Which roles use this flow, in which modes?**
- **What user stories does it deliver?**
- **Which screens exist, in what order, connected how?**
- **What does each screen contain — layout, components, states?**
- **What edge cases and problematic states occur, and how does the UI respond?**
- **What's the visual direction — grammar, feel, colours, anti-patterns?**
- **When is this flow "done"?** (acceptance criteria)

---

## How each spec is organised

Every file follows the same shape so you can jump between flows:

```
1. Summary         — one paragraph, product-designer voice
2. Roles & modes   — who, in what context, with what permissions
3. User stories    — 3–6 per flow, each with screens, trigger, happy path, UI elements
4. Screen structure — layout, components, primary CTA, empty/loading/error states per screen
5. Edge cases     — named scenarios with expected behaviour
6. Problematic states — session expired / offline / permission denied / rate limited / etc.
   with visual description (what the user sees) per state
7. Visual direction — grammar, feel, colours, anti-patterns per the examination record
8. Acceptance criteria — checklist to declare the flow shippable
```

The shape is informed by four skills loaded during authoring:
- **design-for-ai** — 6-phase build (foundation → structure → typography → composition → hierarchy → colour)
- **impeccable** — 7 references (typography, colour, spatial, motion, interaction, responsive, UX writing) + `/harden` for edge cases
- **interface-design** — principle-based consistency for dashboards, apps, tools
- **ui-ux-pro-max** — 161 reasoning rules, 67 UI styles, grammar-matched patterns

---

## Priority order

Specs are authored in this order because delivery cost differs:

### Tier 1 — one-route-or-one-page-unblock (cheapest wins)
- [FLOW-20 Ads platform + privacy settings](FLOW-20-ads-platform-functional-spec.md)
- [FLOW-21 Dynamic forms & workflows](FLOW-21-dynamic-forms-workflows-functional-spec.md)
- [FLOW-28 Blog CMS modules](FLOW-28-blog-cms-modules-functional-spec.md)
- [FLOW-48 i18n translation](FLOW-48-i18n-translation-functional-spec.md)

### Tier 2 — 5-line page-rewrite (FLOW-45 RUN-52 template)
- [FLOW-36 Feature registry](FLOW-36-feature-registry-functional-spec.md)
- [FLOW-37 Multi-stack porting (design-system-governance)](FLOW-37-design-system-governance-functional-spec.md) — **27 services waiting**
- [FLOW-38 RAG quality feedback](FLOW-38-rag-quality-feedback-functional-spec.md)
- [FLOW-39 OSS curriculum](FLOW-39-oss-curriculum-functional-spec.md)
- [FLOW-40 Client push](FLOW-40-client-push-functional-spec.md)

### Tier 3 — other half-built
- [FLOW-02 Profile enrichment polish](FLOW-02-profile-enrichment-functional-spec.md)
- [FLOW-13 Data warehouse & analytics](FLOW-13-data-warehouse-analytics-functional-spec.md)
- [FLOW-14 ETL data integration](FLOW-14-etl-data-integration-functional-spec.md)
- [FLOW-15 SaaS multi-tenancy (workspace settings)](FLOW-15-saas-multi-tenancy-functional-spec.md)
- [FLOW-32 Sharable flows marketplace](FLOW-32-sharable-flows-marketplace-functional-spec.md)

### Tier 4 — designed, not wired
- [FLOW-00 Bundle activation](FLOW-00-bundle-activation-functional-spec.md)
- [FLOW-16 Marketplace payments (checkout + escrow, 10 roles)](FLOW-16-marketplace-payments-functional-spec.md)
- [FLOW-17 Freelancer marketplace](FLOW-17-freelancer-marketplace-functional-spec.md)
- [FLOW-18 Visual flow engine](FLOW-18-visual-flow-engine-functional-spec.md)
- [FLOW-19 Durable sagas & compliance](FLOW-19-durable-sagas-compliance-functional-spec.md)
- [FLOW-22 CMS publishing](FLOW-22-cms-publishing-functional-spec.md)
- [FLOW-23 Form-builder templates](FLOW-23-form-builder-templates-functional-spec.md)
- [FLOW-24 AI safety & moderation](FLOW-24-ai-safety-moderation-functional-spec.md)
- [FLOW-25 BFA cross-flow governance](FLOW-25-bfa-cross-flow-governance-functional-spec.md)
- [FLOW-26 Meta-flow engine](FLOW-26-meta-flow-engine-functional-spec.md)
- [FLOW-27 Human interaction gate](FLOW-27-human-interaction-gate-functional-spec.md)
- [FLOW-30 Tenant lifecycle manager](FLOW-30-tenant-lifecycle-manager-functional-spec.md)
- [FLOW-31 Design intelligence engine](FLOW-31-design-intelligence-engine-functional-spec.md)
- [FLOW-33 System initiation & bootstrap](FLOW-33-system-initiation-bootstrap-functional-spec.md)
- [FLOW-34 Marketplace plugin adapter](FLOW-34-marketplace-plugin-adapter-functional-spec.md)
- [FLOW-35 Meta-arbitration engine](FLOW-35-meta-arbitration-engine-functional-spec.md)
- [FLOW-47 Module lifecycle](FLOW-47-module-lifecycle-functional-spec.md)

**Not included here** (Live or External or Sketch): FLOW-01, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 29, 41, 42, 43, 44, 45, 46. See [`../FLOW-BY-FLOW-STATUS.md`](../FLOW-BY-FLOW-STATUS.md) for their status.

---

## Conventions used across every spec

**Role tiers** (from SK-539):
- **PLATFORM_ENG** — engineer on the platform itself (routes under `/admin/engine/`)
- **PLATFORM_OPS** — platform operator / admin (routes under `/admin/`)
- **TENANT_OPS** — tenant administrator (routes under `/workspace/`)
- **TENANT_CONSUMER** — tenant end user (routes under `/app/` or root)
- **PUBLIC** — anonymous visitor (routes under `/` with no auth)

**Grammar types** (from the registry):
- **G1 Progress strip** — "Where is this in its lifecycle?"
- **G2 Verdict grid** — "What did each evaluator decide, and why?"
- **G3 Card list with state badge** — "Which items need my attention, in what state?"
- **G4 Topology canvas** — "How do the parts connect?"
- **G5 Kiosk / single action** — "I have one task, one decision"
- **G6 Dashboard** — "What are my key metrics right now?"
- **G7 Settings tabs** — "Which setting do I need to change?"

**Problematic-state catalogue** (every spec names the subset that applies):
- Unauthenticated access attempt
- Permission denied for this role
- Session expired mid-action
- Network offline during submit
- Rate limited
- Server error (5xx)
- Validation error on submit
- Empty state (no data yet)
- Loading (blocking / non-blocking)
- Stale data (cached, needs refresh)
- Conflict (someone else edited)
- Undo window expired
- Third-party dependency down (provider-specific fail)
- Danger-zone action (destructive, irreversible)
- Progressive disclosure needed (too much info for one view)

**Visual anti-patterns** (banned across every spec — from the impeccable + design-for-ai skills):
- Inter font as primary display face
- Purple gradients as "branding"
- Cards nested in cards
- Grey text on coloured backgrounds
- Identical card grid with same padding and radius on every row
- Generic admin sidebar on tenant-consumer / public pages
- "FAILED" invoice or error state as the dominant visual anchor on first load
- Engineering terminology leaking to user-facing copy (FLOW-XX, T-NNN, entity names, state-machine state names)

---

## How to use a spec

When you open a functional spec to build or audit a flow:

1. Read the **Summary** + **Roles & modes**.
2. Pick **one user story** to focus on — don't try to build everything at once.
3. For that story, follow its **screen sequence** and implement one screen at a time, bottom-up within each screen (empty state → loading → happy path → error).
4. At the end, walk through **every problematic state** and verify the UI responds the way this spec says it should.
5. Check off the **acceptance criteria** before declaring the story done.

Cross-reference against:
- `../NN-{slug}.md` — the PM spec (source of user intent)
- `../../screen-examination/{slug}-examination.md` — WHO / VERB / GRAMMAR distillation
- `../../../.claude/skills/flow-prep-library/planning--business-flows-registry.md` — role batch, grammar type, CFI notes
