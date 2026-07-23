/**
 * BcryptPasswordHasherProvider — IPasswordHasherService concrete using bcryptjs.
 *
 * Rounds=12 (Auth Plan v3.0 line 355). bcryptjs per Luba decision #2 (2026-04-24)
 * — pure JS, no native build. Accepts $2a$/$2b$/$2y$ prefixes.
 *
 * Iron Rules:
 *   - Never log plaintext or hashes.
 *   - `compare()` with matches=false is SUCCESS (valid "no"), not failure.
 *   - Only return failure on malformed input or lib throw.
 */

import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { DataProcessResult } from '../../kernel/data-process-result';
import {
  IPasswordHasherService,
  HashResult,
  CompareResult,
} from '../interfaces/password-hasher.service.interface';
import { BCRYPT_ROUNDS, BCRYPT_HASH_PATTERN } from './base';

@Injectable()
export class BcryptPasswordHasherProvider extends IPasswordHasherService {
  async hash(plaintext: string): Promise<DataProcessResult<HashResult>> {
    if (typeof plaintext !== 'string' || plaintext.length === 0) {
      return DataProcessResult.failure('INVALID_PLAINTEXT', 'plaintext cannot be empty');
    }

    try {
      const hashed = await bcrypt.hash(plaintext, BCRYPT_ROUNDS);
      return DataProcessResult.success({
        hash: hashed,
        algorithm: 'bcrypt',
        rounds: BCRYPT_ROUNDS,
      });
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      return DataProcessResult.error('HASH_FAILED', err.message, err);
    }
  }

  async compare(plaintext: string, hashed: string): Promise<DataProcessResult<CompareResult>> {
    if (typeof plaintext !== 'string') {
      return DataProcessResult.failure('INVALID_PLAINTEXT', 'plaintext must be a string');
    }
    if (typeof hashed !== 'string' || !BCRYPT_HASH_PATTERN.test(hashed)) {
      return DataProcessResult.failure('HASH_MALFORMED', 'hash must be a bcrypt hash string');
    }

    try {
      const matches = await bcrypt.compare(plaintext, hashed);
      return DataProcessResult.success({ matches });
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      return DataProcessResult.error('COMPARE_FAILED', err.message, err);
    }
  }

  async needsRehash(hashed: string): Promise<DataProcessResult<boolean>> {
    if (typeof hashed !== 'string') {
      return DataProcessResult.failure('HASH_MALFORMED', 'hash must be a string');
    }

    const match = BCRYPT_HASH_PATTERN.exec(hashed);
    if (!match || !match[1]) {
      return DataProcessResult.failure('HASH_MALFORMED', 'hash is not a bcrypt hash');
    }

    const rounds = parseInt(match[1], 10);
    if (Number.isNaN(rounds)) {
      return DataProcessResult.failure('HASH_MALFORMED', 'hash cost parameter is not a number');
    }

    return DataProcessResult.success(rounds < BCRYPT_ROUNDS);
  }

  async healthCheck(): Promise<DataProcessResult<boolean>> {
    try {
      const hashed = await bcrypt.hash('__health__', BCRYPT_ROUNDS);
      const matches = await bcrypt.compare('__health__', hashed);
      return DataProcessResult.success(matches);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      return DataProcessResult.error('HEALTH_CHECK_FAILED', err.message, err);
    }
  }
}
