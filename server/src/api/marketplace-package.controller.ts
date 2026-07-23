/**
 * MarketplacePackageController — publish/browse/install flows via the sharable-flows marketplace.
 *
 * Introduced by Track 0 Turn 12. Refactored by FLOW-47 Turn 2 to delegate all
 * business logic to MarketplacePackageService; the controller is now a thin HTTP
 * wrapper. Auto-publish on boot (EngineBootstrapper) calls the service directly.
 *
 * Three routes:
 *   POST   /api/marketplace/packages          — publish a flow as a marketplace package
 *   GET    /api/marketplace/packages          — browse published packages (tenant-visible)
 *   POST   /api/marketplace/packages/:packageId/install
 *                                             — install a package for the calling tenant (linked mode)
 *
 * FLOW-47 Turn 3 hook (AF-T659): after install() succeeds, controller writes a
 *   DesignTimeSnapshot via DesignTimeSnapshotService.
 * FLOW-47 Turn 4 hook (AF-T660): then runs InstallValidationService and records
 *   the PortabilityReport.
 *
 * Iron rules (unchanged):
 *   IR-MKT-1: Published packages carry connectionType: FLOW_SCOPED.
 *   IR-MKT-2: Install is linked-mode (DD-324) — no topology copy.
 *   IR-MKT-3: Publish requires source status='PUBLISHED'. GLOBAL source is allowed
 *             iff caller is MASTER_TENANT_ID (FLOW-47 AD-4).
 */

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Optional,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { GlobalJwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { TENANT_CONTEXT_KEY, TenantContext } from '../kernel/multi-tenant/tenant-context';
import { ModuleRegistrationRecord } from '../engine/tenant-module-registry.service';
import {
  MarketplacePackage,
  MarketplacePackageService,
  MARKETPLACE_PACKAGES_INDEX,
} from '../engine/marketplace-package.service';
import { DesignTimeSnapshotService } from '../engine/scope/design-time-snapshot.service';
import { InstallValidationService } from '../engine/scope/install-validation.service';
import { ForkFlowHandlerService } from '../engine/flows/module-lifecycle/fork-flow.handler';

// Re-export the index constant so existing imports from the controller still work.
export { MARKETPLACE_PACKAGES_INDEX };
export type { MarketplacePackage };

interface PublishBody {
  flowId: string;
  title: string;
  description?: string;
  tags?: string[];
}

interface InstallResponse extends ModuleRegistrationRecord {
  snapshotId?: string;
  validationStatus?: 'PASSED' | 'DEGRADED' | 'ERROR';
}

const MARKETPLACE_VIEW_ROLES = [
  'public-marketplace-visitor',
  'tenant-user',
  'referral-user',
  'freelancer',
  'business-partner',
  'event-organiser',
  'tenant-admin',
  'platform-admin',
];

const MARKETPLACE_ADMIN_ROLES = ['tenant-admin', 'platform-admin'];

@UseGuards(GlobalJwtAuthGuard, RolesGuard)
@Controller('api/marketplace/packages')
export class MarketplacePackageController {
  private readonly logger = new Logger(MarketplacePackageController.name);

  constructor(
    private readonly marketplace: MarketplacePackageService,
    private readonly cls: ClsService,
    // FLOW-47 Turn 3+4: @Optional() so existing test constructions still compile.
    @Optional() private readonly designSnapshot?: DesignTimeSnapshotService,
    @Optional() private readonly installValidation?: InstallValidationService,
    // FORK-FLOW-ENGINE-PLAN-v1.1 Phase 3: @Optional() so existing tests that
    // new up the controller without ForkFlowModule wired continue to compile.
    @Optional() private readonly forkFlowHandler?: ForkFlowHandlerService,
  ) {}

  @Post()
  @Roles(...MARKETPLACE_ADMIN_ROLES)
  @HttpCode(HttpStatus.OK)
  async publish(@Body() body: PublishBody) {
    return this.marketplace.publish(body);
  }

  @Get()
  @Roles(...MARKETPLACE_VIEW_ROLES)
  @HttpCode(HttpStatus.OK)
  async browse(
    @Query('tag') tag?: string,
  ): Promise<{ packages: MarketplacePackage[] } | { error: string; code: string }> {
    const packages = await this.marketplace.browse(tag);
    return { packages };
  }

  @Post(':packageId/install')
  @Roles(...MARKETPLACE_ADMIN_ROLES)
  @HttpCode(HttpStatus.OK)
  async install(
    @Param('packageId') packageId: string,
  ): Promise<InstallResponse | { error: string; code: string }> {
    const tenantId = this.cls.get<TenantContext>(TENANT_CONTEXT_KEY)?.tenantId;
    if (!tenantId) return { error: 'Tenant context required', code: 'NO_TENANT' };

    const installResult = await this.marketplace.install(packageId);
    if ('error' in installResult) return installResult;

    const record = installResult;
    const response: InstallResponse = { ...record };

    // Fetch the package so Turn 3 can pin patternIds + ironRules.
    const pkg = await this.marketplace.getById(packageId);
    if (!pkg) {
      // Install succeeded but package lookup failed — return the registration
      // record without snapshot/validation; admin can re-trigger via
      // /api/tenants/provision if needed.
      return response;
    }

    // FLOW-47 Turn 3 (CF-834): DesignTimeSnapshot written BEFORE response.
    if (this.designSnapshot) {
      try {
        const snapshotResult = await this.designSnapshot.capture({
          tenantId,
          packageId,
          packageVersion: pkg.sourceVersion,
          flowId: pkg.sourceFlowId,
          patternIds: pkg.designBundleRefs?.patternIds ?? [],
          ironRules: pkg.designBundleRefs?.ironRules ?? [],
          arbiterConfigIds: pkg.designBundleRefs?.arbiterConfigIds ?? [],
        });
        if (snapshotResult.isSuccess && snapshotResult.data) {
          response.snapshotId = snapshotResult.data.snapshotId;
        } else {
          // Snapshot failure is install-blocking per plan (CF-834 / Turn 3 test).
          return {
            error: snapshotResult.errorMessage ?? 'snapshot capture failed',
            code: snapshotResult.errorCode ?? 'SNAPSHOT_FAILED',
          };
        }
      } catch (err) {
        return {
          error: `snapshot exception: ${(err as Error).message}`,
          code: 'SNAPSHOT_EXCEPTION',
        };
      }
    }

    // FLOW-47 Turn 4 (CF-835): InstallValidation runs after snapshot.
    // DEGRADED does not block; ERROR does.
    if (this.installValidation) {
      try {
        const validationResult = await this.installValidation.validate({
          tenantId,
          packageId,
          flowId: pkg.sourceFlowId,
          snapshotId: response.snapshotId,
        });
        if (!validationResult.isSuccess) {
          // Service-level ERROR — install blocked.
          return {
            error: validationResult.errorMessage ?? 'validation failed',
            code: validationResult.errorCode ?? 'VALIDATION_ERROR',
          };
        }
        response.validationStatus = validationResult.data!.status;
      } catch (err) {
        return {
          error: `validation exception: ${(err as Error).message}`,
          code: 'VALIDATION_EXCEPTION',
        };
      }
    }

    this.logger.debug(
      `FLOW-47 install complete: tenant=${tenantId} packageId=${packageId} ` +
        `snapshotId=${response.snapshotId ?? '-'} validationStatus=${response.validationStatus ?? '-'}`,
    );
    return response;
  }

  /**
   * FORK-FLOW-ENGINE-PLAN-v1.1 Phase 3 — marketplace fork trigger.
   *
   * POST /api/marketplace/packages/:flowSlug/fork
   *
   * Thin HTTP wrapper over ForkFlowHandlerService. The handler extends
   * MicroserviceBase and owns all DNA-3/5/8/9 enforcement; this controller
   * method ONLY forwards the call with tenantId sourced from CLS (DNA-5 —
   * never from the request body).
   *
   * Body (Record<string, unknown>):
   *   flowId: string               — e.g. 'FLOW-01'
   *   targetGitHubUsername: string — tenant's GitHub username or org
   *   initialVersion?: string      — defaults to '1.0.0'
   *
   * Note: tenantId is NOT in the body. Controller resolves it from CLS;
   * handler re-reads it from CLS. Sneaking tenantId in body is ignored.
   */
  @Post(':flowSlug/fork')
  @Roles(...MARKETPLACE_ADMIN_ROLES)
  @HttpCode(HttpStatus.ACCEPTED)
  async fork(
    @Param('flowSlug') flowSlug: string,
    @Body() body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    if (!this.forkFlowHandler) {
      return {
        error: 'ForkFlowModule not wired into this deployment',
        code: 'FORK_HANDLER_UNAVAILABLE',
      };
    }

    const tenantId = this.cls.get<TenantContext>(TENANT_CONTEXT_KEY)?.tenantId;
    if (!tenantId) {
      return { error: 'Tenant context required', code: 'NO_TENANT' };
    }

    const flowId = body['flowId'] as string | undefined;
    const targetGitHubUsername =
      (body['targetGitHubUsername'] as string | undefined) ??
      (body['targetOrgName'] as string | undefined);
    if (!flowId || !targetGitHubUsername) {
      return {
        error: 'flowId and targetGitHubUsername required',
        code: 'VALIDATION_FAILURE',
      };
    }

    const result = await this.forkFlowHandler.execute({
      flowSlug,
      flowId,
      targetOrgName: targetGitHubUsername, // handler accepts either org or personal username
      initialVersion: body['initialVersion'] as string | undefined,
      repoNameOverride: body['repoNameOverride'] as string | undefined,
      sourceRepoFullName: body['sourceRepoFullName'] as string | undefined,
    });

    if (!result.isSuccess) {
      return {
        error: result.errorMessage ?? 'fork failed',
        code: result.errorCode ?? 'FORK_FAILED',
      };
    }
    return result.data ?? {};
  }
}
