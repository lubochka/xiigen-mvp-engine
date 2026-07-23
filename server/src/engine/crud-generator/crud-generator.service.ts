import { Injectable, Logger, Inject } from '@nestjs/common';
import { IAiProvider, AI_PROVIDER } from '../../fabrics/interfaces/ai-provider.interface';
import {
  DATABASE_SERVICE,
  type IDatabaseService,
} from '../../fabrics/interfaces/database.interface';
import { ES_INDEX } from '../../kernel/es-index-constants';

export interface EndpointSpec {
  method: string;
  path: string;
  description: string;
  parameters: Record<string, unknown>;
  responseSchema: Record<string, unknown>;
}

export interface CrudResult {
  endpoints: EndpointSpec[];
  generatedCode: string;
}

interface CrudPrompt {
  promptId: string;
  systemPrompt: string;
  userPromptTemplate: string;
}

/**
 * CrudGeneratorService — generates 5 REST endpoints for a simple entity.
 *
 * CRUD is NOT a flow — it has no orchestration, no events, no SLA.
 * This service bypasses the AF pipeline and uses a direct generation path.
 *
 * Always generates: LIST (paginated), GET, CREATE, UPDATE, DELETE.
 * All endpoints are scoped to tenantId (DNA-5) and use IDatabaseService (CF-809).
 *
 * CF-807: List endpoint must support pagination.
 * CF-808: All endpoints must validate tenantId scope.
 * CF-809: No direct database imports — IDatabaseService only.
 */
@Injectable()
export class CrudGeneratorService {
  private readonly logger = new Logger(CrudGeneratorService.name);

  constructor(
    @Inject(AI_PROVIDER)
    private readonly aiProvider: IAiProvider,
    @Inject(DATABASE_SERVICE)
    private readonly dbService: IDatabaseService,
  ) {}

  /**
   * Generate 5 REST endpoint handlers for the given entity.
   *
   * @param entity — entity name (e.g. 'Event')
   * @param attributes — attribute names (e.g. ['title', 'date', 'capacity'])
   * @param projectId — optional; if provided, applies project-specific conventions
   */
  async generate(entity: string, attributes: string[], projectId?: string): Promise<CrudResult> {
    const prompt = await this.loadPrompt('crud-generate--genesis--v1.0.0');

    let projectConventions = 'Use NestJS TypeScript conventions (default)';
    let runtimeContext = 'node-nestjs + IDatabaseService';

    if (projectId) {
      const understanding = await this.retrieveProjectUnderstanding(projectId);
      if (understanding) {
        const ironRules = (
          (understanding['derivedIronRules'] as Array<Record<string, unknown>>) ?? []
        )
          .map((r) => `- ${String(r['ruleId'])}: ${String(r['text'])}`)
          .join('\n');
        if (ironRules) projectConventions = ironRules;

        const arch = understanding['architecture'] as Record<string, unknown> | undefined;
        if (arch) {
          runtimeContext = `${arch['language'] ?? 'unknown'} + IDatabaseService`;
        }
      }
    }

    const entityPlural = this.pluralize(entity.toLowerCase());

    const userPrompt = prompt.userPromptTemplate
      .replace('{{ENTITY_NAME}}', entity)
      .replace('{{ATTRIBUTES}}', attributes.join(', '))
      .replace('{{PROJECT_CONVENTIONS}}', projectConventions)
      .replace('{{RUNTIME_CONTEXT}}', runtimeContext)
      .replace(/\{\{entity-plural\}\}/g, entityPlural);

    const result = await this.aiProvider.generate(userPrompt, {
      systemPrompt: prompt.systemPrompt,
      maxTokens: 3000,
    });

    if (!result.isSuccess || !result.data) {
      throw new Error(`CrudGeneration AI call failed: ${result.errorMessage}`);
    }

    const text = result.data['text'] as string;
    return JSON.parse(this.extractJson(text)) as CrudResult;
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private async retrieveProjectUnderstanding(
    projectId: string,
  ): Promise<Record<string, unknown> | null> {
    const result = await this.dbService.searchDocuments(
      ES_INDEX.RAG_PATTERNS,
      { patternType: 'PROJECT_UNDERSTANDING', projectId },
      1,
    );

    if (!result.isSuccess || !result.data?.length) {
      return null;
    }

    return result.data[0];
  }

  private async loadPrompt(promptId: string): Promise<CrudPrompt> {
    const result = await this.dbService.searchDocuments('xiigen-prompts', { promptId }, 1);

    if (!result.isSuccess || !result.data?.length) {
      throw new Error(
        `CRUD generation prompt not found: ${promptId}. Seed fixtures/prompts/ to ES first.`,
      );
    }

    return result.data[0] as unknown as CrudPrompt;
  }

  /**
   * Basic English pluralization for entity names.
   * Handles common cases (event → events, category → categories, etc.)
   */
  private pluralize(word: string): string {
    if (word.endsWith('y') && !['ay', 'ey', 'iy', 'oy', 'uy'].some((v) => word.endsWith(v))) {
      return word.slice(0, -1) + 'ies';
    }
    if (word.endsWith('s') || word.endsWith('x') || word.endsWith('z')) {
      return word + 'es';
    }
    if (word.endsWith('sh') || word.endsWith('ch')) {
      return word + 'es';
    }
    return word + 's';
  }

  /**
   * Extract the first JSON object from a text response.
   * Handles markdown code fences if present.
   */
  private extractJson(text: string): string {
    const stripped = text
      .replace(/^```(?:json)?\n?/m, '')
      .replace(/\n?```$/m, '')
      .trim();
    if (stripped.startsWith('{') || stripped.startsWith('[')) return stripped;
    const start = Math.min(
      stripped.indexOf('{') === -1 ? Infinity : stripped.indexOf('{'),
      stripped.indexOf('[') === -1 ? Infinity : stripped.indexOf('['),
    );
    if (start === Infinity) {
      throw new Error(`No JSON found in AI response: ${text.slice(0, 200)}`);
    }
    return stripped.slice(start);
  }
}
