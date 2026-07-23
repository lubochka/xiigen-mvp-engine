/**
 * DNA-1: ParseDocument
 * All documents are Record<string, unknown> — NEVER typed/rigid models.
 * Parse from JSON, validate required fields, return DataProcessResult.
 */

import { DataProcessResult } from './data-process-result';

/**
 * Parse raw input into a Dictionary document.
 *
 * DNA-1 Rule: ALL documents are Record<string, unknown>. Never create typed models
 * for business entities. Typed models exist ONLY for infrastructure
 * (DataProcessResult, FactoryResolutionContext, etc.).
 *
 * @param raw - JSON string, Buffer, or already-parsed Record
 * @param requiredFields - Optional list of fields that MUST be present
 * @returns DataProcessResult containing the parsed dictionary
 */
export function parseDocument(
  raw: string | Buffer | Record<string, unknown>,
  requiredFields?: string[],
): DataProcessResult<Record<string, unknown>> {
  // Step 1: Parse to dict
  let doc: Record<string, unknown>;

  if (typeof raw === 'object' && raw !== null && !Buffer.isBuffer(raw)) {
    doc = { ...raw }; // shallow copy — don't mutate caller's object
  } else if (typeof raw === 'string' || Buffer.isBuffer(raw)) {
    const str = typeof raw === 'string' ? raw : raw.toString('utf-8');
    try {
      const parsed: unknown = JSON.parse(str);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return DataProcessResult.failure(
          'PARSE_NOT_OBJECT',
          `Expected JSON object, got ${Array.isArray(parsed) ? 'array' : typeof parsed}`,
        );
      }
      doc = parsed as Record<string, unknown>;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      return DataProcessResult.failure('PARSE_INVALID_JSON', `JSON parse error: ${err.message}`);
    }
  } else {
    return DataProcessResult.failure(
      'PARSE_UNSUPPORTED_TYPE',
      `Cannot parse type ${typeof raw}. Expected string, Buffer, or Record.`,
    );
  }

  // Step 2: Validate required fields
  if (requiredFields && requiredFields.length > 0) {
    const missing = requiredFields.filter(
      (f) => !(f in doc) || doc[f] === null || doc[f] === undefined,
    );
    if (missing.length > 0) {
      return DataProcessResult.failure(
        'PARSE_MISSING_FIELDS',
        `Missing required fields: ${missing.join(', ')}`,
        { missing_fields: missing },
      );
    }
  }

  // Step 3: Ensure metadata
  if (!('_parsed_at' in doc)) {
    doc['_parsed_at'] = new Date().toISOString();
  }

  return DataProcessResult.success(doc);
}

/** Serialize a dictionary document back to JSON string. */
export function documentToJson(doc: Record<string, unknown>, pretty = false): string {
  return JSON.stringify(doc, null, pretty ? 2 : undefined);
}

/**
 * Merge two dictionary documents. Overlay wins on conflict.
 * Nested objects are merged recursively. Arrays are replaced (not appended).
 */
export function mergeDocuments(
  base: Record<string, unknown>,
  overlay: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(overlay)) {
    if (
      key in result &&
      typeof result[key] === 'object' &&
      result[key] !== null &&
      !Array.isArray(result[key]) &&
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value)
    ) {
      result[key] = mergeDocuments(
        result[key] as Record<string, unknown>,
        value as Record<string, unknown>,
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}

/** Extract a subset of fields from a document. Missing fields are skipped. */
export function extractFields(
  doc: Record<string, unknown>,
  fields: string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of fields) {
    if (key in doc) {
      result[key] = doc[key];
    }
  }
  return result;
}
