/**
 * T630 FormSubmissionProcessor [DATA_PIPELINE]
 * FLOW-21: Dynamic Forms & Workflows
 *
 * Entry: FormSubmitted event (user submits form)
 *
 * Execution order is MACHINE (CF-21-2):
 *   ORDER 1: BOLA check — submitterTenantId === form.tenantId
 *   ORDER 2: Fetch published schema
 *   ORDER 3: Validate submission fields against schema
 *   ORDER 4: Store submission record
 *   ORDER 5: Emit SubmissionProcessed or SubmissionRejected
 *
 * Iron rules:
 *   IR-1: BOLA check at ORDER 1 (CF-21-2)
 *   IR-2: Validate against published schema only (CF-21-2)
 *   IR-3: Validation errors as success response, never failure (DNA-4)
 *   IR-4: tenantId from ALS only (DNA-5)
 *   IR-5: Store submission before events (DNA-8)
 *
 * Pattern reference: SUBMISSION-VALIDATION-BOLA-001 RAG pattern from DR-21-B
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const FORM_SCHEMAS_INDEX = 'xiigen-form-schemas';
const FORM_SUBMISSIONS_INDEX = 'xiigen-form-submissions';

type LegacyTenantContextReader = {
  get?: (key: string) => Record<string, unknown> | undefined;
};

@Injectable()
export class FormSubmissionProcessorService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T630',
        serviceName: 'FormSubmissionProcessorService',
        flowId: 'FLOW-21',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId?.();
    if (result?.isSuccess && result.data) {
      return result.data;
    }

    const legacyTenant = (this.tenantContext as unknown as LegacyTenantContextReader).get?.('tenant');
    const legacyTenantId = legacyTenant?.['tenantId'];
    return typeof legacyTenantId === 'string' && legacyTenantId.length > 0
      ? legacyTenantId
      : 'unknown';
  }

  /**
   * Process form submission with BOLA check + validation.
   * DPO pattern: SUBMISSION-VALIDATION-BOLA-001
   */
  async processSubmission(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const submitterTenantId = this.getTenantId();
    const formId = event['formId'] as string;
    const submissionData = event['data'] as Record<string, unknown> | undefined;

    if (!formId || !submissionData) {
      return DataProcessResult.failure('INVALID_INPUT', 'formId and data are required');
    }

    // ── ORDER 1: BOLA check — IR-1, CF-21-2 ────────────────────────────────
    const formResult = await this.dbFabric.searchDocuments(FORM_SCHEMAS_INDEX, { schemaId: formId });

    // Early BOLA validation without queuing events yet
    if (!formResult.isSuccess || (formResult.data ?? []).length === 0) {
      return DataProcessResult.failure('FORM_NOT_FOUND', `Form not found: ${formId}`);
    }

    const formSchema = formResult.data![0] as Record<string, unknown>;
    const formTenantId = formSchema['tenantId'] as string | undefined;

    // BOLA: submitterTenantId must match formTenantId
    if (submitterTenantId !== formTenantId) {
      return DataProcessResult.failure(
        'UNAUTHORIZED',
        `Submitter tenant does not match form owner tenant`,
      );
    }

    // ── ORDER 2: Fetch published schema — IR-2, CF-21-2 ────────────────────
    const status = formSchema['status'] as string | undefined;

    if (status !== 'PUBLISHED') {
      return DataProcessResult.failure('SCHEMA_NOT_PUBLISHED', 'Form schema is not published');
    }

    const fields = formSchema['fields'] as Array<Record<string, unknown>> | undefined;

    // ── ORDER 3: Validate submission fields against schema — IR-3 ──────────
    const validationErrors: Array<{ field: string; error: string }> = [];

    if (fields) {
      for (const field of fields) {
        const fieldName = field['name'] as string;
        const fieldType = field['type'] as string;
        const required = (field['required'] as boolean | undefined) ?? false;
        const validationRules = field['validationRules'] as Record<string, unknown> | undefined;

        const submittedValue = submissionData[fieldName];

        // Check required
        if (required && (submittedValue === undefined || submittedValue === null)) {
          validationErrors.push({ field: fieldName, error: 'REQUIRED_FIELD_MISSING' });
          continue;
        }

        // Check type if value provided
        if (submittedValue !== undefined && submittedValue !== null) {
          const actualType = typeof submittedValue;
          // Simple type check (expand as needed)
          if (fieldType === 'string' && actualType !== 'string') {
            validationErrors.push({ field: fieldName, error: 'TYPE_MISMATCH' });
          } else if (fieldType === 'number' && actualType !== 'number') {
            validationErrors.push({ field: fieldName, error: 'TYPE_MISMATCH' });
          }
        }

        // Validate against rules (minLength, maxLength, pattern, etc.)
        if (validationRules && submittedValue !== undefined && submittedValue !== null) {
          const minLength = validationRules['minLength'] as number | undefined;
          const maxLength = validationRules['maxLength'] as number | undefined;

          if (minLength && String(submittedValue).length < minLength) {
            validationErrors.push({ field: fieldName, error: 'VALIDATION_MIN_LENGTH' });
          }
          if (maxLength && String(submittedValue).length > maxLength) {
            validationErrors.push({ field: fieldName, error: 'VALIDATION_MAX_LENGTH' });
          }
        }
      }
    }

    // ── ORDER 4: Store submission record — IR-5, DNA-8 ────────────────────
    const submissionId = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const submissionRecord: Record<string, unknown> = {
      submissionId,
      formId,
      tenantId: submitterTenantId,
      data: submissionData,
      valid: validationErrors.length === 0,
      validationErrors,
      createdAt: now,
      status: validationErrors.length === 0 ? 'ACCEPTED' : 'REJECTED',
    };

    await this.dbFabric.storeDocument(FORM_SUBMISSIONS_INDEX, submissionRecord, submissionId);

    // ── ORDER 5: Emit event based on validation result — IR-3, IR-5 ────────
    const responseData = {
      submissionId,
      formId,
      tenantId: submitterTenantId,
      valid: validationErrors.length === 0,
      errors: validationErrors,
      timestamp: now,
    };

    if (validationErrors.length === 0) {
      await this.queueFabric.enqueue('SubmissionProcessed', responseData);
      return DataProcessResult.success(responseData);
    } else {
      await this.queueFabric.enqueue('SubmissionRejected', responseData);
      // Still return success even with validation errors (DNA-4)
      return DataProcessResult.success(responseData);
    }
  }
}
