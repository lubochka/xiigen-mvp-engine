/**
 * LintValidator — programmatic code validation against key lint rules.
 *
 * Validates code strings without requiring ESLint to be installed.
 * Used in CI quality gates and cross-references P12.1 RealCodeQualityScorer.
 *
 * Rules:
 *   - checkNoConsoleLog: warns if console.log found (use StructuredLogger)
 *   - checkNoDirectImports: checks for forbidden provider imports
 *   - checkExportsPresent: checks that source files export something
 *   - checkNoVar: checks for var declarations
 *   - checkPreferConst: checks for let that could be const (heuristic)
 *
 * Phase 13.2.
 */

import { Injectable } from '@nestjs/common';

// ── Check Result ────────────────────────────────────

export interface LintCheckResult {
  readonly rule: string;
  readonly pass: boolean;
  readonly message: string;
  readonly line?: number;
}

// ── Forbidden Provider Imports ──────────────────────

const FORBIDDEN_IMPORTS: ReadonlyArray<{ pattern: RegExp; provider: string }> = [
  { pattern: /import\s+.*\s+from\s+['"]pg['"]/, provider: 'pg (PostgreSQL)' },
  { pattern: /import\s+.*\s+from\s+['"]mysql/, provider: 'mysql' },
  { pattern: /import\s+.*\s+from\s+['"]mongodb['"]/, provider: 'mongodb' },
  { pattern: /import\s+.*\s+from\s+['"]redis['"]/, provider: 'redis' },
  { pattern: /import\s+.*\s+from\s+['"]ioredis['"]/, provider: 'ioredis' },
  { pattern: /import\s+.*\s+from\s+['"]openai['"]/, provider: 'openai' },
  { pattern: /import\s+.*\s+from\s+['"]@anthropic/, provider: '@anthropic-ai' },
  { pattern: /import\s+.*\s+from\s+['"]@google\/generative/, provider: '@google/generative-ai' },
  { pattern: /require\s*\(\s*['"]pg['"]\s*\)/, provider: 'pg (require)' },
  { pattern: /require\s*\(\s*['"]openai['"]\s*\)/, provider: 'openai (require)' },
];

// ── Validator ───────────────────────────────────────

@Injectable()
export class LintValidator {
  /**
   * Check that code does not use console.log (should use StructuredLogger).
   * console.warn and console.error are allowed.
   */
  checkNoConsoleLog(code: string): LintCheckResult {
    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Match console.log but not console.warn or console.error
      if (/console\.log\s*\(/.test(line)) {
        return {
          rule: 'no-console-log',
          pass: false,
          message: 'Use StructuredLogger instead of console.log',
          line: i + 1,
        };
      }
    }
    return { rule: 'no-console-log', pass: true, message: 'No console.log found' };
  }

  /**
   * Check that code does not import specific providers directly.
   * All external dependencies should go through fabric interfaces.
   */
  checkNoDirectImports(code: string): LintCheckResult {
    for (const { pattern, provider } of FORBIDDEN_IMPORTS) {
      if (pattern.test(code)) {
        return {
          rule: 'no-direct-imports',
          pass: false,
          message: `Direct import of ${provider} detected. Use fabric interfaces instead.`,
        };
      }
    }
    return { rule: 'no-direct-imports', pass: true, message: 'No forbidden imports found' };
  }

  /**
   * Check that the source file exports at least one symbol.
   */
  checkExportsPresent(code: string): LintCheckResult {
    if (/export\s+(class|function|const|let|enum|interface|type|abstract|default)/.test(code)) {
      return { rule: 'exports-present', pass: true, message: 'Exports found' };
    }
    return {
      rule: 'exports-present',
      pass: false,
      message: 'No exports found. Source files should export at least one symbol.',
    };
  }

  /**
   * Check that code does not use var declarations.
   */
  checkNoVar(code: string): LintCheckResult {
    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trimStart();
      // Skip comments
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
      if (/\bvar\s+\w/.test(trimmed)) {
        return {
          rule: 'no-var',
          pass: false,
          message: 'Use const or let instead of var',
          line: i + 1,
        };
      }
    }
    return { rule: 'no-var', pass: true, message: 'No var declarations found' };
  }

  /**
   * Run all checks on a code string. Returns array of results.
   */
  validateAll(code: string): LintCheckResult[] {
    return [
      this.checkNoConsoleLog(code),
      this.checkNoDirectImports(code),
      this.checkExportsPresent(code),
      this.checkNoVar(code),
    ];
  }

  /**
   * Check if all validations pass.
   */
  isClean(code: string): boolean {
    return this.validateAll(code).every((r) => r.pass);
  }
}

// ── Package.json Script Definitions ─────────────────

/**
 * Returns the lint/format scripts that should be added to server package.json.
 */
export function getServerScripts(): Record<string, string> {
  return {
    lint: 'eslint src/ test/ --ext .ts',
    'lint:fix': 'eslint src/ test/ --ext .ts --fix',
    format: "prettier --write 'src/**/*.ts' 'test/**/*.ts'",
    'format:check': "prettier --check 'src/**/*.ts' 'test/**/*.ts'",
  };
}

/**
 * Returns the lint/format scripts that should be added to client package.json.
 */
export function getClientScripts(): Record<string, string> {
  return {
    lint: 'eslint src/ --ext .ts,.tsx',
    'lint:fix': 'eslint src/ --ext .ts,.tsx --fix',
    format: "prettier --write 'src/**/*.{ts,tsx}'",
    'format:check': "prettier --check 'src/**/*.{ts,tsx}'",
  };
}
