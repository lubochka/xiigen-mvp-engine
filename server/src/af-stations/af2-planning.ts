/**
 * AF-2: Planning Station.
 *
 * Decomposes a task spec into ordered generation steps.
 * Each step becomes a unit of work for AF-1 Genesis.
 * Supports archetype-specific decomposition rules + default 4-step fallback.
 *
 * Phase 8.2: SYNTHESIS sub-engine component.
 * v1.1.0: SERVICE archetype rules added — lifecycle-aware, method-named steps.
 *   Prevents single execute() collapse observed in Phase A dry-run (Issue #1/#3a).
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';
import { IAfStation, StationId, StationInput, StationOutput } from './base';

@Injectable()
export class PlanningStation extends IAfStation {
  readonly stationId = StationId.AF2_PLANNING;

  private readonly rules = new Map<string, Array<Record<string, unknown>>>();

  constructor() {
    super();
    this.loadDefaultRules();
  }

  async execute(input: StationInput): Promise<DataProcessResult<StationOutput>> {
    if (!input.tenantId) {
      return DataProcessResult.failure('MISSING_TENANT', 'tenant_id required (DNA-5)');
    }
    if (!input.spec || Object.keys(input.spec).length === 0) {
      return DataProcessResult.failure('MISSING_SPEC', 'spec is required for planning');
    }

    const start = Date.now();
    const archetype = (input.spec.archetype as string) ?? 'default';
    const taskType = input.taskType || (input.spec.task_type as string) || '';
    const factoryDeps = (input.spec.factory_dependencies as Array<Record<string, unknown>>) ?? [];

    const steps = this.decompose(archetype, taskType, factoryDeps, input.spec);

    const gateResult = this.runPlanningGate(steps, input.spec);
    if (!gateResult.isSuccess) {
      return DataProcessResult.failure(
        gateResult.errorCode ?? 'PLANNING_GATE_FAILED',
        gateResult.errorMessage ?? 'Planning gate failed',
      );
    }

    return DataProcessResult.success(
      new StationOutput({
        stationId: this.stationId,
        success: true,
        data: { steps, step_count: steps.length, archetype },
        elapsedMs: Date.now() - start,
      }),
    );
  }

  /**
   * Validates a decomposed plan before generation proceeds.
   * 3 MACHINE checks — no hardcoded artifact number ranges (FC-6).
   * Returns DataProcessResult.failure() on first failed check.
   */
  runPlanningGate(
    steps: Array<Record<string, unknown>>,
    _spec: Record<string, unknown>,
  ): DataProcessResult<void> {
    // Check 1: max 5 steps
    if (steps.length > 5) {
      return DataProcessResult.failure(
        'PLAN_TOO_MANY_STEPS',
        `Plan has ${steps.length} steps; maximum is 5`,
      );
    }

    // Check 2: no typed model patterns in step descriptions (DNA-1 guard)
    const typedModelPattern = /\bclass\s+\w+\s*\{/;
    for (const step of steps) {
      const desc = String(step.description ?? step.action ?? '');
      if (typedModelPattern.test(desc)) {
        return DataProcessResult.failure(
          'PLAN_DNA1_VIOLATION',
          `Step "${step.step_id ?? '?'}" contains typed model pattern (DNA-1): "${desc.slice(0, 60)}"`,
        );
      }
    }

    // Check 3: no duplicate step IDs
    const ids = steps.map((s) => s.step_id).filter(Boolean);
    const uniqueIds = new Set(ids);
    if (uniqueIds.size !== ids.length) {
      return DataProcessResult.failure(
        'PLAN_DUPLICATE_STEP_IDS',
        'Plan contains duplicate step IDs',
      );
    }

    return DataProcessResult.success(undefined);
  }

  /** Register decomposition rules for a given archetype. */
  registerRule(archetype: string, steps: Array<Record<string, unknown>>): void {
    this.rules.set(archetype, steps);
  }

  /** Get registered archetypes. */
  listArchetypes(): string[] {
    return [...this.rules.keys()];
  }

  private decompose(
    archetype: string,
    _taskType: string,
    factoryDeps: Array<Record<string, unknown>>,
    spec: Record<string, unknown>,
  ): Array<Record<string, unknown>> {
    const rules = this.rules.get(archetype);
    if (rules) {
      return this.applyRules(rules, factoryDeps, spec);
    }
    return this.defaultDecomposition(factoryDeps);
  }

  private applyRules(
    rules: Array<Record<string, unknown>>,
    factoryDeps: Array<Record<string, unknown>>,
    _spec: Record<string, unknown>,
  ): Array<Record<string, unknown>> {
    return rules.map((rule, i) => {
      const step: Record<string, unknown> = {
        step_id: `step-${i + 1}`,
        order: i + 1,
        description: rule.description ?? `Step ${i + 1}`,
        template: rule.template ?? 'generic',
        factory_interfaces: [] as Array<Record<string, unknown>>,
        fabric_type: rule.fabric_type ?? '',
        depends_on: rule.depends_on ?? [],
      };

      // Map factory deps to relevant steps by fabric match
      const matchedDeps: Array<Record<string, unknown>> = [];
      for (const dep of factoryDeps) {
        if (typeof dep === 'object' && dep.fabric_type) {
          const depFabric = String(dep.fabric_type).toLowerCase();
          const desc = String(rule.description ?? '').toLowerCase();
          if (desc.includes(depFabric)) {
            matchedDeps.push(dep);
          }
        }
      }
      step.factory_interfaces = matchedDeps;

      return step;
    });
  }

  private defaultDecomposition(
    factoryDeps: Array<Record<string, unknown>>,
  ): Array<Record<string, unknown>> {
    return [
      {
        step_id: 'step-1',
        order: 1,
        description: 'Generate factory interface definitions',
        template: 'factory_interfaces',
        factory_interfaces: factoryDeps,
        fabric_type: 'FACTORY',
        depends_on: [],
      },
      {
        step_id: 'step-2',
        order: 2,
        description: 'Generate service implementation (MicroserviceBase)',
        template: 'service_impl',
        factory_interfaces: [],
        fabric_type: 'SERVICE',
        depends_on: ['step-1'],
      },
      {
        step_id: 'step-3',
        order: 3,
        description: 'Generate FREEDOM config documents',
        template: 'config_docs',
        factory_interfaces: [],
        fabric_type: 'CONFIG',
        depends_on: ['step-2'],
      },
      {
        step_id: 'step-4',
        order: 4,
        description: 'Generate flow-definition DAG',
        template: 'flow_definition',
        factory_interfaces: [],
        fabric_type: 'FLOW_ENGINE',
        depends_on: ['step-2', 'step-3'],
      },
    ];
  }

  private loadDefaultRules(): void {
    // v1.1.0: SERVICE archetype — lifecycle-aware, method-named steps.
    // step-2 carries include_lifecycle:true so AF-1 injects spec.lifecycle_transitions
    // into the prompt, preventing the single execute() collapse from Phase A dry-run.
    this.rules.set('SERVICE', [
      {
        description:
          'Generate @Injectable class skeleton: class declaration extending MicroserviceBase, constructor with all factory @Inject() dependencies, import statements — no method bodies yet',
        template: 'service_skeleton',
        fabric_type: 'FACTORY',
        depends_on: [],
      },
      {
        description:
          'Generate all lifecycle handler methods as named async methods (e.g. handleRegistration(), verifyToken(), resendVerification()) — each returns DataProcessResult<T>, each includes atomic set-if-not-exists idempotency check (IScopedMemoryService.setIfAbsent()), storeDocument() BEFORE enqueue(), createCloudEvent() wrapping — use lifecycle_transitions from spec to derive exact method names',
        template: 'service_impl',
        fabric_type: 'SERVICE',
        include_lifecycle: true,
        depends_on: ['step-1'],
      },
      {
        description:
          'Generate DataProcessResult.failure() error paths for all named failure codes: one return statement per business error code listed in spec — no throw statements, no generic catch-all errors',
        template: 'error_handling',
        fabric_type: 'SERVICE',
        depends_on: ['step-2'],
      },
      {
        description:
          'Generate FREEDOM config resolution: read all config keys via IFreedomConfigService.get() — never hardcode TTL, rate-limit, or quota values inline in the service methods',
        template: 'config_reading',
        fabric_type: 'CONFIG',
        depends_on: ['step-2'],
      },
    ]);

    this.rules.set('ORCHESTRATION', [
      {
        description: 'Generate orchestration factory interfaces',
        template: 'orch_interfaces',
        fabric_type: 'FACTORY',
      },
      {
        description: 'Generate parallel execution coordinator',
        template: 'parallel_coord',
        fabric_type: 'SERVICE',
        depends_on: ['step-1'],
      },
      {
        description: 'Generate join gate logic',
        template: 'join_gate',
        fabric_type: 'SERVICE',
        depends_on: ['step-2'],
      },
      {
        description: 'Generate event routing config',
        template: 'event_config',
        fabric_type: 'QUEUE',
        depends_on: ['step-2'],
      },
      {
        description: 'Generate orchestration flow DAG',
        template: 'orch_flow',
        fabric_type: 'FLOW_ENGINE',
        depends_on: ['step-3', 'step-4'],
      },
    ]);

    this.rules.set('DATA_PIPELINE', [
      {
        description: 'Generate data source factory interfaces',
        template: 'data_interfaces',
        fabric_type: 'DATABASE',
      },
      {
        description: 'Generate transform service',
        template: 'transform_svc',
        fabric_type: 'SERVICE',
        depends_on: ['step-1'],
      },
      {
        description: 'Generate sink/output config',
        template: 'sink_config',
        fabric_type: 'DATABASE',
        depends_on: ['step-2'],
      },
      {
        description: 'Generate pipeline flow DAG',
        template: 'pipeline_flow',
        fabric_type: 'FLOW_ENGINE',
        depends_on: ['step-2', 'step-3'],
      },
    ]);
  }
}
