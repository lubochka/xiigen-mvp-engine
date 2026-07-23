/**
 * FACTORY F1523 — ITranslationLookup
 *
 * Backed by IDatabaseService. Service code never imports Elasticsearch SDK directly.
 * Writes / reads two indices:
 *   - xiigen-translation-refs      (docId = `${tenantId}::${moduleId}::${locale}`)
 *   - xiigen-translation-requests  (per-tenant locale request records)
 *
 * Tenant scope:
 *   - findRef / storeRef / isLocalePermitted all accept an explicit tenantId parameter
 *     because the master (FLOW_SCOPED) lookup needs MASTER_TENANT_ID while the tenant
 *     rows use ALS.tenantId. CF-810 is enforced at the CALLER (T668 reads ALS before
 *     calling storeRef) — the interface itself must remain tenant-agnostic so T667 can
 *     pass MASTER_TENANT_ID under CLS.
 *
 * Iron rules (for callers):
 *   - CF-810: tenant-scoped callers MUST source tenantId from ALS, never from a parameter.
 *   - CF-811: only T667 MarketplaceTranslationCacheJob calls findRef/storeRef with MASTER_TENANT_ID.
 *   - CF-812: isLocalePermitted never throws — failures return success(false).
 */

import { DataProcessResult } from '../../kernel/data-process-result';

export const TRANSLATION_LOOKUP_SERVICE = Symbol('TRANSLATION_LOOKUP_SERVICE');

export type TranslationConnectionType = 'TENANT_PRIVATE' | 'FLOW_SCOPED';

export interface TranslationRef {
  contentHash: string;
  sourceHash: string;
}

export interface TranslationRefInput {
  tenantId: string;
  moduleId: string;
  locale: string;
  contentHash: string;
  sourceHash: string;
  connectionType: TranslationConnectionType;
}

export interface ITranslationLookup {
  /**
   * Read the translation ref for (tenantId, moduleId, locale).
   * Returns success(null) when no ref exists — never failure for a miss.
   */
  findRef(
    tenantId: string,
    moduleId: string,
    locale: string,
  ): Promise<DataProcessResult<TranslationRef | null>>;

  /**
   * Store a translation ref. docId = `${tenantId}::${moduleId}::${locale}`.
   * Idempotent — replays with the same hashes are no-ops.
   */
  storeRef(ref: TranslationRefInput): Promise<DataProcessResult<void>>;

  /**
   * Policy probe — locale permitted under this tenant iff
   *   (a) it appears in i18n.enabledLocales, OR
   *   (b) there is at least one translation request row for the tenant/locale.
   *
   * Never throws. Any fabric error resolves to success(false) with metadata.warning set.
   */
  isLocalePermitted(tenantId: string, locale: string): Promise<DataProcessResult<boolean>>;
}
