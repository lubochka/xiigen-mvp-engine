/**
 * DocsController — API endpoints for auto-generated documentation and RAG stats.
 *
 * GET /docs/openapi       — generated OpenAPI 3.0 spec
 * GET /docs/catalog       — service catalog (factories + contracts)
 * GET /docs/diagrams/:type — Mermaid diagram (module, fabric, pipeline, flow)
 * GET /docs/modules/:name — module README markdown
 * GET /rag/stats          — RAG index statistics
 *
 * DNA-1: All responses are Record<string, unknown>.
 * DNA-3: Uses DataProcessResult internally.
 *
 * Phase 11.5: API endpoints.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';
import { OpenApiGenerator, type ServerInfo } from '../doc-gen/openapi-generator';
import { ModuleReadmeGenerator } from '../doc-gen/module-readme-generator';
import { ServiceCatalogGenerator, type ServiceCatalog } from '../doc-gen/service-catalog-generator';
import { DiagramGenerator, type FlowDefinitionInput } from '../doc-gen/diagram-generator';
import { FactoryRegistry } from '../factories/factory-registry';
import { TaskTypeRegistry } from '../engine-contracts/task-type-registry';

/** Valid diagram types. */
export type DiagramType = 'module' | 'fabric' | 'pipeline' | 'flow';
const VALID_DIAGRAM_TYPES: DiagramType[] = ['module', 'fabric', 'pipeline', 'flow'];

/** RAG stats snapshot. */
export interface RagStats {
  readonly totalPatterns: number;
  readonly byCategory: Record<string, number>;
  readonly lastIndexedAt: string | null;
  readonly indexingStatus: 'not_started' | 'complete' | 'failed';
}

@Injectable()
export class DocsController {
  private readonly serverInfo: ServerInfo = {
    title: 'XIIGen Engine',
    version: '1.0.0',
    description: 'Self-building code generation engine API',
    serverUrl: 'http://localhost:3000',
  };

  /** Cached catalog (rebuilt on demand). */
  private cachedCatalog: ServiceCatalog | null = null;

  /** RAG stats — updated after indexing. */
  private ragStatsSnapshot: RagStats = {
    totalPatterns: 0,
    byCategory: {},
    lastIndexedAt: null,
    indexingStatus: 'not_started',
  };

  constructor(
    private readonly openApiGenerator: OpenApiGenerator,
    private readonly moduleReadmeGenerator: ModuleReadmeGenerator,
    private readonly serviceCatalogGenerator: ServiceCatalogGenerator,
    private readonly diagramGenerator: DiagramGenerator,
    private readonly factoryRegistry: FactoryRegistry,
    private readonly taskTypeRegistry: TaskTypeRegistry,
  ) {}

  /**
   * GET /docs/openapi — returns the generated OpenAPI specification.
   */
  getOpenApi(): DataProcessResult<Record<string, unknown>> {
    const routes = this.openApiGenerator.getEngineRoutes();
    return this.openApiGenerator.generate(routes, this.serverInfo);
  }

  /**
   * GET /docs/catalog — returns the service catalog.
   */
  getCatalog(): DataProcessResult<ServiceCatalog> {
    const result = this.serviceCatalogGenerator.generate(
      this.factoryRegistry,
      this.taskTypeRegistry,
    );
    if (result.isSuccess && result.data) {
      this.cachedCatalog = result.data;
    }
    return result;
  }

  /**
   * GET /docs/diagrams/:type — returns a Mermaid diagram string.
   */
  getDiagram(
    diagramType: string,
    flowDef?: {
      name?: string;
      nodes: Array<{ id: string; label: string; type: string; factoryId?: string }>;
      edges: Array<{ from: string; to: string; label?: string }>;
    },
  ): DataProcessResult<Record<string, unknown>> {
    if (!VALID_DIAGRAM_TYPES.includes(diagramType as DiagramType)) {
      return DataProcessResult.failure(
        'INVALID_DIAGRAM_TYPE',
        `Invalid diagram type: '${diagramType}'. Valid types: ${VALID_DIAGRAM_TYPES.join(', ')}`,
      );
    }

    let mermaidResult: DataProcessResult<string>;

    switch (diagramType as DiagramType) {
      case 'module':
        mermaidResult = this.diagramGenerator.generateModuleDependencyDiagram();
        break;
      case 'fabric':
        mermaidResult = this.diagramGenerator.generateFabricLayerDiagram();
        break;
      case 'pipeline':
        mermaidResult = this.diagramGenerator.generatePipelineDiagram();
        break;
      case 'flow':
        if (!flowDef) {
          return DataProcessResult.failure(
            'MISSING_FLOW_DEF',
            'Flow definition required for flow diagram type',
          );
        }
        mermaidResult = this.diagramGenerator.generateFlowDagDiagram(
          flowDef as FlowDefinitionInput,
        );
        break;
      default:
        return DataProcessResult.failure('UNKNOWN_TYPE', `Unknown diagram type: ${diagramType}`);
    }

    if (!mermaidResult.isSuccess) {
      return DataProcessResult.failure(
        mermaidResult.errorCode ?? 'DIAGRAM_FAILED',
        mermaidResult.errorMessage ?? 'Diagram generation failed',
      );
    }

    return DataProcessResult.success({
      type: diagramType,
      mermaid: mermaidResult.data,
    });
  }

  /**
   * GET /docs/modules/:name — returns module README markdown.
   */
  getModuleReadme(moduleName: string): DataProcessResult<Record<string, unknown>> {
    const allModules = this.moduleReadmeGenerator.getEngineModuleMetadata();
    const meta = allModules.find((m) => m.name === moduleName);

    if (!meta) {
      const availableNames = allModules.map((m) => m.name);
      return DataProcessResult.failure(
        'MODULE_NOT_FOUND',
        `Module '${moduleName}' not found. Available: ${availableNames.join(', ')}`,
      );
    }

    const readmeResult = this.moduleReadmeGenerator.generateForModule(meta);
    if (!readmeResult.isSuccess) {
      return DataProcessResult.failure(
        'README_FAILED',
        readmeResult.errorMessage ?? 'README generation failed',
      );
    }

    return DataProcessResult.success({
      module_name: moduleName,
      markdown: readmeResult.data,
    });
  }

  /**
   * GET /rag/stats — returns RAG index statistics.
   */
  getRagStats(): DataProcessResult<RagStats> {
    return DataProcessResult.success(this.ragStatsSnapshot);
  }

  /**
   * Update RAG stats after indexing completes.
   * Called by RagBootstrapPhase after indexing.
   */
  updateRagStats(stats: { totalPatterns: number; byCategory: Record<string, number> }): void {
    this.ragStatsSnapshot = {
      totalPatterns: stats.totalPatterns,
      byCategory: { ...stats.byCategory },
      lastIndexedAt: new Date().toISOString(),
      indexingStatus: 'complete',
    };
  }

  /**
   * Mark RAG indexing as failed.
   */
  markRagFailed(): void {
    this.ragStatsSnapshot = {
      ...this.ragStatsSnapshot,
      indexingStatus: 'failed',
    };
  }
}
