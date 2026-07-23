/**
 * AccessControlProvisioner (T101) — FLOW-06 Phase 1B
 * Single responsibility: store access control record + emit MembershipActivated.
 *
 * Iron rules:
 *   DR-06-B, DNA-8: storeDocument(access control record) BEFORE MembershipActivated emit.
 *   knowledge_scope='PRIVATE', connection_type='FLOW_SCOPED'.
 *   Upsert semantics — re-provisioning on tier change must update (not SETNX).
 *   Emits event type 'membership.activated'.
 *   DNA-3: All methods return DataProcessResult<T> — never throw.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

const ACCESS_CONTROL_INDEX = 'xiigen-access-controls';

export interface AccessControlProvisionerInput {
  userId: string;
  groupId: string;
  assignedTier: string;
  accessLevels: string[];
  tenantId: string;
}

export interface AccessControlResult {
  accessControlId: string;
  upserted: boolean;
}

export class AccessControlProvisioner {
  constructor(
    private readonly db: IDatabaseService,
    private readonly queue: IQueueService,
  ) {}

  async provision(
    input: AccessControlProvisionerInput,
  ): Promise<DataProcessResult<AccessControlResult>> {
    try {
      const now = new Date().toISOString();
      const accessControlId = `ac-${input.userId}-${input.groupId}`;

      const doc: Record<string, unknown> = {
        access_control_id: accessControlId,
        user_id: input.userId,
        group_id: input.groupId,
        assigned_tier: input.assignedTier,
        access_levels: input.accessLevels,
        tenant_id: input.tenantId,
        knowledge_scope: 'PRIVATE',
        connection_type: 'FLOW_SCOPED',
        updated_at: now,
        created_at: now,
      };

      // DNA-8: storeDocument BEFORE emit ─────────────────────────────────────
      const stored = await this.db.storeDocument(ACCESS_CONTROL_INDEX, doc, accessControlId);
      if (!stored.isSuccess) {
        return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);
      }

      // Emit membership.activated ────────────────────────────────────────────
      await this.queue.enqueue('membership.activated', {
        userId: input.userId,
        groupId: input.groupId,
        assignedTier: input.assignedTier,
        accessLevels: input.accessLevels,
        tenantId: input.tenantId,
      });

      return DataProcessResult.success({ accessControlId, upserted: true });
    } catch (err) {
      return DataProcessResult.failure(
        'ACCESS_CONTROL_PROVISIONER_ERROR',
        `AccessControlProvisioner threw: ${String(err)}`,
      );
    }
  }
}
