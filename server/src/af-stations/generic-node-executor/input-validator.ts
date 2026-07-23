/**
 * DD-226: Input validator — rejects client-supplied grading fields.
 *
 * Used by T369 (QuizGradingGate) to actively reject score/grade fields
 * BEFORE any quiz session loading or processing begins.
 *
 * DNA-3: returns DataProcessResult<void> — never throws.
 */
import { DataProcessResult } from '../../kernel/data-process-result';

export interface InputValidationConfig {
  /**
   * Fields that MUST NOT be present in the input.
   * If any of these fields are found (in root or in arrays), reject the input.
   */
  rejectedFields: string[];
  rejectionCode: string;
  rejectionMessage: string;
  /**
   * Array field names to also check for rejected fields within items.
   * e.g., ['answers'] will check each item in input.answers for rejected fields.
   */
  arrayFieldsToCheck?: string[];
}

/**
 * DD-226: Validates that input does not contain explicitly rejected fields.
 *
 * Returns failure with configured rejection code if any rejected field is found.
 */
export function validateRejectedInputFields(
  input: Record<string, unknown>,
  config: InputValidationConfig,
): DataProcessResult<void> {
  for (const field of config.rejectedFields) {
    // Check root level
    if (field in input) {
      return DataProcessResult.failure(
        config.rejectionCode,
        `${config.rejectionMessage} Field '${field}' found in request root.`,
      );
    }

    // Check configured array fields
    for (const arrayField of config.arrayFieldsToCheck ?? []) {
      const arrayData = input[arrayField];
      if (!Array.isArray(arrayData)) continue;

      for (let i = 0; i < arrayData.length; i++) {
        const item = arrayData[i] as Record<string, unknown>;
        if (typeof item === 'object' && item !== null && field in item) {
          return DataProcessResult.failure(
            config.rejectionCode,
            `${config.rejectionMessage} Field '${field}' found in ${arrayField}[${i}].`,
          );
        }
      }
    }
  }

  return DataProcessResult.success(undefined);
}
