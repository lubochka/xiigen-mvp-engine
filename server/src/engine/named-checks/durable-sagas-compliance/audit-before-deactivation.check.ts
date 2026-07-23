/**
 * audit-before-deactivation.check — Named check for T286 TenantOffboardingSaga.
 *
 * GAP K6 / BFA DR-115: F733 preserves audit logs BEFORE tenant deactivation.
 * If preservation fails, offboarding ABORTS.
 *
 * Named check: audit_before_deactivation
 * Quality gate weight on T286: 0.25 (threshold 1.0)
 */
import type { EvaluatorFn } from '../../node-handlers/named-check.registry';

export const auditBeforeDeactivationEvaluator: EvaluatorFn = (code: string) => {
  const auditLine = code.search(/F733|preserveAudit|auditPreservation/i);
  const deactivateLine = code.search(/deactivate|disable.*tenant|tenantStatus.*inactive/i);

  if (auditLine < 0) {
    return {
      pass: false,
      reason:
        'No F733 audit preservation found — DR-115 violation: F733.preserveAuditLogs() must be called before deactivation',
    };
  }

  if (deactivateLine >= 0 && auditLine > deactivateLine) {
    return {
      pass: false,
      reason: `Deactivation (position ${deactivateLine}) before audit preservation (position ${auditLine}) — DR-115: audit first, then deactivate`,
    };
  }

  return { pass: true };
};
