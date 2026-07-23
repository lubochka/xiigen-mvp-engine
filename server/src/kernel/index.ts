/**
 * Kernel — Foundation layer for XIIGen engine.
 * All DNA patterns + multi-tenant core + base classes.
 */

// DNA-3: DataProcessResult
export { DataProcessResult } from './data-process-result';

// DNA-1: ParseDocument
export { parseDocument, documentToJson, mergeDocuments, extractFields } from './parse-document';

// DNA-2: BuildSearchFilter
export {
  buildSearchFilter,
  buildSearchFilterFlat,
  buildEsQuery,
  isEmpty,
  FilterOperator,
} from './build-search-filter';
export type { FilterSpec } from './build-search-filter';

// DNA-5: ScopeIsolation
export {
  ScopeContext,
  SCOPE_CONTEXT_KEY,
  validateScope,
  enforceScope,
  requireTenantId,
} from './scope-isolation';

// DNA-9: CloudEvents
export {
  createCloudEvent,
  validateCloudEvent,
  serializeCloudEvent,
  deserializeCloudEvent,
  extractEventData,
} from './cloud-events';

// DNA-6: DynamicController
export { DynamicController, RouteDefinition } from './dynamic-controller';
export type { HandlerFn } from './dynamic-controller';

// DNA-4: MicroserviceBase
export { MicroserviceBase, ServiceDescriptor } from './microservice-base';
export type {
  IDatabaseAccess,
  IQueuePubSub,
  ICacheAccess,
  IAuthContext,
  IHealthCheck,
  IConfigProvider,
  IPermissions,
  MicroserviceBaseOptions,
} from './microservice-base';

// Multi-Tenant Core
export {
  TenantContext,
  TenantRecord,
  TenantPlan,
  DEFAULT_PLAN,
  TENANT_CONTEXT_KEY,
  TenantRegistry,
  TenantGuard,
  TENANT_HEADER,
  TenantId,
  CurrentTenant,
  TenantContextMiddleware,
  TenantContextResolver,
  MultiTenantModule,
  TenantConfigResolver,
  TenantKeyResolver,
  TenantQuotaService,
} from './multi-tenant';
export type { CreateTenantInput, UpdateTenantInput } from './multi-tenant';

// Module
export { KernelModule } from './kernel.module';
