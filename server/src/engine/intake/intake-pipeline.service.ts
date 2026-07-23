import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  ICodeRepositoryService,
  CODE_REPOSITORY_SERVICE,
  CodebaseSnapshot,
  FileTreeEntry,
} from '../../fabrics/interfaces/code-repository.interface';
import { IAiProvider, AI_PROVIDER } from '../../fabrics/interfaces/ai-provider.interface';
import {
  DATABASE_SERVICE,
  type IDatabaseService,
} from '../../fabrics/interfaces/database.interface';
import { ES_INDEX } from '../../kernel/es-index-constants';

export interface IntakeResult {
  projectId: string;
  status: 'complete' | 'partial' | 'failed';
  understanding?: Record<string, unknown>;
  errors?: string[];
}

interface IntakePrompt {
  promptId: string;
  systemPrompt: string;
  userPromptTemplate: string;
}

/**
 * IntakePipelineService — orchestrates the 6-stage system intake pipeline.
 *
 * Stages implemented per session:
 *   O-2: Stage 1 (ARCHITECTURE_SCAN) + Stage 2 (CONVENTION_EXTRACT)
 *   O-3: Stage 3 (CAPABILITY_INVENTORY) + Stage 4/5 (on-demand at gen time)
 *   O-4: Stage 6 (DERIVED_CONTEXT_ASSEMBLY) + AF-1 integration
 *
 * NOTE: INTEGRATION_ANALYSIS and IRON_RULE_DERIVATION are NOT called here —
 * they are request-scoped and run on-demand in AF-1 (SESSION-O-4).
 *
 * CF-797: PROJECT_UNDERSTANDING must exist before AF-1 Tier 1 path activates.
 * CF-798: Convention confidence below threshold must be excluded, never approximated.
 * CF-799: All architecture fields derived from file evidence.
 * CF-800: Framework detection must cite the specific file that reveals it.
 */
@Injectable()
export class IntakePipelineService {
  private readonly logger = new Logger(IntakePipelineService.name);

  constructor(
    @Inject(CODE_REPOSITORY_SERVICE)
    private readonly repoService: ICodeRepositoryService,
    @Inject(AI_PROVIDER)
    private readonly aiProvider: IAiProvider,
    @Inject(DATABASE_SERVICE)
    private readonly dbService: IDatabaseService,
  ) {}

  /**
   * Run the full 6-stage intake pipeline for a project.
   *
   * @param projectId — unique project identifier; used as RAG document key
   * @param repoService — scoped provider instance for this request; caller is responsible
   *   for loadArchive() before calling this method (ZipArchiveProvider). Not injected via DI
   *   because each request reads a different archive.
   */
  async runIntake(projectId: string, repoService: ICodeRepositoryService): Promise<IntakeResult> {
    this.logger.log(`Starting intake for project: ${projectId}`);

    try {
      const snapshot = await repoService.getCodebase();

      // Stage 1: ARCHITECTURE_SCAN
      const architecture = await this.runArchitectureScan(snapshot);
      // Stage 2: CONVENTION_EXTRACT
      const conventions = await this.runConventionExtract(snapshot, architecture);
      // Stage 3: CAPABILITY_INVENTORY
      const capabilities = await this.runCapabilityInventory(snapshot, architecture);
      // Stage 4: request-scoped — see runIntegrationAnalysis() (called from AF-1)
      // Stage 5: request-scoped — see runIronRuleDerivation() (called from AF-1)

      // Stage 6: Assemble PROJECT_UNDERSTANDING and store in RAG
      const understanding: Record<string, unknown> = {
        patternType: 'PROJECT_UNDERSTANDING',
        projectId,
        intakeVersion: '1.0',
        intakeDate: new Date().toISOString().split('T')[0],
        architecture,
        conventions,
        existingCapabilities: capabilities,
        qualityStandards: this.extractQualityStandards(snapshot, architecture),
        derivedIronRules: this.extractBaseIronRules(conventions),
        domainModel: { entities: [], events: [] },
      };

      // Store in xiigen-rag-patterns — pass projectId as docId for upsert semantics
      // (re-running intake replaces the document, per PROJECT_UNDERSTANDING storage rules)
      const storeResult = await this.dbService.storeDocument(
        ES_INDEX.RAG_PATTERNS,
        understanding,
        projectId,
      );
      if (!storeResult.isSuccess) {
        this.logger.warn(`Failed to store PROJECT_UNDERSTANDING: ${storeResult.errorMessage}`);
      } else {
        this.logger.log(`PROJECT_UNDERSTANDING stored for project: ${projectId}`);
      }

      return { projectId, status: 'complete', understanding };
    } catch (err) {
      this.logger.error(`Intake failed for ${projectId}:`, err);
      return { projectId, status: 'failed', errors: [String(err)] };
    }
  }

  // ─── Stage 6 helpers ───────────────────────────────────────────────────────

  private extractQualityStandards(
    snapshot: CodebaseSnapshot,
    architecture: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      testLevels: (architecture['testing'] as string[]) ?? [],
      testCommand: this.detectTestCommand(snapshot.dependencyFiles),
      coverageGate: 'all test levels must pass',
      compliance: this.detectComplianceTools(snapshot.fileTree),
    };
  }

  private extractBaseIronRules(conventions: unknown[]): unknown[] {
    return conventions
      .filter((c): c is Record<string, unknown> => typeof c === 'object' && c !== null)
      .filter((c) => c['enforcement'] === 'IRON_RULE')
      .map((c, i) => ({
        ruleId: `IR-PROJ-${i + 1}`,
        text: c['rule'],
        evidence: c['evidence'],
      }));
  }

  private detectTestCommand(depFiles: Record<string, string>): string {
    if (depFiles['composer.json'] && depFiles['package.json']) return 'composer test && npm test';
    if (depFiles['composer.json']) return 'composer test';
    if (depFiles['package.json']) return 'npm test';
    if (depFiles['requirements.txt'] || depFiles['pyproject.toml']) return 'pytest';
    if (depFiles['go.mod']) return 'go test ./...';
    return 'unknown';
  }

  private detectComplianceTools(fileTree: FileTreeEntry[]): string[] {
    const tools: string[] = [];
    const paths = fileTree.map((f) => f.path);
    if (paths.some((p) => p.includes('phpcs') || p.includes('.phpcs'))) tools.push('phpcs');
    if (paths.some((p) => p.includes('.eslintrc') || p.includes('eslint.config')))
      tools.push('eslint');
    if (paths.some((p) => p.includes('plugin-check') || p.includes('wp-plugin-check')))
      tools.push('wp plugin check');
    if (paths.some((p) => p.includes('.editorconfig'))) tools.push('editorconfig');
    return tools;
  }

  // ─── Stage 6: DERIVED_CONTEXT_ASSEMBLY (called from AF-1 for each task) ────

  /**
   * Assemble Section 4 of a genesis prompt from PROJECT_UNDERSTANDING.
   * Runs Stages 4+5 on-demand (INTEGRATION_ANALYSIS + IRON_RULE_DERIVATION),
   * then calls DERIVED_CONTEXT_ASSEMBLY to produce a focused 50-100 line context block.
   *
   * CF-797: only called when PROJECT_UNDERSTANDING exists for the projectId.
   */
  async assembleDerivedSection4(params: {
    understanding: Record<string, unknown>;
    capabilityDescription: string;
    archetype: string;
    taskTypeId: string;
  }): Promise<string> {
    const { understanding, capabilityDescription, archetype, taskTypeId } = params;

    // Stage 4: INTEGRATION_ANALYSIS (request-scoped)
    const integrationAnalysis = await this.runIntegrationAnalysis(
      understanding,
      capabilityDescription,
    );

    // Stage 5: IRON_RULE_DERIVATION (request-scoped)
    const derivedIronRules = await this.runIronRuleDerivation(
      understanding,
      capabilityDescription,
      archetype,
      integrationAnalysis,
    );

    // Stage 6: DERIVED_CONTEXT_ASSEMBLY — assembles the prompt Section 4
    const prompt = await this.loadPrompt('derived-context-assembly--genesis--v1.0.0');

    const doNotDuplicate = ((understanding['existingCapabilities'] as unknown[]) ?? [])
      .filter((c): c is Record<string, unknown> => typeof c === 'object' && c !== null)
      .filter((c) => c['doNotDuplicate'] === true)
      .map((c) => `  - ${String(c['name'])} (${String(c['path'])}): ${String(c['purpose'])}`)
      .join('\n');

    const userPrompt = prompt.userPromptTemplate
      .replace(/\{\{TASK_TYPE_ID\}\}/g, taskTypeId)
      .replace(/\{\{ARCHETYPE\}\}/g, archetype)
      .replace(/\{\{CAPABILITY_DESCRIPTION\}\}/g, capabilityDescription)
      .replace('{{ARCHITECTURE_JSON}}', JSON.stringify(understanding['architecture'], null, 2))
      .replace('{{DERIVED_IRON_RULES_JSON}}', JSON.stringify(derivedIronRules, null, 2))
      .replace('{{DO_NOT_DUPLICATE_LIST}}', doNotDuplicate)
      .replace('{{INTEGRATION_ANALYSIS_JSON}}', JSON.stringify(integrationAnalysis, null, 2))
      .replace(
        '{{QUALITY_STANDARDS_JSON}}',
        JSON.stringify(understanding['qualityStandards'], null, 2),
      );

    const result = await this.aiProvider.generate(userPrompt, {
      systemPrompt: prompt.systemPrompt,
      maxTokens: 800,
    });

    if (!result.isSuccess || !result.data) {
      throw new Error(`DERIVED_CONTEXT_ASSEMBLY AI call failed: ${result.errorMessage}`);
    }

    return result.data['text'] as string;
  }

  // ─── Stage 1: ARCHITECTURE_SCAN ────────────────────────────────────────────

  async runArchitectureScan(snapshot: CodebaseSnapshot): Promise<Record<string, unknown>> {
    const prompt = await this.loadPrompt('architecture-scan--genesis--v1.0.0');

    const fileTree = snapshot.fileTree
      .slice(0, 200)
      .map((f) => `${f.type === 'directory' ? '[DIR]' : '[FILE]'} ${f.path}`)
      .join('\n');

    const userPrompt = prompt.userPromptTemplate
      .replace('{{FILE_TREE}}', fileTree)
      .replace('{{DEPENDENCY_FILES}}', JSON.stringify(snapshot.dependencyFiles, null, 2))
      .replace('{{ENTRY_POINTS}}', snapshot.entryPoints.join('\n'));

    const result = await this.aiProvider.generate(userPrompt, {
      systemPrompt: prompt.systemPrompt,
      maxTokens: 1000,
    });

    if (!result.isSuccess || !result.data) {
      throw new Error(`ARCHITECTURE_SCAN AI call failed: ${result.errorMessage}`);
    }

    const text = result.data['text'] as string;
    return JSON.parse(this.extractJson(text)) as Record<string, unknown>;
  }

  // ─── Stage 2: CONVENTION_EXTRACT ───────────────────────────────────────────

  async runConventionExtract(
    snapshot: CodebaseSnapshot,
    architecture: Record<string, unknown>,
  ): Promise<unknown[]> {
    const prompt = await this.loadPrompt('convention-extract--genesis--v1.0.0');

    const sampleFiles = await this.sampleFilesByLayer(snapshot, architecture);

    const fileCounts = snapshot.fileTree
      .filter((f) => f.type === 'file')
      .reduce<Record<string, number>>((acc, f) => {
        const ext = f.path.split('.').pop() ?? 'unknown';
        acc[ext] = (acc[ext] ?? 0) + 1;
        return acc;
      }, {});

    const userPrompt = prompt.userPromptTemplate
      .replace('{{ARCHITECTURE_JSON}}', JSON.stringify(architecture, null, 2))
      .replace('{{SAMPLE_FILES}}', sampleFiles)
      .replace('{{FILE_COUNTS}}', JSON.stringify(fileCounts, null, 2));

    const result = await this.aiProvider.generate(userPrompt, {
      systemPrompt: prompt.systemPrompt,
      maxTokens: 2000,
    });

    if (!result.isSuccess || !result.data) {
      throw new Error(`CONVENTION_EXTRACT AI call failed: ${result.errorMessage}`);
    }

    const text = result.data['text'] as string;
    return JSON.parse(this.extractJson(text)) as unknown[];
  }

  // ─── Stage 3: CAPABILITY_INVENTORY ─────────────────────────────────────────

  async runCapabilityInventory(
    snapshot: CodebaseSnapshot,
    architecture: Record<string, unknown>,
  ): Promise<unknown[]> {
    const prompt = await this.loadPrompt('capability-inventory--genesis--v1.0.0');

    const sourceFiles = snapshot.fileTree.filter(
      (f) => f.type === 'file' && this.isSourceFile(f.path, architecture['language'] as string),
    );

    const classSignatures = await this.extractClassSignatures(snapshot, sourceFiles.slice(0, 50));

    const userPrompt = prompt.userPromptTemplate
      .replace('{{ARCHITECTURE_JSON}}', JSON.stringify(architecture, null, 2))
      .replace('{{CLASS_LIST}}', sourceFiles.map((f) => f.path).join('\n'))
      .replace('{{CLASS_SIGNATURES}}', classSignatures);

    const result = await this.aiProvider.generate(userPrompt, {
      systemPrompt: prompt.systemPrompt,
      maxTokens: 3000,
    });

    if (!result.isSuccess || !result.data) {
      throw new Error(`CAPABILITY_INVENTORY AI call failed: ${result.errorMessage}`);
    }

    const text = result.data['text'] as string;
    return JSON.parse(this.extractJson(text)) as unknown[];
  }

  // ─── Stage 4: INTEGRATION_ANALYSIS (request-scoped, called from AF-1) ──────

  /**
   * Run INTEGRATION_ANALYSIS for a specific capability request.
   * NOT called during runIntake() — called on-demand by assembleDerivedSection4() in AF-1.
   * CF-797: only runs when PROJECT_UNDERSTANDING is present.
   */
  async runIntegrationAnalysis(
    understanding: Record<string, unknown>,
    capabilityDescription: string,
  ): Promise<Record<string, unknown>> {
    const prompt = await this.loadPrompt('integration-analysis--genesis--v1.0.0');

    const ironRuleConventions = ((understanding['conventions'] as unknown[]) ?? [])
      .filter((c): c is Record<string, unknown> => typeof c === 'object' && c !== null)
      .filter((c) => c['enforcement'] === 'IRON_RULE');

    const userPrompt = prompt.userPromptTemplate
      .replace('{{CAPABILITY_DESCRIPTION}}', capabilityDescription)
      .replace(
        '{{CAPABILITY_INVENTORY_JSON}}',
        JSON.stringify(understanding['capabilities'] ?? [], null, 2),
      )
      .replace('{{IRON_RULE_CONVENTIONS}}', JSON.stringify(ironRuleConventions, null, 2));

    const result = await this.aiProvider.generate(userPrompt, {
      systemPrompt: prompt.systemPrompt,
      maxTokens: 2000,
    });

    if (!result.isSuccess || !result.data) {
      throw new Error(`INTEGRATION_ANALYSIS AI call failed: ${result.errorMessage}`);
    }

    const text = result.data['text'] as string;
    return JSON.parse(this.extractJson(text)) as Record<string, unknown>;
  }

  // ─── Stage 5: IRON_RULE_DERIVATION (request-scoped, called from AF-1) ──────

  /**
   * Derive project-specific iron rules for a specific generation task.
   * NOT called during runIntake() — called on-demand by assembleDerivedSection4() in AF-1.
   */
  async runIronRuleDerivation(
    understanding: Record<string, unknown>,
    capabilityDescription: string,
    archetype: string,
    integrationAnalysis: Record<string, unknown>,
  ): Promise<unknown[]> {
    const prompt = await this.loadPrompt('iron-rule-derivation--genesis--v1.0.0');

    const ironRuleConventions = ((understanding['conventions'] as unknown[]) ?? [])
      .filter((c): c is Record<string, unknown> => typeof c === 'object' && c !== null)
      .filter((c) => c['enforcement'] === 'IRON_RULE');

    const userPrompt = prompt.userPromptTemplate
      .replace('{{CAPABILITY_DESCRIPTION}}', capabilityDescription)
      .replace('{{ARCHETYPE}}', archetype)
      .replace('{{IRON_RULE_CONVENTIONS_JSON}}', JSON.stringify(ironRuleConventions, null, 2))
      .replace('{{INTEGRATION_ANALYSIS_JSON}}', JSON.stringify(integrationAnalysis, null, 2));

    const result = await this.aiProvider.generate(userPrompt, {
      systemPrompt: prompt.systemPrompt,
      maxTokens: 1500,
    });

    if (!result.isSuccess || !result.data) {
      throw new Error(`IRON_RULE_DERIVATION AI call failed: ${result.errorMessage}`);
    }

    const text = result.data['text'] as string;
    return JSON.parse(this.extractJson(text)) as unknown[];
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private isSourceFile(path: string, language: string): boolean {
    const langExtensions: Record<string, string[]> = {
      PHP: ['.php'],
      TypeScript: ['.ts', '.tsx'],
      'C#': ['.cs'],
      Python: ['.py'],
      Go: ['.go'],
      Java: ['.java'],
    };
    const exts = langExtensions[language] ?? ['.ts', '.js'];
    return (
      exts.some((ext) => path.endsWith(ext)) &&
      !path.includes('/vendor/') &&
      !path.includes('/node_modules/') &&
      !path.includes('.spec.') &&
      !path.includes('.test.')
    );
  }

  private async extractClassSignatures(
    snapshot: CodebaseSnapshot,
    files: Array<{ path: string }>,
  ): Promise<string> {
    const signatures: string[] = [];
    for (const file of files) {
      try {
        const content = await snapshot.getFileContents(file.path);
        // First 30 lines: captures class name, constructor, and public method signatures
        const preview = content.split('\n').slice(0, 30).join('\n');
        signatures.push(`### ${file.path}\n${preview}`);
      } catch {
        // skip unreadable files
      }
    }
    return signatures.join('\n\n');
  }

  private async sampleFilesByLayer(
    snapshot: CodebaseSnapshot,
    architecture: Record<string, unknown>,
  ): Promise<string> {
    const layerPatterns = this.getLayerPatterns(architecture['framework'] as string | undefined);
    const samples: string[] = [];

    for (const [layer, pattern] of Object.entries(layerPatterns)) {
      const matches = snapshot.fileTree
        .filter((f) => f.type === 'file' && new RegExp(pattern).test(f.path))
        .slice(0, 4); // max 4 files per layer to fit context

      for (const file of matches) {
        try {
          const contents = await snapshot.getFileContents(file.path);
          // Limit to first 100 lines so prompt stays within token budget
          const truncated = contents.split('\n').slice(0, 100).join('\n');
          samples.push(`### [${layer}] ${file.path}\n${truncated}`);
        } catch {
          // skip unreadable files silently
        }
      }
    }

    return samples.join('\n\n---\n\n');
  }

  private getLayerPatterns(framework: string | undefined): Record<string, string> {
    if (framework?.includes('wordpress')) {
      return {
        PHP_SERVICES: 'src/.*\\.php$',
        PHP_TESTS: 'tests/php/.*\\.php$',
        REACT_COMPONENTS: 'admin/js/.*\\.tsx?$',
        CONFIG: '(composer|package)\\.json$',
      };
    }
    if (framework?.includes('nestjs')) {
      return {
        SERVICES: 'src/.*\\.service\\.ts$',
        CONTROLLERS: 'src/.*\\.controller\\.ts$',
        TESTS: 'src/.*\\.spec\\.ts$',
        CONFIG: '(package|tsconfig)\\.json$',
      };
    }
    // Generic fallback — covers Laravel, .NET, Go, Python
    return {
      SOURCE: 'src/.*\\.(ts|php|cs|py|go)$',
      TESTS: 'test[s]?/.*\\.(ts|php|cs|py|go)$',
      CONFIG: '(package|composer|requirements|go\\.mod)\\..*$',
    };
  }

  private async loadPrompt(promptId: string): Promise<IntakePrompt> {
    // searchDocuments uses BuildSearchFilter (DNA-2): pass promptId as a filter value.
    // The DB layer handles query construction; we pass a flat filter object.
    const result = await this.dbService.searchDocuments('xiigen-prompts', { promptId }, 1);

    if (!result.isSuccess || !result.data?.length) {
      throw new Error(
        `Intake prompt not found: ${promptId}. Seed fixtures/prompts/intake/ to ES first.`,
      );
    }

    return result.data[0] as unknown as IntakePrompt;
  }

  /**
   * Extract the first JSON object or array from a text response.
   * Handles cases where the AI wraps JSON in markdown code blocks.
   */
  private extractJson(text: string): string {
    // Strip markdown code fences if present
    const stripped = text
      .replace(/^```(?:json)?\n?/m, '')
      .replace(/\n?```$/m, '')
      .trim();
    // Verify it starts with { or [
    if (stripped.startsWith('{') || stripped.startsWith('[')) return stripped;
    // Fallback: find the first { or [
    const start = Math.min(
      stripped.indexOf('{') === -1 ? Infinity : stripped.indexOf('{'),
      stripped.indexOf('[') === -1 ? Infinity : stripped.indexOf('['),
    );
    if (start === Infinity) throw new Error(`No JSON found in AI response: ${text.slice(0, 200)}`);
    return stripped.slice(start);
  }
}
