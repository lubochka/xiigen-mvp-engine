/**
 * P7.3 Tests — Secret Reference Parser
 *
 * Tests: parseReference ($secret, $secret@version, $env, plain string, non-string),
 * isReference, findReferences (flat dict, nested dict, arrays, mixed, empty).
 */

import {
  SecretReference,
  EnvReference,
  parseReference,
  isReference,
  findReferences,
} from '../../src/freedom/secret-reference';

// ══════════════════════════════════════════════════════
// parseReference
// ══════════════════════════════════════════════════════

describe('parseReference', () => {
  it('should parse $secret:path', () => {
    const ref = parseReference('$secret:xiigen/ai/anthropic-key');
    expect(ref).toBeInstanceOf(SecretReference);
    expect((ref as SecretReference).path).toBe('xiigen/ai/anthropic-key');
    expect((ref as SecretReference).version).toBeUndefined();
    expect(ref!.refType).toBe('secret');
  });

  it('should parse $secret:path@version', () => {
    const ref = parseReference('$secret:xiigen/ai/key@v2');
    expect(ref).toBeInstanceOf(SecretReference);
    expect((ref as SecretReference).path).toBe('xiigen/ai/key');
    expect((ref as SecretReference).version).toBe('v2');
  });

  it('should parse $env:VARIABLE', () => {
    const ref = parseReference('$env:ANTHROPIC_API_KEY');
    expect(ref).toBeInstanceOf(EnvReference);
    expect((ref as EnvReference).variable).toBe('ANTHROPIC_API_KEY');
    expect(ref!.refType).toBe('env');
  });

  it('should return null for plain strings', () => {
    expect(parseReference('just a string')).toBeNull();
    expect(parseReference('hello world')).toBeNull();
    expect(parseReference('')).toBeNull();
  });

  it('should return null for non-string values', () => {
    expect(parseReference(42)).toBeNull();
    expect(parseReference(null)).toBeNull();
    expect(parseReference(undefined)).toBeNull();
    expect(parseReference(true)).toBeNull();
    expect(parseReference({})).toBeNull();
  });

  it('should handle edge case: $secret: with empty path', () => {
    // "$secret:" alone — regex requires at least one char in path
    const ref = parseReference('$secret:');
    expect(ref).toBeNull(); // empty path not valid
  });
});

// ══════════════════════════════════════════════════════
// SecretReference.cacheKey
// ══════════════════════════════════════════════════════

describe('SecretReference.cacheKey', () => {
  it('should produce cache key without version', () => {
    const ref = new SecretReference('xiigen/ai/key');
    expect(ref.cacheKey).toBe('secret::xiigen/ai/key');
  });

  it('should produce cache key with version', () => {
    const ref = new SecretReference('xiigen/ai/key', 'v3');
    expect(ref.cacheKey).toBe('secret::xiigen/ai/key@v3');
  });
});

describe('EnvReference.cacheKey', () => {
  it('should produce cache key', () => {
    const ref = new EnvReference('MY_VAR');
    expect(ref.cacheKey).toBe('env::MY_VAR');
  });
});

// ══════════════════════════════════════════════════════
// isReference
// ══════════════════════════════════════════════════════

describe('isReference', () => {
  it('should return true for $secret: prefix', () => {
    expect(isReference('$secret:something')).toBe(true);
  });

  it('should return true for $env: prefix', () => {
    expect(isReference('$env:SOMETHING')).toBe(true);
  });

  it('should return false for plain strings', () => {
    expect(isReference('hello')).toBe(false);
    expect(isReference('secret:not-a-ref')).toBe(false);
    expect(isReference('$other:nope')).toBe(false);
  });

  it('should return false for non-strings', () => {
    expect(isReference(42)).toBe(false);
    expect(isReference(null)).toBe(false);
    expect(isReference(undefined)).toBe(false);
    expect(isReference({})).toBe(false);
  });
});

// ══════════════════════════════════════════════════════
// findReferences
// ══════════════════════════════════════════════════════

describe('findReferences', () => {
  it('should find references in flat dict', () => {
    const config = {
      api_key: '$secret:xiigen/ai/key',
      name: 'test',
      db_url: '$env:DATABASE_URL',
    };
    const refs = findReferences(config);
    expect(refs).toHaveLength(2);
    expect(refs[0].configPath).toBe('api_key');
    expect(refs[0].rawValue).toBe('$secret:xiigen/ai/key');
    expect(refs[0].ref).toBeInstanceOf(SecretReference);
    expect(refs[1].configPath).toBe('db_url');
    expect(refs[1].ref).toBeInstanceOf(EnvReference);
  });

  it('should find references in nested dict', () => {
    const config = {
      db: {
        connection: {
          password: '$secret:xiigen/db/password',
        },
      },
    };
    const refs = findReferences(config);
    expect(refs).toHaveLength(1);
    expect(refs[0].configPath).toBe('db.connection.password');
  });

  it('should find references in arrays', () => {
    const config = {
      keys: ['$secret:xiigen/key1', 'plain', '$env:KEY2'],
    };
    const refs = findReferences(config);
    expect(refs).toHaveLength(2);
    expect(refs[0].configPath).toBe('keys[0]');
    expect(refs[1].configPath).toBe('keys[2]');
  });

  it('should return empty for dict with no references', () => {
    const config = { name: 'test', count: 5, active: true };
    const refs = findReferences(config);
    expect(refs).toHaveLength(0);
  });

  it('should return empty for empty dict', () => {
    expect(findReferences({})).toHaveLength(0);
  });

  it('should handle mixed refs and non-refs', () => {
    const config = {
      name: 'test',
      key: '$secret:xiigen/ai/key',
      count: 42,
      env: '$env:NODE_ENV',
      flag: true,
    };
    const refs = findReferences(config);
    expect(refs).toHaveLength(2);
  });

  it('should handle deeply nested structures', () => {
    const config = {
      level1: {
        level2: {
          level3: {
            secret: '$secret:deep/path',
          },
        },
      },
    };
    const refs = findReferences(config);
    expect(refs).toHaveLength(1);
    expect(refs[0].configPath).toBe('level1.level2.level3.secret');
  });

  it('should handle null and undefined values without error', () => {
    const config = {
      a: null,
      b: undefined,
      c: '$secret:valid',
    } as Record<string, unknown>;
    const refs = findReferences(config);
    expect(refs).toHaveLength(1);
  });

  it('should use pathPrefix when provided', () => {
    const config = { key: '$env:VAR' };
    const refs = findReferences(config, 'root');
    expect(refs[0].configPath).toBe('root.key');
  });
});
