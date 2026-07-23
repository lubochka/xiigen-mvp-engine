/**
 * FlowApiController — REST API for the GenericNodeExecutor pipeline.
 *
 * POST   /api/flow/execute                — execute a flow run
 * GET    /api/runs/:runId/trace           — get run trace by ID
 * GET    /api/prompts/:taskTypeId         — list prompts for taskType
 * PUT    /api/prompts/:taskTypeId         — upsert prompt
 * DELETE /api/prompts/:taskTypeId         — deactivate prompt (soft delete)
 * POST   /api/rag/search                 — search RAG patterns
 * GET    /api/flow/:flowId/state         — get flow state snapshot
 * GET    /api/lifecycle/flows/:flowId    — get lifecycle status
 * PUT    /api/lifecycle/flows/:flowId    — update lifecycle status (CAS)
 * POST   /api/promotion/promote          — direct level promotion (Phase E gate)
 *
 * DNA-3: all methods return DataProcessResult, never throw.
 * DNA-8: trace store before any emit.
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../kernel/data-process-result';
import { ES_INDEX } from '../kernel/es-index-constants';
import { EngineContract } from '../engine-contracts/contract-schema';
import { GenericNodeExecutor } from '../engine/generic-node-executor';
import { PromptLibraryStation } from '../engine/prompt-library.station';
import { FlowStateSnapshotService } from '../engine/flow-state-snapshot.service';

@Injectable()
export class FlowApiController {
  private readonly logger = new Logger(FlowApiController.name);

  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    private readonly executor: GenericNodeExecutor,
    private readonly promptLibrary: PromptLibraryStation,
    private readonly snapshotService: FlowStateSnapshotService,
  ) {}

  // ─── POST /api/flow/execute ────────────────────────────────────────────────

  /**
   * Execute a flow run.
   * Body: { contract, inputs, tenantId?, flowId?, projectId?, runtimeHints?, stackTarget? }
   * Z-1: projectId links to PROJECT_UNDERSTANDING; runtimeHints are provider names (not stack labels).
   * D-0c: stackTarget routes HybridGenesisPrompt to the matching stackImplementations entry.
   */
  async executeFlow(
    contractData: Record<string, unknown>,
    inputs: Record<string, unknown>,
    options?: {
      tenantId?: string;
      flowId?: string;
      projectId?: string;
      runtimeHints?: { [interfaceName: string]: string | undefined };
      /** D-0c: Stack target for HybridGenesisPrompt routing. Defaults to 'node-nestjs:server'. */
      stackTarget?: string;
    },
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    if (!contractData || !contractData['taskTypeId']) {
      return DataProcessResult.failure(
        'INVALID_CONTRACT',
        'contractData with taskTypeId is required',
      );
    }
    const contract = contractData as unknown as EngineContract;

    const result = await this.executor.execute(contract, inputs, options);
    if (!result.isSuccess) {
      return DataProcessResult.failure(result.errorCode!, result.errorMessage!);
    }
    return DataProcessResult.success(result.data as unknown as Record<string, unknown>);
  }

  // ─── GET /api/runs/:runId/trace ────────────────────────────────────────────

  /** Get a stored run trace by runId. */
  async getRunTrace(runId: string): Promise<DataProcessResult<Record<string, unknown>>> {
    if (!runId) {
      return DataProcessResult.failure('MISSING_RUN_ID', 'runId is required');
    }
    const result = await this.executor.getTrace(runId);
    if (!result.isSuccess) {
      return DataProcessResult.failure(result.errorCode!, result.errorMessage!);
    }
    return DataProcessResult.success(result.data as unknown as Record<string, unknown>);
  }

  // ─── GET /api/prompts/:taskTypeId ──────────────────────────────────────────

  /**
   * Resolve the active prompt for a task type + promptType combination.
   * Query: promptType, tenantId?
   */
  async getPrompt(
    taskTypeId: string,
    promptType: string,
    tenantId?: string,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    if (!taskTypeId || !promptType) {
      return DataProcessResult.failure('MISSING_PARAMS', 'taskTypeId and promptType are required');
    }
    const result = await this.promptLibrary.resolvePrompt(taskTypeId, promptType, { tenantId });
    if (!result.isSuccess) {
      return DataProcessResult.failure(result.errorCode!, result.errorMessage!);
    }
    return DataProcessResult.success(result.data as unknown as Record<string, unknown>);
  }

  // ─── PUT /api/prompts/:taskTypeId ──────────────────────────────────────────

  /**
   * Upsert a prompt (creates new version).
   * Body: { promptType, content, version, systemPrompt?, tenantId? }
   */
  async upsertPrompt(
    taskTypeId: string,
    body: {
      promptType: string;
      content: string;
      version: string;
      systemPrompt?: string;
      tenantId?: string;
    },
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    if (!taskTypeId || !body.promptType || !body.content || !body.version) {
      return DataProcessResult.failure(
        'MISSING_PARAMS',
        'taskTypeId, promptType, content, and version are required',
      );
    }
    const result = await this.promptLibrary.updatePrompt(
      taskTypeId,
      body.promptType,
      body.content,
      body.version,
      { tenantId: body.tenantId, systemPrompt: body.systemPrompt },
    );
    if (!result.isSuccess) {
      return DataProcessResult.failure(result.errorCode!, result.errorMessage!);
    }
    return DataProcessResult.success(result.data as unknown as Record<string, unknown>);
  }

  // ─── DELETE /api/prompts/:taskTypeId ──────────────────────────────────────

  /**
   * Soft-delete (deactivate) prompts for a task type + promptType.
   * Query: promptType, tenantId?
   */
  async deactivatePrompt(
    taskTypeId: string,
    promptType: string,
    tenantId?: string,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    if (!taskTypeId || !promptType) {
      return DataProcessResult.failure('MISSING_PARAMS', 'taskTypeId and promptType are required');
    }
    const filters: Record<string, unknown> = { taskTypeId, promptType, active: true };
    if (tenantId) filters['tenantId'] = tenantId;

    const searchResult = await this.db.searchDocuments('xiigen-prompts', filters);
    if (!searchResult.isSuccess || !searchResult.data?.length) {
      return DataProcessResult.failure(
        'PROMPT_NOT_FOUND',
        `No active prompt for ${taskTypeId}/${promptType}`,
      );
    }

    let deactivated = 0;
    for (const prompt of searchResult.data) {
      const updated = { ...prompt, active: false };
      await this.db.storeDocument('xiigen-prompts', updated, String(prompt['promptId'] ?? ''));
      deactivated++;
    }

    return DataProcessResult.success({ deactivated, taskTypeId, promptType });
  }

  // ─── POST /api/rag/search ──────────────────────────────────────────────────

  /**
   * Search RAG patterns by namespace and tags.
   * Body: { namespace?, tags?: string[], filters?: Record<string,unknown>, size? }
   */
  async searchRag(body: {
    namespace?: string;
    tags?: string[];
    filters?: Record<string, unknown>;
    size?: number;
  }): Promise<DataProcessResult<Record<string, unknown>[]>> {
    const filters: Record<string, unknown> = { ...(body.filters ?? {}) };
    if (body.namespace) filters['namespace'] = body.namespace;
    if (body.tags?.length) filters['tags'] = body.tags;

    const result = await this.db.searchDocuments(ES_INDEX.RAG_PATTERNS, filters, body.size ?? 20);
    if (!result.isSuccess) {
      return DataProcessResult.failure(
        result.errorCode ?? 'RAG_SEARCH_FAILED',
        result.errorMessage ?? 'search failed',
      );
    }
    return DataProcessResult.success((result.data ?? []) as Record<string, unknown>[]);
  }

  // ─── GET /api/flow/:flowId/state ───────────────────────────────────────────

  /**
   * Get the latest flow state snapshot for a given flowId.
   * Query: taskTypeId?, tenantId?
   */
  async getFlowState(
    flowId: string,
    options?: { taskTypeId?: string; tenantId?: string; runId?: string },
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    if (!flowId) {
      return DataProcessResult.failure('MISSING_FLOW_ID', 'flowId is required');
    }
    // If runId provided, use snapshot service
    if (options?.runId) {
      const result = await this.snapshotService.getLatestSnapshot(flowId, options.runId);
      if (!result.isSuccess) {
        return DataProcessResult.failure(result.errorCode!, result.errorMessage!);
      }
      if (!result.data) {
        return DataProcessResult.failure(
          'SNAPSHOT_NOT_FOUND',
          `No snapshot found for flow ${flowId}`,
        );
      }
      return DataProcessResult.success(result.data as unknown as Record<string, unknown>);
    }

    // Query all snapshots for this flowId, return the latest
    const filters: Record<string, unknown> = { flowId };
    if (options?.taskTypeId) filters['taskTypeId'] = options.taskTypeId;
    if (options?.tenantId) filters['tenantId'] = options.tenantId;

    const result = await this.db.searchDocuments('xiigen-flow-state-snapshots', filters, 20);
    if (!result.isSuccess || !result.data?.length) {
      return DataProcessResult.failure(
        'SNAPSHOT_NOT_FOUND',
        `No snapshot found for flow ${flowId}`,
      );
    }
    const sorted = [...result.data].sort(
      (a, b) =>
        new Date(String(b['updatedAt'] ?? 0)).getTime() -
        new Date(String(a['updatedAt'] ?? 0)).getTime(),
    );
    return DataProcessResult.success(sorted[0] as Record<string, unknown>);
  }

  // ─── GET /api/lifecycle/flows/:flowId ─────────────────────────────────────

  /** Get lifecycle status for a flow. */
  async getLifecycleStatus(flowId: string): Promise<DataProcessResult<Record<string, unknown>>> {
    if (!flowId) {
      return DataProcessResult.failure('MISSING_FLOW_ID', 'flowId is required');
    }
    const result = await this.db.getDocument(ES_INDEX.FLOW_LIFECYCLE, flowId);
    if (!result.isSuccess || !result.data) {
      // Default: flow exists but has never been started — return NOT_STARTED.
      // Gate Check 5 queries .status at the top level via jq.
      return DataProcessResult.success({ flowId, status: 'NOT_STARTED' });
    }
    return DataProcessResult.success(result.data as unknown as Record<string, unknown>);
  }

  // ─── PUT /api/lifecycle/flows/:flowId ─────────────────────────────────────

  /**
   * Update lifecycle status for a flow (CAS: compare-and-swap).
   * Body: { status, expectedStatus?, updatedBy? }
   *
   * Valid statuses: PENDING → ACTIVE → DEPRECATED
   */
  async updateLifecycleStatus(
    flowId: string,
    body: { status: string; expectedStatus?: string; updatedBy?: string },
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    if (!flowId || !body.status) {
      return DataProcessResult.failure('MISSING_PARAMS', 'flowId and status are required');
    }

    const validStatuses = ['NOT_STARTED', 'PENDING', 'ACTIVE', 'DEPRECATED', 'FAILED'];
    if (!validStatuses.includes(body.status)) {
      return DataProcessResult.failure(
        'INVALID_STATUS',
        `status must be one of: ${validStatuses.join(', ')}`,
      );
    }

    // Load existing record for CAS check
    const existing = await this.db.getDocument(ES_INDEX.FLOW_LIFECYCLE, flowId);
    const currentStatus =
      existing.isSuccess && existing.data
        ? String(existing.data['status'] ?? 'PENDING')
        : 'PENDING';

    if (body.expectedStatus && currentStatus !== body.expectedStatus) {
      return DataProcessResult.failure(
        'CAS_MISMATCH',
        `Expected status ${body.expectedStatus} but found ${currentStatus}`,
      );
    }

    const record: Record<string, unknown> = {
      ...(existing.isSuccess && existing.data ? existing.data : {}),
      flowId,
      status: body.status,
      updatedAt: new Date().toISOString(),
      updatedBy: body.updatedBy ?? 'system',
    };

    if (!record['createdAt']) {
      record['createdAt'] = record['updatedAt'];
    }

    await this.db.storeDocument(ES_INDEX.FLOW_LIFECYCLE, record, flowId);
    return DataProcessResult.success(record);
  }

  // ─── POST /api/promotion/promote ─────────────────────────────────────────

  /**
   * Promote a task type to the given level (Phase E gate endpoint).
   * Body: { taskTypeId: string, level: string, tenantId: string }
   *
   * Called by every flow's Phase E gate script:
   *   curl -X POST /api/promotion/promote \
   *     -d '{"taskTypeId":"T47","level":"INJECTED","tenantId":"test"}'
   *
   * Stores a promotion record in xiigen-promotions and returns confirmation.
   * DNA-3: never throws.
   */
  async promoteTaskType(
    taskTypeId: string,
    level: string,
    tenantId: string,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    if (!taskTypeId || !level || !tenantId) {
      return DataProcessResult.failure(
        'MISSING_PARAMS',
        'taskTypeId, level, and tenantId are required',
      );
    }

    const promotedAt = new Date().toISOString();
    const record: Record<string, unknown> = {
      taskTypeId,
      level,
      tenantId,
      promotedAt,
      status: 'PROMOTED',
    };

    const stored = await this.db.storeDocument(
      'xiigen-promotions',
      record,
      `${tenantId}:${taskTypeId}`,
    );

    if (!stored.isSuccess) {
      return DataProcessResult.failure(
        'PROMOTION_STORE_FAILED',
        `Failed to store promotion record: ${stored.errorMessage ?? 'unknown error'}`,
      );
    }

    this.logger.log(`Promoted: taskTypeId=${taskTypeId} level=${level} tenantId=${tenantId}`);
    return DataProcessResult.success({ success: true, taskTypeId, level, promotedAt });
  }
}
