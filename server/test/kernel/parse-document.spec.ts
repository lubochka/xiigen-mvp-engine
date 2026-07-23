/**
 * Tests for DNA-1: ParseDocument
 * Ported from Python: tests/unit/test_parse_document.py
 */

import {
  parseDocument,
  documentToJson,
  mergeDocuments,
  extractFields,
} from '../../src/kernel/parse-document';

describe('parseDocument (DNA-1)', () => {
  // ── JSON String Parsing ──────────────────────────────────

  describe('from JSON string', () => {
    it('should parse valid JSON string', () => {
      const result = parseDocument('{"name": "test", "value": 42}');
      expect(result.isSuccess).toBe(true);
      expect(result.data?.['name']).toBe('test');
      expect(result.data?.['value']).toBe(42);
    });

    it('should add _parsed_at timestamp', () => {
      const result = parseDocument('{"name": "test"}');
      expect(result.isSuccess).toBe(true);
      expect(result.data?.['_parsed_at']).toBeDefined();
      // Should be a valid ISO string
      expect(() => new Date(result.data!['_parsed_at'] as string)).not.toThrow();
    });

    it('should reject invalid JSON', () => {
      const result = parseDocument('{not json}');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('PARSE_INVALID_JSON');
    });

    it('should reject JSON arrays', () => {
      const result = parseDocument('[1, 2, 3]');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('PARSE_NOT_OBJECT');
    });

    it('should reject JSON primitives', () => {
      const result = parseDocument('"just a string"');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('PARSE_NOT_OBJECT');
    });
  });

  // ── Buffer Parsing ───────────────────────────────────────

  describe('from Buffer', () => {
    it('should parse valid JSON Buffer', () => {
      const buf = Buffer.from('{"key": "value"}', 'utf-8');
      const result = parseDocument(buf);
      expect(result.isSuccess).toBe(true);
      expect(result.data?.['key']).toBe('value');
    });

    it('should reject invalid Buffer content', () => {
      const buf = Buffer.from('not json', 'utf-8');
      const result = parseDocument(buf);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('PARSE_INVALID_JSON');
    });
  });

  // ── Dict Pass-through ────────────────────────────────────

  describe('from Record (dict)', () => {
    it('should accept a plain object', () => {
      const input = { name: 'test', count: 5 };
      const result = parseDocument(input);
      expect(result.isSuccess).toBe(true);
      expect(result.data?.['name']).toBe('test');
    });

    it('should shallow copy — not mutate the input', () => {
      const input: Record<string, unknown> = { name: 'original' };
      const result = parseDocument(input);
      expect(result.isSuccess).toBe(true);
      // Modifying result shouldn't change input
      if (result.data) {
        result.data['added'] = true;
      }
      expect(input['added']).toBeUndefined();
    });

    it('should not overwrite existing _parsed_at', () => {
      const input = { name: 'test', _parsed_at: '2020-01-01T00:00:00Z' };
      const result = parseDocument(input);
      expect(result.isSuccess).toBe(true);
      expect(result.data?.['_parsed_at']).toBe('2020-01-01T00:00:00Z');
    });
  });

  // ── Required Fields ──────────────────────────────────────

  describe('required fields validation', () => {
    it('should pass when all required fields present', () => {
      const result = parseDocument({ name: 'test', version: '1.0' }, ['name', 'version']);
      expect(result.isSuccess).toBe(true);
    });

    it('should fail when required fields missing', () => {
      const result = parseDocument({ name: 'test' }, ['name', 'version', 'type']);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('PARSE_MISSING_FIELDS');
      expect(result.errorMessage).toContain('version');
      expect(result.errorMessage).toContain('type');
    });

    it('should treat null values as missing', () => {
      const result = parseDocument({ name: null }, ['name']);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('PARSE_MISSING_FIELDS');
    });

    it('should treat undefined values as missing', () => {
      const result = parseDocument({ name: undefined }, ['name']);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('PARSE_MISSING_FIELDS');
    });

    it('should accept falsy but present values (0, empty string, false)', () => {
      const result = parseDocument({ count: 0, flag: false, label: '' }, [
        'count',
        'flag',
        'label',
      ]);
      expect(result.isSuccess).toBe(true);
    });

    it('should work with no required fields', () => {
      const result = parseDocument({ anything: true });
      expect(result.isSuccess).toBe(true);
    });

    it('should work with empty required fields array', () => {
      const result = parseDocument({ anything: true }, []);
      expect(result.isSuccess).toBe(true);
    });
  });

  // ── Metadata in failure ──────────────────────────────────

  describe('failure metadata', () => {
    it('should include missing fields list in metadata', () => {
      const result = parseDocument({ a: 1 }, ['b', 'c']);
      expect(result.isSuccess).toBe(false);
      expect(result.metadata['missing_fields']).toEqual(['b', 'c']);
    });
  });
});

// ── documentToJson ─────────────────────────────────────────

describe('documentToJson', () => {
  it('should serialize to compact JSON', () => {
    const json = documentToJson({ name: 'test', value: 42 });
    expect(JSON.parse(json)).toEqual({ name: 'test', value: 42 });
    expect(json).not.toContain('\n');
  });

  it('should serialize to pretty JSON', () => {
    const json = documentToJson({ name: 'test' }, true);
    expect(json).toContain('\n');
    expect(json).toContain('  ');
  });
});

// ── mergeDocuments ─────────────────────────────────────────

describe('mergeDocuments', () => {
  it('should merge flat objects (overlay wins)', () => {
    const result = mergeDocuments({ a: 1, b: 2 }, { b: 3, c: 4 });
    expect(result).toEqual({ a: 1, b: 3, c: 4 });
  });

  it('should merge nested objects recursively', () => {
    const base = { config: { theme: 'dark', lang: 'en' }, name: 'test' };
    const overlay = { config: { lang: 'he' } };
    const result = mergeDocuments(base, overlay);
    expect(result).toEqual({
      config: { theme: 'dark', lang: 'he' },
      name: 'test',
    });
  });

  it('should replace arrays (not append)', () => {
    const result = mergeDocuments({ tags: [1, 2] }, { tags: [3, 4] });
    expect(result).toEqual({ tags: [3, 4] });
  });

  it('should not mutate input objects', () => {
    const base = { a: 1 };
    const overlay = { b: 2 };
    mergeDocuments(base, overlay);
    expect(base).toEqual({ a: 1 });
    expect(overlay).toEqual({ b: 2 });
  });
});

// ── extractFields ──────────────────────────────────────────

describe('extractFields', () => {
  it('should extract specified fields', () => {
    const doc = { a: 1, b: 2, c: 3, d: 4 };
    expect(extractFields(doc, ['a', 'c'])).toEqual({ a: 1, c: 3 });
  });

  it('should skip missing fields silently', () => {
    const doc = { a: 1 };
    expect(extractFields(doc, ['a', 'missing'])).toEqual({ a: 1 });
  });

  it('should return empty for all missing fields', () => {
    expect(extractFields({ a: 1 }, ['x', 'y'])).toEqual({});
  });
});
