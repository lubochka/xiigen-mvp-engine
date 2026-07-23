/**
 * TenantTopologyStore — tenant-scoped flow topology persistence.
 *
 * Introduced by Track 0 Turn 2 (see docs/sessions/track-0/T0-AUDIT.md and the
 * approved reconnection plan). Persists two kinds of topology records:
 *   - GLOBAL templates (xiigen-flow-templates): reference flows bundled with the
 *     platform, readable by every tenant via the CLS scope switch below.
 *   - PRIVATE flows (xiigen-tenant-topologies): per-tenant records produced by
 *     CycleChain runs and tenant edits. Isolated via AsyncLocalStorage tenantId.
 *
 * Iron rules (v26 Finding JJ — matches 15-service data-classification convention):
 *   IR-TOPO-1: Written records: { connectionType: CONNECTION_TYPES.FLOW_SCOPED,
 *              knowledgeScope: 'PRIVATE' | 'GLOBAL' }. CF-POLICY-01.
 *     IR-TOPO-1 NOTE (v27 Finding NN): connectionType: FLOW_SCOPED on PRIVATE
 *     flows violates data-connection-classification-SKILL.md (rule: FLOW_SCOPED
 *     must have empty tenantId). This file intentionally matches the 191-location
 *     codebase convention because rag-query.handler + warehouse analytics filter
 *     by connectionType: FLOW_SCOPED. See
 *     server/src/rag-init/connection-types.ts validateConnectionFields().
 *     Resolving this tension is a codebase-wide effort beyond Track 0's scope.
 *   IR-TOPO-2: storePrivate() ALS tenantId OVERWRITES client-provided value. DNA-5.
 *   IR-TOPO-3: GLOBAL templates readable by all tenants via CLS scope switch to
 *              MASTER_TENANT_ID.
 */

import { Injectable, Inject } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { DataProcessResult } from '../kernel/data-process-result';
import { IDatabaseService, DATABASE_SERVICE } from '../fabrics/interfaces/database.interface';
import {
  TenantContext,
  TENANT_CONTEXT_KEY,
  TenantRecord,
} from '../kernel/multi-tenant/tenant-context';

// Pass 9 annotation: import + re-export. NEVER redeclare with placeholder.
// Audit Section F confirmed actual value is 'xiigen-master-00000000-0000-0000-0000-000000000001'.
import { MASTER_TENANT_ID } from '../bootstrap/bootstrap-seeder.service';
export { MASTER_TENANT_ID };

// v27 Finding OO — Golden Rule structural guard: use canonical constant, not string literal.
// This is the first file in the codebase to import the constant defined at
// server/src/rag-init/connection-types.ts (191 other locations hardcode the string).
import { CONNECTION_TYPES } from '../rag-init/connection-types';

export const FLOW_TEMPLATES_INDEX = 'xiigen-flow-templates';
export const TENANT_TOPOLOGIES_INDEX = 'xiigen-tenant-topologies';

/**
 * Turn 4 (MVP Plan v3, Goal 3) — admin audit log for cross-tenant reads.
 * Every call to listByTenant writes one entry so operator scope-switches
 * are auditable (ARCH-025 + GAP-SCOPE-05 compliance).
 */
export const ADMIN_AUDIT_INDEX = 'xiigen-admin-audit';

export interface TenantNode {
  nodeId: string;
  taskTypeId?: string;
  archetype: string;
  name: string;
  entry?: string;
  factoryId?: string;
  interfaceName?: string;
  fabric?: string;
  config?: Record<string, unknown>;
  machineRequired?: boolean;
  freedomKeys?: string[];
}

export interface TenantEdge {
  from: string;
  to: string;
  event?: string;
  condition?: string;
}

export interface TenantTopology {
  flowId: string;
  tenantId: string;
  connectionType: typeof CONNECTION_TYPES.FLOW_SCOPED; // v24 Finding GG (CF-POLICY-01) + v27 Finding OO (canonical constant)
  knowledgeScope: 'PRIVATE' | 'GLOBAL';
  name: string;
  version: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  sourceRunId?: string;
  // Track 0 Turn 11 — subflow capture: parent run that spawned this as a sub-flow topology.
  // Absent for top-level CycleChain runs (Turn 3 publish path).
  parentRunId?: string;
  parentNodeId?: string;
  // Track 0 Turn 13 — topology versioning for teach/QA iteration.
  //   DRAFT topologies are MUTABLE; PUBLISHED are IMMUTABLE.
  //   DPO / teach-QA promotion creates a NEW document with topologyVersion+1
  //   and parentVersion pointing to the previous version's flowId+version pair.
  //   Source for Req 1 ("each design simulation/teach/QA generates a decision flow").
  topologyVersion?: number; // monotonically increasing; absent = v1 MVP default
  parentVersion?: { flowId: string; version: string }; // link to prior version
  // These are speculative for Turns 11/13 which haven't been designed yet.
  // They will be ADDED in Turn 11 (parentRunId) and Turn 13 (versioning) when
  // those turns' designs are confirmed against the codebase. Adding them now
  // repeats the v1 pattern of assumptions before evidence.
  nodes: TenantNode[];
  edges: TenantEdge[];
  clientArchitecture?: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class TenantTopologyStore {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    private readonly cls: ClsService,
  ) {}

  /**
   * IR-TOPO-2 (DNA-5): the tenantId from CLS OVERWRITES any client-provided value.
   * Callers cannot spoof another tenant's storage even by setting the field.
   */
  async storePrivate(
    t: Omit<TenantTopology, 'tenantId' | 'connectionType'> & {
      tenantId?: string;
      connectionType?: typeof CONNECTION_TYPES.FLOW_SCOPED;
    },
  ): Promise<DataProcessResult<TenantTopology>> {
    const tenantId = this.cls.get<TenantContext>(TENANT_CONTEXT_KEY)?.tenantId;
    if (!tenantId) {
      return DataProcessResult.failure('NO_TENANT', 'Tenant context required');
    }
    const record: TenantTopology = {
      ...t,
      tenantId,
      connectionType: CONNECTION_TYPES.FLOW_SCOPED, // v24 Finding GG + v27 Finding OO
      updatedAt: new Date().toISOString(),
    };
    const docId = `${record.flowId}::${tenantId}::${record.version}`;
    const result = await this.db.storeDocument(
      TENANT_TOPOLOGIES_INDEX,
      record as unknown as Record<string, unknown>,
      docId,
    );
    if (!result.isSuccess) {
      return DataProcessResult.failure(
        result.errorCode ?? 'STORE_FAILED',
        result.errorMessage ?? 'storeDocument failed',
      );
    }
    return DataProcessResult.success(record);
  }

  /**
   * Bootstrap-only. Caller MUST run inside MASTER_TENANT_ID CLS context.
   * (The bootstrap seeder wraps the call with `cls.run + cls.set` — see
   * engine-bootstrapper.ts seedFlowRegistry pattern for reference.)
   */
  async storeGlobalTemplate(t: TenantTopology): Promise<DataProcessResult<TenantTopology>> {
    const tenantId = this.cls.get<TenantContext>(TENANT_CONTEXT_KEY)?.tenantId;
    if (tenantId !== MASTER_TENANT_ID) {
      return DataProcessResult.failure(
        'NOT_MASTER_TENANT',
        'storeGlobalTemplate requires MASTER_TENANT_ID context',
      );
    }
    const record: TenantTopology = {
      ...t,
      tenantId,
      connectionType: CONNECTION_TYPES.FLOW_SCOPED, // v24 Finding GG + v27 Finding OO
      updatedAt: new Date().toISOString(),
    };
    const docId = `${record.flowId}::${tenantId}::${record.version}`;
    const result = await this.db.storeDocument(
      FLOW_TEMPLATES_INDEX,
      record as unknown as Record<string, unknown>,
      docId,
    );
    if (!result.isSuccess) {
      return DataProcessResult.failure(
        result.errorCode ?? 'STORE_FAILED',
        result.errorMessage ?? 'storeDocument failed',
      );
    }
    return DataProcessResult.success(record);
  }

  async listPrivate(filters?: {
    flowId?: string;
    status?: TenantTopology['status'];
  }): Promise<DataProcessResult<TenantTopology[]>> {
    const tenantId = this.cls.get<TenantContext>(TENANT_CONTEXT_KEY)?.tenantId;
    if (!tenantId) {
      return DataProcessResult.failure('NO_TENANT', 'Tenant context required');
    }
    const result = await this.db.searchDocuments(TENANT_TOPOLOGIES_INDEX, filters ?? {}, 200);
    if (!result.isSuccess) {
      return DataProcessResult.failure(
        result.errorCode ?? 'SEARCH_FAILED',
        result.errorMessage ?? 'searchDocuments failed',
      );
    }
    return DataProcessResult.success((result.data ?? []) as unknown as TenantTopology[]);
  }

  /**
   * IR-TOPO-3: switches CLS scope to MASTER_TENANT_ID to read global templates.
   *
   * ANNOTATION (v11 Finding E — corrected in v10):
   * `cls.runWith()` DOES exist in nestjs-cls (used at fresh-tenant-test.service.ts:203
   * and main.ts:168). Both `cls.runWith({KEY: value}, fn)` and
   * `cls.run(async () => { cls.set(KEY, value); ... })` are valid patterns.
   * We use `cls.run + cls.set` here to MATCH the engine-bootstrapper pattern at
   * line 488 — the seedFlowRegistry pattern this code's CLS scope switch mirrors.
   * Consistency with the bootstrap seeding template (audit Section I) is the reason.
   */
  async listGlobalTemplates(): Promise<DataProcessResult<TenantTopology[]>> {
    return this.cls.run(async () => {
      const systemCtx = this.buildMasterTenantContext();
      this.cls.set(TENANT_CONTEXT_KEY, systemCtx);
      const result = await this.db.searchDocuments(FLOW_TEMPLATES_INDEX, {}, 200);
      if (!result.isSuccess) {
        return DataProcessResult.failure<TenantTopology[]>(
          result.errorCode ?? 'SEARCH_FAILED',
          result.errorMessage ?? 'searchDocuments failed',
        );
      }
      return DataProcessResult.success((result.data ?? []) as unknown as TenantTopology[]);
    });
  }

  async getById(
    flowId: string,
    version?: string,
  ): Promise<DataProcessResult<TenantTopology | null>> {
    // Track 0 Turn 13 — when no explicit version is requested, return the
    //   LATEST non-ARCHIVED version: prefer PUBLISHED, then DRAFT, then
    //   highest topologyVersion. Prevents returning a stale ARCHIVED record
    //   when multiple versions exist (e.g. after promoteDraft).
    const priv = await this.listPrivate({ flowId });
    if (priv.isSuccess && priv.data && priv.data.length > 0) {
      const match = version
        ? priv.data.find((t) => t.version === version)
        : this.selectLatest(priv.data);
      if (match) return DataProcessResult.success<TenantTopology | null>(match);
    }
    const globals = await this.listGlobalTemplates();
    if (globals.isSuccess && globals.data) {
      const filtered = globals.data.filter((t) => t.flowId === flowId);
      const match = version
        ? filtered.find((t) => t.version === version)
        : this.selectLatest(filtered);
      if (match) return DataProcessResult.success<TenantTopology | null>(match);
    }
    return DataProcessResult.success<TenantTopology | null>(null);
  }

  /**
   * Track 0 Turn 13 — pick the latest non-ARCHIVED version.
   * Priority: PUBLISHED > DRAFT > ARCHIVED, tie-break by topologyVersion desc.
   */
  private selectLatest(records: TenantTopology[]): TenantTopology | undefined {
    if (records.length === 0) return undefined;
    const priority = (status: TenantTopology['status']): number =>
      status === 'PUBLISHED' ? 2 : status === 'DRAFT' ? 1 : 0;
    return [...records].sort((a, b) => {
      const p = priority(b.status) - priority(a.status);
      if (p !== 0) return p;
      return (b.topologyVersion ?? 1) - (a.topologyVersion ?? 1);
    })[0];
  }

  /**
   * Track 0 Turn 13 — update a DRAFT topology in place.
   * Rejects attempts to mutate PUBLISHED or ARCHIVED records (IMMUTABLE).
   * Tenant scope enforced via storePrivate (DNA-5).
   */
  async updateDraft(
    flowId: string,
    patch: Partial<Omit<TenantTopology, 'flowId' | 'tenantId' | 'connectionType' | 'createdAt'>>,
  ): Promise<DataProcessResult<TenantTopology>> {
    const current = await this.getById(flowId);
    if (!current.isSuccess || !current.data) {
      return DataProcessResult.failure('FLOW_NOT_FOUND', `Flow ${flowId} not found`);
    }
    if (current.data.status !== 'DRAFT') {
      return DataProcessResult.failure(
        'IMMUTABLE_STATE',
        `Cannot mutate ${current.data.status} topology. Create a new DRAFT version via forkAsDraft.`,
      );
    }
    // Merge patch; storePrivate overwrites tenantId + connectionType (DNA-5)
    const merged: Omit<TenantTopology, 'tenantId' | 'connectionType'> = {
      ...current.data,
      ...patch,
      flowId: current.data.flowId, // never change flowId on update
      createdAt: current.data.createdAt,
      updatedAt: new Date().toISOString(),
    };
    return this.storePrivate(merged);
  }

  /**
   * Track 0 Turn 13 — promote a DRAFT to PUBLISHED (e.g. after teach/QA approval).
   * Does NOT mutate in place; creates a NEW document with topologyVersion+1,
   * flipping the prior DRAFT's status to ARCHIVED. parentVersion links the chain.
   */
  async promoteDraft(flowId: string): Promise<DataProcessResult<TenantTopology>> {
    const current = await this.getById(flowId);
    if (!current.isSuccess || !current.data) {
      return DataProcessResult.failure('FLOW_NOT_FOUND', `Flow ${flowId} not found`);
    }
    if (current.data.status !== 'DRAFT') {
      return DataProcessResult.failure(
        'NOT_DRAFT',
        `Only DRAFT topologies can be promoted (found: ${current.data.status})`,
      );
    }

    const now = new Date().toISOString();
    const newVersionNum = (current.data.topologyVersion ?? 1) + 1;
    const newVersionStr = `v${newVersionNum}`;

    // Archive the prior DRAFT (mutation of DRAFT is allowed → flips to ARCHIVED)
    const archiveResult = await this.storePrivate({
      ...current.data,
      status: 'ARCHIVED',
      updatedAt: now,
    });
    if (!archiveResult.isSuccess) {
      return DataProcessResult.failure(
        archiveResult.errorCode ?? 'ARCHIVE_FAILED',
        archiveResult.errorMessage ?? 'failed to archive prior version',
      );
    }

    // Create the new PUBLISHED version
    const promoted: Omit<TenantTopology, 'tenantId' | 'connectionType'> = {
      ...current.data,
      version: newVersionStr,
      status: 'PUBLISHED',
      topologyVersion: newVersionNum,
      parentVersion: { flowId: current.data.flowId, version: current.data.version },
      createdAt: now,
      updatedAt: now,
    };
    return this.storePrivate(promoted);
  }

  /**
   * Track 0 Turn 13 — create a new DRAFT derived from a PUBLISHED topology.
   * Same flowId, new version (current+1), status=DRAFT, parentVersion link.
   * This is the teach/QA starting point — iterate as DRAFT, then promoteDraft.
   */
  async forkAsDraft(flowId: string): Promise<DataProcessResult<TenantTopology>> {
    const current = await this.getById(flowId);
    if (!current.isSuccess || !current.data) {
      return DataProcessResult.failure('FLOW_NOT_FOUND', `Flow ${flowId} not found`);
    }
    if (current.data.status !== 'PUBLISHED') {
      return DataProcessResult.failure(
        'NOT_PUBLISHED',
        `Only PUBLISHED topologies can be forked to DRAFT (found: ${current.data.status})`,
      );
    }
    const now = new Date().toISOString();
    const newVersionNum = (current.data.topologyVersion ?? 1) + 1;
    const draft: Omit<TenantTopology, 'tenantId' | 'connectionType'> = {
      ...current.data,
      version: `v${newVersionNum}-draft`,
      status: 'DRAFT',
      topologyVersion: newVersionNum,
      parentVersion: { flowId: current.data.flowId, version: current.data.version },
      createdAt: now,
      updatedAt: now,
    };
    return this.storePrivate(draft);
  }

  async forkToPrivate(
    sourceFlowId: string,
    newFlowId: string,
  ): Promise<DataProcessResult<TenantTopology>> {
    const globals = await this.listGlobalTemplates();
    const source = globals.data?.find((t) => t.flowId === sourceFlowId);
    if (!source) {
      return DataProcessResult.failure(
        'SOURCE_NOT_FOUND',
        `Global template ${sourceFlowId} not found`,
      );
    }
    if (source.knowledgeScope !== 'GLOBAL') {
      return DataProcessResult.failure('NOT_FORKABLE', 'Only GLOBAL templates can be forked');
    }
    const now = new Date().toISOString();
    const forked: Omit<TenantTopology, 'tenantId' | 'connectionType'> = {
      ...source,
      flowId: newFlowId,
      knowledgeScope: 'PRIVATE',
      status: 'DRAFT',
      sourceRunId: undefined,
      // ISSUE C FIX (v9): topologyVersion/parentVersion not added — Turn 13 work
      metadata: { ...(source.metadata ?? {}), forkedFrom: sourceFlowId },
      createdAt: now,
      updatedAt: now,
    };
    return this.storePrivate(forked);
  }

  /**
   * Turn 4 (MVP Plan v3, Goal 3) — admin cross-tenant read of flow topologies.
   *
   * Reads the caller's current CLS context; only MASTER_TENANT_ID (operator) may
   * invoke. On entry writes an audit log record to xiigen-admin-audit, then
   * switches CLS scope to `targetTenantId` and runs listPrivate() inside that
   * scope. The inner scope is bounded by this.cls.run so it cannot leak — the
   * caller's original context is restored automatically on return.
   *
   * ARCH-025 + GAP-SCOPE-05 compliance: deliberate scope switch, logged.
   * Consistent with listGlobalTemplates which uses the same cls.run + cls.set
   * pattern to switch into MASTER_TENANT_ID for the engine-bootstrapper path.
   */
  async listByTenant(targetTenantId: string): Promise<DataProcessResult<TenantTopology[]>> {
    const caller = this.cls.get<TenantContext>(TENANT_CONTEXT_KEY);
    if (caller?.tenantId !== MASTER_TENANT_ID) {
      return DataProcessResult.failure<TenantTopology[]>(
        'NOT_ADMIN',
        'listByTenant requires MASTER_TENANT_ID (admin/operator) CLS context',
      );
    }
    if (!targetTenantId || typeof targetTenantId !== 'string') {
      return DataProcessResult.failure<TenantTopology[]>(
        'INVALID_TARGET',
        'targetTenantId required',
      );
    }

    // Audit write first — stored in the admin's (MASTER) scope so audit records
    // are never hidden inside the target tenant's scope.
    const auditResult = await this.db.storeDocument(
      ADMIN_AUDIT_INDEX,
      {
        action: 'listByTenant',
        adminTenantId: caller.tenantId,
        targetTenantId,
        timestamp: new Date().toISOString(),
      },
      `listByTenant:${targetTenantId}:${Date.now()}`,
    );
    if (!auditResult.isSuccess) {
      return DataProcessResult.failure<TenantTopology[]>(
        auditResult.errorCode ?? 'AUDIT_WRITE_FAILED',
        auditResult.errorMessage ?? 'admin audit write failed',
      );
    }

    return this.cls.run(async () => {
      this.cls.set(TENANT_CONTEXT_KEY, this.buildTargetTenantContext(targetTenantId));
      const result = await this.db.searchDocuments(TENANT_TOPOLOGIES_INDEX, {}, 200);
      if (!result.isSuccess) {
        return DataProcessResult.failure<TenantTopology[]>(
          result.errorCode ?? 'SEARCH_FAILED',
          result.errorMessage ?? 'searchDocuments failed',
        );
      }
      return DataProcessResult.success((result.data ?? []) as unknown as TenantTopology[]);
    });
  }

  /**
   * Turn 4 — build a minimal TenantContext for the target tenant during admin
   * scope switch. Mirrors buildMasterTenantContext but uses the target's id.
   * Name and plan are placeholders; they're only used for logging (never for
   * authorisation — the admin check above is the authorisation gate).
   */
  private buildTargetTenantContext(targetTenantId: string): TenantContext {
    const now = new Date().toISOString();
    const record: TenantRecord = {
      id: targetTenantId,
      name: `admin-view:${targetTenantId}`,
      status: 'active',
      plan: {
        name: 'free',
        maxApiCallsPerMinute: 60,
        maxTokensPerDay: 100_000,
        maxStorageMb: 500,
      },
      configOverrides: {},
      apiKeys: {},
      createdAt: now,
      updatedAt: now,
    };
    return new TenantContext(record);
  }

  /**
   * ANNOTATION (Pass 2 + v10 Finding I): port from server/src/bootstrap/engine-bootstrapper.ts
   * seedFlowRegistry systemTenant builder (lines ~470-490 per Turn 1 audit Section I).
   *
   * TenantContext constructor takes a TenantRecord with 8 required fields verified at
   * audit Section H against server/src/kernel/multi-tenant/tenant-context.ts:
   *   1. id              — string (here: MASTER_TENANT_ID, NOT 'system' per v25 Arbiter 7)
   *   2. name            — string
   *   3. status          — 'active' | 'inactive' | 'suspended'
   *   4. plan            — { name, maxApiCallsPerMinute, maxTokensPerDay, maxStorageMb }
   *   5. configOverrides — Record<string, unknown>
   *   6. apiKeys         — Record<string, string>
   *   7. createdAt       — ISO string
   *   8. updatedAt       — ISO string
   *
   * (v25 Arbiter 7) CRITICAL: substitute MASTER_TENANT_ID for the 'system' id used in
   * seedFlowRegistry's pattern. Copying the pattern verbatim would produce id: 'system'
   * which would fail the MASTER_TENANT_ID check in storeGlobalTemplate.
   */
  private buildMasterTenantContext(): TenantContext {
    const now = new Date().toISOString();
    const record: TenantRecord = {
      id: MASTER_TENANT_ID,
      name: 'XIIGen Master',
      status: 'active',
      plan: {
        name: 'free',
        maxApiCallsPerMinute: 1000,
        maxTokensPerDay: 10_000_000,
        maxStorageMb: 10_000,
      },
      configOverrides: {},
      apiKeys: {},
      createdAt: now,
      updatedAt: now,
    };
    return new TenantContext(record);
  }
}
