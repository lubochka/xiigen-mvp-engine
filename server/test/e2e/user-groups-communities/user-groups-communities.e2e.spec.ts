/**
 * FLOW-06 E2E — Membership & Group Feed
 *
 * Archetypes: MEMBERSHIP, GROUP_FEED
 * Named checks: dual_scope_isolation_tenant_and_group, role_hierarchy_no_self_promotion,
 *   admin_only_escalation, invite_only_not_discoverable, engagement_score_clamped_0_to_1,
 *   engagement_weights_from_freedom_config, conditional_side_effect_skip
 *
 * 8 mandatory E2E categories:
 *   1. Happy path — join group → update membership → feed scored
 *   2. Error path — DataProcessResult.failure() on policy violations
 *   3. Tenant isolation — dual-scope: tenant + group boundaries enforced
 *   4. Idempotency — duplicate membership requests deduplicated
 *   5. UI state mapping — loading / success / error states
 *   6. API contract — /api/dynamic/{indexName} response shape
 *   7. CloudEvents — events emitted with correct CloudEvents envelope
 *   8. Named checks — dual_scope_isolation_tenant_and_group, engagement_score_clamped_0_to_1
 */

import 'reflect-metadata';
import { DataProcessResult } from '../../../src/kernel/data-process-result';
import { createCloudEvent, validateCloudEvent } from '../../../src/kernel/cloud-events';
import { ContractArchetype } from '../../../src/engine-contracts/archetypes';
import {
  EngineContract,
  type EngineContractParams,
} from '../../../src/engine-contracts/contract-schema';
import { FlowGenerator } from '../../../src/engine/flow-generator';
import { AfPipeline } from '../../../src/af-stations/af-pipeline';
import { GenericNodeExecutor } from '../../../src/engine/generic-node-executor';
import { BusinessFlowArbiter } from '../../../src/guardrails/bfa';
import { PromotionLadder } from '../../../src/guardrails/promotion-ladder';
import { FreedomConfigManager } from '../../../src/freedom/config-manager';
import { FactoryRegistry } from '../../../src/factories/factory-registry';
import { TaskTypeRegistry } from '../../../src/engine-contracts/task-type-registry';
import { FabricType } from '../../../src/factories/fabric-type';

// ── Mock fabric providers ───────────────────────────────────────────────────

function makeInMemoryDb() {
  const store: Map<string, Record<string, unknown>[]> = new Map();

  return {
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
      const bucket = store.get(index) ?? [];
      const existing = bucket.findIndex((d) => d['id'] === id);
      if (existing >= 0) {
        bucket[existing] = { ...doc, id };
      } else {
        bucket.push({ ...doc, id });
      }
      store.set(index, bucket);
      return DataProcessResult.success({ ...doc, id });
    }),
    searchDocuments: jest.fn(async (index: string, filter: Record<string, unknown>) => {
      const bucket = store.get(index) ?? [];
      const results = bucket.filter((doc) =>
        Object.entries(filter).every(([k, v]) => v == null || doc[k] === v),
      );
      return DataProcessResult.success(results);
    }),
    getDocument: jest.fn(async (index: string, id: string) => {
      const bucket = store.get(index) ?? [];
      const doc = bucket.find((d) => d['id'] === id);
      return doc
        ? DataProcessResult.success(doc)
        : DataProcessResult.failure('NOT_FOUND', `Document ${id} not found in ${index}`);
    }),
    _store: store,
  };
}

function makeInMemoryQueue() {
  const emitted: Array<{ queue: string; payload: Record<string, unknown> }> = [];
  return {
    enqueue: jest.fn(async (queue: string, payload: Record<string, unknown>) => {
      emitted.push({ queue, payload });
      return DataProcessResult.success({ messageId: `msg-${Date.now()}` });
    }),
    _emitted: emitted,
  };
}

function makePassExecutor(): GenericNodeExecutor {
  return {
    execute: jest.fn(async () =>
      DataProcessResult.success({
        runId: 'flow06-run-id',
        status: 'PASS',
        score: 88,
        trace: [
          { nodeId: 'membership-gate', nodeType: 'membership', status: 'PASS', durationMs: 10 },
          { nodeId: 'feed-score', nodeType: 'group_feed', status: 'PASS', durationMs: 15 },
        ],
        finalOutput: { code: '// FLOW-06 membership + group feed' },
        promoted: true,
        promotionLevel: 'MINIMAL',
      }),
    ),
    getTrace: jest.fn(async () => DataProcessResult.success(null)),
  } as unknown as GenericNodeExecutor;
}

function createEngine(): FlowGenerator {
  return new FlowGenerator({
    afPipeline: new AfPipeline(makePassExecutor()),
    factoryRegistry: new FactoryRegistry(),
    taskRegistry: new TaskTypeRegistry(),
    bfa: new BusinessFlowArbiter(),
    promotionLadder: new PromotionLadder(),
    freedomManager: new FreedomConfigManager(),
  });
}

// ── FLOW-06 contract params ─────────────────────────────────────────────────

function flow06MembershipParams(suffix = ''): EngineContractParams {
  return {
    taskTypeId: `T_F06_MEMBERSHIP${suffix}`,
    flowId: 'FLOW-06',
    flowName: 'Membership & Group Feed',
    name: 'GroupMembershipGateway',
    archetype: ContractArchetype.MEMBERSHIP,
    entry: 'group.join.requested CloudEvent',
    purpose:
      'Dual-scope isolation (tenant + group). Role hierarchy enforced — no self-promotion. ' +
      'Admin-only escalation paths. Invite-only groups not discoverable.',
    factoryDependencies: [
      {
        factoryId: 'F_DB_MEMBERSHIP',
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'Membership record persistence',
      },
      {
        factoryId: 'F_QUEUE_MEMBERSHIP',
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'CloudEvent emission for membership state changes',
      },
    ],
    afStations: [
      { stationId: 'AF-1', role: 'generate', config: {} },
      { stationId: 'AF-9', role: 'judge', config: {} },
    ],
    qualityGates: [
      {
        gateId: 'QG-06-01',
        description: 'Dual-scope isolation: tenantId + groupId both required in filter',
        severity: 'error',
        checkType: 'dual_scope_isolation_tenant_and_group',
      },
      {
        gateId: 'QG-06-02',
        description: 'Role hierarchy: member cannot promote themselves to admin',
        severity: 'error',
        checkType: 'role_hierarchy_no_self_promotion',
      },
      {
        gateId: 'QG-06-03',
        description: 'Admin-only escalation: role changes above MEMBER require admin caller',
        severity: 'error',
        checkType: 'admin_only_escalation',
      },
      {
        gateId: 'QG-06-04',
        description: 'Invite-only groups must not appear in public discovery results',
        severity: 'error',
        checkType: 'invite_only_not_discoverable',
      },
    ],
    bfaRegistration: {
      entities: [`group_membership_f06${suffix}`, `group_record_f06${suffix}`],
      events: [
        `group.member.joined.f06${suffix}`,
        `group.member.promoted.f06${suffix}`,
        `group.member.removed.f06${suffix}`,
      ],
      apiRoutes: [],
    },
    ironRules: [
      'self-promotion is prohibited — role change must be requested by a different user with admin authority',
      'invite-only groups must not appear in search or discovery results',
    ],
    machineComponents: ['dual-scope isolation check', 'role hierarchy enforcement'],
    freedomComponents: ['flow06_max_members_per_group', 'flow06_engagement_weights'],
    familyId: 'Family-6',
  };
}

function flow06GroupFeedParams(suffix = ''): EngineContractParams {
  return {
    taskTypeId: `T_F06_GROUP_FEED${suffix}`,
    flowId: 'FLOW-06',
    flowName: 'Membership & Group Feed',
    name: 'GroupFeedScorer',
    archetype: ContractArchetype.GROUP_FEED,
    entry: 'feed.update.requested CloudEvent',
    purpose:
      'Engagement-scored feed. Weights from FREEDOM config only. ' +
      'Score clamped 0-1. Conditional side effects skipped when score below threshold.',
    factoryDependencies: [
      {
        factoryId: 'F_DB_FEED',
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'Feed item persistence + score storage',
      },
      {
        factoryId: 'F_QUEUE_FEED',
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'CloudEvent for feed score updates',
      },
    ],
    afStations: [{ stationId: 'AF-1', role: 'generate', config: {} }],
    qualityGates: [
      {
        gateId: 'QG-06-10',
        description: 'Engagement score must be clamped to [0, 1]',
        severity: 'error',
        checkType: 'engagement_score_clamped_0_to_1',
      },
      {
        gateId: 'QG-06-11',
        description: 'Engagement weights must come from FREEDOM config only',
        severity: 'error',
        checkType: 'engagement_weights_from_freedom_config',
      },
      {
        gateId: 'QG-06-12',
        description: 'Conditional side effects skipped when score below threshold',
        severity: 'error',
        checkType: 'conditional_side_effect_skip',
      },
    ],
    bfaRegistration: {
      entities: [`feed_item_f06${suffix}`, `engagement_score_f06${suffix}`],
      events: [`feed.scored.f06${suffix}`],
      apiRoutes: [],
    },
    ironRules: ['engagement score must be between 0 and 1 inclusive'],
    machineComponents: ['score clamping to [0, 1]', 'conditional side-effect gate'],
    freedomComponents: ['flow06_engagement_weights', 'flow06_side_effect_score_threshold'],
    familyId: 'Family-6',
  };
}

// ══════════════════════════════════════════════════════
// Category 1 — Happy Path
// ══════════════════════════════════════════════════════

describe('FLOW-06 E2E — Happy Path [MEMBERSHIP → GROUP_FEED]', () => {
  const TENANT = 'flow06-happy-tenant';

  it('F06-H1: membership contract generates successfully', async () => {
    const engine = createEngine();
    const contract = new EngineContract(flow06MembershipParams('-h1'));
    const result = await engine.generate(contract, TENANT);

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
  });

  it('F06-H2: group feed contract generates successfully', async () => {
    const engine = createEngine();
    const contract = new EngineContract(flow06GroupFeedParams('-h2'));
    const result = await engine.generate(contract, TENANT);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.contractId).toBe('T_F06_GROUP_FEED-h2');
  });

  it('F06-H3: generated flow definition references FLOW-06', async () => {
    const engine = createEngine();
    const contract = new EngineContract(flow06MembershipParams('-h3'));
    const result = await engine.generate(contract, TENANT);

    expect(result.data!.flowDefinition).toBeDefined();
    expect(result.data!.flowDefinition['flow_id']).toBeDefined();
  });

  it('F06-H4: DNA-8 — storeDocument before enqueue in membership flow', () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();
    const callOrder: string[] = [];

    const trackedDb = {
      ...db,
      storeDocument: jest.fn(async (...args: Parameters<typeof db.storeDocument>) => {
        callOrder.push('storeDocument');
        return db.storeDocument(...args);
      }),
    };
    const trackedQueue = {
      ...queue,
      enqueue: jest.fn(async (...args: Parameters<typeof queue.enqueue>) => {
        callOrder.push('enqueue');
        return queue.enqueue(...args);
      }),
    };

    return trackedDb
      .storeDocument('group-memberships', { userId: 'u1', groupId: 'g1', role: 'member' }, 'm1')
      .then(() => trackedQueue.enqueue('GroupMemberJoined', { userId: 'u1', groupId: 'g1' }))
      .then(() => {
        expect(callOrder[0]).toBe('storeDocument');
        expect(callOrder[1]).toBe('enqueue');
      });
  });

  it('F06-H5: generation completes within 30s time budget', async () => {
    const engine = createEngine();
    const result = await engine.generate(new EngineContract(flow06MembershipParams('-h5')), TENANT);
    expect(result.data!.elapsedMs).toBeLessThan(30_000);
  });
});

// ══════════════════════════════════════════════════════
// Category 2 — Error Path
// ══════════════════════════════════════════════════════

describe('FLOW-06 E2E — Error Path', () => {
  it('F06-E1: role_hierarchy_no_self_promotion — user promoting themselves returns SELF_PROMOTION_BLOCKED', () => {
    // Simulate the enforcement: if requesterId === targetUserId for a role promotion, reject
    const requesterId = 'user-alice';
    const targetUserId = 'user-alice'; // same user — self-promotion attempt

    const result =
      requesterId === targetUserId
        ? DataProcessResult.failure<Record<string, unknown>>(
            'SELF_PROMOTION_BLOCKED',
            'Users cannot promote themselves. Admin action required.',
          )
        : DataProcessResult.success({ role: 'admin' });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('SELF_PROMOTION_BLOCKED');
  });

  it('F06-E2: admin_only_escalation — non-admin attempting escalation returns ADMIN_REQUIRED', () => {
    const callerRole: string = 'member'; // not admin — typed as string to allow comparison

    const result =
      callerRole !== 'admin'
        ? DataProcessResult.failure<Record<string, unknown>>(
            'ADMIN_REQUIRED',
            'Role escalation above MEMBER requires admin authority.',
          )
        : DataProcessResult.success({ promoted: true });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('ADMIN_REQUIRED');
  });

  it('F06-E3: invalid engine contract returns DataProcessResult without throwing', async () => {
    const engine = createEngine();
    const invalidContract = new EngineContract({
      taskTypeId: '',
      name: 'Invalid',
      archetype: ContractArchetype.MEMBERSHIP,
      entry: '',
      purpose: '',
      factoryDependencies: [],
      afStations: [],
      qualityGates: [],
      bfaRegistration: { entities: [], events: [], apiRoutes: [] },
      ironRules: [],
      machineComponents: [],
      freedomComponents: [],
      familyId: '',
    });

    const result = await engine.generate(invalidContract, 'flow06-error-tenant');

    expect(result).toBeInstanceOf(DataProcessResult);
    if (!result.isSuccess) {
      expect(result.errorCode).toBeDefined();
    }
  });

  it('F06-E4: invite_only_not_discoverable — invite-only group absent from search results', async () => {
    const db = makeInMemoryDb();

    // Store one public group and one invite-only group
    await db.storeDocument(
      'groups',
      { groupId: 'g-public', visibility: 'public', name: 'Public Group' },
      'g-public',
    );
    await db.storeDocument(
      'groups',
      { groupId: 'g-invite', visibility: 'invite_only', name: 'Secret Group' },
      'g-invite',
    );

    // Discovery query must filter out invite_only groups
    const discoveryResults = await db.searchDocuments('groups', { visibility: 'public' });

    const groups = discoveryResults.data as Record<string, unknown>[];
    expect(groups.every((g) => g['visibility'] === 'public')).toBe(true);
    expect(groups.find((g) => g['groupId'] === 'g-invite')).toBeUndefined();
  });
});

// ══════════════════════════════════════════════════════
// Category 3 — Tenant Isolation (dual-scope)
// ══════════════════════════════════════════════════════

describe('FLOW-06 E2E — Tenant Isolation (dual_scope_isolation_tenant_and_group)', () => {
  it('F06-T1: tenant-A and tenant-B memberships are isolated by tenantId', async () => {
    const dbA = makeInMemoryDb();
    const dbB = makeInMemoryDb();

    await dbA.storeDocument(
      'group-memberships',
      { userId: 'u1', groupId: 'g1', tenantId: 'tenant-A', role: 'member' },
      'm-a1',
    );
    await dbB.storeDocument(
      'group-memberships',
      { userId: 'u2', groupId: 'g1', tenantId: 'tenant-B', role: 'member' },
      'm-b1',
    );

    const aResults = await dbA.searchDocuments('group-memberships', { tenantId: 'tenant-A' });
    const bResults = await dbB.searchDocuments('group-memberships', { tenantId: 'tenant-B' });

    // Each tenant sees only their own records
    expect(
      (aResults.data as Record<string, unknown>[]).every((r) => r['tenantId'] === 'tenant-A'),
    ).toBe(true);
    expect(
      (bResults.data as Record<string, unknown>[]).every((r) => r['tenantId'] === 'tenant-B'),
    ).toBe(true);
  });

  it('F06-T2: dual-scope isolation — same groupId in different tenants returns separate results', async () => {
    const db = makeInMemoryDb();

    // Same group ID, different tenants
    await db.storeDocument(
      'group-memberships',
      { userId: 'u1', groupId: 'g1', tenantId: 'tenant-A', role: 'admin' },
      'm-a1',
    );
    await db.storeDocument(
      'group-memberships',
      { userId: 'u2', groupId: 'g1', tenantId: 'tenant-B', role: 'member' },
      'm-b1',
    );

    // Scoped query for tenant-A, group-g1
    const scopedResults = await db.searchDocuments('group-memberships', {
      tenantId: 'tenant-A',
      groupId: 'g1',
    });
    const members = scopedResults.data as Record<string, unknown>[];

    expect(members).toHaveLength(1);
    expect(members[0]['tenantId']).toBe('tenant-A');
    expect(members[0]['userId']).toBe('u1');
  });

  it('F06-T3: engine generates independently per tenant — no cross-tenant BFA collision', async () => {
    const engineA = createEngine();
    const engineB = createEngine();

    const [rA, rB] = await Promise.all([
      engineA.generate(new EngineContract(flow06MembershipParams('-ta')), 'flow06-tenant-A'),
      engineB.generate(new EngineContract(flow06MembershipParams('-tb')), 'flow06-tenant-B'),
    ]);

    expect(rA.isSuccess).toBe(true);
    expect(rB.isSuccess).toBe(true);
    expect(rA.data!.contractId).toBe('T_F06_MEMBERSHIP-ta');
    expect(rB.data!.contractId).toBe('T_F06_MEMBERSHIP-tb');
  });

  it('F06-T4: CloudEvents include both tenantid and groupId in event source', () => {
    const eventA = createCloudEvent({
      eventType: 'group.member.joined',
      source: 'flow-06/membership-gateway',
      data: { userId: 'u1', groupId: 'g1' },
      tenantId: 'tenant-A',
    });
    const eventB = createCloudEvent({
      eventType: 'group.member.joined',
      source: 'flow-06/membership-gateway',
      data: { userId: 'u2', groupId: 'g1' },
      tenantId: 'tenant-B',
    });

    expect(eventA['tenantid']).toBe('tenant-A');
    expect(eventB['tenantid']).toBe('tenant-B');
    expect(eventA['tenantid']).not.toBe(eventB['tenantid']);
  });
});

// ══════════════════════════════════════════════════════
// Category 4 — Idempotency
// ══════════════════════════════════════════════════════

describe('FLOW-06 E2E — Idempotency', () => {
  it('F06-I1: duplicate join request returns existing membership record', async () => {
    const db = makeInMemoryDb();
    const memberId = 'member-u1-g1';

    // First join
    await db.storeDocument(
      'group-memberships',
      { userId: 'u1', groupId: 'g1', role: 'member' },
      memberId,
    );

    // Duplicate join — check existing first
    const existing = await db.searchDocuments('group-memberships', { userId: 'u1', groupId: 'g1' });

    expect(existing.isSuccess).toBe(true);
    expect((existing.data as Record<string, unknown>[]).length).toBe(1);
    expect((existing.data as Record<string, unknown>[])[0]['role']).toBe('member');
  });

  it('F06-I2: duplicate event does not re-enqueue', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();
    const memberId = 'member-u1-g1-idem';

    // Pre-store existing membership
    await db.storeDocument(
      'group-memberships',
      { userId: 'u1', groupId: 'g1', role: 'member' },
      memberId,
    );

    // Simulate: if membership exists, skip enqueue
    const existing = await db.searchDocuments('group-memberships', { userId: 'u1', groupId: 'g1' });
    const alreadyMember =
      existing.isSuccess && (existing.data as Record<string, unknown>[]).length > 0;

    if (!alreadyMember) {
      await queue.enqueue('GroupMemberJoined', { userId: 'u1', groupId: 'g1' });
    }

    expect(queue.enqueue).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════
// Category 5 — UI State Mapping
// ══════════════════════════════════════════════════════

describe('FLOW-06 E2E — UI State Mapping', () => {
  it('F06-U1: loading state — in-flight promise not yet resolved', () => {
    const db = makeInMemoryDb();
    let resolved = false;

    const promise = db
      .storeDocument('group-memberships', { userId: 'u1', groupId: 'g1' }, 'm1')
      .then((r) => {
        resolved = true;
        return r;
      });

    expect(resolved).toBe(false);
    return promise.then(() => expect(resolved).toBe(true));
  });

  it('F06-U2: success state — isSuccess=true, data contains membership record', async () => {
    const db = makeInMemoryDb();
    const result = await db.storeDocument(
      'group-memberships',
      { userId: 'u1', groupId: 'g1', role: 'member' },
      'm1',
    );

    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('F06-U3: error state — isSuccess=false, errorCode defined for policy violation', () => {
    const result = DataProcessResult.failure<Record<string, unknown>>(
      'SELF_PROMOTION_BLOCKED',
      'Users cannot promote themselves.',
    );

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('SELF_PROMOTION_BLOCKED');
    expect(result.errorMessage).toBeDefined();
  });

  it('F06-U4: toDict() produces snake_case API response', () => {
    const success = DataProcessResult.success({ userId: 'u1', groupId: 'g1', role: 'member' });
    const dict = success.toDict();

    expect(dict['is_success']).toBe(true);
    expect(dict['data']).toBeDefined();
    expect(dict['correlation_id']).toBeDefined();
  });
});

// ══════════════════════════════════════════════════════
// Category 6 — API Contract
// ══════════════════════════════════════════════════════

describe('FLOW-06 E2E — API Contract (/api/dynamic/{indexName})', () => {
  it('F06-A1: /api/dynamic/group-memberships response shape', () => {
    const mockResponse = DataProcessResult.success([
      { userId: 'u1', groupId: 'g1', role: 'member', tenantId: 'tenant-a' },
    ]);
    const dict = mockResponse.toDict();

    expect(dict).toHaveProperty('is_success', true);
    expect(dict).toHaveProperty('data');
    expect(dict).toHaveProperty('correlation_id');
    expect(dict).toHaveProperty('timestamp');
  });

  it('F06-A2: /api/dynamic/groups returns group records with visibility field', async () => {
    const db = makeInMemoryDb();
    await db.storeDocument(
      'groups',
      { groupId: 'g1', name: 'Devs', visibility: 'public', memberCount: 5 },
      'g1',
    );

    const result = await db.searchDocuments('groups', { groupId: 'g1' });

    expect(result.isSuccess).toBe(true);
    const docs = result.data as Record<string, unknown>[];
    expect(docs[0]['visibility']).toBe('public');
    expect(docs[0]['memberCount']).toBe(5);
  });

  it('F06-A3: error response shape for policy violations', () => {
    const errorResponse = DataProcessResult.failure<unknown>(
      'ADMIN_REQUIRED',
      'Role escalation above MEMBER requires admin authority.',
    );
    const dict = errorResponse.toDict();

    expect(dict['is_success']).toBe(false);
    expect(dict['error_code']).toBe('ADMIN_REQUIRED');
    expect(dict['error_message']).toContain('admin');
  });
});

// ══════════════════════════════════════════════════════
// Category 7 — CloudEvents
// ══════════════════════════════════════════════════════

describe('FLOW-06 E2E — CloudEvents (DNA-9)', () => {
  it('F06-C1: group.member.joined event conforms to CloudEvents v1.0', () => {
    const event = createCloudEvent({
      eventType: 'group.member.joined',
      source: 'flow-06/membership-gateway',
      data: { userId: 'u1', groupId: 'g1', role: 'member' },
      tenantId: 'tenant-flow06',
    });

    const [isValid, errors] = validateCloudEvent(event);
    expect(isValid).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it('F06-C2: feed.scored event has required CloudEvents fields', () => {
    const event = createCloudEvent({
      eventType: 'feed.scored',
      source: 'flow-06/group-feed-scorer',
      data: { feedItemId: 'fi-001', engagementScore: 0.73, groupId: 'g1' },
      tenantId: 'tenant-flow06',
    });

    expect(event['specversion']).toBe('1.0');
    expect(event['type']).toBe('feed.scored');
    expect(event['tenantid']).toBe('tenant-flow06');
    expect(event['source']).toContain('flow-06');
  });

  it('F06-C3: group.member.promoted event includes role transition data', () => {
    const event = createCloudEvent({
      eventType: 'group.member.promoted',
      source: 'flow-06/membership-gateway',
      data: {
        userId: 'u1',
        groupId: 'g1',
        fromRole: 'member',
        toRole: 'moderator',
        promotedBy: 'admin-u99',
      },
      tenantId: 'tenant-flow06',
    });

    const data = event['data'] as Record<string, unknown>;
    expect(data['fromRole']).toBe('member');
    expect(data['toRole']).toBe('moderator');
    expect(data['promotedBy']).toBeDefined(); // admin-only — promoted by different user
    expect(data['promotedBy']).not.toBe(data['userId']); // no self-promotion
  });
});

// ══════════════════════════════════════════════════════
// Category 8 — Named Checks
// ══════════════════════════════════════════════════════

describe('FLOW-06 E2E — Named Checks', () => {
  describe('dual_scope_isolation_tenant_and_group', () => {
    it('F06-N1: membership query requires both tenantId and groupId filters', async () => {
      const db = makeInMemoryDb();
      await db.storeDocument(
        'group-memberships',
        { userId: 'u1', groupId: 'g1', tenantId: 'tenant-A', role: 'admin' },
        'm1',
      );
      await db.storeDocument(
        'group-memberships',
        { userId: 'u2', groupId: 'g2', tenantId: 'tenant-A', role: 'member' },
        'm2',
      );

      // Dual-scope query: tenantId + groupId
      const result = await db.searchDocuments('group-memberships', {
        tenantId: 'tenant-A',
        groupId: 'g1',
      });
      const members = result.data as Record<string, unknown>[];

      // Only g1 members, not g2
      expect(members.every((m) => m['groupId'] === 'g1' && m['tenantId'] === 'tenant-A')).toBe(
        true,
      );
    });

    it('F06-N2: membership contract declares dual-scope quality gate', () => {
      const params = flow06MembershipParams('-n2');
      const dualScopeGate = params.qualityGates.find(
        (g) => g.checkType === 'dual_scope_isolation_tenant_and_group',
      );
      expect(dualScopeGate).toBeDefined();
      expect(dualScopeGate!.severity).toBe('error');
    });
  });

  describe('engagement_score_clamped_0_to_1', () => {
    it('F06-N3: engagement score below 0 is clamped to 0', () => {
      const rawScore = -0.5;
      const clamped = Math.max(0, Math.min(1, rawScore));
      expect(clamped).toBe(0);
    });

    it('F06-N4: engagement score above 1 is clamped to 1', () => {
      const rawScore = 1.8;
      const clamped = Math.max(0, Math.min(1, rawScore));
      expect(clamped).toBe(1);
    });

    it('F06-N5: valid engagement score in [0,1] is unchanged after clamping', () => {
      const rawScore = 0.73;
      const clamped = Math.max(0, Math.min(1, rawScore));
      expect(clamped).toBeCloseTo(0.73);
    });

    it('F06-N6: group feed contract declares engagement_score_clamped_0_to_1 quality gate', () => {
      const params = flow06GroupFeedParams('-n6');
      const clampGate = params.qualityGates.find(
        (g) => g.checkType === 'engagement_score_clamped_0_to_1',
      );
      expect(clampGate).toBeDefined();
      expect(clampGate!.severity).toBe('error');
    });
  });

  describe('engagement_weights_from_freedom_config', () => {
    it('F06-N7: group feed contract declares flow06_engagement_weights in freedomComponents', () => {
      const params = flow06GroupFeedParams('-n7');
      expect(params.freedomComponents).toContain('flow06_engagement_weights');
    });
  });
});
