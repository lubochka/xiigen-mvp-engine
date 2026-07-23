/**
 * TenantHttpController — NestJS @Controller that exposes TenantController methods
 * as HTTP endpoints.
 *
 * Routes:
 *   POST   /api/tenants               — create tenant
 *   GET    /api/tenants               — list tenants
 *   GET    /api/tenants/:id           — get tenant details
 *   PUT    /api/tenants/:id/config    — update tenant FREEDOM config
 *   PUT    /api/tenants/:id/keys      — set per-tenant API keys (BYOK ingestion path)
 *   PUT    /api/tenants/:id/quotas    — set per-tenant quotas
 *   DELETE /api/tenants/:id          — soft-delete (deactivate)
 *
 * Key provisioning flow (replaces BOOTSTRAP_* env vars after first setup):
 *   PUT /api/tenants/{masterTenantId}/keys
 *   Body: { anthropic: 'sk-ant-...', openai: 'sk-...', gemini: 'AIza...' }
 *   → ByokKeyStoreService encrypts + persists to xiigen-byok-keys
 *   → TenantContextMiddleware loads per-request from ES on subsequent calls
 *
 * S21: HTTP wiring for TenantController service.
 */

import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Optional,
} from '@nestjs/common';
import { TenantController } from './tenant.controller';
import { CreateTenantInput } from '../kernel/multi-tenant/tenant-registry.service';
import { TenantTopologyStore } from '../engine/tenant-topology-store';
import { FlowDefinitionsMapper, ClientFlowSummary } from './flow-definitions.mapper';

@Controller('api/tenants')
export class TenantHttpController {
  constructor(
    private readonly tenant: TenantController,
    // Turn 4 (MVP Plan v3, Goal 3) — @Optional() keeps existing 1-arg test
    // instantiations (`new TenantHttpController(tenantCtrl)`) compiling.
    @Optional() private readonly topologyStore?: TenantTopologyStore,
    @Optional() private readonly flowMapper?: FlowDefinitionsMapper,
  ) {}

  // ─── POST /api/tenants ────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: Record<string, unknown>) {
    const result = await this.tenant.create(body as unknown as CreateTenantInput);
    if (!result.isSuccess) return { error: result.errorMessage, code: result.errorCode };
    return result.data;
  }

  // ─── GET /api/tenants ─────────────────────────────────────────────────────

  @Get()
  async list() {
    const result = await this.tenant.list();
    if (!result.isSuccess) return { error: result.errorMessage, code: result.errorCode };
    return result.data;
  }

  // ─── GET /api/tenants/:id ─────────────────────────────────────────────────

  @Get(':id')
  async getById(@Param('id') id: string) {
    const result = await this.tenant.getById(id);
    if (!result.isSuccess) return { error: result.errorMessage, code: result.errorCode };
    return result.data;
  }

  // ─── PUT /api/tenants/:id/config ──────────────────────────────────────────

  @Put(':id/config')
  async updateConfig(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    const result = await this.tenant.updateConfig(id, body);
    if (!result.isSuccess) return { error: result.errorMessage, code: result.errorCode };
    return result.data;
  }

  // ─── PUT /api/tenants/:id/keys ────────────────────────────────────────────

  @Put(':id/keys')
  async setKeys(@Param('id') id: string, @Body() body: Record<string, string>) {
    const result = await this.tenant.setKeys(id, body);
    if (!result.isSuccess) return { error: result.errorMessage, code: result.errorCode };
    return result.data;
  }

  // ─── PUT /api/tenants/:id/quotas ──────────────────────────────────────────

  @Put(':id/quotas')
  async setQuotas(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    const result = await this.tenant.setQuotas(id, body);
    if (!result.isSuccess) return { error: result.errorMessage, code: result.errorCode };
    return result.data;
  }

  // ─── GET /api/tenants/:id/flows ───────────────────────────────────────────
  // Turn 4 (MVP Plan v3, Goal 3) — admin reads target tenant's flow topologies
  // via deliberate CLS scope switch. Authorisation + audit handled by
  // TenantTopologyStore.listByTenant (requires MASTER_TENANT_ID caller context,
  // writes xiigen-admin-audit record before the switch).

  @Get(':id/flows')
  async listFlows(
    @Param('id') id: string,
  ): Promise<{ flows: ClientFlowSummary[] } | { error: string; code: string }> {
    if (!this.topologyStore || !this.flowMapper) {
      return {
        error: 'Admin flow view requires TenantTopologyStore + FlowDefinitionsMapper',
        code: 'DEPENDENCIES_MISSING',
      };
    }
    const result = await this.topologyStore.listByTenant(id);
    if (!result.isSuccess) {
      return {
        error: result.errorMessage ?? 'listByTenant failed',
        code: result.errorCode ?? 'LIST_FAILED',
      };
    }
    const summaries = (result.data ?? []).map((t) => this.flowMapper!.toSummary(t));
    return { flows: summaries };
  }

  // ─── DELETE /api/tenants/:id ──────────────────────────────────────────────

  @Delete(':id')
  async deactivate(@Param('id') id: string) {
    const result = await this.tenant.deactivate(id);
    if (!result.isSuccess) return { error: result.errorMessage, code: result.errorCode };
    return result.data;
  }
}
