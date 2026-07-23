/**
 * Auth Fabric — barrel exports.
 *
 * External consumers should prefer the @Inject(TOKEN_SERVICE) /
 * @Inject(PASSWORD_HASHER_SERVICE) pattern via interfaces/index.ts.
 * This barrel is for tests and direct class-based wiring.
 */

export { AuthFabricModule } from './fabric-auth.module';
export { JwtTokenProvider } from './jwt-token.provider';
export { BcryptPasswordHasherProvider } from './bcrypt-password-hasher.provider';
export { TokenServiceFactory } from './token-service.factory';
export { PasswordHasherServiceFactory } from './password-hasher-service.factory';
export {
  SignAlg,
  SigningKeyPayload,
  DEFAULT_TOKEN_TTL_SECONDS,
  SIGNING_KEY_CACHE_TTL_MS,
  signingKeySecretPath,
  BCRYPT_ROUNDS,
  BCRYPT_HASH_PATTERN,
} from './base';
