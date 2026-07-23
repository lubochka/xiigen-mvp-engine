/**
 * T639 TemplateInstantiationEngine [ORCHESTRATION]
 * FLOW-23: Form Builder Templates
 *
 * Entry: TemplateInstantiationRequested event (user creates form from template)
 *
 * Execution order is MACHINE (CF-23-3):
 *   ORDER 1: SETNX instantiation lock before variable binding
 *   ORDER 2: Variable binding substitution ${variable} → value
 *   ORDER 3: Default value merge from template schema
 *   ORDER 4: storeDocument(form instance) — BEFORE emit
 *   ORDER 5: redis.del(lockKey) in finally block + enqueue(FormInstantiated)
 *
 * Iron rules:
 *   IR-1: SETNX lock at ORDER 1 — lock key template-instantiate-lock:{templateId}:{contextId}
 *   IR-2: Variable binding at ORDER 2 — ${variable} substitution from bindings map
 *   IR-3: Default merge at ORDER 3 — populate fields from schema defaults
 *   IR-4: storeDocument(form instance) at ORDER 4 BEFORE enqueue (DNA-8)
 *   IR-5: redis.del(lockKey) in finally block to prevent hung locks
 */

import { Injectable, Inject } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../../kernel/multi-tenant/tenant-context';

const INSTANTIATION_LOCKS_INDEX = 'xiigen-instantiation-locks';
const FORM_INSTANCES_INDEX = 'xiigen-form-instances';
const INSTANTIATION_LOCK_PREFIX = 'template-instantiate-lock' as const;

@Injectable()
export class TemplateInstantiationEngineService {
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

  async instantiateTemplate(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const templateId = event['templateId'] as string;
    const contextId = event['contextId'] as string;
    const bindings = event['bindings'] as Record<string, unknown> | undefined;
    const templateSchema = event['templateSchema'] as Record<string, unknown> | undefined;

    if (!templateId || !contextId || !templateSchema) {
      return DataProcessResult.failure(
        'INVALID_INPUT',
        'templateId, contextId, and templateSchema are required',
      );
    }

    const lockKey = `${INSTANTIATION_LOCK_PREFIX}:${templateId}:${contextId}`;
    const instantiatedAt = new Date().toISOString();

    // ── ORDER 1: SETNX instantiation lock ─────────────────────────────────────
    const lockResult = await this.db.searchDocuments(INSTANTIATION_LOCKS_INDEX, { lockKey });
    if (lockResult.isSuccess && (lockResult.data ?? []).length > 0) {
      await this.queue.enqueue('InstantiationAlreadyInProgress', {
        templateId,
        contextId,
        tenantId,
      });

      return DataProcessResult.failure(
        'INSTANTIATION_CONFLICT',
        `Instantiation already in progress for ${templateId}:${contextId}`,
      );
    }

    await this.db.storeDocument(
      INSTANTIATION_LOCKS_INDEX,
      {
        lockKey,
        templateId,
        contextId,
        tenantId,
        lockedAt: instantiatedAt,
        knowledgeScope: 'PRIVATE',
      },
      lockKey,
    );

    try {
      let formData: Record<string, unknown> = {};

      // ── ORDER 2: Variable binding ────────────────────────────────────────────
      if (bindings && Object.keys(bindings).length > 0) {
        const templatePropertiesStr = JSON.stringify(templateSchema['properties'] ?? {});
        let boundTemplate = templatePropertiesStr;

        for (const [varName, varValue] of Object.entries(bindings)) {
          const placeholder = `$\{${varName}}`;
          boundTemplate = boundTemplate.replace(new RegExp(placeholder, 'g'), String(varValue));
        }

        const boundProperties = JSON.parse(boundTemplate);
        formData = { ...boundProperties };
      }

      // ── ORDER 3: Default value merge ─────────────────────────────────────────
      const properties =
        (templateSchema['properties'] as Record<string, Record<string, unknown>> | undefined) ?? {};
      for (const [fieldName, fieldSchema] of Object.entries(properties)) {
        if (!formData[fieldName] && fieldSchema['default'] !== undefined) {
          formData[fieldName] = fieldSchema['default'];
        }
      }

      // ── ORDER 4: storeDocument(form instance) ────────────────────────────────
      const instanceId = `${templateId}:${contextId}:${Date.now()}`;
      const instanceData = {
        instanceId,
        templateId,
        contextId,
        tenantId,
        formData,
        instantiatedAt,
        knowledgeScope: 'PRIVATE',
      };

      await this.db.storeDocument(FORM_INSTANCES_INDEX, instanceData, instanceId);

      // ── ORDER 5: Emit FormInstantiated ───────────────────────────────────────
      await this.queue.enqueue('FormInstantiated', {
        instanceId,
        templateId,
        contextId,
        tenantId,
        instantiatedAt,
      });

      return DataProcessResult.success({
        instanceId,
        templateId,
        contextId,
        tenantId,
        status: 'INSTANTIATED',
        instantiatedAt,
      });
    } catch (err) {
      await this.queue.enqueue('InstantiationFailed', {
        templateId,
        contextId,
        tenantId,
        reason: (err as Error).message,
      });

      return DataProcessResult.failure('INSTANTIATION_FAILED', (err as Error).message);
    } finally {
      // ── redis.del(lockKey) in finally block ───────────────────────────────────
      await this.db.deleteDocument(INSTANTIATION_LOCKS_INDEX, lockKey).catch(() => {
        // Suppress errors from lock deletion
      });
    }
  }
}
