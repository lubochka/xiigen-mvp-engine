/**
 * T190 SchemaVersionManager [VALIDATION, INLINE]
 * FLOW-11: Schema Registry & DAG
 *
 * Iron rules:
 *   IR-T190-1: Classification deterministic from structural diff — ADDITIVE or BREAKING only.
 *   IR-T190-2: BREAKING = removed field | type change | required field renamed | field added with required:true.
 *   IR-T190-3: Version bump: BREAKING → major bump; ADDITIVE → minor bump; NEVER from payload.
 *   IR-T190-4: changedFields enumerated; empty changedFields with BREAKING = arbiter violation.
 *   IR-T190-5: First registration (null previousSchema): always ADDITIVE, version='1.0.0', changedFields=[].
 *
 * Pure function — no writes, no emits.
 * Callers: T189 SchemaRegistrationGateway (inline call)
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';

export interface VersionClassifyInput {
  previousSchema: Record<string, unknown> | null;
  newSchema: Record<string, unknown>;
}

export interface VersionClassifyResult {
  changeType: 'ADDITIVE' | 'BREAKING';
  nextVersion: string;
  changedFields: string[];
}

@Injectable()
export class SchemaVersionManagerService extends MicroserviceBase {
  constructor() {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T190',
        serviceName: 'SchemaVersionManagerService',
        flowId: 'FLOW-11',
      }),
    });
  }
  /**
   * Classify schema change as ADDITIVE or BREAKING.
   * First registration (null previousSchema): always ADDITIVE, version='1.0.0'.
   */
  classify(input: VersionClassifyInput): DataProcessResult<VersionClassifyResult> {
    const { previousSchema, newSchema } = input;

    // First registration — no prior schema
    if (!previousSchema) {
      return DataProcessResult.success({
        changeType: 'ADDITIVE',
        nextVersion: '1.0.0',
        changedFields: [],
      });
    }

    const prevVersion = String(previousSchema['version'] ?? '1.0.0');
    const changedFields: string[] = [];
    let isBreaking = false;

    const prevProperties = (previousSchema['properties'] as Record<string, unknown>) ?? {};
    const newProperties = (newSchema['properties'] as Record<string, unknown>) ?? {};
    const prevRequired = (previousSchema['required'] as string[]) ?? [];
    const newRequired = (newSchema['required'] as string[]) ?? [];

    // BREAKING: removed field (was in previous, not in new)
    for (const field of Object.keys(prevProperties)) {
      if (!(field in newProperties)) {
        changedFields.push(field);
        isBreaking = true;
      }
    }

    // BREAKING: type change on existing field
    for (const field of Object.keys(prevProperties)) {
      if (field in newProperties) {
        const prevType = (prevProperties[field] as Record<string, unknown>)?.['type'];
        const newType = (newProperties[field] as Record<string, unknown>)?.['type'];
        if (prevType !== newType) {
          if (!changedFields.includes(field)) changedFields.push(field);
          isBreaking = true;
        }
      }
    }

    // BREAKING: previously required field renamed (not in new required but was required)
    for (const field of prevRequired) {
      if (!newRequired.includes(field) && !(field in newProperties)) {
        if (!changedFields.includes(field)) changedFields.push(field);
        isBreaking = true;
      }
    }

    // ADDITIVE: new optional field (not in prevProperties, not in newRequired)
    for (const field of Object.keys(newProperties)) {
      if (!(field in prevProperties)) {
        if (newRequired.includes(field)) {
          // New required field = BREAKING
          if (!changedFields.includes(field)) changedFields.push(field);
          isBreaking = true;
        }
        // else: new optional field = ADDITIVE (no action needed)
      }
    }

    const changeType: 'ADDITIVE' | 'BREAKING' = isBreaking ? 'BREAKING' : 'ADDITIVE';
    const nextVersion = this.bumpVersion(prevVersion, changeType);

    return DataProcessResult.success({ changeType, nextVersion, changedFields });
  }

  private bumpVersion(version: string, changeType: 'ADDITIVE' | 'BREAKING'): string {
    const parts = version.split('.').map(Number);
    const major = parts[0] ?? 1;
    const minor = parts[1] ?? 0;
    const patch = parts[2] ?? 0;

    if (changeType === 'BREAKING') {
      return `${major + 1}.0.0`;
    }
    // ADDITIVE: minor bump
    return `${major}.${minor + 1}.${patch}`;
  }
}
