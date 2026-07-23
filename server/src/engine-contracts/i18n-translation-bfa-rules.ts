/**
 * FLOW-48 BFA Rules (i18n-translation) — CF-810..CF-816.
 *
 * Source:
 *   - docs/sessions/FLOW-48/FLOW-48-DESIGN-R2.md (CF-810, CF-811, CF-812 locked at design)
 *   - docs/flow-coverage/i18n-translation/P10-server-specs.md (CF-813..CF-816 from edge-case discovery)
 *
 * Next CF available after FLOW-48 P11 Phase 2: CF-817.
 */

import { MASTER_TENANT_ID } from '../bootstrap/bootstrap-seeder.service';

export const I18N_TRANSLATION_BFA_RULES: Array<Record<string, unknown>> = [
  // ── Design-locked iron rules ────────────────────────────────────────────────
  {
    ruleId: 'CF-810',
    flowId: 'FLOW-48',
    type: 'SCOPE_ISOLATION',
    description:
      'Translation tenant isolation — every F1523.storeRef() call uses tenantId = ALS.tenantId at write time. No parameter override. Only T667 MarketplaceTranslationCacheJob under MASTER CLS context is exempt.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-811',
    flowId: 'FLOW-48',
    type: 'SCOPE_ISOLATION',
    description:
      'Master key boundary — T667 MarketplaceTranslationCacheJob is the ONLY service permitted to switch to MASTER_TENANT_ID CLS context for translation. All other translation calls use current ALS context unchanged.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-812',
    flowId: 'FLOW-48',
    type: 'ORDERING_CONSTRAINT',
    description:
      'English fallback absolute — GET /api/translations/:moduleId/:locale MUST return HTTP 200 in all execution paths. Errors, denied policies, and AI failures produce { fallback: true, locale: "en" }. No 4xx or 5xx from this endpoint.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },

  // ── P10 edge-case rules (CF-813..CF-816) ────────────────────────────────────
  {
    ruleId: 'CF-813',
    flowId: 'FLOW-48',
    type: 'CONCURRENCY_CONSTRAINT',
    description:
      'EC-1 Concurrent translation requests for the same tenantId/moduleId/locale produce exactly one CAS blob and one lookup ref. Second writer finds ref already present and returns cached result — no duplicate AI call.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-814',
    flowId: 'FLOW-48',
    type: 'ORDERING_CONSTRAINT',
    description:
      'EC-2 Null/malformed Accept-Language — if acceptLanguage normalises to null via BCP-47, TranslationRequestRegistrar (T665) writes nothing to xiigen-translation-requests and does not mutate i18n.enabledLocales. No-op is correct.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-815',
    flowId: 'FLOW-48',
    type: 'ORDERING_CONSTRAINT',
    description:
      'EC-3 AI invalid JSON — if IAiProvider.generateStructured() returns a payload that fails JSON schema validation, T666 pipeline falls through to CF-812 fallback and returns { fallback: true, locale: "en" }. No partial translation is written to CAS.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-816',
    flowId: 'FLOW-48',
    type: 'IDEMPOTENCY_CONSTRAINT',
    description:
      'EC-11 T667 MarketplaceTranslationCacheJob uses SETNX with key idem:translate:master:${moduleId}:${locale} at ORDER 1 (before any AI call). Concurrent job instances produce exactly one master CAS blob; duplicates return { skipped: true }.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
];
