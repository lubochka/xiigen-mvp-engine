/**
 * LAYER 0 — FABRIC INTERFACES (the swappable foundation)
 * Every component talks ONLY through these interfaces. Never to providers directly.
 *
 * 10 Fabrics:
 *   1. IDatabaseService (Skill 05)
 *   2. IQueueService (Skill 04)
 *   3. IAiProvider + IAiDispatcher (Skills 06/07)
 *   4. IRagService (Skills 00a/00b)
 *   5. IFlowDefinition + IFlowOrchestrator (Skills 08/09)
 *   6. MicroserviceBase (Skill 01) — defined in kernel
 *   7. ISecretsService (FLOW-35)
 *   8. IScopedMemoryService (Z-2) — atomic counters, idempotency locks, TTL
 *   9. ICodeRepositoryService (Z-2) — codebase ingestion, intake pipeline
 *  10. ISchedulerService (Z-4) — delayed/recurring action scheduling, provider-swappable
 */

// Fabric 1: Database
export { IDatabaseService, DATABASE_SERVICE } from './database.interface';

// Fabric 2: Queue
export { IQueueService, QUEUE_SERVICE } from './queue.interface';

// Fabric 3: AI Engine
export {
  IAiProvider,
  IAiDispatcher,
  AiModelRole,
  AI_PROVIDER,
  AI_DISPATCHER,
  AI_JUDGE_PROVIDER,
  AI_OPENAI_PROVIDER,
  AI_GEMINI_PROVIDER,
  AI_SCOPE_ARBITER,
} from './ai-provider.interface';

// Fabric 4: RAG
export { IRagService, RAG_SERVICE } from './rag.interface';

// Fabric 5: Flow Engine
export {
  IFlowDefinition,
  IFlowOrchestrator,
  NodeStatus,
  FLOW_DEFINITION,
  FLOW_ORCHESTRATOR,
} from './flow-orchestrator.interface';

// Fabric 7: Secrets
export { ISecretsService, SECRETS_SERVICE } from './secrets.interface';

// Fabric 11: Token Service (FLOW-01 Phase A0.5 — Fabric Auth Foundation)
export {
  ITokenService,
  TOKEN_SERVICE,
  TokenIssueResult,
  TokenVerifyResult,
} from './token.service.interface';

// Fabric 12: Password Hasher Service (FLOW-01 Phase A0.5 — Fabric Auth Foundation)
export {
  IPasswordHasherService,
  PASSWORD_HASHER_SERVICE,
  HashResult,
  CompareResult,
} from './password-hasher.service.interface';

// Fabric 8: Scoped Memory (Z-2)
export { IScopedMemoryService, SCOPED_MEMORY_SERVICE } from './scoped-memory.interface';

// Fabric 9: Code Repository (Z-2)
export {
  ICodeRepositoryService,
  CODE_REPOSITORY_SERVICE,
  FileTreeEntry,
  CodebaseSnapshot,
  CodeDiff,
} from './code-repository.interface';

// Fabric 10: Scheduler (Z-4)
export { ISchedulerService, SCHEDULER_SERVICE } from './scheduler.interface';

// FLOW-10: Review domain interfaces
export * from './review-eligibility.interface';
export * from './review-ownership.interface';
export * from './review-notification.interface';

// FLOW-13: Data Warehouse & Analytics interfaces
export * from './quota-manager.interface';
export * from './legal-hold.interface';
export * from './batch-queue.interface';
export * from './warehouse-security.interfaces';
export * from './approval.interface';

// FLOW-14: ETL & Data Integration Platform-Only interfaces
export * from './etl-platform.interfaces';
export * from './cursor-checkpoint.interface';

// FLOW-17: IP Management & Licensing interfaces (GAP-17-01/02/05)
export * from './escrow-ledger.service.interface';
export * from './deliverable-immutable-store.interface';

// FLOW-40: Client Push Infrastructure
export {
  ISseConnectionPool,
  SSE_CONNECTION_POOL,
  SseEvent,
  ConnectionInfo,
} from './sse-connection-pool.interface';
