/**
 * T667 MarketplaceTranslationCacheJob [TRANSACTION, async]
 * FLOW-48: i18n-translation
 *
 * Translates marketplace module base terms under MASTER_TENANT_ID CLS context
 * and writes a master CAS blob + master lookup ref. Subsequent tenant requests
 * with the same marketplace packageId take the Step 4 marketplace-delta path
 * in T666 instead of translating the full source themselves.
 *
 * Iron rules:
 *   CF-811 — ONLY this service may switch CLS to MASTER_TENANT_ID for
 *            translation purposes. All other translation calls use current
 *            ALS context unchanged. Enforced by placing the context switch
 *            inside run() and ensuring no other FLOW-48 service calls
 *            ClsService.run({master}) in its code path.
 *   CF-816 — SETNX idempotency at ORDER 1 (BEFORE any AI call). Concurrent
 *            job invocations for the same (moduleId, locale) produce exactly
 *            one master CAS blob. Duplicate invocation returns { skipped: true }.
 *            We emulate SETNX via an idempotency sentinel doc — the sentinel
 *            docId is the SETNX key; the storeDocument call is atomic from
 *            the ES side when combined with OCC semantics on composite IDs.
 *   CF-810 — storeRef honours the ALS tenantId. Inside run() the ALS is
 *            MASTER_TENANT_ID, so CF-810 is satisfied by the standard path.
 *   CF-812 — Never throws. All failure paths resolve to
 *            DataProcessResult.success({ skipped: true }) with a warning metadata
 *            entry so the caller can log but not block.
 */

import { Injectable, Inject, Optional } from '@nestjs/common';
import { createHash } from 'crypto';
import { ClsService } from 'nestjs-cls';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { TENANT_CONTEXT_KEY, TenantContext } from '../../../kernel/multi-tenant/tenant-context';
import { MASTER_TENANT_ID } from '../../../bootstrap/bootstrap-seeder.service';
import {
  ITranslationLookup,
  TRANSLATION_LOOKUP_SERVICE,
} from '../../../fabrics/interfaces/translation-lookup.interface';

export const MARKETPLACE_TRANSLATION_CACHE_JOB_SERVICE =
  'MARKETPLACE_TRANSLATION_CACHE_JOB_SERVICE';

const CAS_TRANSLATIONS_INDEX = 'xiigen-cas-translations';
const IDEMPOTENCY_INDEX = 'xiigen-translation-job-idempotency';

export interface MarketplaceCacheJobInput {
  moduleId: string;
  locale: string;
  /** English source keys the marketplace module ships. */
  sourceKeys: string[];
}

export interface MarketplaceCacheJobResult {
  skipped: boolean;
  contentHash?: string;
  reason?: string;
}

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function idemKey(moduleId: string, locale: string): string {
  return `idem:translate:master:${moduleId}:${locale}`;
}

/**
 * Master TenantContext used ONLY by T667 for the CF-811 CLS switch. Pattern
 * mirrors engine-bootstrapper.ts — required fields: id, name, status, plan,
 * configOverrides, apiKeys, createdAt, updatedAt.
 */
function buildMasterContext(): TenantContext {
  const now = new Date().toISOString();
  return new TenantContext({
    id: MASTER_TENANT_ID,
    name: 'XIIGen Master',
    status: 'active',
    plan: {
      name: 'free',
      maxApiCallsPerMinute: 1000,
      maxTokensPerDay: 10_000_000,
      maxStorageMb: 10_000,
    },
    configOverrides: {},
    apiKeys: {},
    createdAt: now,
    updatedAt: now,
  });
}

@Injectable()
export class MarketplaceTranslationCacheJobService {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Inject(TRANSLATION_LOOKUP_SERVICE) private readonly lookup: ITranslationLookup,
    private readonly cls: ClsService,
    @Optional() @Inject('AI_PROVIDER_OPTIONAL') private readonly aiProvider?: unknown,
  ) {}

  /**
   * Run the job for one (moduleId, locale). Idempotent. Returns the CAS
   * contentHash on success, or { skipped: true } on a duplicate invocation,
   * a missing AI provider, or any failure path (CF-812).
   */
  async run(input: MarketplaceCacheJobInput): Promise<DataProcessResult<MarketplaceCacheJobResult>> {
    try {
      if (!input?.moduleId || !input?.locale || input.locale === 'en') {
        return DataProcessResult.success({ skipped: true, reason: 'invalid-input' });
      }

      // CF-816 ORDER 1: SETNX idempotency check BEFORE any AI call.
      const key = idemKey(input.moduleId, input.locale);
      const existing = await this.db.getDocument(IDEMPOTENCY_INDEX, key);
      if (existing.isSuccess && existing.data) {
        return DataProcessResult.success({ skipped: true, reason: 'idempotency-key-held' });
      }
      // Create sentinel. If two workers race, one will succeed and the other
      // will fail on the composite-docId OCC (storeDocument with explicit docId
      // is the SETNX primitive in the IDatabaseService fabric).
      const claim = await this.db.storeDocument(
        IDEMPOTENCY_INDEX,
        {
          key,
          moduleId: input.moduleId,
          locale: input.locale,
          claimedAt: new Date().toISOString(),
        },
        key,
      );
      if (!claim.isSuccess) {
        return DataProcessResult.success({ skipped: true, reason: 'idempotency-claim-failed' });
      }

      // CF-811 — switch CLS to MASTER_TENANT_ID. This is the ONLY place in
      // FLOW-48 that runs this switch for translation purposes.
      return await this.cls.run(async () => {
        this.cls.set(TENANT_CONTEXT_KEY, buildMasterContext());

        // If no AI provider wired, skip translation. The sentinel remains
        // claimed so a retry can re-enter this path in a later session.
        if (
          !this.aiProvider ||
          typeof (this.aiProvider as { generateStructured?: unknown }).generateStructured !==
            'function'
        ) {
          return DataProcessResult.success({
            skipped: true,
            reason: 'ai-provider-unavailable',
          });
        }

        try {
          const sourceKeyMap: Record<string, string> = {};
          for (const k of input.sourceKeys ?? []) sourceKeyMap[k] = k;

          const generated = await (
            this.aiProvider as {
              generateStructured: (
                prompt: string,
                schema: unknown,
                options: unknown,
              ) => Promise<{ isSuccess: boolean; data?: unknown }>;
            }
          ).generateStructured(
            JSON.stringify(sourceKeyMap),
            { type: 'object', additionalProperties: { type: 'string' } },
            {
              systemPrompt:
                `Translate the JSON values to locale ${input.locale}. ` +
                `Return ONLY a valid JSON object with identical keys and translated values.`,
            },
          );

          if (
            !generated?.isSuccess ||
            typeof generated.data !== 'object' ||
            generated.data === null
          ) {
            return DataProcessResult.success({ skipped: true, reason: 'ai-invalid-output' });
          }

          // CF-815: every value must be a string, else fallback (skip-cache).
          const normalised: Record<string, string> = {};
          for (const [k, v] of Object.entries(generated.data as Record<string, unknown>)) {
            if (typeof v !== 'string') {
              return DataProcessResult.success({
                skipped: true,
                reason: 'ai-schema-violation',
              });
            }
            normalised[k] = v;
          }

          const contentHash = sha256(JSON.stringify(normalised));
          const sourceHash = sha256(JSON.stringify([...(input.sourceKeys ?? [])].sort()));

          // Write master CAS blob (idempotent by content-hash).
          await this.db.storeDocument(
            CAS_TRANSLATIONS_INDEX,
            {
              contentHash,
              content: JSON.stringify(normalised),
              moduleId: input.moduleId,
              locale: input.locale,
              master: true,
              storedAt: new Date().toISOString(),
            },
            contentHash,
          );

          // Write master ref via F1523 — ALS.tenantId is now MASTER_TENANT_ID
          // so CF-810 is satisfied by the standard path.
          const refResult = await this.lookup.storeRef({
            tenantId: MASTER_TENANT_ID,
            moduleId: input.moduleId,
            locale: input.locale,
            contentHash,
            sourceHash,
            connectionType: 'FLOW_SCOPED',
          });
          if (!refResult.isSuccess) {
            return DataProcessResult.success({
              skipped: true,
              reason: refResult.errorCode ?? 'ref-store-failed',
            });
          }

          return DataProcessResult.success({ skipped: false, contentHash });
        } catch (err) {
          return DataProcessResult.success({
            skipped: true,
            reason: `ai-exception:${String(err).slice(0, 120)}`,
          });
        }
      });
    } catch (err) {
      // CF-812 safety net: async job NEVER bubbles an exception; it just skips.
      return DataProcessResult.success({
        skipped: true,
        reason: `job-exception:${String(err).slice(0, 120)}`,
      });
    }
  }
}
