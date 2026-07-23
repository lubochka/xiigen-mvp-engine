# Flow Mobility/Auth Work Ledger

Updated: 2026-05-12

Branch used for this documentation pass: `Skills_Creation_Claude`.

## Purpose

This ledger gives the project a single readable index for the FLOW-00 through
FLOW-46 mobility and authorization work. The detailed evidence remains in the
per-flow JSON and Markdown artifacts; this file explains what was done and
points to the first tenant repository connected to each flow.

## Work Completed

- Portability folders now exist for every flow from FLOW-00 through FLOW-46.
- The mobility/auth protocol evidence records Vault-backed auth checks, unit or
  integration evidence, Playwright or PNG evidence where required, tenant fork
  cascade evidence, and certification declarations.
- Tenant cascade evidence records the real GitHub repos used for Tenant A,
  Tenant B, and Tenant C where the flow protocol required fork proof.
- FLOW-34 was repaired and documented as adapter-package Tier 1 only because
  the canonical source scope was missing for full cascade proof.
- FLOW-35 was documented as server/auth foundation complete, with e2e and fork
  cascade still pending before full portability certification.
- FLOW-41 through FLOW-44 are external-adapter Sprint A certifications and do
  not have Tenant A fork repos.
- FLOW-45 and FLOW-46 are platform/provisioning governance flows and do not
  have first-tenant app repos in the same sense as product flows.

## Tenant A Repo Rule

The "Tenant A repo" column means the first tenant repository connected to the
flow. When the evidence has both an original fork and a later adapted Tenant A
repo, this ledger points to the final adapted Tenant A repo because that is the
repo Tenant B installs from. When no adapted repo is recorded, the ledger points
to the original Tenant A fork. When the flow is an adapter or platform
certification without a tenant fork cascade, the value is listed as not
applicable.

## Flow Ledger

| Flow | Slug | Current certification/state | Tenant A repo | Primary evidence |
| --- | --- | --- | --- | --- |
| FLOW-00 | bundle-activation | Tier 3 complete | [lubochka/acme-corp--acme-launch-bundles](https://github.com/lubochka/acme-corp--acme-launch-bundles) | [phase-i-certification-declaration-evidence.json](flow-00/phase-i-certification-declaration-evidence.json) |
| FLOW-01 | user-registration | Full cascade certification recorded | [lubochka/acme-corp--user-registration-acme-pro-members](https://github.com/lubochka/acme-corp--user-registration-acme-pro-members) | [phase-I-certification-declaration-evidence.json](flow-01/phase-I-certification-declaration-evidence.json) |
| FLOW-02 | profile-enrichment | Complete mobility/auth protocol | [lubochka/acme-corp--acme-pro-matching](https://github.com/lubochka/acme-corp--acme-pro-matching) | [final-completion-evidence.json](flow-02/final-completion-evidence.json) |
| FLOW-03 | event-management | Full cascade certification recorded | [lubochka/acme-corp--event-management-acme-curated-events](https://github.com/lubochka/acme-corp--event-management-acme-curated-events) | [phase-I-certification-declaration-evidence.json](flow-03/phase-I-certification-declaration-evidence.json) |
| FLOW-04 | event-attendance | Full cascade evidence recorded | [lubochka/acme-corp--event-attendance-acme-onsite-check-in](https://github.com/lubochka/acme-corp--event-attendance-acme-onsite-check-in) | [phase-4.5-tenant-a-repo-evidence.json](flow-04/phase-4.5-tenant-a-repo-evidence.json) |
| FLOW-05 | completion-gamification | Full cascade evidence recorded | [lubochka/acme-corp--acme-learning-rewards](https://github.com/lubochka/acme-corp--acme-learning-rewards) | [phase-4-5-tenant-a-rename-evidence.json](flow-05/phase-4-5-tenant-a-rename-evidence.json) |
| FLOW-06 | user-groups-communities | Full cascade evidence recorded | [lubochka/acme-corp--user-groups-communities](https://github.com/lubochka/acme-corp--user-groups-communities) | [FLOW-06-MOBILITY-AUTH-STATE.json](../sessions/FLOW-06/FLOW-06-MOBILITY-AUTH-STATE.json) |
| FLOW-07 | friend-request-social-feed | Tier D certified complete | [lubochka/acme-corp--quiet-community-feed](https://github.com/lubochka/acme-corp--quiet-community-feed) | [phase-i-final-certification-evidence.json](flow-07/phase-i-final-certification-evidence.json) |
| FLOW-08 | marketplace | Tier 3 complete | [lubochka/acme-corp--acme-curated-marketplace](https://github.com/lubochka/acme-corp--acme-curated-marketplace) | [phase-i-certification-declaration-evidence.json](flow-08/phase-i-certification-declaration-evidence.json) |
| FLOW-09 | transactional-event-participation | Tier 3 full cascade plus Vault auth | [lubochka/acme-corp--transactional-event-participation](https://github.com/lubochka/acme-corp--transactional-event-participation) | [phase-i-certification-declaration-evidence.json](flow-09/phase-i-certification-declaration-evidence.json) |
| FLOW-10 | reviews-reputation | Tier 3 full cascade plus Vault auth | [lubochka/acme-corp--reviews-reputation](https://github.com/lubochka/acme-corp--reviews-reputation) | [phase-i-certification-declaration-evidence.json](flow-10/phase-i-certification-declaration-evidence.json) |
| FLOW-11 | schema-registry-dag | Tier 3 complete | [lubochka/acme-corp--schema-registry-dag](https://github.com/lubochka/acme-corp--schema-registry-dag) | [phase-i-certification-declaration-evidence.json](flow-11/phase-i-certification-declaration-evidence.json) |
| FLOW-12 | subscription-billing | Tier 3 certified complete | [lubochka/acme-corp--subscription-billing](https://github.com/lubochka/acme-corp--subscription-billing) | [phase-i-certification-declaration-evidence.json](flow-12/phase-i-certification-declaration-evidence.json) |
| FLOW-13 | data-warehouse-analytics | Tier 3 earned | [lubochka/acme-corp--acme-enterprise-warehouse-analytics](https://github.com/lubochka/acme-corp--acme-enterprise-warehouse-analytics) | [phase-I-certification-declaration-evidence.json](flow-13/phase-I-certification-declaration-evidence.json) |
| FLOW-14 | etl-data-integration | Tier 3 earned | [lubochka/acme-corp--etl-data-integration](https://github.com/lubochka/acme-corp--etl-data-integration) | [phase-I-certification-declaration-evidence.json](flow-14/phase-I-certification-declaration-evidence.json) |
| FLOW-15 | saas-multi-tenancy | Tier 2+; Tier 3 blocked by package signing | [lubochka/acme-corp--acme-enterprise-saas-multi-tenancy](https://github.com/lubochka/acme-corp--acme-enterprise-saas-multi-tenancy) | [phase-i-certification-declaration-evidence.json](flow-15/phase-i-certification-declaration-evidence.json) |
| FLOW-16 | marketplace-payments | Tier 2+; Tier 3 blocked by package signing | [lubochka/acme-corp--acme-enterprise-marketplace-payments](https://github.com/lubochka/acme-corp--acme-enterprise-marketplace-payments) | [phase-i-certification-declaration-evidence.json](flow-16/phase-i-certification-declaration-evidence.json) |
| FLOW-17 | freelancer-marketplace | Tier 2+ | [lubochka/acme-corp--acme-enterprise-freelancer-marketplace](https://github.com/lubochka/acme-corp--acme-enterprise-freelancer-marketplace) | [phase-i-certification-declaration-evidence.json](flow-17/phase-i-certification-declaration-evidence.json) |
| FLOW-18 | visual-flow-engine | Tier 2+ | [lubochka/acme-corp--acme-enterprise-visual-flow-engine](https://github.com/lubochka/acme-corp--acme-enterprise-visual-flow-engine) | [phase-i-certification-declaration-evidence.json](flow-18/phase-i-certification-declaration-evidence.json) |
| FLOW-19 | durable-sagas-compliance | Tier 2+; Tier 3 blocked by package signing | [lubochka/acme-corp--acme-enterprise-durable-sagas-compliance](https://github.com/lubochka/acme-corp--acme-enterprise-durable-sagas-compliance) | [phase-i-certification-declaration-evidence.json](flow-19/phase-i-certification-declaration-evidence.json) |
| FLOW-20 | ads-platform | Tier 2+; Tier 3 blocked by package signing | [lubochka/acme-corp--acme-strict-privacy-ads-platform](https://github.com/lubochka/acme-corp--acme-strict-privacy-ads-platform) | [phase-i-certification-declaration-evidence.json](flow-20/phase-i-certification-declaration-evidence.json) |
| FLOW-21 | dynamic-forms-workflows | Tier 2+; Tier 3 blocked by package signing | [lubochka/acme-corp--acme-community-intake-workflows](https://github.com/lubochka/acme-corp--acme-community-intake-workflows) | [phase-i-certification-declaration-evidence.json](flow-21/phase-i-certification-declaration-evidence.json) |
| FLOW-22 | cms-publishing | Tier 2+; Tier 3 blocked by package signing | [lubochka/acme-corp--acme-help-center-cms](https://github.com/lubochka/acme-corp--acme-help-center-cms) | [phase-i-certification-declaration-evidence.json](flow-22/phase-i-certification-declaration-evidence.json) |
| FLOW-23 | form-builder-templates | Tier 2+ | [lubochka/acme-corp--acme-intake-template-studio](https://github.com/lubochka/acme-corp--acme-intake-template-studio) | [phase-i-certification-declaration-evidence.json](flow-23/phase-i-certification-declaration-evidence.json) |
| FLOW-24 | ai-safety-moderation | Tier 2+ | [lubochka/acme-corp--acme-safety-console](https://github.com/lubochka/acme-corp--acme-safety-console) | [phase-i-certification-declaration-evidence.json](flow-24/phase-i-certification-declaration-evidence.json) |
| FLOW-25 | bfa-cross-flow-governance | Tier 2+; Tier 3 blocked by package signing | [lubochka/acme-corp--acme-policy-gate-console](https://github.com/lubochka/acme-corp--acme-policy-gate-console) | [phase-i-certification-declaration-evidence.json](flow-25/phase-i-certification-declaration-evidence.json) |
| FLOW-26 | meta-flow-engine | Certification complete | [lubochka/acme-corp--meta-flow-engine](https://github.com/lubochka/acme-corp--meta-flow-engine) | [phase-i-certification-declaration-evidence.json](flow-26/phase-i-certification-declaration-evidence.json) |
| FLOW-27 | human-interaction-gate | Certification complete | [lubochka/acme-corp--human-interaction-gate](https://github.com/lubochka/acme-corp--human-interaction-gate) | [phase-i-certification-declaration-evidence.json](flow-27/phase-i-certification-declaration-evidence.json) |
| FLOW-28 | blog-cms-modules | Certification complete | [lubochka/acme-corp--blog-cms-modules](https://github.com/lubochka/acme-corp--blog-cms-modules) | [phase-i-certification-declaration-evidence.json](flow-28/phase-i-certification-declaration-evidence.json) |
| FLOW-29 | adaptive-rag-deep-research | Tier 2+ | [lubochka/acme-corp--adaptive-rag-deep-research](https://github.com/lubochka/acme-corp--adaptive-rag-deep-research) | [phase-i-certification-declaration-evidence.json](flow-29/phase-i-certification-declaration-evidence.json) |
| FLOW-30 | tenant-lifecycle-manager | Tier 2+ | [lubochka/acme-corp--tenant-lifecycle-manager](https://github.com/lubochka/acme-corp--tenant-lifecycle-manager) | [phase-i-certification-declaration-evidence.json](flow-30/phase-i-certification-declaration-evidence.json) |
| FLOW-31 | design-intelligence-engine | Tier 2+ | [lubochka/acme-corp--design-intelligence-engine](https://github.com/lubochka/acme-corp--design-intelligence-engine) | [phase-i-certification-declaration-evidence.json](flow-31/phase-i-certification-declaration-evidence.json) |
| FLOW-32 | sharable-flows-marketplace | Certification declared | [lubochka/acme-corp--sharable-flows-marketplace](https://github.com/lubochka/acme-corp--sharable-flows-marketplace) | [phase-i-certification-declaration-evidence.json](flow-32/phase-i-certification-declaration-evidence.json) |
| FLOW-33 | system-initiation-bootstrap | Certification declared | [lubochka/acme-corp--system-initiation-bootstrap](https://github.com/lubochka/acme-corp--system-initiation-bootstrap) | [phase-i-certification-declaration-evidence.json](flow-33/phase-i-certification-declaration-evidence.json) |
| FLOW-34 | marketplace-plugin-adapter | Partial: Tier 1 adapter package only; source scope gap | N/A - no Tenant A cascade repo yet | [phase-i-certification-declaration-evidence.json](flow-34/phase-i-certification-declaration-evidence.json) |
| FLOW-35 | meta-arbitration-engine | Partial: server/auth foundation; e2e and cascade pending | N/A - cascade pending | [phase-i-certification-declaration-evidence.json](flow-35/phase-i-certification-declaration-evidence.json) |
| FLOW-36 | feature-registry | Certification declared | [lubochka/acme-corp--feature-registry](https://github.com/lubochka/acme-corp--feature-registry) | [phase-i-certification-declaration-evidence.json](flow-36/phase-i-certification-declaration-evidence.json) |
| FLOW-37 | design-system-governance | Certification declared | [lubochka/acme-corp--design-system-governance](https://github.com/lubochka/acme-corp--design-system-governance) | [phase-i-certification-declaration-evidence.json](flow-37/phase-i-certification-declaration-evidence.json) |
| FLOW-38 | rag-quality-feedback | Tier 2+ | [lubochka/acme-corp--rag-quality-feedback-f38](https://github.com/lubochka/acme-corp--rag-quality-feedback-f38) | [phase-i-certification-declaration-evidence.json](flow-38/phase-i-certification-declaration-evidence.json) |
| FLOW-39 | oss-curriculum | Tier 2+ | [lubochka/acme-corp--oss-curriculum-f39](https://github.com/lubochka/acme-corp--oss-curriculum-f39) | [phase-i-certification-declaration-evidence.json](flow-39/phase-i-certification-declaration-evidence.json) |
| FLOW-40 | client-push | Tier 2+ | [lubochka/acme-corp--client-push-f40](https://github.com/lubochka/acme-corp--client-push-f40) | [phase-i-certification-declaration-evidence.json](flow-40/phase-i-certification-declaration-evidence.json) |
| FLOW-41 | canva-text-adapter | Tier 1 external-adapter Sprint A | N/A - external adapter certification | [phase-i-certification-declaration-evidence.json](flow-41/phase-i-certification-declaration-evidence.json) |
| FLOW-42 | miro-shape-adapter | Tier 1 external-adapter Sprint A | N/A - external adapter certification | [phase-i-certification-declaration-evidence.json](flow-42/phase-i-certification-declaration-evidence.json) |
| FLOW-43 | webflow-designer-extension | Tier 1 external-adapter Sprint A | N/A - external adapter certification | [phase-i-certification-declaration-evidence.json](flow-43/phase-i-certification-declaration-evidence.json) |
| FLOW-44 | framer-adapter | Tier 1 external-adapter Sprint A | N/A - external adapter certification | [phase-i-certification-declaration-evidence.json](flow-44/phase-i-certification-declaration-evidence.json) |
| FLOW-45 | history-bootstrap | Tier 1 provisioning bootstrap auth-certified | N/A - provisioning bootstrap certification | [phase-i-certification-declaration-evidence.json](flow-45/phase-i-certification-declaration-evidence.json) |
| FLOW-46 | platform-agent | Tier 2 platform-governance portability/auth certified | N/A - platform governance certification | [phase-i-certification-declaration-evidence.json](flow-46/phase-i-certification-declaration-evidence.json) |

## Remaining Gaps

- FLOW-34 needs a canonical source directory or equivalent source scope before
  it can attempt full fork cascade certification.
- FLOW-35 still needs Playwright/PNG evidence and the Tenant A -> Tenant B ->
  Tenant C fork cascade before it can be declared fully portable.
- FLOW-41 through FLOW-44 should stay classified separately from tenant product
  flows unless a later protocol adds tenant fork requirements for external
  adapter packages.

## Evidence Hygiene

Evidence files should reference real GitHub repos, GitHub Actions runs, local
registry readbacks, screenshots, and state files. They should never include raw
Vault values, GitHub tokens, Docker registry tokens, JWT signing keys, or copied
tenant secret payloads.
