/**
 * decompose.handler — Node handler for task decomposition.
 *
 * Reads contract.handlers[] deterministically (by order field) and produces
 * a plan (ordered list of steps) for ai-generate.handler to implement.
 * Falls back to archetype template if handlers[] is absent.
 *
 * DNA-3: returns DataProcessResult, never throws
 */
import { Injectable, Inject, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { INodeHandler, NodeHandlerContext, NodeHandlerResult } from './node-handler.types';

@Injectable()
export class DecomposeHandler implements INodeHandler {
  readonly nodeType = 'decompose';
  private readonly logger = new Logger(DecomposeHandler.name);

  constructor(@Inject(DATABASE_SERVICE) private readonly db: IDatabaseService) {}

  async handle(ctx: NodeHandlerContext): Promise<DataProcessResult<NodeHandlerResult>> {
    const { contract, taskTypeId, tenantId } = ctx;

    // CF-204: Cross-tenant join guard (T197 CrossSystemIdentityJoin)
    // Applied when contract.crossTenantJoinGuard?.enforceOnAllInputs is true.
    const contractDoc0 = contract as unknown as Record<string, unknown>;
    const crossTenantGuard = contractDoc0['crossTenantJoinGuard'] as
      | Record<string, unknown>
      | undefined;
    if (crossTenantGuard?.['enforceOnAllInputs'] === true) {
      const joinInputs = (ctx.inputs?.['joinInputs'] as Record<string, unknown>[]) ?? [];
      if (joinInputs.length > 0 && tenantId) {
        const guardResult = this.validateCrossTenantJoinInputs(joinInputs, tenantId);
        if (!guardResult.isSuccess) {
          return DataProcessResult.failure(guardResult.errorCode!, guardResult.errorMessage!);
        }
      }
    }

    // Prefer structured handlers[] from contract if present
    if (contract.handlers && contract.handlers.length > 0) {
      const sorted = [...contract.handlers].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const steps = sorted.map((h) => ({
        name: h.name,
        order: h.order ?? 0,
        condition: h.condition,
        conditionBehavior: h.conditionBehavior,
      }));
      this.logger.debug(`Decompose ${taskTypeId}: ${steps.length} steps from contract.handlers[]`);
      return DataProcessResult.success({
        data: {
          planSteps: steps,
          source: 'contract_handlers',
          archetype: contract.archetype,
        },
      });
    }

    // E4-2: filterCondition guard for aggregation contracts (IR-7 compliance).
    // When contract.aggregation.filterCondition is set, prepend a filter guard instruction
    // to the plan steps so ai-generate includes it BEFORE the addEvents block.
    const contractDoc = contract as unknown as Record<string, unknown>;
    const aggregation = contractDoc['aggregation'] as Record<string, unknown> | undefined;
    if (aggregation?.filterCondition) {
      const filterExpr = String(aggregation.filterCondition);
      // Replace bare 'status' with 'record.status' for generated code validity
      const generatedFilterExpr = filterExpr.replace(/\bstatus\b/g, 'record.status');
      const filterGuardStep = {
        name: 'filterConditionGuard',
        order: -1, // Before all other steps
        instruction:
          `IR-7: Only records matching filterCondition contribute to aggregate. ` +
          `Generated guard:\n` +
          `// IR-7: Only records matching filterCondition contribute to aggregate\n` +
          `// filterCondition: ${filterExpr}\n` +
          `if (!(${generatedFilterExpr})) {\n` +
          `  this.logger.debug(\`Skipping record: filterCondition not met (${filterExpr.replace(/'/g, "\\'")})\`);\n` +
          `  return DataProcessResult.success({ status: 'FILTERED_OUT', reason: 'filterCondition' });\n` +
          `}`,
        filterCondition: filterExpr,
        generatedFilterExpr,
      };
      this.logger.debug(
        `Decompose ${taskTypeId}: filterCondition guard generated for aggregation archetype`,
      );
      // Return early with just the filter guard — ai-generate will use this as a hint
      return DataProcessResult.success({
        data: {
          planSteps: [filterGuardStep],
          filterConditionGuard: filterGuardStep.instruction,
          filterCondition: filterExpr,
          source: 'aggregation_filter_guard',
          archetype: contract.archetype,
        },
      });
    }

    // GAP-NEW-78: REQUEST_RESPONSE archetype — synchronous, latency-bound, no queue required.
    const contractDoc4 = contract as unknown as Record<string, unknown>;
    const archetype = contract.archetype ?? 'SERVICE';
    if (archetype === 'REQUEST_RESPONSE' || archetype === 'request_response') {
      const sloMs = contractDoc4['sloMs'] as number | undefined;
      if (sloMs === undefined || sloMs === null) {
        return DataProcessResult.failure(
          'DECOMPOSE_MISSING_SLO',
          `[GAP-NEW-78] sloMs is required for REQUEST_RESPONSE archetype. ` +
            `Task type ${taskTypeId} is missing sloMs. See GAP-NEW-79 for schema fix.`,
        );
      }
      if (sloMs <= 0) {
        return DataProcessResult.failure(
          'DECOMPOSE_INVALID_SLO',
          `[GAP-NEW-78] sloMs must be a positive integer for ${taskTypeId}. Received: ${sloMs}`,
        );
      }
      const cachePolicy = contractDoc4['cachePolicy'] as string | undefined;
      this.logger.debug(
        `Decompose ${taskTypeId}: REQUEST_RESPONSE sloMs=${sloMs} cachePolicy=${cachePolicy ?? 'read-through'}`,
      );
      return DataProcessResult.success({
        data: {
          planSteps: [{ name: 'requestResponse', order: 0 }],
          source: 'request_response_archetype',
          archetype,
          executionModel: 'sync',
          sloMs,
          cachePolicy: cachePolicy ?? 'read-through',
          perRequestAuth: true,
          outboxRequired: false,
          queueRequired: false,
          latencyBound: true,
          callerBlocks: true,
        },
      });
    }

    // K10 (GAP FLOW-19): DURABLE_SAGA parametric compensationStrategy.
    // 5 EP-5 sagas require distinct compensation strategies (T272, T282, T283, T285, T286).
    // Read compensationStrategy from contract.durableSaga — default lifo.
    if (archetype === 'DURABLE_SAGA') {
      const contractDoc2 = contract as unknown as Record<string, unknown>;
      const durableSaga = contractDoc2['durableSaga'] as Record<string, unknown> | undefined;
      const strategy = String(durableSaga?.['compensationStrategy'] ?? 'lifo');

      const sagaSteps = this.generateDurableSagaSteps(strategy, taskTypeId);
      this.logger.debug(
        `Decompose ${taskTypeId}: DURABLE_SAGA strategy=${strategy} (${sagaSteps.length} steps)`,
      );
      return DataProcessResult.success({
        data: {
          planSteps: sagaSteps,
          source: 'durable_saga_parametric',
          archetype,
          compensationStrategy: strategy,
        },
      });
    }

    // Fall back to archetype template lookup
    const templateResult = await this.db.searchDocuments(
      'xiigen-node-definitions',
      { archetype, type: 'template' },
      1,
    );

    if (templateResult.isSuccess && templateResult.data && templateResult.data.length > 0) {
      const template = templateResult.data[0];
      const steps = (template['steps'] as Record<string, unknown>[]) ?? [];
      this.logger.debug(
        `Decompose ${taskTypeId}: ${steps.length} steps from archetype=${archetype} template`,
      );
      return DataProcessResult.success({
        data: {
          planSteps: steps,
          source: 'archetype_template',
          archetype,
        },
      });
    }

    // Handle inlineInvokes — these are NOT factory-injected
    // They are instantiated directly in the constructor body (FLOW-13: T173 → T187)
    const contractDoc3 = contract as unknown as Record<string, unknown>;
    const inlineInvokes = contractDoc3['inlineInvokes'] as string[] | undefined;
    if (inlineInvokes && inlineInvokes.length > 0) {
      for (const inlineId of inlineInvokes) {
        // Generate a plain constructor parameter, not @Inject()
        // Do NOT emit: @Inject(QUOTA_MANAGER) or any factory token for inline services
        this.logger.debug(
          `Decompose ${taskTypeId}: INLINE SERVICE ${inlineId} — instantiated directly, not via factory`,
        );
      }
    }

    // Minimal fallback: single-step generate
    this.logger.warn(
      `Decompose ${taskTypeId}: no template for archetype=${archetype}, using minimal plan`,
    );
    return DataProcessResult.success({
      data: {
        planSteps: [{ name: 'generate', order: 0 }],
        source: 'fallback',
        archetype,
        inlineInvokes: inlineInvokes ?? [],
      },
    });
  }

  /**
   * CF-204: Cross-tenant join guard.
   * Applied when contract.crossTenantJoinGuard is set (T197 CrossSystemIdentityJoin).
   * All join inputs must carry a tenantId matching the context tenantId.
   * DNA-3: returns DataProcessResult — never throws.
   */
  private validateCrossTenantJoinInputs(
    inputs: Record<string, unknown>[],
    contractTenantId: string,
  ): DataProcessResult<void> {
    for (const input of inputs) {
      if (!input['tenantId']) {
        return DataProcessResult.failure(
          'CROSS_TENANT_JOIN_MISSING_TENANT_ID',
          `Join input is missing tenantId field — cross-tenant join guard triggered (CF-204)`,
        );
      }
      if (input['tenantId'] !== contractTenantId) {
        return DataProcessResult.failure(
          'CROSS_TENANT_JOIN_ATTEMPTED',
          `Join input tenantId '${input['tenantId']}' does not match context tenantId '${contractTenantId}' — cross-tenant join prohibited (CF-204)`,
        );
      }
    }
    return DataProcessResult.success(undefined);
  }

  /**
   * K10 — Generate DURABLE_SAGA plan steps for the given compensationStrategy.
   *
   * Each of the 5 EP-5 saga task types has a distinct compensation strategy:
   *   pre-stored           (T272 IaCProvisionSaga)
   *   retry-then-fail      (T282 BackupRunOrchestrator)
   *   abort-and-evidence   (T283 RestoreDrillSaga)
   *   lifo                 (T285 TenantOnboardingSaga)
   *   abort-on-safety-failure (T286 TenantOffboardingSaga)
   */
  private generateDurableSagaSteps(
    strategy: string,
    taskTypeId: string,
  ): Record<string, unknown>[] {
    switch (strategy) {
      case 'pre-stored':
        // T272: store compensation plan BEFORE IaC apply (DD-152)
        return [
          {
            name: 'storeCompensationPlan',
            order: 0,
            instruction:
              'Call storeCompensationPlan() to persist destruction plan in DB before any infrastructure changes',
          },
          { name: 'emitStored', order: 1, instruction: 'Emit compensation.stored CloudEvent' },
          {
            name: 'applyIaC',
            order: 2,
            instruction: 'Call F702.apply() to execute infrastructure provisioning',
          },
          {
            name: 'healthProbe',
            order: 3,
            instruction: 'Call F702.probe() to verify provisioned resources are healthy',
          },
          {
            name: 'emitComplete',
            order: 4,
            instruction: 'Emit provisioning.complete CloudEvent with resource IDs',
          },
          {
            name: 'compensation',
            order: -1,
            instruction:
              'On failure: load stored plan → F702.applyDestroyPlan() → emit compensation_executed',
          },
        ];

      case 'retry-then-fail':
        // T282: cursor checkpoint per step, retry loop, emit failure on exhaustion
        return [
          {
            name: 'readCursor',
            order: 0,
            instruction: 'Read EP-4 cursor from backup-saga-states; default to START',
          },
          {
            name: 'writeBackup',
            order: 1,
            instruction: 'Execute backup write step; update cursor after each successful chunk',
          },
          {
            name: 'verifySha256',
            order: 2,
            instruction: 'Compute sha256 hash and verify backup integrity',
          },
          {
            name: 'retryLoop',
            order: 3,
            instruction:
              'On write failure: retry up to maxRetries (FREEDOM config); increment retry count; update cursor',
          },
          {
            name: 'emitComplete',
            order: 4,
            instruction: 'On success: emit backup.complete CloudEvent with cursor=DONE',
          },
          {
            name: 'compensation',
            order: -1,
            instruction: 'On exhaustion: emit backup.verification.failed CloudEvent',
          },
        ];

      case 'abort-and-evidence':
        // T283: wall-clock timer, sandbox from backup, restore, verify, record evidence
        return [
          {
            name: 'startTimer',
            order: 0,
            instruction: 'Capture rtoStart = Date.now() for wall-clock RTO measurement (CF-350)',
          },
          {
            name: 'seedSandbox',
            order: 1,
            instruction:
              'Provision DR sandbox using backupArtifact (F725) only — not production data (CF-340)',
          },
          { name: 'restore', order: 2, instruction: 'Execute restore operation in sandbox' },
          {
            name: 'verify',
            order: 3,
            instruction: 'Verify restored data integrity and service health',
          },
          {
            name: 'recordEvidence',
            order: 4,
            instruction: 'Record drill evidence in F723 with rto=(Date.now()-rtoStart)',
          },
          {
            name: 'compensation',
            order: -1,
            instruction:
              'On failure: record failure evidence in F723 → emit drill.aborted CloudEvent',
          },
        ];

      case 'abort-on-safety-failure':
        // T286: audit preservation before deactivation, abort if fails (DR-115)
        return [
          {
            name: 'preserveAuditLogs',
            order: 0,
            instruction:
              'Call F733.preserveAuditLogs() to preserve tenant audit trail before any deactivation',
          },
          {
            name: 'confirmPreservation',
            order: 1,
            instruction: 'Check preservation.confirmed — abort if not confirmed (DR-115)',
          },
          { name: 'closeBilling', order: 2, instruction: 'Close tenant billing subscription' },
          {
            name: 'deprovisionResources',
            order: 3,
            instruction: 'Deprovision all tenant resources',
          },
          { name: 'deactivateTenant', order: 4, instruction: 'Set tenant status to INACTIVE' },
          { name: 'emitOffboarded', order: 5, instruction: 'Emit tenant.offboarded CloudEvent' },
          {
            name: 'compensation',
            order: -1,
            instruction:
              'On preservation failure: reactivateTenant() → emit offboarding.aborted CloudEvent',
          },
        ];

      case 'lifo':
      default:
        // T285 (default LIFO): track completed steps, on failure reverse undo
        if (strategy !== 'lifo') {
          this.logger.warn(
            `Unknown DURABLE_SAGA compensationStrategy: ${strategy} for ${taskTypeId}, defaulting to lifo`,
          );
        }
        return [
          {
            name: 'trackSteps',
            order: 0,
            instruction: 'Maintain completedSteps[] stack for LIFO compensation tracking',
          },
          {
            name: 'executeSteps',
            order: 1,
            instruction: 'Execute saga steps; push each completed step to completedSteps[]',
          },
          {
            name: 'emitComplete',
            order: 2,
            instruction: 'Emit saga.complete CloudEvent on all steps success',
          },
          {
            name: 'compensation',
            order: -1,
            instruction:
              'On failure: iterate completedSteps[] in reverse order; call undo for each',
          },
        ];
    }
  }
}
