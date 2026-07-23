/**
 * CF-461: Consent Gate Check utility.
 *
 * Checks the CONSENT_GATE entry for the given student.
 * FAIL-CLOSED: If no gate entry found, returns failure (not success).
 * This prevents any downstream task type from executing if T367 has not run.
 *
 * Usage (in T368-T374 handlers):
 *   const gateCheck = await checkConsentGate(context.studentId, this.gateStore, 'T368');
 *   if (!gateCheck.isSuccess) return gateCheck;
 */
import { DataProcessResult } from '../../kernel/data-process-result';
import type { IGateStore } from '../../engine-contracts/gate-store.interface';

export async function checkConsentGate(
  studentId: string,
  gateStore: IGateStore,
  taskType: string,
): Promise<DataProcessResult<void>> {
  const gate = await gateStore.get(`CONSENT_GATE:${studentId}`);

  // FAIL-CLOSED: No entry means T367 has not run or consent not evaluated
  if (!gate) {
    return DataProcessResult.failure(
      'CONSENT_GATE_NOT_EVALUATED',
      `CF-461: No CONSENT_GATE entry found for student ${studentId}. ` +
        `T367 (ConsentAndEnrollmentGate) must execute before ${taskType}. ` +
        `If T367 has run, ensure it writes gate entry for both GRANTED and DENIED outcomes.`,
    );
  }

  // Block if consent is not GRANTED
  if (gate.status !== 'GRANTED') {
    return DataProcessResult.failure(
      'CONSENT_GATE_CLOSED',
      `CF-461: Consent gate status is '${gate.status}' for student ${studentId}. ` +
        `${taskType} is blocked. Status was recorded at ${gate.evaluatedAt}.` +
        (gate.reason ? ` Reason: ${gate.reason}` : ''),
    );
  }

  return DataProcessResult.success(undefined);
}
