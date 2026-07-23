/**
 * FlowHttpController — NestJS @Controller that exposes all FlowApiController
 * methods as HTTP endpoints.
 *
 * Routes:
 *   POST   /api/flow/execute                — execute a flow run
 *   GET    /api/runs/:runId/trace           — get run trace
 *   GET    /api/prompts/:taskTypeId         — get prompt
 *   PUT    /api/prompts/:taskTypeId         — upsert prompt
 *   DELETE /api/prompts/:taskTypeId         — deactivate prompt
 *   POST   /api/rag/search                 — search RAG patterns
 *   GET    /api/flow/:flowId/state         — get flow state snapshot
 *   GET    /api/lifecycle/flows/:flowId    — get lifecycle status
 *   PUT    /api/lifecycle/flows/:flowId    — update lifecycle status (CAS)
 *   POST   /api/promotion/promote          — evaluate promotion
 *
 * NOTE: TenantContextMiddleware is globally applied in AppModule —
 * do NOT add @UseGuards(TenantGuard) here (would conflict with the
 * global middleware and produce duplicate 403 responses).
 *
 * S21: HTTP controller wiring.
 */

import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Roles } from '../auth/roles.decorator';
import { ROLE_PLATFORM_ADMIN, ROLE_TENANT_ADMIN, ROLE_TENANT_USER } from '../kernel/role-strings';
import { FlowApiController } from './flow-api.controller';
import { SCOPED_MEMORY_SERVICE } from '../fabrics/interfaces/scoped-memory.interface';
import { SCHEDULER_SERVICE } from '../fabrics/interfaces/scheduler.interface';

@Controller('api')
export class FlowHttpController {
  constructor(
    private readonly api: FlowApiController,
    private readonly moduleRef: ModuleRef,
  ) {}

  // ─── POST /api/flow/execute ────────────────────────────────────────────────

  @Post('flow/execute')
  @Roles(ROLE_TENANT_USER, ROLE_TENANT_ADMIN, ROLE_PLATFORM_ADMIN)
  @HttpCode(HttpStatus.OK)
  async executeFlow(
    @Body()
    body: {
      contract: Record<string, unknown>;
      inputs: Record<string, unknown>;
      tenantId?: string;
      flowId?: string;
      /** Z-1: Links to PROJECT_UNDERSTANDING for context-derived generation. */
      projectId?: string;
      /** Z-1: Provider overrides for this run — values are provider names, not stack labels. */
      runtimeHints?: { [interfaceName: string]: string | undefined };
    },
  ) {
    return this.api.executeFlow(body.contract, body.inputs ?? {}, {
      tenantId: body.tenantId,
      flowId: body.flowId,
      projectId: body.projectId,
      runtimeHints: body.runtimeHints,
    });
  }

  // ─── GET /api/runs/:runId/trace ────────────────────────────────────────────

  @Get('runs/:runId/trace')
  @Roles(ROLE_TENANT_USER, ROLE_TENANT_ADMIN, ROLE_PLATFORM_ADMIN)
  async getRunTrace(@Param('runId') runId: string) {
    return this.api.getRunTrace(runId);
  }

  // ─── GET /api/prompts/:taskTypeId ──────────────────────────────────────────

  @Get('prompts/:taskTypeId')
  async getPrompt(
    @Param('taskTypeId') taskTypeId: string,
    @Query('promptType') promptType: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.api.getPrompt(taskTypeId, promptType, tenantId);
  }

  // ─── PUT /api/prompts/:taskTypeId ──────────────────────────────────────────

  @Put('prompts/:taskTypeId')
  async upsertPrompt(
    @Param('taskTypeId') taskTypeId: string,
    @Body()
    body: {
      promptType: string;
      content: string;
      version: string;
      systemPrompt?: string;
      tenantId?: string;
    },
  ) {
    return this.api.upsertPrompt(taskTypeId, body);
  }

  // ─── DELETE /api/prompts/:taskTypeId ──────────────────────────────────────

  @Delete('prompts/:taskTypeId')
  async deactivatePrompt(
    @Param('taskTypeId') taskTypeId: string,
    @Query('promptType') promptType: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.api.deactivatePrompt(taskTypeId, promptType, tenantId);
  }

  // ─── POST /api/rag/search ──────────────────────────────────────────────────

  @Post('rag/search')
  @HttpCode(HttpStatus.OK)
  async searchRag(
    @Body()
    body: {
      namespace?: string;
      tags?: string[];
      filters?: Record<string, unknown>;
      size?: number;
    },
  ) {
    return this.api.searchRag(body);
  }

  // ─── GET /api/flow/:flowId/state ───────────────────────────────────────────

  @Get('flow/:flowId/state')
  async getFlowState(
    @Param('flowId') flowId: string,
    @Query('taskTypeId') taskTypeId?: string,
    @Query('tenantId') tenantId?: string,
    @Query('runId') runId?: string,
  ) {
    return this.api.getFlowState(flowId, { taskTypeId, tenantId, runId });
  }

  // ─── GET /api/lifecycle/flows/:flowId ─────────────────────────────────────

  @Get('lifecycle/flows/:flowId')
  async getLifecycleStatus(@Param('flowId') flowId: string) {
    const result = await this.api.getLifecycleStatus(flowId);
    // Gate Check 5 queries `.status` at top level via jq — expose record fields directly.
    if (result.isSuccess && result.data) {
      return result.data;
    }
    return result;
  }

  // ─── PUT /api/lifecycle/flows/:flowId ─────────────────────────────────────

  @Put('lifecycle/flows/:flowId')
  async updateLifecycleStatus(
    @Param('flowId') flowId: string,
    @Body() body: { status: string; expectedStatus?: string; updatedBy?: string },
  ) {
    return this.api.updateLifecycleStatus(flowId, body);
  }

  // ─── POST /api/promotion/promote ──────────────────────────────────────────

  @Post('promotion/promote')
  @HttpCode(HttpStatus.OK)
  async promoteTaskType(@Body() body: { taskTypeId: string; level: string; tenantId: string }) {
    return this.api.promoteTaskType(body.taskTypeId, body.level, body.tenantId);
  }

  // ─── GET /api/engine/check-fabric ─────────────────────────────────────────
  // Gate Check 10: IScopedMemoryService injectable
  // Gate Check 11: ISchedulerService injectable

  @Get('engine/check-fabric')
  async checkFabric() {
    const checks: Record<string, { injectable: boolean; token: string }> = {};

    const FABRIC_TOKENS: Array<{ name: string; token: string }> = [
      { name: 'IScopedMemoryService', token: SCOPED_MEMORY_SERVICE },
      { name: 'ISchedulerService', token: SCHEDULER_SERVICE },
    ];

    for (const { name, token } of FABRIC_TOKENS) {
      try {
        this.moduleRef.get(token, { strict: false });
        checks[name] = { injectable: true, token };
      } catch {
        checks[name] = { injectable: false, token };
      }
    }

    const allPassed = Object.values(checks).every((c) => c.injectable);
    return {
      isSuccess: allPassed,
      checks,
      gatePassed: allPassed,
    };
  }
}
