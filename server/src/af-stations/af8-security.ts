/**
 * AF-8: Security Station.
 *
 * Scans generated code for security vulnerabilities using regex patterns.
 * 4 rules: hardcoded credentials, SQL injection, eval/exec, insecure HTTP.
 *
 * Each finding has: rule_id, name, severity, match_count.
 * Error-level findings block promotion. Warning-level are advisory.
 *
 * Phase 8.3: JUDGMENT sub-engine component.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';
import { IAfStation, StationId, StationInput, StationOutput } from './base';

/** A single security finding. */
export interface SecurityFinding {
  rule_id: string;
  name: string;
  severity: 'error' | 'warning';
  description: string;
  match_count: number;
  matches: string[];
}

/** Security rule definition. */
interface SecurityRule {
  rule_id: string;
  name: string;
  severity: 'error' | 'warning';
  description: string;
  patterns: RegExp[];
}

@Injectable()
export class SecurityStation extends IAfStation {
  readonly stationId = StationId.AF8_SECURITY;

  private readonly rules: SecurityRule[] = [
    {
      rule_id: 'SEC-1',
      name: 'hardcoded_credentials',
      severity: 'error',
      description: 'Hardcoded passwords, secrets, API keys, or tokens',
      patterns: [
        /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]{3,}['"]/gi,
        /(?:api[_-]?key|apikey|secret[_-]?key|access[_-]?token)\s*[:=]\s*['"][^'"]{3,}['"]/gi,
        /(?:auth[_-]?token|bearer)\s*[:=]\s*['"][^'"]{3,}['"]/gi,
      ],
    },
    {
      rule_id: 'SEC-2',
      name: 'sql_injection',
      severity: 'error',
      description: 'Potential SQL injection via string concatenation',
      patterns: [
        /(?:SELECT|INSERT|UPDATE|DELETE|DROP)\s.*['"`]\s*\+/gi,
        /['"`]\s*\+\s*\w+.*(?:SELECT|INSERT|UPDATE|DELETE|DROP|WHERE)/gi,
        /(?:SELECT|INSERT|UPDATE|DELETE|DROP)\s.*\$\{/gi,
        /`[^`]*(?:SELECT|INSERT|UPDATE|DELETE)\s[^`]*\$\{/gi,
      ],
    },
    {
      rule_id: 'SEC-3',
      name: 'unsafe_eval',
      severity: 'error',
      description: 'Use of eval(), exec(), Function() constructor, or new Function()',
      patterns: [/\beval\s*\(/g, /\bexec\s*\(/g, /new\s+Function\s*\(/g],
    },
    {
      rule_id: 'SEC-4',
      name: 'insecure_http',
      severity: 'warning',
      description: 'Use of HTTP instead of HTTPS for external URLs',
      patterns: [/http:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0)/gi],
    },
  ];

  async execute(input: StationInput): Promise<DataProcessResult<StationOutput>> {
    if (!input.tenantId) {
      return DataProcessResult.failure('MISSING_TENANT', 'tenant_id required (DNA-5)');
    }

    const code = this.extractCode(input);
    if (!code) {
      // No code to scan = no security issues
      return DataProcessResult.success(
        new StationOutput({
          stationId: this.stationId,
          success: true,
          data: { findings: [], finding_count: 0, error_count: 0, warning_count: 0 },
          elapsedMs: 0,
        }),
      );
    }

    const start = Date.now();
    const findings: SecurityFinding[] = [];

    for (const rule of this.rules) {
      const finding = this.scanRule(code, rule);
      if (finding) {
        findings.push(finding);
      }
    }

    const errorCount = findings.filter((f) => f.severity === 'error').length;
    const warningCount = findings.filter((f) => f.severity === 'warning').length;

    return DataProcessResult.success(
      new StationOutput({
        stationId: this.stationId,
        success: errorCount === 0,
        data: {
          findings: findings.map((f) => ({ ...f })),
          finding_count: findings.length,
          error_count: errorCount,
          warning_count: warningCount,
          rules_checked: this.rules.length,
        },
        errors: findings
          .filter((f) => f.severity === 'error')
          .map((f) => `${f.rule_id}: ${f.description} (${f.match_count} matches)`),
        warnings: findings
          .filter((f) => f.severity === 'warning')
          .map((f) => `${f.rule_id}: ${f.description} (${f.match_count} matches)`),
        elapsedMs: Date.now() - start,
      }),
    );
  }

  /** Scan code against a single rule. Returns finding or null. */
  private scanRule(code: string, rule: SecurityRule): SecurityFinding | null {
    const allMatches: string[] = [];

    for (const pattern of rule.patterns) {
      // Reset lastIndex for global regexes
      pattern.lastIndex = 0;
      const matches = code.match(pattern);
      if (matches) {
        allMatches.push(...matches);
      }
    }

    if (allMatches.length === 0) return null;

    return {
      rule_id: rule.rule_id,
      name: rule.name,
      severity: rule.severity,
      description: rule.description,
      match_count: allMatches.length,
      matches: allMatches.slice(0, 5), // Limit to 5 for brevity
    };
  }

  /** Get rule definitions (for introspection). */
  get ruleCount(): number {
    return this.rules.length;
  }

  /** Extract code from input. */
  private extractCode(input: StationInput): string {
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
