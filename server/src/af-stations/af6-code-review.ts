/**
 * AF-6: Code Review Station.
 *
 * Static code review + optional AI-powered deep review.
 * Static checks: docstring presence, error handling, hardcoded values.
 * AI review: calls IAiProvider through fabric (never direct SDK).
 *
 * Phase 8.3: JUDGMENT sub-engine component.
 */

import { Injectable, Optional, Inject } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';
import { IAiProvider, AI_PROVIDER } from '../fabrics/interfaces/ai-provider.interface';
import { IAfStation, StationId, StationInput, StationOutput } from './base';

/** A single review finding. */
export interface ReviewIssue {
  rule_id: string;
  name: string;
  severity: 'error' | 'warning';
  message: string;
  line?: number;
}

@Injectable()
export class CodeReviewStation extends IAfStation {
  readonly stationId = StationId.AF6_CODE_REVIEW;

  constructor(@Optional() @Inject(AI_PROVIDER) private readonly aiProvider?: IAiProvider) {
    super();
  }

  async execute(input: StationInput): Promise<DataProcessResult<StationOutput>> {
    if (!input.tenantId) {
      return DataProcessResult.failure('MISSING_TENANT', 'tenant_id required (DNA-5)');
    }

    const code = this.extractCode(input);
    if (!code) {
      return DataProcessResult.failure('NO_CODE', 'No code to review — run SYNTHESIS first');
    }

    const start = Date.now();
    const issues: ReviewIssue[] = [];

    // ── Static checks ───────────────────────────────
    this.checkDocstrings(code, issues);
    this.checkErrorHandling(code, issues);
    this.checkHardcodedValues(code, issues);

    // ── Optional AI review ──────────────────────────
    let aiReviewText: string | undefined;
    if (this.aiProvider) {
      aiReviewText = await this.runAiReview(code);
    }

    const errorCount = issues.filter((i) => i.severity === 'error').length;
    const warningCount = issues.filter((i) => i.severity === 'warning').length;

    return DataProcessResult.success(
      new StationOutput({
        stationId: this.stationId,
        success: errorCount === 0,
        data: {
          issues: issues.map((i) => ({ ...i })),
          issue_count: issues.length,
          error_count: errorCount,
          warning_count: warningCount,
          ai_review: aiReviewText ?? null,
          has_ai_review: !!aiReviewText,
        },
        errors: issues
          .filter((i) => i.severity === 'error')
          .map((i) => `${i.rule_id}: ${i.message}`),
        warnings: issues
          .filter((i) => i.severity === 'warning')
          .map((i) => `${i.rule_id}: ${i.message}`),
        elapsedMs: Date.now() - start,
      }),
    );
  }

  // ── Static review rules ───────────────────────────

  private checkDocstrings(code: string, issues: ReviewIssue[]): void {
    // Accept any doc-comment format: JSDoc (/**), PHP DocBlock (/**), Python """, C# ///, inline #
    // Z-3.2: concept-neutral — works for TypeScript, PHP, Python, C#
    const hasDocstring =
      /\/\*\*[\s\S]*?\*\//.test(code) || // JSDoc / PHP DocBlock
      /"""[\s\S]*?"""/.test(code) || // Python docstring
      /\/\/\/\s/.test(code) || // C# XML doc comment
      /#\s*@/.test(code); // Ruby/Python annotation
    if (!hasDocstring) {
      issues.push({
        rule_id: 'REV-1',
        name: 'missing_docstring',
        severity: 'warning',
        message: 'No doc-comment block found in generated code (JSDoc, PHPDoc, Python """, C# ///)',
      });
    }
  }

  private checkErrorHandling(code: string, issues: ReviewIssue[]): void {
    // Z-3.2: concept-neutral error handling check.
    // Accepts any runtime's structured result or exception handling:
    //   Node.js/NestJS: try/catch, .catch(), DataProcessResult.failure()
    //   PHP/WordPress:  try/catch, ['success' => false], WP_Error
    //   .NET:           try/catch, Result<T>.Failure, ActionResult
    const hasAsync =
      /async\s/.test(code) || // JS/TS/C# async
      /\$wpdb|wp_remote/i.test(code); // WordPress I/O

    const hasErrorHandling =
      /try\s*\{/.test(code) ||
      /\.catch\(/.test(code) ||
      /DataProcessResult\.failure/.test(code) ||
      /\['success'\]\s*=>\s*false/.test(code) || // PHP array result
      /new WP_Error\s*\(/.test(code) || // WordPress error
      /Result.*Failure|ActionResult|return.*false/.test(code); // .NET / generic

    if (hasAsync && !hasErrorHandling) {
      issues.push({
        rule_id: 'REV-2',
        name: 'missing_error_handling',
        severity: 'error',
        message:
          'Async/I/O code without error handling — add try/catch or structured failure result ' +
          '(DataProcessResult.failure, WP_Error, Result.Failure, etc.)',
      });
    }
  }

  private checkHardcodedValues(code: string, issues: ReviewIssue[]): void {
    // Check for hardcoded URLs, ports, host strings
    const patterns = [
      { pattern: /https?:\/\/localhost[:\d]*/g, desc: 'hardcoded localhost URL' },
      { pattern: /['"]127\.0\.0\.1['"]/g, desc: 'hardcoded loopback IP' },
      { pattern: /port\s*[:=]\s*\d{4,5}/gi, desc: 'hardcoded port number' },
    ];

    for (const { pattern, desc } of patterns) {
      const matches = code.match(pattern);
      if (matches && matches.length > 0) {
        issues.push({
          rule_id: 'REV-3',
          name: 'hardcoded_value',
          severity: 'error',
          message: `Found ${desc} (${matches.length} occurrence${matches.length > 1 ? 's' : ''})`,
        });
      }
    }
  }

  // ── AI Review ─────────────────────────────────────

  private async runAiReview(code: string): Promise<string | undefined> {
    try {
      const result = await this.aiProvider!.generate(
        `Review this generated service code for quality issues:\n\n${code.substring(0, 4000)}`,
        {
          systemPrompt:
            'You are a code reviewer for the XIIGen engine. ' +
            'Check for: missing scope isolation, direct provider imports, ' +
            'typed models instead of Record<string,unknown>, missing factory resolution. ' +
            'Return a concise review with issues found.',
          maxTokens: 1024,
        },
      );
      if (result.isSuccess && result.data?.text) {
        return result.data.text as string;
      }
    } catch {
      // AI review is optional — swallow errors
    }
    return undefined;
  }

  // ── Helpers ───────────────────────────────────────

  private extractCode(input: StationInput): string {
    // Code may be directly on input.code, or in generation_results
    if (input.code) return input.code;
    if (input.generationResults.length > 0) {
      return input.generationResults
        .map((r) => (r.code as string) ?? '')
        .filter(Boolean)
        .join('\n\n');
    }
    return '';
  }
}
