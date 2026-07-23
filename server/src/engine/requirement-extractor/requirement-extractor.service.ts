import { Injectable, Logger, Inject } from '@nestjs/common';
import { IAiProvider, AI_PROVIDER } from '../../fabrics/interfaces/ai-provider.interface';
import {
  DATABASE_SERVICE,
  type IDatabaseService,
} from '../../fabrics/interfaces/database.interface';
import { ES_INDEX } from '../../kernel/es-index-constants';

export interface CapabilitySpec {
  name: string;
  description: string;
  archetype: string;
  matchesPattern: string | null;
  needsNewFlow: boolean;
  technologyHints: string[];
  dependencies: string[];
}

export interface EntitySpec {
  name: string;
  attributes: string[];
  relationships: string[];
}

export interface UserFlowSpec {
  name: string;
  steps: string[];
  involvedCapabilities: string[];
}

export interface SystemContext {
  existingSystem: boolean;
  stackHints: string[];
  notes: string;
}

export interface CapabilityMap {
  capabilities: CapabilitySpec[];
  entities: EntitySpec[];
  userFlows: UserFlowSpec[];
  systemContext: SystemContext;
}

interface ExtractionPrompt {
  promptId: string;
  systemPrompt: string;
  userPromptTemplate: string;
}

/**
 * RequirementExtractorService — converts a natural language system description
 * into a structured capability map.
 *
 * Reads the requirement-extract genesis prompt from the RAG prompt store,
 * fetches known XIIGen flow patterns for matching, and optionally cross-references
 * with a project's existing PROJECT_UNDERSTANDING if projectId is provided.
 *
 * CF-805: Output must be valid JSON matching the capability map schema.
 * CF-806: Every capability archetype must be one of the defined enum values.
 */
@Injectable()
export class RequirementExtractorService {
  private readonly logger = new Logger(RequirementExtractorService.name);

  constructor(
    @Inject(AI_PROVIDER)
    private readonly aiProvider: IAiProvider,
    @Inject(DATABASE_SERVICE)
    private readonly dbService: IDatabaseService,
  ) {}

  /**
   * Extract a structured capability map from a natural language description.
   *
   * @param description — user's natural language system description
   * @param projectId — optional; if provided, cross-reference with existing project capabilities
   */
  async extract(description: string, projectId?: string): Promise<CapabilityMap> {
    const prompt = await this.loadPrompt('requirement-extract--genesis--v1.0.0');

    // Retrieve known XIIGen flow patterns for the AI to match against
    const knownPatternsText = await this.loadKnownPatterns();

    // Cross-reference with existing project capabilities if projectId provided
    const projectCapabilitiesText = projectId ? await this.loadProjectCapabilities(projectId) : '';

    const userPrompt = prompt.userPromptTemplate
      .replace('{{DESCRIPTION}}', description + projectCapabilitiesText)
      .replace('{{KNOWN_PATTERNS}}', knownPatternsText || 'No patterns loaded yet');

    const result = await this.aiProvider.generate(userPrompt, {
      systemPrompt: prompt.systemPrompt,
      maxTokens: 2000,
    });

    if (!result.isSuccess || !result.data) {
      throw new Error(`RequirementExtraction AI call failed: ${result.errorMessage}`);
    }

    const text = result.data['text'] as string;
    return JSON.parse(this.extractJson(text)) as CapabilityMap;
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private async loadKnownPatterns(): Promise<string> {
    const result = await this.dbService.searchDocuments(
      ES_INDEX.RAG_PATTERNS,
      { patternType: 'ARCH_PATTERN' },
      20,
    );

    if (!result.isSuccess || !result.data?.length) {
      return 'No patterns loaded yet';
    }

    return result.data
      .map((p) => {
        const flow = (p['_reference'] as Record<string, unknown>)?.['flow'] ?? 'FLOW-??';
        return `${flow}: ${p['archetype'] ?? 'UNKNOWN'} — ${p['keywords'] ?? ''}`;
      })
      .join('\n');
  }

  private async loadProjectCapabilities(projectId: string): Promise<string> {
    const result = await this.dbService.searchDocuments(
      ES_INDEX.RAG_PATTERNS,
      { patternType: 'PROJECT_UNDERSTANDING', projectId },
      1,
    );

    if (!result.isSuccess || !result.data?.length) {
      return '';
    }

    const understanding = result.data[0];
    const caps = (understanding['existingCapabilities'] as Array<Record<string, unknown>>) ?? [];
    if (!caps.length) return '';

    const capList = caps
      .map((c) => `- ${String(c['name'])}: ${String(c['purpose'] ?? '')}`)
      .join('\n');

    return `\n\n## Already exists in project ${projectId}:\n${capList}`;
  }

  private async loadPrompt(promptId: string): Promise<ExtractionPrompt> {
    const result = await this.dbService.searchDocuments('xiigen-prompts', { promptId }, 1);

    if (!result.isSuccess || !result.data?.length) {
      throw new Error(
        `Requirement extraction prompt not found: ${promptId}. Seed fixtures/prompts/ to ES first.`,
      );
    }

    return result.data[0] as unknown as ExtractionPrompt;
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
