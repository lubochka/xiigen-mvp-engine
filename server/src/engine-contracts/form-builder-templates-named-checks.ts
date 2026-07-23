/**
 * FLOW-23 Named Checks — 8 runtime-enforceable assertions.
 * Covers all 8 gaps from GAP-TRANSLATE rounds R0–R7.
 * Each check returns DataProcessResult — never throws.
 *
 * Gaps covered:
 *   GAP-23-1: step1_tenant_isolation (CF-447)
 *   GAP-23-2: template_mode_readonly (CF-444)
 *   GAP-23-3: pure_computation_no_ai (CF-433, CF-445)
 *   GAP-23-4: jsonpath_dynamic_binding (DNA-1, CF-435)
 *   GAP-23-5: cloudevents_mandatory (CF-448)
 *   GAP-23-6: code_export_af9_gate (CF-446)
 *   GAP-23-7: ietf_idempotency_key (CF-449, DNA-7)
 *   GAP-23-8: role_from_auth_context_only (DD-216, OWASP API1)
 */

import { DataProcessResult } from '../kernel/data-process-result';
import { EXPORT_QUALITY_THRESHOLD } from './form-builder-templates-export-quality';

// ─── CHECK-1 ─────────────────────────────────────────────────────────────────
/**
 * step1_tenant_isolation
 * CF-447: T360 must be nodes[0] in all 6 DAG templates (70–75).
 * Build failure if violated.
 */
export function check_step1_tenant_isolation(
  templateId: number,
  firstNodeTaskTypeId: string,
): DataProcessResult<void> {
  const requiredTemplates = [70, 71, 72, 73, 74, 75];
  if (!requiredTemplates.includes(templateId)) {
    return DataProcessResult.success(undefined); // Not a FLOW-23 template — skip
  }
  if (firstNodeTaskTypeId !== 'T360') {
    return DataProcessResult.failure(
      'CF-447_BUILD_FAILURE',
      `Template ${templateId} has '${firstNodeTaskTypeId}' at position 0. ` +
        `T360 (TenantIsolationEnforcer) MUST be position 0. Violates CF-447.`,
    );
  }
  return DataProcessResult.success(undefined);
}

// ─── CHECK-2 ─────────────────────────────────────────────────────────────────
/**
 * template_mode_readonly
 * CF-444: T357 must call verifyReadOnly() after entering template context.
 * No write operations permitted in template mode.
 */
export function check_template_mode_readonly(
  verifyReadOnlyCalled: boolean,
  readOnlyConfirmed: boolean,
): DataProcessResult<void> {
  if (!verifyReadOnlyCalled) {
    return DataProcessResult.failure(
      'CF-444_READONLY_VIOLATION',
      'T357 did not call verifyReadOnly() after entering template context. Violates CF-444.',
    );
  }
  if (!readOnlyConfirmed) {
    return DataProcessResult.failure(
      'CF-444_NOT_READONLY',
      'Template context is not in read-only mode. Violates CF-444.',
    );
  }
  return DataProcessResult.success(undefined);
}

// ─── CHECK-3 ─────────────────────────────────────────────────────────────────
/**
 * pure_computation_no_ai
 * CF-433, CF-445: T349 and T354 must not inject AI provider or have side effects.
 * T349 must call validateConstraints() before solve().
 */
export function check_pure_computation_no_ai(
  taskTypeId: 'T349' | 'T354',
  hasAiProviderInjected: boolean,
  hasDbWriteCall: boolean,
  validateConstraintsCalledBeforeSolve?: boolean,
): DataProcessResult<void> {
  if (hasAiProviderInjected) {
    return DataProcessResult.failure(
      'PURE_COMPUTATION_VIOLATED',
      `${taskTypeId} injected AI_PROVIDER — pure computation must not use AI. Violates CF-433/CF-445.`,
    );
  }
  if (hasDbWriteCall) {
    return DataProcessResult.failure(
      'PURE_COMPUTATION_VIOLATED',
      `${taskTypeId} called storeDocument — no side effects permitted in pure computation. Violates CF-433.`,
    );
  }
  if (taskTypeId === 'T349' && validateConstraintsCalledBeforeSolve === false) {
    return DataProcessResult.failure(
      'CF-445_INVALID_CONSTRAINTS',
      'T349 must call validateConstraints() before solve(). Violates CF-445.',
    );
  }
  return DataProcessResult.success(undefined);
}

// ─── CHECK-4 ─────────────────────────────────────────────────────────────────
/**
 * jsonpath_dynamic_binding
 * DNA-1, CF-435: T353/T356/T359 must use Record<string, unknown> — no typed binding models.
 * JSONPath expressions must be validated before storing.
 */
export function check_jsonpath_dynamic_binding(
  jsonPathValidated: boolean,
  hasTypedBindingModel: boolean,
): DataProcessResult<void> {
  if (hasTypedBindingModel) {
    return DataProcessResult.failure(
      'DNA-1_TYPED_BINDING_MODEL',
      'Typed binding class found (CmsBindingTarget, DataSlotDefinition, etc.). ' +
        'Use Record<string, unknown> only. Violates DNA-1.',
    );
  }
  if (!jsonPathValidated) {
    return DataProcessResult.failure(
      'INVALID_JSONPATH',
      'JSONPath expression not validated before storing. Call IDataBindingValidator.validate() first. Violates CF-434.',
    );
  }
  return DataProcessResult.success(undefined);
}

// ─── CHECK-5 ─────────────────────────────────────────────────────────────────
/**
 * cloudevents_mandatory
 * CF-448: All async events must use F969 ICloudEventsEnvelopeService.
 * Direct queue.enqueue() or EventEmitter2 emission is forbidden.
 */
export function check_cloudevents_mandatory(
  usedCloudEventsEnvelope: boolean,
  usedDirectEmission: boolean,
): DataProcessResult<void> {
  if (usedDirectEmission) {
    return DataProcessResult.failure(
      'CF-448_DIRECT_EMIT',
      'Direct queue.enqueue() or EventEmitter2.emit() used. ' +
        'All async events must go through F969 ICloudEventsEnvelopeService. Violates CF-448.',
    );
  }
  if (!usedCloudEventsEnvelope) {
    return DataProcessResult.failure(
      'CF-448_DIRECT_EMIT',
      'CLOUD_EVENTS_ENVELOPE not injected. All async events require F969. Violates CF-448.',
    );
  }
  return DataProcessResult.success(undefined);
}

// ─── CHECK-6 ─────────────────────────────────────────────────────────────────
/**
 * code_export_af9_gate
 * CF-446: T363 AF-9 threshold must be 0.8 fractional — not 80 integer.
 * quality.failed event must include 'deficit' field when gate fails.
 */
export function check_code_export_af9_gate(
  threshold: number,
  qualityFailedEventEmittedOnFail: boolean,
  qualityFailedEventHasDeficitField: boolean,
  gateFailed: boolean,
): DataProcessResult<void> {
  if (threshold >= 1.0 || threshold <= 0.0) {
    return DataProcessResult.failure(
      'CF-446_THRESHOLD_MISCONFIGURED',
      `AF-9 threshold ${threshold} is outside [0.0, 1.0] range. Use EXPORT_QUALITY_THRESHOLD (0.8). Violates CF-446.`,
    );
  }
  if (Math.abs(threshold - EXPORT_QUALITY_THRESHOLD) > 0.0001) {
    return DataProcessResult.failure(
      'CF-446_THRESHOLD_MISCONFIGURED',
      `AF-9 threshold is ${threshold} but must be exactly ${EXPORT_QUALITY_THRESHOLD} (EXPORT_QUALITY_THRESHOLD). Violates CF-446.`,
    );
  }
  if (gateFailed && !qualityFailedEventEmittedOnFail) {
    return DataProcessResult.failure(
      'CF-446_THRESHOLD_MISCONFIGURED',
      `Gate failed but com.xiigen.code.export.quality.failed event was not emitted. Violates CF-446.`,
    );
  }
  if (gateFailed && !qualityFailedEventHasDeficitField) {
    return DataProcessResult.failure(
      'CF-446_THRESHOLD_MISCONFIGURED',
      `quality.failed event missing required 'deficit' field. Violates CF-446.`,
    );
  }
  return DataProcessResult.success(undefined);
}

// ─── CHECK-7 ─────────────────────────────────────────────────────────────────
/**
 * ietf_idempotency_key
 * CF-449, DNA-7: All queue consumers must call idempotency.check() before processing.
 * If isDuplicate: true — must skip processing without error.
 */
export function check_ietf_idempotency_key(
  idempotencyCheckCalledFirst: boolean,
  duplicateSkippedGracefully: boolean,
  isDuplicate: boolean,
): DataProcessResult<void> {
  if (!idempotencyCheckCalledFirst) {
    return DataProcessResult.failure(
      'CF-449_MISSING_IDEMPOTENCY',
      'Queue consumer did not call idempotency.check() before processing. Violates CF-449, DNA-7.',
    );
  }
  if (isDuplicate && !duplicateSkippedGracefully) {
    return DataProcessResult.failure(
      'CF-449_MISSING_IDEMPOTENCY',
      'Duplicate operation was not skipped gracefully. Must return DataProcessResult.success with skipped:true. Violates CF-449.',
    );
  }
  return DataProcessResult.success(undefined);
}

// ─── CHECK-8 ─────────────────────────────────────────────────────────────────
/**
 * role_from_auth_context_only
 * DD-216, OWASP API1: Role must come from auth context only.
 * Never from request body, params, query, or method parameter.
 */
export function check_role_from_auth_context_only(
  roleSourceIsAuthContext: boolean,
  rolePassedAsParameter: boolean,
): DataProcessResult<void> {
  if (rolePassedAsParameter) {
    return DataProcessResult.failure(
      'OWASP_API1_ROLE_INJECTION',
      'Role accepted as method parameter — OWASP API1 privilege escalation vector. ' +
        'Role MUST come from IPermissionContextReader.getRole() only. Violates DD-216.',
    );
  }
  if (!roleSourceIsAuthContext) {
    return DataProcessResult.failure(
      'OWASP_API1_ROLE_INJECTION',
      'Role not read from verified auth context. ' +
        'Must use PERMISSION_CONTEXT_READER injected service. Violates DD-216, OWASP API1.',
    );
  }
  return DataProcessResult.success(undefined);
}
