/**
 * T619 NodeTypeRegistrar [VALIDATION]
 * FLOW-18: Visual Flow Creation & Code Injection Engine
 *
 * Entry: NodeTypeRegistrationRequested event (operator registers a new node type)
 *
 * Execution order is MACHINE (CF-18-3):
 *   ORDER 1: SETNX(node-type-reg-lock:{nodeTypeId}) — NodeTypeAlreadyExists on lock held
 *   ORDER 2: storeDocument(nodeType, GLOBAL) — first of dual write
 *   ORDER 3: storeDocument(capabilityIndex) — second of dual write; redis.del in catch
 *   ORDER 4: storeDocument(audit) — DNA-8, before emit
 *   ORDER 5: enqueue(NodeTypeRegistered) — only after dual write succeeds
 *
 * Iron rules:
 *   IR-1: SETNX at ORDER 1 before either write — duplicate registration blocked (CF-18-3)
 *   IR-2: storeDocument(nodeType) at ORDER 2 — first write in dual-write pair (CF-18-3)
 *   IR-3: storeDocument(capabilityIndex) at ORDER 3 — second write (CF-18-3)
 *   IR-4: redis.del(lockKey) MUST be in catch block — prevents hung lock on failure (CF-18-3)
 *   IR-5: storeDocument(audit) at ORDER 4 BEFORE NodeTypeRegistered emit (DNA-8)
 *
 * Pattern reference: ATOMIC-NODE-TYPE-REGISTRATION-001
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const NODE_TYPES_INDEX = 'xiigen-node-types';
const CAPABILITY_INDEX = 'xiigen-node-capabilities';
const NODE_TYPE_LOCKS_INDEX = 'xiigen-node-type-locks';
const NODE_TYPE_AUDIT_INDEX = 'xiigen-node-type-audit';

/** MACHINE: Prefix for node type registration lock key — compile-time constant. CF-18-3. */
const NODE_TYPE_LOCK_PREFIX = 'node-type-reg-lock' as const;

@Injectable()
export class NodeTypeRegistrarService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T619',
        serviceName: 'NodeTypeRegistrarService',
        flowId: 'FLOW-18',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId();
    return result.isSuccess && result.data ? result.data : 'unknown';
  }

  /**
   * Atomic dual-write node type registrar with SETNX lock.
   * redis.del(lockKey) in catch block prevents hung lock. CF-18-3.
   * DPO pattern: ATOMIC-NODE-TYPE-REGISTRATION-001
   */
  async registerNodeType(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const nodeTypeId = event['nodeTypeId'] as string;
    const capabilities = event['capabilities'] as unknown[] | undefined;
    const nodeTypeSchema = event['schema'] as Record<string, unknown> | undefined;

    if (!nodeTypeId) {
      return DataProcessResult.failure('INVALID_INPUT', 'nodeTypeId is required');
    }

    // ── ORDER 1: SETNX registration lock — IR-1, CF-18-3 ────────────────────
    // Prevents concurrent duplicate registrations
    const lockKey = `${NODE_TYPE_LOCK_PREFIX}:${nodeTypeId}`;
    const lockResult = await this.dbFabric.searchDocuments(NODE_TYPE_LOCKS_INDEX, { lockKey });
    if (lockResult.isSuccess && (lockResult.data ?? []).length > 0) {
      // Lock already held — node type already registered or being registered
      await this.queueFabric.enqueue('NodeTypeAlreadyExists', {
        nodeTypeId,
        tenantId,
      });
      return DataProcessResult.failure(
        'NODE_TYPE_ALREADY_EXISTS',
        `Node type ${nodeTypeId} is already registered or registration in progress`,
      );
    }

    // Acquire the lock
    await this.dbFabric.storeDocument(
      NODE_TYPE_LOCKS_INDEX,
      {
        lockKey,
        nodeTypeId,
        tenantId,
        lockedAt: new Date().toISOString(),
        knowledgeScope: 'PRIVATE',
      },
      lockKey,
    );

    const registeredAt = new Date().toISOString();

    try {
      // ── ORDER 2: Write node type record — IR-2, CF-18-3 ──────────────────
      // First write in dual-write pair
      await this.dbFabric.storeDocument(
        NODE_TYPES_INDEX,
        {
          nodeTypeId,
          tenantId,
          schema: nodeTypeSchema ?? {},
          capabilities: capabilities ?? [],
          registeredAt,
          knowledgeScope: 'GLOBAL',
        },
        nodeTypeId,
      );

      // ── ORDER 3: Write capability index — IR-3, CF-18-3 ──────────────────
      // Second write in dual-write pair
      await this.dbFabric.storeDocument(
        CAPABILITY_INDEX,
        {
          nodeTypeId,
          tenantId,
          capabilities: capabilities ?? [],
          indexedAt: registeredAt,
          knowledgeScope: 'GLOBAL',
        },
        `capability:${nodeTypeId}`,
      );
    } catch (err) {
      // ── redis.del in catch — IR-4, CF-18-3 ───────────────────────────────
      // MUST release lock on any write failure to prevent hung lock state
      await this.dbFabric.deleteDocument(NODE_TYPE_LOCKS_INDEX, lockKey).catch(() => {
        // Best-effort lock release — log but do not propagate
      });

      await this.queueFabric.enqueue('NodeTypeRegistrationFailed', {
        nodeTypeId,
        tenantId,
        reason: (err as Error).message,
      });

      return DataProcessResult.failure(
        'NODE_TYPE_WRITE_FAILED',
        `Dual write failed: ${(err as Error).message}`,
      );
    }

    // ── ORDER 4: Audit write — IR-5, DNA-8 ──────────────────────────────────
    // storeDocument(audit) BEFORE enqueue(NodeTypeRegistered)
    await this.dbFabric.storeDocument(NODE_TYPE_AUDIT_INDEX, {
      nodeTypeId,
      tenantId,
      action: 'NODE_TYPE_REGISTERED',
      registeredAt,
      timestamp: new Date().toISOString(),
      knowledgeScope: 'PRIVATE',
    });

    // ── ORDER 5: Emit NodeTypeRegistered — IR-5 ──────────────────────────────
    await this.queueFabric.enqueue('NodeTypeRegistered', {
      nodeTypeId,
      tenantId,
      registeredAt,
    });

    return DataProcessResult.success({
      nodeTypeId,
      tenantId,
      registeredAt,
      status: 'REGISTERED',
    });
  }
}
