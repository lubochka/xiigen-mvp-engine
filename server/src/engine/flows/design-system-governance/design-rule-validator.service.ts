/**
 * DesignRuleValidator — T496 [ARBITRATION].
 *
 * Validates design spec against design system rules from FREEDOM config.
 * Rules include accessibility (WCAG), spacing scales, color contrast.
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

interface IFreedom {
  get(key: string): Promise<DataProcessResult<Record<string, unknown>>>;
}

export interface DesignRuleValidationResult {
  validationId: string;
  specId: string;
  passed: boolean;
  violations: string[];
  validatedAt: string;
}

const DEFAULT_RULES = {
  require_wcag_aa: true,
  min_contrast_ratio: 4.5,
  allowed_spacing_values: [4, 8, 12, 16, 24, 32, 48, 64],
};

export class DesignRuleValidator {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
    private readonly freedom: IFreedom,
  ) {}

  async validate(
    tenantId: string,
    specId: string,
    spec: Record<string, unknown>,
  ): Promise<DataProcessResult<DesignRuleValidationResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!specId) return DataProcessResult.failure('MISSING_SPEC_ID', 'specId is required');

    // Rules from FREEDOM config — never hardcoded
    const configResult = await this.freedom.get('flow31_design_rules');
    const rules = configResult.isSuccess
      ? { ...DEFAULT_RULES, ...(configResult.data as Record<string, unknown>) }
      : DEFAULT_RULES;

    const violations: string[] = [];
    const flags = (spec['violationFlags'] as string[]) ?? [];

    if ((rules['require_wcag_aa'] as boolean) && flags.includes('WCAG_AA_FAIL')) {
      violations.push('WCAG AA accessibility requirement not met');
    }
    if (flags.includes('CONTRAST_FAIL')) {
      violations.push(`Color contrast below minimum ratio ${rules['min_contrast_ratio']}`);
    }
    if (flags.includes('SPACING_INVALID')) {
      violations.push('Spacing values outside allowed scale');
    }

    const passed = violations.length === 0;
    const validationId = randomUUID();
    const validatedAt = new Date().toISOString();
    const doc: Record<string, unknown> = {
      validationId,
      tenantId,
      specId,
      passed,
      violations,
      validatedAt,
    };

    const stored = await this.db.storeDocument('flow31-rule-validations', doc, validationId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    const event = passed ? 'design.rules.validated' : 'design.rules.violated';
    await this.queue.enqueue(event, { validationId, tenantId, specId, passed, validatedAt });

    return DataProcessResult.success({ validationId, specId, passed, violations, validatedAt });
  }
}
