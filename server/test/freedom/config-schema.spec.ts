/**
 * P7.3 Tests — FREEDOM Config Schema
 *
 * Tests: validateConfigDoc (valid, missing fields, invalid value_type),
 * makeConfigDoc (defaults, overrides), DNA-1 compliance, DNA-3 returns.
 */

import { DataProcessResult } from '../../src/kernel/data-process-result';
import {
  validateConfigDoc,
  makeConfigDoc,
  VALID_VALUE_TYPES,
} from '../../src/freedom/config-schema';

describe('validateConfigDoc', () => {
  it('should validate a complete valid doc', () => {
    const doc = {
      config_key: 'ai.model',
      task_type: 'T44',
      value: 'claude',
      value_type: 'string',
    };
    const result = validateConfigDoc(doc);
    expect(result.isSuccess).toBe(true);
  });

  it('should fail when config_key is missing', () => {
    const doc = { task_type: 'T44', value: 'x' };
    const result = validateConfigDoc(doc);
    expect(result.isSuccess).toBe(false);
    expect(result.errorMessage).toContain('config_key is required');
  });

  it('should fail when config_key is not a string', () => {
    const doc = { config_key: 123, task_type: 'T44', value: 'x' };
    const result = validateConfigDoc(doc);
    expect(result.isSuccess).toBe(false);
    expect(result.errorMessage).toContain('config_key must be a string');
  });

  it('should fail when task_type is missing', () => {
    const doc = { config_key: 'x', value: 'y' };
    const result = validateConfigDoc(doc);
    expect(result.isSuccess).toBe(false);
    expect(result.errorMessage).toContain('task_type is required');
  });

  it('should fail when value is missing', () => {
    const doc = { config_key: 'x', task_type: 'T44' };
    const result = validateConfigDoc(doc);
    expect(result.isSuccess).toBe(false);
    expect(result.errorMessage).toContain('value is required');
  });

  it('should accept value of any type (null, number, array)', () => {
    expect(validateConfigDoc({ config_key: 'a', task_type: 'T1', value: null }).isSuccess).toBe(
      true,
    );
    expect(validateConfigDoc({ config_key: 'a', task_type: 'T1', value: 42 }).isSuccess).toBe(true);
    expect(validateConfigDoc({ config_key: 'a', task_type: 'T1', value: [1, 2] }).isSuccess).toBe(
      true,
    );
  });

  it('should fail on invalid value_type', () => {
    const doc = { config_key: 'x', task_type: 'T44', value: 'y', value_type: 'banana' };
    const result = validateConfigDoc(doc);
    expect(result.isSuccess).toBe(false);
    expect(result.errorMessage).toContain('value_type');
    expect(result.errorMessage).toContain('banana');
  });

  it('should accept all valid value_types', () => {
    for (const vt of VALID_VALUE_TYPES) {
      const doc = { config_key: 'x', task_type: 'T1', value: 'v', value_type: vt };
      expect(validateConfigDoc(doc).isSuccess).toBe(true);
    }
  });

  it('should default value_type to string when not provided', () => {
    const doc = { config_key: 'x', task_type: 'T1', value: 'v' };
    expect(validateConfigDoc(doc).isSuccess).toBe(true);
  });

  it('should collect multiple errors', () => {
    const doc = {} as Record<string, unknown>;
    const result = validateConfigDoc(doc);
    expect(result.isSuccess).toBe(false);
    const errors = result.errorMessage!.split(';');
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });

  it('should return DataProcessResult (DNA-3)', () => {
    const result = validateConfigDoc({ config_key: 'x', task_type: 'T1', value: 'v' });
    expect(result).toBeInstanceOf(DataProcessResult);
  });

  it('should use INVALID_CONFIG error code on failure', () => {
    const result = validateConfigDoc({});
    expect(result.errorCode).toBe('INVALID_CONFIG');
  });
});

describe('makeConfigDoc', () => {
  it('should create a valid config doc with required fields', () => {
    const doc = makeConfigDoc({ configKey: 'ai.model', taskType: 'T44', value: 'claude' });
    expect(doc.config_key).toBe('ai.model');
    expect(doc.task_type).toBe('T44');
    expect(doc.value).toBe('claude');
  });

  it('should use sensible defaults', () => {
    const doc = makeConfigDoc({ configKey: 'x', taskType: 'T1', value: 'v' });
    expect(doc.value_type).toBe('string');
    expect(doc.description).toBe('');
    expect(doc.editable_by).toBe('admin');
    expect(doc.tenant_id).toBe('');
  });

  it('should accept all overrides', () => {
    const doc = makeConfigDoc({
      configKey: 'x',
      taskType: 'T1',
      value: 42,
      valueType: 'int',
      description: 'test desc',
      editableBy: 'superadmin',
      tenantId: 'tenant-A',
    });
    expect(doc.value_type).toBe('int');
    expect(doc.description).toBe('test desc');
    expect(doc.editable_by).toBe('superadmin');
    expect(doc.tenant_id).toBe('tenant-A');
  });

  it('should produce snake_case keys (DNA-1)', () => {
    const doc = makeConfigDoc({ configKey: 'x', taskType: 'T1', value: 'v' });
    expect(doc).toHaveProperty('config_key');
    expect(doc).toHaveProperty('task_type');
    expect(doc).toHaveProperty('value_type');
    expect(doc).toHaveProperty('editable_by');
    expect(doc).toHaveProperty('tenant_id');
    expect(doc).not.toHaveProperty('configKey');
    expect(doc).not.toHaveProperty('taskType');
  });

  it('created doc should pass validation', () => {
    const doc = makeConfigDoc({ configKey: 'ai.model', taskType: 'T44', value: 'claude' });
    expect(validateConfigDoc(doc).isSuccess).toBe(true);
  });
});

describe('VALID_VALUE_TYPES', () => {
  it('should contain exactly 6 types', () => {
    expect(VALID_VALUE_TYPES.size).toBe(6);
  });

  it('should include string, int, float, bool, list, dict', () => {
    expect(VALID_VALUE_TYPES.has('string')).toBe(true);
    expect(VALID_VALUE_TYPES.has('int')).toBe(true);
    expect(VALID_VALUE_TYPES.has('float')).toBe(true);
    expect(VALID_VALUE_TYPES.has('bool')).toBe(true);
    expect(VALID_VALUE_TYPES.has('list')).toBe(true);
    expect(VALID_VALUE_TYPES.has('dict')).toBe(true);
  });
});
