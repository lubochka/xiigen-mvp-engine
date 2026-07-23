// T90 AccessControlEnforcer [VALIDATION]
//
// Enforces access control based on membership level.
// Dual scope isolation: tenantId AND groupId on all reads/writes (IR-1).
// invite_only groups NOT discoverable to non-members (IR-2).
// Access decisions logged — storeDocument BEFORE enqueue (DNA-8 / IR-3).
//
// Factories:
//   F254: IDatabaseService          — access logs (DATABASE FABRIC)
//   F256: IAccessControlService     — group config + tier rules (ACCESS FABRIC)

import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';

interface IAccessControlDb {
  storeDocument(
    index: string,
    doc: Record<string, unknown>,
    id?: string,
  ): Promise<{ isSuccess: boolean; errorCode?: string; errorMessage?: string }>;
}

interface IAccessControlQueue {
  enqueue(topic: string, payload: Record<string, unknown>): Promise<void>;
}

export interface AccessControlRequest {
  accessEventId: string;
  userId: string;
  groupId: string;
  tenantId: string;
  requestedAction: string;
  membershipTier: string;
}

export interface AccessControlResult {
  accessEventId: string;
  userId: string;
  groupId: string;
  allowed: boolean;
  reason?: string;
}

interface IAccessControlService {
  getGroupConfig(
    groupId: string,
    tenantId: string,
  ): Promise<{ isSuccess: boolean; errorMessage?: string; data?: Record<string, unknown> }>;
  isMember(
    userId: string,
    groupId: string,
    tenantId: string,
  ): Promise<{ isSuccess: boolean; data?: Record<string, unknown> }>;
  checkTierAccess(
    membershipTier: string,
    requestedAction: string,
    groupId: string,
    tenantId: string,
  ): Promise<{ isSuccess: boolean; data?: Record<string, unknown> }>;
}

export class AccessControlEnforcerService extends MicroserviceBase {
  constructor(
    /** F254: IDatabaseService — access log storage (DATABASE FABRIC) */
    private readonly dbFabric: IAccessControlDb,
    /** F256: IAccessControlService — group config + tier rules (ACCESS FABRIC) */
    private readonly accessControlService: IAccessControlService,
    /** QUEUE FABRIC — AccessControlDecided event emission */
    private readonly queueFabric: IAccessControlQueue,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T90',
        serviceName: 'AccessControlEnforcerService',
        flowId: 'FLOW-06',
      }),
    });
  }

  async enforceAccess(
    request: AccessControlRequest,
  ): Promise<DataProcessResult<AccessControlResult>> {
    // ── STEP 1: IR-1 validate dual scope — both tenantId AND groupId present ─
    // (already enforced by contract — both are required on the request)

    // ── STEP 2: fetch group config (IR-1: dual scope on reads) ───────────────
    const groupConfigResult = await this.accessControlService.getGroupConfig(
      request.groupId,
      request.tenantId, // IR-1: dual scope — groupId AND tenantId on all reads
    );
    if (!groupConfigResult.isSuccess) {
      return DataProcessResult.failure(
        'GROUP_CONFIG_FAILED',
        `Failed to fetch group config: ${groupConfigResult.errorMessage ?? 'unknown'}`,
      );
    }

    const isInviteOnly = groupConfigResult.data?.['invite_only'] === true;

    // ── STEP 3: IR-2 — invite_only groups NOT discoverable to non-members ────
    if (isInviteOnly) {
      const isMemberResult = await this.accessControlService.isMember(
        request.userId,
        request.groupId,
        request.tenantId, // IR-1: dual scope
      );
      const isMember = isMemberResult.isSuccess && isMemberResult.data?.['member'] === true;

      if (!isMember) {
        // IR-3: store access log BEFORE enqueue (DNA-8)
        await this.dbFabric.storeDocument(
          'group-access-logs',
          {
            accessEventId: request.accessEventId,
            userId: request.userId,
            groupId: request.groupId, // IR-1: dual scope — groupId
            tenantId: request.tenantId, // IR-1: dual scope — tenantId
            requestedAction: request.requestedAction,
            membershipTier: request.membershipTier,
            allowed: false,
            reason: 'NOT_DISCOVERABLE',
            decidedAt: new Date().toISOString(),
          },
          request.accessEventId,
        );

        await this.queueFabric.enqueue('groups.access.decided', {
          accessEventId: request.accessEventId,
          userId: request.userId,
          groupId: request.groupId,
          tenantId: request.tenantId,
          allowed: false,
          reason: 'NOT_DISCOVERABLE',
        });

        return DataProcessResult.success({
          accessEventId: request.accessEventId,
          userId: request.userId,
          groupId: request.groupId,
          allowed: false,
          reason: 'NOT_DISCOVERABLE',
        });
      }
    }

    // ── STEP 4: check tier-based access for requestedAction ──────────────────
    const tierCheckResult = await this.accessControlService.checkTierAccess(
      request.membershipTier,
      request.requestedAction,
      request.groupId,
      request.tenantId, // IR-1: dual scope
    );
    const allowed = tierCheckResult.isSuccess && tierCheckResult.data?.['allowed'] === true;
    const reason = !allowed
      ? ((tierCheckResult.data?.['reason'] as string | undefined) ?? 'TIER_INSUFFICIENT')
      : undefined;

    // ── STEP 5: store access log BEFORE enqueue (DNA-8 / IR-3) ───────────────
    const storeResult = await this.dbFabric.storeDocument(
      'group-access-logs',
      {
        accessEventId: request.accessEventId,
        userId: request.userId,
        groupId: request.groupId, // IR-1: dual scope — groupId
        tenantId: request.tenantId, // IR-1: dual scope — tenantId
        requestedAction: request.requestedAction,
        membershipTier: request.membershipTier,
        allowed,
        reason: reason ?? null,
        decidedAt: new Date().toISOString(),
      },
      request.accessEventId,
    );
    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        'STORE_FAILED',
        `Failed to store access log: ${storeResult.errorMessage ?? 'unknown'}`,
      );
    }

    // ── STEP 6: enqueue AccessControlDecided (DNA-8 — after store) ───────────
    await this.queueFabric.enqueue('groups.access.decided', {
      accessEventId: request.accessEventId,
      userId: request.userId,
      groupId: request.groupId,
      tenantId: request.tenantId,
      allowed,
      reason,
    });

    return DataProcessResult.success({
      accessEventId: request.accessEventId,
      userId: request.userId,
      groupId: request.groupId,
      allowed,
      reason,
    });
  }
}
