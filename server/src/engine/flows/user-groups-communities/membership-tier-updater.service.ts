// T72 MembershipTierUpdater [DATA_PIPELINE]
//
// Updates membership tier based on join event.
// Tier hierarchy: FREE < STANDARD < PREMIUM < ADMIN.
// Members CANNOT promote themselves (role_hierarchy_no_self_promotion, IR-1).
// Admin escalation requires requesting user to be existing ADMIN (IR-2).
// storeDocument BEFORE enqueue (DNA-8 / IR-3).
//
// Factories:
//   F254: IDatabaseService          — tier records (DATABASE FABRIC)
//   F255: IGroupMembershipService   — current tier lookups (MEMBERSHIP FABRIC)

import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';

interface IGroupMembershipService {
  getMemberTier(
    userId: string,
    groupId: string,
    tenantId: string,
  ): Promise<{ isSuccess: boolean; data?: Record<string, unknown> }>;
}
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

export type MembershipTier = 'FREE' | 'STANDARD' | 'PREMIUM' | 'ADMIN';

const TIER_RANK: Record<MembershipTier, number> = {
  FREE: 0,
  STANDARD: 1,
  PREMIUM: 2,
  ADMIN: 3,
};

export interface TierUpdateRequest {
  updateEventId: string;
  userId: string;
  groupId: string;
  tenantId: string;
  requestedTier: MembershipTier;
  requestingUserId: string;
}

export interface TierUpdateResult {
  updateEventId: string;
  userId: string;
  groupId: string;
  tier: MembershipTier;
  status: 'UPDATED' | 'BLOCKED';
  reason?: string;
}

export class MembershipTierUpdaterService extends MicroserviceBase {
  constructor(
    /** F254: IDatabaseService — tier record storage (DATABASE FABRIC) */

    private readonly dbFabric: IDatabaseService,
    /** F255: IGroupMembershipService — current tier lookups (MEMBERSHIP FABRIC) */

    private readonly groupMembershipService: IGroupMembershipService,
    /** QUEUE FABRIC — TierUpdated event emission */

    private readonly queueFabric: IQueueService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T72',
        serviceName: 'MembershipTierUpdaterService',
        flowId: 'FLOW-06',
      }),
    });
  }

  async updateTier(request: TierUpdateRequest): Promise<DataProcessResult<TierUpdateResult>> {
    // ── STEP 1: IR-1 — members CANNOT promote themselves ─────────────────────
    if (request.userId === request.requestingUserId) {
      return DataProcessResult.success({
        updateEventId: request.updateEventId,
        userId: request.userId,
        groupId: request.groupId,
        tier: request.requestedTier,
        status: 'BLOCKED',
        reason: 'SELF_PROMOTION',
      });
    }

    // ── STEP 2: IR-2 — ADMIN tier requires requesting user to be existing ADMIN
    if (request.requestedTier === 'ADMIN') {
      const requestingTierResult = await this.groupMembershipService.getMemberTier(
        request.requestingUserId,
        request.groupId,
        request.tenantId,
      );
      const requestingTier: MembershipTier =
        requestingTierResult.isSuccess && requestingTierResult.data?.['tier']
          ? (requestingTierResult.data['tier'] as MembershipTier)
          : 'FREE';

      if (TIER_RANK[requestingTier] < TIER_RANK['ADMIN']) {
        return DataProcessResult.success({
          updateEventId: request.updateEventId,
          userId: request.userId,
          groupId: request.groupId,
          tier: request.requestedTier,
          status: 'BLOCKED',
          reason: 'ADMIN_ONLY',
        });
      }
    }

    // ── STEP 3: storeDocument BEFORE enqueue (DNA-8 / IR-3) ──────────────────
    const storeResult = await this.dbFabric.storeDocument(
      'group-membership-tiers',
      {
        updateEventId: request.updateEventId,
        userId: request.userId,
        groupId: request.groupId,
        tenantId: request.tenantId,
        tier: request.requestedTier,
        requestingUserId: request.requestingUserId,
        updatedAt: new Date().toISOString(),
      },
      request.updateEventId,
    );
    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        'STORE_FAILED',
        `Failed to store tier record: ${storeResult.errorMessage ?? 'unknown'}`,
      );
    }

    // ── STEP 4: enqueue TierUpdated (DNA-8 — after store) ────────────────────
    await this.queueFabric.enqueue('groups.membership.tier-updated', {
      updateEventId: request.updateEventId,
      userId: request.userId,
      groupId: request.groupId,
      tenantId: request.tenantId,
      tier: request.requestedTier,
    });

    return DataProcessResult.success({
      updateEventId: request.updateEventId,
      userId: request.userId,
      groupId: request.groupId,
      tier: request.requestedTier,
      status: 'UPDATED',
    });
  }
}
