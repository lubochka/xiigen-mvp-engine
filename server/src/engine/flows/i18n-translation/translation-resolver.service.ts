/**
 * T666 TranslationResolverService [ORCHESTRATION]
 * FLOW-48: i18n-translation
 *
 * GET /api/translations/:moduleId/:locale entry point (called by the controller).
 *
 * Pipeline (per DESIGN-R2 Decision 2):
 *   Step 1 — Tenant CAS cache check via F1523.findRef
 *   Step 2 — Policy gate via T669 TranslationPolicyGate (inline)
 *   Step 3 — Marketplace probe (DEFERRED — requires TenantModuleRegistry; current
 *            behaviour proceeds directly to Step 5)
 *   Step 4 — Marketplace delta path (DEFERRED — requires Step 3)
 *   Step 5 — Full tenant translation via IAiProvider.generateStructured() →
 *            T668 TenantTranslationWriter
 *
 * Iron rules:
 *   CF-812: Never throws, never returns failure. Any error path falls through
 *           to { fallback: true, locale: 'en' }. The controller layer adds a
 *           belt-and-suspenders try/catch that also emits fallback on a bare
 *           throw.
 *   CF-810: All DB reads/writes use ALS tenantId.
 *   CF-815: AI provider payload that fails schema validation → fallback path.
 */

import { Injectable, Inject, Optional } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../../kernel/multi-tenant/tenant-context';
import {
  ITranslationLookup,
  TRANSLATION_LOOKUP_SERVICE,
} from '../../../fabrics/interfaces/translation-lookup.interface';
import { TranslationPolicyGateService } from './translation-policy-gate.service';
import { TenantTranslationWriterService } from './tenant-translation-writer.service';
import { MarketplaceTranslationCacheJobService } from './marketplace-translation-cache-job.service';
import { TenantModuleRegistry } from '../../tenant-module-registry.service';
import { MASTER_TENANT_ID } from '../../../bootstrap/bootstrap-seeder.service';

export const TRANSLATION_RESOLVER_SERVICE = 'TRANSLATION_RESOLVER_SERVICE';

const CAS_TRANSLATIONS_INDEX = 'xiigen-cas-translations';

export interface TranslationsResult {
  moduleId: string;
  locale: string;
  translations: Record<string, string>;
}

export interface TranslationsFallback {
  fallback: true;
  locale: 'en';
}

export type TranslationsResponse = TranslationsResult | TranslationsFallback;

function fallback(): TranslationsFallback {
  return { fallback: true, locale: 'en' };
}

@Injectable()
export class TranslationResolverService {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Inject(TRANSLATION_LOOKUP_SERVICE) private readonly lookup: ITranslationLookup,
    private readonly policyGate: TranslationPolicyGateService,
    private readonly writer: TenantTranslationWriterService,
    private readonly cls: ClsService,
    private readonly marketplaceCacheJob: MarketplaceTranslationCacheJobService,
    @Optional() private readonly tenantModuleRegistry?: TenantModuleRegistry,
    // Optional dependency — if AI is not wired in this environment, Step 5 returns
    // fallback instead of invoking it. Keeps the tsc clean on test runs.
    @Optional() @Inject('AI_PROVIDER_OPTIONAL') private readonly aiProvider?: unknown,
  ) {}

  private getTenantId(): string {
    try {
      return this.cls.get<TenantContext>(TENANT_CONTEXT_KEY)?.tenantId ?? 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Resolve translations for (moduleId, locale, sourceKeys). Returns either a
   * translations payload or the fallback marker. ALWAYS returns success — the
   * controller translates this into HTTP 200 unconditionally (CF-812).
   */
  async resolve(
    moduleId: string,
    locale: string,
    sourceKeys: string[],
  ): Promise<DataProcessResult<TranslationsResponse>> {
    try {
      if (!moduleId || !locale) {
        return DataProcessResult.success(fallback());
      }
      if (locale === 'en') {
        // Bundle-first: English always resolved client-side. Return fallback marker
        // so the controller returns a recognisable shape.
        return DataProcessResult.success(fallback());
      }

      const tenantId = this.getTenantId();

      // Step 1 — Tenant cache check
      const refResult = await this.lookup.findRef(tenantId, moduleId, locale);
      if (refResult.isSuccess && refResult.data) {
        const cached = await this.retrieveCas(refResult.data.contentHash);
        if (cached) {
          return DataProcessResult.success({
            moduleId,
            locale,
            translations: cached,
          });
        }
      }

      // Step 2 — Policy gate (CF-812 — never throws)
      const permitted = await this.policyGate.isPermitted(locale);
      if (!permitted.isSuccess || !permitted.data) {
        return DataProcessResult.success(fallback());
      }

      // Step 3 — Marketplace probe: is this module installed from marketplace for the tenant?
      const isMarketplaceLinked = await this.isMarketplaceModule(tenantId, moduleId);

      // Step 4 — Marketplace delta path (runs only if marketplace source)
      if (isMarketplaceLinked) {
        const masterRef = await this.lookup.findRef(MASTER_TENANT_ID, moduleId, locale);
        if (masterRef.isSuccess && masterRef.data) {
          // Master cache hit
          const marketplaceKeys = await this.retrieveCas(masterRef.data.contentHash);
          if (marketplaceKeys) {
            const sourceKeysArr = Array.from(new Set(sourceKeys ?? []));
            const deltaKeys = sourceKeysArr.filter((k) => !(k in marketplaceKeys));

            if (deltaKeys.length === 0) {
              // Step 4a: delta empty — link tenant ref to master hash, zero AI call.
              await this.lookup.storeRef({
                tenantId,
                moduleId,
                locale,
                contentHash: masterRef.data.contentHash,
                sourceHash: masterRef.data.sourceHash,
                connectionType: 'TENANT_PRIVATE',
              });
              return DataProcessResult.success({ moduleId, locale, translations: marketplaceKeys });
            }

            // Step 4b: delta non-empty — translate ONLY the delta, then merge.
            const deltaTranslations = await this.aiTranslateKeys(deltaKeys, locale);
            if (deltaTranslations === null) {
              return DataProcessResult.success(fallback());
            }
            const merged: Record<string, string> = { ...marketplaceKeys, ...deltaTranslations };
            await this.writer.write({
              moduleId,
              locale,
              translations: merged,
              sourceKeys: sourceKeysArr,
              connectionType: 'TENANT_PRIVATE',
            });
            return DataProcessResult.success({ moduleId, locale, translations: merged });
          }
        }
        // Master miss — fire-and-forget the cache job. T666 then falls through
        // to Step 5 so the tenant still gets their answer this call.
        void this.marketplaceCacheJob.run({
          moduleId,
          locale,
          sourceKeys: Array.from(new Set(sourceKeys ?? [])),
        });
      }

      // Step 5 — Full tenant translation via AI
      if (!this.aiProvider || typeof (this.aiProvider as { generateStructured?: unknown }).generateStructured !== 'function') {
        // No AI provider wired — CF-812 fallback so the endpoint stays 200.
        return DataProcessResult.success(fallback());
      }

      try {
        const generated = await (this.aiProvider as {
          generateStructured: (
            prompt: string,
            schema: unknown,
            options: unknown,
          ) => Promise<{ isSuccess: boolean; data?: unknown }>;
        }).generateStructured(
          JSON.stringify(Object.fromEntries((sourceKeys ?? []).map((k) => [k, k]))),
          { type: 'object', additionalProperties: { type: 'string' } },
          { systemPrompt: `Translate JSON values to ${locale}. Return only valid JSON object.` },
        );

        if (!generated?.isSuccess || typeof generated.data !== 'object' || generated.data === null) {
          return DataProcessResult.success(fallback()); // CF-815
        }

        const translations = generated.data as Record<string, unknown>;
        // CF-815: schema validation — every value must be a string
        const normalised: Record<string, string> = {};
        for (const [k, v] of Object.entries(translations)) {
          if (typeof v !== 'string') {
            return DataProcessResult.success(fallback());
          }
          normalised[k] = v;
        }

        // Persist via T668
        await this.writer.write({
          moduleId,
          locale,
          translations: normalised,
          sourceKeys: sourceKeys ?? [],
          connectionType: 'TENANT_PRIVATE',
        });

        return DataProcessResult.success({ moduleId, locale, translations: normalised });
      } catch {
        return DataProcessResult.success(fallback());
      }
    } catch {
      // CF-812: ultimate safety net
      return DataProcessResult.success(fallback());
    }
  }

  /** Step 3 helper: is this moduleId installed from marketplace for the tenant? */
  private async isMarketplaceModule(tenantId: string, moduleId: string): Promise<boolean> {
    if (!this.tenantModuleRegistry) return false;
    try {
      const result = await this.tenantModuleRegistry.listLinkedModules(tenantId);
      if (!result.isSuccess || !result.data) return false;
      return result.data.includes(moduleId);
    } catch {
      return false;
    }
  }

  /** Translate a list of keys via IAiProvider. Returns null on any failure (CF-815). */
  private async aiTranslateKeys(
    keys: string[],
    locale: string,
  ): Promise<Record<string, string> | null> {
    if (
      !this.aiProvider ||
      typeof (this.aiProvider as { generateStructured?: unknown }).generateStructured !== 'function'
    ) {
      return null;
    }
    try {
      const input: Record<string, string> = {};
      for (const k of keys) input[k] = k;
      const generated = await (
        this.aiProvider as {
          generateStructured: (
            prompt: string,
            schema: unknown,
            options: unknown,
          ) => Promise<{ isSuccess: boolean; data?: unknown }>;
        }
      ).generateStructured(
        JSON.stringify(input),
        { type: 'object', additionalProperties: { type: 'string' } },
        { systemPrompt: `Translate JSON values to ${locale}. Return only valid JSON object.` },
      );
      if (!generated?.isSuccess || typeof generated.data !== 'object' || generated.data === null) {
        return null;
      }
      const normalised: Record<string, string> = {};
      for (const [k, v] of Object.entries(generated.data as Record<string, unknown>)) {
        if (typeof v !== 'string') return null;
        normalised[k] = v;
      }
      return normalised;
    } catch {
      return null;
    }
  }

  private async retrieveCas(contentHash: string): Promise<Record<string, string> | null> {
    try {
      const doc = await this.db.getDocument(CAS_TRANSLATIONS_INDEX, contentHash);
      if (!doc.isSuccess || !doc.data) return null;
      const content = doc.data['content'];
      if (typeof content !== 'string') return null;
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const out: Record<string, string> = {};
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof v === 'string') out[k] = v;
        }
        return out;
      }
      return null;
    } catch {
      return null;
    }
  }
}
