/**
 * T203 SchemaMigrationOrchestrator [ORCHESTRATION]
 * FLOW-11: Schema Registry & DAG
 *
 * Iron rules:
 *   IR-T203-1: ONLY on BREAKING changes — not on ADDITIVE publish.
 *   IR-T203-2: Paginated processing — never all-at-once result set.
 *   IR-T203-3: Updates schemaVersion field on migrated documents.
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';

interface TenantContextLookup {
  getCurrentTenantId?: () => { isSuccess: boolean; data?: string };
  get?: (key: string) => { tenantId?: string } | undefined;
}

const PAGE_SIZE = 100;

@Injectable()
export class SchemaMigrationOrchestratorService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbService: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueService: IQueueService,
    private readonly tenantContext: TenantContextLookup,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T203',
        serviceName: 'SchemaMigrationOrchestratorService',
        flowId: 'FLOW-11',
      }),
    });
  }

  private getTenantId(fallback?: string): string {
    const resolved = this.tenantContext.getCurrentTenantId?.();
    if (resolved?.isSuccess && typeof resolved.data === 'string' && resolved.data.length > 0) {
      return resolved.data;
    }
    const legacyTenant = this.tenantContext.get?.('tenant')?.tenantId;
    return legacyTenant ?? fallback ?? 'unknown';
  }
  // @EventPattern('SchemaPublished') — see engine module for event binding
  async onSchemaPublished(event: Record<string, unknown>): Promise<void> {
    // IR-T203-1: only on BREAKING
    if (event['changeType'] !== 'BREAKING') return;
    const tenantId = this.getTenantId(event['tenantId'] as string);
    await this.migrate({
      schemaType: event['schemaType'] as string,
      newVersion: event['version'] as string,
      previousVersion: event['previousVersion'] as string | undefined,
      tenantId,
    });
  }

  async migrate(input: {
    schemaType: string;
    newVersion: string;
    previousVersion?: string;
    tenantId: string;
  }): Promise<DataProcessResult<{ migratedCount: number }>> {
    try {
      let offset = 0;
      let totalMigrated = 0;
      let hasMore = true;

      while (hasMore) {
        // IR-T203-2: paginated — never all-at-once
        const page = await this.dbService.searchDocuments(
          `xiigen-documents-${input.schemaType}`,
          {
            tenantId: input.tenantId,
            schemaType: input.schemaType,
            schemaVersion: input.previousVersion,
          },
          PAGE_SIZE,
          offset,
        );
        const docs = page.isSuccess ? (page.data ?? []) : [];
        if (docs.length === 0) {
          hasMore = false;
          break;
        }

        for (const doc of docs) {
          const docId = String(doc['id'] ?? doc['docId'] ?? '');
          if (!docId) continue;
          // IR-T203-3: update schemaVersion field
          await this.dbService.storeDocument(
            `xiigen-documents-${input.schemaType}`,
            { ...doc, schemaVersion: input.newVersion, migratedAt: new Date().toISOString() },
            docId,
          );
          totalMigrated++;
        }

        offset += PAGE_SIZE;
        if (docs.length < PAGE_SIZE) hasMore = false;
      }

      await this.queueService.enqueue('SchemaMigrationCompleted', {
        schemaType: input.schemaType,
        newVersion: input.newVersion,
        migratedCount: totalMigrated,
        tenantId: input.tenantId,
      });

      return DataProcessResult.success({ migratedCount: totalMigrated });
    } catch (err) {
      return DataProcessResult.failure(
        'MIGRATION_ERROR',
        `SchemaMigrationOrchestrator threw: ${String(err)}`,
      );
    }
  }
}
