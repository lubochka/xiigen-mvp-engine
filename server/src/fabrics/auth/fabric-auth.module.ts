/**
 * AuthFabricModule — Nest @Global module for the Auth Fabric.
 *
 * FLOW-01 Phase A0.5 — closes AM-9 (Rule 1 Fabric First).
 *
 * Luba decisions baked in (2026-04-24):
 *   #1 Per-tenant JWT signing keys via ISecretsService — cross-tenant isolation
 *      becomes a STRUCTURAL guarantee (wrong key → signature mismatch).
 *   #2 bcryptjs (not native bcrypt) — no node-gyp dependency.
 *   #3 JWT TTL 3600s default.
 *
 * Dual-injection pattern (mirrors fabrics.module.ts):
 *   - Symbol tokens (TOKEN_SERVICE, PASSWORD_HASHER_SERVICE) for fabric-first consumers.
 *   - Class references (JwtTokenProvider, BcryptPasswordHasherProvider) for tests
 *     and internal factory wiring.
 *
 * @Inject(SECRETS_SERVICE) inside JwtTokenProvider resolves via the global scope
 * established by FabricsModule (which binds SECRETS_SERVICE).
 */

import { Module, Global } from '@nestjs/common';

import { TOKEN_SERVICE, PASSWORD_HASHER_SERVICE } from '../interfaces';
import { JwtTokenProvider } from './jwt-token.provider';
import { BcryptPasswordHasherProvider } from './bcrypt-password-hasher.provider';
import { TokenServiceFactory } from './token-service.factory';
import { PasswordHasherServiceFactory } from './password-hasher-service.factory';

@Global()
@Module({
  providers: [
    JwtTokenProvider,
    BcryptPasswordHasherProvider,
    { provide: TOKEN_SERVICE, useExisting: JwtTokenProvider },
    { provide: PASSWORD_HASHER_SERVICE, useExisting: BcryptPasswordHasherProvider },
    TokenServiceFactory,
    PasswordHasherServiceFactory,
  ],
  exports: [
    TOKEN_SERVICE,
    PASSWORD_HASHER_SERVICE,
    JwtTokenProvider,
    BcryptPasswordHasherProvider,
    TokenServiceFactory,
    PasswordHasherServiceFactory,
  ],
})
export class AuthFabricModule {}
