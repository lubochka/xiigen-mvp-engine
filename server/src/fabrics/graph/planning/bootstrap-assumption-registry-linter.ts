/**
 * BootstrapAssumptionRegistryLinter — IAssumptionRegistryLinter bootstrap implementation.
 *
 * Applies regex-based structural checks from SK-456:
 *   - Class label must be present (BLOCKING, NON_BLOCKING, or INVARIANT)
 *   - Verification command must be a literal bash command (starts with recognizable CLI tool)
 *   - Non-blocking assumptions must have a fallback specified
 *
 * No graph query needed — pure text analysis of session file content.
 *
 * Phase 2: deterministic text analysis, no AI dependency.
 */

import { Injectable } from '@nestjs/common';
import { IAssumptionRegistryLinter } from './planning-abstracts';

@Injectable()
export class BootstrapAssumptionRegistryLinter extends IAssumptionRegistryLinter {
  async lint(sessionFileContent: string): Promise<{
    passed: boolean;
    violations: string[];
  }> {
    const violations: string[] = [];
    const lines = sessionFileContent.split('\n');

    let insideAssumptionBlock = false;
    let currentId = '';
    let hasLabel = false;
    let hasVerification = false;
    let hasFallback = false;
    let isNonBlocking = false;

    for (const line of lines) {
      // Detect assumption entry start (e.g., "| A-1 |" or "A-1:")
      const assumptionStart = line.match(/^[|\s]*A-(\d+)[\s|]/);
      if (assumptionStart) {
        // Flush previous assumption checks
        if (insideAssumptionBlock) {
          this.flushChecks(
            currentId,
            hasLabel,
            hasVerification,
            hasFallback,
            isNonBlocking,
            violations,
          );
        }
        currentId = `A-${assumptionStart[1]}`;
        hasLabel = false;
        hasVerification = false;
        hasFallback = false;
        isNonBlocking = false;
        insideAssumptionBlock = true;
        // Skip the rest of this line (table header row — not a content line)
        continue;
      }

      if (!insideAssumptionBlock) continue;

      // Skip pure table rows (lines that start with |)
      const isTableRow = line.trim().startsWith('|');

      // Class label check — only on non-table-row lines
      if (!isTableRow && /\b(BLOCKING|NON_BLOCKING|INVARIANT)\b/.test(line)) {
        hasLabel = true;
        if (/\bNON_BLOCKING\b/.test(line)) isNonBlocking = true;
      }

      // Verification command must start with a CLI tool — only on dedicated verification lines
      if (!isTableRow) {
        const verificationMatch = line.match(/[Vv]erification[:\s]+`?([^`\n]+)`?/);
        if (verificationMatch) {
          const cmd = verificationMatch[1].trim();
          const cliTools =
            /^(ls|grep|curl|npx|node|cat|find|git|npm|yarn|docker|kubectl|bash|sh|echo)\b/;
          if (cliTools.test(cmd)) {
            hasVerification = true;
          } else {
            violations.push(
              `${currentId}: verification command '${cmd.slice(0, 40)}' is not a literal bash command`,
            );
          }
        }
      }

      // Fallback check — only on non-table-row lines
      if (
        !isTableRow &&
        /[Ff]allback[:\s]+/.test(line) &&
        line.length > line.indexOf('allback') + 10
      ) {
        hasFallback = true;
      }
    }

    // Flush final assumption
    if (insideAssumptionBlock) {
      this.flushChecks(
        currentId,
        hasLabel,
        hasVerification,
        hasFallback,
        isNonBlocking,
        violations,
      );
    }

    return { passed: violations.length === 0, violations };
  }

  private flushChecks(
    id: string,
    hasLabel: boolean,
    hasVerification: boolean,
    hasFallback: boolean,
    isNonBlocking: boolean,
    violations: string[],
  ): void {
    if (!hasLabel) {
      violations.push(`${id}: class label missing (expected BLOCKING, NON_BLOCKING, or INVARIANT)`);
    }
    if (!hasVerification) {
      violations.push(`${id}: no verification command found`);
    }
    if (isNonBlocking && !hasFallback) {
      violations.push(`${id}: NON_BLOCKING assumption has no fallback specified`);
    }
  }
}
