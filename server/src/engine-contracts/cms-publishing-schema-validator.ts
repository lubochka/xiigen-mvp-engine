/**
 * FLOW-22 GAP-NEW-95: Schema Additive-Only Validator
 * BFA Rules: CF-407, CF-420
 * Design Decision: DD-192
 * Task Types: T331 (PostTypeSchemaRegistration)
 * Factory: F920
 */

import { DataProcessResult } from '../kernel/data-process-result';

export const SCHEMA_ADDITIVE_VALIDATOR = 'SCHEMA_ADDITIVE_VALIDATOR';

export interface ISchemaChangeAnalysis {
  isAdditive: boolean;
  addedFields: string[];
  removedFields: string[];
  typeChanges: Array<{ field: string; from: string; to: string; isBreaking: boolean }>;
  requiredFieldsAdded: string[]; // adding required field = breaking (existing content may be invalid)
  enumNarrowed: string[]; // removing enum values = breaking
  breakingChanges: string[]; // human-readable list of breaking changes
}

export interface ISchemaAdditiveValidator {
  /**
   * Validate that proposedSchema is an additive change from currentSchema.
   * Additive = only new optional fields, new enum values, description changes.
   * Breaking = field removal, type narrowing, required field addition, enum value removal.
   *
   * CF-407, CF-420: Removal REJECTED (DD-192).
   */
  validateChange(
    currentSchema: Record<string, unknown>,
    proposedSchema: Record<string, unknown>,
  ): Promise<DataProcessResult<ISchemaChangeAnalysis>>;

  /**
   * Validate a schema against JSON Schema 2020-12 dialect.
   * Does not compare schemas — just validates structure.
   */
  validateSchema(
    schema: Record<string, unknown>,
  ): Promise<DataProcessResult<{ valid: boolean; errors: string[] }>>;
}
