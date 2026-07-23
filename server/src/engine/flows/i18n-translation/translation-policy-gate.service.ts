/**
 * T669 TranslationPolicyGate [VALIDATION, inline]
 * FLOW-48: i18n-translation
 *
 * Inline policy check invoked by T666 TranslationResolverService Step 2.
 * Locale is PERMITTED if EITHER:
 *   - it appears in freedom_config['i18n.enabledLocales'] for the tenant, OR
 *   - there is a xiigen-translation-requests doc for (tenantId, locale).
 *
 * Iron rules:
 *   CF-812: This gate NEVER throws. All fabric errors → returns
 *           DataProcessResult.success(false). Callers render the fallback
 *           response `{ fallback: true, locale: 'en' }`.
 *   CF-810: tenantId read from ALS only. No parameter override.
 */

import { Injectable, Inject } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../../kernel/multi-tenant/tenant-context';
import {
  TRANSLATION_REQUESTS_INDEX,
  FREEDOM_CONFIG_INDEX,
  FREEDOM_KEY_ENABLED_LOCALES,
} from './constants';

export const TRANSLATION_POLICY_GATE_SERVICE = 'TRANSLATION_POLICY_GATE_SERVICE';

@Injectable()
export class TranslationPolicyGateService {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    private readonly cls: ClsService,
  ) {}

  private getTenantId(): string {
    try {
      return this.cls.get<TenantContext>(TENANT_CONTEXT_KEY)?.tenantId ?? 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Returns success(true) if the locale is permitted for the current tenant.
   * Returns success(false) otherwise — NEVER returns failure (CF-812).
   */
  async isPermitted(locale: string): Promise<DataProcessResult<boolean>> {
    try {
      if (!locale || locale === 'en') {
        // English is always permitted — it is the bundle fallback path.
        return DataProcessResult.success(true);
      }

      const tenantId = this.getTenantId();

      // Check #1: freedom_config['i18n.enabledLocales'] includes the locale
      const cfgResult = await this.db.searchDocuments(FREEDOM_CONFIG_INDEX, {
        key: FREEDOM_KEY_ENABLED_LOCALES,
        tenantId,
      });
      if (cfgResult.isSuccess && (cfgResult.data ?? []).length > 0) {
        const cfg = cfgResult.data![0] as Record<string, unknown>;
        const enabledLocales = Array.isArray(cfg['value'])
          ? (cfg['value'] as unknown[]).filter((v): v is string => typeof v === 'string')
          : [];
        if (enabledLocales.includes(locale)) {
          return DataProcessResult.success(true);
        }
      }

      // Check #2: xiigen-translation-requests has a doc for (tenantId, locale)
      const reqResult = await this.db.searchDocuments(TRANSLATION_REQUESTS_INDEX, {
        tenantId,
        locale,
      });
      if (reqResult.isSuccess && (reqResult.data ?? []).length > 0) {
        return DataProcessResult.success(true);
      }

      return DataProcessResult.success(false);
    } catch {
      // CF-812: any unexpected error → denied (caller renders fallback), never throw
      return DataProcessResult.success(false);
    }
  }
}
