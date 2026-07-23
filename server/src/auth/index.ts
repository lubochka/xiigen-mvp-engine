/**
 * Auth module — FLOW-01 Phase A1 (base) + A2 (UserRolesService) + A2.5
 * (ScopeEnrichmentInterceptor) + A3 (MasterTenantGuard) + A4
 * (GlobalJwtAuthGuard + @Public()).
 *
 * Barrel exports for the platform auth foundation. Closes AM-9's consumer
 * side (AuthFabricModule/A0.5 closed the provider side).
 */

export { AuthModule } from './auth.module';
export { AuthService, USERS_INDEX } from './auth.service';
export { AuthController } from './auth.controller';
export { LocalAuthStrategy } from './local.strategy';
export { JwtAuthStrategy, extractBearerToken, BEARER_PREFIX } from './jwt.strategy';
export {
  UserRolesService,
  PLATFORM_ROLES_INDEX,
  normaliseRoles,
  mergeRoles,
} from './user-roles.service';
export {
  ScopeEnrichmentInterceptor,
  buildScopeFromPrincipal,
  CORRELATION_ID_HEADER,
} from './scope-enrichment.interceptor';
export {
  MasterTenantGuard,
  MasterTenantOnly,
  MASTER_TENANT_ONLY_KEY,
  isMasterTenant,
} from './master-tenant.guard';
export { Public, IS_PUBLIC_KEY } from './public.decorator';
export { GlobalJwtAuthGuard } from './jwt-auth.guard';
export { Roles, ROLES_KEY } from './roles.decorator';
export { RolesGuard } from './roles.guard';
export type {
  LoginRequestDto,
  LoginResponseDto,
  RefreshRequestDto,
  AuthenticatedUser,
  JwtVerifiedPrincipal,
} from './auth.dto';
