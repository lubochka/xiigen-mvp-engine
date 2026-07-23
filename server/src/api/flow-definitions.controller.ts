/**
 * FlowDefinitionsController — REST endpoints for per-tenant flow definitions.
 *
 * Introduced by Track 0 Turn 5.
 *
 * Endpoints (5):
 *   GET    /api/flows/definitions           — list tenant + global flows
 *   GET    /api/flows/definitions/:flowId   — load single flow (private first, fallback global)
 *   POST   /api/flows/definitions           — save (upsert) a private flow
 *   POST   /api/flows/definitions/:flowId/fork    — fork GLOBAL → PRIVATE (Turn 12+ integration)
 *   POST   /api/flows/definitions/:flowId/freedom — 501 stub for now (FREEDOM config; future work)
 *
 * Registered in server/src/api/api.module.ts (v13 Finding Q — mandatory):
 *   controllers: [..., FlowDefinitionsController]
 *   providers:  [..., FlowDefinitionsMapper]
 *
 * DNA-5: tenantId from CLS; client-provided values ignored.
 * DNA-3: never throws; returns DataProcessResult-shaped error payload on failure.
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Query,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { TenantNode, TenantEdge, TenantTopologyStore } from '../engine/tenant-topology-store';
import {
  FlowDefinitionsMapper,
  ClientFlowDefinition,
  ClientFlowSummary,
} from './flow-definitions.mapper';

/**
 * Turn 5 (MVP Plan v3, Goal 4a) — PUT /nodes body shape.
 * Client-facing snake_case mirrors ClientFlowDefinition.nodes/edges so the
 * Designer's existing serialization works without translation.
 */
interface UpdateNodesBody {
  nodes?: Array<{
    node_id?: string;
    type?: string;
    name?: string;
    factory_id?: string;
    interface_name?: string;
    fabric_type?: string;
    config?: Record<string, unknown>;
  }>;
  edges?: Array<{
    from?: string;
    to?: string;
    event?: string;
    condition?: string;
  }>;
}

/**
 * Turn 5 (MVP Plan v3) — PUT /freedom body shape. Stored at
 * TenantTopology.metadata.freedomConfig; the store's updateDraft rejects
 * non-DRAFT targets (IR-ADAPT-1: published flows are immutable).
 */
interface UpdateFreedomBody {
  freedomConfig?: Record<string, unknown>;
}

@Controller('api/flows/definitions')
export class FlowDefinitionsController {
  private readonly logger = new Logger(FlowDefinitionsController.name);

  constructor(
    private readonly store: TenantTopologyStore,
    private readonly mapper: FlowDefinitionsMapper,
  ) {}

  /**
   * GET /api/flows/definitions
   *   List all tenant-visible flows: PRIVATE (owned) + GLOBAL (templates).
   *   Lightweight summaries — use getById for full nodes/edges.
   *
   * Turn 3 (MVP Plan v3, Goal 2) query params:
   *   ?flowId=FLOW-XYZ&includeVersions=true → return a version chain for one flow.
   *     Response shape adds `versions: ClientFlowSummary[]` (sorted newest → oldest
   *     by topologyVersion, status priority PUBLISHED > DRAFT > ARCHIVED as tiebreak).
   *     The `flows` array mirrors the filtered result so existing list consumers
   *     keep working without a branch.
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async list(
    @Query('scope') scope?: 'private' | 'global' | 'all',
    @Query('flowId') flowId?: string,
    @Query('includeVersions') includeVersions?: string,
  ): Promise<
    { flows: ClientFlowSummary[]; versions?: ClientFlowSummary[] } | { error: string; code: string }
  > {
    const effectiveScope = scope ?? 'all';
    const wantsVersions = includeVersions === 'true' && Boolean(flowId);
    const summaries: ClientFlowSummary[] = [];

    if (effectiveScope === 'private' || effectiveScope === 'all') {
      // Turn 3: when flowId supplied, prefer the narrower listPrivate({flowId}) path.
      const priv = flowId
        ? await this.store.listPrivate({ flowId })
        : await this.store.listPrivate();
      if (!priv.isSuccess) {
        return {
          error: priv.errorMessage ?? 'list private failed',
          code: priv.errorCode ?? 'LIST_FAILED',
        };
      }
      for (const t of priv.data ?? []) summaries.push(this.mapper.toSummary(t));
    }

    if (effectiveScope === 'global' || effectiveScope === 'all') {
      const globals = await this.store.listGlobalTemplates();
      if (!globals.isSuccess) {
        return {
          error: globals.errorMessage ?? 'list global failed',
          code: globals.errorCode ?? 'LIST_FAILED',
        };
      }
      // Turn 3: apply flowId filter client-side for globals — listGlobalTemplates
      // returns all templates; filtering here avoids a store API change.
      const filtered = flowId
        ? (globals.data ?? []).filter((t) => t.flowId === flowId)
        : (globals.data ?? []);
      for (const t of filtered) summaries.push(this.mapper.toSummary(t));
    }

    if (wantsVersions) {
      // Sort version chain newest → oldest.
      // Priority: PUBLISHED (2) > DRAFT (1) > ARCHIVED (0); tie-break by
      //   topologyVersion desc, then updated_at desc.
      const priority = (status: string): number =>
        status === 'PUBLISHED' ? 2 : status === 'DRAFT' ? 1 : 0;
      const versions = [...summaries].sort((a, b) => {
        const p = priority(b.status) - priority(a.status);
        if (p !== 0) return p;
        return b.updated_at.localeCompare(a.updated_at);
      });
      return { flows: summaries, versions };
    }

    return { flows: summaries };
  }

  /**
   * GET /api/flows/definitions/:flowId
   *   Load a single flow. Private-first, falls back to global template.
   *
   * Turn 3 (MVP Plan v3, Goal 2): optional `?version=` query param selects a
   * specific stored version. Absent → latest (store's PUBLISHED > DRAFT priority).
   */
  @Get(':flowId')
  @HttpCode(HttpStatus.OK)
  async getById(
    @Param('flowId') flowId: string,
    @Query('version') version?: string,
  ): Promise<ClientFlowDefinition | { error: string; code: string }> {
    const result = await this.store.getById(flowId, version);
    if (!result.isSuccess) {
      return { error: result.errorMessage ?? 'get failed', code: result.errorCode ?? 'GET_FAILED' };
    }
    if (!result.data) {
      const versionSuffix = version ? ` (version ${version})` : '';
      return { error: `Flow not found: ${flowId}${versionSuffix}`, code: 'FLOW_NOT_FOUND' };
    }
    return this.mapper.toClient(result.data);
  }

  /**
   * POST /api/flows/definitions
   *   Upsert a private flow for the current tenant.
   *   If flow_id is absent, generates a new one. DNA-5: tenantId overwritten by ALS.
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async save(
    @Body() body: ClientFlowDefinition,
  ): Promise<ClientFlowDefinition | { error: string; code: string }> {
    if (!body || typeof body !== 'object') {
      return { error: 'Request body required', code: 'MISSING_BODY' };
    }
    if (!Array.isArray(body.nodes)) {
      return { error: 'nodes[] required', code: 'MISSING_NODES' };
    }
    const payload = this.mapper.fromClient({
      ...body,
      flow_id: body.flow_id ?? `FLOW-USER-${randomUUID().slice(0, 8).toUpperCase()}`,
      name: body.name ?? 'Untitled Flow',
      version: body.version ?? 'v1',
      edges: Array.isArray(body.edges) ? body.edges : [],
    });
    const result = await this.store.storePrivate(payload);
    if (!result.isSuccess) {
      return {
        error: result.errorMessage ?? 'save failed',
        code: result.errorCode ?? 'SAVE_FAILED',
      };
    }
    return this.mapper.toClient(result.data!);
  }

  /**
   * POST /api/flows/definitions/:flowId/fork
   *   Fork a GLOBAL template into a new PRIVATE flow for the current tenant.
   *   Fork button is disabled in FlowLibraryPage (v8 Finding 8.16) until Turn 15
   *   wires the FLOW-18 marketplace publish path. Endpoint returns the forked record.
   */
  @Post(':flowId/fork')
  @HttpCode(HttpStatus.OK)
  async fork(
    @Param('flowId') flowId: string,
  ): Promise<ClientFlowDefinition | { error: string; code: string }> {
    const newFlowId = `FLOW-FORK-${randomUUID().slice(0, 8).toUpperCase()}`;
    const result = await this.store.forkToPrivate(flowId, newFlowId);
    if (!result.isSuccess) {
      return {
        error: result.errorMessage ?? 'fork failed',
        code: result.errorCode ?? 'FORK_FAILED',
      };
    }
    return this.mapper.toClient(result.data!);
  }

  /**
   * Turn 5 (MVP Plan v3, Goal 4a) — PUT /api/flows/definitions/:flowId/nodes
   *   Structural adaptation of a DRAFT topology. Accepts a full
   *   { nodes, edges } replacement; updateDraft rejects PUBLISHED/ARCHIVED
   *   targets with IMMUTABLE_STATE (iron rule IR-ADAPT-1).
   *
   *   BFA gates are NOT run here — the plan spec defers validation to
   *   promoteDraft so DRAFT remains a workspace. Design matches Track 0
   *   Turn 13's DRAFT=mutable / PUBLISHED=validated split.
   */
  @Put(':flowId/nodes')
  @HttpCode(HttpStatus.OK)
  async updateNodes(
    @Param('flowId') flowId: string,
    @Body() body: UpdateNodesBody,
  ): Promise<ClientFlowDefinition | { error: string; code: string }> {
    if (!body || typeof body !== 'object') {
      return { error: 'Request body required', code: 'MISSING_BODY' };
    }
    if (!Array.isArray(body.nodes)) {
      return { error: 'nodes[] required', code: 'MISSING_NODES' };
    }

    const nodes: TenantNode[] = body.nodes.map((n) => ({
      nodeId: n.node_id ?? '',
      archetype: n.type ?? 'unknown',
      name: n.name ?? n.node_id ?? 'unnamed',
      factoryId: n.factory_id,
      interfaceName: n.interface_name,
      fabric: n.fabric_type,
      config: n.config,
    }));
    const edges: TenantEdge[] = (body.edges ?? []).map((e) => ({
      from: e.from ?? '',
      to: e.to ?? '',
      event: e.event,
      condition: e.condition,
    }));

    const result = await this.store.updateDraft(flowId, {
      nodes,
      edges,
      updatedAt: new Date().toISOString(),
    });
    if (!result.isSuccess) {
      // IMMUTABLE_STATE → 409 via error code; HTTP stays 200 (DNA-3 shape).
      return {
        error: result.errorMessage ?? 'update failed',
        code: result.errorCode ?? 'UPDATE_FAILED',
      };
    }
    return this.mapper.toClient(result.data!);
  }

  /**
   * Turn 5 (MVP Plan v3) — PUT /api/flows/definitions/:flowId/freedom
   *   Implements the 501 stub. Stores the caller's freedomConfig under
   *   TenantTopology.metadata.freedomConfig. DRAFT-only (same iron rule as
   *   /nodes — FREEDOM overrides affect flow behaviour, so they only apply
   *   to the mutable workspace).
   */
  @Put(':flowId/freedom')
  @HttpCode(HttpStatus.OK)
  async setFreedomConfig(
    @Param('flowId') flowId: string,
    @Body() body: UpdateFreedomBody,
  ): Promise<ClientFlowDefinition | { error: string; code: string }> {
    if (!body || typeof body !== 'object' || typeof body.freedomConfig !== 'object') {
      return {
        error: 'freedomConfig object required',
        code: 'MISSING_FREEDOM_CONFIG',
      };
    }

    const current = await this.store.getById(flowId);
    if (!current.isSuccess || !current.data) {
      return { error: `Flow not found: ${flowId}`, code: 'FLOW_NOT_FOUND' };
    }
    const merged = {
      metadata: {
        ...(current.data.metadata ?? {}),
        freedomConfig: body.freedomConfig,
      },
      updatedAt: new Date().toISOString(),
    };
    const result = await this.store.updateDraft(flowId, merged);
    if (!result.isSuccess) {
      return {
        error: result.errorMessage ?? 'update failed',
        code: result.errorCode ?? 'UPDATE_FAILED',
      };
    }
    this.logger.debug(`FREEDOM config updated for ${flowId}`);
    return this.mapper.toClient(result.data!);
  }
}
