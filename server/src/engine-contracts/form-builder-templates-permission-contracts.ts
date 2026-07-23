/**
 * FLOW-23 GAP-23-8: Role From Auth Context Enforcement
 * BFA Rules: DD-216
 * OWASP Reference: OWASP API1 — Broken Object Level Authorization
 * Error Correction: score-zero
 * Task Type: T364 (PermissionEnforcer)
 * Factory: F973 (IPermissionContextReader)
 */

import { DataProcessResult } from '../kernel/data-process-result';

export const PERMISSION_CONTEXT_READER = 'PERMISSION_CONTEXT_READER';

/**
 * Permission context reader — reads role from verified auth context ONLY.
 * DD-216: Role NEVER comes from request body, params, or query.
 * OWASP API1: Prevents Broken Object Level Authorization.
 *
 * IMPORTANT: No method on this interface accepts a 'role' parameter.
 * Role is always resolved from JWT claims in AsyncLocalStorage.
 */
export interface IPermissionContextReader {
  /**
   * Get current user's role from auth context.
   * Reads from verified JWT claims via AsyncLocalStorage.
   * Returns failure if no auth context present.
   *
   * NEVER reads from request body, params, or query.
   */
  getRole(): Promise<
    DataProcessResult<{
      role: string;
      userId: string;
      scopes: string[];
      tokenIssuedAt: string;
      tokenExpiresAt: string;
    }>
  >;

  /**
   * Check if current auth context has permission for an action.
   * Role is resolved internally — never accepted as parameter.
   */
  hasPermission(
    action: string,
    resource: string,
    // NOTE: No 'role' parameter — OWASP API1 compliance
  ): Promise<
    DataProcessResult<{
      permitted: boolean;
      role: string;
      userId: string;
      reason?: string;
    }>
  >;

  /**
   * Get all scopes for current auth context.
   */
  getScopes(): Promise<DataProcessResult<{ scopes: string[]; userId: string }>>;
}
