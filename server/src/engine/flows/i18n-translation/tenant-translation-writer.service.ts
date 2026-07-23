/**
 * T668 TenantTranslationWriter [DATA_PIPELINE]
 * FLOW-48: i18n-translation
 *
 * Hashes a translation blob (SHA-256), stores the content by hash in a simple
 * CAS index, and writes a lookup ref via F1523 ITranslationLookup.
 *
 * Iron rules:
 *   CF-810: tenantId ALWAYS read from ALS, never from a parameter — the caller
 *           does not pass it. The only code path that writes under a different
 *           tenant is T667 MarketplaceTranslationCacheJob, which first switches
 *           CLS context to MASTER_TENANT_ID before invoking this writer.
 *   CF-813: docId on translation-refs = `${tenantId}::${moduleId}::${locale}`
 *           provides OCC — concurrent writes produce exactly one blob + one ref.
 *   DNA-8:  storeDocument completes before this method returns.
 */

import { Injectable, Inject } from '@nestjs/common';
import { createHash } from 'crypto';
import { ClsService } from 'nestjs-cls';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../../kernel/multi-tenant/tenant-context';
import {
  ITranslationLookup,
  TRANSLATION_LOOKUP_SERVICE,
  TranslationConnectionType,
} from '../../../fabrics/interfaces/translation-lookup.interface';

export const TENANT_TRANSLATION_WRITER_SERVICE = 'TENANT_TRANSLATION_WRITER_SERVICE';

const CAS_TRANSLATIONS_INDEX = 'xiigen-cas-translations';

export interface WriteInput {
  moduleId: string;
  locale: string;
  translations: Record<string, string>;
  sourceKeys: string[];
  connectionType?: TranslationConnectionType;
}

export interface WriteResult {
  contentHash: string;
  sourceHash: string;
}

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

@Injectable()
export class TenantTranslationWriterService {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Inject(TRANSLATION_LOOKUP_SERVICE) private readonly lookup: ITranslationLookup,
    private readonly cls: ClsService,
  ) {}

  private getTenantId(): string {
    try {
      return this.cls.get<TenantContext>(TENANT_CONTEXT_KEY)?.tenantId ?? 'unknown';
    } catch {
      return 'unknown';
    }
  }

  async write(input: WriteInput): Promise<DataProcessResult<WriteResult>> {
    try {
      if (!input?.moduleId || !input?.locale || !input?.translations) {
        return DataProcessResult.failure('VALIDATION_FAILURE', 'moduleId, locale, translations required');
      }

      const tenantId = this.getTenantId();
      const contentHash = sha256(JSON.stringify(input.translations));
      const sourceHash = sha256(JSON.stringify([...(input.sourceKeys ?? [])].sort()));

      // Step 1: Store the blob in CAS by content hash. Idempotent by design —
      // second writer for the same hash sees a no-op upsert.
      const blobDoc: Record<string, unknown> = {
        contentHash,
        content: JSON.stringify(input.translations),
        moduleId: input.moduleId,
        locale: input.locale,
        storedAt: new Date().toISOString(),
      };
      const blobStored = await this.db.storeDocument(CAS_TRANSLATIONS_INDEX, blobDoc, contentHash);
      if (!blobStored.isSuccess) {
        return DataProcessResult.failure(
          blobStored.errorCode ?? 'CAS_STORE_FAILED',
          blobStored.errorMessage ?? 'failed to store CAS blob',
        );
      }

      // Step 2: Write the tenant ref. CF-813 idempotency via composite docId.
      const refStored = await this.lookup.storeRef({
        tenantId,
        moduleId: input.moduleId,
        locale: input.locale,
        contentHash,
        sourceHash,
        connectionType: input.connectionType ?? 'TENANT_PRIVATE',
      });
      if (!refStored.isSuccess) {
        return DataProcessResult.failure(
          refStored.errorCode ?? 'REF_STORE_FAILED',
          refStored.errorMessage ?? 'failed to store translation ref',
        );
      }

      return DataProcessResult.success({ contentHash, sourceHash });
    } catch (err) {
      return DataProcessResult.failure(
        'TENANT_TRANSLATION_WRITER_ERROR',
        `TenantTranslationWriter threw: ${String(err)}`,
      );
    }
  }
}
