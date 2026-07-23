import { Injectable, Logger, Inject } from '@nestjs/common';
import { IAiProvider, AI_PROVIDER } from '../../fabrics/interfaces/ai-provider.interface';
import {
  DATABASE_SERVICE,
  type IDatabaseService,
} from '../../fabrics/interfaces/database.interface';
import { ES_INDEX } from '../../kernel/es-index-constants';

export interface TestGeneratorInput {
  /** The generated service source code */
  generatedCode: string;
  /** Iron rules the service must implement */
  ironRules: Array<{ ruleId: string; text: string }>;
  /** Task type archetype (ORCHESTRATION, REGISTRATION, etc.) */
  archetype: string;
  /** Optional project ID for project-specific test conventions */
  projectId?: string;
}

export interface TestGeneratorResult {
  /** Complete unit test file code */
  unitTests: string;
  /** Complete integration test file code */
  integrationTests: string;
}

interface TestPrompt {
  promptId: string;
  systemPrompt: string;
  userPromptTemplate: string;
}

/**
 * TestGeneratorService — generates unit and integration tests for a generated service.
 *
 * Reads the test generation genesis prompts from the RAG prompt store.
 * Unit tests verify each iron rule with positive + negative cases.
 * Integration tests verify the full pipeline with real infrastructure.
 *
 * CF-816: At least N iron rules → at least N positive + N negative tests.
 * CF-817: REGISTRATION archetype always gets concurrent race test.
 */
@Injectable()
export class TestGeneratorService {
  private readonly logger = new Logger(TestGeneratorService.name);

  constructor(
    @Inject(AI_PROVIDER)
    private readonly aiProvider: IAiProvider,
    @Inject(DATABASE_SERVICE)
    private readonly dbService: IDatabaseService,
  ) {}

  /**
   * Generate unit and integration tests for the given service.
   *
   * Both test types are generated in parallel (independent prompts).
   */
  async generate(input: TestGeneratorInput): Promise<TestGeneratorResult> {
    const { generatedCode, ironRules, archetype, projectId } = input;

    const ironRulesText =
      ironRules.map((ir) => `- ${ir.ruleId}: ${ir.text}`).join('\n') ||
      'No explicit iron rules specified';

    const testFramework = await this.detectTestFramework(projectId);
    const testInfrastructure = await this.detectTestInfrastructure(projectId);

    const [unitTests, integrationTests] = await Promise.all([
      this.generateUnitTests(generatedCode, ironRulesText, archetype, testFramework, projectId),
      this.generateIntegrationTests(generatedCode, ironRulesText, archetype, testInfrastructure),
    ]);

    return { unitTests, integrationTests };
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private async generateUnitTests(
    generatedCode: string,
    ironRulesText: string,
    archetype: string,
    testFramework: string,
    projectId?: string,
  ): Promise<string> {
    const prompt = await this.loadPrompt('unit-test-generate--genesis--v1.0.0');

    const projectConventions = projectId
      ? await this.getProjectConventions(projectId)
      : 'Use NestJS Jest conventions (default)';

    const userPrompt = prompt.userPromptTemplate
      .replace('{{GENERATED_CODE}}', generatedCode)
      .replace('{{IRON_RULES}}', ironRulesText)
      .replace('{{ARCHETYPE}}', archetype)
      .replace('{{TEST_FRAMEWORK}}', testFramework)
      .replace('{{PROJECT_CONVENTIONS}}', projectConventions);

    const result = await this.aiProvider.generate(userPrompt, {
      systemPrompt: prompt.systemPrompt,
      maxTokens: 4000,
    });

    if (!result.isSuccess || !result.data) {
      throw new Error(`UnitTestGeneration AI call failed: ${result.errorMessage}`);
    }

    return result.data['text'] as string;
  }

  private async generateIntegrationTests(
    generatedCode: string,
    ironRulesText: string,
    archetype: string,
    testInfrastructure: string,
  ): Promise<string> {
    const prompt = await this.loadPrompt('integration-test-generate--genesis--v1.0.0');

    const userPrompt = prompt.userPromptTemplate
      .replace('{{GENERATED_CODE}}', generatedCode)
      .replace('{{IRON_RULES}}', ironRulesText)
      .replace('{{ARCHETYPE}}', archetype)
      .replace('{{TEST_INFRASTRUCTURE}}', testInfrastructure);

    const result = await this.aiProvider.generate(userPrompt, {
      systemPrompt: prompt.systemPrompt,
      maxTokens: 4000,
    });

    if (!result.isSuccess || !result.data) {
      throw new Error(`IntegrationTestGeneration AI call failed: ${result.errorMessage}`);
    }

    return result.data['text'] as string;
  }

  private async detectTestFramework(projectId?: string): Promise<string> {
    if (!projectId) return 'Jest + TypeScript (default)';

    const understanding = await this.getProjectUnderstanding(projectId);
    if (!understanding) return 'Jest + TypeScript (default)';

    const language = (understanding['architecture'] as Record<string, unknown>)?.['language'];
    const framework = (understanding['architecture'] as Record<string, unknown>)?.['framework'];
    if (language === 'PHP') return 'PHPUnit + WP_UnitTestCase';
    if (language === 'C#') return 'xUnit + WebApplicationFactory';
    if (language === 'Python') return 'pytest';
    if (String(framework ?? '').includes('nestjs') || language === 'TypeScript')
      return 'Jest + TypeScript';
    return 'Jest + TypeScript (default)';
  }

  private async detectTestInfrastructure(projectId?: string): Promise<string> {
    if (!projectId) return '@nestjs/testing + testcontainers (default)';

    const understanding = await this.getProjectUnderstanding(projectId);
    if (!understanding) return '@nestjs/testing + testcontainers (default)';

    const language = (understanding['architecture'] as Record<string, unknown>)?.['language'];
    if (language === 'PHP') return 'WP_UnitTestCase + Docker MySQL container';
    if (language === 'C#') return 'WebApplicationFactory + testcontainers';
    return '@nestjs/testing + testcontainers';
  }

  private async getProjectConventions(projectId: string): Promise<string> {
    const understanding = await this.getProjectUnderstanding(projectId);
    if (!understanding) return 'Use NestJS Jest conventions (default)';

    const ironRules = ((understanding['derivedIronRules'] as Array<Record<string, unknown>>) ?? [])
      .map((r) => `- ${String(r['ruleId'])}: ${String(r['text'])}`)
      .join('\n');

    return ironRules || 'Use NestJS Jest conventions (default)';
  }

  private async getProjectUnderstanding(
    projectId: string,
  ): Promise<Record<string, unknown> | null> {
    const result = await this.dbService.searchDocuments(
      ES_INDEX.RAG_PATTERNS,
      { patternType: 'PROJECT_UNDERSTANDING', projectId },
      1,
    );
    return result.isSuccess && result.data?.length ? result.data[0] : null;
  }

  private async loadPrompt(promptId: string): Promise<TestPrompt> {
    const result = await this.dbService.searchDocuments('xiigen-prompts', { promptId }, 1);

    if (!result.isSuccess || !result.data?.length) {
      throw new Error(
        `Test generation prompt not found: ${promptId}. Seed fixtures/prompts/ to ES first.`,
      );
    }

    return result.data[0] as unknown as TestPrompt;
  }
}
