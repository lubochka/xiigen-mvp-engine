/**
 * T614 MilestoneContractManager [TRANSACTION]
 * FLOW-17: Freelancer Marketplace
 *
 * Entry: ContractMilestoneUpdateRequested event (freelancer or client updates milestones)
 *
 * Execution order is MACHINE (CF-17-2):
 *   ORDER 1: CONTRACT_IMMUTABLE_FIELDS check — reject immutable field writes immediately
 *   ORDER 2: Sum validation — milestones.reduce(sum) === contractTotal
 *   ORDER 3: storeDocumentWithOCC(contract, versionPin) — not plain storeDocument
 *   ORDER 4: storeDocument(audit) — DNA-8, before emit
 *   ORDER 5: enqueue(FreelancerContractActivated)
 *
 * Iron rules:
 *   IR-1: CONTRACT_IMMUTABLE_FIELDS compile-time constant at ORDER 1 (CF-17-2)
 *   IR-2: Immutable field write rejected at ORDER 1 — no storage attempt (CF-17-2)
 *   IR-3: Sum validation at ORDER 2 — milestones sum === contractTotal (CF-17-2)
 *   IR-4: storeDocumentWithOCC — not plain storeDocument (CF-17-2)
 *   IR-5: storeDocument(audit) at ORDER 4 BEFORE FreelancerContractActivated emit (DNA-8)
 *
 * Pattern reference: saas-multi-tenancy/tenant-configuration-manager.service.ts (compile-time constant guard)
 * Pattern reference: schema-registry-dag/schema-registration-gateway.service.ts (OCC pattern)
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const CONTRACTS_INDEX = 'xiigen-freelancer-contracts';
const CONTRACT_AUDIT_INDEX = 'xiigen-contract-audit';

/**
 * MACHINE: Compile-time constant — NEVER a database lookup, NEVER in FREEDOM config.
 * Runtime lookup is attackable: modify the immutable fields list to allow clientId override.
 * CF-17-2.
 */
/**
 * MACHINE: Fields immutable AFTER contract activation. Milestones and totalAmountCents
 * are mutable during DRAFT phase but locked after activation. clientId, gigId, freelancerId
 * are always immutable (set at creation, never modifiable).
 */
const ALWAYS_IMMUTABLE_FIELDS = ['clientId', 'gigId', 'freelancerId'] as const;

/** Milestone shape for sum validation. */
interface MilestoneEntry {
  milestoneId: string;
  amount: number;
  description: string;
}

@Injectable()
export class MilestoneContractManagerService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T614',
        serviceName: 'MilestoneContractManagerService',
        flowId: 'FLOW-17',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId();
    return result.isSuccess && result.data ? result.data : 'unknown';
  }

  /**
   * Manage milestone contract with immutability guard and sum validation.
   * DPO pattern: MILESTONE-IMMUTABILITY-GATE-001
   */
  async updateContractMilestones(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    // tenantId exclusively from ALS — event body tenantId ignored (DNA-5)
    const tenantId = this.getTenantId();
    const contractId = event['contractId'] as string;
    const milestones = (event['milestones'] as MilestoneEntry[]) ?? [];
    const fieldsToUpdate = (event['fieldsToUpdate'] as string[]) ?? [];

    if (!contractId) {
      return DataProcessResult.failure('INVALID_INPUT', 'contractId is required');
    }

    // ── ORDER 1: CONTRACT_IMMUTABLE_FIELDS check — IR-1, IR-2, CF-17-2 ───────
    // Compile-time constant check. No OCC read, no sum validation, no storage for immutable fields.
    const immutableFieldAttempt = fieldsToUpdate.find((f) =>
      (ALWAYS_IMMUTABLE_FIELDS as readonly string[]).includes(f),
    );
    if (immutableFieldAttempt) {
      await this.queueFabric.enqueue('ContractFieldImmutable', {
        tenantId,
        contractId,
        field: immutableFieldAttempt,
        reason: 'CONTRACT_IMMUTABLE_FIELD',
      });
      return DataProcessResult.failure(
        'FIELD_IMMUTABLE',
        `Field '${immutableFieldAttempt}' is immutable and cannot be modified after contract activation`,
      );
    }

    // ── ORDER 2: Sum validation — IR-3, CF-17-2 ─────────────────────────────
    // milestones.reduce(sum) must equal contractTotal exactly
    if (milestones.length > 0) {
      // Fetch current contract to get contractTotal
      const contractResult = await this.dbFabric.searchDocuments(CONTRACTS_INDEX, {
        contractId,
        tenantId,
      });

      if (!contractResult.isSuccess || (contractResult.data ?? []).length === 0) {
        return DataProcessResult.failure('CONTRACT_NOT_FOUND', `Contract not found: ${contractId}`);
      }

      const contract = contractResult.data![0] as Record<string, unknown>;
      const contractTotal = contract['contractTotal'] as number;

      const milestonesSum = milestones.reduce((sum, m) => sum + (m.amount ?? 0), 0);

      if (milestonesSum !== contractTotal) {
        await this.queueFabric.enqueue('MilestoneSumMismatch', {
          tenantId,
          contractId,
          expected: contractTotal,
          actual: milestonesSum,
        });
        return DataProcessResult.failure(
          'MILESTONE_SUM_MISMATCH',
          `Milestones sum (${milestonesSum}) must equal contractTotal (${contractTotal})`,
        );
      }

      // ── ORDER 3: OCC write — IR-4, CF-17-2 ──────────────────────────────────
      // storeDocumentWithOCC — not plain storeDocument
      const updatedContract: Record<string, unknown> = {
        ...contract,
        milestones,
        updatedAt: new Date().toISOString(),
        knowledgeScope: 'PRIVATE',
      };

      // storeDocumentWithOCC — IR-4, CF-17-2 (NEVER plain storeDocument)
      const versionPin = contract['_version'] as string | undefined;
      const occOpts = versionPin
        ? {
            ifSeqNo: parseInt(versionPin.split(':')[0] ?? '0', 10),
            ifPrimaryTerm: parseInt(versionPin.split(':')[1] ?? '1', 10),
          }
        : { ifSeqNo: 0, ifPrimaryTerm: 1 };
      const writeResult = await this.dbFabric.storeDocumentWithOCC(
        CONTRACTS_INDEX,
        updatedContract,
        contractId,
        occOpts,
      );
      if (!writeResult.isSuccess) {
        if (
          writeResult.errorCode === 'OCC_CONFLICT' ||
          writeResult.errorMessage?.includes('conflict')
        ) {
          await this.queueFabric.enqueue('ContractUpdateConflict', {
            tenantId,
            contractId,
            reason: 'concurrent_update',
          });
          return DataProcessResult.failure(
            'OCC_CONFLICT',
            `Concurrent update conflict on contract '${contractId}'`,
          );
        }
        return DataProcessResult.failure(
          'CONTRACT_WRITE_FAILED',
          `Failed to write contract '${contractId}': ${writeResult.errorMessage}`,
        );
      }

      // ── ORDER 4: Audit write — IR-5, DNA-8 ──────────────────────────────────
      // storeDocument(audit) BEFORE FreelancerContractActivated emit
      await this.dbFabric.storeDocument(CONTRACT_AUDIT_INDEX, {
        tenantId,
        contractId,
        action: 'MILESTONES_UPDATED',
        milestoneCount: milestones.length,
        milestonesSum,
        contractTotal,
        versionPin,
        timestamp: new Date().toISOString(),
        knowledgeScope: 'PRIVATE',
      });

      // ── ORDER 5: Emit FreelancerContractActivated — IR-5 ────────────────────
      await this.queueFabric.enqueue('FreelancerContractActivated', {
        tenantId,
        contractId,
        milestoneCount: milestones.length,
        contractTotal,
        activatedAt: updatedContract['updatedAt'],
      });

      return DataProcessResult.success({
        tenantId,
        contractId,
        milestoneCount: milestones.length,
        contractTotal,
        milestonesSum,
        updatedAt: updatedContract['updatedAt'],
      });
    }

    return DataProcessResult.failure('INVALID_INPUT', 'milestones array is required for update');
  }
}
