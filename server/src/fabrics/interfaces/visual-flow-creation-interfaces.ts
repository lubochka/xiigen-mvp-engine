/**
 * FLOW-18: Visual Flow Creation & Code Injection Engine
 * Fabric interfaces for F642, F646, F650, F669, F682.
 *
 * All are PLATFORM-ONLY (F642, F646, F669, F682) or INJECTABLE (F650).
 * Rule 1: No provider SDK imports — fabric interfaces only.
 * Rule 4: All methods return DataProcessResult<T>.
 * Rule 6: No tenantId parameter — AsyncLocalStorage.
 */

import { DataProcessResult } from '../../kernel/data-process-result';

// ── F682: IFeatureFlagService (PLATFORM-ONLY) ─────────────────────────────────
// Token: FEATURE_FLAG_SERVICE
// emergencyOff() HARD SLA: < 100ms (in-memory cache write sync + ES persist async)

export type FeatureFlagState = 'off' | 'canary' | 'full';

export interface FeatureFlag {
  flagId: string;
  tenantId: string;
  description: string;
  state: FeatureFlagState;
  canaryPercentage?: number;
  createdAt: string;
  updatedAt: string;
}

export interface RequestContext {
  requestId?: string;
  userId?: string;
  [key: string]: unknown;
}

export abstract class IFeatureFlagService {
  abstract create(params: {
    flagId: string;
    tenantId: string;
    description: string;
    initialState: FeatureFlagState;
    canaryPercentage?: number;
  }): Promise<DataProcessResult<FeatureFlag>>;

  abstract toggle(
    flagId: string,
    state: FeatureFlagState,
    canaryPercentage?: number,
  ): Promise<DataProcessResult<void>>;

  abstract evaluate(
    flagId: string,
    tenantId: string,
    requestContext?: RequestContext,
  ): Promise<DataProcessResult<boolean>>;

  /** HARD SLA: Must complete < 100ms. In-memory cache write (sync) + ES persist (async fire-and-forget). */
  abstract emergencyOff(flagId: string): Promise<DataProcessResult<void>>;
}

export const FEATURE_FLAG_SERVICE = 'FEATURE_FLAG_SERVICE';

// ── F646: ICodeInjectorService (PLATFORM-ONLY) ────────────────────────────────
// Token: CODE_INJECTOR_SERVICE
// inject() atomic: PG transaction fails → no module loaded (DNA-8: store before inject)
// rollback() must complete ≤60s (T253 Phase B SLA)

export interface InjectionResult {
  injectionId: string;
  factoryId: string;
  featureFlagId: string;
  loadedAt: string;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number;
}

export interface HealthResult {
  healthy: boolean;
  errorRate: number;
  latencyP99: number;
  injectionId: string;
}

export interface RollbackSnapshot {
  previousFactoryVersion: string | null;
  moduleId: string;
  capturedAt: string;
}

export abstract class ICodeInjectorService {
  abstract inject(params: {
    tenantId: string;
    factoryId: string;
    compiledModule: Buffer;
    sourceCode: string;
    featureFlagId: string;
    rollbackSnapshot: RollbackSnapshot;
  }): Promise<DataProcessResult<InjectionResult>>;

  /** Must complete ≤60s (T253 Phase B SLA). emergencyOff handled by T268 before calling this. */
  abstract rollback(params: {
    tenantId: string;
    injectionId: string;
    reason: string;
  }): Promise<DataProcessResult<void>>;

  abstract healthCheck(injectionId: string): Promise<DataProcessResult<HealthResult>>;
}

export const CODE_INJECTOR_SERVICE = 'CODE_INJECTOR_SERVICE';

// ── F642: IDAGValidatorService (PLATFORM-ONLY) ────────────────────────────────
// Token: DAG_VALIDATOR_SERVICE
// Standard DFS cycle detection — tenants cannot swap the algorithm (CF-299)

export interface DAGValidationResult {
  isValid: boolean;
  cycleDetected: boolean;
  cyclePath?: string[];
}

export interface FullDAGValidationResult extends DAGValidationResult {
  reachableNodes: string[];
  unreachableNodes: string[];
  longestPath: number;
}

export abstract class IDAGValidatorService {
  abstract validateEdgeAddition(params: {
    canvasId: string;
    tenantId: string;
    fromNodeId: string;
    toNodeId: string;
    existingEdges: Array<{ from: string; to: string }>;
  }): Promise<DataProcessResult<DAGValidationResult>>;

  abstract validateFullDAG(params: {
    canvasId: string;
    tenantId: string;
    nodes: string[];
    edges: Array<{ from: string; to: string }>;
    startNodeId: string;
  }): Promise<DataProcessResult<FullDAGValidationResult>>;
}

export const DAG_VALIDATOR_SERVICE = 'DAG_VALIDATOR_SERVICE';

// ── F669: ICRDTEngineService (PLATFORM-ONLY) ──────────────────────────────────
// Token: CRDT_ENGINE_SERVICE
// CF-321: same inputs in any order must produce same merged state (deterministic)
// Operation log in xiigen-crdt-operations

export type CRDTOperationType =
  | 'ADD_NODE'
  | 'REMOVE_NODE'
  | 'MOVE_NODE'
  | 'ADD_EDGE'
  | 'REMOVE_EDGE'
  | 'UPDATE_NODE_PROPERTY';

export interface CRDTOperation {
  operationId: string;
  type: CRDTOperationType;
  tenantId: string;
  userId: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface VectorClock {
  [userId: string]: number;
}

export interface DocumentState {
  documentId: string;
  nodes: Record<string, unknown>[];
  edges: Record<string, unknown>[];
  vectorClock: VectorClock;
  version: number;
}

export interface TransformedOperation extends CRDTOperation {
  /** operationIds this was transformed against */
  transformedAgainst: string[];
  finalVectorClock: VectorClock;
}

export interface MergedState extends DocumentState {
  mergeSource: 'state-a' | 'state-b' | 'conflict-free';
  conflictsResolved: number;
}

export abstract class ICRDTEngineService {
  abstract applyOperation(params: {
    documentId: string;
    tenantId: string;
    operation: CRDTOperation;
    vectorClock: VectorClock;
  }): Promise<DataProcessResult<TransformedOperation>>;

  abstract merge(params: {
    documentId: string;
    stateA: DocumentState;
    stateB: DocumentState;
  }): Promise<DataProcessResult<MergedState>>;

  abstract getState(
    documentId: string,
    tenantId: string,
  ): Promise<DataProcessResult<DocumentState>>;
}

export const CRDT_ENGINE_SERVICE = 'CRDT_ENGINE_SERVICE';

// ── F650: IBFAAutoRegistryService (INJECTABLE) ────────────────────────────────
// Token: BFA_AUTO_REGISTRY_SERVICE
// Tenants can configure rule templates via FREEDOM config (INJECTABLE — not PLATFORM-ONLY)

export type FabricType = 'DATABASE' | 'QUEUE' | 'AI_ENGINE' | 'RAG' | 'SECRETS' | 'FLOW_ENGINE';

export type BFARuleType =
  | 'FABRIC_CONFLICT'
  | 'TENANT_SCOPE'
  | 'EXCLUSIVE_FACTORY'
  | 'CONCURRENT_LIMIT';

export interface GeneratedBFARule {
  /** Assigned from CF-329+ namespace */
  ruleId: string;
  type: BFARuleType;
  factoryId: string;
  fabricType: string;
  description: string;
  flowId: string;
  tenantId: string;
  generatedAt: string;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflictingRule?: string;
  conflictDescription?: string;
  resolution?: string;
}

export abstract class IBFAAutoRegistryService {
  abstract generateRules(params: {
    factoryId: string;
    interfaceName: string;
    fabricType: FabricType;
    tenantId: string;
    flowId: string;
  }): Promise<DataProcessResult<GeneratedBFARule[]>>;

  abstract validateNoConflict(
    rules: GeneratedBFARule[],
  ): Promise<DataProcessResult<ConflictCheckResult>>;

  abstract registerRules(rules: GeneratedBFARule[]): Promise<DataProcessResult<void>>;
}

export const BFA_AUTO_REGISTRY_SERVICE = 'BFA_AUTO_REGISTRY_SERVICE';
