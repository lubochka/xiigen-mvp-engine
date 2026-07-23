/**
 * Tests for FLOW-23 Named Check Functions — GAP-23-2 through GAP-23-8
 */

import {
  check_step1_tenant_isolation,
  check_template_mode_readonly,
  check_pure_computation_no_ai,
  check_jsonpath_dynamic_binding,
  check_cloudevents_mandatory,
  check_code_export_af9_gate,
  check_ietf_idempotency_key,
  check_role_from_auth_context_only,
} from '../../../../engine-contracts/form-builder-templates-named-checks';
import { EXPORT_QUALITY_THRESHOLD } from '../../../../engine-contracts/form-builder-templates-export-quality';

// ── GAP-23-1: step1_tenant_isolation ──────────────────────────────────────────

describe('check_step1_tenant_isolation — GAP-23-1 (CF-447)', () => {
  it('passes for FLOW-23 template with T360 at position 0', () => {
    const result = check_step1_tenant_isolation(71, 'T360');
    expect(result.isSuccess).toBe(true);
  });

  it('fails when T349 is at position 0 in template 71', () => {
    const result = check_step1_tenant_isolation(71, 'T349');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CF-447_BUILD_FAILURE');
    expect(result.errorMessage).toContain('71');
  });

  it('skips non-FLOW-23 templates', () => {
    const result = check_step1_tenant_isolation(99, 'T200');
    expect(result.isSuccess).toBe(true);
  });
});

// ── GAP-23-2: template_mode_readonly ──────────────────────────────────────────

describe('check_template_mode_readonly — GAP-23-2 (CF-444)', () => {
  it('passes when verifyReadOnly called and confirmed', () => {
    const result = check_template_mode_readonly(true, true);
    expect(result.isSuccess).toBe(true);
  });

  it('fails when verifyReadOnly not called', () => {
    const result = check_template_mode_readonly(false, false);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CF-444_READONLY_VIOLATION');
  });

  it('fails when readOnly not confirmed', () => {
    const result = check_template_mode_readonly(true, false);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CF-444_NOT_READONLY');
  });
});

// ── GAP-23-3: pure_computation_no_ai ──────────────────────────────────────────

describe('check_pure_computation_no_ai — GAP-23-3 (CF-433, CF-445)', () => {
  it('passes for T349 without AI injection or DB write', () => {
    const result = check_pure_computation_no_ai('T349', false, false, true);
    expect(result.isSuccess).toBe(true);
  });

  it('fails when AI provider injected', () => {
    const result = check_pure_computation_no_ai('T349', true, false, true);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('PURE_COMPUTATION_VIOLATED');
  });

  it('fails when DB write call present', () => {
    const result = check_pure_computation_no_ai('T354', false, true);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('PURE_COMPUTATION_VIOLATED');
  });

  it('fails when T349 validateConstraints not called before solve', () => {
    const result = check_pure_computation_no_ai('T349', false, false, false);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CF-445_INVALID_CONSTRAINTS');
  });
});

// ── GAP-23-4: jsonpath_dynamic_binding ────────────────────────────────────────

describe('check_jsonpath_dynamic_binding — GAP-23-4 (DNA-1, CF-435)', () => {
  it('passes when expression validated and no typed model', () => {
    const result = check_jsonpath_dynamic_binding(true, false);
    expect(result.isSuccess).toBe(true);
  });

  it('fails when typed binding model present', () => {
    const result = check_jsonpath_dynamic_binding(true, true);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('DNA-1_TYPED_BINDING_MODEL');
  });

  it('fails when JSONPath not validated', () => {
    const result = check_jsonpath_dynamic_binding(false, false);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('INVALID_JSONPATH');
  });
});

// ── GAP-23-5: cloudevents_mandatory ───────────────────────────────────────────

describe('check_cloudevents_mandatory — GAP-23-5 (CF-448)', () => {
  it('passes when CloudEvents envelope used', () => {
    const result = check_cloudevents_mandatory(true, false);
    expect(result.isSuccess).toBe(true);
  });

  it('fails when direct emission used', () => {
    const result = check_cloudevents_mandatory(true, true);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CF-448_DIRECT_EMIT');
  });

  it('fails when CloudEvents envelope not injected', () => {
    const result = check_cloudevents_mandatory(false, false);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CF-448_DIRECT_EMIT');
  });
});

// ── GAP-23-6: code_export_af9_gate ────────────────────────────────────────────

describe('check_code_export_af9_gate — GAP-23-6 (CF-446)', () => {
  it('EXPORT_QUALITY_THRESHOLD constant is 0.8 fractional', () => {
    expect(EXPORT_QUALITY_THRESHOLD).toBe(0.8);
    expect(EXPORT_QUALITY_THRESHOLD).toBeLessThanOrEqual(1.0);
    expect(EXPORT_QUALITY_THRESHOLD).toBeGreaterThan(0);
  });

  it('passes when threshold is exactly 0.8 and gate passed', () => {
    const result = check_code_export_af9_gate(0.8, false, false, false);
    expect(result.isSuccess).toBe(true);
  });

  it('fails when threshold is 80 (integer — common mistake)', () => {
    const result = check_code_export_af9_gate(80, false, false, false);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CF-446_THRESHOLD_MISCONFIGURED');
  });

  it('fails when gate fails but quality.failed event not emitted', () => {
    const result = check_code_export_af9_gate(0.8, false, false, true);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CF-446_THRESHOLD_MISCONFIGURED');
  });

  it('fails when quality.failed event missing deficit field', () => {
    const result = check_code_export_af9_gate(0.8, true, false, true);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CF-446_THRESHOLD_MISCONFIGURED');
  });
});

// ── GAP-23-7: ietf_idempotency_key ────────────────────────────────────────────

describe('check_ietf_idempotency_key — GAP-23-7 (CF-449, DNA-7)', () => {
  it('passes when check called first and not duplicate', () => {
    const result = check_ietf_idempotency_key(true, false, false);
    expect(result.isSuccess).toBe(true);
  });

  it('passes when duplicate is skipped gracefully', () => {
    const result = check_ietf_idempotency_key(true, true, true);
    expect(result.isSuccess).toBe(true);
  });

  it('fails when idempotency check not called first', () => {
    const result = check_ietf_idempotency_key(false, false, false);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CF-449_MISSING_IDEMPOTENCY');
  });

  it('fails when duplicate not skipped gracefully', () => {
    const result = check_ietf_idempotency_key(true, false, true);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CF-449_MISSING_IDEMPOTENCY');
  });
});

// ── GAP-23-8: role_from_auth_context_only ─────────────────────────────────────

describe('check_role_from_auth_context_only — GAP-23-8 (DD-216, OWASP API1)', () => {
  it('passes when role from auth context and not passed as parameter', () => {
    const result = check_role_from_auth_context_only(true, false);
    expect(result.isSuccess).toBe(true);
  });

  it('fails when role passed as parameter (OWASP API1)', () => {
    const result = check_role_from_auth_context_only(true, true);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('OWASP_API1_ROLE_INJECTION');
  });

  it('fails when role not from auth context', () => {
    const result = check_role_from_auth_context_only(false, false);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('OWASP_API1_ROLE_INJECTION');
  });
});
