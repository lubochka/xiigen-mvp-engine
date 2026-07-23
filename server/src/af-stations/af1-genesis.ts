/**
 * AF-1: Genesis Station.
 *
 * Generates code from spec + context by calling the AI Engine Fabric.
 * Takes enriched StationInput (with prompts + RAG patterns from INVENTORY,
 * plan steps from AF-2) and generates code for each step.
 *
 * NEVER imports an SDK directly — uses IAiProvider through fabric.
 *
 * Phase 8.2: SYNTHESIS sub-engine component.
 * v1.2.0: Step-routing directive + anti-collision guard (Phase B pre-flight).
 *   - service_impl / include_lifecycle steps inject spec.lifecycle_transitions
 *   - Cross-step anti-collision: already-generated method names passed to each
 *     subsequent step to prevent duplicate method generation across steps.
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';
import { IAiProvider } from '../fabrics/interfaces/ai-provider.interface';
import { IAfStation, StationId, StationInput, StationOutput } from './base';
import { TaskTypeStackCoupling, PRIORITY_SERVER_KEY } from '../engine-contracts/stack-coupling';
import { IntakePipelineService } from '../engine/intake/intake-pipeline.service';

@Injectable()
export class GenesisStation extends IAfStation {
  readonly stationId = StationId.AF1_GENESIS;
  private readonly logger = new Logger(GenesisStation.name);

  constructor(
    private readonly aiProvider: IAiProvider,
    @Optional() private readonly intakePipeline?: IntakePipelineService,
  ) {
    super();
  }

  async execute(input: StationInput): Promise<DataProcessResult<StationOutput>> {
    if (!input.tenantId) {
      return DataProcessResult.failure('MISSING_TENANT', 'tenant_id required (DNA-5)');
    }
    if (!input.planSteps || input.planSteps.length === 0) {
      return DataProcessResult.failure('NO_PLAN', 'plan_steps required — run AF-2 Planning first');
    }

    const start = Date.now();
    const results: Array<Record<string, unknown>> = [];
    const errors: string[] = [];

    // Anti-collision guard: track method names generated in prior steps so
    // subsequent steps are told not to regenerate them (prevents duplicate bodies).
    const generatedMethodNames: Set<string> = new Set();

    for (const step of input.planSteps) {
      const stepResult = await this.generateForStep(input, step, generatedMethodNames);
      if (stepResult.isSuccess) {
        const generatedCode = String(stepResult.data!.text ?? '');
        // Extract async method names from generated code for anti-collision tracking
        const methodMatches = generatedCode.matchAll(/async\s+(\w+)\s*\(/g);
        for (const m of methodMatches) {
          generatedMethodNames.add(m[1]);
        }
        results.push({
          step_id: step.step_id ?? 'unknown',
          code: generatedCode,
          model: stepResult.data!.model ?? '',
          tokens_used: stepResult.data!.tokens_used ?? {},
          cost: stepResult.data!.cost ?? 0,
        });
      } else {
        const stepId = step.step_id ?? '?';
        errors.push(`Step ${stepId}: ${stepResult.errorMessage}`);
        results.push({
          step_id: stepId,
          code: '',
          error: stepResult.errorMessage,
        });
      }
    }

    const elapsed = Date.now() - start;
    const totalCost = results.reduce((sum, r) => sum + ((r.cost as number) ?? 0), 0);

    return DataProcessResult.success(
      new StationOutput({
        stationId: this.stationId,
        success: errors.length === 0,
        data: {
          generation_results: results,
          total_steps: input.planSteps.length,
          successful_steps: results.length - errors.length,
          failed_steps: errors.length,
          total_cost: totalCost,
        },
        errors,
        elapsedMs: elapsed,
      }),
    );
  }

  /**
   * Z-1.2: Mechanism-first stack coupling section (Section 4 of genesis prompt).
   *
   * Tier 1: PROJECT_UNDERSTANDING from RAG (projectId path — wired in SESSION-O-4).
   * Tier 2: Mechanism-first stackCoupling — reads neutralConcepts from priority server entry.
   * Tier 3: No additional context (iron rules only) — backward compatible.
   *
   * NEVER reads stackCoupling by stack-label key (no 'node-nestjs' hardcoding).
   * Provider resolution comes from the runtime, not from a guessed stack name.
   */
  private async assembleSection4(input: StationInput): Promise<string> {
    // Tier 1: PROJECT_UNDERSTANDING derived context
    if (input.projectId && this.intakePipeline) {
      try {
        // Look up PROJECT_UNDERSTANDING from RAG — this is done by the caller injecting
        // understanding data via StationInput.metadata['projectUnderstanding'], or
        // we call assembleDerivedSection4 which handles the RAG lookup internally.
        const understanding = input.metadata['projectUnderstanding'] as
          | Record<string, unknown>
          | undefined;
        if (understanding) {
          this.logger.debug(`Using PROJECT_UNDERSTANDING for project: ${input.projectId}`);
          const section4 = await this.intakePipeline.assembleDerivedSection4({
            understanding,
            capabilityDescription: `${String(input.spec['taskTypeName'] ?? input.taskType)}: ${String(input.spec['description'] ?? '')}`,
            archetype: String(input.spec['archetype'] ?? 'SERVICE'),
            taskTypeId: String(input.spec['taskTypeId'] ?? input.taskType),
          });
          if (section4) return section4;
        } else {
          this.logger.debug(
            `projectId=${input.projectId} set but no projectUnderstanding in metadata — falling through to Tier 2.`,
          );
        }
      } catch (err) {
        this.logger.warn(`Tier 1 assembly failed: ${String(err)} — falling through to Tier 2`);
      }
    }

    // Tier 2: Mechanism-first stackCoupling (reads from spec, no stack-label keys)
    const sc = input.spec['stackCoupling'] as TaskTypeStackCoupling | undefined;
    if (sc?.entries) {
      const serverEntry = sc.entries[PRIORITY_SERVER_KEY];
      if (
        serverEntry &&
        serverEntry.tier !== 'CONCEPT_NEUTRAL' &&
        serverEntry.neutralConcepts?.length
      ) {
        const lines: string[] = [
          `Concepts (stack-neutral): ${serverEntry.neutralConcepts.join(', ')}`,
        ];
        if (serverEntry.implementationNotes) {
          lines.push(`Implementation notes: ${serverEntry.implementationNotes}`);
        }
        if (serverEntry.degraded) {
          lines.push(
            `Note (degraded): ${serverEntry.degradedReason ?? 'degraded semantics on this stack'}`,
          );
        }
        return lines.join('\n');
      }
    }

    // Tier 3: No additional context — iron rules only (backward compatible)
    return '';
  }

  private async generateForStep(
    input: StationInput,
    step: Record<string, unknown>,
    generatedMethodNames: Set<string>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    // Build system prompt from INVENTORY prompts + RAG snippets
    const systemParts: string[] = [];
    for (const p of input.prompts) {
      if (p.role === 'system') {
        systemParts.push(p.content as string);
      }
    }

    // Z-1.2: Add mechanism-first stack coupling context (Section 4)
    const section4 = await this.assembleSection4(input);
    if (section4) {
      systemParts.push(section4);
    }

    // Add RAG context
    if (input.ragContext.length > 0) {
      const ragLines = ['Relevant patterns from skill library:'];
      for (const pat of input.ragContext.slice(0, 5)) {
        ragLines.push(`- ${pat.name ?? ''}: ${pat.description ?? ''}`);
        if (pat.code_snippet) {
          ragLines.push(`  Example: ${String(pat.code_snippet).substring(0, 200)}`);
        }
      }
      systemParts.push(ragLines.join('\n'));
    }

    const systemPrompt = systemParts.length > 0 ? systemParts.join('\n\n') : undefined;

    // Z14-1 (R19): NULL_SYSTEM_PROMPT guard — required for all task types including FLOW-15
    if (!systemPrompt || systemPrompt.trim().length === 0) {
      return DataProcessResult.failure(
        'NULL_SYSTEM_PROMPT',
        `System prompt is null or empty for taskType ${input.taskType}. Generation aborted to prevent unconstrained output.`,
      );
    }

    // Build generation prompt
    const promptParts: string[] = [`Task type: ${input.taskType}`];
    if (input.spec.description) {
      promptParts.push(`Description: ${input.spec.description}`);
    }
    promptParts.push(`Step: ${step.description ?? 'Generate code'}`);
    promptParts.push(`Template: ${step.template ?? 'generic'}`);
    if (step.factory_interfaces) {
      promptParts.push(`Factory interfaces: ${JSON.stringify(step.factory_interfaces)}`);
    }
    if (step.fabric_type) {
      promptParts.push(`Fabric: ${step.fabric_type}`);
    }

    // Step-routing directive: inject lifecycle_transitions for service_impl steps.
    // Prevents the single execute() collapse observed in Phase A dry-run (Issue #1).
    const isLifecycleStep = step.template === 'service_impl' || step.include_lifecycle === true;
    if (isLifecycleStep) {
      const transitions = input.spec.lifecycle_transitions as
        | Array<Record<string, unknown>>
        | undefined;
      if (transitions && transitions.length > 0) {
        const handlerList = transitions
          .map((t) => {
            const method = String(t.handler_method ?? t.method ?? t.name ?? '');
            const trigger = String(t.trigger ?? t.event ?? '');
            return method ? `  - ${method}() — triggered by: ${trigger}` : `  - ${trigger}`;
          })
          .filter(Boolean)
          .join('\n');
        promptParts.push(
          `Lifecycle transitions (generate ONE named method per transition — do NOT collapse into a single execute()):\n${handlerList}`,
        );
      }
    }

    // Anti-collision directive: tell the model which methods were already generated
    // in prior steps so it does not emit duplicate method bodies.
    if (generatedMethodNames.size > 0) {
      const alreadyDone = [...generatedMethodNames].join(', ');
      promptParts.push(
        `ALREADY GENERATED in prior steps (DO NOT regenerate — reference only): ${alreadyDone}`,
      );
    }

    // Add generation prompts from INVENTORY
    for (const p of input.prompts) {
      if (p.role === 'generation') {
        promptParts.push(p.content as string);
      }
    }

    const prompt = promptParts.join('\n');
    const maxTokens = (input.metadata.max_tokens as number) ?? 4096;

    return this.aiProvider.generate(prompt, {
      systemPrompt,
      maxTokens,
    });
  }
}
