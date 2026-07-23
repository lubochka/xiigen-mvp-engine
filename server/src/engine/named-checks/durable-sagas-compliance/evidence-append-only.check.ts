/**
 * evidence-append-only.check — Named check for T284 DREvidenceGate.
 *
 * GAP K9 / BFA DR-119, CF-349: Drill evidence records are append-only.
 * updateDocument() and deleteDocument() on evidence records are forbidden.
 *
 * Named check: devops_evidence_append_only
 * Quality gate weight on T284: 0.25 (threshold 1.0)
 */
import type { EvaluatorFn } from '../../node-handlers/named-check.registry';

export const evidenceAppendOnlyEvaluator: EvaluatorFn = (code: string) => {
  // Detect UPDATE operations on evidence records
  const hasUpdate = /\.update\(|updateDocument|UPDATE.*evidence|evidence.*UPDATE/i.test(code);

  // Detect DELETE operations on evidence records
  const hasDelete = /\.delete\(|deleteDocument|DELETE.*evidence|evidence.*DELETE/i.test(code);

  if (hasUpdate) {
    return {
      pass: false,
      reason:
        'DR-119/CF-349: Drill evidence is append-only — updateDocument() on evidence records is forbidden',
    };
  }

  if (hasDelete) {
    return {
      pass: false,
      reason:
        'DR-119/CF-349: Drill evidence is append-only — deleteDocument() on evidence records is forbidden',
    };
  }

  return { pass: true };
};
