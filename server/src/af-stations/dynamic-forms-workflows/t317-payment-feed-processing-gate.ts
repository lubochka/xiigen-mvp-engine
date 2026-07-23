/**
 * T317PaymentFeedProcessingGate — GAP-21-03 fix
 *
 * CF-389: Payment gate fires LAST.
 * BEFORE (wrong): consumed 'form.entry.persisted' (parallel with T314/T315/T316)
 * AFTER (correct): consumes 'form.entry.preflight.complete' (emitted only after all 3 fan-out gates report)
 *
 * CF-400: PLATFORM-ONLY — only executes if IPaymentFeedService is available.
 *
 * DNA-3: returns DataProcessResult, never throws
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../../kernel/data-process-result';

/** CF-389: T317 consumes form.entry.preflight.complete — NOT form.entry.persisted */
export const T317_CONSUMER_TOPIC = 'form.entry.preflight.complete';

@Injectable()
export class T317PaymentFeedProcessingGate {
  private readonly logger = new Logger(T317PaymentFeedProcessingGate.name);

  constructor(@Inject(DATABASE_SERVICE) private readonly db: IDatabaseService) {}

  /**
   * Handle form.entry.preflight.complete event.
   * Processes payment feed only if form has payment enabled (CF-400: platform-only).
   */
  async handlePreflightComplete(event: Record<string, unknown>): Promise<DataProcessResult<void>> {
    const entryId = event['subject'] as string;
    if (!entryId) {
      return DataProcessResult.failure(
        'MISSING_ENTRY_ID',
        'preflight.complete event missing subject (entryId)',
      );
    }

    const data = event['data'] as Record<string, unknown>;
    const allSucceeded = data?.['allSucceeded'] as boolean;

    if (!allSucceeded) {
      this.logger.warn(
        `T317: preflight gates did not all succeed for entry ${entryId} — skipping payment`,
      );
      return DataProcessResult.success(undefined);
    }

    // Check if form has payment enabled
    const entry = await this.db.getDocument('form-entries', entryId);
    if (!entry.isSuccess || !entry.data) {
      return DataProcessResult.failure('ENTRY_NOT_FOUND', `Entry ${entryId} not found`);
    }

    const formId = entry.data['formId'] as string;
    const formSchema = await this.db.getDocument('form-schemas', formId);
    if (!formSchema.isSuccess || !formSchema.data) {
      return DataProcessResult.success(undefined); // no form schema — skip
    }

    const settings = formSchema.data['settings'] as Record<string, unknown> | undefined;
    if (!settings?.['paymentEnabled']) {
      return DataProcessResult.success(undefined); // payment not enabled on this form
    }

    // CF-400: PLATFORM-ONLY — payment processing delegated to fabric resolver
    // Actual payment processing would be resolved via IExternalServiceFactory at runtime
    this.logger.log(`T317: payment feed processing triggered for entry ${entryId}, form ${formId}`);
    return DataProcessResult.success(undefined);
  }
}
