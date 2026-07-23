/**
 * T189 SchemaRegistrationGateway [TRANSACTION]
 * FLOW-11: Schema Registry & DAG
 *
 * Iron rules:
 *   IR-T189-1: F195 structure validation ORDER 1 — before SETNX. Invalid schema never consumes idempotency key.
 *   IR-T189-2: T191 DagCycleDetector called inline after SETNX, before emit. CYCLE_DETECTED → SchemaRejected.
 *   IR-T189-3: BREAKING changeType routes to SchemaApprovalRequired — NEVER SchemaQueued.
 *              ADDITIVE with T191 PASS routes to SchemaQueued.
 *   IR-T189-4: storeDocument(audit) BEFORE any enqueue. DNA-8.
 *   IR-T189-5: tenantId from ALS only — NEVER from payload.
 *   IR-T189-6: First registration (null previousSchema): T190 returns ADDITIVE, version='1.0.0'.
 *
 * Events emitted:
 *   SchemaApprovalRequired: { schemaType, newSchema, previousVersion, changedFields, tenantId }
 *   SchemaQueued:           { schemaType, newSchema, version, changeType: 'ADDITIVE', tenantId }
 *   SchemaRejected:         { schemaType, reason, cyclePath? }
 *
 * CF-11-3: BFA — BREAKING never routes to SchemaQueued directly.
 * DNA-8: storeDocument BEFORE enqueue.
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { DagCycleDetectorService } from './dag-cycle-detector.service';
import { SchemaVersionManagerService } from './schema-version-manager.service';
import { SchemaCompatibilityCheckerService } from './schema-compatibility-checker.service';
import { createHash } from 'crypto';

interface TenantContextLookup {
  getCurrentTenantId?: () => { isSuccess: boolean; data?: string };
  get?: (key: string) => { tenantId?: string } | undefined;
}

const SCHEMA_REGISTRY_INDEX = 'xiigen-schema-registry';
const SCHEMA_AUDIT_INDEX = 'xiigen-schema-audit';
const IDEMPOTENCY_INDEX = 'xiigen-idempotency-keys';

export interface SchemaRegistrationInput {
  schemaType: string;
  jsonSchema: Record<string, unknown>;
  newDeps?: string[];
  existingGraph?: Record<string, string[]>;
  version?: string;
}

export interface SchemaRegistrationResult {
  status: 'QUEUED' | 'AWAITING_APPROVAL' | 'REJECTED';
  reason?: string;
  version?: string;
}

@Injectable()
export class SchemaRegistrationGatewayService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbService: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueService: IQueueService,
    private readonly tenantContext: TenantContextLookup,
    private readonly cycleDetector: DagCycleDetectorService,
    private readonly versionManager: SchemaVersionManagerService,
    private readonly compatChecker: SchemaCompatibilityCheckerService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T189',
        serviceName: 'SchemaRegistrationGatewayService',
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

  async register(
    input: SchemaRegistrationInput,
  ): Promise<DataProcessResult<SchemaRegistrationResult>> {
    try {
      // ORDER 1: Structure validation — before SETNX (IR-T189-1)
      if (
        !input.schemaType ||
        typeof input.schemaType !== 'string' ||
        input.schemaType.trim() === ''
      ) {
        return DataProcessResult.failure(
          'VALIDATION_FAILURE',
          'schemaType is required and must be a non-empty string',
        );
      }
      if (!input.jsonSchema || typeof input.jsonSchema !== 'object') {
        return DataProcessResult.failure(
          'VALIDATION_FAILURE',
          'jsonSchema is required and must be an object',
        );
      }

      const tenantId = this.getTenantId();

      // ORDER 2: SETNX — duplicate version detection (IR-T189-2)
      const idempotencyKey = createHash('sha256')
        .update(`${tenantId}:${input.schemaType}:${input.version ?? 'auto'}`)
        .digest('hex');

      const existingKey = await this.dbService.searchDocuments(IDEMPOTENCY_INDEX, {
        key: idempotencyKey,
        tenantId,
      });
      if (existingKey.isSuccess && (existingKey.data ?? []).length > 0) {
        await this.dbService.storeDocument(SCHEMA_AUDIT_INDEX, {
          auditId: `audit-${Date.now()}`,
          schemaType: input.schemaType,
          action: 'REJECTED',
          reason: 'duplicate_version',
          tenantId,
          createdAt: new Date().toISOString(),
          connectionType: 'FLOW_SCOPED',
          knowledgeScope: 'PRIVATE',
        });
        await this.queueService.enqueue('SchemaRejected', {
          schemaType: input.schemaType,
          reason: 'duplicate_version',
          tenantId,
        });
        return DataProcessResult.success({ status: 'REJECTED', reason: 'duplicate_version' });
      }

      // Store idempotency key
      await this.dbService.storeDocument(
        IDEMPOTENCY_INDEX,
        {
          key: idempotencyKey,
          tenantId,
          schemaType: input.schemaType,
          createdAt: new Date().toISOString(),
          connectionType: 'FLOW_SCOPED',
          knowledgeScope: 'PRIVATE',
        },
        idempotencyKey,
      );

      // ORDER 3: Fetch previous version
      const prevResult = await this.dbService.searchDocuments(SCHEMA_REGISTRY_INDEX, {
        tenantId,
        schemaType: input.schemaType,
        activeUntil: null,
      });
      const previousSchema =
        prevResult.isSuccess && (prevResult.data ?? []).length > 0
          ? (prevResult.data![0] as Record<string, unknown>)
          : null;
      const previousVersion = previousSchema
        ? String(previousSchema['version'] ?? '1.0.0')
        : undefined;

      // ORDER 4: T190 inline — classify version change
      const classifyResult = this.versionManager.classify({
        previousSchema: previousSchema
          ? ((previousSchema['jsonSchema'] as Record<string, unknown>) ?? previousSchema)
          : null,
        newSchema: input.jsonSchema,
      });
      if (!classifyResult.isSuccess) {
        return DataProcessResult.failure(classifyResult.errorCode!, classifyResult.errorMessage!);
      }
      const { changeType, nextVersion, changedFields } = classifyResult.data!;

      // ORDER 5: T191 inline — DAG cycle check
      const newDeps = input.newDeps ?? [];
      const existingGraph = input.existingGraph ?? {};
      const cycleResult = this.cycleDetector.check({
        schemaType: input.schemaType,
        newDeps,
        existingGraph,
        tenantId,
      });
      if (!cycleResult.isSuccess) {
        return DataProcessResult.failure(cycleResult.errorCode!, cycleResult.errorMessage!);
      }
      if (cycleResult.data!.verdict === 'CYCLE_DETECTED') {
        // DNA-8: storeDocument BEFORE enqueue
        await this.dbService.storeDocument(SCHEMA_AUDIT_INDEX, {
          auditId: `audit-cycle-${Date.now()}`,
          schemaType: input.schemaType,
          action: 'REJECTED',
          reason: 'cycle_detected',
          cyclePath: cycleResult.data!.cyclePath,
          tenantId,
          createdAt: new Date().toISOString(),
          connectionType: 'FLOW_SCOPED',
          knowledgeScope: 'PRIVATE',
        });
        await this.queueService.enqueue('SchemaRejected', {
          schemaType: input.schemaType,
          reason: 'cycle_detected',
          cyclePath: cycleResult.data!.cyclePath,
          tenantId,
        });
        return DataProcessResult.success({ status: 'REJECTED', reason: 'cycle_detected' });
      }

      // ORDER 6: T193 inline — compatibility check
      this.compatChecker.check({
        previousSchema: previousSchema
          ? ((previousSchema['jsonSchema'] as Record<string, unknown>) ?? null)
          : null,
        newSchema: input.jsonSchema,
      });

      // IR-T189-3: BREAKING → SchemaApprovalRequired ONLY — NEVER SchemaQueued
      // CF-11-3: BFA enforcement
      if (changeType === 'BREAKING') {
        // DNA-8: storeDocument BEFORE enqueue
        await this.dbService.storeDocument(SCHEMA_AUDIT_INDEX, {
          auditId: `audit-breaking-${Date.now()}`,
          schemaType: input.schemaType,
          action: 'APPROVAL_REQUIRED',
          changeType,
          nextVersion,
          changedFields,
          previousVersion,
          tenantId,
          createdAt: new Date().toISOString(),
          connectionType: 'FLOW_SCOPED',
          knowledgeScope: 'PRIVATE',
        });
        await this.queueService.enqueue('SchemaApprovalRequired', {
          schemaType: input.schemaType,
          newSchema: input.jsonSchema,
          previousVersion,
          changedFields,
          nextVersion,
          tenantId,
        });
        return DataProcessResult.success({ status: 'AWAITING_APPROVAL', version: nextVersion });
      }

      // ADDITIVE with PASS cycle check → SchemaQueued
      // DNA-8: storeDocument BEFORE enqueue
      await this.dbService.storeDocument(SCHEMA_AUDIT_INDEX, {
        auditId: `audit-queued-${Date.now()}`,
        schemaType: input.schemaType,
        action: 'QUEUED',
        changeType,
        nextVersion,
        changedFields,
        previousVersion,
        tenantId,
        createdAt: new Date().toISOString(),
        connectionType: 'FLOW_SCOPED',
        knowledgeScope: 'PRIVATE',
      });
      await this.queueService.enqueue('SchemaQueued', {
        schemaType: input.schemaType,
        newSchema: input.jsonSchema,
        version: nextVersion,
        changeType: 'ADDITIVE',
        tenantId,
      });
      return DataProcessResult.success({ status: 'QUEUED', version: nextVersion });
    } catch (err) {
      return DataProcessResult.failure(
        'REGISTRATION_ERROR',
        `SchemaRegistrationGateway threw: ${String(err)}`,
      );
    }
  }
}
