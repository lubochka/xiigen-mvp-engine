/**
 * PromptEvolver — uses AI to analyze generation failures and suggest improved prompts.
 *
 * Workflow:
 * 1. analyzeFailures: scan recent failures for common error patterns
 * 2. shouldEvolve: check if enough failures accumulated to warrant evolution
 * 3. evolvePrompt: call AI to generate an improved prompt, register as candidate
 *
 * Uses a lightweight IAiProviderLike interface to avoid circular dependency.
 *
 * DNA-3: all methods return DataProcessResult.
 * DNA-5: tenantId required.
 *
 * Phase 12.4.
 */

import { Injectable, Optional } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';
import { PersistentFeedbackStore } from './feedback-store';
import { PromptVersionStore } from './prompt-version-store';
import { createPromptVersion, type PromptVersion } from './prompt-types';
import type { FeedbackRecord } from './feedback-types';

// ── Lightweight AI interface (avoids circular dep) ──

export interface IAiProviderLike {
  generate(
    tenantId: string,
    prompt: string,
    options?: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>>;
}

// ── FailureAnalysis ─────────────────────────────────

export interface FailureAnalysis {
  readonly commonPatterns: string[];
  readonly suggestedImprovements: string[];
  readonly newPromptContent?: string;
  readonly failureCount: number;
}

// ── Known failure patterns ──────────────────────────

const FAILURE_PATTERN_DETECTORS: ReadonlyArray<{
  id: string;
  label: string;
  check: (record: FeedbackRecord) => boolean;
}> = [
  {
    id: 'low_dna',
    label: 'Low DNA compliance — generated code missing DNA patterns',
    check: (r) => {
      const dims = r.qualityScore.dimensions;
      const dna = dims.find((d) => d.name === 'dna_compliance');
      return !!dna && dna.score < 0.5;
    },
  },
  {
    id: 'direct_imports',
    label: 'Direct provider imports — code imports SDK directly instead of using fabric',
    check: (r) => {
      const dims = r.qualityScore.dimensions;
      const fabric = dims.find((d) => d.name === 'fabric_usage');
      return !!fabric && fabric.score < 0.5;
    },
  },
  {
    id: 'spec_mismatch',
    label: 'Spec adherence failure — missing required factories or wrong archetype',
    check: (r) => {
      const dims = r.qualityScore.dimensions;
      const spec = dims.find((d) => d.name === 'spec_adherence');
      return !!spec && spec.score < 0.4;
    },
  },
  {
    id: 'poor_structure',
    label: 'Poor code structure — missing class definitions, exports, or methods',
    check: (r) => {
      const dims = r.qualityScore.dimensions;
      const structure = dims.find((d) => d.name === 'code_structure');
      return !!structure && structure.score < 0.4;
    },
  },
  {
    id: 'no_tests',
    label: 'Missing tests — generated code has no test coverage',
    check: (r) => {
      const dims = r.qualityScore.dimensions;
      const tests = dims.find((d) => d.name === 'test_quality');
      return !!tests && tests.score < 0.3;
    },
  },
  {
    id: 'low_overall',
    label: 'Low overall quality score',
    check: (r) => r.qualityScore.total < 0.4,
  },
];

// ── Evolver ─────────────────────────────────────────

@Injectable()
export class PromptEvolver {
  /** Minimum failures before evolution is triggered. */
  readonly failureThreshold: number;
  /** How many recent generations to look at. */
  readonly lookbackWindow: number;

  constructor(
    private readonly feedbackStore: PersistentFeedbackStore,
    private readonly promptStore: PromptVersionStore,
    @Optional() config?: { failureThreshold?: number; lookbackWindow?: number },
  ) {
    this.failureThreshold = config?.failureThreshold ?? 5;
    this.lookbackWindow = config?.lookbackWindow ?? 20;
  }

  /**
   * Analyze recent failures to find common patterns.
   */
  analyzeFailures(
    tenantId: string,
    taskType: string,
    role: string,
    recentFailures: FeedbackRecord[],
  ): DataProcessResult<FailureAnalysis> {
    if (!tenantId) {
      return DataProcessResult.failure('MISSING_TENANT', 'tenantId required (DNA-5)');
    }

    if (recentFailures.length === 0) {
      return DataProcessResult.success({
        commonPatterns: [],
        suggestedImprovements: [],
        failureCount: 0,
      });
    }

    // Detect patterns
    const patternCounts = new Map<string, number>();
    const patternLabels = new Map<string, string>();

    for (const record of recentFailures) {
      for (const detector of FAILURE_PATTERN_DETECTORS) {
        if (detector.check(record)) {
          patternCounts.set(detector.id, (patternCounts.get(detector.id) ?? 0) + 1);
          patternLabels.set(detector.id, detector.label);
        }
      }
    }

    // Common patterns = those appearing in >= 40% of failures
    const threshold = Math.max(1, recentFailures.length * 0.4);
    const commonPatterns: string[] = [];
    const suggestedImprovements: string[] = [];

    for (const [id, count] of patternCounts.entries()) {
      if (count >= threshold) {
        commonPatterns.push(patternLabels.get(id)!);
        suggestedImprovements.push(this.suggestImprovement(id));
      }
    }

    return DataProcessResult.success({
      commonPatterns,
      suggestedImprovements,
      failureCount: recentFailures.length,
    });
  }

  /**
   * Check if evolution should be triggered for a task type + role.
   * Returns true if enough failures in recent lookback window.
   */
  shouldEvolve(tenantId: string, taskType: string, _role: string): DataProcessResult<boolean> {
    if (!tenantId) {
      return DataProcessResult.failure('MISSING_TENANT', 'tenantId required (DNA-5)');
    }

    const queryResult = this.feedbackStore.query({
      tenantId,
      taskType,
      maxResults: this.lookbackWindow,
    });

    if (!queryResult.isSuccess || !queryResult.data) {
      return DataProcessResult.success(false);
    }

    const recent = queryResult.data;
    const failureCount = recent.filter((r) => !r.passed).length;

    return DataProcessResult.success(failureCount >= this.failureThreshold);
  }

  /**
   * Evolve a prompt by using AI to analyze failures and generate an improved version.
   *
   * Steps:
   * 1. Query recent failures
   * 2. Analyze failure patterns
   * 3. Build a meta-prompt requesting improvement
   * 4. Call AI provider
   * 5. Register new prompt version as candidate
   */
  async evolvePrompt(
    tenantId: string,
    taskType: string,
    role: string,
    aiProvider: IAiProviderLike,
  ): Promise<DataProcessResult<PromptVersion>> {
    if (!tenantId) {
      return DataProcessResult.failure('MISSING_TENANT', 'tenantId required (DNA-5)');
    }

    // 1. Get recent failures
    const queryResult = this.feedbackStore.query({
      tenantId,
      taskType,
      passed: false,
      maxResults: this.lookbackWindow,
    });

    const failures = queryResult.isSuccess ? queryResult.data! : [];
    if (failures.length < this.failureThreshold) {
      return DataProcessResult.failure(
        'INSUFFICIENT_FAILURES',
        `Only ${failures.length} failures found, need ${this.failureThreshold}`,
      );
    }

    // 2. Analyze patterns
    const analysisResult = this.analyzeFailures(tenantId, taskType, role, failures);
    if (!analysisResult.isSuccess) {
      return DataProcessResult.failure('ANALYSIS_FAILED', analysisResult.errorMessage ?? '');
    }
    const analysis = analysisResult.data!;

    // 3. Get current champion prompt
    const championResult = this.promptStore.getChampion(taskType, role);
    const currentContent = championResult.data?.content ?? 'No current prompt available.';
    const currentVersion = championResult.data?.version ?? 'v0';

    // 4. Build meta-prompt
    const metaPrompt = this.buildMetaPrompt(taskType, role, currentContent, analysis);

    // 5. Call AI
    const aiResult = await aiProvider.generate(tenantId, metaPrompt, {
      purpose: 'prompt_evolution',
      task_type: taskType,
      role,
    });

    if (!aiResult.isSuccess || !aiResult.data) {
      return DataProcessResult.failure(
        'AI_GENERATION_FAILED',
        aiResult.errorMessage ?? 'AI provider failed to generate improved prompt',
      );
    }

    const newContent = (aiResult.data.text as string) ?? (aiResult.data.content as string) ?? '';
    if (!newContent.trim()) {
      return DataProcessResult.failure('EMPTY_RESULT', 'AI provider returned empty prompt content');
    }

    // 6. Create new version as candidate
    const versionNumber = this.nextVersion(currentVersion);
    const newVersion = createPromptVersion({
      taskType,
      role,
      content: newContent,
      version: versionNumber,
      status: 'candidate',
      metadata: {
        evolved_from: championResult.data?.id ?? null,
        failure_analysis: {
          common_patterns: analysis.commonPatterns,
          suggested_improvements: analysis.suggestedImprovements,
          failure_count: analysis.failureCount,
        },
      },
    });

    // 7. Register in store
    const registerResult = this.promptStore.registerVersion(newVersion);
    if (!registerResult.isSuccess) {
      return DataProcessResult.failure('REGISTER_FAILED', registerResult.errorMessage ?? '');
    }

    return DataProcessResult.success(newVersion);
  }

  // ── Helpers ───────────────────────────────────────

  private buildMetaPrompt(
    taskType: string,
    role: string,
    currentContent: string,
    analysis: FailureAnalysis,
  ): string {
    const lines: string[] = [
      `You are improving a code generation prompt for the XIIGen engine.`,
      `Task type: ${taskType}`,
      `Prompt role: ${role}`,
      ``,
      `Current prompt:`,
      `---`,
      currentContent,
      `---`,
      ``,
      `Recent generation failures (${analysis.failureCount}):`,
    ];

    if (analysis.commonPatterns.length > 0) {
      lines.push(`Common failure patterns:`);
      for (const p of analysis.commonPatterns) {
        lines.push(`  - ${p}`);
      }
    }

    if (analysis.suggestedImprovements.length > 0) {
      lines.push(``, `Suggested improvements:`);
      for (const s of analysis.suggestedImprovements) {
        lines.push(`  - ${s}`);
      }
    }

    lines.push(
      ``,
      `Write an improved version of this prompt that addresses the failure patterns above.`,
      `The improved prompt should produce code that passes all DNA compliance checks,`,
      `uses fabric interfaces instead of direct imports, and follows the engine's architecture.`,
      `Output ONLY the improved prompt text, nothing else.`,
    );

    return lines.join('\n');
  }

  private suggestImprovement(patternId: string): string {
    const suggestions: Record<string, string> = {
      low_dna: 'Explicitly list all 9 DNA patterns in the prompt and require compliance',
      direct_imports:
        'Emphasize: "NEVER import providers directly. Use IDatabaseService, IQueueService, IAiProvider via fabric."',
      spec_mismatch:
        "Include the spec's factory dependencies in the prompt and require each to appear in generated code",
      poor_structure:
        'Require: class definition with export, extends MicroserviceBase, at least 2 methods',
      no_tests:
        'Add: "Also generate a test file with describe/it blocks and at least 3 assertions"',
      low_overall:
        'The prompt needs significant rework — consider a complete rewrite focusing on DNA compliance and fabric usage',
    };
    return suggestions[patternId] ?? `Address ${patternId} pattern`;
  }

  private nextVersion(current: string): string {
    const match = current.match(/v(\d+)\.?(\d*)/);
    if (!match) return 'v1.0-evolved';
    const major = parseInt(match[1], 10);
    const minor = match[2] ? parseInt(match[2], 10) : 0;
    return `v${major}.${minor + 1}-evolved`;
  }
}
