/**
 * Flow07SocialFeedRagSeed — RAG patterns for FLOW-07 Friend Request & Social Feed.
 *
 * Key patterns:
 *   - privacy-gatekeeper-inline-invocation (T81 INLINE_ONLY pattern)
 *   - bidirectional-atomic-graph-write (T75 atomicity)
 *   - two-phase-privacy-gate (T76 + T78 independent T81 invocations)
 *   - zero-score-passthrough (T77 score=0 is valid)
 *   - full-recompute-pattern (T80 never delta)
 *
 * DNA-3: All methods return DataProcessResult.
 * Rule 1: No SDK imports.
 */
import { Injectable } from '@nestjs/common';
import { FlowRagSeedBase } from './flow-rag-seed.base';
import { DataProcessResult } from '../kernel/data-process-result';

@Injectable()
export class Flow07SocialFeedRagSeed extends FlowRagSeedBase {
  readonly domainId = 'flow-07-friend-request-social-feed';

  async indexPatterns(): Promise<DataProcessResult<number>> {
    const patterns = [
      // ── privacy-gatekeeper-inline-invocation (T81 INLINE_ONLY) ──────────────

      {
        patternId: 'privacy-gatekeeper-inline-invocation',
        name: 'PRIVACY_GATEKEEPER_INLINE_INVOCATION',
        namespace: 'social-feed',
        pattern: 'inline-only-service-injection',
        title: 'PrivacyGatekeeper — Inline-Only Service (T81)',
        version: '1.0.0',
        description:
          'T81 PrivacyGatekeeper is INLINE_ONLY — pure @Injectable() service with NO @EventPattern or @MessagePattern. ' +
          'It is injected directly into T73, T76, T78 and called synchronously. ' +
          'The engine has been trained on 33 queue-driven examples. T81 fights all of them. ' +
          'If the engine generates @EventPattern on T81 → score-0. ' +
          'If T73/T76/T78 call T81 via queue → score-0.',
        useCase:
          'Privacy enforcement gate called synchronously within the request path of social feed services',
        dnaCompliance:
          'DNA-1 (Record<string,unknown> for privacy settings) — DNA-3 (DataProcessResult return)',
        codeExample:
          '@Injectable()\n' +
          'export class PrivacyGatekeeper {\n' +
          '  async check(userId: string, settings: Record<string, unknown>): Promise<DataProcessResult<boolean>> {\n' +
          '    // reads from DATABASE FABRIC via AsyncLocalStorage tenant scope\n' +
          '    return DataProcessResult.success(true);\n' +
          '  }\n' +
          '}',
        negativeExample:
          '@EventPattern("privacy.check.requested")\n' +
          'async handlePrivacyCheck(payload: Record<string, unknown>) { ... }',
        negativeReason:
          'T81 has no event entry point — it is injected synchronously, not consumed from a queue.',
        factories: [
          {
            factoryId: 'F241',
            interfaceName: 'IPrivacySettingsService',
            role: 'Privacy settings lookup from DATABASE FABRIC',
          },
          {
            factoryId: 'F243',
            interfaceName: 'IConsentService',
            role: 'Consent state verification',
          },
        ],
        taskTypesTargeted: ['T73', 'T76', 'T78', 'T81'],
        antiPatterns: [
          '@EventPattern on T81',
          '@MessagePattern on T81',
          'Queue-driven call to T81 from T73/T76/T78',
          'HTTP call to T81 (violates Rule 11)',
        ],
        tags: ['T81', 'T73', 'T76', 'T78', 'inline-only', 'privacy', 'INLINE_ONLY', 'CF-812'],
      },

      // ── bidirectional-atomic-graph-write (T75) ───────────────────────────────

      {
        patternId: 'bidirectional-atomic-graph-write',
        name: 'BIDIRECTIONAL_ATOMIC_GRAPH_WRITE',
        namespace: 'social-feed',
        pattern: 'bidirectional-atomic-graph-write',
        title: 'Bidirectional Atomic Graph Write (T75)',
        version: '1.0.0',
        description:
          'T75 ConnectionGraphWriter writes BOTH A→B and B→A adjacency edges in ONE ORM transaction. ' +
          'connectionId = hash(sorted([userIdA, userIdB]) + tenantId) — direction-independent. ' +
          'Partial write (A→B only, crash before B→A) → social graph corruption → score-0. ' +
          'The hash function on the sorted pair ensures A→B and B→A share the same connectionId.',
        useCase:
          'Social connection graph with direction-independent deduplication and atomic bidirectional writes',
        dnaCompliance: 'DNA-3 (DataProcessResult) — DNA-5 (tenantId in AsyncLocalStorage)',
        codeExample:
          'const connectionId = hash(sorted([userIdA, userIdB]).join(":") + ":" + tenantId);\n' +
          'await orm.transaction(async (em) => {\n' +
          '  await em.upsert("graph_edges", { connectionId, from: userIdA, to: userIdB });\n' +
          '  await em.upsert("graph_edges", { connectionId, from: userIdB, to: userIdA });\n' +
          '});',
        negativeExample:
          'await db.storeDocument("graph_edges", { from: userIdA, to: userIdB }, uuid());\n' +
          '// crash here → B→A never written → graph corruption',
        negativeReason:
          'Two separate storeDocument() calls are not atomic — a crash between them corrupts the graph.',
        factories: [
          {
            factoryId: 'F238',
            interfaceName: 'IConnectionGraphService',
            role: 'Graph adjacency storage with transaction support',
          },
        ],
        taskTypesTargeted: ['T75'],
        antiPatterns: [
          'Two separate storeDocument() calls for A→B and B→A',
          'UUID-based connectionId (causes duplicates if direction varies)',
          'Delta-based graph updates',
        ],
        tags: ['T75', 'bidirectional', 'atomic', 'graph', 'connectionId', 'CF-806'],
      },

      // ── two-phase-privacy-gate (T76 + T78) ──────────────────────────────────

      {
        patternId: 'two-phase-privacy-gate',
        name: 'TWO_PHASE_PRIVACY_GATE',
        namespace: 'social-feed',
        pattern: 'two-phase-gate',
        title: 'Two-Phase Privacy Gate (T76 generation + T78 delivery)',
        version: '1.0.0',
        description:
          'T76 invokes T81 before emitting FeedItemGenerated (Phase 1: generation). ' +
          'T78 invokes T81 AGAIN independently before emitting FeedDelivered (Phase 2: delivery). ' +
          'Privacy settings can change between generation and delivery. ' +
          'T78 skipping T81 because "T76 already checked" = BUILD_FAILURE.',
        useCase:
          'Feed delivery with independent privacy enforcement at both generation and delivery stages',
        dnaCompliance: 'DNA-3 (DataProcessResult) — DNA-8 (storeDocument before enqueue)',
        codeExample:
          '// T76 FeedItemGenerator\n' +
          'const privacyResult = await this.privacyGatekeeper.check(...);\n' +
          'if (!privacyResult.data.allowed) return DataProcessResult.success({ skipped: true });\n' +
          'await this.db.storeDocument("feed_items", item, itemId);\n' +
          'await this.queue.enqueue("feed.item.generated", { itemId });\n\n' +
          '// T78 FeedDeliveryOrchestrator — MUST check T81 independently\n' +
          'const deliveryPrivacy = await this.privacyGatekeeper.check(...);\n' +
          'if (!deliveryPrivacy.data.allowed) return DataProcessResult.success({ suppressed: true });',
        negativeExample:
          '// T78 WRONG — skipping T81 because T76 already checked\n' +
          'if (item.privacyCheckPassedAtGeneration) {\n' +
          '  await this.queue.enqueue("feed.delivered", { itemId });\n' +
          '}',
        negativeReason:
          'Privacy settings change between generation and delivery. T78 must re-check independently.',
        factories: [],
        taskTypesTargeted: ['T76', 'T78'],
        antiPatterns: [
          'Caching T76 privacy result and using it in T78',
          'Skipping T81 in T78 with "already checked" logic',
          'Single-phase privacy (only at generation)',
        ],
        tags: ['T76', 'T78', 'T81', 'two-phase', 'privacy', 'CF-808'],
      },

      // ── zero-score-passthrough (T77) ─────────────────────────────────────────

      {
        patternId: 'zero-score-passthrough',
        name: 'ZERO_SCORE_PASSTHROUGH',
        namespace: 'social-feed',
        pattern: 'score-zero-valid',
        title: 'Score=0 Passthrough Pattern (T77)',
        version: '1.0.0',
        description:
          'T77 FeedScorer assigns scores for personalization. score=0 means lowest relevance — item STILL passes through. ' +
          'T78 decides what to do. T77 MUST NOT filter items on score. ' +
          'This is architecturally novel: every prior scoring pattern drops or defers items below threshold.',
        useCase:
          'Feed item scoring where zero score is valid lowest-relevance signal (not a drop condition)',
        dnaCompliance: 'DNA-3 (DataProcessResult)',
        codeExample:
          'const score = await this.scorer.compute(item);\n' +
          '// score can be 0 — item passes through regardless\n' +
          'return DataProcessResult.success({ item, score });\n' +
          '// T78 decides delivery based on score',
        negativeExample: 'if (score <= 0) return; // WRONG — drops zero-score items',
        negativeReason:
          'score=0 is lowest personalization relevance, not a drop condition. T77 is not a gate.',
        factories: [
          {
            factoryId: 'F240',
            interfaceName: 'IFeedScoringService',
            role: 'Personalization score computation',
          },
        ],
        taskTypesTargeted: ['T77'],
        antiPatterns: [
          'Filtering out score=0 items in T77',
          'Deferring score=0 items',
          'Hardcoded minimum score threshold',
        ],
        tags: ['T77', 'score-zero', 'passthrough', 'feed-scoring', 'CF-807'],
      },

      // ── full-recompute-pattern (T80) ──────────────────────────────────────────

      {
        patternId: 'full-recompute-pattern',
        name: 'FULL_RECOMPUTE_PATTERN',
        namespace: 'social-feed',
        pattern: 'full-recompute-never-delta',
        title: 'Full Recompute from Graph (T80)',
        version: '1.0.0',
        description:
          'T80 MutualConnectionCounter counts mutual connections by reading the full connection graph. ' +
          'Delta counting (++/--) drifts under retries. ' +
          'T80 must read from graph and count from scratch on EVERY invocation. ' +
          'Idempotent by design — same inputs always produce same count.',
        useCase:
          'Mutual connection count that is idempotent and drift-free under message retry conditions',
        dnaCompliance: 'DNA-3 (DataProcessResult) — DNA-8 (storeDocument before enqueue)',
        codeExample:
          'const connectionsA = await this.connectionGraph.getConnections(userIdA);\n' +
          'const connectionsB = await this.connectionGraph.getConnections(userIdB);\n' +
          'const mutuals = connectionsA.filter(id => connectionsB.includes(id));\n' +
          'return DataProcessResult.success({ mutualCount: mutuals.length });',
        negativeExample: 'await this.db.increment("mutual_counts", userIdA, 1); // WRONG — delta',
        negativeReason:
          'Delta increments drift under message retries. Full recompute is always accurate.',
        factories: [
          {
            factoryId: 'F238',
            interfaceName: 'IConnectionGraphService',
            role: 'Graph read for full recompute',
          },
        ],
        taskTypesTargeted: ['T80'],
        antiPatterns: [
          'mutualCount++ or mutualCount--',
          'Increment-based counter updates',
          'Cached mutual count without recompute',
        ],
        tags: ['T80', 'full-recompute', 'idempotent', 'mutual-count', 'CF-811'],
      },
    ];

    let count = 0;
    for (const pattern of patterns) {
      const result = await this.upsertPattern(pattern);
      if (result.isSuccess) count++;
    }
    return DataProcessResult.success(count);
  }

  async indexBfaRules(): Promise<DataProcessResult<number>> {
    const rules = [
      {
        patternId: 'bfa-cf-803-friend-request-tenant-scope',
        ruleId: 'CF-803',
        flowId: 'FLOW-07',
        title: 'Friend request data must be scoped to tenantId',
        description:
          'All friend request records include tenantId from AsyncLocalStorage. Cross-tenant friend requests are forbidden.',
        violationClass: 'BUILD_FAILURE',
        tags: ['CF-803', 'FLOW-07', 'tenant-isolation'],
      },
      {
        patternId: 'bfa-cf-806-bidirectional-atomic',
        ruleId: 'CF-806',
        flowId: 'FLOW-07',
        title: 'ConnectionGraphWriter must write both edges atomically',
        description:
          'T75 must write A→B and B→A in one ORM transaction. Partial write = graph corruption = CF-806 violation.',
        violationClass: 'BUILD_FAILURE',
        tags: ['CF-806', 'FLOW-07', 'atomic-write'],
      },
      {
        patternId: 'bfa-cf-812-inline-only-t81',
        ruleId: 'CF-812',
        flowId: 'FLOW-07',
        title: 'T81 PrivacyGatekeeper must be INLINE_ONLY (no queue decorators)',
        description:
          'T81 is @Injectable() only. No @EventPattern. No @MessagePattern. Called synchronously via DI.',
        violationClass: 'BUILD_FAILURE',
        tags: ['CF-812', 'FLOW-07', 'inline-only', 'T81'],
      },
    ];

    let count = 0;
    for (const rule of rules) {
      const result = await this.upsertPattern(rule);
      if (result.isSuccess) count++;
    }
    return DataProcessResult.success(count);
  }

  async indexDesignRecords(): Promise<DataProcessResult<number>> {
    const records = [
      {
        patternId: 'dd-flow07-001-privacy-two-phase',
        ddRef: 'DD-F07-001',
        flowId: 'FLOW-07',
        title: 'Two-Phase Privacy Enforcement',
        description:
          'Privacy enforcement runs at generation (T76) AND delivery (T78) independently. ' +
          'This is required because privacy settings can change between the two phases. ' +
          'Both phases call T81 PrivacyGatekeeper via synchronous injection.',
        tags: ['FLOW-07', 'privacy', 'two-phase', 'T76', 'T78', 'T81'],
      },
    ];

    let count = 0;
    for (const record of records) {
      const result = await this.upsertPattern(record);
      if (result.isSuccess) count++;
    }
    return DataProcessResult.success(count);
  }
}
