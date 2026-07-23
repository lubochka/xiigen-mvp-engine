/**
 * T193 SchemaCompatibilityChecker [VALIDATION, INLINE]
 * FLOW-11: Schema Registry & DAG
 *
 * Iron rules:
 *   IR-T193-1: Backward compat: required fields in previousSchema must be present in newSchema.
 *   IR-T193-2: First registration (null previousSchema): always COMPATIBLE.
 *   IR-T193-3: Pure function — no writes, no emits.
 *
 * Callers: T189 SchemaRegistrationGateway (inline call)
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';

export interface CompatCheckInput {
  previousSchema: Record<string, unknown> | null;
  newSchema: Record<string, unknown>;
}

export interface CompatCheckResult {
  verdict: 'COMPATIBLE' | 'INCOMPATIBLE';
  missingFields: string[];
}

@Injectable()
export class SchemaCompatibilityCheckerService extends MicroserviceBase {
  constructor() {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T193',
        serviceName: 'SchemaCompatibilityCheckerService',
        flowId: 'FLOW-11',
      }),
    });
  }
  /**
   * Check backward compatibility.
   * First registration always COMPATIBLE.
   * Existing required fields must remain in new schema.
   */
  check(input: CompatCheckInput): DataProcessResult<CompatCheckResult> {
    if (!input.previousSchema) {
      return DataProcessResult.success({ verdict: 'COMPATIBLE', missingFields: [] });
    }

    const prevProperties = (input.previousSchema['properties'] as Record<string, unknown>) ?? {};
    const newProperties = (input.newSchema['properties'] as Record<string, unknown>) ?? {};
    const prevRequired = (input.previousSchema['required'] as string[]) ?? [];

    const missingFields: string[] = [];

    // Required fields from previous schema must exist in new schema
    for (const field of prevRequired) {
      if (!(field in newProperties)) {
        missingFields.push(field);
      }
    }

    // Also check all fields from previous properties exist in new (for strict compat)
    for (const field of Object.keys(prevProperties)) {
      if (!(field in newProperties) && !missingFields.includes(field)) {
        // Field was removed — incompatible
        missingFields.push(field);
      }
    }

    const verdict = missingFields.length === 0 ? 'COMPATIBLE' : 'INCOMPATIBLE';
    return DataProcessResult.success({ verdict, missingFields });
  }
}
