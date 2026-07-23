/**
 * T643 CmsDataBindingSet [DATA_PIPELINE]
 * FLOW-23: Form Builder Templates
 *
 * Entry: CmsDataBindingRequested event (user binds CMS data to template fields)
 *
 * Execution order is MACHINE (CF-23-4):
 *   ORDER 1: Parse binding expressions — ${field} → target field mapping
 *   ORDER 2: Validate bindings against schema — all targets exist in schema
 *   ORDER 3: storeDocument(binding records) — append-only audit (DNA-8)
 *   ORDER 4: enqueue(CmsDataBound) — only after storage succeeds
 *
 * Iron rules:
 *   IR-1: DNA-1 — all bindings use Record<string,unknown>, never typed BindingResult class
 *   IR-2: Validate all binding targets exist in schema
 *   IR-3: storeDocument binding records BEFORE enqueue (DNA-8)
 */

import { Injectable, Inject } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../../kernel/multi-tenant/tenant-context';

const BINDINGS_INDEX = 'xiigen-cms-bindings';
const TEMPLATES_INDEX = 'xiigen-templates';

@Injectable()
export class CmsDataBindingSetService {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queue: IQueueService,
    private readonly cls: ClsService,
  ) {}

  private getTenantId(): string {
    try {
      return this.cls.get<TenantContext>(TENANT_CONTEXT_KEY)?.tenantId ?? 'unknown';
    } catch {
      return 'unknown';
    }
  }

  async setBinding(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const templateId = event['templateId'] as string;
    const bindings = event['bindings'] as Record<string, unknown> | undefined;

    if (!templateId || !bindings) {
      return DataProcessResult.failure('INVALID_INPUT', 'templateId and bindings are required');
    }

    const boundAt = new Date().toISOString();

    // ── ORDER 1: Parse binding expressions ────────────────────────────────────
    const bindingRecords: Record<string, unknown>[] = [];
    for (const [source, target] of Object.entries(bindings)) {
      bindingRecords.push({
        source,
        target: target as string,
        templateId,
        tenantId,
        boundAt,
      });
    }

    // ── ORDER 2: Validate bindings against schema ────────────────────────────
    const templateResult = await this.db.searchDocuments(TEMPLATES_INDEX, { templateId });
    if (!templateResult.isSuccess || (templateResult.data ?? []).length === 0) {
      return DataProcessResult.failure('TEMPLATE_NOT_FOUND', `Template ${templateId} not found`);
    }

    const template = (templateResult.data ?? [])[0] as Record<string, unknown>;
    const schema = template['schema'] as Record<string, unknown> | undefined;
    const properties = (schema?.['properties'] as Record<string, unknown>) ?? {};

    for (const binding of bindingRecords) {
      const targetField = binding['target'] as string;
      if (!properties[targetField]) {
        return DataProcessResult.failure(
          'BINDING_TARGET_NOT_FOUND',
          `Target field ${targetField} not found in schema`,
        );
      }
    }

    // ── ORDER 3: Store binding records (DNA-8) ──────────────────────────────
    for (const binding of bindingRecords) {
      await this.db.storeDocument(BINDINGS_INDEX, binding);
    }

    // Store audit entry
    await this.db.storeDocument('xiigen-binding-audit', {
      templateId,
      tenantId,
      bindingCount: bindingRecords.length,
      boundAt,
      knowledgeScope: 'PRIVATE',
    });

    // ── ORDER 4: Emit CmsDataBound ──────────────────────────────────────────
    await this.queue.enqueue('CmsDataBound', {
      templateId,
      tenantId,
      bindingCount: bindingRecords.length,
      boundAt,
    });

    return DataProcessResult.success({
      templateId,
      tenantId,
      bindingCount: bindingRecords.length,
      boundAt,
    });
  }
}
