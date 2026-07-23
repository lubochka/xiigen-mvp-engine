/**
 * FlowGenerator — THE ENGINE.
 *
 * Top-level operation: "add a new flow" as a single call.
 * Ties all layers: Contract → FactoryRegistry → AF Pipeline → TemplateRenderer → BFA → FlowStore → FREEDOM.
 *
 * Steps (from the basic prompt):
 *   0. Validate contract
 *   1. Register contract in TaskTypeRegistry
 *   2. BFA pre-check (conflicts → block BEFORE spending compute)
 *   3. Register factory interfaces in FactoryRegistry
 *   4. Run AF Pipeline (INVENTORY → SYNTHESIS → JUDGMENT)
 *   5. Render flow definition + BFA registration (via TemplateRenderer)
 *   6. Save flow definition to FlowStore (if available)
 *   7. Create FREEDOM config documents
 *   8. Promotion tracking
 *
 * Phase 9.1: Engine core.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';
import { IFlowDefinition } from '../fabrics/interfaces/flow-orchestrator.interface';
import { GenericNodeExecutor } from './generic-node-executor';
import { FactoryRegistry } from '../factories/factory-registry';
import { createRegistryEntry } from '../factories/factory-interfaces';
import { FabricType, isValidFabricType } from '../factories/fabric-type';
import { EngineContract } from '../engine-contracts/contract-schema';
import { TaskTypeRegistry } from '../engine-contracts/task-type-registry';
import { TemplateRenderer } from '../engine-contracts/template-renderer';
import { BusinessFlowArbiter } from '../guardrails/bfa';
import {
  PromotionLadder,
  PromotionLevel,
  PROMOTION_LEVEL_NAMES,
} from '../guardrails/promotion-ladder';
import { StationInput } from '../af-stations/base';
import { AfPipeline } from '../af-stations/af-pipeline';
import { FreedomConfigManager } from '../freedom/config-manager';
import { GenerationResult } from './generation-result';

@Injectable()
export class FlowGenerator {
  private readonly bfa: BusinessFlowArbiter;
  private readonly factoryReg: FactoryRegistry;
  private readonly taskReg: TaskTypeRegistry;
  private readonly renderer: TemplateRenderer;
  private readonly flowStore: IFlowDefinition | undefined;
  private readonly pipeline: AfPipeline;
  private readonly freedom: FreedomConfigManager;
  private readonly promotion: PromotionLadder;
  private readonly history: Array<Record<string, unknown>> = [];

  constructor(
    params: {
      factoryRegistry?: FactoryRegistry;
      taskRegistry?: TaskTypeRegistry;
      templateRenderer?: TemplateRenderer;
      bfa?: BusinessFlowArbiter;
      flowStore?: IFlowDefinition;
      afPipeline?: AfPipeline;
      freedomManager?: FreedomConfigManager;
      promotionLadder?: PromotionLadder;
    } = {},
  ) {
    this.bfa = params.bfa ?? new BusinessFlowArbiter();
    this.factoryReg = params.factoryRegistry ?? new FactoryRegistry();
    this.taskReg = params.taskRegistry ?? new TaskTypeRegistry();
    this.renderer = params.templateRenderer ?? new TemplateRenderer();
    this.flowStore = params.flowStore;
    // In production NestJS DI, afPipeline is always injected.
    // In tests, afPipeline is always explicitly provided via constructor params.
    // The type cast avoids a TS2554 error — GenericNodeExecutor's DI args are
    // provided by NestJS at runtime, not by the test harness.
    this.pipeline =
      params.afPipeline ??
      new AfPipeline(new (GenericNodeExecutor as unknown as new () => GenericNodeExecutor)());
    this.freedom = params.freedomManager ?? new FreedomConfigManager();
    this.promotion = params.promotionLadder ?? new PromotionLadder();
  }

  /**
   * Generate a complete flow from an engine contract.
   * This IS the engine's main operation.
   */
  async generate(
    contract: EngineContract,
    tenantId: string,
  ): Promise<DataProcessResult<GenerationResult>> {
    const start = Date.now();
    const result = new GenerationResult();
    result.contractId = contract.taskTypeId;

    // ── Step 0: Validate contract ─────────────────
    const validation = contract.validate();
    if (!validation.isSuccess) {
      result.errors.push(`Contract invalid: ${validation.errorMessage}`);
      return this.finish(result, start, tenantId);
    }

    // ── Step 1: Register in TaskTypeRegistry ──────
    const regResult = this.taskReg.register(contract);
    if (!regResult.isSuccess) {
      if (regResult.errorCode === 'CONTRACT_EXISTS') {
        result.warnings.push(`${contract.taskTypeId} already registered, continuing`);
      } else {
        result.errors.push(`Contract registration: ${regResult.errorMessage}`);
        return this.finish(result, start, tenantId);
      }
    }

    // ── Step 2: BFA pre-check ─────────────────────
    if (contract.bfaRegistration) {
      const conflicts = this.bfa.checkConflicts(contract.taskTypeId, {
        entities: [...contract.bfaRegistration.entities],
        events: [...contract.bfaRegistration.events],
        apiRoutes: [...contract.bfaRegistration.apiRoutes],
      });
      if (conflicts.isSuccess) {
        const errorConflicts = conflicts.data!.filter((c) => c.severity === 'error');
        if (errorConflicts.length > 0) {
          const msgs = errorConflicts.map(
            (c) => `${c.conflictType}: '${c.value}' owned by ${c.existingFlow}`,
          );
          result.errors.push(`BFA conflicts: ${msgs.join('; ')}`);
          result.bfaStatus = 'BLOCKED';
          return this.finish(result, start, tenantId);
        }
      }
    }

    // ── Step 3: Register factory interfaces ────────
    this.registerFactories(contract, result);

    // ── Step 4: Run AF Pipeline ───────────────────
    const afInput = new StationInput({
      tenantId,
      taskType: contract.taskTypeId,
      spec: contract.toDict(),
    });
    const afResult = await this.pipeline.execute(afInput);
    if (!afResult.isSuccess) {
      result.errors.push(`AF Pipeline: ${afResult.errorMessage}`);
      return this.finish(result, start, tenantId);
    }

    const pipelineData = afResult.data!;
    result.pipelinePassed = pipelineData.passed;
    result.generatedCode = pipelineData.enrichedInput.code;
    result.pipelineMetadata = {
      stages: pipelineData.stages,
      total_elapsed_ms: pipelineData.totalElapsedMs,
      artifact_id: pipelineData.artifactId,
    };

    // ── Step 5: Render flow definition ─────────────
    const renderResult = this.renderer.render(contract);
    if (!renderResult.isSuccess) {
      result.errors.push(`Renderer: ${renderResult.errorMessage}`);
      return this.finish(result, start, tenantId);
    }

    const rendered = renderResult.data!;
    result.flowDefinition = rendered.flowDefinition;
    result.flowId = (rendered.flowDefinition.flow_id as string) ?? '';

    // Register in BFA after successful render
    if (contract.bfaRegistration) {
      this.bfa.registerFlow(contract.taskTypeId, {
        entities: [...contract.bfaRegistration.entities],
        events: [...contract.bfaRegistration.events],
        apiRoutes: [...contract.bfaRegistration.apiRoutes],
      });
      result.bfaStatus = 'REGISTERED';
    }

    // ── Step 6: Save flow definition to FlowStore ──
    if (this.flowStore) {
      try {
        const saveResult = await this.flowStore.saveFlow(result.flowDefinition);
        if (!saveResult.isSuccess) {
          result.warnings.push(`FlowStore save: ${saveResult.errorMessage}`);
        }
      } catch (err) {
        result.warnings.push(`FlowStore save error: ${String(err)}`);
      }
    }

    // ── Step 7: Create FREEDOM config documents ────
    this.createFreedomConfigs(contract, tenantId, result);

    // ── Step 8: Promotion ─────────────────────────
    const artifactId = `${contract.taskTypeId}:${tenantId}`;
    this.promotion.register(artifactId, PromotionLevel.GENERATED);
    if (result.pipelinePassed) {
      this.promotion.promote(artifactId); // → INJECTED
      this.promotion.promote(artifactId); // → MINIMAL
    }
    result.promotionLevel = PROMOTION_LEVEL_NAMES[this.promotion.getLevel(artifactId)];

    return this.finish(result, start, tenantId);
  }

  // ── Internal ──────────────────────────────────────

  private registerFactories(contract: EngineContract, result: GenerationResult): void {
    const entries: Array<Record<string, unknown>> = [];
    for (const dep of contract.factoryDependencies) {
      let fabricType: FabricType;
      try {
        fabricType = isValidFabricType(dep.fabricType) ? dep.fabricType : FabricType.CORE;
      } catch {
        fabricType = FabricType.CORE;
      }

      const entry = createRegistryEntry({
        factoryId: dep.factoryId,
        interfaceName: dep.interfaceName,
        familyId: contract.familyId || `Family-${contract.taskTypeId}`,
        fabricType,
        provider: dep.providerHint ?? 'pending',
        description: dep.description,
        status: 'ACTIVE',
        version: contract.version,
      });

      const reg = this.factoryReg.register(entry);
      if (reg.isSuccess) {
        entries.push({
          factory_id: dep.factoryId,
          interface_name: dep.interfaceName,
          fabric_type: dep.fabricType,
          status: 'ACTIVE',
        });
      } else {
        if (reg.errorCode === 'FACTORY_EXISTS') {
          result.warnings.push(`Factory ${dep.factoryId} already registered`);
          entries.push({
            factory_id: dep.factoryId,
            interface_name: dep.interfaceName,
            fabric_type: dep.fabricType,
            status: 'EXISTING',
          });
        } else {
          result.warnings.push(`Factory ${dep.factoryId}: ${reg.errorMessage}`);
        }
      }
    }
    result.factoryEntries = entries;
  }

  private createFreedomConfigs(
    contract: EngineContract,
    tenantId: string,
    result: GenerationResult,
  ): void {
    const configs: Array<Record<string, unknown>> = [];
    for (const component of contract.freedomComponents) {
      const doc: Record<string, unknown> = {
        config_key: `${contract.taskTypeId}:${component}`,
        task_type: contract.taskTypeId,
        value: null,
        value_type: 'string',
        description: `Admin-configurable: ${component}`,
        editable_by: 'admin',
      };
      const setResult = this.freedom.setConfig(tenantId, doc);
      if (setResult.isSuccess) {
        configs.push(setResult.data!);
      } else {
        result.warnings.push(`FREEDOM config ${component}: ${setResult.errorMessage}`);
      }
    }
    result.freedomConfigs = configs;
  }

  private finish(
    result: GenerationResult,
    startTime: number,
    tenantId: string,
  ): DataProcessResult<GenerationResult> {
    result.elapsedMs = Date.now() - startTime;
    this.history.push({
      contract_id: result.contractId,
      tenant_id: tenantId,
      success: result.success,
      elapsed_ms: result.elapsedMs,
    });
    return DataProcessResult.success(result);
  }

  // ── Accessors ─────────────────────────────────────

  get generationCount(): number {
    return this.history.length;
  }
  get generationHistory(): Array<Record<string, unknown>> {
    return [...this.history];
  }
  get factoryRegistry(): FactoryRegistry {
    return this.factoryReg;
  }
  get taskRegistry(): TaskTypeRegistry {
    return this.taskReg;
  }
  get bfaArbiter(): BusinessFlowArbiter {
    return this.bfa;
  }
  get promotionLadder(): PromotionLadder {
    return this.promotion;
  }
  get freedomManager(): FreedomConfigManager {
    return this.freedom;
  }
}
