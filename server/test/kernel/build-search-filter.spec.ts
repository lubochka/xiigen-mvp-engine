/**
 * Tests for DNA-2: BuildSearchFilter — auto-skip empty fields.
 * Ported from Python: tests/unit/test_build_search_filter.py
 */

import {
  buildSearchFilter,
  buildSearchFilterFlat,
  buildEsQuery,
  FilterOperator,
  isEmpty,
} from '../../src/kernel/build-search-filter';

describe('buildSearchFilter (DNA-2)', () => {
  describe('empty value skipping', () => {
    it('should skip null values', () => {
      const f = buildSearchFilter({ name: 'test', email: null });
      expect(f['email']).toBeUndefined();
      expect(f['name']).toBeDefined();
    });

    it('should skip undefined values', () => {
      const f = buildSearchFilter({ name: 'test', email: undefined });
      expect(f['email']).toBeUndefined();
      expect(f['name']).toBeDefined();
    });

    it('should skip empty string', () => {
      const f = buildSearchFilter({ name: 'test', city: '' });
      expect(f['city']).toBeUndefined();
    });

    it('should skip whitespace-only string', () => {
      const f = buildSearchFilter({ name: 'test', tag: '   ' });
      expect(f['tag']).toBeUndefined();
    });

    it('should skip empty array', () => {
      const f = buildSearchFilter({ name: 'test', tags: [] });
      expect(f['tags']).toBeUndefined();
    });

    it('should skip empty object', () => {
      const f = buildSearchFilter({ name: 'test', meta: {} });
      expect(f['meta']).toBeUndefined();
    });

    it('should keep non-empty values', () => {
      const f = buildSearchFilter({ name: 'test', age: 25, active: true, count: 0 });
      expect(Object.keys(f).length).toBe(4);
      expect(f['name']).toBeDefined();
      expect(f['count']).toBeDefined();
    });

    it('should keep false value', () => {
      const f = buildSearchFilter({ active: false });
      expect(f['active']).toBeDefined();
      expect(f['active'].value).toBe(false);
    });

    it('should keep zero value', () => {
      const f = buildSearchFilter({ count: 0 });
      expect(f['count']).toBeDefined();
      expect(f['count'].value).toBe(0);
    });

    it('should return empty when all values are empty', () => {
      const f = buildSearchFilter({ a: null, b: '', c: [], d: {} });
      expect(Object.keys(f).length).toBe(0);
    });
  });

  describe('operator overrides', () => {
    it('should apply custom operators per field', () => {
      const f = buildSearchFilter(
        { price: 100, name: 'test' },
        { price: FilterOperator.GREATER_THAN },
      );
      expect(f['price'].operator).toBe('gt');
      expect(f['name'].operator).toBe('eq');
    });

    it('should default to EQUALS', () => {
      const f = buildSearchFilter({ status: 'active' });
      expect(f['status'].operator).toBe('eq');
    });

    it('should support all operator types', () => {
      const operators = Object.values(FilterOperator);
      for (const op of operators) {
        const f = buildSearchFilter({ field: 'value' }, { field: op });
        expect(f['field'].operator).toBe(op);
      }
    });
  });
});

describe('buildSearchFilterFlat', () => {
  it('should strip empties and return clean key:value', () => {
    const f = buildSearchFilterFlat({ name: 'test', email: null, city: '' });
    expect(f).toEqual({ name: 'test' });
  });

  it('should keep all non-empty values', () => {
    const f = buildSearchFilterFlat({ a: 1, b: 'x', c: false, d: 0 });
    expect(f).toEqual({ a: 1, b: 'x', c: false, d: 0 });
  });
});

describe('buildEsQuery', () => {
  it('should always include tenant_id clause (DNA-5)', () => {
    const q = buildEsQuery({}, 'T-001');
    const must = (q['query'] as any).bool.must as any[];
    expect(must.some((c: any) => c.term?.tenant_id === 'T-001')).toBe(true);
  });

  it('should add filter clauses', () => {
    const filters = buildSearchFilter({ status: 'active' });
    const q = buildEsQuery(filters, 'T-001');
    const must = (q['query'] as any).bool.must as any[];
    expect(must.length).toBe(2); // tenant_id + status
  });

  it('should respect size and offset', () => {
    const q = buildEsQuery({}, 'T-001', { size: 50, fromOffset: 10 });
    expect(q['size']).toBe(50);
    expect(q['from']).toBe(10);
  });

  it('should default to size 100 and offset 0', () => {
    const q = buildEsQuery({}, 'T-001');
    expect(q['size']).toBe(100);
    expect(q['from']).toBe(0);
  });

  it('should handle empty filter (only tenant clause)', () => {
    const q = buildEsQuery({}, 'T-001');
    const must = (q['query'] as any).bool.must as any[];
    expect(must.length).toBe(1);
  });

  it('should convert gt operator to range clause', () => {
    const filters = buildSearchFilter({ price: 100 }, { price: FilterOperator.GREATER_THAN });
    const q = buildEsQuery(filters, 'T-001');
    const must = (q['query'] as any).bool.must as any[];
    const rangeClause = must.find((c: any) => c.range);
    expect(rangeClause).toBeDefined();
    expect(rangeClause.range.price.gt).toBe(100);
  });

  it('should convert in operator to terms clause', () => {
    const filters = buildSearchFilter({ status: ['a', 'b'] }, { status: FilterOperator.IN });
    const q = buildEsQuery(filters, 'T-001');
    const must = (q['query'] as any).bool.must as any[];
    const termsClause = must.find((c: any) => c.terms);
    expect(termsClause).toBeDefined();
    expect(termsClause.terms.status).toEqual(['a', 'b']);
  });
});

describe('isEmpty utility', () => {
  it.each([
    [null, true],
    [undefined, true],
    ['', true],
    ['   ', true],
    [[], true],
    [{}, true],
    [0, false],
    [false, false],
    ['hello', false],
    [[1], false],
    [{ a: 1 }, false],
  ])('isEmpty(%p) should be %p', (value, expected) => {
    expect(isEmpty(value)).toBe(expected);
  });
});

describe('Negative patterns (DNA-2)', () => {
  it('should never send null as a filter — prevents full-table scan', () => {
    const f = buildSearchFilter({ status: null });
    expect(Object.keys(f).length).toBe(0);
  });
});
