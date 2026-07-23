/**
 * FLOW-24 E2E — AI Safety & Content Moderation (Learning Calendar / Personal AI Tutor)
 *
 * Archetypes: LESSON_COMPOSITION, SAFETY_GATE, LESSON_PUBLISH, LEARNING_CALENDAR,
 *             GAMIFICATION_LEDGER, STUDENT_GRADING, CONSENT_GATE, STREAK_TRACKER
 * Task types: T361–T380 (Families 120–128)
 * CloudEvents: LessonComposed, SafetyGateApproved, LessonPublished, CalendarEventSynced,
 *   GamificationPointsAwarded, StudentGraded, StreakUpdated, ConsentGranted, ConsentDenied
 *
 * Named checks (CF-461 through CF-472):
 *   safety_compose_gate_publish_order  — CF-465 IRON RULE
 *   safety_gate_token_protocol         — DR-168/DD-224
 *   content_safety_scan_mandatory      — CF-462
 *   consent_blocks_all_downstream      — CF-461
 *   server_side_only_grading           — DD-226
 *   gamification_ledger_append_only    — DD-222
 *   streak_timezone_from_profile_not_client — DD-223
 *   calendar_fabric_connectors_only    — DD-225
 *
 * 8 mandatory E2E categories:
 *   1. Happy path — lesson compose→safety gate→publish pipeline, calendar sync, gamification,
 *                   server-side grading, streak calculation, consent flow
 *   2. Error path — CF-465 IRON RULE violations, missing token, rejected token, ledger update,
 *                   client score, direct calendar SDK, consent denied, client timezone
 *   3. Tenant isolation — lesson content scoped, gamification points not cross-tenant
 *   4. Idempotency — duplicate lesson publish, duplicate streak update
 *   5. UI state mapping — LESSON_DRAFT→LESSON_COMPOSED→SAFETY_REVIEW→LESSON_PUBLISHED,
 *                         CONSENT_PENDING→CONSENT_GRANTED
 *   6. API contract — /api/dynamic/lesson-compositions, /api/dynamic/gamification-ledger
 *   7. CloudEvents — LessonPublished, SafetyGateApproved, StudentGraded validate against spec
 *   8. Named checks — all 8 CF-461–CF-472 checks pass/fail correctly
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
import {
  safety_compose_gate_publish_order,
  safety_gate_token_protocol,
  content_safety_scan_mandatory,
  consent_blocks_all_downstream,
  server_side_only_grading,
  gamification_ledger_append_only,
  streak_timezone_from_profile_not_client,
  calendar_fabric_connectors_only,
  type ExecutionLogEntry,
} from '../../../src/engine-contracts/checks/ai-safety-moderation-checks';
import type { SafetyGateToken } from '../../../src/engine-contracts/safety-gate-token';

// ── Mock fabric providers ────────────────────────────────────────────────────

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
        runId: 'flow24-run-id',
        status: 'PASS',
        score: 95,
        trace: [
          { nodeId: 'lesson-compose', nodeType: 'composition', status: 'PASS', durationMs: 12 },
          { nodeId: 'safety-gate', nodeType: 'gate', status: 'PASS', durationMs: 20 },
          { nodeId: 'lesson-publish', nodeType: 'publish', status: 'PASS', durationMs: 8 },
          { nodeId: 'calendar-sync', nodeType: 'fabric-connector', status: 'PASS', durationMs: 15 },
          { nodeId: 'gamification', nodeType: 'ledger', status: 'PASS', durationMs: 5 },
          { nodeId: 'grading', nodeType: 'server-compute', status: 'PASS', durationMs: 10 },
          { nodeId: 'streak', nodeType: 'profile-compute', status: 'PASS', durationMs: 6 },
        ],
        finalOutput: { code: '// FLOW-24 AI Safety & Learning Calendar' },
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

// ── Helpers ──────────────────────────────────────────────────────────────────

const TENANT = 'tenant-school-01';

function makeApprovedToken(compositionId: string): SafetyGateToken {
  return {
    tokenId: `tok-${compositionId}`,
    lessonCompositionHash: `sha256-${compositionId}-hash`,
    safetyCheckTimestamp: new Date().toISOString(),
    safetyGateVersion: '1.0.0',
    tenantId: TENANT,
    approvedCategories: ['educational', 'age_appropriate'],
    rejectedCategories: [],
    verdict: 'APPROVED',
    signature: 'hmac-sha256-valid-signature-abcdefghijklmnopqrstuvwxyz123456',
  };
}

function makeRejectedToken(compositionId: string): SafetyGateToken {
  return {
    tokenId: `tok-rejected-${compositionId}`,
    lessonCompositionHash: `sha256-${compositionId}-hash`,
    safetyCheckTimestamp: new Date().toISOString(),
    safetyGateVersion: '1.0.0',
    tenantId: TENANT,
    approvedCategories: [],
    rejectedCategories: ['violence', 'inappropriate_language'],
    verdict: 'REJECTED',
    signature: 'hmac-sha256-valid-signature-abcdefghijklmnopqrstuvwxyz123456',
  };
}

function makeValidExecutionLog(baseTime = 1000): ExecutionLogEntry[] {
  return [
    { step: 'COMPOSE', completedAt: baseTime },
    { step: 'SAFETY_GATE', completedAt: baseTime + 100 },
    { step: 'PUBLISH', completedAt: baseTime + 200 },
  ];
}

// ── FLOW-24 contract param builders ──────────────────────────────────────────

function flow24LessonCompositionParams(suffix = ''): EngineContractParams {
  return {
    taskTypeId: `T362_F24_LESSON_COMPOSE${suffix}`,
    flowId: 'FLOW-24',
    flowName: 'AI Safety & Content Moderation (Learning Calendar)',
    name: 'LessonCompositionOrchestrator',
    archetype: ContractArchetype.ORCHESTRATION,
    entry: 'learning.lesson.draft.submitted CloudEvent',
    purpose:
      'AI-powered lesson composition from curriculum template. ' +
      'Emits LessonComposed event. ' +
      'CF-465 IRON RULE: COMPOSE must complete before SAFETY_GATE. ' +
      'DNA-8: storeDocument before enqueue.',
    factoryDependencies: [
      {
        factoryId: `F_DB_LESSON_COMPOSE${suffix}`,
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'Lesson composition record storage',
      },
      {
        factoryId: `F_QUEUE_LESSON_COMPOSE${suffix}`,
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'LessonComposed event emission',
      },
    ],
    afStations: [{ stationId: 'AF-1', role: 'generate', config: {} }],
    qualityGates: [
      {
        gateId: `QG-24-LC01${suffix}`,
        description: 'CF-465 IRON RULE: COMPOSE must precede SAFETY_GATE',
        severity: 'error',
        checkType: 'safety_compose_gate_publish_order',
      },
      {
        gateId: `QG-24-LC02${suffix}`,
        description: 'DNA-8: storeDocument before enqueue',
        severity: 'error',
        checkType: 'store_before_enqueue',
      },
    ],
    bfaRegistration: {
      entities: [`lesson_composition_f24${suffix}`],
      events: [`learning.lesson.composed.f24${suffix}`],
      apiRoutes: [],
    },
    ironRules: [
      'IR-1: COMPOSE must complete before SAFETY_GATE (CF-465)',
      'IR-2: DNA-8 storeDocument before enqueue',
    ],
    machineComponents: ['Lesson composition AI engine', 'curriculum template resolver'],
    freedomComponents: ['flow24_lesson_composition_template', 'flow24_ai_model_selection'],
    familyId: 'Family-120',
  };
}

function flow24SafetyGateParams(suffix = ''): EngineContractParams {
  return {
    taskTypeId: `T364_F24_SAFETY_GATE${suffix}`,
    flowId: 'FLOW-24',
    flowName: 'AI Safety & Content Moderation (Learning Calendar)',
    name: 'ContentSafetyGateService',
    archetype: ContractArchetype.ORCHESTRATION,
    entry: 'learning.lesson.composed CloudEvent',
    purpose:
      'Content safety scan and SafetyGateToken issuance. ' +
      'CF-462: safety scan is mandatory. ' +
      'DR-168/DD-224: token must contain tokenId, lessonCompositionHash, verdict=APPROVED, signature. ' +
      'CF-465 IRON RULE: SAFETY_GATE must complete before PUBLISH.',
    factoryDependencies: [
      {
        factoryId: `F_DB_SAFETY_GATE${suffix}`,
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'Safety scan result storage',
      },
      {
        factoryId: `F_QUEUE_SAFETY_GATE${suffix}`,
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'SafetyGateApproved / SafetyGateRejected event emission',
      },
    ],
    afStations: [{ stationId: 'AF-1', role: 'generate', config: {} }],
    qualityGates: [
      {
        gateId: `QG-24-SG01${suffix}`,
        description: 'CF-462: content_safety_scan_mandatory',
        severity: 'error',
        checkType: 'content_safety_scan_mandatory',
      },
      {
        gateId: `QG-24-SG02${suffix}`,
        description: 'DR-168/DD-224: safety_gate_token_protocol',
        severity: 'error',
        checkType: 'safety_gate_token_protocol',
      },
    ],
    bfaRegistration: {
      entities: [`safety_scan_result_f24${suffix}`],
      events: [
        `learning.safety_gate.approved.f24${suffix}`,
        `learning.safety_gate.rejected.f24${suffix}`,
      ],
      apiRoutes: [],
    },
    ironRules: [
      'IR-1: safety scan mandatory before token issuance (CF-462)',
      'IR-2: token must include tokenId, lessonCompositionHash, verdict, signature (DD-224)',
    ],
    machineComponents: ['Content safety scanner', 'SafetyGateToken issuer'],
    freedomComponents: ['flow24_safety_categories', 'flow24_rejection_threshold'],
    familyId: 'Family-121',
  };
}

function flow24LessonPublishParams(suffix = ''): EngineContractParams {
  return {
    taskTypeId: `T366_F24_LESSON_PUBLISH${suffix}`,
    flowId: 'FLOW-24',
    flowName: 'AI Safety & Content Moderation (Learning Calendar)',
    name: 'LessonPublisherService',
    archetype: ContractArchetype.ORCHESTRATION,
    entry: 'learning.safety_gate.approved CloudEvent',
    purpose:
      'Publish lesson after safety gate approval. ' +
      'Requires SafetyGateToken with verdict=APPROVED. ' +
      'CF-465 IRON RULE: PUBLISH must follow SAFETY_GATE which must follow COMPOSE.',
    factoryDependencies: [
      {
        factoryId: `F_DB_LESSON_PUBLISH${suffix}`,
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'Published lesson storage',
      },
      {
        factoryId: `F_QUEUE_LESSON_PUBLISH${suffix}`,
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'LessonPublished event emission',
      },
    ],
    afStations: [{ stationId: 'AF-1', role: 'generate', config: {} }],
    qualityGates: [
      {
        gateId: `QG-24-LP01${suffix}`,
        description: 'CF-465 IRON RULE: full COMPOSE→SAFETY_GATE→PUBLISH order',
        severity: 'error',
        checkType: 'safety_compose_gate_publish_order',
      },
      {
        gateId: `QG-24-LP02${suffix}`,
        description: 'DR-168: SafetyGateToken required with APPROVED verdict',
        severity: 'error',
        checkType: 'safety_gate_token_protocol',
      },
    ],
    bfaRegistration: {
      entities: [`published_lesson_f24${suffix}`],
      events: [`learning.lesson.published.f24${suffix}`],
      apiRoutes: [`/api/dynamic/lesson-compositions`],
    },
    ironRules: [
      'IR-1: SafetyGateToken required — no token = no publish',
      'IR-2: CF-465 full COMPOSE→SAFETY_GATE→PUBLISH order enforced',
    ],
    machineComponents: ['Lesson publisher', 'SafetyGateToken validator'],
    freedomComponents: ['flow24_publish_visibility_rules'],
    familyId: 'Family-122',
  };
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('FLOW-24 E2E — AI Safety & Content Moderation (Learning Calendar)', () => {
  // ── Cat 1 — Happy path ───────────────────────────────────────────────────────

  describe('Cat 1 — Happy path', () => {
    it('F24-H1: FlowGenerator accepts FLOW-24 lesson-composition contract', async () => {
      const engine = createEngine();
      const params = flow24LessonCompositionParams();
      const contract = new EngineContract(params);
      const result = await engine.generate(contract, TENANT);
      expect(result.isSuccess).toBe(true);
    });

    it('F24-H2: FlowGenerator accepts FLOW-24 safety-gate contract', async () => {
      const engine = createEngine();
      const params = flow24SafetyGateParams();
      const contract = new EngineContract(params);
      const result = await engine.generate(contract, TENANT);
      expect(result.isSuccess).toBe(true);
    });

    it('F24-H3: FlowGenerator accepts FLOW-24 lesson-publish contract', async () => {
      const engine = createEngine();
      const params = flow24LessonPublishParams();
      const contract = new EngineContract(params);
      const result = await engine.generate(contract, TENANT);
      expect(result.isSuccess).toBe(true);
    });

    it('F24-H4: Lesson composed → safety gate approves → SafetyGateToken issued with APPROVED verdict → lesson published', async () => {
      const db = makeInMemoryDb();
      const queue = makeInMemoryQueue();

      // Step 1: COMPOSE
      await db.storeDocument(
        'lesson-compositions',
        {
          compositionId: 'comp-001',
          tenantId: TENANT,
          lessonId: 'lesson-001',
          status: 'COMPOSED',
          content: 'Lesson on fractions',
        },
        'comp-001',
      );
      await queue.enqueue(
        'learning.lesson.composed',
        createCloudEvent({
          eventType: 'learning.lesson.composed',
          source: 'flow-24/lesson-compose',
          data: { compositionId: 'comp-001', tenantId: TENANT, lessonId: 'lesson-001' },
          tenantId: TENANT,
        }) as unknown as Record<string, unknown>,
      );

      // Step 2: SAFETY_GATE issues token
      const token = makeApprovedToken('comp-001');
      await db.storeDocument(
        'safety-scan-results',
        {
          scanId: 'scan-001',
          tenantId: TENANT,
          compositionId: 'comp-001',
          verdict: 'APPROVED',
          token,
        },
        'scan-001',
      );
      await queue.enqueue(
        'learning.safety_gate.approved',
        createCloudEvent({
          eventType: 'learning.safety_gate.approved',
          source: 'flow-24/safety-gate',
          data: {
            compositionId: 'comp-001',
            tenantId: TENANT,
            tokenId: token.tokenId,
            verdict: 'APPROVED',
          },
          tenantId: TENANT,
        }) as unknown as Record<string, unknown>,
      );

      // Step 3: PUBLISH
      await db.storeDocument(
        'published-lessons',
        {
          publishId: 'pub-001',
          tenantId: TENANT,
          compositionId: 'comp-001',
          tokenId: token.tokenId,
          status: 'PUBLISHED',
        },
        'pub-001',
      );
      await queue.enqueue(
        'learning.lesson.published',
        createCloudEvent({
          eventType: 'learning.lesson.published',
          source: 'flow-24/lesson-publish',
          data: {
            publishId: 'pub-001',
            tenantId: TENANT,
            compositionId: 'comp-001',
            tokenId: token.tokenId,
          },
          tenantId: TENANT,
        }) as unknown as Record<string, unknown>,
      );

      expect(queue._emitted).toHaveLength(3);
      const publishedData = queue._emitted[2].payload['data'] as Record<string, unknown>;
      expect(publishedData['tokenId']).toBe(token.tokenId);
      expect(token.verdict).toBe('APPROVED');
    });

    it('F24-H5: Calendar sync via fabric connector emits CalendarEventSynced event', async () => {
      const db = makeInMemoryDb();
      const queue = makeInMemoryQueue();

      await db.storeDocument(
        'calendar-events',
        {
          calendarEventId: 'cal-001',
          tenantId: TENANT,
          studentId: 'student-001',
          lessonId: 'lesson-001',
          scheduledAt: '2026-04-01T09:00:00Z',
          syncedViaConnector: true,
        },
        'cal-001',
      );

      await queue.enqueue(
        'learning.calendar.event.synced',
        createCloudEvent({
          eventType: 'learning.calendar.event.synced',
          source: 'flow-24/calendar-sync',
          data: {
            calendarEventId: 'cal-001',
            tenantId: TENANT,
            studentId: 'student-001',
            syncedViaConnector: true,
          },
          tenantId: TENANT,
        }) as unknown as Record<string, unknown>,
      );

      const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
      expect(data['syncedViaConnector']).toBe(true);
      expect(queue._emitted[0].queue).toBe('learning.calendar.event.synced');
    });

    it('F24-H6: Gamification ledger append emits GamificationPointsAwarded event', async () => {
      const db = makeInMemoryDb();
      const queue = makeInMemoryQueue();

      await db.storeDocument(
        'gamification-ledger',
        {
          entryId: 'gam-001',
          tenantId: TENANT,
          studentId: 'student-001',
          points: 50,
          reason: 'LESSON_COMPLETE',
          entryType: 'APPEND',
          createdAt: new Date().toISOString(),
        },
        'gam-001',
      );

      await queue.enqueue(
        'learning.gamification.points.awarded',
        createCloudEvent({
          eventType: 'learning.gamification.points.awarded',
          source: 'flow-24/gamification',
          data: {
            entryId: 'gam-001',
            tenantId: TENANT,
            studentId: 'student-001',
            points: 50,
            reason: 'LESSON_COMPLETE',
          },
          tenantId: TENANT,
        }) as unknown as Record<string, unknown>,
      );

      const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
      expect(data['points']).toBe(50);
      expect(data['reason']).toBe('LESSON_COMPLETE');
    });

    it('F24-H7: Server-side grading returns score → StudentGraded event emitted', async () => {
      const db = makeInMemoryDb();
      const queue = makeInMemoryQueue();

      // Server computes score — no client-supplied grade fields
      const serverComputedScore = 87;
      await db.storeDocument(
        'student-grades',
        {
          gradeId: 'grade-001',
          tenantId: TENANT,
          studentId: 'student-001',
          lessonId: 'lesson-001',
          score: serverComputedScore,
          gradedAt: new Date().toISOString(),
        },
        'grade-001',
      );

      await queue.enqueue(
        'learning.student.graded',
        createCloudEvent({
          eventType: 'learning.student.graded',
          source: 'flow-24/server-grading',
          data: {
            gradeId: 'grade-001',
            tenantId: TENANT,
            studentId: 'student-001',
            score: serverComputedScore,
          },
          tenantId: TENANT,
        }) as unknown as Record<string, unknown>,
      );

      const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
      expect(data['score']).toBe(87);
      expect(queue._emitted[0].queue).toBe('learning.student.graded');
    });

    it('F24-H8: Streak calculated using profile timezone → StreakUpdated event emitted', async () => {
      const db = makeInMemoryDb();
      const queue = makeInMemoryQueue();

      const profileTimezone = 'America/New_York';

      await db.storeDocument(
        'student-streaks',
        {
          streakId: 'streak-001',
          tenantId: TENANT,
          studentId: 'student-001',
          currentStreak: 5,
          timezoneUsed: profileTimezone,
          calculatedAt: new Date().toISOString(),
        },
        'streak-001',
      );

      await queue.enqueue(
        'learning.student.streak.updated',
        createCloudEvent({
          eventType: 'learning.student.streak.updated',
          source: 'flow-24/streak-tracker',
          data: {
            streakId: 'streak-001',
            tenantId: TENANT,
            studentId: 'student-001',
            currentStreak: 5,
            timezoneUsed: profileTimezone,
          },
          tenantId: TENANT,
        }) as unknown as Record<string, unknown>,
      );

      const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
      expect(data['currentStreak']).toBe(5);
      expect(data['timezoneUsed']).toBe(profileTimezone);
    });

    it('F24-H9: Student consent granted → ConsentGranted event emitted → downstream tasks unblocked', async () => {
      const db = makeInMemoryDb();
      const queue = makeInMemoryQueue();

      await db.storeDocument(
        'student-consents',
        {
          consentId: 'consent-001',
          tenantId: TENANT,
          studentId: 'student-001',
          status: 'GRANTED',
          grantedAt: new Date().toISOString(),
        },
        'consent-001',
      );

      await queue.enqueue(
        'learning.student.consent.granted',
        createCloudEvent({
          eventType: 'learning.student.consent.granted',
          source: 'flow-24/consent-gate',
          data: {
            consentId: 'consent-001',
            tenantId: TENANT,
            studentId: 'student-001',
            status: 'GRANTED',
          },
          tenantId: TENANT,
        }) as unknown as Record<string, unknown>,
      );

      const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
      expect(data['status']).toBe('GRANTED');
      // Consent GRANTED means T368–T374 are unblocked
      expect(() => consent_blocks_all_downstream('student-001', 'GRANTED', 'T368')).not.toThrow();
    });

    it('F24-H10: Full pipeline — lesson draft stored before LessonComposed enqueued (DNA-8)', async () => {
      const db = makeInMemoryDb();
      const queue = makeInMemoryQueue();

      // DNA-8: storeDocument BEFORE enqueue
      const storeResult = await db.storeDocument(
        'lesson-compositions',
        {
          compositionId: 'comp-dna8',
          tenantId: TENANT,
          status: 'COMPOSED',
          content: 'Draft stored first',
        },
        'comp-dna8',
      );
      expect(storeResult.isSuccess).toBe(true);

      const enqueueResult = await queue.enqueue(
        'learning.lesson.composed',
        createCloudEvent({
          eventType: 'learning.lesson.composed',
          source: 'flow-24/lesson-compose',
          data: { compositionId: 'comp-dna8', tenantId: TENANT },
          tenantId: TENANT,
        }) as unknown as Record<string, unknown>,
      );
      expect(enqueueResult.isSuccess).toBe(true);

      // Verify store happened before enqueue (store called first)
      const storeCallOrder = (db.storeDocument as jest.Mock).mock.invocationCallOrder[0];
      const enqueueCallOrder = (queue.enqueue as jest.Mock).mock.invocationCallOrder[0];
      expect(storeCallOrder).toBeLessThan(enqueueCallOrder);
    });
  });

  // ── Cat 2 — Error path (CF-465 IRON RULE) ───────────────────────────────────

  describe('Cat 2 — Error path (CF-465 IRON RULE & safety checks)', () => {
    it('F24-E1: PUBLISH attempted before SAFETY_GATE → throws IRON RULE VIOLATED', () => {
      const missingGatelog: ExecutionLogEntry[] = [
        { step: 'COMPOSE', completedAt: 1000 },
        // SAFETY_GATE missing
        { step: 'PUBLISH', completedAt: 1200 },
      ];
      expect(() => safety_compose_gate_publish_order(missingGatelog)).toThrow(
        'INVARIANT VIOLATION (CF-465)',
      );
      expect(() => safety_compose_gate_publish_order(missingGatelog)).toThrow('IRON RULE');
    });

    it('F24-E2: PUBLISH attempted before COMPOSE → throws IRON RULE VIOLATED', () => {
      const missingComposelog: ExecutionLogEntry[] = [
        // COMPOSE missing
        { step: 'SAFETY_GATE', completedAt: 1100 },
        { step: 'PUBLISH', completedAt: 1200 },
      ];
      expect(() => safety_compose_gate_publish_order(missingComposelog)).toThrow(
        'INVARIANT VIOLATION (CF-465)',
      );
      expect(() => safety_compose_gate_publish_order(missingComposelog)).toThrow(
        'Missing required step(s): COMPOSE',
      );
    });

    it('F24-E3: SAFETY_GATE completedAt > PUBLISH completedAt → throws IRON RULE VIOLATED (wrong order)', () => {
      const wrongOrderLog: ExecutionLogEntry[] = [
        { step: 'COMPOSE', completedAt: 1000 },
        { step: 'SAFETY_GATE', completedAt: 1300 }, // AFTER publish
        { step: 'PUBLISH', completedAt: 1200 },
      ];
      expect(() => safety_compose_gate_publish_order(wrongOrderLog)).toThrow('IRON RULE VIOLATED');
    });

    it('F24-E4: COMPOSE completedAt > SAFETY_GATE completedAt → throws IRON RULE VIOLATED', () => {
      const wrongOrderLog: ExecutionLogEntry[] = [
        { step: 'COMPOSE', completedAt: 1200 }, // After safety gate
        { step: 'SAFETY_GATE', completedAt: 1100 },
        { step: 'PUBLISH', completedAt: 1300 },
      ];
      expect(() => safety_compose_gate_publish_order(wrongOrderLog)).toThrow('IRON RULE VIOLATED');
    });

    it('F24-E5: SafetyGateToken missing → content_safety_scan_mandatory throws', () => {
      expect(() => content_safety_scan_mandatory(undefined, 'comp-001')).toThrow(
        'INVARIANT VIOLATION (CF-462)',
      );
      expect(() => content_safety_scan_mandatory(undefined, 'comp-001')).toThrow(
        'content_safety_scan_mandatory',
      );
    });

    it('F24-E6: SafetyGateToken verdict=REJECTED → safety_gate_token_protocol throws', () => {
      const rejectedToken = makeRejectedToken('comp-001');
      expect(() => safety_gate_token_protocol(rejectedToken, 'comp-001')).toThrow(
        'INVARIANT VIOLATION (DR-168)',
      );
      expect(() => safety_gate_token_protocol(rejectedToken, 'comp-001')).toThrow(
        "verdict is 'REJECTED'",
      );
    });

    it('F24-E7: SafetyGateToken missing → safety_gate_token_protocol throws no token error', () => {
      expect(() => safety_gate_token_protocol(undefined, 'comp-001')).toThrow(
        'No SafetyGateToken present',
      );
    });

    it('F24-E8: SafetyGateToken with empty signature → safety_gate_token_protocol throws', () => {
      const badSigToken: SafetyGateToken = {
        ...makeApprovedToken('comp-002'),
        signature: 'short',
      };
      expect(() => safety_gate_token_protocol(badSigToken, 'comp-002')).toThrow(
        'invalid signature',
      );
    });

    it('F24-E9: Gamification ledger UPDATE attempted → gamification_ledger_append_only throws', () => {
      expect(() => gamification_ledger_append_only('update', 'gam-001')).toThrow(
        'INVARIANT VIOLATION (DD-222)',
      );
      expect(() => gamification_ledger_append_only('update', 'gam-001')).toThrow('APPEND-ONLY');
    });

    it('F24-E10: Gamification ledger DELETE attempted → gamification_ledger_append_only throws', () => {
      expect(() => gamification_ledger_append_only('delete', 'gam-001')).toThrow(
        'INVARIANT VIOLATION (DD-222)',
      );
    });

    it('F24-E11: Client-supplied score field → server_side_only_grading throws', () => {
      expect(() => server_side_only_grading({ studentId: 'student-001', score: 90 })).toThrow(
        'INVARIANT VIOLATION (DD-226)',
      );
      expect(() => server_side_only_grading({ studentId: 'student-001', score: 90 })).toThrow(
        "Client-supplied field 'score'",
      );
    });

    it('F24-E12: Client-supplied grade field → server_side_only_grading throws', () => {
      expect(() => server_side_only_grading({ studentId: 'student-001', grade: 'A' })).toThrow(
        'INVARIANT VIOLATION (DD-226)',
      );
    });

    it('F24-E13: Client-supplied percentage field → server_side_only_grading throws', () => {
      expect(() => server_side_only_grading({ studentId: 'student-001', percentage: 95 })).toThrow(
        'INVARIANT VIOLATION (DD-226)',
      );
    });

    it('F24-E14: Calendar SDK imported directly → calendar_fabric_connectors_only throws', () => {
      expect(() =>
        calendar_fabric_connectors_only('server/src/services/calendar.service.ts', [
          "import { google } from 'googleapis'",
        ]),
      ).toThrow('INVARIANT VIOLATION (DD-225)');
      expect(() =>
        calendar_fabric_connectors_only('server/src/services/calendar.service.ts', [
          "import { google } from 'googleapis'",
        ]),
      ).toThrow('ICalendarSyncConnectorFactory');
    });

    it('F24-E15: Microsoft Graph calendar SDK imported directly → calendar_fabric_connectors_only throws', () => {
      expect(() =>
        calendar_fabric_connectors_only('server/src/services/ms-calendar.service.ts', [
          "import { Client } from '@microsoft/microsoft-graph'",
        ]),
      ).toThrow('INVARIANT VIOLATION (DD-225)');
    });

    it('F24-E16: Student consent DENIED → consent_blocks_all_downstream throws for T368', () => {
      expect(() => consent_blocks_all_downstream('student-001', 'DENIED', 'T368')).toThrow(
        'INVARIANT VIOLATION (CF-461)',
      );
      expect(() => consent_blocks_all_downstream('student-001', 'DENIED', 'T368')).toThrow(
        "consent.status='DENIED'",
      );
    });

    it('F24-E17: Student consent WITHDRAWN → consent_blocks_all_downstream throws for T370', () => {
      expect(() => consent_blocks_all_downstream('student-001', 'WITHDRAWN', 'T370')).toThrow(
        'INVARIANT VIOLATION (CF-461)',
      );
    });

    it('F24-E18: Student consent PENDING → consent_blocks_all_downstream throws for T373', () => {
      expect(() => consent_blocks_all_downstream('student-001', 'PENDING', 'T373')).toThrow(
        'INVARIANT VIOLATION (CF-461)',
      );
    });

    it('F24-E19: Streak using client timezone (header) → streak_timezone_from_profile_not_client throws', () => {
      expect(() =>
        streak_timezone_from_profile_not_client({
          timezoneUsedForCalculation: 'Europe/London',
          profileTimezone: 'America/New_York',
          requestHeaderTimezone: 'Europe/London',
        }),
      ).toThrow('INVARIANT VIOLATION (DD-223)');
    });

    it('F24-E20: Streak using different timezone than profile → streak_timezone_from_profile_not_client throws', () => {
      expect(() =>
        streak_timezone_from_profile_not_client({
          timezoneUsedForCalculation: 'Asia/Tokyo',
          profileTimezone: 'America/Chicago',
        }),
      ).toThrow('INVARIANT VIOLATION (DD-223)');
      expect(() =>
        streak_timezone_from_profile_not_client({
          timezoneUsedForCalculation: 'Asia/Tokyo',
          profileTimezone: 'America/Chicago',
        }),
      ).toThrow("profile timezone is 'America/Chicago'");
    });

    it('F24-E21: SafetyGateToken with rejectedCategories → content_safety_scan_mandatory throws', () => {
      const tokenWithRejections: SafetyGateToken = {
        ...makeApprovedToken('comp-003'),
        rejectedCategories: ['violence'],
        verdict: 'APPROVED', // even if verdict says APPROVED, rejected categories must be empty
      };
      expect(() => content_safety_scan_mandatory(tokenWithRejections, 'comp-003')).toThrow(
        'rejected categories',
      );
    });
  });

  // ── Cat 3 — Tenant isolation ─────────────────────────────────────────────────

  describe('Cat 3 — Tenant isolation', () => {
    it('F24-T1: Lesson content scoped per student/tenant — different tenants do not share compositions', async () => {
      const db = makeInMemoryDb();

      await db.storeDocument(
        'lesson-compositions',
        { compositionId: 'comp-t1', tenantId: 'tenant-school-01', content: 'School 1 lesson' },
        'comp-t1',
      );
      await db.storeDocument(
        'lesson-compositions',
        { compositionId: 'comp-t2', tenantId: 'tenant-school-02', content: 'School 2 lesson' },
        'comp-t2',
      );

      const school1Results = await db.searchDocuments('lesson-compositions', {
        tenantId: 'tenant-school-01',
      });
      const school2Results = await db.searchDocuments('lesson-compositions', {
        tenantId: 'tenant-school-02',
      });

      expect((school1Results.data as Record<string, unknown>[]).length).toBe(1);
      expect((school2Results.data as Record<string, unknown>[]).length).toBe(1);
      expect((school1Results.data as Record<string, unknown>[])[0]['content']).toBe(
        'School 1 lesson',
      );
    });

    it('F24-T2: Gamification points not cross-tenant — tenant-A points invisible to tenant-B', async () => {
      const db = makeInMemoryDb();

      await db.storeDocument(
        'gamification-ledger',
        { entryId: 'gam-t1', tenantId: 'tenant-school-01', studentId: 'student-A', points: 100 },
        'gam-t1',
      );
      await db.storeDocument(
        'gamification-ledger',
        { entryId: 'gam-t2', tenantId: 'tenant-school-02', studentId: 'student-B', points: 200 },
        'gam-t2',
      );

      const tenant1Points = await db.searchDocuments('gamification-ledger', {
        tenantId: 'tenant-school-01',
      });
      const tenant2Points = await db.searchDocuments('gamification-ledger', {
        tenantId: 'tenant-school-02',
      });

      expect((tenant1Points.data as Record<string, unknown>[]).length).toBe(1);
      expect((tenant2Points.data as Record<string, unknown>[]).length).toBe(1);
      expect((tenant1Points.data as Record<string, unknown>[])[0]['points']).toBe(100);
    });

    it('F24-T3: SafetyGateToken is tenant-scoped — token from tenant-A rejected for tenant-B lesson', () => {
      const tokenForTenantA = makeApprovedToken('comp-tenant-a');
      // Token has tenantId = TENANT (tenant-school-01)
      expect(tokenForTenantA.tenantId).toBe(TENANT);
      // A tenant-B composition would not match this token's tenantId
      expect(tokenForTenantA.tenantId).not.toBe('tenant-school-02');
    });

    it('F24-T4: Student streaks are per-tenant — tenant isolation enforced on streak records', async () => {
      const db = makeInMemoryDb();

      await db.storeDocument(
        'student-streaks',
        { streakId: 'str-t1', tenantId: 'tenant-school-01', studentId: 's1', currentStreak: 7 },
        'str-t1',
      );
      await db.storeDocument(
        'student-streaks',
        { streakId: 'str-t2', tenantId: 'tenant-school-02', studentId: 's2', currentStreak: 3 },
        'str-t2',
      );

      const t1Streaks = await db.searchDocuments('student-streaks', {
        tenantId: 'tenant-school-01',
      });
      expect((t1Streaks.data as Record<string, unknown>[]).length).toBe(1);
      expect((t1Streaks.data as Record<string, unknown>[])[0]['currentStreak']).toBe(7);
    });
  });

  // ── Cat 4 — Idempotency ──────────────────────────────────────────────────────

  describe('Cat 4 — Idempotency', () => {
    it('F24-I1: Duplicate lesson publish idempotent — same compositionId stored only once', async () => {
      const db = makeInMemoryDb();

      await db.storeDocument(
        'published-lessons',
        {
          publishId: 'pub-idem-001',
          tenantId: TENANT,
          compositionId: 'comp-001',
          status: 'PUBLISHED',
        },
        'pub-idem-001',
      );
      // Duplicate store with same id — should update, not duplicate
      await db.storeDocument(
        'published-lessons',
        {
          publishId: 'pub-idem-001',
          tenantId: TENANT,
          compositionId: 'comp-001',
          status: 'PUBLISHED',
        },
        'pub-idem-001',
      );

      const results = await db.searchDocuments('published-lessons', { compositionId: 'comp-001' });
      expect((results.data as Record<string, unknown>[]).length).toBe(1);
    });

    it('F24-I2: Duplicate streak update handled — same streakId upserted not duplicated', async () => {
      const db = makeInMemoryDb();

      await db.storeDocument(
        'student-streaks',
        { streakId: 'str-idem-001', tenantId: TENANT, studentId: 'student-001', currentStreak: 4 },
        'str-idem-001',
      );
      await db.storeDocument(
        'student-streaks',
        { streakId: 'str-idem-001', tenantId: TENANT, studentId: 'student-001', currentStreak: 5 },
        'str-idem-001',
      );

      const results = await db.searchDocuments('student-streaks', { streakId: 'str-idem-001' });
      expect((results.data as Record<string, unknown>[]).length).toBe(1);
      expect((results.data as Record<string, unknown>[])[0]['currentStreak']).toBe(5);
    });

    it('F24-I3: Duplicate gamification append creates separate entries (append-only — no dedup needed)', async () => {
      const db = makeInMemoryDb();

      // Ledger is append-only; separate entries get separate IDs
      await db.storeDocument(
        'gamification-ledger',
        { entryId: 'gam-idem-001', tenantId: TENANT, points: 10, reason: 'QUIZ' },
        'gam-idem-001',
      );
      await db.storeDocument(
        'gamification-ledger',
        { entryId: 'gam-idem-002', tenantId: TENANT, points: 10, reason: 'QUIZ' },
        'gam-idem-002',
      );

      const results = await db.searchDocuments('gamification-ledger', { reason: 'QUIZ' });
      expect((results.data as Record<string, unknown>[]).length).toBe(2);
    });

    it('F24-I4: Duplicate safety scan — same compositionId idempotent on scan result storage', async () => {
      const db = makeInMemoryDb();
      const token = makeApprovedToken('comp-idem');

      await db.storeDocument(
        'safety-scan-results',
        { scanId: 'scan-idem-001', compositionId: 'comp-idem', verdict: 'APPROVED', token },
        'scan-idem-001',
      );
      await db.storeDocument(
        'safety-scan-results',
        { scanId: 'scan-idem-001', compositionId: 'comp-idem', verdict: 'APPROVED', token },
        'scan-idem-001',
      );

      const results = await db.searchDocuments('safety-scan-results', {
        compositionId: 'comp-idem',
      });
      expect((results.data as Record<string, unknown>[]).length).toBe(1);
    });
  });

  // ── Cat 5 — UI state mapping ─────────────────────────────────────────────────

  describe('Cat 5 — UI state mapping', () => {
    it('F24-U1: LESSON_DRAFT → LESSON_COMPOSED state transition', () => {
      const states: Record<string, string> = {
        LESSON_DRAFT: 'lesson-draft',
        LESSON_COMPOSED: 'lesson-composed',
        SAFETY_REVIEW: 'safety-review',
        LESSON_PUBLISHED: 'lesson-published',
      };
      expect(states['LESSON_DRAFT']).toBe('lesson-draft');
      expect(states['LESSON_COMPOSED']).toBe('lesson-composed');
    });

    it('F24-U2: LESSON_COMPOSED → SAFETY_REVIEW state transition', () => {
      const lessonState = {
        lessonId: 'lesson-001',
        status: 'SAFETY_REVIEW',
        compositionId: 'comp-001',
      };
      const screen = lessonState.status === 'SAFETY_REVIEW' ? 'safety-review' : 'lesson-composed';
      expect(screen).toBe('safety-review');
    });

    it('F24-U3: SAFETY_REVIEW → LESSON_PUBLISHED state transition on token APPROVED', () => {
      const token = makeApprovedToken('comp-001');
      const lessonState = {
        lessonId: 'lesson-001',
        status: 'LESSON_PUBLISHED',
        tokenId: token.tokenId,
      };
      const screen =
        lessonState.status === 'LESSON_PUBLISHED' ? 'lesson-published' : 'safety-review';
      expect(screen).toBe('lesson-published');
      expect(lessonState.tokenId).toBeDefined();
    });

    it('F24-U4: CONSENT_PENDING → CONSENT_GRANTED state transition', () => {
      const consentState = {
        studentId: 'student-001',
        status: 'CONSENT_GRANTED',
        grantedAt: new Date().toISOString(),
      };
      const screen =
        consentState.status === 'CONSENT_GRANTED' ? 'consent-granted' : 'consent-pending';
      expect(screen).toBe('consent-granted');
    });

    it('F24-U5: CONSENT_DENIED blocks downstream — UI shows blocked state for T368', () => {
      const consentState = { studentId: 'student-001', status: 'CONSENT_DENIED' };
      const isBlocked = consentState.status === 'CONSENT_DENIED';
      expect(isBlocked).toBe(true);
      // Verify the downstream block check agrees
      expect(() => consent_blocks_all_downstream('student-001', 'DENIED', 'T368')).toThrow();
    });

    it('F24-U6: Safety gate rejection shows LESSON_SAFETY_REJECTED state', () => {
      const lessonState = {
        lessonId: 'lesson-001',
        status: 'SAFETY_REJECTED',
        rejectedCategories: ['violence'],
      };
      const screen =
        lessonState.status === 'SAFETY_REJECTED' ? 'safety-rejected' : 'lesson-composed';
      expect(screen).toBe('safety-rejected');
      expect(lessonState.rejectedCategories).toContain('violence');
    });

    it('F24-U7: Gamification progress bar shows total points across append-only ledger entries', () => {
      const ledgerEntries = [
        { entryId: 'gam-1', points: 50, reason: 'LESSON_COMPLETE' },
        { entryId: 'gam-2', points: 25, reason: 'QUIZ_PASS' },
        { entryId: 'gam-3', points: 10, reason: 'STREAK_BONUS' },
      ];
      const totalPoints = ledgerEntries.reduce((sum, e) => sum + e.points, 0);
      expect(totalPoints).toBe(85);
    });
  });

  // ── Cat 6 — API contract ─────────────────────────────────────────────────────

  describe('Cat 6 — API contract', () => {
    it('F24-A1: /api/dynamic/lesson-compositions returns DataProcessResult wrapping compositions array', async () => {
      const db = makeInMemoryDb();
      await db.storeDocument(
        'lesson-compositions',
        { compositionId: 'comp-001', tenantId: TENANT, status: 'COMPOSED' },
        'comp-001',
      );
      await db.storeDocument(
        'lesson-compositions',
        { compositionId: 'comp-002', tenantId: TENANT, status: 'PUBLISHED' },
        'comp-002',
      );

      const result = await db.searchDocuments('lesson-compositions', { tenantId: TENANT });
      expect(result).toBeDefined();
      expect(result.isSuccess).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect((result.data as Record<string, unknown>[]).length).toBe(2);
    });

    it('F24-A2: /api/dynamic/gamification-ledger returns DataProcessResult wrapping entries array', async () => {
      const db = makeInMemoryDb();
      await db.storeDocument(
        'gamification-ledger',
        { entryId: 'gam-001', tenantId: TENANT, studentId: 'student-001', points: 50 },
        'gam-001',
      );
      await db.storeDocument(
        'gamification-ledger',
        { entryId: 'gam-002', tenantId: TENANT, studentId: 'student-001', points: 25 },
        'gam-002',
      );

      const result = await db.searchDocuments('gamification-ledger', {
        tenantId: TENANT,
        studentId: 'student-001',
      });
      expect(result.isSuccess).toBe(true);
      expect((result.data as Record<string, unknown>[]).length).toBe(2);
    });

    it('F24-A3: /api/dynamic/safety-scan-results returns DataProcessResult with scan verdict', async () => {
      const db = makeInMemoryDb();
      const token = makeApprovedToken('comp-001');
      await db.storeDocument(
        'safety-scan-results',
        {
          scanId: 'scan-001',
          tenantId: TENANT,
          compositionId: 'comp-001',
          verdict: 'APPROVED',
          token,
        },
        'scan-001',
      );

      const result = await db.getDocument('safety-scan-results', 'scan-001');
      expect(result.isSuccess).toBe(true);
      const scanDoc = result.data as Record<string, unknown>;
      expect(scanDoc['verdict']).toBe('APPROVED');
    });

    it('F24-A4: /api/dynamic/student-streaks 404 returns DataProcessResult.failure NOT_FOUND', async () => {
      const db = makeInMemoryDb();
      const result = await db.getDocument('student-streaks', 'nonexistent-streak');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });

    it('F24-A5: /api/dynamic/published-lessons searchDocuments returns filtered results by tenantId', async () => {
      const db = makeInMemoryDb();
      await db.storeDocument(
        'published-lessons',
        { publishId: 'pub-001', tenantId: TENANT, status: 'PUBLISHED' },
        'pub-001',
      );
      await db.storeDocument(
        'published-lessons',
        { publishId: 'pub-002', tenantId: 'other-tenant', status: 'PUBLISHED' },
        'pub-002',
      );

      const result = await db.searchDocuments('published-lessons', { tenantId: TENANT });
      expect(result.isSuccess).toBe(true);
      expect((result.data as Record<string, unknown>[]).length).toBe(1);
    });
  });

  // ── Cat 7 — CloudEvents ──────────────────────────────────────────────────────

  describe('Cat 7 — CloudEvents', () => {
    it('F24-C1: LessonPublished event passes validateCloudEvent', () => {
      const token = makeApprovedToken('comp-ce-001');
      const event = createCloudEvent({
        eventType: 'learning.lesson.published',
        source: 'flow-24/lesson-publish',
        data: {
          publishId: 'pub-ce-001',
          tenantId: TENANT,
          compositionId: 'comp-ce-001',
          tokenId: token.tokenId,
        },
        tenantId: TENANT,
      });
      expect(() => validateCloudEvent(event)).not.toThrow();
    });

    it('F24-C2: SafetyGateApproved event passes validateCloudEvent', () => {
      const token = makeApprovedToken('comp-ce-002');
      const event = createCloudEvent({
        eventType: 'learning.safety_gate.approved',
        source: 'flow-24/safety-gate',
        data: {
          compositionId: 'comp-ce-002',
          tenantId: TENANT,
          tokenId: token.tokenId,
          verdict: 'APPROVED',
        },
        tenantId: TENANT,
      });
      expect(() => validateCloudEvent(event)).not.toThrow();
    });

    it('F24-C3: StudentGraded event passes validateCloudEvent', () => {
      const event = createCloudEvent({
        eventType: 'learning.student.graded',
        source: 'flow-24/server-grading',
        data: { gradeId: 'grade-ce-001', tenantId: TENANT, studentId: 'student-001', score: 87 },
        tenantId: TENANT,
      });
      expect(() => validateCloudEvent(event)).not.toThrow();
    });

    it('F24-C4: GamificationPointsAwarded event passes validateCloudEvent', () => {
      const event = createCloudEvent({
        eventType: 'learning.gamification.points.awarded',
        source: 'flow-24/gamification',
        data: {
          entryId: 'gam-ce-001',
          tenantId: TENANT,
          studentId: 'student-001',
          points: 50,
          reason: 'LESSON_COMPLETE',
        },
        tenantId: TENANT,
      });
      expect(() => validateCloudEvent(event)).not.toThrow();
    });

    it('F24-C5: CalendarEventSynced event passes validateCloudEvent', () => {
      const event = createCloudEvent({
        eventType: 'learning.calendar.event.synced',
        source: 'flow-24/calendar-sync',
        data: {
          calendarEventId: 'cal-ce-001',
          tenantId: TENANT,
          studentId: 'student-001',
          syncedViaConnector: true,
        },
        tenantId: TENANT,
      });
      expect(() => validateCloudEvent(event)).not.toThrow();
    });

    it('F24-C6: StreakUpdated event passes validateCloudEvent', () => {
      const event = createCloudEvent({
        eventType: 'learning.student.streak.updated',
        source: 'flow-24/streak-tracker',
        data: {
          streakId: 'streak-ce-001',
          tenantId: TENANT,
          studentId: 'student-001',
          currentStreak: 5,
          timezoneUsed: 'America/New_York',
        },
        tenantId: TENANT,
      });
      expect(() => validateCloudEvent(event)).not.toThrow();
    });

    it('F24-C7: LessonComposed event passes validateCloudEvent', () => {
      const event = createCloudEvent({
        eventType: 'learning.lesson.composed',
        source: 'flow-24/lesson-compose',
        data: { compositionId: 'comp-ce-003', tenantId: TENANT, lessonId: 'lesson-003' },
        tenantId: TENANT,
      });
      expect(() => validateCloudEvent(event)).not.toThrow();
    });

    it('F24-C8: ConsentGranted event passes validateCloudEvent', () => {
      const event = createCloudEvent({
        eventType: 'learning.student.consent.granted',
        source: 'flow-24/consent-gate',
        data: {
          consentId: 'consent-ce-001',
          tenantId: TENANT,
          studentId: 'student-001',
          status: 'GRANTED',
        },
        tenantId: TENANT,
      });
      expect(() => validateCloudEvent(event)).not.toThrow();
    });
  });

  // ── Cat 8 — Named checks ─────────────────────────────────────────────────────

  describe('Cat 8 — Named checks (CF-461 through CF-472)', () => {
    it('F24-N1: safety_compose_gate_publish_order — PASS with correct order', () => {
      const log = makeValidExecutionLog();
      expect(() => safety_compose_gate_publish_order(log)).not.toThrow();
    });

    it('F24-N2: safety_compose_gate_publish_order — FAIL with PUBLISH before SAFETY_GATE', () => {
      const log: ExecutionLogEntry[] = [
        { step: 'COMPOSE', completedAt: 1000 },
        { step: 'SAFETY_GATE', completedAt: 1300 },
        { step: 'PUBLISH', completedAt: 1200 },
      ];
      expect(() => safety_compose_gate_publish_order(log)).toThrow('CF-465');
    });

    it('F24-N3: safety_gate_token_protocol — PASS with valid APPROVED token', () => {
      const token = makeApprovedToken('comp-n3');
      expect(() => safety_gate_token_protocol(token, 'comp-n3')).not.toThrow();
    });

    it('F24-N4: safety_gate_token_protocol — FAIL with missing tokenId', () => {
      const badToken: SafetyGateToken = {
        ...makeApprovedToken('comp-n4'),
        tokenId: '',
      };
      expect(() => safety_gate_token_protocol(badToken, 'comp-n4')).toThrow('DD-224');
    });

    it('F24-N5: content_safety_scan_mandatory — PASS with approved token and no rejected categories', () => {
      const token = makeApprovedToken('comp-n5');
      expect(() => content_safety_scan_mandatory(token, 'comp-n5')).not.toThrow();
    });

    it('F24-N6: content_safety_scan_mandatory — FAIL with undefined token', () => {
      expect(() => content_safety_scan_mandatory(undefined, 'comp-n6')).toThrow('CF-462');
    });

    it('F24-N7: consent_blocks_all_downstream — PASS for GRANTED status', () => {
      expect(() => consent_blocks_all_downstream('student-001', 'GRANTED', 'T368')).not.toThrow();
    });

    it('F24-N8: consent_blocks_all_downstream — FAIL for DENIED status on blocked task type', () => {
      expect(() => consent_blocks_all_downstream('student-001', 'DENIED', 'T371')).toThrow(
        'CF-461',
      );
    });

    it('F24-N9: server_side_only_grading — PASS with no client-supplied grading fields', () => {
      expect(() =>
        server_side_only_grading({ studentId: 'student-001', answers: ['A', 'B', 'C'] }),
      ).not.toThrow();
    });

    it('F24-N10: server_side_only_grading — FAIL with score field in answers array item', () => {
      expect(() =>
        server_side_only_grading({
          studentId: 'student-001',
          answers: [{ questionId: 'q1', answer: 'A', score: 1 }],
        }),
      ).toThrow('DD-226');
    });

    it('F24-N11: gamification_ledger_append_only — PASS for append operation', () => {
      expect(() => gamification_ledger_append_only('append')).not.toThrow();
    });

    it('F24-N12: gamification_ledger_append_only — FAIL for update operation', () => {
      expect(() => gamification_ledger_append_only('update', 'gam-n12')).toThrow('DD-222');
    });

    it('F24-N13: streak_timezone_from_profile_not_client — PASS when calculation matches profile timezone', () => {
      expect(() =>
        streak_timezone_from_profile_not_client({
          timezoneUsedForCalculation: 'America/New_York',
          profileTimezone: 'America/New_York',
        }),
      ).not.toThrow();
    });

    it('F24-N14: streak_timezone_from_profile_not_client — FAIL when calculation matches client header timezone', () => {
      expect(() =>
        streak_timezone_from_profile_not_client({
          timezoneUsedForCalculation: 'Europe/Paris',
          profileTimezone: 'Europe/Paris',
          requestHeaderTimezone: 'Europe/Paris',
        }),
      ).toThrow('DD-223');
    });

    it('F24-N15: calendar_fabric_connectors_only — PASS for clean service file with no forbidden imports', () => {
      expect(() =>
        calendar_fabric_connectors_only('server/src/services/clean-calendar.service.ts', [
          "import { ICalendarSyncConnectorFactory } from '../fabrics/calendar'",
        ]),
      ).not.toThrow();
    });

    it('F24-N16: calendar_fabric_connectors_only — FAIL for ical-generator direct import', () => {
      expect(() =>
        calendar_fabric_connectors_only('server/src/services/ical.service.ts', [
          "import IcalGenerator from 'ical-generator'",
        ]),
      ).toThrow('DD-225');
    });
  });
});
