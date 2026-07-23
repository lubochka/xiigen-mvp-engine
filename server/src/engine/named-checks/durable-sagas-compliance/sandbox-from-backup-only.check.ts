/**
 * sandbox-from-backup-only.check — Named check companion for T283 RestoreDrillSaga.
 *
 * GAP K2 / BFA CF-340: DR sandbox must use backup artifact only, not production data.
 *
 * Named check: devops_sandbox_from_backup_only
 * Quality gate weight on T283: companion to wall_clock_rto_measurement
 */
import type { EvaluatorFn } from '../../node-handlers/named-check.registry';

export const sandboxFromBackupOnlyEvaluator: EvaluatorFn = (code: string) => {
  const usesProd = /production.*db|prod.*connection|liveDatabase/i.test(code);
  if (usesProd) {
    return {
      pass: false,
      reason: 'CF-340: DR sandbox uses production data — must use backup artifact only',
    };
  }

  const usesBackup = /backupArtifact|F725|fromBackup|backup.*source/i.test(code);
  if (!usesBackup) {
    return {
      pass: false,
      reason: 'CF-340: No backup artifact source found for DR sandbox',
    };
  }

  return { pass: true };
};
