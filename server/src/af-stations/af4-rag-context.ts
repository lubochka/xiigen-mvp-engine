/**
 * AF-4: RAG (Task Context) Station.
 *
 * Searches the skill library for reusable patterns relevant to the current task.
 * In-memory index with keyword scoring; production uses RAG Fabric (IRagService).
 *
 * Phase 8.1: INVENTORY sub-engine component.
 *
 * Turn 6 (MVP Plan v3, Goals 4b + 4c + 4d): AF-4 now consults
 * TenantModuleRegistry before running its search. The tenant's registered
 * marketplace modules (Linked-mode installs per DD-324) are appended to the
 * StationOutput as `linkedModules: string[]`. When production swaps the
 * in-memory index for IRagService, this list becomes the FLOW_SCOPED filter
 * passed on the RAG query so tenants see registered modules' knowledge
 * without owning a copy of the topology.
 */

import { Injectable, Optional } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';
import { TenantModuleRegistry } from '../engine/tenant-module-registry.service';
import { IAfStation, StationId, StationInput, StationOutput } from './base';

/** A skill block injectable into AF-1 Genesis prompt context. */
export interface SkillBlock {
  key: 'SK-PLAN' | 'SK-TEST' | 'SK-DNA' | 'SK-BFA' | 'SK-DOCS';
  content: string;
  priority: number;
}

/** Maximum active skill blocks per AF call (MACHINE rule). */
const MAX_SKILL_BLOCKS = 3;

@Injectable()
export class RagContextStation extends IAfStation {
  readonly stationId = StationId.AF4_RAG_CONTEXT;

  private readonly patterns: Array<Record<string, unknown>> = [];

  /**
   * Turn 6 — @Optional() keeps the existing test constructions
   * `new RagContextStation()` (no-arg) compiling. In production DI, the
   * container supplies TenantModuleRegistry; in unit tests it's undefined,
   * and the registry check gracefully degrades to an empty linkedModules list.
   */
  constructor(@Optional() private readonly moduleRegistry?: TenantModuleRegistry) {
    super();
    this.loadCorePatterns();
  }

  async execute(input: StationInput): Promise<DataProcessResult<StationOutput>> {
    if (!input.tenantId) {
      return DataProcessResult.failure('MISSING_TENANT', 'tenant_id required (DNA-5)');
    }

    const start = Date.now();
    const keywords = this.extractKeywords(input);
    const matches = this.search(keywords);
    const skillBlocks = this.selectSkillsForContext(input);

    // Turn 6 — Linked-mode RAG scope expansion. Failure here is non-fatal:
    // the station still returns the in-memory pattern matches; linkedModules
    // is just empty when the registry is unavailable or fails. Once
    // IRagService replaces the in-memory index, this list becomes the
    // FLOW_SCOPED filter on the RAG query.
    const linkedModules = await this.resolveLinkedModules(input.tenantId);

    return DataProcessResult.success(
      new StationOutput({
        stationId: this.stationId,
        success: true,
        data: {
          patterns: matches,
          keywords,
          count: matches.length,
          skillBlocks,
          skillBlockCount: skillBlocks.length,
          linkedModules,
          linkedModuleCount: linkedModules.length,
        },
        elapsedMs: Date.now() - start,
      }),
    );
  }

  /**
   * Turn 6 — fetch the tenant's Linked-mode module registrations. Returns
   * flowIds only. When no TenantModuleRegistry is injected (unit tests
   * instantiate the station directly), returns an empty list. Errors from
   * the registry lookup are swallowed because AF-4 must remain resilient —
   * generation should not fail because a registry read was transient.
   */
  private async resolveLinkedModules(tenantId: string): Promise<string[]> {
    if (!this.moduleRegistry) return [];
    const result = await this.moduleRegistry.listLinkedModules(tenantId);
    if (!result.isSuccess || !result.data) return [];
    return result.data;
  }

  /** Add a pattern to the searchable index. */
  indexPattern(pattern: Record<string, unknown>): void {
    this.patterns.push(pattern);
  }

  /** Search patterns by keywords. Simple tag+name+description scoring. */
  search(keywords: string[], maxResults = 5): Array<Record<string, unknown>> {
    if (!keywords.length) return [];

    const kwLower = keywords.map((k) => k.toLowerCase());
    const scored: Array<{ score: number; pattern: Record<string, unknown> }> = [];

    for (const pattern of this.patterns) {
      let score = 0;
      const tags = ((pattern.tags as string[]) ?? []).map((t) => t.toLowerCase());
      const name = ((pattern.name as string) ?? '').toLowerCase();
      const desc = ((pattern.description as string) ?? '').toLowerCase();

      for (const kw of kwLower) {
        if (tags.includes(kw)) score += 3;
        if (name.includes(kw)) score += 2;
        if (desc.includes(kw)) score += 1;
      }

      if (score > 0) scored.push({ score, pattern });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, maxResults).map((s) => s.pattern);
  }

  /** Number of indexed patterns. */
  get patternCount(): number {
    return this.patterns.length;
  }

  /** 5 injectable skill block definitions. */
  private readonly skillBlocks: Record<string, SkillBlock> = {
    'SK-PLAN': {
      key: 'SK-PLAN',
      priority: 1,
      content:
        'PLANNING: Decompose into ≤5 steps. Validate BFA conflicts before proceeding. ' +
        'Use DataProcessResult.failure() for gate failures.',
    },
    'SK-TEST': {
      key: 'SK-TEST',
      priority: 2,
      content:
        'TESTING: Write 3 failing tests before any fix (unit + simulation + e2e). ' +
        'Use sample-contracts.ts fixtures. No synthetic mocks.',
    },
    'SK-DNA': {
      key: 'SK-DNA',
      priority: 3,
      content:
        'DNA COMPLIANCE: No class definitions in generated code (DNA-1). ' +
        'Use MicroserviceBase (DNA-4). tenantId from context only (DNA-5). Enqueues after store (DNA-8).',
    },
    'SK-BFA': {
      key: 'SK-BFA',
      priority: 4,
      content:
        'BFA REGISTRATION: New entities/events/routes must be registered in the BFA registry. ' +
        'Check FLOW cross-references. No duplicate event names.',
    },
    'SK-DOCS': {
      key: 'SK-DOCS',
      priority: 5,
      content:
        'DOCUMENTATION: Sync ENGINE_ARCHITECTURE_MERGED and TASK_TYPES_CATALOG_MERGED. ' +
        'Update CLAUDE.md artifact numbers. Run documentation-sync checklist.',
    },
  };

  /**
   * Select ≤MAX_SKILL_BLOCKS blocks for this generation context.
   *
   * Activation rules (MACHINE):
   *   SK-PLAN: metadata.iteration ≤ 2 OR spec.archetype === 'ORCHESTRATION'
   *   SK-DNA:  spec.dna_compliance < 0.7 OR spec.is_new_service === true
   *   SK-TEST: spec.test_quality < 0.5
   *   SK-BFA:  spec.factory_dependencies.length > 0 OR spec.has_new_entities === true
   *   SK-DOCS: metadata.is_last_step === true
   */
  selectSkillsForContext(input: StationInput): SkillBlock[] {
    const active: SkillBlock[] = [];

    const archetype = (input.spec.archetype as string) ?? '';
    const iteration = (input.metadata.iteration as number) ?? 0;
    const dnaCompliance = (input.spec.dna_compliance as number) ?? 1.0;
    const testQuality = (input.spec.test_quality as number) ?? 1.0;
    const deps = (input.spec.factory_dependencies as Array<Record<string, unknown>>) ?? [];
    const isLastStep = (input.metadata.is_last_step as boolean) ?? false;
    const isNewService = (input.spec.is_new_service as boolean) ?? false;

    if (iteration <= 2 || archetype === 'ORCHESTRATION') active.push(this.skillBlocks['SK-PLAN']);
    if (dnaCompliance < 0.7 || isNewService) active.push(this.skillBlocks['SK-DNA']);
    if (testQuality < 0.5) active.push(this.skillBlocks['SK-TEST']);
    if (deps.length > 0 || (input.spec.has_new_entities as boolean))
      active.push(this.skillBlocks['SK-BFA']);
    if (isLastStep) active.push(this.skillBlocks['SK-DOCS']);

    active.sort((a, b) => a.priority - b.priority);
    return active.slice(0, MAX_SKILL_BLOCKS);
  }

  /** Extract search keywords from input spec. */
  extractKeywords(input: StationInput): string[] {
    const keywords: string[] = [];

    if (input.taskType) keywords.push(input.taskType);

    const spec = input.spec;
    if (spec.archetype) keywords.push(spec.archetype as string);

    const deps = (spec.factory_dependencies as Array<Record<string, unknown>>) ?? [];
    for (const dep of deps) {
      if (typeof dep === 'object' && dep.fabric_type) {
        keywords.push(dep.fabric_type as string);
      } else if (typeof dep === 'string') {
        keywords.push(dep);
      }
    }

    if (spec.description && typeof spec.description === 'string') {
      const words = spec.description.toLowerCase().split(/\s+/);
      keywords.push(...words.filter((w) => w.length > 4));
    }

    return keywords.slice(0, 10);
  }

  private loadCorePatterns(): void {
    const core: Array<Record<string, unknown>> = [
      {
        id: 'SK-01',
        name: 'MicroserviceBase',
        tags: ['microservice', 'base', 'inheritance', 'service', 'DNA-4'],
        description: 'Base class with 20 architectural components. All services inherit this.',
        code_snippet:
          'class MyService extends MicroserviceBase {\n  constructor(config) { super(config); }\n}',
      },
      {
        id: 'SK-02',
        name: 'DataProcessResult Pattern',
        tags: ['result', 'error', 'return', 'DNA-3'],
        description: 'Return DataProcessResult instead of throwing exceptions for business logic.',
        code_snippet:
          'return DataProcessResult.success(data);\nreturn DataProcessResult.failure("CODE", "message");',
      },
      {
        id: 'SK-03',
        name: 'BuildSearchFilter',
        tags: ['filter', 'query', 'search', 'elasticsearch', 'DNA-2', 'database'],
        description: 'Auto-skip empty fields when building search queries.',
        code_snippet: 'const filters = buildSearchFilter({ tenantId, status, name });',
      },
      {
        id: 'SK-04',
        name: 'Factory Resolution',
        tags: ['factory', 'createAsync', 'resolution', 'interface', 'dependency'],
        description: 'Resolve dependencies via IExternalServiceFactory.createAsync().',
        code_snippet:
          'const service = await factory.createAsync(context);\n// Never import specific provider',
      },
      {
        id: 'SK-05',
        name: 'Queue Event Pattern',
        tags: ['queue', 'event', 'redis', 'streams', 'async', 'inter-service'],
        description: 'Inter-service communication via queue events. Never direct HTTP.',
        code_snippet: 'await queue.enqueue(tenantId, "order.created", eventData);',
      },
      {
        id: 'SK-06',
        name: 'Scope Isolation',
        tags: ['tenant', 'scope', 'isolation', 'multi-tenant', 'DNA-5'],
        description: 'Every query must include tenantId for data isolation.',
        code_snippet: 'const filters = buildSearchFilter({ tenantId, ...params });',
      },
      {
        id: 'SK-07',
        name: 'DynamicController',
        tags: ['controller', 'dynamic', 'generic', 'api', 'DNA-6'],
        description: 'Generic controller pattern. No entity-specific controllers.',
        code_snippet:
          'class DynamicController extends BaseController {\n  // Routes resolved from config\n}',
      },
      {
        id: 'SK-08',
        name: 'Orchestration Archetype',
        tags: ['orchestration', 'dag', 'parallel', 'join', 'allSettled'],
        description: 'Coordinate multiple services in a DAG with parallel execution.',
        code_snippet: 'const results = await Promise.allSettled(tasks);',
      },
      {
        id: 'SK-09',
        name: 'AI Generation Pattern',
        tags: ['ai', 'generation', 'llm', 'provider', 'multi-model'],
        description: 'Use IAiProvider.generate() through fabric. Never import SDK directly.',
        code_snippet: 'const result = await aiProvider.generate(tenantId, prompt, { model });',
      },
    ];

    this.patterns.push(...core);
  }
}
