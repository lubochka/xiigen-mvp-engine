/**
 * FlowSpecValidator — T390 [INGESTION].
 *
 * Validates flow spec against rules from FREEDOM config (key: flow26_validation_rules).
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

export interface FlowSpecValidationResult {
  validationId: string;
  valid: boolean;
  errors: string[];
  validatedAt: string;
}

export class FlowSpecValidator {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
    private readonly freedom: IFreedom,
  ) {}

  async validate(
    tenantId: string,
    specId: string,
    taskTypes: string[],
    archetypes: string[],
  ): Promise<DataProcessResult<FlowSpecValidationResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!specId) return DataProcessResult.failure('MISSING_SPEC_ID', 'specId is required');

    // Rules from FREEDOM config — never hardcoded
    const rulesConfig = await this.freedom.get('flow26_validation_rules');
    if (!rulesConfig.isSuccess)
      return DataProcessResult.failure(rulesConfig.errorCode!, rulesConfig.errorMessage!);

    const minTaskTypes = (rulesConfig.data!['min_task_types'] as number) ?? 1;
    const requiredArchetypes = (rulesConfig.data!['required_archetypes'] as string[]) ?? [];

    const errors: string[] = [];
    if (taskTypes.length < minTaskTypes) {
      errors.push(`Flow must have at least ${minTaskTypes} task types, found ${taskTypes.length}`);
    }
    for (const required of requiredArchetypes) {
      if (!archetypes.includes(required)) {
        errors.push(`Required archetype missing: ${required}`);
      }
    }

    const valid = errors.length === 0;
    const validationId = randomUUID();
    const validatedAt = new Date().toISOString();
    const doc: Record<string, unknown> = {
      validationId,
      tenantId,
      specId,
      valid,
      errors,
      validatedAt,
    };

    const stored = await this.db.storeDocument('flow26-spec-validations', doc, validationId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    const event = valid ? 'flow.spec.validated' : 'flow.spec.invalid';
    await this.queue.enqueue(event, { validationId, tenantId, specId, valid, validatedAt });

    return DataProcessResult.success({ validationId, valid, errors, validatedAt });
  }
}
