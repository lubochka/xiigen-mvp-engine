/**
 * wall-clock-rto-measurement.check — Named check for T283 RestoreDrillSaga.
 *
 * GAP K2 / BFA CF-350: RTO measurement must use Date.now() (wall-clock time).
 * process.cpuUsage() and hrtime() measure CPU time only, excluding I/O waits.
 * I/O waits dominate disaster recovery operations.
 *
 * Named check: wall_clock_rto_measurement
 * Quality gate weight on T283: 0.20 (threshold 1.0)
 */
import type { EvaluatorFn } from '../../node-handlers/named-check.registry';

export const wallClockRtoMeasurementEvaluator: EvaluatorFn = (code: string) => {
  // Detect CPU-only timing (CF-350 violation)
  if (/process\.cpuUsage|hrtime\(\).*cpu/i.test(code)) {
    return {
      pass: false,
      reason:
        'CF-350: process.cpuUsage/hrtime excludes I/O waits — use Date.now() for wall-clock RTO',
    };
  }

  // Require wall-clock measurement
  const hasWallClock = /Date\.now\(\)|performance\.now\(\)/i.test(code);
  if (!hasWallClock) {
    return {
      pass: false,
      reason:
        'CF-350: No wall-clock RTO measurement found in drill code — add Date.now() start/end capture',
    };
  }

  return { pass: true };
};
