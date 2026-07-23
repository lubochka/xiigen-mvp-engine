/**
 * T206 SchemaQualityAnalyzer [SCHEDULED]
 * FLOW-11: Schema Registry & DAG
 *
 * Iron rules:
 *   IR-T206-1: Read-only analysis — NEVER updateDocument on any schema.
 *   IR-T206-2: Produces quality report only — no side effects.
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';

interface TenantContextLookup {
  getCurrentTenantId?: () => { isSuccess: boolean; data?: string };
  get?: (key: string) => { tenantId?: string } | undefined;
}

const SCHEMA_REGISTRY_INDEX = 'xiigen-schema-registry';

export interface QualityReport {
  analyzedAt: string;
  totalSchemas: number;
  activeSchemas: number;
  deprecatedSchemas: number;
  schemasWithNoDescription: number;
  schemasWithNoDependencies: number;
  qualityScore: number;
}

@Injectable()
export class SchemaQualityAnalyzerService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbService: IDatabaseService,
    private readonly tenantContext: TenantContextLookup,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T206',
        serviceName: 'SchemaQualityAnalyzerService',
        flowId: 'FLOW-11',
      }),
    });
  }

  private getTenantId(): string {
    const resolved = this.tenantContext.getCurrentTenantId?.();
    if (resolved?.isSuccess && typeof resolved.data === 'string' && resolved.data.length > 0) {
      return resolved.data;
    }
    const legacyTenant = this.tenantContext.get?.('tenant')?.tenantId;
    return legacyTenant ?? 'unknown';
  }

  /** IR-T206-1: read-only — never updateDocument. */
  async analyze(): Promise<DataProcessResult<QualityReport>> {
    try {
      const tenantId = this.getTenantId();
      const result = await this.dbService.searchDocuments(SCHEMA_REGISTRY_INDEX, { tenantId });
      const schemas = result.isSuccess ? (result.data ?? []) : [];

      const activeSchemas = schemas.filter(
        (s) => s['status'] === 'ACTIVE' && s['activeUntil'] == null,
      ).length;
      const deprecatedSchemas = schemas.filter(
        (s) => s['status'] === 'DEPRECATED' || s['deprecated'] === true,
      ).length;
      const schemasWithNoDescription = schemas.filter((s) => {
        const js = s['jsonSchema'] as Record<string, unknown> | undefined;
        return !js?.['description'];
      }).length;
      const schemasWithNoDependencies = schemas.filter((s) => {
        const deps = (s['dependencies'] as string[]) ?? [];
        return deps.length === 0;
      }).length;

      const total = schemas.length;
      const qualityScore =
        total === 0 ? 0 : Math.round(((total - schemasWithNoDescription) / total) * 100) / 100;

      return DataProcessResult.success({
        analyzedAt: new Date().toISOString(),
        totalSchemas: total,
        activeSchemas,
        deprecatedSchemas,
        schemasWithNoDescription,
        schemasWithNoDependencies,
        qualityScore,
      });
    } catch (err) {
      return DataProcessResult.failure(
        'QUALITY_ANALYSIS_ERROR',
        `SchemaQualityAnalyzer threw: ${String(err)}`,
      );
    }
  }
}
