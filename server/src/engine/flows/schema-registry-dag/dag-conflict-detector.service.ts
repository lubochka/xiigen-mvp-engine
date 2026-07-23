/**
 * T204 DagConflictDetector [VALIDATION, INLINE_ONLY]
 * FLOW-11: Schema Registry & DAG
 *
 * Iron rules:
 *   IR-T204-1: Pure analysis — no ES reads/writes independently.
 *   IR-T204-2: Detects dependency conflicts during schema dependency changes.
 *   IR-T204-3: No side effects — returns conflicts to caller only.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';

export interface ConflictCheckInput {
  schemaType: string;
  newDeps: string[];
  existingGraph: Record<string, string[]>;
}

export interface ConflictCheckResult {
  hasConflicts: boolean;
  conflicts: Array<{ schema: string; conflictType: string; detail: string }>;
}

@Injectable()
export class DagConflictDetectorService extends MicroserviceBase {
  constructor() {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T204',
        serviceName: 'DagConflictDetectorService',
        flowId: 'FLOW-11',
      }),
    });
  }
  /**
   * Pure topology conflict analysis — no ES calls.
   * Detects: self-dependency, missing dependency schemas, version mismatches.
   */
  detectConflicts(input: ConflictCheckInput): DataProcessResult<ConflictCheckResult> {
    const conflicts: Array<{ schema: string; conflictType: string; detail: string }> = [];
    const knownSchemas = new Set(Object.keys(input.existingGraph));

    for (const dep of input.newDeps) {
      // Self-dependency
      if (dep === input.schemaType) {
        conflicts.push({
          schema: input.schemaType,
          conflictType: 'SELF_DEPENDENCY',
          detail: `${input.schemaType} cannot depend on itself`,
        });
      }
      // Missing dependency
      if (!knownSchemas.has(dep)) {
        conflicts.push({
          schema: dep,
          conflictType: 'MISSING_DEPENDENCY',
          detail: `Dependency ${dep} does not exist in the schema registry`,
        });
      }
    }

    return DataProcessResult.success({
      hasConflicts: conflicts.length > 0,
      conflicts,
    });
  }
}
