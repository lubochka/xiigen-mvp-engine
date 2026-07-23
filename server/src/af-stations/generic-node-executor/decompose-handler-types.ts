/**
 * Decompose handler step types (GAP-M6).
 *
 * Adds SKIP as a valid step outcome — the first occurrence in the XIIGen engine.
 * SKIP means the step was intentionally bypassed (FREEDOM_GATED config missing/disabled).
 * Unlike FAILURE, SKIP does not stop flow execution — the next step continues.
 *
 * DNA-3: resolveStepStatus() never throws.
 */

export type StepStatus = 'SUCCESS' | 'FAILURE' | 'SKIP';

export interface StepResult {
  status: StepStatus;
  data?: Record<string, unknown>;
  error?: { code: string; message: string };
  skip?: { reason: string; detail: string };
}

/**
 * Determines the step status from a DataProcessResult.
 *
 * SKIP detection: A DataProcessResult.success() with data.skipped === true
 * is treated as SKIP (not SUCCESS) in the execution log.
 */
export function resolveStepStatus(result: {
  isSuccess: boolean;
  data?: unknown;
  errorCode?: string;
  errorMessage?: string;
}): StepStatus {
  if (!result.isSuccess) return 'FAILURE';

  const data = result.data as Record<string, unknown> | undefined;
  if (data?.skipped === true) return 'SKIP';

  return 'SUCCESS';
}
