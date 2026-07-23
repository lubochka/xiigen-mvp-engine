/**
 * AuthModule — FLOW-01 Phase A1 (base) + A2 (UserRolesService) + A2.5
 * (ScopeEnrichmentInterceptor) + A3 (MasterTenantGuard) + A4
 * (GlobalJwtAuthGuard + @Public() — ready for future global wiring).
 *
 * Wires:
 *   - AuthService                  (extends MicroserviceBase — V-02 Grep)
 *   - AuthController               (3 routes under /api/auth)
 *   - LocalAuthStrategy            (passport-local)
 *   - JwtAuthStrategy              (custom strategy delegating to ITokenService.verify;
 *                                   A4: also writes ScopeContext to CLS on success)
 *   - UserRolesService             (A2 — resolveRolesForUser + attachPlatformRoles; V-03)
 *   - ScopeEnrichmentInterceptor   (A2.5 — JWT principal → ScopeContext in CLS; V-04)
 *   - MasterTenantGuard            (A3  — @MasterTenantOnly() enforcement; V-05)
 *   - GlobalJwtAuthGuard           (A4  — AuthGuard('jwt') + @Public() opt-out; V-06)
 *
 * AuthFabricModule (A0.5) is @Global inside FabricsModule, so TOKEN_SERVICE +
 * PASSWORD_HASHER_SERVICE + DATABASE_SERVICE are already available in DI —
 * no explicit import needed.
 *
 * PassportModule.register() is idempotent — if a future phase registers it
 * again in another module, Nest's DI graph handles it cleanly.
 *
 * APP_GUARD / APP_INTERCEPTOR registration for MasterTenantGuard +
 * ScopeEnrichmentInterceptor lives in AppModule (Phase A4 / V-06).
 * GlobalJwtAuthGuard is registered as a provider here but NOT yet
 * registered as an APP_GUARD — flipping "authenticated by default" is a
 * dedicated later phase that requires a full @Public() sweep across all
 * pre-A4 controllers.
 */

import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LocalAuthStrategy } from './local.strategy';
import { JwtAuthStrategy } from './jwt.strategy';
import { UserRolesService } from './user-roles.service';
import { ScopeEnrichmentInterceptor } from './scope-enrichment.interceptor';
import { MasterTenantGuard } from './master-tenant.guard';
import { GlobalJwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [
    AuthService,
    LocalAuthStrategy,
    JwtAuthStrategy,
    UserRolesService,
    ScopeEnrichmentInterceptor,
    MasterTenantGuard,
    GlobalJwtAuthGuard,
    RolesGuard,
  ],
  controllers: [AuthController],
  exports: [
    AuthService,
    UserRolesService,
    ScopeEnrichmentInterceptor,
    MasterTenantGuard,
    GlobalJwtAuthGuard,
    RolesGuard,
    PassportModule,
  ],
})
export class AuthModule {}
