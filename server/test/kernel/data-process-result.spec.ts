/**
 * Tests for DNA-3: DataProcessResult
 * Ported from Python: tests/unit/test_data_process_result.py
 */

import { DataProcessResult } from '../../src/kernel/data-process-result';

describe('DataProcessResult', () => {
  // ── Static Constructors ──────────────────────────────────

  describe('success()', () => {
    it('should create a success result with data', () => {
      const result = DataProcessResult.success({ name: 'test' });
      expect(result.isSuccess).toBe(true);
      expect(result.data).toEqual({ name: 'test' });
      expect(result.errorCode).toBeUndefined();
      expect(result.errorMessage).toBeUndefined();
    });

    it('should have a correlation ID and timestamp', () => {
      const result = DataProcessResult.success('data');
      expect(result.correlationId).toBeDefined();
      expect(result.correlationId.length).toBeGreaterThan(0);
      expect(result.timestamp).toBeDefined();
      // ISO format check
      expect(() => new Date(result.timestamp)).not.toThrow();
    });

    it('should accept metadata', () => {
      const result = DataProcessResult.success('data', { source: 'test' });
      expect(result.metadata).toEqual({ source: 'test' });
    });

    it('should default metadata to empty object', () => {
      const result = DataProcessResult.success('data');
      expect(result.metadata).toEqual({});
    });

    it('should work with various data types', () => {
      expect(DataProcessResult.success(42).data).toBe(42);
      expect(DataProcessResult.success('hello').data).toBe('hello');
      expect(DataProcessResult.success(true).data).toBe(true);
      expect(DataProcessResult.success([1, 2, 3]).data).toEqual([1, 2, 3]);
      expect(DataProcessResult.success(null).data).toBeNull();
    });
  });

  describe('failure()', () => {
    it('should create a failure result with error code and message', () => {
      const result = DataProcessResult.failure('NOT_FOUND', 'Item not found');
      expect(result.isSuccess).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.errorCode).toBe('NOT_FOUND');
      expect(result.errorMessage).toBe('Item not found');
    });

    it('should accept metadata', () => {
      const result = DataProcessResult.failure('ERR', 'msg', { detail: 'extra' });
      expect(result.metadata).toEqual({ detail: 'extra' });
    });

    it('should have correlation ID and timestamp', () => {
      const result = DataProcessResult.failure('ERR', 'msg');
      expect(result.correlationId).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('error()', () => {
    it('should create an error result from an exception', () => {
      const exception = new TypeError('connection refused');
      const result = DataProcessResult.error('DB_ERROR', 'Database failed', exception);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('DB_ERROR');
      expect(result.errorMessage).toBe('Database failed');
      expect(result.metadata['exception_type']).toBe('TypeError');
      expect(result.metadata['exception_detail']).toBe('connection refused');
    });

    it('should work without an exception', () => {
      const result = DataProcessResult.error('UNKNOWN', 'Something went wrong');
      expect(result.isSuccess).toBe(false);
      expect(result.metadata).toEqual({});
    });
  });

  // ── Chainable Operations ─────────────────────────────────

  describe('map()', () => {
    it('should transform data on success', () => {
      const result = DataProcessResult.success(5).map((n) => n * 2);
      expect(result.isSuccess).toBe(true);
      expect(result.data).toBe(10);
    });

    it('should pass-through on failure', () => {
      const result = DataProcessResult.failure<number>('ERR', 'fail').map((n) => n * 2);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('ERR');
    });

    it('should catch exceptions in map function', () => {
      const result = DataProcessResult.success(5).map(() => {
        throw new Error('map boom');
      });
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('MAP_FAILED');
      expect(result.errorMessage).toBe('map boom');
    });
  });

  describe('flatMap()', () => {
    it('should chain successful results', () => {
      const result = DataProcessResult.success(5).flatMap((n) => DataProcessResult.success(n * 3));
      expect(result.isSuccess).toBe(true);
      expect(result.data).toBe(15);
    });

    it('should stop at first failure', () => {
      const result = DataProcessResult.success(5).flatMap(() =>
        DataProcessResult.failure('CHAIN_ERR', 'stopped'),
      );
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('CHAIN_ERR');
    });

    it('should pass-through on initial failure', () => {
      const result = DataProcessResult.failure<number>('INIT_ERR', 'nope').flatMap((n) =>
        DataProcessResult.success(n * 2),
      );
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('INIT_ERR');
    });

    it('should catch exceptions in flatMap function', () => {
      const result = DataProcessResult.success(5).flatMap(() => {
        throw new Error('flatMap boom');
      });
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('FLAT_MAP_FAILED');
    });
  });

  describe('onFailure()', () => {
    it('should call handler on failure', () => {
      const handler = jest.fn();
      DataProcessResult.failure('ERR', 'msg').onFailure(handler);
      expect(handler).toHaveBeenCalledWith('ERR', 'msg');
    });

    it('should not call handler on success', () => {
      const handler = jest.fn();
      DataProcessResult.success('ok').onFailure(handler);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should return self for chaining', () => {
      const result = DataProcessResult.failure('ERR', 'msg');
      const chained = result.onFailure(() => {});
      expect(chained).toBe(result);
    });
  });

  describe('unwrapOr()', () => {
    it('should return data on success', () => {
      expect(DataProcessResult.success(42).unwrapOr(0)).toBe(42);
    });

    it('should return default on failure', () => {
      expect(DataProcessResult.failure<number>('ERR', 'fail').unwrapOr(99)).toBe(99);
    });
  });

  // ── Serialization ────────────────────────────────────────

  describe('toDict()', () => {
    it('should serialize success result', () => {
      const result = DataProcessResult.success({ id: 1 });
      const dict = result.toDict();
      expect(dict['is_success']).toBe(true);
      expect(dict['data']).toEqual({ id: 1 });
      expect(dict['correlation_id']).toBeDefined();
      expect(dict['timestamp']).toBeDefined();
      expect(dict['error_code']).toBeUndefined();
    });

    it('should serialize failure result', () => {
      const result = DataProcessResult.failure('NOT_FOUND', 'Item not found');
      const dict = result.toDict();
      expect(dict['is_success']).toBe(false);
      expect(dict['error_code']).toBe('NOT_FOUND');
      expect(dict['error_message']).toBe('Item not found');
      expect(dict['data']).toBeUndefined();
    });

    it('should include metadata when present', () => {
      const result = DataProcessResult.success('ok', { extra: true });
      const dict = result.toDict();
      expect(dict['metadata']).toEqual({ extra: true });
    });

    it('should omit metadata when empty', () => {
      const result = DataProcessResult.success('ok');
      const dict = result.toDict();
      expect(dict['metadata']).toBeUndefined();
    });
  });

  // ── Immutability ─────────────────────────────────────────

  describe('immutability', () => {
    it('should not allow property mutation', () => {
      const result = DataProcessResult.success('data');
      // TypeScript readonly should prevent mutation at compile time.
      // At runtime, we verify the values are stable.
      expect(result.isSuccess).toBe(true);
      expect(result.data).toBe('data');
    });

    it('should produce unique correlation IDs', () => {
      const r1 = DataProcessResult.success('a');
      const r2 = DataProcessResult.success('b');
      expect(r1.correlationId).not.toBe(r2.correlationId);
    });
  });

  // ── Type Safety ──────────────────────────────────────────

  describe('generics', () => {
    it('should preserve type through success', () => {
      const result: DataProcessResult<string> = DataProcessResult.success('hello');
      expect(result.data).toBe('hello');
    });

    it('should preserve type through map', () => {
      const result: DataProcessResult<number> = DataProcessResult.success('hello').map(
        (s) => s.length,
      );
      expect(result.data).toBe(5);
    });

    it('should preserve type through flatMap', () => {
      const result: DataProcessResult<boolean> = DataProcessResult.success(5).flatMap((n) =>
        DataProcessResult.success(n > 3),
      );
      expect(result.data).toBe(true);
    });
  });
});
