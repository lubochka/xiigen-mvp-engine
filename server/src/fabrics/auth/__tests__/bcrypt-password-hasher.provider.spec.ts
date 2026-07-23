/**
 * BcryptPasswordHasherProvider tests — FLOW-01 Phase A0.5.
 *
 * Validates IPasswordHasherService contract: hash/compare/needsRehash/healthCheck
 * with bcryptjs rounds=12.
 */

import { BcryptPasswordHasherProvider } from '../bcrypt-password-hasher.provider';
import { BCRYPT_HASH_PATTERN, BCRYPT_ROUNDS } from '../base';

jest.setTimeout(20_000);

describe('BcryptPasswordHasherProvider (IPasswordHasherService)', () => {
  let hasher: BcryptPasswordHasherProvider;

  beforeEach(() => {
    hasher = new BcryptPasswordHasherProvider();
  });

  // ── hash ───────────────────────────────────────────────────────────────────

  it('hash returns a bcrypt-prefixed hash with rounds=12', async () => {
    const result = await hasher.hash('correct-horse-battery-staple');
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.hash).toMatch(BCRYPT_HASH_PATTERN);
    expect(result.data!.hash).toMatch(/^\$2[aby]\$12\$/);
    expect(result.data!.algorithm).toBe('bcrypt');
    expect(result.data!.rounds).toBe(BCRYPT_ROUNDS);
  });

  it('hash is non-idempotent — two hashes of the same plaintext differ (salt)', async () => {
    const a = await hasher.hash('same-plaintext');
    const b = await hasher.hash('same-plaintext');
    expect(a.isSuccess).toBe(true);
    expect(b.isSuccess).toBe(true);
    expect(a.data!.hash).not.toEqual(b.data!.hash);
  });

  it('hash rejects empty plaintext with INVALID_PLAINTEXT', async () => {
    const result = await hasher.hash('');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('INVALID_PLAINTEXT');
  });

  // ── compare ────────────────────────────────────────────────────────────────

  it('compare returns matches=true for correct plaintext', async () => {
    const hashed = (await hasher.hash('pa55word')).data!.hash;
    const result = await hasher.compare('pa55word', hashed);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.matches).toBe(true);
  });

  it('compare returns matches=false (SUCCESS) for wrong plaintext', async () => {
    const hashed = (await hasher.hash('real-password')).data!.hash;
    const result = await hasher.compare('wrong-password', hashed);
    expect(result.isSuccess).toBe(true); // the "no" answer is success
    expect(result.data!.matches).toBe(false);
  });

  it('compare returns HASH_MALFORMED on non-bcrypt hash input', async () => {
    const result = await hasher.compare('anything', 'not-a-bcrypt-hash');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('HASH_MALFORMED');
  });

  // ── needsRehash ────────────────────────────────────────────────────────────

  it('needsRehash returns false for hash with current rounds=12', async () => {
    const hashed = (await hasher.hash('any')).data!.hash;
    const result = await hasher.needsRehash(hashed);
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBe(false);
  });

  it('needsRehash returns true for hash with rounds below current (e.g. rounds=10)', async () => {
    // Synthesize a rounds=10 bcrypt prefix — content after the cost is irrelevant for needsRehash.
    const lowCostHash = '$2b$10$abcdefghijklmnopqrstuvabcdefghijklmnopqrstuvwxyzabcd';
    const result = await hasher.needsRehash(lowCostHash);
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBe(true);
  });

  it('needsRehash returns HASH_MALFORMED for non-bcrypt input', async () => {
    const result = await hasher.needsRehash('sha256:abcdef');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('HASH_MALFORMED');
  });

  // ── healthCheck ────────────────────────────────────────────────────────────

  it('healthCheck returns success=true (hash+compare round-trip)', async () => {
    const result = await hasher.healthCheck();
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBe(true);
  });
});
