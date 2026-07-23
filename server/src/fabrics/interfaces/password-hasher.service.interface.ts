/**
 * FABRIC 12: IPasswordHasherService (FLOW-01 Phase A0.5 — Fabric Auth Foundation)
 *
 * Password-hashing fabric. bcryptjs concrete default, rounds=12 (Auth Plan v3.0 line 355).
 * bcryptjs (not native bcrypt) per Luba decision #2 (2026-04-24) — no native build.
 * Closes AM-9 (Rule 1 Fabric First).
 *
 * Iron Rules:
 *   - Never log plaintext or hashes.
 *   - `compare()` with matches=false is SUCCESS — that's a valid answer, not a failure.
 *   - Only return failure on malformed input or underlying library throw.
 */

import { DataProcessResult } from '../../kernel/data-process-result';

/** Output of hash() — hash string + declared algorithm + cost. */
export interface HashResult {
  readonly hash: string;
  readonly algorithm: string;
  readonly rounds: number;
}

/** Output of compare() — boolean match result. */
export interface CompareResult {
  readonly matches: boolean;
}

export abstract class IPasswordHasherService {
  /** Hash a plaintext. Returns HashResult on success. */
  abstract hash(plaintext: string): Promise<DataProcessResult<HashResult>>;

  /**
   * Constant-time compare of `plaintext` against `hashed`.
   * matches=false is success (the answer is "no"), not failure.
   */
  abstract compare(plaintext: string, hashed: string): Promise<DataProcessResult<CompareResult>>;

  /**
   * Does this hash need to be re-hashed? True when the embedded cost is below
   * the provider's current rounds setting. Consumers call this on login success
   * to transparently upgrade old hashes.
   */
  abstract needsRehash(hashed: string): Promise<DataProcessResult<boolean>>;

  /** Check provider health (hash+compare round-trip). */
  abstract healthCheck(): Promise<DataProcessResult<boolean>>;
}

/** Injection token for IPasswordHasherService. */
export const PASSWORD_HASHER_SERVICE = Symbol('IPasswordHasherService');
