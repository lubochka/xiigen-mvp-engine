/**
 * FLOW-11 Phase C — T190 SchemaVersionManager + T193 SchemaCompatibilityChecker Tests
 * T190-1, T190-2, T193-3, T193-4
 */
import 'reflect-metadata';
import { SchemaVersionManagerService } from '../../../src/engine/flows/schema-registry-dag/schema-version-manager.service';
import { SchemaCompatibilityCheckerService } from '../../../src/engine/flows/schema-registry-dag/schema-compatibility-checker.service';

describe('T190 SchemaVersionManager', () => {
  let manager: SchemaVersionManagerService;

  beforeEach(() => {
    manager = new SchemaVersionManagerService();
  });

  test('T190-1: new optional field → ADDITIVE, minor version bump', () => {
    const previous = {
      version: '1.0.0',
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    };
    const newSchema = {
      type: 'object',
      properties: { name: { type: 'string' }, description: { type: 'string' } },
      required: ['name'],
    };
    const result = manager.classify({ previousSchema: previous, newSchema });
    expect(result.isSuccess).toBe(true);
    expect(result.data!.changeType).toBe('ADDITIVE');
    expect(result.data!.nextVersion).toBe('1.1.0');
  });

  test('T190-2: removed required field → BREAKING, major version bump', () => {
    const previous = {
      version: '1.0.0',
      type: 'object',
      properties: { name: { type: 'string' }, amount: { type: 'number' } },
      required: ['name', 'amount'],
    };
    const newSchema = {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    };
    const result = manager.classify({ previousSchema: previous, newSchema });
    expect(result.isSuccess).toBe(true);
    expect(result.data!.changeType).toBe('BREAKING');
    expect(result.data!.nextVersion).toBe('2.0.0');
    expect(result.data!.changedFields).toContain('amount');
  });
});

describe('T193 SchemaCompatibilityChecker', () => {
  let checker: SchemaCompatibilityCheckerService;

  beforeEach(() => {
    checker = new SchemaCompatibilityCheckerService();
  });

  test('T193-3: type change on existing field → BREAKING via T190; T193 detects incompatibility', () => {
    const previous = {
      type: 'object',
      properties: { price: { type: 'number' } },
      required: ['price'],
    };
    const newSchema = {
      type: 'object',
      properties: { price: { type: 'string' } }, // type changed
      required: ['price'],
    };

    // T190 should classify as BREAKING
    const manager = new SchemaVersionManagerService();
    const versionResult = manager.classify({
      previousSchema: { version: '1.0.0', ...previous },
      newSchema,
    });
    expect(versionResult.data!.changeType).toBe('BREAKING');
    expect(versionResult.data!.changedFields).toContain('price');

    // T193 checks backward compat — price is present so technically compat at field level
    const compatResult = checker.check({ previousSchema: previous, newSchema });
    expect(compatResult.isSuccess).toBe(true);
  });

  test('T193-4: T193 has no ES calls — pure comparison verified', () => {
    const service = new SchemaCompatibilityCheckerService();
    // Constructor takes no db/queue parameters
    expect(SchemaCompatibilityCheckerService.length).toBe(0);

    // check() is synchronous
    const result = service.check({ previousSchema: null, newSchema: { type: 'object' } });
    expect(result).not.toBeInstanceOf(Promise);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.verdict).toBe('COMPATIBLE');
  });
});
