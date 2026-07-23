/**
 * BootstrapSequence — 8-phase startup orchestrator.
 *
 * Boot order (strict — phases cannot be reordered):
 *   Phase 1: Init Secrets Fabric
 *   Phase 2: Resolve Config via ConfigBuilder
 *   Phase 3: Init Database Fabric
 *   Phase 4: Init Queue Fabric
 *   Phase 5: Init AI Engine Fabric
 *   Phase 6: Init RAG Fabric
 *   Phase 7: Init Flow Engine Fabric
 *   Phase 9: MT_CONTEXT — validate ITenantRegistry, IIdempotencyStore, FreedomConfigManager
 *
 * If secrets_required=true and Phase 1 fails → full abort.
 * If any fabric (Phase 3–7) fails → continue with remaining (graceful degradation).
 * Phase 9 failure → logged as warning, engine continues (non-critical at boot).
 *
 * DNA-1: dict payloads.  DNA-3: DataProcessResult.  DNA-5: scope_id.
 *
 * Phase 9.2: Bootstrap module.  P26 BOOT-9: MT_CONTEXT phase.
 */

import { Injectable, Optional } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';
import { validateScope } from '../kernel/scope-isolation';
import { HealthReporter } from './health-reporter';

export enum BootPhase {
  SECRETS = 'secrets',
  CONFIG = 'config',
  DATABASE = 'database',
  QUEUE = 'queue',
  AI_ENGINE = 'ai_engine',
  RAG = 'rag',
  FLOW_ENGINE = 'flow_engine',
  MT_CONTEXT = 'mt_context', // P26 BOOT-9
}

export enum BootStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

/** Fabric initializer function signature. */
export type FabricInitFn = (
  tenantId: string,
  config: Record<string, unknown>,
) => Promise<DataProcessResult<Record<string, unknown>>>;

@Injectable()
export class BootstrapSequence {
  private readonly healthReporter: HealthReporter;
  private readonly requireSecrets: boolean;
  private readonly requireAll: boolean;
  private readonly retryAttempts: number;
  private readonly retryDelayMs: number;

  private secretsInit?: FabricInitFn;
  private readonly fabricInits = new Map<string, FabricInitFn>();
  private phaseResultsMap: Record<string, Record<string, unknown>> = {};

  constructor(
    @Optional()
    params?: {
      healthReporter?: HealthReporter;
      requireSecrets?: boolean;
      requireAllFabrics?: boolean;
      retryAttempts?: number;
      retryDelayMs?: number;
    },
  ) {
    this.healthReporter = params?.healthReporter ?? new HealthReporter();
    this.requireSecrets = params?.requireSecrets ?? true;
    this.requireAll = params?.requireAllFabrics ?? false;
    this.retryAttempts = params?.retryAttempts ?? 3;
    this.retryDelayMs = params?.retryDelayMs ?? 100; // fast for tests
  }

  /** Register the secrets fabric initializer (Phase 1). */
  registerSecrets(
    initFn: FabricInitFn,
    healthFn?: (tenantId: string) => Promise<DataProcessResult<Record<string, unknown>>>,
  ): void {
    this.secretsInit = initFn;
    if (healthFn) this.healthReporter.register('secrets', healthFn);
  }

  /** Register a fabric initializer (Phases 3–7). */
  registerFabric(
    fabricName: string,
    initFn: FabricInitFn,
    healthFn?: (tenantId: string) => Promise<DataProcessResult<Record<string, unknown>>>,
  ): void {
    this.fabricInits.set(fabricName, initFn);
    if (healthFn) this.healthReporter.register(fabricName, healthFn);
  }

  /**
   * Execute the 7-phase bootstrap sequence.
   * Returns resolved config, phase results, and health report.
   */
  async boot(
    tenantId: string,
    rawConfig: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const scopeCheck = validateScope(tenantId);
    if (!scopeCheck.isSuccess) {
      return DataProcessResult.failure('SCOPE_MISSING', 'tenant_id required (DNA-5)');
    }

    const startTime = Date.now();
    this.phaseResultsMap = {};

    // ── Phase 1: Init Secrets ─────────────────────
    const secretsOk = await this.runPhase(BootPhase.SECRETS, tenantId, rawConfig, this.secretsInit);
    if (!secretsOk && this.requireSecrets) {
      return DataProcessResult.failure(
        'SECRETS_INIT_FAILED',
        'Secrets fabric initialization failed — aborting bootstrap',
      );
    }

    // ── Phase 2: Resolve Config ───────────────────
    // In production, ConfigBuilder resolves $secret:/$env: refs.
    // For now: pass-through with status tracking.
    this.phaseResultsMap[BootPhase.CONFIG] = {
      status: BootStatus.SKIPPED,
      message: 'ConfigBuilder deferred — using raw config',
    };
    const resolvedConfig = rawConfig;

    // ── Phases 3–7: Init Fabrics ──────────────────
    const fabricOrder = [
      BootPhase.DATABASE,
      BootPhase.QUEUE,
      BootPhase.AI_ENGINE,
      BootPhase.RAG,
      BootPhase.FLOW_ENGINE,
    ];

    const failedFabrics: string[] = [];
    for (const phase of fabricOrder) {
      const initFn = this.fabricInits.get(phase);
      const fabricConfig = (resolvedConfig[phase] as Record<string, unknown>) ?? {};
      const ok = await this.runPhase(phase, tenantId, fabricConfig, initFn);
      if (!ok) failedFabrics.push(phase);
    }

    // ── Phase 9: MT_CONTEXT (P26 BOOT-9) ─────────
    const mtContextInitFn = this.fabricInits.get(BootPhase.MT_CONTEXT);
    if (mtContextInitFn) {
      await this.runPhase(BootPhase.MT_CONTEXT, tenantId, resolvedConfig, mtContextInitFn);
      // MT_CONTEXT failure is non-critical — engine continues
    } else {
      this.phaseResultsMap[BootPhase.MT_CONTEXT] = {
        status: BootStatus.SKIPPED,
        message: 'No MT_CONTEXT initializer registered',
      };
    }

    // ── Post-boot: Health Check ───────────────────
    const healthResult = await this.healthReporter.checkAll(tenantId);

    const elapsed = Date.now() - startTime;

    // Determine overall status
    if (failedFabrics.length > 0 && this.requireAll) {
      return DataProcessResult.failure(
        'BOOT_INCOMPLETE',
        `Required fabrics failed: ${failedFabrics.join(', ')}`,
      );
    }

    const overallStatus = failedFabrics.length === 0 ? 'HEALTHY' : 'DEGRADED';

    return DataProcessResult.success({
      status: overallStatus,
      resolved_config: resolvedConfig,
      phase_results: this.phaseResultsMap,
      health: healthResult.isSuccess ? healthResult.data : {},
      failed_fabrics: failedFabrics,
      elapsed_ms: elapsed,
      scope_id: tenantId,
    });
  }

  /** Run a single bootstrap phase with retry. */
  private async runPhase(
    phase: BootPhase | string,
    tenantId: string,
    configSection: Record<string, unknown>,
    initFn?: FabricInitFn,
  ): Promise<boolean> {
    if (!initFn) {
      this.phaseResultsMap[phase] = {
        status: BootStatus.SKIPPED,
        message: `No initializer registered for ${phase}`,
      };
      return true; // skipped = not a failure
    }

    this.phaseResultsMap[phase] = { status: BootStatus.RUNNING };

    let attempt = 0;
    let lastError: string | undefined;

    while (attempt < Math.max(this.retryAttempts, 1)) {
      try {
        const result = await initFn(tenantId, configSection);
        if (result.isSuccess) {
          this.phaseResultsMap[phase] = {
            status: BootStatus.SUCCESS,
            attempt: attempt + 1,
            details: typeof result.data === 'object' ? result.data : {},
          };
          return true;
        }
        lastError = result.errorMessage ?? 'Unknown error';
      } catch (err) {
        lastError = String(err);
      }

      attempt++;
      if (attempt < this.retryAttempts && this.retryDelayMs > 0) {
        await new Promise((r) => setTimeout(r, this.retryDelayMs));
      }
    }

    this.phaseResultsMap[phase] = {
      status: BootStatus.FAILED,
      attempts: attempt,
      error_message: lastError,
    };
    return false;
  }

  /** Get phase results. */
  get phaseResults(): Record<string, Record<string, unknown>> {
    return { ...this.phaseResultsMap };
  }

  /** Access the health reporter. */
  get health(): HealthReporter {
    return this.healthReporter;
  }
}
