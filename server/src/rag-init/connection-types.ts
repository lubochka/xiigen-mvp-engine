/**
 * Data Connection Types — TIER1 Session 1
 *
 * Classifies every document in XIIGen so that export/import
 * decisions can be made without inspecting content.
 *
 * TENANT_PRIVATE:    Owned by a tenant. Never exported without explicit consent
 *                    and PII scrub. Example: project cards, tenant prompt overrides.
 * FLOW_SCOPED:       Belongs to a flow. Travels with the flow on export/import.
 *                    Example: code patterns, default prompts, BFA rules.
 * TENANT_EXPORTABLE: Tenant-owned but marked for sharing (with PII scrub applied).
 *                    Example: tenant-approved skill packs they want to publish.
 *
 * Every document in xiigen-rag-patterns, xiigen-prompts, and
 * xiigen-project-cards MUST have a connection_type field.
 *
 * DNA-1: Uses string constants, not typed classes.
 * DNA-3: validateConnectionFields returns string[] — never throws.
 */

export const CONNECTION_TYPES = {
  TENANT_PRIVATE: 'TENANT_PRIVATE',
  FLOW_SCOPED: 'FLOW_SCOPED',
  TENANT_EXPORTABLE: 'TENANT_EXPORTABLE',
} as const;

export type ConnectionType = (typeof CONNECTION_TYPES)[keyof typeof CONNECTION_TYPES];

/**
 * Check whether a value is a valid ConnectionType.
 * DNA-3: returns boolean, never throws.
 */
export function isValidConnectionType(value: unknown): value is ConnectionType {
  return (
    typeof value === 'string' && Object.values(CONNECTION_TYPES).includes(value as ConnectionType)
  );
}

/**
 * Validate that connection classification fields are internally consistent.
 *
 * Rules:
 *   FLOW_SCOPED       → tenant_id must be empty, flow_id must be non-empty
 *   TENANT_PRIVATE    → tenant_id must be non-empty
 *   TENANT_EXPORTABLE → tenant_id must be non-empty
 *
 * Returns an array of error strings. Empty array = valid.
 * DNA-3: never throws.
 */
export function validateConnectionFields(doc: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const ct = doc['connection_type'] as string | undefined;

  if (!ct) {
    errors.push('connection_type is required');
    return errors;
  }

  if (!isValidConnectionType(ct)) {
    errors.push(
      `connection_type "${ct}" is invalid — must be one of: ${Object.values(CONNECTION_TYPES).join(', ')}`,
    );
    return errors;
  }

  const tenantId = (doc['tenant_id'] as string | undefined) ?? '';
  const flowId = (doc['flow_id'] as string | undefined) ?? '';

  if (ct === CONNECTION_TYPES.TENANT_PRIVATE && !tenantId) {
    errors.push('TENANT_PRIVATE documents require non-empty tenant_id');
  }

  if (ct === CONNECTION_TYPES.TENANT_EXPORTABLE && !tenantId) {
    errors.push('TENANT_EXPORTABLE documents require non-empty tenant_id');
  }

  if (ct === CONNECTION_TYPES.FLOW_SCOPED && tenantId) {
    errors.push(
      'FLOW_SCOPED documents must have empty tenant_id (they belong to the flow, not a tenant)',
    );
  }

  if (ct === CONNECTION_TYPES.FLOW_SCOPED && !flowId) {
    errors.push('FLOW_SCOPED documents require non-empty flow_id');
  }

  return errors;
}
