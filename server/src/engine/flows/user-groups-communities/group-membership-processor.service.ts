// T71 GroupMembershipProcessor [ORCHESTRATION]
//
// Processes join/leave group membership events. Validates member eligibility;
// invite_only groups require a valid invitation (IR-2) before processing.
// Dual scope: tenantId AND groupId on all stored records (IR-3).
// storeDocument BEFORE enqueue (DNA-8 / IR-1).
//
// Factories:
//   F254: IDatabaseService              — membership records (DATABASE FABRIC)
//   F255: IGroupMembershipService       — invite validation (MEMBERSHIP FABRIC)

import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';

interface IGroupMembershipService {
  getGroupConfig(
    groupId: string,
    tenantId: string,
  ): Promise<{ isSuccess: boolean; errorMessage?: string; data?: Record<string, unknown> }>;
  validateInvitation(
    invitationId: string,
    userId: string,
    groupId: string,
    tenantId: string,
  ): Promise<{ isSuccess: boolean; data?: Record<string, unknown> }>;
}
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

export interface GroupMembershipRequest {
  membershipEventId: string;
  userId: string;
  groupId: string;
  tenantId: string;
  action: 'JOIN' | 'LEAVE';
  invitationId?: string;
}

export interface GroupMembershipResult {
  membershipEventId: string;
  userId: string;
  groupId: string;
  status: 'JOINED' | 'LEFT' | 'INVITE_REQUIRED';
}

export class GroupMembershipProcessorService extends MicroserviceBase {
  constructor(
    /** F254: IDatabaseService — membership record storage (DATABASE FABRIC) */

    private readonly dbFabric: IDatabaseService,
    /** F255: IGroupMembershipService — invite validation (MEMBERSHIP FABRIC) */

    private readonly groupMembershipService: IGroupMembershipService,
    /** QUEUE FABRIC — MembershipJoined / MembershipLeft event emission */

    private readonly queueFabric: IQueueService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T71',
        serviceName: 'GroupMembershipProcessorService',
        flowId: 'FLOW-06',
      }),
    });
  }

  async processMembership(
    request: GroupMembershipRequest,
  ): Promise<DataProcessResult<GroupMembershipResult>> {
    // ── STEP 1: check invite_only setting for group (IR-2) ───────────────────
    const groupResult = await this.groupMembershipService.getGroupConfig(
      request.groupId,
      request.tenantId,
    );
    if (!groupResult.isSuccess) {
      return DataProcessResult.failure(
        'GROUP_CONFIG_FAILED',
        `Failed to fetch group config: ${groupResult.errorMessage ?? 'unknown'}`,
      );
    }

    const isInviteOnly = groupResult.data?.['invite_only'] === true;

    if (request.action === 'JOIN' && isInviteOnly) {
      // IR-2: invite_only groups require valid invitation before processing
      if (!request.invitationId) {
        return DataProcessResult.success({
          membershipEventId: request.membershipEventId,
          userId: request.userId,
          groupId: request.groupId,
          status: 'INVITE_REQUIRED',
        });
      }

      const inviteResult = await this.groupMembershipService.validateInvitation(
        request.invitationId,
        request.userId,
        request.groupId,
        request.tenantId,
      );
      if (!inviteResult.isSuccess || inviteResult.data?.['valid'] !== true) {
        return DataProcessResult.success({
          membershipEventId: request.membershipEventId,
          userId: request.userId,
          groupId: request.groupId,
          status: 'INVITE_REQUIRED',
        });
      }
    }

    if (request.action === 'JOIN') {
      // ── STEP 2: storeDocument BEFORE enqueue (DNA-8 / IR-1 / IR-3) ─────────
      const storeResult = await this.dbFabric.storeDocument(
        'group-memberships',
        {
          membershipEventId: request.membershipEventId,
          userId: request.userId,
          groupId: request.groupId, // IR-3: dual scope — groupId present
          tenantId: request.tenantId, // IR-3: dual scope — tenantId present
          status: 'ACTIVE',
          joinedAt: new Date().toISOString(),
        },
        request.membershipEventId,
      );
      if (!storeResult.isSuccess) {
        return DataProcessResult.failure(
          'STORE_FAILED',
          `Failed to store membership record: ${storeResult.errorMessage ?? 'unknown'}`,
        );
      }

      // ── STEP 3: enqueue MembershipJoined (DNA-8 — after store) ──────────────
      await this.queueFabric.enqueue('groups.membership.joined', {
        membershipEventId: request.membershipEventId,
        userId: request.userId,
        groupId: request.groupId,
        tenantId: request.tenantId,
        joinedAt: new Date().toISOString(),
      });

      return DataProcessResult.success({
        membershipEventId: request.membershipEventId,
        userId: request.userId,
        groupId: request.groupId,
        status: 'JOINED',
      });
    }

    // action === 'LEAVE'
    // ── STEP 2: storeDocument BEFORE enqueue (DNA-8 / IR-1 / IR-3) ───────────
    const storeResult = await this.dbFabric.storeDocument(
      'group-memberships',
      {
        membershipEventId: request.membershipEventId,
        userId: request.userId,
        groupId: request.groupId, // IR-3: dual scope — groupId present
        tenantId: request.tenantId, // IR-3: dual scope — tenantId present
        status: 'LEFT',
        leftAt: new Date().toISOString(),
      },
      request.membershipEventId,
    );
    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        'STORE_FAILED',
        `Failed to store leave record: ${storeResult.errorMessage ?? 'unknown'}`,
      );
    }

    // ── STEP 3: enqueue MembershipLeft (DNA-8 — after store) ─────────────────
    await this.queueFabric.enqueue('groups.membership.left', {
      membershipEventId: request.membershipEventId,
      userId: request.userId,
      groupId: request.groupId,
      tenantId: request.tenantId,
      leftAt: new Date().toISOString(),
    });

    return DataProcessResult.success({
      membershipEventId: request.membershipEventId,
      userId: request.userId,
      groupId: request.groupId,
      status: 'LEFT',
    });
  }
}
