/**
 * ModuleReadmeGenerator — auto-generates markdown README for each NestJS module.
 *
 * Input: ModuleMetadata objects describing each module's providers, exports, imports.
 * Output: markdown strings for each module.
 *
 * DNA-3: returns DataProcessResult.
 * Phase 11.3.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';

// ── Module Metadata ─────────────────────────────────

export interface ModuleMetadata {
  name: string;
  description: string;
  phase: string;
  providers: ProviderInfo[];
  exports: string[];
  imports: string[];
  isGlobal?: boolean;
  dnaCompliance: string[];
  testCount?: number;
}

export interface ProviderInfo {
  name: string;
  type: 'service' | 'factory' | 'controller' | 'station' | 'guard' | 'other';
  description: string;
}

// ── Generator ───────────────────────────────────────

@Injectable()
export class ModuleReadmeGenerator {
  /**
   * Generate markdown README for a single module.
   */
  generateForModule(meta: ModuleMetadata): DataProcessResult<string> {
    const lines: string[] = [];

    // Title
    lines.push(`# ${meta.name}`);
    lines.push('');
    if (meta.isGlobal) lines.push('> **@Global** module — available everywhere without importing.');
    lines.push(`**Phase:** ${meta.phase}`);
    if (meta.testCount !== undefined) lines.push(`**Tests:** ${meta.testCount}`);
    lines.push('');

    // Description
    lines.push('## Overview');
    lines.push('');
    lines.push(meta.description);
    lines.push('');

    // Providers
    if (meta.providers.length > 0) {
      lines.push('## Providers');
      lines.push('');
      lines.push('| Name | Type | Description |');
      lines.push('|------|------|-------------|');
      for (const p of meta.providers) {
        lines.push(`| \`${p.name}\` | ${p.type} | ${p.description} |`);
      }
      lines.push('');
    }

    // Exports
    if (meta.exports.length > 0) {
      lines.push('## Exports');
      lines.push('');
      for (const exp of meta.exports) {
        lines.push(`- \`${exp}\``);
      }
      lines.push('');
    }

    // Imports
    if (meta.imports.length > 0) {
      lines.push('## Imports');
      lines.push('');
      for (const imp of meta.imports) {
        lines.push(`- \`${imp}\``);
      }
      lines.push('');
    }

    // DNA Compliance
    if (meta.dnaCompliance.length > 0) {
      lines.push('## DNA Compliance');
      lines.push('');
      for (const dna of meta.dnaCompliance) {
        lines.push(`- ${dna}`);
      }
      lines.push('');
    }

    return DataProcessResult.success(lines.join('\n'));
  }

  /**
   * Generate READMEs for all modules.
   */
  generateAll(modules: ModuleMetadata[]): DataProcessResult<Map<string, string>> {
    const results = new Map<string, string>();

    for (const meta of modules) {
      const result = this.generateForModule(meta);
      if (result.isSuccess && result.data) {
        results.set(meta.name, result.data);
      }
    }

    return DataProcessResult.success(results);
  }

  /**
   * Get metadata for all engine modules.
   * This is the single source of truth for module documentation.
   */
  getEngineModuleMetadata(): ModuleMetadata[] {
    return [
      {
        name: 'KernelModule',
        description:
          'Core kernel: DataProcessResult, ObjectProcessor, multi-tenant context, dynamic controller, scope guard.',
        phase: 'P1–P3',
        providers: [
          {
            name: 'ClsModule',
            type: 'service',
            description: 'Continuation-local storage for tenant context',
          },
          {
            name: 'ScopeGuard',
            type: 'guard',
            description: 'Validates tenant context on every request (DNA-5)',
          },
          {
            name: 'DynamicController',
            type: 'controller',
            description: 'Generic controller — no entity-specific controllers (DNA-6)',
          },
        ],
        exports: ['ClsModule', 'ScopeGuard', 'DynamicController'],
        imports: [],
        isGlobal: true,
        dnaCompliance: [
          'DNA-1: ObjectProcessor dict-only payloads',
          'DNA-3: DataProcessResult on all operations',
          'DNA-5: TenantContext in CLS',
          'DNA-6: DynamicController',
        ],
        testCount: 350,
      },
      {
        name: 'MultiTenantModule',
        description: 'Multi-tenant isolation: TenantRegistry for CRUD, TenantContext injection.',
        phase: 'P4',
        providers: [
          {
            name: 'TenantRegistry',
            type: 'service',
            description: 'Create, find, update, deactivate tenants',
          },
        ],
        exports: ['TenantRegistry'],
        imports: ['KernelModule'],
        isGlobal: true,
        dnaCompliance: ['DNA-5: All queries scoped by tenantId'],
        testCount: 80,
      },
      {
        name: 'FabricsModule',
        description:
          'Six fabric layers: Database, Queue, AI Engine, RAG, Secrets, Flow Engine. All resolved via config.',
        phase: 'P5',
        providers: [
          {
            name: 'InMemoryDatabaseProvider',
            type: 'service',
            description: 'In-memory IDatabaseService (DNA-2 compliant)',
          },
          {
            name: 'InMemoryQueueProvider',
            type: 'service',
            description: 'In-memory IQueueService with consumer groups',
          },
          {
            name: 'InMemoryAiProvider',
            type: 'service',
            description: 'Mock IAiProvider for testing',
          },
          {
            name: 'InMemoryRagProvider',
            type: 'service',
            description: 'In-memory IRagService with keyword search',
          },
          {
            name: 'InMemorySecretsProvider',
            type: 'service',
            description: 'In-memory ISecretsService',
          },
          {
            name: 'InMemoryFlowStore',
            type: 'service',
            description: 'In-memory flow definition store',
          },
        ],
        exports: [
          'DATABASE_SERVICE',
          'QUEUE_SERVICE',
          'AI_PROVIDER',
          'RAG_SERVICE',
          'SECRETS_SERVICE',
          'FLOW_DEFINITION',
        ],
        imports: ['KernelModule'],
        dnaCompliance: [
          'DNA-2: BuildSearchFilter in database provider',
          'DNA-3: All fabric methods return DataProcessResult',
          'DNA-5: Tenant scoping via CLS',
        ],
        testCount: 200,
      },
      {
        name: 'FactoriesModule',
        description:
          'Factory registry + 6 bridge factories for fabric resolution via CreateAsync().',
        phase: 'P6',
        providers: [
          {
            name: 'FactoryRegistry',
            type: 'service',
            description: 'Register and resolve factory interfaces',
          },
          {
            name: 'DatabaseServiceFactory',
            type: 'factory',
            description: 'IDatabaseService → DATABASE fabric',
          },
          {
            name: 'QueueServiceFactory',
            type: 'factory',
            description: 'IQueueService → QUEUE fabric',
          },
          {
            name: 'AiProviderFactory',
            type: 'factory',
            description: 'IAiProvider → AI_ENGINE fabric',
          },
          { name: 'RagServiceFactory', type: 'factory', description: 'IRagService → RAG fabric' },
          {
            name: 'SecretsServiceFactory',
            type: 'factory',
            description: 'ISecretsService → SECRETS fabric',
          },
        ],
        exports: ['FactoryRegistry'],
        imports: ['FabricsModule'],
        dnaCompliance: [
          'Factory pattern: all deps resolved via CreateAsync()',
          'Config-first routing: read config → resolve → validate → fallback',
        ],
        testCount: 120,
      },
      {
        name: 'EngineContractsModule',
        description: 'TaskTypeRegistry + TemplateRenderer for engine contract management.',
        phase: 'P6',
        providers: [
          {
            name: 'TaskTypeRegistry',
            type: 'service',
            description: 'Register and list engine contracts',
          },
          {
            name: 'TemplateRenderer',
            type: 'service',
            description: 'Render flow definitions from contracts',
          },
        ],
        exports: ['TaskTypeRegistry', 'TemplateRenderer'],
        imports: [],
        dnaCompliance: ['DNA-1: Contracts stored as dicts', 'DNA-3: DataProcessResult returns'],
        testCount: 80,
      },
      {
        name: 'GuardrailsModule',
        description: 'BFA (Business Flow Arbiter), DnaPatternValidator, PromotionLadder.',
        phase: 'P7',
        providers: [
          {
            name: 'BusinessFlowArbiter',
            type: 'service',
            description: 'Cross-flow conflict detection before deployment',
          },
          {
            name: 'DnaPatternValidator',
            type: 'service',
            description: 'Validates generated code against 9 DNA patterns',
          },
          {
            name: 'PromotionLadder',
            type: 'service',
            description: 'GENERATED → INJECTED → MINIMAL → CORE promotion',
          },
        ],
        exports: ['BusinessFlowArbiter', 'DnaPatternValidator', 'PromotionLadder'],
        imports: [],
        dnaCompliance: [
          'Enforces all 9 DNA patterns on generated code',
          'BFA prevents cross-flow entity/event/API conflicts',
        ],
        testCount: 150,
      },
      {
        name: 'FreedomModule',
        description: 'FREEDOM config management — admin-editable layer on top of MACHINE values.',
        phase: 'P7',
        providers: [
          {
            name: 'FreedomConfigManager',
            type: 'service',
            description: 'Store/retrieve FREEDOM config per task type',
          },
          {
            name: 'ConfigBuilder',
            type: 'service',
            description: 'Build config from MACHINE + FREEDOM layers',
          },
        ],
        exports: ['FreedomConfigManager', 'ConfigBuilder'],
        imports: [],
        dnaCompliance: [
          'MACHINE vs FREEDOM split: invariant in code, configurable in Elasticsearch',
        ],
        testCount: 60,
      },
      {
        name: 'AfStationsModule',
        description:
          '11 AF stations: INVENTORY (AF-3, AF-4, AF-5), SYNTHESIS (AF-1, AF-2, AF-10), JUDGMENT (AF-6, AF-7, AF-8, AF-9, AF-11).',
        phase: 'P8',
        providers: [
          {
            name: 'PromptLibrary',
            type: 'station',
            description: 'AF-3: Domain-specific prompt retrieval',
          },
          { name: 'RagContextStation', type: 'station', description: 'AF-4: RAG pattern search' },
          {
            name: 'ModelOrchestrator',
            type: 'station',
            description: 'AF-5: Multi-model parallel execution',
          },
          {
            name: 'GenesisStation',
            type: 'station',
            description: 'AF-1: Code generation from spec',
          },
          { name: 'PlanningStation', type: 'station', description: 'AF-2: Step decomposition' },
          {
            name: 'MergeStation',
            type: 'station',
            description: 'AF-10: Multi-model output combination',
          },
          {
            name: 'CodeReviewStation',
            type: 'station',
            description: 'AF-6: Automated code review',
          },
          { name: 'SecurityStation', type: 'station', description: 'AF-8: Security scan' },
          {
            name: 'FeedbackStation',
            type: 'station',
            description: 'AF-11: Quality feedback storage',
          },
        ],
        exports: ['InventoryEngine', 'SynthesisEngine', 'JudgmentEngine', 'AfPipeline'],
        imports: ['GuardrailsModule'],
        dnaCompliance: [
          'All stations return DataProcessResult (DNA-3)',
          'Pipeline enforces DNA-7 compliance via AF-7',
        ],
        testCount: 170,
      },
      {
        name: 'EngineModule',
        description:
          'FlowGenerator — the ENGINE. 8-step generate(): validate → BFA → factories → AF pipeline → flow def → promotion.',
        phase: 'P9',
        providers: [
          {
            name: 'FlowGenerator',
            type: 'service',
            description: 'The engine: contract → generated code + flow definition',
          },
        ],
        exports: ['FlowGenerator'],
        imports: [
          'AfStationsModule',
          'GuardrailsModule',
          'FreedomModule',
          'FactoriesModule',
          'EngineContractsModule',
        ],
        dnaCompliance: [
          'Generated code must pass all 9 DNA patterns',
          'BFA validates before deployment',
        ],
        testCount: 60,
      },
      {
        name: 'BootstrapModule',
        description: 'HealthReporter + BootstrapSequence for 7-phase engine initialization.',
        phase: 'P9',
        providers: [
          {
            name: 'HealthReporter',
            type: 'service',
            description: 'Per-fabric health checks: HEALTHY/DEGRADED/DOWN',
          },
          {
            name: 'BootstrapSequence',
            type: 'service',
            description: '7-phase boot: SECRETS→CONFIG→DATABASE→QUEUE→AI→RAG→FLOW',
          },
        ],
        exports: ['HealthReporter', 'BootstrapSequence'],
        imports: [],
        dnaCompliance: ['DNA-5: Health checks scoped by tenant'],
        testCount: 55,
      },
      {
        name: 'ApiModule',
        description: 'HTTP controllers: HealthController, TenantController, EngineController.',
        phase: 'P9',
        providers: [
          {
            name: 'HealthController',
            type: 'controller',
            description: '/health/live, /health/ready, /health/status',
          },
          {
            name: 'TenantController',
            type: 'controller',
            description: '/tenants CRUD + config/keys/quotas',
          },
          {
            name: 'EngineController',
            type: 'controller',
            description: '/engine/generate, /engine/history, /engine/status, /engine/contracts',
          },
        ],
        exports: ['HealthController', 'TenantController', 'EngineController'],
        imports: ['BootstrapModule'],
        dnaCompliance: [
          'DNA-5: X-Tenant-Id header on all requests',
          'DNA-1: All responses are dict payloads',
        ],
        testCount: 65,
      },
    ];
  }
}
