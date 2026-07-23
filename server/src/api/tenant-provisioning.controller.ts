/**
 * TenantProvisioningController — FLOW-47 Turn 5 (T661).
 *
 * POST /api/tenants/provision
 *   Body:    { name: string, plan: string, modules?: [{ packageId: string }], validate?: boolean }
 *   Returns: { tenantId, provisionId, status: 'PROVISIONED', installedModules: [...] }
 *
 * Chain (DNA-8 — write-then-act ordering):
 *   1. Create TenantRecord via TenantController.create()
 *   2. Provision via TenantProvisionerService.provisionTenant() (writes to xiigen-tenant-registry)
 *   3. For each module: install under tenant CLS context — chain through
 *      MarketplacePackageService.install() → DesignTimeSnapshotService.capture()
 *      → InstallValidationService.validate()
 *   4. Aggregate installedModules[] with snapshotId + validationStatus per module
 *
 * FLOW-47 adaptation from plan v1.4: the plan named the tenant-lifecycle variant
 * (TenantProvisionOrchestrator at flows/tenant-lifecycle/) but that writes to
 * flow30-tenant-provisions (flow-scoped index, wrong scope per the plan's own
 * recommendation against saas-multi-tenancy variant). We use the engine-level
 * TenantProvisionerService which writes to xiigen-tenant-registry — the
 * platform-scoped index appropriate for this controller.
 *
 * Idempotency: same tenant name → same flow. TenantProvisionerService.provisionTenant()
 * is itself idempotent on tenantId (DNA-8 storeDocument with tenantId as docId).
 */

import { Body, Controller, HttpCode, HttpStatus, Logger, Optional, Post } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { randomUUID } from 'crypto';
import { TenantController } from './tenant.controller';
import { CreateTenantInput } from '../kernel/multi-tenant/tenant-registry.service';
import { TenantProvisionerService } from '../engine/tenant-provisioner.service';
import {
  MarketplacePackageService,
  MarketplacePackage,
} from '../engine/marketplace-package.service';
import { DesignTimeSnapshotService } from '../engine/scope/design-time-snapshot.service';
import { InstallValidationService } from '../engine/scope/install-validation.service';
import { TENANT_CONTEXT_KEY, TenantContext } from '../kernel/multi-tenant/tenant-context';

interface ProvisionTenantBody {
  name: string;
  plan?: string;
  modules?: Array<{ packageId: string }>;
  /** Per plan Turn 5: validate=false skips runPortabilityTest. */
  validate?: boolean;
}

interface InstalledModuleResult {
  packageId: string;
  flowId: string;
  status: 'INSTALLED' | 'FAILED';
  snapshotId?: string;
  validationStatus?: 'PASSED' | 'DEGRADED' | 'ERROR';
  error?: string;
  errorCode?: string;
}

interface ProvisionResponse {
  tenantId: string;
  provisionId: string;
  status: 'PROVISIONED' | 'FAILED';
  installedModules: InstalledModuleResult[];
  error?: string;
  code?: string;
}

@Controller('api/tenants/provision')
export class TenantProvisioningController {
  private readonly logger = new Logger(TenantProvisioningController.name);

  constructor(
    private readonly tenant: TenantController,
    private readonly provisioner: TenantProvisionerService,
    private readonly marketplace: MarketplacePackageService,
    private readonly cls: ClsService,
    @Optional() private readonly designSnapshot?: DesignTimeSnapshotService,
    @Optional() private readonly installValidation?: InstallValidationService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async provision(@Body() body: ProvisionTenantBody): Promise<ProvisionResponse> {
    if (!body?.name) {
      return {
        tenantId: '',
        provisionId: '',
        status: 'FAILED',
        installedModules: [],
        error: 'name required',
        code: 'MISSING_NAME',
      };
    }

    const plan = body.plan ?? 'STANDARD';
    const validate = body.validate !== false; // default true per Turn 5
    const modules = body.modules ?? [];

    // Step 1: create the tenant record (idempotent on the registry side).
    // Use a deterministic tenantId from the supplied name so re-invocation
    // resumes from the prior step rather than creating a duplicate tenant.
    const tenantId = `tenant-${this.slugify(body.name)}`;
    const createInput: CreateTenantInput = {
      id: tenantId,
      name: body.name,
      plan: {
        name: plan,
        maxApiCallsPerMinute: 1000,
        maxTokensPerDay: 10_000_000,
        maxStorageMb: 10_000,
      },
      configOverrides: {},
      apiKeys: {},
    } as unknown as CreateTenantInput;

    const createResult = await this.tenant.create(createInput);
    if (!createResult.isSuccess) {
      // If the tenant already exists, idempotency: continue to provision step.
      const isAlreadyExists =
        createResult.errorCode === 'ALREADY_EXISTS' ||
        createResult.errorCode === 'CONFLICT' ||
        // TenantRegistry returns DUPLICATE_NAME / DUPLICATE_ID when the tenant
        // already exists — treat as success for idempotent re-invocation.
        createResult.errorCode === 'DUPLICATE_NAME' ||
        createResult.errorCode === 'DUPLICATE_ID';
      if (!isAlreadyExists) {
        return {
          tenantId,
          provisionId: '',
          status: 'FAILED',
          installedModules: [],
          error: createResult.errorMessage ?? 'create failed',
          code: createResult.errorCode ?? 'CREATE_FAILED',
        };
      }
    }

    // Step 2: provision (idempotent — writes to xiigen-tenant-registry by tenantId)
    const provisionResult = await this.provisioner.provisionTenant({
      tenantId,
      name: body.name,
      plan,
    });
    if (!provisionResult.isSuccess) {
      return {
        tenantId,
        provisionId: '',
        status: 'FAILED',
        installedModules: [],
        error: provisionResult.errorMessage ?? 'provision failed',
        code: provisionResult.errorCode ?? 'PROVISION_FAILED',
      };
    }
    const provisionId = randomUUID();

    // Step 3: install each module under tenant CLS context.
    const tenantContext = new TenantContext({
      id: tenantId,
      name: body.name,
      status: 'active',
      plan: {
        name: plan,
        maxApiCallsPerMinute: 1000,
        maxTokensPerDay: 10_000_000,
        maxStorageMb: 10_000,
      },
      configOverrides: {},
      apiKeys: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const installedModules: InstalledModuleResult[] = [];
    for (const mod of modules) {
      // runWith creates a fresh CLS scope with the new tenant as its only
      // populated key. Plain run() would inherit the caller's context and
      // silently preserve the wrong tenant value after the set().
      const installed = await this.cls.runWith(
        { [TENANT_CONTEXT_KEY]: tenantContext } as Record<string, unknown>,
        () => this.installModule(tenantId, mod.packageId, validate),
      );
      installedModules.push(installed);
    }

    this.logger.log(
      `FLOW-47 provision complete: tenant=${tenantId} modules=${installedModules.length} provisionId=${provisionId}`,
    );

    return {
      tenantId,
      provisionId,
      status: 'PROVISIONED',
      installedModules,
    };
  }

  /**
   * Install one module under the calling tenant's CLS context. Mirrors
   * the chain used by MarketplacePackageController.install():
   *   marketplace.install → design-snapshot capture → install-validation
   */
  private async installModule(
    tenantId: string,
    packageId: string,
    validate: boolean,
  ): Promise<InstalledModuleResult> {
    const installResult = await this.marketplace.install(packageId);
    if ('error' in installResult) {
      return {
        packageId,
        flowId: '',
        status: 'FAILED',
        error: installResult.error,
        errorCode: installResult.code,
      };
    }
    const record = installResult;

    let pkg: MarketplacePackage | null = null;
    let snapshotId: string | undefined;
    let validationStatus: 'PASSED' | 'DEGRADED' | 'ERROR' | undefined;

    if (this.designSnapshot) {
      pkg = await this.marketplace.getById(packageId);
      if (pkg) {
        const snapResult = await this.designSnapshot.capture({
          tenantId,
          packageId,
          packageVersion: pkg.sourceVersion,
          flowId: pkg.sourceFlowId,
          patternIds: pkg.designBundleRefs?.patternIds ?? [],
          ironRules: pkg.designBundleRefs?.ironRules ?? [],
          arbiterConfigIds: pkg.designBundleRefs?.arbiterConfigIds ?? [],
        });
        if (snapResult.isSuccess && snapResult.data) {
          snapshotId = snapResult.data.snapshotId;
        }
      }
    }

    if (validate && this.installValidation) {
      const validationResult = await this.installValidation.validate({
        tenantId,
        packageId,
        flowId: record.flowId,
        snapshotId,
      });
      if (validationResult.isSuccess && validationResult.data) {
        validationStatus = validationResult.data.status;
      } else {
        validationStatus = 'ERROR';
      }
    }

    return {
      packageId,
      flowId: record.flowId,
      status: 'INSTALLED',
      snapshotId,
      validationStatus,
    };
  }

  /** Convert "Acme Corp" → "acme-corp" for stable tenantId derivation. */
  private slugify(input: string): string {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
