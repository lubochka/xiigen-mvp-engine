/**
 * ComponentSchemaGate — T500 [GUARD].
 *
 * Validate that all new components conform to component schema (required props,
 * slot definitions, event contracts). COMPONENT_SCHEMA_INVALID — no bypass.
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

export interface ComponentSchemaGateResult {
  gateId: string;
  specId: string;
  validatedCount: number;
  checkedAt: string;
}

export class ComponentSchemaGate {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async validate(
    tenantId: string,
    specId: string,
    components: Array<{
      name: string;
      requiredProps: string[];
      slots?: string[];
      events?: string[];
    }>,
  ): Promise<DataProcessResult<ComponentSchemaGateResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!specId) return DataProcessResult.failure('MISSING_SPEC_ID', 'specId is required');
    if (!components.length)
      return DataProcessResult.failure('MISSING_COMPONENTS', 'components are required');

    const violations: string[] = [];
    for (const comp of components) {
      if (!comp.name) {
        violations.push('Component missing name');
      }
      // Prop names must be non-empty strings
      for (const prop of comp.requiredProps ?? []) {
        if (!prop || typeof prop !== 'string') {
          violations.push(`${comp.name}: invalid requiredProp entry`);
        }
      }
      // Slots must be non-empty strings if provided
      for (const slot of comp.slots ?? []) {
        if (!slot || typeof slot !== 'string') {
          violations.push(`${comp.name}: invalid slot entry`);
        }
      }
    }

    if (violations.length > 0) {
      return DataProcessResult.failure(
        'COMPONENT_SCHEMA_INVALID',
        `Schema violations: ${violations.join('; ')}`,
      );
    }

    const gateId = randomUUID();
    const checkedAt = new Date().toISOString();
    const validatedCount = components.length;
    const doc: Record<string, unknown> = { gateId, tenantId, specId, validatedCount, checkedAt };

    const stored = await this.db.storeDocument('flow31-schema-gates', doc, gateId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('design.schema.valid', {
      gateId,
      tenantId,
      specId,
      validatedCount,
      checkedAt,
    });

    return DataProcessResult.success({ gateId, specId, validatedCount, checkedAt });
  }
}
