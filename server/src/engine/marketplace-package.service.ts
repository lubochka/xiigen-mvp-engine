/**
 * MarketplacePackageService — shared business logic for the marketplace.
 *
 * Introduced by FLOW-47 Turn 2 (T658). The HTTP controller
 * (MarketplacePackageController) delegates to this service; the EngineBootstrapper
 * calls it directly to auto-publish GLOBAL templates at boot time under
 * MASTER_TENANT_ID CLS context.
 *
 * FLOW-47 changes over MVP Plan v3 Turn 12:
 *   (a) publish() gate relaxed — GLOBAL source accepted iff caller is MASTER_TENANT_ID (AD-4).
 *   (b) published package now carries designBundleRefs: {
 *         patternIds[],           // from xiigen-rag-patterns query by sourceFlowId
 *         ironRules[],            // embedded inline (CF-833 — offline enforcement)
 *         arbiterConfigIds[],     // from xiigen-arbiter-configs query (Turn 8 addition)
 *       }
 *
 * DNA-5: tenantId from CLS, never a parameter.
 * DNA-8: package record stored before return.
 */

import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ClsService } from 'nestjs-cls';
import { DATABASE_SERVICE, IDatabaseService } from '../fabrics/interfaces/database.interface';
import { TENANT_CONTEXT_KEY, TenantContext } from '../kernel/multi-tenant/tenant-context';
import { TenantTopology, TenantTopologyStore } from './tenant-topology-store';
import { ModuleRegistrationRecord, TenantModuleRegistry } from './tenant-module-registry.service';
import { CONNECTION_TYPES } from '../rag-init/connection-types';
import { MASTER_TENANT_ID } from '../bootstrap/bootstrap-seeder.service';

export const MARKETPLACE_PACKAGES_INDEX = 'xiigen-marketplace-packages';

/**
 * FLOW-47 Turn 2 (AD-2) — iron rules are embedded inline in the package so
 * they can be enforced offline, without a network round-trip to the authoring
 * tenant's rule store. CF-833.
 */
export interface IronRule {
  ruleId: string;
  text: string;
  flowId: string;
}

/**
 * FLOW-47 Turn 2 (AD-2) — design bundle references carried by every
 * published marketplace package. Snapshot-time values: installers pin these
 * via DesignTimeSnapshot so the tenant's installed view does not drift when
 * the author updates the source flow's corpus.
 */
export interface DesignBundleRefs {
  patternIds: string[];
  ironRules: IronRule[];
  arbiterConfigIds: string[];
}

/**
 * GAP-16a (Fix Plan v4.9, schema extension Step 0) — codeBundle carries the
 * actual TypeScript service files alongside the knowledge bundle. Req-2
 * (forking with code) is blocked for any flow without this on the package.
 *
 * Optional for backwards compatibility; Stage A pilot flows (FLOW-08 / FLOW-10
 * / FLOW-16) populate it first, other flows follow.
 *
 * FLOW-41..44 (EXTERNAL_REPO, H-5=CON) are EXEMPT — their code ships via the
 * adapter's own package.json, not via this field.
 */
export interface CodeBundle {
  format: 'npm-package' | 'zip';
  registry?: string;
  packageName: string;
  version: string;
  serviceFiles: Array<{
    connectionType: 'FLOW_SCOPED';
    flowId: string;
    relativePath: string;
    className: string;
  }>;
  entryPoints: string[];
  /**
   * GAP-25 / A78 Phase-1 blocker — documentation files that MUST travel with
   * the package so a third-tenant install can run the AI Adaptation Protocol
   * Phase 1 (read STEP-1-INVARIANTS + functional spec) without access to the
   * original monorepo. See TenantForkProvisionerService for resolution logic.
   */
  documentationFiles?: Array<{
    /** Path within the published package (e.g. 'docs/STEP-1-INVARIANTS.md'). */
    relativePath: string;
    /** Semantic role for the document. */
    kind: 'step-1-invariants' | 'functional-spec' | 'stubs-guide' | 'readme' | 'changelog';
    /** Source path in the monorepo that the provisioner reads from. */
    sourcePath: string;
  }>;
}

export interface MarketplacePackage {
  packageId: string;
  publisherTenantId: string;
  publishedAt: string;
  title: string;
  description?: string;
  sourceFlowId: string;
  sourceVersion: string;
  topology: Pick<TenantTopology, 'nodes' | 'edges' | 'metadata' | 'clientArchitecture'>;
  connectionType: typeof CONNECTION_TYPES.FLOW_SCOPED;
  tags: string[];
  // FLOW-47 Turn 2 (AD-2) — refs + iron rules embedded inline.
  designBundleRefs: DesignBundleRefs;
  /** GAP-16a — optional code bundle alongside the knowledge bundle. See CodeBundle doc. */
  codeBundle?: CodeBundle;
}

export interface PublishInput {
  flowId: string;
  title: string;
  description?: string;
  tags?: string[];
  /**
   * FLOW-47 Defect-7 — when true, publish() returns an EMPTY_DESIGN_BUNDLE
   * error instead of writing a package whose designBundleRefs would be
   * completely empty. autoPublishGlobalTemplates sets this so system / bootstrap
   * flows that lack pattern / arbiter / iron-rule data (PREREQ, bundle-activation)
   * are skipped rather than writing useless installable packages.
   */
  requireDesignBundle?: boolean;
}

export type PublishResult = MarketplacePackage | { error: string; code: string };
export type InstallResult = ModuleRegistrationRecord | { error: string; code: string };

@Injectable()
export class MarketplacePackageService {
  private readonly logger = new Logger(MarketplacePackageService.name);

  constructor(
    private readonly store: TenantTopologyStore,
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    private readonly cls: ClsService,
    private readonly moduleRegistry: TenantModuleRegistry,
  ) {}

  /**
   * Publish a flow as a marketplace package.
   *
   * Gate (FLOW-47 AD-4): accepts PRIVATE from any tenant OR GLOBAL from MASTER_TENANT_ID.
   * Status gate unchanged: source flow must be status='PUBLISHED'.
   */
  async publish(input: PublishInput): Promise<PublishResult> {
    if (!input?.flowId || !input?.title) {
      return { error: 'flowId and title required', code: 'MISSING_FIELDS' };
    }
    const tenantId = this.cls.get<TenantContext>(TENANT_CONTEXT_KEY)?.tenantId;
    if (!tenantId) return { error: 'Tenant context required', code: 'NO_TENANT' };

    // Load source — flow can be tenant-PRIVATE or GLOBAL platform template.
    // First try tenant-scoped lookup (PRIVATE flows), then fall back to GLOBAL
    // template lookup for MASTER_TENANT auto-publish.
    let source: TenantTopology | null = null;
    const tenantResult = await this.store.getById(input.flowId);
    if (tenantResult.isSuccess && tenantResult.data) {
      source = tenantResult.data;
    } else {
      // FLOW-47 Turn 2 — GLOBAL template path. Query xiigen-flow-templates by flowId.
      const globalResult = await this.db.searchDocuments(
        'xiigen-flow-templates',
        { flowId: input.flowId, knowledgeScope: 'GLOBAL' },
        1,
      );
      if (globalResult.isSuccess && globalResult.data && globalResult.data.length > 0) {
        source = globalResult.data[0] as unknown as TenantTopology;
      }
    }

    if (!source) {
      return { error: `Flow not found: ${input.flowId}`, code: 'FLOW_NOT_FOUND' };
    }

    // FLOW-47 AD-4 gate — relaxed: GLOBAL source allowed iff MASTER_TENANT_ID caller.
    if (source.knowledgeScope === 'GLOBAL') {
      if (tenantId !== MASTER_TENANT_ID) {
        return {
          error: 'Only MASTER_TENANT_ID may publish GLOBAL templates',
          code: 'NOT_PUBLISHABLE',
        };
      }
    } else if (source.knowledgeScope !== 'PRIVATE') {
      return {
        error: 'Only PRIVATE flows (or MASTER GLOBAL) can be published',
        code: 'NOT_PUBLISHABLE',
      };
    }

    if (source.status !== 'PUBLISHED') {
      return {
        error: `Source flow must be PUBLISHED (found: ${source.status})`,
        code: 'NOT_PUBLISHED',
      };
    }

    // FLOW-47 Turn 2 — assemble designBundleRefs from ES.
    const designBundleRefs = await this.assembleDesignBundleRefs(source);

    // FLOW-47 Defect-7: guard against publishing knowledge-less packages when
    // the caller opts into the guard. A published package MUST carry all three
    // design-bundle artifact families so downstream installs have complete
    // scaffolding: patternIds (rag-patterns), arbiterConfigIds (arbiter rules),
    // AND ironRules (BFA decision-graph rules). Missing ANY one leaves the
    // install incomplete — surface it as NOT_PUBLISHABLE at bootstrap time
    // rather than shipping a half-assembled bundle that breaks install-time
    // expectations and per-package design-bundle assertions.
    if (input.requireDesignBundle) {
      const missing: string[] = [];
      if (designBundleRefs.patternIds.length === 0) missing.push('patternIds');
      if (designBundleRefs.arbiterConfigIds.length === 0) missing.push('arbiterConfigIds');
      if (designBundleRefs.ironRules.length === 0) missing.push('ironRules');
      if (missing.length > 0) {
        return {
          error: `Incomplete design bundle for flow ${source.flowId} — missing: ${missing.join(', ')}`,
          code: 'EMPTY_DESIGN_BUNDLE',
        };
      }
    }

    const pkg: MarketplacePackage = {
      packageId: `PKG-${randomUUID().slice(0, 8).toUpperCase()}`,
      publisherTenantId: tenantId,
      publishedAt: new Date().toISOString(),
      title: input.title,
      description: input.description,
      sourceFlowId: source.flowId,
      sourceVersion: source.version,
      topology: {
        nodes: source.nodes,
        edges: source.edges,
        metadata: { ...source.metadata, publishedFrom: source.flowId },
        clientArchitecture: source.clientArchitecture,
      },
      connectionType: CONNECTION_TYPES.FLOW_SCOPED,
      tags: input.tags ?? [],
      designBundleRefs,
    };

    const writeResult = await this.db.storeDocument(
      MARKETPLACE_PACKAGES_INDEX,
      pkg as unknown as Record<string, unknown>,
      pkg.packageId,
    );
    if (!writeResult.isSuccess) {
      return {
        error: writeResult.errorMessage ?? 'publish failed',
        code: writeResult.errorCode ?? 'PUBLISH_FAILED',
      };
    }
    return pkg;
  }

  /**
   * Flow-scoped design artifacts may be seeded under three distinct identifiers:
   *   1. source.flowId                           — literal package flowId
   *   2. metadata.originalFlowId                 — set by seedGlobalTopologies
   *                                                  for composite FLOW-NN-<slug>
   *   3. metadata.canonicalFlowId                — set by canonical backfill
   *                                                  for raw-slug packages
   *                                                  (FLOW-47 Defect-6)
   * All three must be queried so packages with either identifier resolve to
   * the same underlying rag-patterns / arbiter-configs / decision-graph
   * records.
   */
  private collectFlowIdQueryKeys(source: TenantTopology): string[] {
    const keys = [source.flowId];
    const originalFlowId = source.metadata?.['originalFlowId'] as string | undefined;
    const canonicalFlowId = source.metadata?.['canonicalFlowId'] as string | undefined;
    if (originalFlowId && !keys.includes(originalFlowId)) keys.push(originalFlowId);
    if (canonicalFlowId && !keys.includes(canonicalFlowId)) keys.push(canonicalFlowId);
    return keys;
  }

  /**
   * Assemble designBundleRefs from xiigen-rag-patterns (patternIds) +
   * xiigen-arbiter-configs (arbiterConfigIds) + source flow metadata (iron rules).
   * Queries scoped by the flow's identifier chain (sourceFlowId, originalFlowId,
   * canonicalFlowId) so only that flow's design artifacts travel.
   */
  private async assembleDesignBundleRefs(source: TenantTopology): Promise<DesignBundleRefs> {
    const flowIdsToQuery = this.collectFlowIdQueryKeys(source);

    // Query xiigen-rag-patterns for records belonging to this flow
    const patternIds: string[] = [];
    for (const flowId of flowIdsToQuery) {
      try {
        const result = await this.db.searchDocuments(
          'xiigen-rag-patterns',
          { flowId },
          500,
        );
        if (result.isSuccess && result.data) {
          for (const record of result.data as Array<Record<string, unknown>>) {
            const pid = record['patternId'] as string | undefined;
            if (pid && !patternIds.includes(pid)) patternIds.push(pid);
          }
        }
      } catch {
        /* swallow — empty patternIds is acceptable fallback */
      }
    }

    // FLOW-47 Turn 8 — arbiterConfigIds from xiigen-arbiter-configs.
    // FLOW-47 Defect-4: topologies cloned from canonical flows carry composite
    // flowId (e.g. "FLOW-03-event-management") while arbiters live under the
    // canonical "FLOW-03". FLOW-47 Defect-6: raw-slug packages additionally
    // need canonicalFlowId (e.g. "marketplace" → "FLOW-08").
    const arbiterConfigIds: string[] = [];
    for (const flowId of flowIdsToQuery) {
      try {
        const arbiterResult = await this.db.searchDocuments(
          'xiigen-arbiter-configs',
          { flowId },
          500,
        );
        if (arbiterResult.isSuccess && arbiterResult.data) {
          for (const record of arbiterResult.data as Array<Record<string, unknown>>) {
            const aid = record['arbiterId'] as string | undefined;
            if (aid && !arbiterConfigIds.includes(aid)) arbiterConfigIds.push(aid);
          }
        }
      } catch {
        /* swallow */
      }
    }

    // Iron rules — CF-833 requires inline embedding, never a ref. Source order
    // of precedence:
    //   1. source.metadata['ironRules']     — explicit per-topology override
    //   2. xiigen-decision-graph by flowId  — BFA rules seeded at bootstrap
    //      (rule record shape: { ruleId, flowId, description, ... })
    // This is the FLOW-47 Defect-3 fix: topology metadata never carried
    // ironRules, so step 2 is the actual working source.
    const ironRules: IronRule[] = [];
    const seenRuleIds = new Set<string>();

    const metaRules = source.metadata?.['ironRules'];
    if (Array.isArray(metaRules)) {
      for (const r of metaRules as Array<Record<string, unknown>>) {
        const ruleId = r['ruleId'] as string | undefined;
        const text = r['text'] as string | undefined;
        const flowId = (r['flowId'] as string | undefined) ?? source.flowId;
        if (ruleId && text && !seenRuleIds.has(ruleId)) {
          ironRules.push({ ruleId, text, flowId });
          seenRuleIds.add(ruleId);
        }
      }
    }

    for (const flowId of flowIdsToQuery) {
      try {
        const bfaResult = await this.db.searchDocuments(
          'xiigen-decision-graph',
          { flowId },
          500,
        );
        if (bfaResult.isSuccess && bfaResult.data) {
          for (const record of bfaResult.data as Array<Record<string, unknown>>) {
            const ruleId = record['ruleId'] as string | undefined;
            const text =
              (record['description'] as string | undefined) ??
              (record['text'] as string | undefined);
            const ruleFlowId = (record['flowId'] as string | undefined) ?? flowId;
            if (ruleId && text && !seenRuleIds.has(ruleId)) {
              ironRules.push({ ruleId, text, flowId: ruleFlowId });
              seenRuleIds.add(ruleId);
            }
          }
        }
      } catch {
        /* swallow — empty ironRules acceptable fallback */
      }
    }

    return { patternIds, ironRules, arbiterConfigIds };
  }

  /**
   * Browse published packages.
   */
  async browse(tag?: string): Promise<MarketplacePackage[]> {
    const searchResult = await this.db.searchDocuments(MARKETPLACE_PACKAGES_INDEX, {}, 200);
    if (!searchResult.isSuccess) return [];
    let packages = (searchResult.data ?? []) as unknown as MarketplacePackage[];
    if (tag) packages = packages.filter((p) => (p.tags ?? []).includes(tag));
    return packages;
  }

  /**
   * Get a single package by ID.
   */
  async getById(packageId: string): Promise<MarketplacePackage | null> {
    const result = await this.db.getDocument(MARKETPLACE_PACKAGES_INDEX, packageId);
    if (!result.isSuccess || !result.data) return null;
    return result.data as unknown as MarketplacePackage;
  }

  /**
   * Install a package for the calling tenant via linked-mode (DD-324).
   * Writes one registration record to xiigen-tenant-module-registry.
   *
   * FLOW-47 hook point: Turn 3 (DesignTimeSnapshot) + Turn 4 (InstallValidation)
   * are invoked AFTER this method by the controller/orchestrator, using the
   * returned ModuleRegistrationRecord + package as snapshot keys.
   */
  async install(packageId: string): Promise<InstallResult> {
    const tenantId = this.cls.get<TenantContext>(TENANT_CONTEXT_KEY)?.tenantId;
    if (!tenantId) return { error: 'Tenant context required', code: 'NO_TENANT' };

    const pkg = await this.getById(packageId);
    if (!pkg) return { error: `Package not found: ${packageId}`, code: 'PACKAGE_NOT_FOUND' };

    const regResult = await this.moduleRegistry.registerInstall({
      packageId,
      flowId: pkg.sourceFlowId,
      version: pkg.sourceVersion,
    });
    if (!regResult.isSuccess) {
      return {
        error: regResult.errorMessage ?? 'install failed',
        code: regResult.errorCode ?? 'INSTALL_FAILED',
      };
    }
    this.logger.debug(
      `Linked install: tenant=${tenantId} packageId=${packageId} flowId=${pkg.sourceFlowId}`,
    );
    return regResult.data!;
  }
}
