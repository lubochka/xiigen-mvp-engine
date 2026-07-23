/**
 * SafetyGateToken protocol tests (DR-168/DD-224)
 * GAP-M1 acceptance: 8 tests
 */

import { safety_gate_token_protocol } from '../checks/ai-safety-moderation-checks';
import type { SafetyGateToken } from '../safety-gate-token';

const validToken: SafetyGateToken = {
  tokenId: '550e8400-e29b-41d4-a716-446655440000',
  lessonCompositionHash: 'abc123def456789abcdef0123456789abcdef01',
  safetyCheckTimestamp: '2026-03-30T10:00:00.000Z',
  safetyGateVersion: '1.0.0',
  tenantId: 'tenant-test',
  approvedCategories: ['educational'],
  rejectedCategories: [],
  verdict: 'APPROVED',
  signature: 'hmac-sha256-64-char-signature-here-for-testing-purposes-only-pad',
};

describe('SafetyGateToken protocol (DR-168/DD-224)', () => {
  it('passes for a valid APPROVED token', () => {
    expect(() => safety_gate_token_protocol(validToken, 'comp-123')).not.toThrow();
  });

  it('throws when token is undefined', () => {
    expect(() => safety_gate_token_protocol(undefined, 'comp-123')).toThrow(
      'No SafetyGateToken present',
    );
  });

  it('throws when verdict is REJECTED', () => {
    expect(() =>
      safety_gate_token_protocol({ ...validToken, verdict: 'REJECTED' }, 'comp-123'),
    ).toThrow("verdict is 'REJECTED'");
  });

  it('throws when verdict is NEEDS_REVIEW', () => {
    expect(() =>
      safety_gate_token_protocol({ ...validToken, verdict: 'NEEDS_REVIEW' }, 'comp-123'),
    ).toThrow("verdict is 'NEEDS_REVIEW'");
  });

  it('throws when signature is missing', () => {
    expect(() => safety_gate_token_protocol({ ...validToken, signature: '' }, 'comp-123')).toThrow(
      'invalid signature',
    );
  });

  it('throws when signature is too short (< 32 chars)', () => {
    expect(() =>
      safety_gate_token_protocol({ ...validToken, signature: 'short' }, 'comp-123'),
    ).toThrow('invalid signature');
  });

  it('throws when tokenId is missing', () => {
    expect(() => safety_gate_token_protocol({ ...validToken, tokenId: '' }, 'comp-123')).toThrow(
      'missing required fields',
    );
  });

  it('throws when lessonCompositionHash is missing', () => {
    expect(() =>
      safety_gate_token_protocol({ ...validToken, lessonCompositionHash: '' }, 'comp-123'),
    ).toThrow('missing required fields');
  });
});
