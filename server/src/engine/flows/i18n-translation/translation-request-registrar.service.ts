/**
 * T665 TranslationRequestRegistrar [VALIDATION]
 * FLOW-48: i18n-translation
 *
 * Consumes AccountCreated event (FLOW-01). If acceptLanguage is provided and
 * i18n.autoDetectFromRegistrations is ON, stores a translation-request row and
 * expands i18n.enabledLocales to include the detected locale (de-duplicated).
 *
 * Iron rules (per DESIGN-SIMULATION-R1 §Section 7 T665):
 *   IR-1 (DNA-8): storeDocument(xiigen-translation-requests) fires BEFORE any
 *                 freedom_config update or queue enqueue.
 *   IR-2 (CF-810): tenantId read from ALS.tenantContext — NEVER from event payload.
 *   IR-3 (CF-814): parseLocale returns null on invalid BCP-47 input → service no-ops,
 *                  never throws.
 *   IR-4:         i18n.enabledLocales union uses Set semantics — no duplicate entries.
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
  FREEDOM_KEY_AUTO_DETECT,
} from './constants';

export interface AccountCreatedInboundEvent {
  userId: string;
  email: string;
  tenantId: string; // present on payload but IGNORED — ALS is source of truth
  status: 'unverified';
  acceptLanguage?: string | null;
}

/**
 * Parse an Accept-Language header value into a normalised primary BCP-47 subtag.
 * Examples:
 *   'he-IL'              → 'he'
 *   'en-US,en;q=0.9'     → 'en'
 *   'xyz-invalid'        → null   (CF-814)
 *   ''                   → null
 *   null/undefined       → null
 *
 * Rules:
 *   - Picks the first language tag (comma-separated list), drops q-value.
 *   - Returns the primary language subtag lowercased (2-3 letters).
 *   - Rejects values that do not match `^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$`.
 */
export function parseLocale(input: string | null | undefined): string | null {
  if (input === null || input === undefined) return null;
  const trimmed = String(input).trim();
  if (!trimmed) return null;

  // Take the first language tag (strip q-value + any comma-separated preferences)
  const firstTag = trimmed.split(',')[0].trim().split(';')[0].trim();
  if (!firstTag) return null;

  // BCP-47 shape: primary subtag 2-3 alpha chars, optional region/variant subtags
  if (!/^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/.test(firstTag)) return null;

  const primary = firstTag.split('-')[0].toLowerCase();
  if (primary.length < 2 || primary.length > 3) return null;
  return primary;
}

@Injectable()
export class TranslationRequestRegistrarService {
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
   * Consume AccountCreated. Return success(skipped=true) on no-op paths;
   * success(stored=true) on the store-and-expand path.
   */
  async onAccountCreated(
    event: AccountCreatedInboundEvent,
  ): Promise<DataProcessResult<{ skipped: boolean; locale: string | null }>> {
    try {
      // CF-810: tenantId always from ALS, never payload
      const tenantId = this.getTenantId();

      // CF-814: invalid/null acceptLanguage → no-op
      const locale = parseLocale(event?.acceptLanguage ?? null);
      if (!locale) {
        return DataProcessResult.success({ skipped: true, locale: null });
      }

      // Read freedom config — autoDetect flag + enabledLocales
      const autoDetectResult = await this.db.searchDocuments(FREEDOM_CONFIG_INDEX, {
        key: FREEDOM_KEY_AUTO_DETECT,
        tenantId,
      });
      const autoDetectDoc =
        autoDetectResult.isSuccess && (autoDetectResult.data ?? []).length > 0
          ? (autoDetectResult.data![0] as Record<string, unknown>)
          : null;
      // Default: ON (undefined treated as enabled — opt-out semantics)
      const autoDetectOn = autoDetectDoc ? autoDetectDoc['value'] !== false : true;
      if (!autoDetectOn) {
        return DataProcessResult.success({ skipped: true, locale });
      }

      // DNA-8: storeDocument BEFORE any freedom_config update
      const reqDoc: Record<string, unknown> = {
        tenantId,
        locale,
        source: 'user_registration',
        requestedAt: new Date().toISOString(),
        connectionType: 'FLOW_SCOPED',
        knowledgeScope: 'PRIVATE',
      };
      const stored = await this.db.storeDocument(TRANSLATION_REQUESTS_INDEX, reqDoc);
      if (!stored.isSuccess) {
        return DataProcessResult.failure(
          stored.errorCode ?? 'TRANSLATION_REQUEST_STORE_FAILED',
          stored.errorMessage ?? 'translation request store failed',
        );
      }

      // Expand i18n.enabledLocales if the locale is not already there (Set semantics)
      const enabledResult = await this.db.searchDocuments(FREEDOM_CONFIG_INDEX, {
        key: FREEDOM_KEY_ENABLED_LOCALES,
        tenantId,
      });
      let existing: string[] = [];
      let existingDocId: string | undefined;
      if (enabledResult.isSuccess && (enabledResult.data ?? []).length > 0) {
        const existingDoc = enabledResult.data![0] as Record<string, unknown>;
        const value = existingDoc['value'];
        if (Array.isArray(value)) {
          existing = value.filter((v): v is string => typeof v === 'string');
        }
        const docId = existingDoc['_id'] ?? existingDoc['docId'];
        if (typeof docId === 'string') existingDocId = docId;
      }

      if (!existing.includes(locale)) {
        const unioned = Array.from(new Set([...existing, locale]));
        const cfgDoc: Record<string, unknown> = {
          key: FREEDOM_KEY_ENABLED_LOCALES,
          value: unioned,
          tenantId,
          updatedAt: new Date().toISOString(),
        };
        const cfgDocId = existingDocId ?? `${tenantId}::${FREEDOM_KEY_ENABLED_LOCALES}`;
        await this.db.storeDocument(FREEDOM_CONFIG_INDEX, cfgDoc, cfgDocId);
      }

      return DataProcessResult.success({ skipped: false, locale });
    } catch (err) {
      return DataProcessResult.failure(
        'TRANSLATION_REQUEST_REGISTRAR_ERROR',
        `TranslationRequestRegistrar threw: ${String(err)}`,
      );
    }
  }
}
