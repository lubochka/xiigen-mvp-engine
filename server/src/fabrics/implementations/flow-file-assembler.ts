/**
 * FlowFileAssemblerService — concrete IFlowAssembler.
 *
 * Copies monorepo files for a given flowSlug into a staging directory.
 * Rule 1 boundary: only this implementation reads from the monorepo tree.
 *
 * Functional spec is mandatory — returns `includesFunctionalSpec: false`
 * when `docs/business-flows/{flowId}-{flowSlug}.md` is absent so the
 * orchestrator can refuse the fork with a clear error. Newer flows may place
 * the same spec under docs/business-flows/functional-specs; that canonical
 * folder is also part of the lookup chain.
 *
 * XIIGEN-GAP-IMPLEMENTATION-PLAN-v1.1 GAP-25 step 4.
 *
 * FLOW-01 Phase C11 (DEV-115, 2026-04-26): the assembled fork is now a
 * genuinely runnable npm package, not just a pile of .ts files. Three
 * additional directory-copy steps (kernel, fabric-interfaces, freedom)
 * bring the engine boundary into the fork tree so relative imports
 * `../../../kernel/...` resolve at the same depth they do in source.
 * Three additional generated-file steps (package.json, tsconfig.json,
 * jest.config.js) make `npm install && npx tsc --noEmit && npx jest`
 * runnable in the staging directory standalone — verified by the
 * fork-and-install harness at scripts/portability/flow-01-fork-and-install-test.py.
 */

import { Injectable } from '@nestjs/common';
import { promises as fs, existsSync, readFileSync } from 'fs';
import * as path from 'path';
import { DataProcessResult } from '../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../kernel/microservice-base';
import { XIIGEN_FREEDOM_DEFAULTS } from '../../freedom/config-schema';
import {
  AssembleParams,
  AssembleResult,
  IFlowAssembler,
} from '../interfaces/flow-assembler.fabric.interface';

/** Derive monorepo root from this file's location. */
export function resolveMonorepoRoot(runtimeDir: string, cwd = process.cwd()): string {
  const candidates = [
    path.resolve(runtimeDir, '../../../..'),
    path.resolve(runtimeDir, '../../..'),
    path.resolve(cwd),
    path.resolve(cwd, '..'),
  ];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    if (
      existsSync(path.join(candidate, 'docs')) &&
      existsSync(path.join(candidate, 'server', 'src'))
    ) {
      return candidate;
    }
  }

  return candidates[0];
}

const MONOREPO_ROOT = resolveMonorepoRoot(__dirname);

interface CopyPlan {
  /** For directory/file copies: source path. For generated tags: ignored. */
  src: string;
  dst: string;
  /** If true and src is missing, the assemble FAILS. */
  required?: boolean;
  /** Semantic tag for the output manifest / gate flags. */
  tag?:
    | 'functional-spec'
    | 'step-1-invariants'
    | 'services'
    | 'shared-engine-dag'
    | 'contracts'
    | 'test-utils'
    | 'snapshots'
    | 'kernel'
    | 'fabric-interfaces'
    | 'freedom'
    | 'bootstrap'
    | 'adaptation-surface'
    | 'design-context'
    | 'flow-coverage'
    | 'history-seed'
    | 'rag-benchmark-seed'
    | 'generated-freedom-defaults'
    | 'generated-tenant-config'
    | 'generated-module-settings'
    | 'generated-package-json'
    | 'generated-tsconfig'
    | 'generated-jest-config'
    | 'generated-smoke-test'
    | 'generated-tenant-ci-workflow';
  /** For 'generated-*' tags: the literal text to write to dst. */
  generatedContent?: string;
}

interface BundleCompleteness {
  includesCompleteModuleBundle: boolean;
  includesAdaptationSurface: boolean;
  includesFreedomDefaults: boolean;
  includesTenantConfig: boolean;
  includesRagSeeds: boolean;
  includesStandalonePackage: boolean;
  missingRequiredFiles: string[];
}

@Injectable()
export class FlowFileAssemblerService extends MicroserviceBase implements IFlowAssembler {
  constructor() {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'fabric.fork.assembler',
        serviceName: 'FlowFileAssemblerService',
        flowId: 'FLOW-47',
      }),
    });
  }
  async assemble(params: AssembleParams): Promise<DataProcessResult<AssembleResult>> {
    const { flowSlug, flowId, stagingDir, tenantId } = params;
    if (!flowSlug || !flowId || !stagingDir) {
      return DataProcessResult.failure(
        'VALIDATION_FAILURE',
        'flowSlug, flowId, and stagingDir are required',
      );
    }

    try {
      await fs.rm(stagingDir, { recursive: true, force: true });
      await fs.mkdir(stagingDir, { recursive: true });

      const flowNumber = flowId.replace(/^FLOW-/, '');
      const flowNumberPadded = flowNumber.padStart(2, '0').toLowerCase();
      const flowSlugSnake = flowSlug.replace(/-/g, '_');
      const functionalSpec = this.firstExistingPath(
        [
          path.join(MONOREPO_ROOT, 'docs/business-flows', `${flowNumber}-${flowSlug}.md`),
          path.join(
            MONOREPO_ROOT,
            'docs/business-flows',
            'functional-specs',
            `${flowId}-${flowSlug}-functional-spec.md`,
          ),
        ],
        path.join(MONOREPO_ROOT, 'docs/business-flows', `${flowNumber}-${flowSlug}.md`),
      );
      const step1 = this.firstExistingPath(
        [
          path.join(MONOREPO_ROOT, 'docs/sessions', flowId, `${flowId}-STEP-1-INVARIANTS.md`),
          path.join(
            MONOREPO_ROOT,
            'docs/portability',
            `flow-${flowNumberPadded}`,
            `${flowId}-STEP-1-INVARIANTS.md`,
          ),
        ],
        path.join(MONOREPO_ROOT, 'docs/sessions', flowId, `${flowId}-STEP-1-INVARIANTS.md`),
      );
      const portabilityDir = path.join(
        MONOREPO_ROOT,
        'docs/portability',
        `flow-${flowNumberPadded}`,
      );
      const adaptationSurface = path.join(portabilityDir, `adaptation-surface-${flowSlug}.json`);
      const implementationSlug = this.resolveImplementationSlug(adaptationSurface, flowSlug);
      const historySeed = path.join(
        MONOREPO_ROOT,
        'server/src/bootstrap/history-seeds',
        `${flowSlug}-design-corpus.json`,
      );
      const ragBenchmarkSeed = path.join(
        MONOREPO_ROOT,
        'rag-benchmark',
        `seed_${flowSlugSnake}_patterns.py`,
      );

      const copyPlan: CopyPlan[] = [
        // ── Engine boundary: services + contracts (full source-tree depth preserved) ──
        // Phase C11 (DEV-115): services land at server/src/engine/flows/{slug}/ instead
        // of a flat server/ directory, so `../../../kernel/...` relative imports inside
        // the service files resolve correctly when the fork tree mirrors the monorepo's
        // server/src/ depth. Together with the kernel + fabric-interfaces + freedom
        // copy steps below, this gives the assembled package a closed, runnable
        // import graph.
        {
          src: path.join(MONOREPO_ROOT, 'server/src/engine/flows', implementationSlug),
          dst: path.join(stagingDir, 'server', 'src', 'engine', 'flows', flowSlug),
          tag: 'services',
        },
        ...(
          implementationSlug === 'schema-registry-dag'
            ? [
                {
                  src: path.join(MONOREPO_ROOT, 'server/src/engine/dag'),
                  dst: path.join(stagingDir, 'server', 'src', 'engine', 'dag'),
                  tag: 'shared-engine-dag' as const,
                },
              ]
            : []
        ),
        {
          src: path.join(MONOREPO_ROOT, 'server/src/engine-contracts'),
          dst: path.join(stagingDir, 'contracts'),
          tag: 'contracts',
        },

        // ── Kernel + fabric interfaces + freedom (engine boundary, copied wholesale) ──
        // Phase C11 (DEV-115): the FLOW-01 services import from
        // ../../../kernel, ../../../fabrics/interfaces, and ../../../freedom — these
        // copies are mandatory for the fork to compile + test outside the monolith.
        {
          src: path.join(MONOREPO_ROOT, 'server/src/kernel'),
          dst: path.join(stagingDir, 'server', 'src', 'kernel'),
          tag: 'kernel',
        },
        {
          src: path.join(MONOREPO_ROOT, 'server/src/fabrics/interfaces'),
          dst: path.join(stagingDir, 'server', 'src', 'fabrics', 'interfaces'),
          tag: 'fabric-interfaces',
        },
        {
          src: path.join(MONOREPO_ROOT, 'server/src/freedom'),
          dst: path.join(stagingDir, 'server', 'src', 'freedom'),
          tag: 'freedom',
        },
        {
          src: path.join(MONOREPO_ROOT, 'server/src/bootstrap/bootstrap-seeder.service.ts'),
          dst: path.join(stagingDir, 'server', 'src', 'bootstrap', 'bootstrap-seeder.service.ts'),
          tag: 'bootstrap',
        },

        // ── Generated metadata (makes the fork an installable, testable npm package) ──
        // Phase C11 (DEV-115): without these three files the fork is a pile of raw .ts
        // files — `npm install` would fail (no manifest), tsc would fail (no config),
        // and jest would not even run. With them, the fork is a proper standalone
        // package: the fork-and-install harness at scripts/portability/flow-01-fork-and-install-test.py
        // exercises this exact contract.
        {
          src: '<generated>',
          dst: path.join(stagingDir, 'package.json'),
          tag: 'generated-package-json',
          generatedContent: this.buildPackageJson(flowSlug, implementationSlug),
        },
        {
          src: '<generated>',
          dst: path.join(stagingDir, 'tsconfig.json'),
          tag: 'generated-tsconfig',
          generatedContent: TSCONFIG_JSON_CONTENT,
        },
        {
          src: '<generated>',
          dst: path.join(stagingDir, 'jest.config.js'),
          tag: 'generated-jest-config',
          generatedContent: JEST_CONFIG_CONTENT,
        },
        {
          src: '<generated>',
          dst: path.join(stagingDir, '__tests__', `${flowSlug}-package.spec.ts`),
          tag: 'generated-smoke-test',
          generatedContent: this.buildSmokeTest(flowSlug),
        },
        {
          // Phase C12 (DEV-115, 2026-04-26): tenant-side CI workflow.
          // Per TENANT-CICD-CONNECTION-GUIDANCE-v1.0 §FlowFileAssemblerService:
          // injected at .github/workflows/flow-ci.yml inside the fork itself.
          // When the tenant's repo receives a push, GitHub Actions runs this
          // workflow, which executes the same npm install + tsc --noEmit +
          // jest contract that the platform's fork-and-install harness
          // exercises. This is the "tenant CI/CD really works" half of the
          // proof: the moment the tenant pushes to their fork, their CI
          // runs the harness contract — using the tenant's own GitHub Actions
          // secrets (set by ForkFlowHandlerService.setRepoSecrets after push).
          src: '<generated>',
          dst: path.join(stagingDir, '.github', 'workflows', 'flow-ci.yml'),
          tag: 'generated-tenant-ci-workflow',
          generatedContent: this.buildTenantCiWorkflow(flowSlug),
        },
        {
          src: '<generated>',
          dst: path.join(stagingDir, 'freedom-config.defaults.json'),
          tag: 'generated-freedom-defaults',
          generatedContent: this.buildFreedomDefaultsJson(flowId, flowSlug),
        },
        {
          src: '<generated>',
          dst: path.join(stagingDir, 'tenant.config.json'),
          tag: 'generated-tenant-config',
          generatedContent: this.buildTenantConfigJson({
            flowId,
            flowSlug,
            tenantId: tenantId ?? 'unassigned',
          }),
        },
        {
          src: '<generated>',
          dst: path.join(stagingDir, 'settings', 'module.settings.json'),
          tag: 'generated-module-settings',
          generatedContent: this.buildModuleSettingsJson(flowId, flowSlug),
        },

        // ── Documentation + utilities ──
        {
          src: adaptationSurface,
          dst: path.join(stagingDir, 'docs', 'adaptation-surface.json'),
          required: true,
          tag: 'adaptation-surface',
        },
        {
          src: step1,
          dst: path.join(stagingDir, 'docs', 'STEP-1-INVARIANTS.md'),
          tag: 'step-1-invariants',
        },
        {
          src: functionalSpec,
          dst: path.join(stagingDir, 'docs', 'FUNCTIONAL-SPEC.md'),
          required: true,
          tag: 'functional-spec',
        },
        {
          src: path.join(MONOREPO_ROOT, 'docs/design-context', flowSlug, '.impeccable.md'),
          dst: path.join(stagingDir, 'docs', 'design-context', '.impeccable.md'),
          tag: 'design-context',
        },
        {
          src: path.join(MONOREPO_ROOT, 'docs/flow-coverage', flowSlug),
          dst: path.join(stagingDir, 'docs', 'flow-coverage'),
          tag: 'flow-coverage',
        },
        {
          src: historySeed,
          dst: path.join(stagingDir, 'rag-seeds', `${flowSlug}-design-corpus.json`),
          required: true,
          tag: 'history-seed',
        },
        {
          src: ragBenchmarkSeed,
          dst: path.join(stagingDir, 'rag-seeds', `seed_${flowSlugSnake}_patterns.py`),
          tag: 'rag-benchmark-seed',
        },
        {
          src: path.join(MONOREPO_ROOT, 'server/src/test-utils'),
          dst: path.join(stagingDir, 'test-utils'),
          tag: 'test-utils',
        },
        {
          src: path.join(MONOREPO_ROOT, 'docs/e2e-snapshots', flowSlug),
          dst: path.join(stagingDir, 'docs', 'e2e-snapshots'),
          tag: 'snapshots',
        },
      ];

      const manifest: string[] = [];
      let includesFunctionalSpec = false;
      let includesStepOneInvariants = false;

      for (const step of copyPlan) {
        // Generated files (package.json, tsconfig.json, jest.config.js,
        // tenant CI workflow) — write the literal content rather than
        // copying from disk.
        if (
          step.tag === 'generated-package-json' ||
          step.tag === 'generated-tsconfig' ||
          step.tag === 'generated-jest-config' ||
          step.tag === 'generated-smoke-test' ||
          step.tag === 'generated-tenant-ci-workflow' ||
          step.tag === 'generated-freedom-defaults' ||
          step.tag === 'generated-tenant-config' ||
          step.tag === 'generated-module-settings'
        ) {
          if (!step.generatedContent) {
            return DataProcessResult.failure(
              'ASSEMBLE_FAILED',
              `Generated step ${step.tag} has empty generatedContent`,
            );
          }
          await fs.mkdir(path.dirname(step.dst), { recursive: true });
          await fs.writeFile(step.dst, step.generatedContent, 'utf-8');
          manifest.push(path.relative(stagingDir, step.dst).replace(/\\/g, '/'));
          continue;
        }

        if (!existsSync(step.src)) {
          if (step.required) {
            return DataProcessResult.failure(
              step.tag === 'functional-spec'
                ? 'MISSING_FUNCTIONAL_SPEC'
                : 'MISSING_REQUIRED_BUNDLE_FILE',
              `Required bundle file missing: ${step.src}`,
            );
          }
          continue;
        }

        const stat = await fs.stat(step.src);
        if (stat.isFile()) {
          await fs.mkdir(path.dirname(step.dst), { recursive: true });
          await fs.copyFile(step.src, step.dst);
          manifest.push(path.relative(stagingDir, step.dst).replace(/\\/g, '/'));
        } else if (stat.isDirectory()) {
          // For contracts, only copy files matching flowSlug; otherwise whole dir
          if (step.tag === 'contracts') {
            await fs.mkdir(step.dst, { recursive: true });
            const entries = await fs.readdir(step.src);
            for (const entry of entries) {
              if (!entry.startsWith(`${flowSlug}-`) || !entry.endsWith('.ts')) continue;
              if (entry.includes('.spec.') || entry.includes('.test.')) continue;
              const from = path.join(step.src, entry);
              const to = path.join(step.dst, entry);
              await fs.copyFile(from, to);
              manifest.push(path.relative(stagingDir, to).replace(/\\/g, '/'));
            }
          } else if (step.tag === 'services') {
            // Phase C11 (DEV-115): services dst is now nested at
            // {staging}/server/src/engine/flows/{slug}/ to preserve the
            // ../../../kernel/... import depth. Skip *.spec.ts / *.test.ts
            // (test sources don't ship with the fork), *.module.ts Nest app
            // wiring, and __tests__ subdirs. The standalone tenant package
            // exports runnable service/handler modules; per-flow Nest modules
            // import monorepo application modules that are outside the fork
            // boundary.
            await fs.mkdir(step.dst, { recursive: true });
            const entries = await fs.readdir(step.src);
            for (const entry of entries) {
              if (entry === '__tests__') continue;
              if (entry.endsWith('.spec.ts') || entry.endsWith('.test.ts')) continue;
              if (entry.endsWith('.module.ts')) continue;
              const from = path.join(step.src, entry);
              const stat2 = await fs.stat(from);
              if (stat2.isFile() && entry.endsWith('.ts')) {
                const to = path.join(step.dst, entry);
                await fs.copyFile(from, to);
                manifest.push(path.relative(stagingDir, to).replace(/\\/g, '/'));
              } else if (stat2.isFile() && entry === 'package.json') {
                // Preserve the per-flow xiigenFlowMeta package.json (V-11 manifest)
                const to = path.join(step.dst, entry);
                await fs.copyFile(from, to);
                manifest.push(path.relative(stagingDir, to).replace(/\\/g, '/'));
              }
            }
          } else if (
            step.tag === 'kernel' ||
            step.tag === 'fabric-interfaces' ||
            step.tag === 'freedom' ||
            step.tag === 'shared-engine-dag'
          ) {
            // Phase C11 (DEV-115): copy the engine boundary wholesale (kernel +
            // fabric interfaces + freedom config). Skip *.spec.ts / __tests__ —
            // the fork is a runnable package, not a test corpus.
            await this.copyDirRecursiveFiltered(step.src, step.dst, manifest, stagingDir);
          } else if (step.tag === 'snapshots') {
            await fs.mkdir(step.dst, { recursive: true });
            const entries = await fs.readdir(step.src);
            for (const entry of entries) {
              if (!/\.(png|jpg|jpeg|gif|webp)$/i.test(entry)) continue;
              await fs.copyFile(path.join(step.src, entry), path.join(step.dst, entry));
              manifest.push(
                path.relative(stagingDir, path.join(step.dst, entry)).replace(/\\/g, '/'),
              );
            }
          } else {
            // Generic recursive copy
            await this.copyDirRecursive(step.src, step.dst, manifest, stagingDir);
          }
        }

        if (step.tag === 'functional-spec') includesFunctionalSpec = true;
        if (step.tag === 'step-1-invariants') includesStepOneInvariants = true;
      }

      const completeness = await this.verifyCompleteModuleBundle(stagingDir, flowSlug);
      if (!completeness.includesCompleteModuleBundle) {
        return DataProcessResult.failure(
          'INCOMPLETE_MODULE_BUNDLE',
          `Fork package missing required bundle files: ${completeness.missingRequiredFiles.join(', ')}`,
        );
      }

      const bundleManifestPath = path.join(stagingDir, 'BUNDLE-MANIFEST.json');
      const bundleManifestRel = path.relative(stagingDir, bundleManifestPath).replace(/\\/g, '/');
      await fs.writeFile(
        bundleManifestPath,
        this.buildBundleManifestJson({
          flowId,
          flowSlug,
          manifest: [...manifest, bundleManifestRel],
          completeness,
        }),
        'utf-8',
      );
      manifest.push(bundleManifestRel);

      return DataProcessResult.success({
        stagingDir,
        fileCount: manifest.length,
        includesFunctionalSpec,
        includesStepOneInvariants,
        includesCompleteModuleBundle: completeness.includesCompleteModuleBundle,
        includesAdaptationSurface: completeness.includesAdaptationSurface,
        includesFreedomDefaults: completeness.includesFreedomDefaults,
        includesTenantConfig: completeness.includesTenantConfig,
        includesRagSeeds: completeness.includesRagSeeds,
        includesStandalonePackage: completeness.includesStandalonePackage,
        manifest,
      });
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      return DataProcessResult.error('ASSEMBLE_FAILED', e.message, e);
    }
  }

  private firstExistingPath(paths: string[], fallback: string): string {
    return paths.find((candidate) => existsSync(candidate)) ?? fallback;
  }

  private resolveImplementationSlug(adaptationSurfacePath: string, flowSlug: string): string {
    if (!existsSync(adaptationSurfacePath)) return flowSlug;
    try {
      const parsed = JSON.parse(readFileSync(adaptationSurfacePath, 'utf-8')) as unknown;
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return flowSlug;
      }
      const implementationSlug = (parsed as Record<string, unknown>)['implementationSlug'];
      if (typeof implementationSlug !== 'string') return flowSlug;
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(implementationSlug)) return flowSlug;
      return implementationSlug;
    } catch {
      return flowSlug;
    }
  }

  private async verifyCompleteModuleBundle(
    stagingDir: string,
    flowSlug: string,
  ): Promise<BundleCompleteness> {
    const requiredFiles = [
      'package.json',
      'tsconfig.json',
      'jest.config.js',
      '.github/workflows/flow-ci.yml',
      'freedom-config.defaults.json',
      'tenant.config.json',
      'settings/module.settings.json',
      'server/src/bootstrap/bootstrap-seeder.service.ts',
      'docs/adaptation-surface.json',
      'docs/STEP-1-INVARIANTS.md',
      'docs/FUNCTIONAL-SPEC.md',
    ];

    const missingRequiredFiles: string[] = [];
    for (const relPath of requiredFiles) {
      if (!(await this.pathExists(path.join(stagingDir, relPath)))) {
        missingRequiredFiles.push(relPath);
      }
    }

    const serviceFiles = await this.listFileNames(
      path.join(stagingDir, 'server', 'src', 'engine', 'flows', flowSlug),
    );
    if (!serviceFiles.some((entry) => entry.endsWith('.ts'))) {
      missingRequiredFiles.push(`server/src/engine/flows/${flowSlug}/*.ts`);
    }
    if (flowSlug === 'schema-registry-dag') {
      for (const relPath of [
        'server/src/engine/dag/dag-node.types.ts',
        'server/src/engine/dag/dag-renderer.handler.ts',
        'server/src/engine/dag/mermaid-renderer.service.ts',
      ]) {
        if (!(await this.pathExists(path.join(stagingDir, relPath)))) {
          missingRequiredFiles.push(relPath);
        }
      }
    }

    const contractFiles = await this.listFileNames(path.join(stagingDir, 'contracts'));
    if (!contractFiles.some((entry) => entry.startsWith(`${flowSlug}-`) && entry.endsWith('.ts'))) {
      missingRequiredFiles.push(`contracts/${flowSlug}-*.ts`);
    }

    const ragSeedFiles = await this.listFileNames(path.join(stagingDir, 'rag-seeds'));
    const includesRagSeeds = ragSeedFiles.some(
      (entry) => entry.endsWith('.json') || entry.endsWith('.py'),
    );
    if (!includesRagSeeds) {
      missingRequiredFiles.push(`rag-seeds/${flowSlug}-design-corpus.json`);
    }

    const includesStandalonePackage = ['package.json', 'tsconfig.json', 'jest.config.js'].every(
      (relPath) => !missingRequiredFiles.includes(relPath),
    );

    const includesAdaptationSurface = !missingRequiredFiles.includes(
      'docs/adaptation-surface.json',
    );
    const includesFreedomDefaults = !missingRequiredFiles.includes('freedom-config.defaults.json');
    const includesTenantConfig = !missingRequiredFiles.includes('tenant.config.json');

    return {
      includesCompleteModuleBundle: missingRequiredFiles.length === 0,
      includesAdaptationSurface,
      includesFreedomDefaults,
      includesTenantConfig,
      includesRagSeeds,
      includesStandalonePackage,
      missingRequiredFiles,
    };
  }

  private async pathExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async listFileNames(directoryPath: string): Promise<string[]> {
    try {
      return await fs.readdir(directoryPath);
    } catch {
      return [];
    }
  }

  private async copyDirRecursive(
    src: string,
    dst: string,
    manifest: string[],
    stagingRoot: string,
  ): Promise<void> {
    await fs.cp(src, dst, { recursive: true });
    await this.addManifestFiles(dst, manifest, stagingRoot);
  }

  /**
   * Phase C11 (DEV-115): recursive copy that skips test-only files and build
   * caches. Used for kernel + fabric-interfaces + freedom copies — the fork is
   * a runnable production-shape package, not a test corpus.
   */
  private async copyDirRecursiveFiltered(
    src: string,
    dst: string,
    manifest: string[],
    stagingRoot: string,
  ): Promise<void> {
    await fs.cp(src, dst, {
      recursive: true,
      filter: (source) => !this.shouldSkipForkRuntimePath(source),
    });
    await this.addManifestFiles(dst, manifest, stagingRoot);
  }

  private shouldSkipForkRuntimePath(source: string): boolean {
    const entry = path.basename(source);
    if (entry === '__tests__') return true;
    if (entry === 'node_modules') return true;
    if (entry.startsWith('.')) return true;
    if (entry.endsWith('.tsbuildinfo')) return true;
    if (entry.endsWith('.spec.ts')) return true;
    if (entry.endsWith('.test.ts')) return true;
    return false;
  }

  private async addManifestFiles(
    root: string,
    manifest: string[],
    stagingRoot: string,
  ): Promise<void> {
    const entries = await fs.readdir(root, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(root, entry.name);
      if (entry.isDirectory()) {
        await this.addManifestFiles(entryPath, manifest, stagingRoot);
      } else if (entry.isFile()) {
        manifest.push(path.relative(stagingRoot, entryPath).replace(/\\/g, '/'));
      }
    }
  }

  private buildFreedomDefaultsJson(flowId: string, flowSlug: string): string {
    const flowNumber = flowId
      .replace(/^FLOW-/, '')
      .padStart(2, '0')
      .toLowerCase();
    const flowPrefix = `flow${flowNumber}_`;
    const defaults = Object.fromEntries(
      Object.entries(XIIGEN_FREEDOM_DEFAULTS).filter(([key]) => key.startsWith(flowPrefix)),
    );
    const payload: Record<string, unknown> = {
      flowId,
      flowSlug,
      defaults,
    };
    return JSON.stringify(payload, null, 2) + '\n';
  }

  private buildTenantConfigJson(params: {
    flowId: string;
    flowSlug: string;
    tenantId: string;
  }): string {
    const payload: Record<string, unknown> = {
      tenantId: params.tenantId,
      flowId: params.flowId,
      flowSlug: params.flowSlug,
      moduleName: params.flowSlug,
      moduleVersion: '1.0.0-fork',
      adaptationHistory: [] as Record<string, unknown>[],
      bundlePaths: {
        freedomConfig: './freedom-config.defaults.json',
        adaptationSurface: './docs/adaptation-surface.json',
        functionalSpec: './docs/FUNCTIONAL-SPEC.md',
        invariants: './docs/STEP-1-INVARIANTS.md',
        ragSeeds: './rag-seeds',
      },
    };
    return JSON.stringify(payload, null, 2) + '\n';
  }

  private buildModuleSettingsJson(flowId: string, flowSlug: string): string {
    const payload: Record<string, unknown> = {
      flowId,
      flowSlug,
      runtime: {
        sourceRoot: './server/src',
        flowSource: `./server/src/engine/flows/${flowSlug}`,
        contracts: './contracts',
      },
      aiContext: {
        adaptationSurface: './docs/adaptation-surface.json',
        historySeeds: './rag-seeds',
        designContext: './docs/design-context/.impeccable.md',
        flowCoverage: './docs/flow-coverage',
      },
      configuration: {
        freedomDefaults: './freedom-config.defaults.json',
        tenantConfig: './tenant.config.json',
      },
    };
    return JSON.stringify(payload, null, 2) + '\n';
  }

  private buildBundleManifestJson(params: {
    flowId: string;
    flowSlug: string;
    manifest: string[];
    completeness: BundleCompleteness;
  }): string {
    const payload: Record<string, unknown> = {
      flowId: params.flowId,
      flowSlug: params.flowSlug,
      requiredBundleChecks: {
        completeModuleBundle: params.completeness.includesCompleteModuleBundle,
        adaptationSurface: params.completeness.includesAdaptationSurface,
        freedomDefaults: params.completeness.includesFreedomDefaults,
        tenantConfig: params.completeness.includesTenantConfig,
        ragSeeds: params.completeness.includesRagSeeds,
        standalonePackage: params.completeness.includesStandalonePackage,
      },
      manifest: params.manifest,
    };
    return JSON.stringify(payload, null, 2) + '\n';
  }

  /**
   * Phase C12 (DEV-115, 2026-04-26): build the tenant's CI workflow.
   * Per TENANT-CICD-CONNECTION-GUIDANCE-v1.0 §FlowFileAssemblerService.
   *
   * The workflow runs INSIDE THE TENANT'S FORKED REPO when the tenant
   * pushes. It uses the tenant's own GitHub Actions secrets — XIIGEN_TENANT_ID
   * (always set by ForkFlowHandlerService.setRepoSecrets after push) and
   * DOCKER_REGISTRY_TOKEN (set when the tenant has Docker config in Vault).
   *
   * The exact contract mirrors what the platform's fork-and-install harness
   * runs (`npm install` -> `tsc --noEmit` -> `jest`), so a green run here
   * proves the fork is genuinely self-contained.
   */
  private buildTenantCiWorkflow(flowSlug: string): string {
    return `# ═══════════════════════════════════════════════════════
# XIIGen Flow CI — ${flowSlug}
# ═══════════════════════════════════════════════════════
# Auto-generated by FlowFileAssemblerService at fork-time.
# Phase C12 (DEV-115) — TENANT-CICD-CONNECTION-GUIDANCE-v1.0.
#
# Runs INSIDE the tenant's forked repo. On push: runs the same
# npm install -> tsc --noEmit -> jest contract that the platform's
# fork-and-install harness exercises against this exact tree.
#
# Reads GitHub Actions secrets:
#   XIIGEN_TENANT_ID       — set by ForkFlowHandlerService.setRepoSecrets
#   DOCKER_REGISTRY_TOKEN  — set when tenant has Docker config in Vault

name: XIIGen Flow CI — ${flowSlug}

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:

jobs:
  flow-ci:
    name: Standalone flow test — ${flowSlug}
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4.2.2

      - uses: actions/setup-node@v4.4.0
        with:
          node-version: "24"

      - name: Install
        run: npm install --no-audit --no-fund

      - name: TypeScript check
        run: npx tsc --noEmit

      - name: Test
        run: npx jest --colors=false --forceExit
        env:
          TENANT_ID: \${{ secrets.XIIGEN_TENANT_ID }}

      - name: Provenance
        if: success()
        run: |
          echo "Tenant fork CI: PASS"
          echo "Module: \${{ github.repository }}"
          echo "Branch: \${{ github.ref_name }}"
          echo "Commit: \${{ github.sha }}"
          echo "Tenant: \${{ secrets.XIIGEN_TENANT_ID }}"
`;
  }

  private buildSmokeTest(flowSlug: string): string {
    return `import * as fs from 'fs';
import * as path from 'path';

describe('${flowSlug} fork package', () => {
  it('loads the shipped flow service or handler modules', () => {
    const flowDir = path.join(__dirname, '..', 'server', 'src', 'engine', 'flows', '${flowSlug}');
    const moduleFiles = fs
      .readdirSync(flowDir)
      .filter((entry) => entry.endsWith('.service.ts') || entry.endsWith('.handler.ts'))
      .sort();

    expect(moduleFiles.length).toBeGreaterThan(0);

    for (const entry of moduleFiles) {
      const loaded = require(path.join(flowDir, entry)) as Record<string, unknown>;
      expect(Object.keys(loaded).length).toBeGreaterThan(0);
    }
  });
});
`;
  }

  /**
   * Phase C11 (DEV-115): build the fork's package.json. The deps mirror what
   * server/package.json declares for the kernel + fabric + auth + flow
   * surfaces — only the parts the fork actually imports. Versions track the
   * monorepo's pinned versions; bumping a kernel dep here requires a matching
   * bump in server/package.json (and vice versa).
   */
  private buildPackageJson(flowSlug: string, implementationSlug = flowSlug): string {
    const pkg: Record<string, unknown> = {
      name: `@xiigen-fork/${flowSlug}`,
      version: '1.0.0-fork',
      private: true,
      description: `XIIGen ${flowSlug} flow — assembled fork (Phase C11 R2/R4 fork-with-code).`,
      scripts: {
        tsc: 'tsc --noEmit',
        test: 'jest',
      },
      dependencies: {
        '@nestjs/common': '^11.1.16',
        '@nestjs/core': '^11.1.16',
        express: '^5.0.0',
        'nestjs-cls': '^6.2.0',
        'reflect-metadata': '^0.2.2',
        rxjs: '^7.8.2',
        uuid: '^13.0.0',
      },
      devDependencies: {
        '@types/express': '^5.0.6',
        '@types/jest': '^30.0.0',
        '@types/node': '^22.0.0',
        '@types/uuid': '^10.0.0',
        jest: '^30.2.0',
        'ts-jest': '^29.4.6',
        typescript: '^5.9.3',
      },
    };
    const flowPackageMeta = this.readFlowPackageMetadata(implementationSlug);
    this.copyFlowPackageMetadata(pkg, flowPackageMeta);
    return JSON.stringify(pkg, null, 2) + '\n';
  }

  private readFlowPackageMetadata(flowSlug: string): Record<string, unknown> {
    const flowPackagePath = path.join(
      MONOREPO_ROOT,
      'server',
      'src',
      'engine',
      'flows',
      flowSlug,
      'package.json',
    );
    if (!existsSync(flowPackagePath)) {
      return {};
    }
    try {
      const parsed = JSON.parse(readFileSync(flowPackagePath, 'utf-8')) as unknown;
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
    return {};
  }

  private copyFlowPackageMetadata(
    pkg: Record<string, unknown>,
    flowPackageMeta: Record<string, unknown>,
  ): void {
    for (const key of [
      'flowId',
      'flowSlug',
      'xiigenFlowMeta',
      'xiigen',
      'requiredCoInstalls',
      'coInstallNotes',
      'protocol',
    ]) {
      const value = flowPackageMeta[key];
      if (value !== undefined) {
        pkg[key] = value;
      }
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Phase C11 (DEV-115): static metadata content for the assembled fork.
// ────────────────────────────────────────────────────────────────────────────

const TSCONFIG_JSON_CONTENT = `{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2022",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "forceConsistentCasingInFileNames": true,
    "declaration": false,
    "sourceMap": true
  },
  "include": [
    "server/src/**/*.ts",
    "__tests__/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}
`;

const JEST_CONFIG_CONTENT = `module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/__tests__/**/*.spec.ts'],
  setupFiles: ['reflect-metadata'],
  transform: {
    '^.+\\\\.ts$': ['ts-jest', { tsconfig: { strict: false, esModuleInterop: true, experimentalDecorators: true, emitDecoratorMetadata: true, target: 'ES2022', module: 'commonjs' } }],
  },
};
`;

// Phase C12 (DEV-115, 2026-04-26): the tenant CI workflow content is now
// generated by `FlowFileAssemblerService.buildTenantCiWorkflow(flowSlug)`
// (per-flow customisation), replacing the previous static constant.
