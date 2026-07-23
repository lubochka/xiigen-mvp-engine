/**
 * DNA-2: BuildSearchFilter (ObjectProcessor)
 * Builds query filters from a dictionary, automatically skipping None/empty values.
 * Never sends empty string or None as a filter — prevents accidental full-table scans.
 */

/** Supported filter operators for search queries. */
export enum FilterOperator {
  EQUALS = 'eq',
  NOT_EQUALS = 'neq',
  GREATER_THAN = 'gt',
  GREATER_EQUAL = 'gte',
  LESS_THAN = 'lt',
  LESS_EQUAL = 'lte',
  CONTAINS = 'contains',
  IN = 'in',
  NOT_IN = 'not_in',
  EXISTS = 'exists',
  PREFIX = 'prefix',
}

export interface FilterSpec {
  value: unknown;
  operator: string;
}

/**
 * Build a search filter from criteria dict, skipping empty/None values.
 *
 * DNA-2 Rule: BuildSearchFilter ALWAYS skips fields where value is:
 * - null / undefined
 * - empty string ""
 * - empty array []
 * - empty object {}
 *
 * This prevents accidental full-table scans and ensures queries are intentional.
 */
export function buildSearchFilter(
  criteria: Record<string, unknown>,
  operatorOverrides?: Record<string, FilterOperator>,
): Record<string, FilterSpec> {
  const overrides = operatorOverrides ?? {};
  const filters: Record<string, FilterSpec> = {};

  for (const [key, value] of Object.entries(criteria)) {
    // DNA-2 core rule: skip empty values
    if (isEmpty(value)) {
      continue;
    }

    const operator = overrides[key] ?? FilterOperator.EQUALS;
    filters[key] = {
      value,
      operator,
    };
  }

  return filters;
}

/**
 * Simplified flat filter — just strips empties and returns clean key:value dict.
 * Use when provider handles operators internally (e.g., Elasticsearch query DSL).
 */
export function buildSearchFilterFlat(criteria: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(criteria)) {
    if (!isEmpty(value)) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Build an Elasticsearch-style query from processed filters.
 * Always includes tenant_id (DNA-5: Scope Isolation).
 */
export function buildEsQuery(
  filters: Record<string, FilterSpec | unknown>,
  tenantId: string,
  options?: { size?: number; fromOffset?: number },
): Record<string, unknown> {
  const size = options?.size ?? 100;
  const fromOffset = options?.fromOffset ?? 0;

  const mustClauses: Record<string, unknown>[] = [
    { term: { tenant_id: tenantId } }, // DNA-5: always scope
  ];

  for (const [key, spec] of Object.entries(filters)) {
    if (typeof spec === 'object' && spec !== null && 'operator' in spec && 'value' in spec) {
      const typedSpec = spec as FilterSpec;
      const clause = operatorToEsClause(key, typedSpec.value, typedSpec.operator);
      mustClauses.push(clause);
    } else {
      mustClauses.push({ term: { [key]: spec } });
    }
  }

  return {
    query: { bool: { must: mustClauses } },
    size,
    from: fromOffset,
  };
}

/** Check if a value should be skipped in filter building. */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string' && value.trim() === '') {
    return true;
  }
  if (Array.isArray(value) && value.length === 0) {
    return true;
  }
  if (
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value as Record<string, unknown>).length === 0
  ) {
    return true;
  }
  return false;
}

/** Convert operator + value to Elasticsearch clause. */
function operatorToEsClause(
  field: string,
  value: unknown,
  operator: string,
): Record<string, unknown> {
  switch (operator) {
    case 'eq':
      return { term: { [field]: value } };
    case 'neq':
      return { bool: { must_not: [{ term: { [field]: value } }] } };
    case 'gt':
      return { range: { [field]: { gt: value } } };
    case 'gte':
      return { range: { [field]: { gte: value } } };
    case 'lt':
      return { range: { [field]: { lt: value } } };
    case 'lte':
      return { range: { [field]: { lte: value } } };
    case 'contains':
      return { match: { [field]: value } };
    case 'in':
      return { terms: { [field]: value } };
    case 'not_in':
      return { bool: { must_not: [{ terms: { [field]: value } }] } };
    case 'exists':
      return { exists: { field } };
    case 'prefix':
      return { prefix: { [field]: value } };
    default:
      return { term: { [field]: value } };
  }
}
