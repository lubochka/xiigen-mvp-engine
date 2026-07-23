/**
 * topology-fixtures.ts
 * Per-flow topology fixture data for TVQ Playwright tests.
 *
 * TWO MODES:
 *   1. LEGACY:  FLOW_FIXTURES[flowId] → TopologyFixture (n1..n8 cycle mock)
 *   2. REAL:    loadRealTopology(slug) → TopologyContract (adapted from
 *               contracts/topologies/{slug}.topology.json)
 *
 * Track B REPLACE migrates per-flow specs from LEGACY → REAL.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── REAL topology contract (matches TopologyViewer.TopologyContract) ──
export interface RealTopologyNode {
  id:          string;
  name:        string;
  type:        string;     // viewer recognizes VALIDATION|ANALYSIS|GOVERNANCE|EMIT — others fall back
  description: string;
}
export interface RealTopologyEdge {
  from:       string;
  to:         string;
  condition?: string;
  type?:      'terminal' | 'terminal-success' | string;
}
export interface RealTopologyContract {
  flowId:       string;
  topologyId?:  string;
  version:      string;
  description?: string;
  nodes:        RealTopologyNode[];
  edges:        RealTopologyEdge[];
}

/**
 * loadRealTopology(slug)
 *
 * Reads contracts/topologies/{slug}.topology.json (or per-flow service-local
 * topology) and adapts it to the TopologyViewer contract:
 *   - archetype  → type (uppercased)
 *   - entry      → description
 *   - to:null    → filtered (viewer drops edges to unknown nodes anyway,
 *                  so we strip them at fixture time for cleaner mocks)
 *
 * Throws if the file is missing — caller must pre-check or wrap in test.skip.
 */
export function loadRealTopology(
  slug: string,
  opts?: { contractsRoot?: string },
): RealTopologyContract {
  const contractsRoot = opts?.contractsRoot
    ?? path.resolve(__dirname, '..', '..', '..', 'contracts', 'topologies');
  const file = path.join(contractsRoot, `${slug}.topology.json`);
  const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;

  const nodesRaw = raw['nodes'] ?? [];
  const rawNodes: Array<Record<string, unknown>> = Array.isArray(nodesRaw)
    ? (nodesRaw as Array<Record<string, unknown>>)
    : Object.entries(nodesRaw as Record<string, Record<string, unknown>>).map(
        ([id, props]) => ({ id, ...(props ?? {}) }),
      );
  const rawEdges = (raw['edges'] ?? []) as Array<Record<string, unknown>>;

  const nodes: RealTopologyNode[] = rawNodes.map(n => ({
    id:          String(n['id'] ?? n['taskTypeId'] ?? ''),
    name:        String(n['name'] ?? n['id'] ?? ''),
    type:        String(n['type'] ?? n['archetype'] ?? 'PROCESSING').toUpperCase(),
    description: String(n['description'] ?? n['entry'] ?? ''),
  }));

  const edges: RealTopologyEdge[] = rawEdges
    .filter(e => e['to'] !== null && e['to'] !== undefined)
    .map(e => {
      const condition = (e['condition'] as string | undefined) ?? (e['event'] as string | undefined);
      const isTerminal = typeof condition === 'string' && /terminal/i.test(condition);
      return {
        from:      String(e['from']),
        to:        String(e['to']),
        condition,
        type:      (e['type'] as string | undefined) ?? (isTerminal ? 'terminal' : undefined),
      };
    });

  return {
    flowId:      String(raw['flowId'] ?? ''),
    topologyId:  slug,
    version:     String(raw['version'] ?? '1.0'),
    description: typeof raw['description'] === 'string' ? raw['description'] as string : undefined,
    nodes,
    edges,
  };
}

/** Count of edges in the source file with `to: null` (terminal markers). */
export function countTerminalMarkers(slug: string, opts?: { contractsRoot?: string }): number {
  const contractsRoot = opts?.contractsRoot
    ?? path.resolve(__dirname, '..', '..', '..', 'contracts', 'topologies');
  const file = path.join(contractsRoot, `${slug}.topology.json`);
  const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
  const rawEdges = (raw['edges'] ?? []) as Array<Record<string, unknown>>;
  return rawEdges.filter(e => e['to'] === null).length;
}

// ── LEGACY fixture (n1..n8 cycle mock) — retained for unmigrated specs ──
export interface TopologyFixtureNode {
  id:          string;
  type:        string;
  description: string;
}
export interface TopologyFixtureEdge {
  from:       string;
  to:         string;
  condition?: string;
}
export interface TopologyFixture {
  flowId:         string;
  taskTypeId:     string;
  name:           string;
  archetype:      string;
  nodeCount:      number; // always 8 for standard fixtures
  nodes:          TopologyFixtureNode[];
  edges:          TopologyFixtureEdge[];
  scoreThreshold: number;
  maxCycles:      number;
  seededAt:       string;
}

// Standard 8-node n1-n8 pipeline used by all fixture mocks
export function makeStandardFixture(
  flowId: string,
  taskTypeId: string,
  name: string,
  archetype: string,
  n4Description: string,
  n8Description: string,
): TopologyFixture {
  return {
    flowId, taskTypeId, name, archetype,
    nodeCount: 8,
    seededAt: '2026-04-12T00:00:00Z',
    scoreThreshold: 0.85,
    maxCycles: 3,
    nodes: [
      { id: 'n1', type: 'validate',     description: 'Iron rule validation + DNA compliance check' },
      { id: 'n2', type: 'rag-retrieve', description: `Retrieve ${archetype} arch pattern for ${taskTypeId}` },
      { id: 'n3', type: 'decompose',    description: 'Break task into implementation sub-steps' },
      { id: 'n4', type: 'ai-generate',  description: n4Description },
      { id: 'n5', type: 'validate',     description: `Named check validation for ${taskTypeId}` },
      { id: 'n6', type: 'score',        description: 'Score generated code 0-100 against iron rules' },
      { id: 'n7', type: 'route',        description: 'Route: score >= 85 → n8 promote, score < 85 → n3 iterate' },
      { id: 'n8', type: 'feedback',     description: n8Description },
    ],
    edges: [
      { from: 'n1', to: 'n2' },
      { from: 'n2', to: 'n3' },
      { from: 'n3', to: 'n4' },
      { from: 'n4', to: 'n5' },
      { from: 'n5', to: 'n6' },
      { from: 'n6', to: 'n7' },
      { from: 'n7', to: 'n8', condition: 'score >= 0.85' },
      { from: 'n7', to: 'n3', condition: 'score < 0.85 AND cycles_remaining > 0' },
    ],
  };
}

export const FLOW_FIXTURES: Record<string, TopologyFixture> = {
  'FLOW-01': makeStandardFixture('FLOW-01', 'T47', 'flow-01-user-registration-initiator',
    'ROUTING',
    'Generate sso-and-email-auth.service.ts — dual-path routing: email or OAuth. Idempotent by email.',
    'chosen=idempotent-email-dedup, rejected=duplicate-registration. curriculumTier=1.'),

  'FLOW-02': makeStandardFixture('FLOW-02', 'T50', 'flow-02-profile-enricher',
    'DATA_PIPELINE',
    'Generate profile-enricher.service.ts — dual-record write: PRIVATE full profile + GLOBAL 4-field matching record. Both required.',
    'chosen=dual-write-private-and-global, rejected=private-only-write. curriculumTier=1.'),

  'FLOW-03': makeStandardFixture('FLOW-03', 'T59', 'flow-03-event-creation-orchestrator',
    'ORCHESTRATION',
    'Generate event-creation-orchestrator.service.ts — EventCreated stored before outbox enqueue (DNA-8). Idempotent by (organizerId, title, startsAt).',
    'chosen=store-before-enqueue, rejected=enqueue-then-store. curriculumTier=1.'),

  'FLOW-04': makeStandardFixture('FLOW-04', 'T63', 'flow-04-rsvp-orchestrator',
    'ORCHESTRATION',
    'Generate rsvp-orchestrator.service.ts — capacity decrement + RSVP create in ONE atomic op. Idempotent by (attendeeId, eventId).',
    'chosen=atomic-decrement-create, rejected=separate-check-decrement-create. curriculumTier=1.'),

  'FLOW-05': makeStandardFixture('FLOW-05', 'T83-T84-T85', 'flow-05-completion-points-ledger',
    'DATA_PIPELINE',
    'Generate points-calculator.service.ts — earnedPoints computed server-side from answers[] + timeTaken. Never reads client-submitted earnedPoints.',
    'chosen=server-side-calculation, rejected=client-submitted-points. curriculumTier=1.'),

  'FLOW-06': makeStandardFixture('FLOW-06', 'T99-T100', 'flow-06-membership-tier',
    'ROUTING',
    'Generate membership-tier-assigner.service.ts — tier assigned from xiigen-subscriptions only. requestedTier field absent from input shape.',
    'chosen=tier-from-subscriptions-only, rejected=tier-from-request-payload. curriculumTier=1.'),

  'FLOW-07': makeStandardFixture('FLOW-07', 'T73-T74', 'flow-07-friend-request-path',
    'ORCHESTRATION',
    'Generate friend-request-processor.service.ts — T81 PrivacyGatekeeper called synchronously BEFORE any write. INLINE_ONLY injection.',
    'chosen=inline-privacy-before-write, rejected=queue-event-for-privacy-check. curriculumTier=1.'),

  'FLOW-08': makeStandardFixture('FLOW-08', 'T83', 'flow-08-listing-publisher',
    'ROUTING',
    'Generate listing-publisher.service.ts — audit outbox write ABSOLUTELY FIRST before moderation, price check, everything else.',
    'chosen=audit-first-then-all, rejected=moderation-before-audit. curriculumTier=1.'),

  'FLOW-09': makeStandardFixture('FLOW-09', 'T99-T101', 'flow-09-ticket-purchase-core',
    'TRANSACTION',
    'Generate ticket-purchase-orchestrator.service.ts — seat TTL hold BEFORE payment capture. Double-booking race closed at T99.',
    'chosen=seat-hold-before-payment, rejected=payment-before-seat-hold. curriculumTier=2.'),

  'FLOW-10': makeStandardFixture('FLOW-10', 'T169', 'reviews-reputation-review-submission-gateway',
    'TRANSACTION',
    'Generate review-submission-gateway.service.ts — eligibility FIRST (order=1), rating validation (order=2), SETNX (order=3). reviewId = SHA-256 hash(tenantId+reviewerId+targetEntityId+targetEntityType) server-derived. Inverts FLOW-08 T79 audit-first pattern.',
    'chosen=eligibility-before-audit, rejected=audit-first-then-eligibility (FLOW-08 T79 pattern). curriculumTier=2.'),

  'FLOW-11': makeStandardFixture('FLOW-11', 'T189', 'schema-registry-dag-registration-gateway',
    'TRANSACTION',
    'Generate schema-registration-gateway.service.ts — tenantId from ALS, SETNX at order 2, T190 classifyChange() at order 3, T191 cycleCheck() at order 4. BREAKING→SchemaApprovalRequired, ADDITIVE→SchemaQueued. DNA-8: storeDocument BEFORE enqueue. THREE-STATE DFS for T191. OCC publish gate for T194.',
    'chosen=breaking-routes-to-approval+additive-fast-path+occ-guard, rejected=all-schemas-through-approval+store-without-occ. curriculumTier=2.'),

  'FLOW-14': makeStandardFixture('FLOW-14', 'T213', 'etl-data-integration-connector-registration',
    'provisioning',
    'Generate ConnectorRegistrationHandler — F430 rate limit at ORDER 1, F427 vault credentials at ORDER 2, idempotency at ORDER 3, storeDocument BEFORE enqueue (DNA-8). CF-211: WebhookIngestionHandler uses crypto.timingSafeEqual() NEVER string ===. CF-192: raw zone append-only, no updateDocument. CF-193: cursor validateMonotonic() before commit. DR-62: SCD-2 close_old+open_new only, no updateDocument. DR-63: PII gate at ORDER 1 blocks mart write. DR-64: reverse ETL via queue_fabric ONLY, no direct HTTP.',
    'chosen=CF-211-timingSafeEqual+CF-192-append-only+DR-62-no-updateDocument+DR-63-pii-order-1+DR-64-queue-fabric+DNA-8-store-before-enqueue, rejected=string-equality-hmac OR updateDocument-on-raw OR pii-gate-skipped OR direct-HTTP-reverse-ETL OR enqueue-before-store. curriculumTier=2.'),

  'FLOW-15': makeStandardFixture('FLOW-15', 'T605', 'saas-multi-tenancy-tenant-provisioning',
    'ORCHESTRATION',
    'Generate TenantProvisioningOrchestrator — SETNX(hash(operatorId+tenantSlug)) at ORDER 1, storeDocument(tenant, PROVISIONING) at ORDER 2, bulkSeedFreedomConfig synchronous blocking at ORDER 3, updateDocument(ACTIVE) at ORDER 4, storeDocument(audit) BEFORE enqueue(TenantProvisioned) DNA-8 at ORDER 5-6. CF-15-1: atomic bootstrap. CF-15-2: MACHINE_LOCKED_KEYS compile-time constant at ORDER 1, storeDocumentWithOCC. CF-15-3: Redis MULTI/EXEC for quotas, suspend-not-delete, cascadeToSubscriptions:true. CF-15-4: tenantId from ALS or internal hash only.',
    'chosen=SETNX-idempotency+synchronous-config-seed+MACHINE_LOCKED_KEYS-compile-time+Redis-MULTI-EXEC+suspend-not-delete+cascade-always+DNA-8-audit-before-emit, rejected=fire-and-forget-seed OR runtime-locked-key-lookup OR individual-SET-loop OR deleteDocument-on-suspend OR missing-cascade. curriculumTier=1.'),

  'FLOW-16': makeStandardFixture('FLOW-16', 'T609', 'marketplace-payments-checkout-gateway',
    'VALIDATION',
    'Generate marketplace-checkout-gateway.service.ts (T609): BOLA ORDER 1 cart.buyerTenantId === ALS.tenantId; SETNX cart lock ORDER 2 with FREEDOM checkout_lock_ttl_ms; OCC inventory reservation ORDER 3-4; storeDocument(audit) BEFORE CheckoutReserved (DNA-8). T610: SETNX(hash(tenantId+cartId+totalAmountCents)) unconditional return; platformFeeBps from FREEDOM; PII scrub; append-only nonRepudiationAudit hash chain; escrow before MarketplaceOrderConfirmed. T611: LIFO [REFUND_PAYMENT, RESTORE_INVENTORY]; dispute=updateDocument only; escrow_auto_release_days FREEDOM. T612: SETNX payout-lock; payoutVaultRef only.',
    'chosen: CART-LOCK-SETNX-001 + PAYMENT-SPLIT-IDEMPOTENCY-001 + LIFO-SAGA-COMPENSATION-001 + NON-REPUDIATION-AUDIT-001 + vault-ref-only-payout. rejected: no-BOLA-check OR concurrent-checkout-oversell OR FIFO-compensation OR deleteDocument-on-dispute OR bank-details-in-payout-record. discriminatingConstraint: SF-1 (BOLA order), SF-2 (split idempotency), SF-3 (LIFO order), SF-4 (append-only audit), SF-5 (vault-ref). curriculumTier=1.'),

  'FLOW-17': makeStandardFixture('FLOW-17', 'T613', 'freelancer-marketplace-gig-acceptance-gateway',
    'VALIDATION',
    'Generate GigAcceptanceLockGateway (T613): BOLA ORDER 1 gigPosting.clientTenantId === ALS.tenantId; SETNX(gig-accept-lock:{gigId}) ORDER 2; OCC bid status check (bid.status === OPEN) ORDER 3; storeDocument(audit) BEFORE GigAccepted DNA-8 ORDER 4-5. CF-17-1: extends CART-LOCK-SETNX-001. T614 CONTRACT_IMMUTABLE_FIELDS compile-time at ORDER 1, sum validation milestones===contractTotal at ORDER 2, OCC write ORDER 3. T615: delivery gate before release, LIFO [REFUND_MILESTONE, RESTORE_GIG_STATUS] reversed, no deleteDocument on dispute. T616: VALID_REVIEW_DIRECTIONS compile-time, direction ORDER 1, duplicate check ORDER 2, comment excluded from audit PLATFORM_ONLY-safe.',
    'chosen=BOLA-ORDER1+SETNX-gig-lock+OCC-bid-status+CONTRACT_IMMUTABLE_FIELDS-compile-time+sum-validation+delivery-gate-before-release+LIFO-milestone-granularity+single-direction-review+comment-excluded-audit. rejected=no-BOLA OR SETNX-after-OCC OR mutable-contract-fields OR no-sum-validation OR release-before-delivery OR FIFO-compensation OR duplicate-direction-review OR comment-in-platform-audit. discriminatingConstraint: CF-17-1 (BOLA+SETNX+OCC order), CF-17-2 (immutable+sum), CF-17-3 (delivery gate+LIFO), CF-17-4 (direction+append-only+comment-excluded). curriculumTier=2.'),

  'FLOW-18': makeStandardFixture('FLOW-18', 'T617', 'visual-flow-engine-canvas-writer',
    'VISUAL_CREATION',
    'Generate FlowCanvasWriter (T617): BOLA ORDER 1 flow.tenantId === ALS.tenantId; FLOW_IMMUTABLE guard ORDER 2 (status !== PUBLISHED); canvas write ORDER 3 (DRAFT only); storeDocument(audit) BEFORE FlowCanvasUpdated DNA-8. T618: DFS WHITE/GRAY/BLACK cycle detection ORDER 1; type compatibility per-edge ORDER 2; OCC DRAFT→PUBLISHED ORDER 3. T619: SETNX(node-type-reg-lock:{nodeTypeId}) ORDER 1; dual write (nodeType + capabilityIndex) ORDER 2+3; redis.del(lockKey) in catch on failure. T620: version lock (injection-version-lock:{nodeId}:{version}) ORDER 1; pre-write audit (rollback pointer) storeDocument ORDER 2 BEFORE injection; append-only audit (no updateDocument); extends NON-REPUDIATION-AUDIT-001.',
    'chosen=BOLA-ORDER1+FLOW_IMMUTABLE-ORDER2+DFS-WHITE-GRAY-BLACK+type-compatibility-per-edge+OCC-DRAFT-PUBLISHED+SETNX-node-type-reg-lock+redis.del-in-catch+version-lock+pre-write-audit-rollback-pointer+append-only-injection-audit. rejected=no-BOLA OR write-to-published OR cycle-detection-after-type-check OR plain-storeDocument-for-publish OR write-without-SETNX OR no-redis.del-in-catch OR injection-without-version-lock OR audit-after-injection OR updateDocument-on-audit. discriminatingConstraint: CF-18-1 (BOLA+FLOW_IMMUTABLE order), CF-18-2 (DFS+type+OCC order), CF-18-3 (SETNX+dual-write+redis.del), CF-18-4 (version-lock+pre-write-audit+append-only). curriculumTier=2.'),

  'FLOW-19': makeStandardFixture('FLOW-19', 'T621', 'durable-sagas-compliance-saga-orchestrator',
    'ORCHESTRATION',
    'Generate SagaOrchestrator (T621): storeDocumentWithOCC(versionPin:-1) at ORDER 1 — OCC conflict → SagaAlreadyRunning (idempotent); SETNX(step-lock:{sagaId}:{stepIndex}) at ORDER 2 BEFORE step body; registerCompensation(strategy) at ORDER 3 before step body; executeStepBody ORDER 4; storeDocument(checkpoint) BEFORE enqueue(SagaStepExecuted) ORDER 5 DNA-8. T622: LIFO .reverse() iteration ORDER 1; serial for..of loop (no Promise.all) ORDER 2; SETNX(comp-lock:{sagaId}:{stepIndex}) per step ORDER 3; stop-on-first-failure → CompensationFailed + HALT ORDER 4; storeDocument(compRecord) BEFORE enqueue(CompensationStepExecuted) per step DNA-8. T623: retentionExpiresAt = writtenAt + FREEDOM(flow19_compliance_retention_days) at ORDER 1; auditHash = SHA-256([tenantId,sagaId,eventType,writtenAt].join(\':\')) at ORDER 2; storeDocument(PLATFORM_ONLY, append-only) at ORDER 3; enqueue(ComplianceRecordWritten) ORDER 4. T624: dual-gate (retentionExpired AND !legalHold) ORDER 2+3; legalHold → emit RetentionHoldActive + skip; archiveRecord() ORDER 4 BEFORE tombstone storeDocument ORDER 5; CRON from FREEDOM(flow19_retention_cron_schedule).',
    'chosen=storeDocumentWithOCC-versionPin-1+SETNX-step-lock-ORDER2+compensation-registered-before-body+checkpoint-before-enqueue+LIFO-reverse+serial-no-Promise.all+SETNX-comp-lock+stop-on-first-failure+retentionExpiresAt-at-write-time+auditHash-SHA256+PLATFORM_ONLY-append-only+dual-gate-expiry-AND-legalHold+archive-before-tombstone+CRON-from-FREEDOM. rejected=plain-storeDocument-for-saga-init OR SETNX-after-step-body OR compensation-after-step-body OR enqueue-before-checkpoint OR FIFO-compensation OR parallel-compensation OR continue-after-failure OR hardcoded-retentionDays OR uuid-audit-id OR updateDocument-on-compliance OR legalHold-bypass OR delete-before-archive OR hardcoded-cron. discriminatingConstraint: CF-19-1 (OCC versionPin:-1 ORDER1 + SETNX ORDER2 + compensation-before-body + DNA-8), CF-19-2 (LIFO serial stop-on-first-failure + SETNX comp-lock), CF-19-3 (retentionExpiresAt at write time + SHA-256 hash + PLATFORM_ONLY + append-only), CF-19-4 (dual gate + archive-before-delete + FREEDOM CRON). curriculumTier=2.'),

  'FLOW-22': makeStandardFixture('FLOW-22', 'T633', 'cms-publishing-content-version-publisher',
    'CMS_PUBLISHING',
    'Generate ContentVersionPublisher (T633): BOLA ORDER 1 (content.tenantId === ALS.tenantId); FLOW_IMMUTABLE guard ORDER 2 (status !== PUBLISHED); OCC via WHERE versionNumber=old ORDER 3-4; storeDocument(audit) BEFORE ContentPublished enqueue DNA-8 ORDER 5. T634: Sequential stages (validation→security→legal→publish) with role-based gates from FREEDOM config (IR-1); unanimous approval required per stage (IR-2); append-only approval records (IR-4). T635: SETNX(publish-schedule:{contentId}:{timestamp}) idempotency lock at ORDER 1; lock held → return cached result (IR-2); durable timer with exponential backoff (IR-3); TTL from FREEDOM publish.schedule.ttl_minutes (IR-4). T636: Append-only metrics (storeDocument only, no update/delete); SHA256(userId) hashing (no raw userId); piiScrubbed flag flip on deletion (GDPR compliant); aggregation filters piiScrubbed: false.',
    'chosen=BOLA-ORDER1+FLOW_IMMUTABLE-ORDER2+OCC-WHERE-versionNumber+DNA-8-audit-before-emit+sequential-stages+unanimous-approval+FREEDOM-role-config+SETNX-schedule-lock+exponential-backoff+append-only-metrics+SHA256-hash+piiScrubbed-flag-flip. rejected=no-BOLA OR write-to-published OR OCC-without-WHERE OR enqueue-before-audit OR parallel-approval-stages OR hardcoded-roles OR duplicate-publish-allowed OR SETNX-after-timer OR updateDocument-on-metrics OR raw-userId-storage OR delete-on-GDPR-request OR aggregation-includes-scrubbed. discriminatingConstraint: CF-22-1 (OCC state machine), CF-22-2 (sequential gates), CF-22-3 (SETNX idempotency), CF-22-4 (append-only analytics). curriculumTier=2.'),

  'FLOW-25': makeStandardFixture('FLOW-25', 'T375', 'bfa-cross-flow-governance-conflict-arbiter',
    'GOVERNANCE',
    'Generate ChangeIntakeLedger (T375): Content-addressed deduplication via SHA-256 hash of change payload. BlastRadiusCalculator (T380): DFS with visited set for cycle detection. ArbitrationOrchestrator (T381): OCC arbitration state machine with versionNumber tracking.',
    'chosen=content-addressed-dedup+cycle-safe-DFS+OCC-arbitration-state, rejected=no-dedup OR unbounded-DFS OR plain-updates. curriculumTier=2.'),

  'FLOW-26': makeStandardFixture('FLOW-26', 'T382', 'meta-flow-engine-extension-coordinator',
    'ORCHESTRATION',
    'Generate flow extension services (T382-T384): Meta-level orchestration for extending existing flows with new services. Extensibility patterns with pluggable transformation pipelines.',
    'chosen=pluggable-transform+meta-orchestration, rejected=hardcoded-flows OR no-extension-hooks. curriculumTier=2.'),

  'FLOW-27': makeStandardFixture('FLOW-27', 'T385', 'human-interaction-gate-approval-router',
    'GOVERNANCE',
    'Generate HumanApprovalGate (T385-T387): Queue-driven escalation for ambiguous decisions. Human approval with resolutionReason capture. State tracking for approval workflow.',
    'chosen=queue-driven-escalation+human-reason-capture+state-tracking, rejected=automatic-only OR no-reason-capture OR lost-state. curriculumTier=2.'),

  'FLOW-29': makeStandardFixture('FLOW-29', 'T388', 'adaptive-rag-deep-research-optimizer',
    'DATA_PIPELINE',
    'Generate RAG optimization services (T388-T390): Adaptive retrieval quality scoring. Query decomposition for deep research. Result re-ranking with confidence estimation.',
    'chosen=quality-scoring+decomposition+ranking, rejected=static-RAG OR no-decomposition OR single-result. curriculumTier=2.'),

  'FLOW-31': makeStandardFixture('FLOW-31', 'T391', 'design-intelligence-engine-analyzer',
    'INTELLIGENCE',
    'Generate DesignSystemAnalyzer (T391-T393): Design pattern recognition and governance. Consistency checking across components. Automated design debt detection.',
    'chosen=pattern-recognition+consistency-check+debt-detection, rejected=manual-only OR no-consistency OR ignore-debt. curriculumTier=2.'),

  'FLOW-33': makeStandardFixture('FLOW-33', 'T394', 'system-initiation-bootstrap-generator',
    'BOOTSTRAP',
    'Generate SystemBootstrapper (T394-T396): Self-initialization of xiigen engine at startup. Capability verification and gap detection. Prerequisite flow orchestration.',
    'chosen=self-init+cap-verify+gap-detect, rejected=manual-init OR no-verification OR no-gaps. curriculumTier=3.'),

  'FLOW-35': makeStandardFixture('FLOW-35', 'T397', 'meta-arbitration-engine-resolver',
    'ARBITRATION',
    'Generate MetaArbiter (T397-T399): Cross-flow arbitration engine. Conflict resolution across multiple domains. Priority-based decision cascading.',
    'chosen=cross-flow-arb+cascading+priority-based, rejected=single-flow OR flat-resolution. curriculumTier=3.'),

  'FLOW-36': makeStandardFixture('FLOW-36', 'T400', 'feature-registry-manager',
    'GOVERNANCE',
    'Generate FeatureRegistryManager (T400-T402): Central registry for feature flags and metadata. Namespace-based organization (FT-XXX). Runtime feature rollout coordination.',
    'chosen=namespace-registry+rollout-coord, rejected=scattered-flags OR no-metadata. curriculumTier=2.'),

  'FLOW-37': makeStandardFixture('FLOW-37', 'T403', 'design-system-governance-enforcer',
    'GOVERNANCE',
    'Generate DesignGovernanceEnforcer (T403-T405): Design rule validation pipeline. Violation detection and reporting. Compliance audit trails.',
    'chosen=rule-validation+violation-detection+audit, rejected=no-validation OR silent-violations. curriculumTier=2.'),

  'FLOW-38': makeStandardFixture('FLOW-38', 'T406', 'rag-quality-feedback-learner',
    'LEARNING',
    'Generate RAGQualityFeedback (T406-T408): User feedback collection for RAG results. Quality metric aggregation. Continuous improvement loop.',
    'chosen=feedback-collection+aggregation+continuous-improve, rejected=no-feedback OR static-quality. curriculumTier=2.'),

  'FLOW-39': makeStandardFixture('FLOW-39', 'T409', 'oss-curriculum-guide',
    'LEARNING',
    'Generate OSSCurriculum (T409-T411): Open-source learning paths and skill progression. Curriculum tier tracking. OSS contribution workflows.',
    'chosen=learningPaths+tier-tracking+contribution-flow, rejected=no-curriculum OR locked-content. curriculumTier=1.'),

  'FLOW-40': makeStandardFixture('FLOW-40', 'T412', 'client-push-notifier',
    'COMMUNICATION',
    'Generate ClientPushNotifier (T412-T414): Client-side push notification orchestration. Event batching and deduplication. Browser notification delivery.',
    'chosen=event-batch+dedup+browser-notify, rejected=unbatched OR duplicates OR no-delivery. curriculumTier=1.'),
};
