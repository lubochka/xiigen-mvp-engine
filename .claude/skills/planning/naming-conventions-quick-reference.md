# NAMING CONVENTIONS — QUICK REFERENCE CARD
## For every planning session and every Claude Code phase
## Version: 2.0 | Date: 2026-04-13 | Reflects: Naming Refactor v2.0 (COMPLETE)

---

## The 6 Rules (SK-447)

| # | What | ✓ Good | ✗ Bad |
|---|------|--------|-------|
| 1 | engine-contracts/ files | `subscription-billing-contracts.ts` | `flow-12-contracts.ts` |
| 2 | engine/flows/ dirs | `engine/flows/reviews-reputation/` | `engine/flows/flow-10/` |
| 3 | test/e2e/ dirs | `test/e2e/marketplace-payments/` | `test/e2e/flow-16/` |
| 4 | test/{slug}/ dirs | `test/meta-arbitration-engine/` | `test/flow35/` |
| 5 | rag-init/ files | `etl-data-integration.rag-seed.ts` | `flow14-etl-rag-seed.ts` |
| 6 | EngineContract fields | `flowId: 'FLOW-35', flowName: 'Meta-Arbitration Engine'` | (missing these fields) |

`flowId: "FLOW-XX"` data values inside JSON are always numeric — that is NOT a violation.
The rule applies to **file paths and directory names** only.

---

## Complete Domain Slug Table (D-NAMING-1)

| Flow ID | Slug | Domain Name |
|---------|------|-------------|
| FLOW-00 | `bundle-activation` | Bundle Activation |
| FLOW-01 | `user-registration` | User Registration & Onboarding |
| FLOW-02 | `profile-enrichment` | Profile Enrichment & Matching |
| FLOW-03 | `event-management` | Event Management |
| FLOW-04 | `event-attendance` | Event Attendance |
| FLOW-05 | `completion-gamification` | Completion Gamification |
| FLOW-06 | `user-groups-communities` | User Groups & Communities |
| FLOW-07 | `friend-request-social-feed` | Friend Request & Social Feed |
| FLOW-08 | `marketplace` | Marketplace |
| FLOW-09 | `transactional-event-participation` | Transactional Event Participation |
| FLOW-10 | `reviews-reputation` | Reviews & Reputation |
| FLOW-11 | `schema-registry-dag` | Schema Registry DAG |
| FLOW-12 | `subscription-billing` | Subscription Billing |
| FLOW-13 | `data-warehouse-analytics` | Data Warehouse Analytics |
| FLOW-14 | `etl-data-integration` | ETL Data Integration |
| FLOW-15 | `saas-multi-tenancy` | SaaS Multi-Tenancy |
| FLOW-16 | `marketplace-payments` | Marketplace Payments |
| FLOW-17 | `freelancer-marketplace` | Freelancer Marketplace |
| FLOW-18 | `visual-flow-engine` | Visual Flow Engine |
| FLOW-19 | `durable-sagas-compliance` | Durable Sagas Compliance |
| FLOW-20 | `ads-platform` | Ads Platform |
| FLOW-21 | `dynamic-forms-workflows` | Dynamic Forms & Workflows |
| FLOW-22 | `cms-publishing` | CMS Publishing |
| FLOW-23 | `form-builder-templates` | Form Builder Templates |
| FLOW-24 | `ai-safety-moderation` | AI Safety Moderation |
| FLOW-25 | `bfa-cross-flow-governance` | BFA Cross-Flow Governance |
| FLOW-26 | `meta-flow-engine` | Meta-Flow Engine |
| FLOW-27 | `human-interaction-gate` | Human Interaction Gate |
| FLOW-28 | `blog-cms-modules` | Blog/CMS Modules |
| FLOW-29 | `adaptive-rag-deep-research` | Adaptive RAG Deep Research |
| FLOW-30 | `tenant-lifecycle-manager` | Tenant Lifecycle Manager |
| FLOW-31 | `design-intelligence-engine` | Design Intelligence Engine |
| FLOW-32 | `sharable-flows-marketplace` | Sharable Flows Marketplace |
| FLOW-33 | `system-initiation-bootstrap` | System Initiation Bootstrap |
| FLOW-34 | `marketplace-plugin-adapter` | Marketplace Plugin Adapter |
| FLOW-35 | `meta-arbitration-engine` | Meta-Arbitration Engine |
| FLOW-36 | `feature-registry` | Feature Registry |
| FLOW-37 | `design-system-governance` | Design System Governance |
| FLOW-38 | `rag-quality-feedback` | RAG Quality Feedback |
| FLOW-39 | `oss-curriculum` | OSS Curriculum Runner |
| FLOW-40 | `client-push` | Client Push Infrastructure |

---

## Generated Service File Patterns

**Pattern:** `{verb}-{domain-noun}.service.ts`

```
FLOW-01 (user-registration):
  T47 → user-registration-initiator.service.ts
  T48 → email-verification-wait.service.ts
  T49 → onboarding-delivery.service.ts

FLOW-02 (profile-enrichment):
  T50 → parallel-profile-enricher.service.ts
  T51 → matching-convergence-gate.service.ts
  T52 → onboarding-completion-broadcaster.service.ts

FLOW-16 (marketplace-payments):
  T225 → marketplace-checkout-gateway.service.ts
  T226 → marketplace-payment-splitter.service.ts
  T227 → marketplace-escrow-controller.service.ts
  T228 → seller-payout-writer.service.ts

FLOW-17 (freelancer-marketplace):
  T229 → freelancer-proposal-acceptance-gateway.service.ts
  T230 → freelancer-contract-orchestrator.service.ts
  T231 → milestone-release-controller.service.ts
  T232 → freelancer-reputation-writer.service.ts
```

---

## Contract File Naming Pattern

```
# Engine contract:
server/src/engine-contracts/{slug}-contracts.ts
server/src/engine-contracts/{slug}-bfa-rules.ts
server/src/engine-contracts/{slug}-named-checks.ts

# Examples (correct):
subscription-billing-contracts.ts
reviews-reputation-bfa-rules.ts
event-management-named-checks.ts

# Examples (wrong — will fail OP-7 gate):
flow-12-contracts.ts
flow-10-bfa-rules.ts
flow-03-named-checks.ts
```

---

## Pre-Commit Verification

```bash
# Check for any remaining numeric-named directories in code paths (expected: 0 lines)
find server/src server/test client/src client/__tests__ -type d \
  \( -name "flow-[0-9][0-9]" -o -name "flow[0-9][0-9]" -o -name "flow[0-9][0-9][0-9]" \) \
  | grep -v "docs/sessions\|node_modules"

# Check for any remaining numeric-named source files (expected: 0 lines)
find server/src -type f \( -name "flow-[0-9]*.ts" -o -name "flow[0-9]*.ts" \) \
  | grep -v "node_modules\|/flows/\|flow-api\|flow-lifecycle\|flow-generator\|flow-registry\|flow-state\|flow-pool\|flow-prompt\|flow-rag\|flow-service\|flow-orchestrator\|flow-engine\|flow-watcher\|flow-extension\|flow-matrix"

# OP-7 pre-commit gate (must pass before every commit):
./scripts/pre-commit-check.sh
```

---

## What Is NOT Renamed

| Location | Why |
|----------|-----|
| `docs/sessions/FLOW-XX/` | Planning/session docs — keep numeric for tracking |
| `flowId: "FLOW-XX"` inside JSON | Data identifiers, not file paths |
| `FLOW-XX` in test descriptions | Human-readable test labels, not file paths |
| `// FLOW-16:` inline code comments | Documentation only |

---

## CI Gate

```bash
./scripts/pre-commit-check.sh
# ALL 7 CHECKS MUST PASS — includes check 5 (zero em-dash eslint-disable) and
# implicit naming enforcement through tsc (import of deleted flow-NN files = compile error)
```
