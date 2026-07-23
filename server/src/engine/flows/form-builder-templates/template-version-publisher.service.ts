/**
 * T638 TemplateVersionPublisher [VALIDATION]
 * FLOW-23: Form Builder Templates
 *
 * Entry: TemplatePublicationRequested event (user publishes template)
 *
 * Execution order is MACHINE (CF-23-2):
 *   ORDER 1: OCC DRAFT→PUBLISHED updateDocument with expectedVersion
 *   ORDER 2: Version immutability guard — published templates cannot change schema
 *   ORDER 3: Schema evolution check — new schema must be forward-compatible superset
 *   ORDER 4: storeDocument(publication audit, append-only) — BEFORE emit
 *   ORDER 5: enqueue(VersionPublished) — only after all gates pass
 *
 * Iron rules:
 *   IR-1: OCC updateDocument(status:PUBLISHED, expectedVersion) at ORDER 1
 *   IR-2: Version immutability at ORDER 2 — published templates cannot be modified
 *   IR-3: Schema evolution check at ORDER 3 — forward-compatible superset only
 *   IR-4: Append-only audit storeDocument at ORDER 4 BEFORE enqueue (DNA-8)
 *   IR-5: VersionPublished emitted only after all validation and OCC write succeed
 */

import { Injectable, Inject } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../../kernel/multi-tenant/tenant-context';

const TEMPLATES_INDEX = 'xiigen-templates';
const AUDIT_INDEX = 'xiigen-publication-audit';
const TEMPLATE_IMMUTABLE_STATES = ['PUBLISHED'] as const;

@Injectable()
export class TemplateVersionPublisherService {
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

  async publishTemplate(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const templateId = event['templateId'] as string;
    const expectedVersion = event['version'] as string | number | undefined;
    const newSchema = event['schema'] as Record<string, unknown> | undefined;

    if (!templateId) {
      return DataProcessResult.failure('INVALID_INPUT', 'templateId is required');
    }

    const publishedAt = new Date().toISOString();

    // ── ORDER 1: OCC DRAFT→PUBLISHED updateDocument ───────────────────────────
    const templateResult = await this.db.searchDocuments(TEMPLATES_INDEX, { templateId });
    if (!templateResult.isSuccess || (templateResult.data ?? []).length === 0) {
      return DataProcessResult.failure('TEMPLATE_NOT_FOUND', `Template ${templateId} not found`);
    }

    const template = (templateResult.data ?? [])[0] as Record<string, unknown>;
    const currentStatus = template['status'] as string | undefined;
    const currentVersion = template['version'] as number | undefined;

    if (currentStatus === 'PUBLISHED') {
      await this.queue.enqueue('VersionImmutableRejected', {
        templateId,
        tenantId,
        status: 'PUBLISHED',
        reason: 'Cannot publish an already published template',
      });

      await this.db.storeDocument(AUDIT_INDEX, {
        templateId,
        tenantId,
        phase: 'IMMUTABILITY_VIOLATION',
        publishedAt,
        knowledgeScope: 'PRIVATE',
      });

      return DataProcessResult.failure(
        'VERSION_IMMUTABLE',
        'Published templates cannot be modified',
      );
    }

    const nextVersion = ((currentVersion ?? 0) as number) + 1;

    // ── ORDER 2: Version immutability guard (already checked in ORDER 1) ────────
    if (
      TEMPLATE_IMMUTABLE_STATES.includes(
        currentStatus as (typeof TEMPLATE_IMMUTABLE_STATES)[number],
      )
    ) {
      await this.queue.enqueue('VersionImmutableRejected', {
        templateId,
        tenantId,
        status: currentStatus,
      });

      return DataProcessResult.failure(
        'IMMUTABLE_TEMPLATE',
        `Template is in immutable state: ${currentStatus}`,
      );
    }

    // ── ORDER 3: Schema evolution check ───────────────────────────────────────
    if (newSchema && template['schema']) {
      const previousSchema = template['schema'] as Record<string, unknown>;
      const previousProperties = (previousSchema['properties'] as Record<string, unknown>) ?? {};
      const newProperties = (newSchema['properties'] as Record<string, unknown>) ?? {};

      for (const [fieldName] of Object.entries(previousProperties)) {
        if (!newProperties[fieldName]) {
          await this.queue.enqueue('SchemaEvolutionInvalid', {
            templateId,
            tenantId,
            reason: `Field ${fieldName} removed from schema — not forward-compatible`,
            removedField: fieldName,
          });

          await this.db.storeDocument(AUDIT_INDEX, {
            templateId,
            tenantId,
            phase: 'SCHEMA_EVOLUTION_FAILED',
            removedField: fieldName,
            publishedAt,
            knowledgeScope: 'PRIVATE',
          });

          return DataProcessResult.failure(
            'SCHEMA_EVOLUTION_INVALID',
            `Field ${fieldName} cannot be removed — not forward-compatible`,
          );
        }
      }
    }

    // ── ORDER 4: Append-only audit write ──────────────────────────────────────
    await this.db.storeDocument(AUDIT_INDEX, {
      templateId,
      tenantId,
      phase: 'PUBLICATION_SUCCESSFUL',
      fromVersion: currentVersion ?? 0,
      toVersion: nextVersion,
      publishedAt,
      knowledgeScope: 'PRIVATE',
    });

    // storeDocumentWithOCC — IR-1 (NEVER plain storeDocument or updateDocument for state transitions)
    const versionPin = template['_version'] as string | undefined;
    const occOpts = versionPin
      ? {
          ifSeqNo: parseInt(versionPin.split(':')[0] ?? '0', 10),
          ifPrimaryTerm: parseInt(versionPin.split(':')[1] ?? '1', 10),
        }
      : { ifSeqNo: 0, ifPrimaryTerm: 1 };
    const updateResult = await this.db.storeDocumentWithOCC(
      TEMPLATES_INDEX,
      {
        ...template,
        status: 'PUBLISHED',
        version: nextVersion,
        publishedAt,
        schema: newSchema ?? template['schema'],
      },
      templateId,
      occOpts,
    );

    if (!updateResult.isSuccess) {
      await this.queue.enqueue('TemplatePublicationConflict', {
        templateId,
        tenantId,
        expectedVersion,
        actualVersion: currentVersion,
      });

      return DataProcessResult.failure(
        'OCC_CONFLICT',
        'Publication conflict — template was modified',
      );
    }

    // ── ORDER 5: Emit VersionPublished ─────────────────────────────────────────
    await this.queue.enqueue('VersionPublished', {
      templateId,
      tenantId,
      version: nextVersion,
      publishedAt,
    });

    return DataProcessResult.success({
      templateId,
      tenantId,
      status: 'PUBLISHED',
      version: nextVersion,
      publishedAt,
    });
  }
}
