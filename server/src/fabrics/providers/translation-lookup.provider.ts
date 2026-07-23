/**
 * F1523 — TranslationLookupProvider (backed by IDatabaseService).
 *
 * No direct @elastic/elasticsearch import (Rule 1 — Fabric First).
 * Queries:
 *   - xiigen-translation-refs       via getDocument with composite docId
 *   - xiigen-translation-requests   via searchDocuments (BuildSearchFilter, DNA-2)
 *   - xiigen-freedom-config         for enabledLocales read
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../kernel/data-process-result';
import { IDatabaseService, DATABASE_SERVICE } from '../interfaces/database.interface';
import {
  ITranslationLookup,
  TranslationRef,
  TranslationRefInput,
} from '../interfaces/translation-lookup.interface';
import {
  TRANSLATION_REFS_INDEX,
  TRANSLATION_REQUESTS_INDEX,
  FREEDOM_CONFIG_INDEX,
  FREEDOM_KEY_ENABLED_LOCALES,
} from '../../engine/flows/i18n-translation/constants';

function refDocId(tenantId: string, moduleId: string, locale: string): string {
  return `${tenantId}::${moduleId}::${locale}`;
}

@Injectable()
export class TranslationLookupProvider implements ITranslationLookup {
  constructor(@Inject(DATABASE_SERVICE) private readonly db: IDatabaseService) {}

  async findRef(
    tenantId: string,
    moduleId: string,
    locale: string,
  ): Promise<DataProcessResult<TranslationRef | null>> {
    try {
      const docId = refDocId(tenantId, moduleId, locale);
      const result = await this.db.getDocument(TRANSLATION_REFS_INDEX, docId);
      if (!result.isSuccess || !result.data) {
        // NOT_FOUND (or any miss) resolves to null — not a failure.
        return DataProcessResult.success<TranslationRef | null>(null);
      }
      const doc = result.data;
      const contentHash = doc['contentHash'];
      const sourceHash = doc['sourceHash'];
      if (typeof contentHash !== 'string' || typeof sourceHash !== 'string') {
        return DataProcessResult.success<TranslationRef | null>(null);
      }
      return DataProcessResult.success<TranslationRef | null>({ contentHash, sourceHash });
    } catch (err) {
      return DataProcessResult.error('TRANSLATION_REF_LOOKUP_FAILED', String(err));
    }
  }

  async storeRef(ref: TranslationRefInput): Promise<DataProcessResult<void>> {
    try {
      const docId = refDocId(ref.tenantId, ref.moduleId, ref.locale);
      const doc: Record<string, unknown> = {
        tenantId: ref.tenantId,
        moduleId: ref.moduleId,
        locale: ref.locale,
        contentHash: ref.contentHash,
        sourceHash: ref.sourceHash,
        connectionType: ref.connectionType,
        knowledgeScope: ref.connectionType === 'FLOW_SCOPED' ? 'GLOBAL' : 'PRIVATE',
        translatedAt: new Date().toISOString(),
      };
      const stored = await this.db.storeDocument(TRANSLATION_REFS_INDEX, doc, docId);
      if (!stored.isSuccess) {
        return DataProcessResult.failure<void>(
          stored.errorCode ?? 'TRANSLATION_REF_STORE_FAILED',
          stored.errorMessage ?? 'storeRef failed',
        );
      }
      return DataProcessResult.success<void>(undefined as unknown as void);
    } catch (err) {
      return DataProcessResult.error<void>('TRANSLATION_REF_STORE_ERROR', String(err));
    }
  }

  async isLocalePermitted(tenantId: string, locale: string): Promise<DataProcessResult<boolean>> {
    // CF-812: NEVER throws. Any error → success(false) with warning metadata.
    try {
      if (!tenantId || !locale) {
        return DataProcessResult.success<boolean>(false, { warning: 'missing_tenant_or_locale' });
      }

      // 1. Read i18n.enabledLocales from freedom config for this tenant
      const cfgResult = await this.db.searchDocuments(FREEDOM_CONFIG_INDEX, {
        key: FREEDOM_KEY_ENABLED_LOCALES,
        tenantId,
      });
      if (cfgResult.isSuccess && (cfgResult.data ?? []).length > 0) {
        const cfgDoc = cfgResult.data![0] as Record<string, unknown>;
        const value = cfgDoc['value'];
        if (Array.isArray(value) && value.includes(locale)) {
          return DataProcessResult.success<boolean>(true);
        }
      }

      // 2. Fall back to xiigen-translation-requests lookup (user-driven requests)
      const reqResult = await this.db.searchDocuments(TRANSLATION_REQUESTS_INDEX, {
        tenantId,
        locale,
      });
      if (reqResult.isSuccess && (reqResult.data ?? []).length > 0) {
        return DataProcessResult.success<boolean>(true);
      }

      return DataProcessResult.success<boolean>(false);
    } catch (err) {
      return DataProcessResult.success<boolean>(false, { warning: `isLocalePermitted_error:${String(err)}` });
    }
  }
}
