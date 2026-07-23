/**
 * SyntaxValidationRunner — T401 [ARBITRATION].
 *
 * Validates generated TypeScript code for syntax correctness.
 * Checks for required structural patterns (imports, class declarations, method signatures).
 * Hard stop on SYNTAX_VALIDATION_FAILED — no bypass.
 *
 * DNA-8: storeDocument() BEFORE enqueue().
 * DNA-3: All methods return DataProcessResult — never throw.
 * CF-476: tenantId required — UNSCOPED_QUERY on missing.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';
import { randomUUID } from 'crypto';

interface IDb {
  storeDocument(
    index: string,
    doc: Record<string, unknown>,
    id?: string,
  ): Promise<DataProcessResult<Record<string, unknown>>>;
}

interface IQueue {
  enqueue(event: string, data: Record<string, unknown>): Promise<DataProcessResult<string>>;
}

export interface SyntaxValidationResult {
  validationId: string;
  codeId: string;
  valid: boolean;
  errorCount: number;
  validatedAt: string;
}

export class SyntaxValidationRunner {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async validate(
    tenantId: string,
    codeId: string,
    codeContent: string,
  ): Promise<DataProcessResult<SyntaxValidationResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!codeId) return DataProcessResult.failure('MISSING_CODE_ID', 'codeId is required');
    if (!codeContent || codeContent.trim().length === 0) {
      return DataProcessResult.failure('EMPTY_CODE_CONTENT', 'codeContent is required');
    }

    // Structural pattern checks
    const errors: string[] = [];

    // Must have at least one import or export
    if (!codeContent.includes('import ') && !codeContent.includes('export ')) {
      errors.push('Missing import or export declarations');
    }

    // Must have class or function declarations
    if (
      !codeContent.includes('class ') &&
      !codeContent.includes('function ') &&
      !codeContent.includes('=>')
    ) {
      errors.push('No class, function, or arrow function declarations found');
    }

    // Unmatched braces check
    const openBraces = (codeContent.match(/\{/g) ?? []).length;
    const closeBraces = (codeContent.match(/\}/g) ?? []).length;
    if (openBraces !== closeBraces) {
      errors.push(`Unmatched braces: ${openBraces} open, ${closeBraces} close`);
    }

    // Unmatched parentheses check
    const openParens = (codeContent.match(/\(/g) ?? []).length;
    const closeParens = (codeContent.match(/\)/g) ?? []).length;
    if (openParens !== closeParens) {
      errors.push(`Unmatched parentheses: ${openParens} open, ${closeParens} close`);
    }

    if (errors.length > 0) {
      return DataProcessResult.failure(
        'SYNTAX_VALIDATION_FAILED',
        `Syntax errors: ${errors.join('; ')}`,
      );
    }

    const validationId = randomUUID();
    const validatedAt = new Date().toISOString();
    const doc: Record<string, unknown> = {
      validationId,
      tenantId,
      codeId,
      valid: true,
      errorCount: 0,
      validatedAt,
    };

    const stored = await this.db.storeDocument('flow26-syntax-validations', doc, validationId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('flow.syntax.validated', {
      validationId,
      tenantId,
      codeId,
      validatedAt,
    });

    return DataProcessResult.success({
      validationId,
      codeId,
      valid: true,
      errorCount: 0,
      validatedAt,
    });
  }
}
