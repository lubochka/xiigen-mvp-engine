/**
 * GenerationResult — complete output from a flow generation run.
 *
 * Captures all artifacts produced:
 *   Layer 1: factory_entries (factory registrations)
 *   Layer 4: bfa_status (conflict check result)
 *   Layer 5: flow_definition (DAG for FlowOrchestrator)
 *   FREEDOM: freedom_configs (admin-editable parameters)
 *   AF: pipeline_passed, generated_code, pipeline_metadata
 *   Promotion: promotion_level
 *
 * DNA-1: toDict() → snake_case Record<string, unknown>.
 *
 * Phase 9.1: Engine core.
 */

export class GenerationResult {
  contractId = '';
  flowId = '';

  /** Layer 1: Factory registrations. */
  factoryEntries: Array<Record<string, unknown>> = [];

  /** Layer 5: Flow definition (DAG). */
  flowDefinition: Record<string, unknown> = {};

  /** FREEDOM configs created. */
  freedomConfigs: Array<Record<string, unknown>> = [];

  /** Layer 4: BFA status. */
  bfaStatus = '';

  /** Layer 3: AF pipeline trace. */
  pipelinePassed = false;
  generatedCode = '';
  pipelineMetadata: Record<string, unknown> = {};

  /** Promotion level after this run. */
  promotionLevel = 'GENERATED';

  /** Timing. */
  elapsedMs = 0;

  /** Errors / warnings. */
  errors: string[] = [];
  warnings: string[] = [];

  /** True if pipeline passed AND zero errors. */
  get success(): boolean {
    return this.pipelinePassed && this.errors.length === 0;
  }

  /** Serialize to dict (DNA-1: snake_case). */
  toDict(): Record<string, unknown> {
    return {
      contract_id: this.contractId,
      flow_id: this.flowId,
      success: this.success,
      factory_entries: this.factoryEntries,
      flow_definition: this.flowDefinition,
      freedom_configs: this.freedomConfigs,
      bfa_status: this.bfaStatus,
      pipeline_passed: this.pipelinePassed,
      generated_code_length: this.generatedCode.length,
      pipeline_metadata: this.pipelineMetadata,
      promotion_level: this.promotionLevel,
      elapsed_ms: this.elapsedMs,
      errors: [...this.errors],
      warnings: [...this.warnings],
    };
  }
}
