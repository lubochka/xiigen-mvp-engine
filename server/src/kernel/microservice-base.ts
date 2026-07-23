/**
 * DNA-4: MicroserviceBase
 * Every service inherits from this. Provides 19 architectural components.
 * No service can exist without extending MicroserviceBase. No exceptions.
 */

import { randomUUID } from 'crypto';
import { DataProcessResult } from './data-process-result';
import { ScopeContext, validateScope } from './scope-isolation';
import { createCloudEvent } from './cloud-events';
import { ITenantRegistry } from './multi-tenant/tenant-registry.interface';

// ═══════════════════════════════════════════════════════
// Component Interfaces (the 19 architectural slots)
// ═══════════════════════════════════════════════════════

/** Component 1: Database access through fabric. */
export interface IDatabaseAccess {
  storeDocument(
    tenantId: string,
    index: string,
    doc: Record<string, unknown>,
    docId?: string,
  ): Promise<DataProcessResult<Record<string, unknown>>>;
  searchDocuments(
    tenantId: string,
    index: string,
    filters: Record<string, unknown>,
  ): Promise<DataProcessResult<Array<Record<string, unknown>>>>;
  getDocument(
    tenantId: string,
    index: string,
    docId: string,
  ): Promise<DataProcessResult<Record<string, unknown>>>;
  deleteDocument(
    tenantId: string,
    index: string,
    docId: string,
  ): Promise<DataProcessResult<boolean>>;
}

/** Component 2: Queue publish/subscribe through fabric. */
export interface IQueuePubSub {
  enqueue(
    tenantId: string,
    eventType: string,
    data: Record<string, unknown>,
  ): Promise<DataProcessResult<string>>;
  dequeue(
    tenantId: string,
    queueName: string,
    maxMessages?: number,
  ): Promise<DataProcessResult<Array<Record<string, unknown>>>>;
  acknowledge(
    tenantId: string,
    queueName: string,
    receiptHandle: string,
  ): Promise<DataProcessResult<boolean>>;
}

/** Component 3: Cache read/write. */
export interface ICacheAccess {
  cacheGet(tenantId: string, key: string): Promise<DataProcessResult<unknown | undefined>>;
  cacheSet(
    tenantId: string,
    key: string,
    value: unknown,
    ttlSeconds?: number,
  ): Promise<DataProcessResult<boolean>>;
  cacheDelete(tenantId: string, key: string): Promise<DataProcessResult<boolean>>;
}

/** Component 4: Authentication context. */
export interface IAuthContext {
  getScope(): ScopeContext;
  hasRole(role: string): boolean;
  hasPermission(permission: string): boolean;
}

/** Component 5: Health check. */
export interface IHealthCheck {
  checkHealth(): Promise<DataProcessResult<Record<string, unknown>>>;
}

/** Component 6: Configuration access. */
export interface IConfigProvider {
  getConfig(key: string, defaultValue?: unknown): unknown;
  getConfigSection(section: string): Record<string, unknown>;
}

/** Component 7: Permission checks. */
export interface IPermissions {
  checkPermission(
    tenantId: string,
    userId: string,
    resource: string,
    action: string,
  ): Promise<DataProcessResult<boolean>>;
}

// Components 8-19: defined as stubs, filled in later phases
// 8: Logger (NestJS Logger)
// 9: Metrics/Telemetry
// 10: Rate Limiter
// 11: Circuit Breaker
// 12: Retry Policy
// 13: Idempotency Key Store
// 14: Outbox
// 15: Feature Flags
// 16: Secret Manager
// 17: Audit Trail
// 18: Notification Dispatch
// 19: Object Processor (BuildSearchFilter)
// 20: Tenant Registry (ITenantRegistry) — P26 FIX-4

// ═══════════════════════════════════════════════════════
// ServiceDescriptor — identity of each microservice
// ═══════════════════════════════════════════════════════

export class ServiceDescriptor {
  readonly serviceId: string;
  readonly serviceName: string;
  readonly version: string;
  readonly flowId: string | undefined;
  readonly familyId: string | undefined;

  constructor(params: {
    serviceId: string;
    serviceName: string;
    version?: string;
    flowId?: string;
    familyId?: string;
  }) {
    this.serviceId = params.serviceId;
    this.serviceName = params.serviceName;
    this.version = params.version ?? '1.0.0';
    this.flowId = params.flowId;
    this.familyId = params.familyId;
  }
}

// ═══════════════════════════════════════════════════════
// MicroserviceBase — THE base class
// ═══════════════════════════════════════════════════════

export interface MicroserviceBaseOptions {
  descriptor: ServiceDescriptor;
  db?: IDatabaseAccess; // 1. DB access
  queue?: IQueuePubSub; // 2. Queue pub/sub
  cache?: ICacheAccess; // 3. Cache
  auth?: IAuthContext; // 4. Auth context
  config?: IConfigProvider; // 6. Config
  permissions?: IPermissions; // 7. Permissions
  tenantRegistry?: ITenantRegistry; // 20. Tenant Registry — P26 FIX-4
}

/**
 * DNA-4: Base class for ALL microservices.
 * Provides 20 architectural components. Every service MUST inherit this.
 *
 * Usage:
 *   class MyService extends MicroserviceBase {
 *     constructor(db: IDatabaseAccess, queue: IQueuePubSub) {
 *       super({
 *         descriptor: new ServiceDescriptor({ serviceId: 'my-svc', serviceName: 'My Service' }),
 *         db, queue,
 *       });
 *     }
 *   }
 */
export abstract class MicroserviceBase {
  private readonly _descriptor: ServiceDescriptor;
  private readonly _instanceId: string;
  private readonly _startedAt: Date;

  // ── 20 Component Slots ──
  private readonly _db: IDatabaseAccess | undefined; // 1
  private readonly _queue: IQueuePubSub | undefined; // 2
  private readonly _cache: ICacheAccess | undefined; // 3
  private readonly _auth: IAuthContext | undefined; // 4
  private readonly _config: IConfigProvider | undefined; // 6
  private readonly _permissions: IPermissions | undefined; // 7
  private readonly _tenantRegistry: ITenantRegistry | undefined; // 20 (P26 FIX-4)
  // 5: Health check (self)
  // 8: Logger (console-based for now, NestJS Logger in later phases)
  // 9-19: initialized as needed (stubs for now)

  private _isHealthy: boolean;

  constructor(options: MicroserviceBaseOptions) {
    this._descriptor = options.descriptor;
    this._instanceId = randomUUID();
    this._startedAt = new Date();
    this._db = options.db;
    this._queue = options.queue;
    this._cache = options.cache;
    this._auth = options.auth;
    this._config = options.config;
    this._permissions = options.permissions;
    this._tenantRegistry = options.tenantRegistry;
    this._isHealthy = true;
  }

  // ── Properties ────────────────────────────────────

  get descriptor(): ServiceDescriptor {
    return this._descriptor;
  }

  get serviceId(): string {
    return this._descriptor.serviceId;
  }

  get serviceName(): string {
    return this._descriptor.serviceName;
  }

  get instanceId(): string {
    return this._instanceId;
  }

  get isHealthy(): boolean {
    return this._isHealthy;
  }

  // ── Component 1: Database Access ──────────────────

  get db(): IDatabaseAccess {
    if (!this._db) {
      throw new Error(`${this.serviceName}: Database component not injected`);
    }
    return this._db;
  }

  get hasDb(): boolean {
    return this._db !== undefined;
  }

  // ── Component 2: Queue Pub/Sub ────────────────────

  get queue(): IQueuePubSub {
    if (!this._queue) {
      throw new Error(`${this.serviceName}: Queue component not injected`);
    }
    return this._queue;
  }

  get hasQueue(): boolean {
    return this._queue !== undefined;
  }

  // ── Component 3: Cache ────────────────────────────

  get cache(): ICacheAccess {
    if (!this._cache) {
      throw new Error(`${this.serviceName}: Cache component not injected`);
    }
    return this._cache;
  }

  get hasCache(): boolean {
    return this._cache !== undefined;
  }

  // ── Component 20: Tenant Registry (P26 FIX-4) ────

  get tenantRegistry(): ITenantRegistry {
    if (!this._tenantRegistry) {
      throw new Error(`${this.serviceName}: TenantRegistry component not injected`);
    }
    return this._tenantRegistry;
  }

  get hasTenantRegistry(): boolean {
    return this._tenantRegistry !== undefined;
  }

  // ── Component 5: Health Check ─────────────────────

  async checkHealth(): Promise<DataProcessResult<Record<string, unknown>>> {
    const health: Record<string, unknown> = {
      service_id: this.serviceId,
      service_name: this.serviceName,
      instance_id: this._instanceId,
      status: this._isHealthy ? 'healthy' : 'unhealthy',
      started_at: this._startedAt.toISOString(),
      components: {} as Record<string, string>,
    };
    const components = health['components'] as Record<string, string>;
    if (this._db) components['database'] = 'connected';
    if (this._queue) components['queue'] = 'connected';
    if (this._cache) components['cache'] = 'connected';
    return DataProcessResult.success(health);
  }

  // ── Component 6: Config ───────────────────────────

  getConfig(key: string, defaultValue?: unknown): unknown {
    if (this._config) {
      return this._config.getConfig(key, defaultValue);
    }
    return defaultValue;
  }

  // ── Scope Enforcement (DNA-5) ─────────────────────

  validateTenant(tenantId: string): DataProcessResult<string> {
    return validateScope(tenantId);
  }

  // ── Event Publishing Helper ───────────────────────

  async publishEvent(
    tenantId: string,
    eventType: string,
    data: Record<string, unknown>,
    correlationId?: string,
  ): Promise<DataProcessResult<string>> {
    const scopeCheck = this.validateTenant(tenantId);
    if (!scopeCheck.isSuccess) {
      return scopeCheck as unknown as DataProcessResult<string>;
    }

    const event = createCloudEvent({
      eventType,
      source: `/xiigen/${this.serviceId}`,
      data,
      tenantId,
      correlationId,
    });

    return this.queue.enqueue(tenantId, eventType, event);
  }

  // ── Logging Helper (Component 8) ──────────────────

  protected log(
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    meta?: Record<string, unknown>,
  ): void {
    const prefix = `[${this._descriptor.serviceId}]`;
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    switch (level) {
      case 'info':
        // eslint-disable-next-line no-console
        console.log(`${prefix} INFO: ${message}${metaStr}`);
        break;
      case 'warn':
        console.warn(`${prefix} WARN: ${message}${metaStr}`);
        break;
      case 'error':
        console.error(`${prefix} ERROR: ${message}${metaStr}`);
        break;
      case 'debug':
        // eslint-disable-next-line no-console
        console.debug(`${prefix} DEBUG: ${message}${metaStr}`);
        break;
    }
  }

  // ── DNA-8 / INV-15-1: Persist-Then-Emit Template Method ──────────────────

  /**
   * DNA-8 / INV-15-1 compliant persist-then-emit template method.
   * The ONLY approved way for PERSISTENCE archetype task types to
   * persist a document and emit a queue event.
   *
   * Guarantees:
   *   - emitFn is NEVER called if persistFn fails
   *   - persistFn is ALWAYS called before emitFn
   *   - No direct db/queue calls in sequence are permitted
   *     (enforced by ESLint rule: no-enqueue-before-storedocument)
   */
  protected async persistThenEmit<T>(
    persistFn: () => Promise<DataProcessResult<T>>,
    emitFn: (persistedData: T) => Promise<DataProcessResult<void>>,
  ): Promise<DataProcessResult<void>> {
    // Step 1: DATABASE FIRST (INV-15-1)
    const persistResult = await persistFn();

    if (!persistResult.isSuccess) {
      // emitFn is NEVER called on persist failure
      return DataProcessResult.failure(
        persistResult.errorCode ?? 'PERSIST_FAILED',
        persistResult.errorMessage ?? 'Document persistence failed',
      );
    }

    // Step 2: QUEUE AFTER SUCCESSFUL PERSIST (INV-15-1)
    return emitFn(persistResult.data as T);
  }

  // ── Lifecycle ─────────────────────────────────────

  async start(): Promise<DataProcessResult<boolean>> {
    this.log('info', `Service ${this.serviceName} starting...`);
    this._isHealthy = true;
    return DataProcessResult.success(true);
  }

  async stop(): Promise<DataProcessResult<boolean>> {
    this.log('info', `Service ${this.serviceName} stopping...`);
    this._isHealthy = false;
    return DataProcessResult.success(true);
  }
}
