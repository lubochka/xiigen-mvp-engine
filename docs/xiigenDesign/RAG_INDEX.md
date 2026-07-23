# XIIGen DESIGN DOCUMENTS — RAG NAVIGATION INDEX
## Quick-lookup for all design documents + actual code mapping
## Updated: 2026-04-14 | Branch: claude/vigorous-margulis

---

## LIVE CODEBASE STATE

| Artifact | Count | Range |
|----------|-------|-------|
| Factories | 1600+ | F1-F1592 |
| Task Types | 398 | T44-T649 + T367-T374 |
| BFA Rules | 94+ | CF-01-1..CF-24-4 |
| Services | 378 | 45 flow dirs |
| Skills | 469 | SK-1..SK-529 |
| Tests | 10,470 server + ~1,080 client |
| DNA Patterns | 9 | DNA-1..DNA-9 |

---

## DOCUMENT MAP

| Document | Lines | Topic | Code location |
|----------|-------|-------|---------------|
| README.md | 172 | Overview + stack | CLAUDE.md |
| ENGINE_ARCHITECTURE_MERGED.md | 30,945 | Factories, fabrics, DNA, bootstrap | server/src/fabrics/, kernel/, bootstrap/ |
| TASK_TYPES_CATALOG_MERGED.md | 30,160 | Task type contracts | server/src/engine-contracts/ |
| V62_BFA_STRESS_TEST_MERGED.md | 19,643 | BFA rules + stress tests | server/src/engine-contracts/*-bfa-rules.ts |
| SKILLS_FACTORY_RAG_MERGED.md | 18,068 | Skills + RAG mapping | .claude/skills/, server/src/rag-init/ |
| UNIFIED_SOURCE_INDEX_MERGED.md | 9,626 | Artifact cross-ref | docs/state/ |
| MASTER_EXECUTION_PLAN_MERGED.md | 9,645 | Execution phases | docs/sessions/FLOW-*/ |
| SESSION_STATE_MERGE.md | 2,567 | Session tracking | docs/sessions/ |
| MT_FOUNDATION_STANDARD_P26.md | 833 | Multi-tenant | server/src/kernel/multi-tenant/ |
| CLIENT_COMPLETENESS_STANDARD_P23.md | 749 | Client pages | client/src/pages/ |
| CICD_LOGGING_STANDARD_P24.md | 692 | CI/CD + logging | server/src/devops/ |
| PROMPT_MANAGEMENT_STANDARD_P22.md | 668 | Prompt storage | server/src/af-stations/ |
| DOCUMENTATION_STANDARD_P25.md | 645 | API docs | server/src/doc-gen/ |
| RAG_SEEDING_STANDARD_P21.md | 600 | RAG seeding | rag-benchmark/ |
| multi-tenant-support.md | 534 | MT details | server/src/kernel/multi-tenant/ |

---

## FLOW SLUG DIRECTORY MAP

| Flow | Slug | Service dir | T-range |
|------|------|-------------|---------|
| FLOW-01 | user-registration | user-registration/ | T47-T49 |
| FLOW-02 | profile-enrichment | profile-enrichment/ | T50-T52 |
| FLOW-03 | event-management | event-management/ | T59-T62 |
| FLOW-04 | event-attendance | event-attendance/ | T63-T66 |
| FLOW-05 | completion-gamification | completion-gamification/ | T44-T46 |
| FLOW-06 | user-groups-communities | user-groups-communities/ | T71-T72,T89-T90 |
| FLOW-07 | friend-request-social-feed | friend-request-social-feed/ | T73-T82 |
| FLOW-08 | marketplace | marketplace/ | T83-T88 |
| FLOW-09 | transactional-event-participation | transactional-event-participation/ | T99-T118 |
| FLOW-10 | reviews-reputation | reviews-reputation/ | T169-T172 |
| FLOW-11 | schema-registry-dag | schema-registry-dag/ | T189-T208 |
| FLOW-12 | subscription-billing | subscription-billing/ | T209-T212 |
| FLOW-13 | data-warehouse-analytics | data-warehouse-analytics/ | T169-T188 |
| FLOW-14 | etl-data-integration | etl-data-integration/ | T213-T224 |
| FLOW-15 | saas-multi-tenancy | saas-multi-tenancy/ | T605-T608 |
| FLOW-16 | marketplace-payments | marketplace-payments/ | T609-T612 |
| FLOW-17 | freelancer-marketplace | freelancer-marketplace/ | T613-T616 |
| FLOW-18 | visual-flow-engine | visual-flow-engine/ | T617-T620 |
| FLOW-19 | durable-sagas-compliance | durable-sagas-compliance/ | T621-T624 |
| FLOW-20 | ads-platform | ads-platform/ | T625-T628 |
| FLOW-21 | dynamic-forms-workflows | dynamic-forms-workflows/ | T629-T632 |
| FLOW-22 | cms-publishing | cms-publishing/ | T633-T636 |
| FLOW-23 | form-builder-templates | form-builder-templates/ | T637-T649 |
| FLOW-24 | ai-safety-moderation | ai-safety-moderation/ | T367-T374 |
| FLOW-25 | bfa-cross-flow-governance | bfa-conflict-arbitration/ | T375-T388 |
| FLOW-26 | meta-flow-engine | flow-extension-engine/ | T389-T412 |
| FLOW-27 | human-interaction-gate | human-approval-gate/ | T413-T422 |
| FLOW-28 | blog-cms-modules | blog-cms-modules/ | T423-T440 |
| FLOW-29 | adaptive-rag-deep-research | rag-optimization/ | T443-T469 |
| FLOW-30 | tenant-lifecycle-manager | tenant-lifecycle/ | T470-T479 |
| FLOW-31 | design-intelligence-engine | design-system-governance/ | T489-T515 |
| FLOW-32 | sharable-flows-marketplace | sharable-flows-marketplace/ | T516-T535 |
| FLOW-33 | system-initiation-bootstrap | generation-loop/ | T516-T522 |
| FLOW-35 | meta-arbitration-engine | meta-arbitration/ | T565-T566 |
| FLOW-36 | feature-registry | feature-registry/ | T567-T570 |
| FLOW-37 | engine-self-awareness | engine-self-awareness/ | T571-T579 |
| FLOW-38 | rag-quality-feedback | rag-quality-feedback/ | — |
| FLOW-39 | oss-curriculum | oss-curriculum/ | — |
| FLOW-40 | client-push | client-push/ | — |
| FLOW-45 | history-bootstrap | bootstrap/ | T601-T604 |

---

## WHEN YOU FIND A GAP — LOOK HERE FIRST

```bash
# 1. Check if a flow already implements it
ls server/src/engine/flows/

# 2. Search contracts for the concept
grep -r "keyword" server/src/engine-contracts/*.ts

# 3. Search services
grep -r "keyword" server/src/engine/flows/**/*.service.ts

# 4. Search design docs
grep -r "keyword" docs/xiigenDesign/*.md

# 5. Search extracted design decisions (124 decisions)
grep -r "keyword" docs/sessions/historyRag/pass*.json
```
