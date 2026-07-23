/**
 * TIER1 SESSION-1 — connection-types.ts tests
 *
 * Covers:
 *   - CONNECTION_TYPES constants
 *   - isValidConnectionType()
 *   - validateConnectionFields() — all rules and combinations
 */

import {
  CONNECTION_TYPES,
  isValidConnectionType,
  validateConnectionFields,
} from '../../src/rag-init/connection-types';

describe('CONNECTION_TYPES constants', () => {
  it('exports TENANT_PRIVATE', () => {
    expect(CONNECTION_TYPES.TENANT_PRIVATE).toBe('TENANT_PRIVATE');
  });

  it('exports FLOW_SCOPED', () => {
    expect(CONNECTION_TYPES.FLOW_SCOPED).toBe('FLOW_SCOPED');
  });

  it('exports TENANT_EXPORTABLE', () => {
    expect(CONNECTION_TYPES.TENANT_EXPORTABLE).toBe('TENANT_EXPORTABLE');
  });
});

describe('isValidConnectionType()', () => {
  it('returns true for FLOW_SCOPED', () => {
    expect(isValidConnectionType('FLOW_SCOPED')).toBe(true);
  });

  it('returns true for TENANT_PRIVATE', () => {
    expect(isValidConnectionType('TENANT_PRIVATE')).toBe(true);
  });

  it('returns true for TENANT_EXPORTABLE', () => {
    expect(isValidConnectionType('TENANT_EXPORTABLE')).toBe(true);
  });

  it('returns false for unknown string', () => {
    expect(isValidConnectionType('PUBLIC')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isValidConnectionType('')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isValidConnectionType(null)).toBe(false);
  });

  it('returns false for number', () => {
    expect(isValidConnectionType(42)).toBe(false);
  });
});

describe('validateConnectionFields()', () => {
  describe('FLOW_SCOPED', () => {
    it('passes with empty tenant_id and non-empty flow_id', () => {
      const errors = validateConnectionFields({
        connection_type: 'FLOW_SCOPED',
        tenant_id: '',
        flow_id: 'FLOW-0',
      });
      expect(errors).toEqual([]);
    });

    it('fails when tenant_id is non-empty', () => {
      const errors = validateConnectionFields({
        connection_type: 'FLOW_SCOPED',
        tenant_id: 'acme',
        flow_id: 'FLOW-0',
      });
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('empty tenant_id');
    });

    it('fails when flow_id is missing', () => {
      const errors = validateConnectionFields({
        connection_type: 'FLOW_SCOPED',
        tenant_id: '',
        flow_id: '',
      });
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes('flow_id'))).toBe(true);
    });
  });

  describe('TENANT_PRIVATE', () => {
    it('passes with non-empty tenant_id', () => {
      const errors = validateConnectionFields({
        connection_type: 'TENANT_PRIVATE',
        tenant_id: 'acme',
      });
      expect(errors).toEqual([]);
    });

    it('fails when tenant_id is empty', () => {
      const errors = validateConnectionFields({
        connection_type: 'TENANT_PRIVATE',
        tenant_id: '',
      });
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('non-empty tenant_id');
    });
  });

  describe('TENANT_EXPORTABLE', () => {
    it('passes with non-empty tenant_id', () => {
      const errors = validateConnectionFields({
        connection_type: 'TENANT_EXPORTABLE',
        tenant_id: 'acme',
      });
      expect(errors).toEqual([]);
    });

    it('fails when tenant_id is empty', () => {
      const errors = validateConnectionFields({
        connection_type: 'TENANT_EXPORTABLE',
        tenant_id: '',
      });
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('non-empty tenant_id');
    });
  });

  describe('missing / invalid connection_type', () => {
    it('fails when connection_type is missing', () => {
      const errors = validateConnectionFields({});
      expect(errors[0]).toContain('required');
    });

    it('fails when connection_type is an unknown value', () => {
      const errors = validateConnectionFields({ connection_type: 'PUBLIC' });
      expect(errors[0]).toContain('invalid');
    });
  });
});
