/**
 * FLOW-06 Phase A Unit Tests — T99 (JoinRequestValidator) + T100 (MembershipTierAssigner)
 *
 * T99 — JoinRequestValidator
 *   JRV-1: GROUP_NOT_FOUND when group does not exist
 *   JRV-2: USER_BANNED when ban record exists
 *   JRV-3: ALREADY_MEMBER when ACTIVE membership exists
 *   JRV-4: ALREADY_MEMBER when PENDING membership exists (checks both statuses)
 *   JRV-5: INVALID_INVITE_TOKEN for INVITE_ONLY group with absent token
 *   JRV-6: VALIDATION_FAILURE must NOT be returned for any of these conditions
 *   JRV-7: Zero storeDocument calls on validation failure
 *
 * T100 — MembershipTierAssigner
 *   MTA-1: tier from subscription record — not from input
 *   MTA-2: output is structured { assignedTier, accessLevels[] }
 *   MTA-3: PREMIUM tier maps to ['premium', 'standard', 'open_access']
 *   MTA-4: group floor tier: subscription below floor → floor tier applied
 *   DNA-3: validate() and assignTier() return DataProcessResult — never throw
 */

import 'reflect-metadata';
import {
  JoinRequestValidator,
  JoinRequestValidatorInput,
} from '../../src/engine/flows/membership-group-feed/join-request-validator.service';
import {
  MembershipTierAssigner,
  MembershipTierAssignerInput,
} from '../../src/engine/flows/membership-group-feed/membership-tier-assigner.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Mock factories ────────────────────────────────────────────────────────────

interface DbSeed {
  [index: string]: Array<Record<string, unknown>>;
}

function makeDb(callOrder: string[], seed: DbSeed = {}) {
  return {
    searchDocuments: jest
      .fn()
      .mockImplementation(async (index: string, _filter: Record<string, unknown>) => {
        const rows = seed[index] ?? [];
        return DataProcessResult.success(rows);
      }),
    storeDocument: jest.fn().mockImplementation(async () => {
      callOrder.push('storeDocument');
      return DataProcessResult.success({});
    }),
  };
}

function makeQueue(callOrder: string[]) {
  const _enqueued: Array<{ eventType: string; data: unknown }> = [];
  return {
    enqueue: jest.fn().mockImplementation(async (eventType: string, data: unknown) => {
      callOrder.push('enqueue');
      _enqueued.push({ eventType, data });
      return DataProcessResult.success({});
    }),
    _enqueued,
  };
}

// ── T99 JoinRequestValidator ──────────────────────────────────────────────────

describe('T99 JoinRequestValidator', () => {
  const baseInput: JoinRequestValidatorInput = {
    groupId: 'grp-001',
    userId: 'usr-001',
    tenantId: 'tenant-001',
  };

  it('JRV-1: GROUP_NOT_FOUND when group does not exist', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder, {}); // no groups seeded
    const svc = new JoinRequestValidator(db as any);

    const result = await svc.validate(baseInput);

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('GROUP_NOT_FOUND');
  });

  it('JRV-2: USER_BANNED when ban record exists', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder, {
      'xiigen-groups': [{ group_id: 'grp-001', group_type: 'PUBLIC' }],
      'xiigen-user-bans': [{ user_id: 'usr-001', group_id: 'grp-001' }],
    });
    const svc = new JoinRequestValidator(db as any);

    const result = await svc.validate(baseInput);

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('USER_BANNED');
  });

  it('JRV-3: ALREADY_MEMBER when ACTIVE membership exists', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder, {
      'xiigen-groups': [{ group_id: 'grp-001', group_type: 'PUBLIC' }],
      'xiigen-user-bans': [],
      'xiigen-group-memberships': [{ user_id: 'usr-001', group_id: 'grp-001', status: 'ACTIVE' }],
    });
    const svc = new JoinRequestValidator(db as any);

    const result = await svc.validate(baseInput);

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('ALREADY_MEMBER');
  });

  it('JRV-4: ALREADY_MEMBER when PENDING membership exists', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder, {
      'xiigen-groups': [{ group_id: 'grp-001', group_type: 'PUBLIC' }],
      'xiigen-user-bans': [],
      'xiigen-group-memberships': [{ user_id: 'usr-001', group_id: 'grp-001', status: 'PENDING' }],
    });
    const svc = new JoinRequestValidator(db as any);

    const result = await svc.validate(baseInput);

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('ALREADY_MEMBER');
  });

  it('JRV-5: INVALID_INVITE_TOKEN for INVITE_ONLY group with absent token', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder, {
      'xiigen-groups': [{ group_id: 'grp-001', group_type: 'INVITE_ONLY' }],
      'xiigen-user-bans': [],
      'xiigen-group-memberships': [],
    });
    const svc = new JoinRequestValidator(db as any);

    // No inviteToken in input
    const result = await svc.validate({ ...baseInput });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('INVALID_INVITE_TOKEN');
  });

  it('JRV-6: VALIDATION_FAILURE must NOT be returned for group/ban/member/token conditions', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder, {}); // GROUP_NOT_FOUND case
    const svc = new JoinRequestValidator(db as any);

    const result = await svc.validate(baseInput);

    expect(result.errorCode).not.toBe('VALIDATION_FAILURE');
  });

  it('JRV-7: zero storeDocument calls on validation failure', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder, {}); // group not found
    const svc = new JoinRequestValidator(db as any);

    await svc.validate(baseInput);

    expect(db.storeDocument).not.toHaveBeenCalled();
  });
});

// ── T100 MembershipTierAssigner ───────────────────────────────────────────────

describe('T100 MembershipTierAssigner', () => {
  const baseInput: MembershipTierAssignerInput = {
    userId: 'usr-001',
    groupId: 'grp-001',
    tenantId: 'tenant-001',
  };

  function makeT100Db(callOrder: string[], subscriptionTier: string, floorTier?: string) {
    return {
      searchDocuments: jest
        .fn()
        .mockImplementation(async (index: string, _filter: Record<string, unknown>) => {
          if (index === 'xiigen-subscriptions') {
            return DataProcessResult.success([
              {
                subscription_id: 'sub-001',
                user_id: 'usr-001',
                tier: subscriptionTier,
              },
            ]);
          }
          if (index === 'freedom_configs') {
            if (floorTier) {
              return DataProcessResult.success([
                {
                  config_key: 'flow06_group_min_tier',
                  config_value: floorTier,
                },
              ]);
            }
            return DataProcessResult.success([]);
          }
          return DataProcessResult.success([]);
        }),
      storeDocument: jest.fn().mockImplementation(async () => {
        callOrder.push('storeDocument');
        return DataProcessResult.success({});
      }),
    };
  }

  it('MTA-1: tier from subscription record — not from input', async () => {
    const callOrder: string[] = [];
    const db = makeT100Db(callOrder, 'STANDARD');
    const svc = new MembershipTierAssigner(db as any);

    const result = await svc.assignTier(baseInput);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.assignedTier).toBe('STANDARD');
    // Verify subscription index was queried
    expect(db.searchDocuments).toHaveBeenCalledWith('xiigen-subscriptions', expect.any(Object));
  });

  it('MTA-2: output is structured { assignedTier, accessLevels[], subscriptionId }', async () => {
    const callOrder: string[] = [];
    const db = makeT100Db(callOrder, 'FREE');
    const svc = new MembershipTierAssigner(db as any);

    const result = await svc.assignTier(baseInput);

    expect(result.isSuccess).toBe(true);
    expect(result.data).toHaveProperty('assignedTier');
    expect(result.data).toHaveProperty('accessLevels');
    expect(result.data).toHaveProperty('subscriptionId');
    expect(Array.isArray(result.data!.accessLevels)).toBe(true);
  });

  it('MTA-3: PREMIUM tier maps to [premium, standard, open_access]', async () => {
    const callOrder: string[] = [];
    const db = makeT100Db(callOrder, 'PREMIUM');
    const svc = new MembershipTierAssigner(db as any);

    const result = await svc.assignTier(baseInput);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.assignedTier).toBe('PREMIUM');
    expect(result.data!.accessLevels).toEqual(['premium', 'standard', 'open_access']);
  });

  it('MTA-4: group floor tier — subscription below floor gets floor tier applied', async () => {
    const callOrder: string[] = [];
    // Subscription is FREE but floor is STANDARD
    const db = makeT100Db(callOrder, 'FREE', 'STANDARD');
    const svc = new MembershipTierAssigner(db as any);

    const result = await svc.assignTier(baseInput);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.assignedTier).toBe('STANDARD');
  });

  it('DNA-3: validate() returns DataProcessResult — never throw', async () => {
    const callOrder: string[] = [];
    const db = {
      searchDocuments: jest.fn().mockRejectedValue(new Error('db explosion')),
      storeDocument: jest.fn(),
    };
    const svc = new MembershipTierAssigner(db as any);

    const result = await svc.assignTier(baseInput);

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MEMBERSHIP_TIER_ASSIGNER_ERROR');
  });
});
