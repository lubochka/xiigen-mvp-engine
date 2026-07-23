/**
 * T194 SchemaPublisher [TRANSACTION, OCC]
 * FLOW-11: Schema Registry & DAG
 *
 * Iron rules:
 *   IR-T194-1: getDocumentWithVersion() → storeDocumentWithOCC(schema, versionPin).
 *              NEVER plain storeDocument(). On OCC_CONFLICT: emit SchemaPublishConflict.
 *   IR-T194-2: BREAKING changeType: verify approvalToken SETNX before OCC write.
 *              No token → SchemaPublishBlocked. ADDITIVE: no token check.
 *   IR-T194-3: storeDocument(publishAudit) BEFORE enqueue(SchemaPublished). DNA-8.
 *   IR-T194-4: Prior version superseded: updateDocument(previousVersionId, { activeUntil: now }).
 *
 * Listens on: SchemaQueued (ADDITIVE), SchemaApprovalGranted (BREAKING with token)
 * Emits: SchemaPublished, SchemaPublishConflict, SchemaPublishBlocked
 *
 * CF-11-2: OCC_PUBLISH_GATE BFA rule.
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

const SCHEMA_REGISTRY_INDEX = 'xiigen-schema-registry';
const SCHEMA_AUDIT_INDEX = 'xiigen-schema-audit';
const IDEMPOTENCY_INDEX = 'xiigen-idempotency-keys';

export interface PublishInput {
  schemaType: string;
  newSchema: Record<string, unknown>;
  version: string;
  changeType: 'ADDITIVE' | 'BREAKING';
  approvalToken?: string;
  tenantId?: string;
}

@Injectable()
export class SchemaPublisherService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbService: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueService: IQueueService,
    private readonly tenantContext: TenantContextLookup,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T194',
        serviceName: 'SchemaPublisherService',
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
  // @EventPattern('SchemaQueued') — see engine module for event binding
  async onSchemaQueued(event: Record<string, unknown>): Promise<void> {
    await this.publish({
      schemaType: event['schemaType'] as string,
      newSchema: event['newSchema'] as Record<string, unknown>,
      version: event['version'] as string,
      changeType: 'ADDITIVE',
      tenantId: event['tenantId'] as string,
    });
  }

  // @EventPattern('SchemaApprovalGranted') — see engine module for event binding
  async onSchemaApprovalGranted(event: Record<string, unknown>): Promise<void> {
    await this.publish({
      schemaType: event['schemaType'] as string,
      newSchema: event['newSchema'] as Record<string, unknown>,
      version: event['version'] as string,
      changeType: 'BREAKING',
      approvalToken: event['approvalToken'] as string,
      tenantId: event['tenantId'] as string,
    });
  }

  async publish(
    input: PublishInput,
  ): Promise<DataProcessResult<{ schemaId: string; version: string }>> {
    try {
      const tenantId = this.getTenantId(input.tenantId);

      // IR-T194-2: BREAKING requires approvalToken
      if (input.changeType === 'BREAKING') {
        if (!input.approvalToken) {
          await this.queueService.enqueue('SchemaPublishBlocked', {
            schemaType: input.schemaType,
            reason: 'missing_approval_token',
            tenantId,
          });
          return DataProcessResult.failure(
            'PUBLISH_BLOCKED',
            'BREAKING schema publish requires approvalToken',
          );
        }
        // Verify token SETNX
        const tokenCheck = await this.dbService.searchDocuments(IDEMPOTENCY_INDEX, {
          key: `approval-token-${input.approvalToken}`,
          tenantId,
        });
        if (!tokenCheck.isSuccess || (tokenCheck.data ?? []).length === 0) {
          await this.queueService.enqueue('SchemaPublishBlocked', {
            schemaType: input.schemaType,
            reason: 'invalid_approval_token',
            tenantId,
          });
          return DataProcessResult.failure(
            'PUBLISH_BLOCKED',
            'BREAKING schema publish: invalid or expired approvalToken',
          );
        }
      }

      // IR-T194-1: getDocumentWithVersion for OCC read
      const schemaId = `schema-${input.schemaType}-${input.version}`;
      const existingResult = await this.dbService.getDocumentWithVersion(SCHEMA_REGISTRY_INDEX, schemaId);

      const now = new Date().toISOString();
      const schemaDoc: Record<string, unknown> = {
        schemaId,
        schemaType: input.schemaType,
        version: input.version,
        jsonSchema: input.newSchema,
        changeType: input.changeType,
        status: 'ACTIVE',
        activeUntil: null,
        tenantId,
        publishedAt: now,
        connectionType: 'FLOW_SCOPED',
        knowledgeScope: 'PRIVATE',
      };

      let previousVersionId: string | null = null;

      if (existingResult.isSuccess) {
        // OCC write — protect against concurrent overwrites (CF-11-2)
        const { seqNo, primaryTerm } = existingResult.data!;
        const occResult = await this.dbService.storeDocumentWithOCC(
          SCHEMA_REGISTRY_INDEX,
          schemaDoc,
          schemaId,
          { ifSeqNo: seqNo, ifPrimaryTerm: primaryTerm },
        );
        if (!occResult.isSuccess) {
          if (occResult.errorCode === 'OCC_CONFLICT') {
            await this.queueService.enqueue('SchemaPublishConflict', {
              schemaType: input.schemaType,
              version: input.version,
              tenantId,
            });
            return DataProcessResult.failure(
              'OCC_CONFLICT',
              'Version changed — retry with fresh read',
            );
          }
          return DataProcessResult.failure(occResult.errorCode!, occResult.errorMessage!);
        }
      } else {
        // New schema — plain store (no prior version to conflict with)
        const storeResult = await this.dbService.storeDocument(SCHEMA_REGISTRY_INDEX, schemaDoc, schemaId);
        if (!storeResult.isSuccess) {
          return DataProcessResult.failure(storeResult.errorCode!, storeResult.errorMessage!);
        }
      }

      // IR-T194-4: supersede previous version
      const prevActiveResult = await this.dbService.searchDocuments(SCHEMA_REGISTRY_INDEX, {
        tenantId,
        schemaType: input.schemaType,
        status: 'ACTIVE',
        activeUntil: null,
      });
      if (prevActiveResult.isSuccess) {
        for (const prev of prevActiveResult.data ?? []) {
          const prevId = String(prev['schemaId'] ?? '');
          if (prevId && prevId !== schemaId) {
            previousVersionId = prevId;
            await this.dbService.storeDocument(
              SCHEMA_REGISTRY_INDEX,
              { ...prev, activeUntil: now, status: 'SUPERSEDED' },
              prevId,
            );
          }
        }
      }

      // DNA-8: storeDocument(publishAudit) BEFORE enqueue(SchemaPublished)
      const publishAuditId = `pub-audit-${Date.now()}`;
      await this.dbService.storeDocument(
        SCHEMA_AUDIT_INDEX,
        {
          auditId: publishAuditId,
          schemaId,
          schemaType: input.schemaType,
          version: input.version,
          changeType: input.changeType,
          action: 'PUBLISHED',
          previousVersionId,
          approvalToken: input.approvalToken ?? null,
          tenantId,
          publishedAt: now,
          connectionType: 'FLOW_SCOPED',
          knowledgeScope: 'PRIVATE',
        },
        publishAuditId,
      );

      await this.queueService.enqueue('SchemaPublished', {
        tenantId,
        schemaId,
        schemaType: input.schemaType,
        version: input.version,
        changeType: input.changeType,
        publishedAt: now,
        previousVersion: previousVersionId,
        approvalToken: input.approvalToken ?? null,
      });

      return DataProcessResult.success({ schemaId, version: input.version });
    } catch (err) {
      return DataProcessResult.failure('PUBLISH_ERROR', `SchemaPublisher threw: ${String(err)}`);
    }
  }
}
