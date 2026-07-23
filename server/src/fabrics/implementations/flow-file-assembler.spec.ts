import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { FlowFileAssemblerService, resolveMonorepoRoot } from './flow-file-assembler';

jest.setTimeout(300_000);

describe('FlowFileAssemblerService complete module bundle', () => {
  const stagingDirs: string[] = [];
  const tempRoots: string[] = [];

  afterEach(async () => {
    await Promise.all(stagingDirs.map((dir) => fs.rm(dir, { recursive: true, force: true })));
    await Promise.all(tempRoots.map((dir) => fs.rm(dir, { recursive: true, force: true })));
    stagingDirs.length = 0;
    tempRoots.length = 0;
  });

  async function makeRuntimeRoot() {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), `flow-root-${randomUUID()}`));
    tempRoots.push(root);
    await fs.mkdir(path.join(root, 'docs'), { recursive: true });
    await fs.mkdir(path.join(root, 'server', 'src'), { recursive: true });
    return root;
  }

  it('resolves the repo root from the source TypeScript layout', async () => {
    const root = await makeRuntimeRoot();
    const runtimeDir = path.join(root, 'server', 'src', 'fabrics', 'implementations');
    await fs.mkdir(runtimeDir, { recursive: true });

    expect(resolveMonorepoRoot(runtimeDir, path.join(root, 'server'))).toBe(root);
  });

  it('resolves the repo root from the compiled Docker dist layout', async () => {
    const root = await makeRuntimeRoot();
    const runtimeDir = path.join(root, 'dist', 'fabrics', 'implementations');
    await fs.mkdir(runtimeDir, { recursive: true });

    expect(resolveMonorepoRoot(runtimeDir, root)).toBe(root);
  });

  it('falls back to the parent of server cwd when runtimeDir is outside the repo tree', async () => {
    const root = await makeRuntimeRoot();
    const runtimeDir = path.join(os.tmpdir(), `outside-runtime-${randomUUID()}`, 'dist');

    expect(resolveMonorepoRoot(runtimeDir, path.join(root, 'server'))).toBe(root);
  });

  async function assembleProfileEnrichment() {
    const stagingDir = path.join(os.tmpdir(), `flow-02-assembler-${randomUUID()}`);
    stagingDirs.push(stagingDir);

    const service = new FlowFileAssemblerService();
    const result = await service.assemble({
      flowId: 'FLOW-02',
      flowSlug: 'profile-enrichment',
      stagingDir,
      tenantId: 'acme-corp',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeDefined();
    return { stagingDir, data: result.data! };
  }

  async function assembleTransactionalEventParticipation() {
    const stagingDir = path.join(os.tmpdir(), `flow-09-assembler-${randomUUID()}`);
    stagingDirs.push(stagingDir);

    const service = new FlowFileAssemblerService();
    const result = await service.assemble({
      flowId: 'FLOW-09',
      flowSlug: 'transactional-event-participation',
      stagingDir,
      tenantId: 'acme-corp',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeDefined();
    return { stagingDir, data: result.data! };
  }

  async function assembleSchemaRegistryDag() {
    const stagingDir = path.join(os.tmpdir(), `flow-11-assembler-${randomUUID()}`);
    stagingDirs.push(stagingDir);

    const service = new FlowFileAssemblerService();
    const result = await service.assemble({
      flowId: 'FLOW-11',
      flowSlug: 'schema-registry-dag',
      stagingDir,
      tenantId: 'acme-corp',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeDefined();
    return { stagingDir, data: result.data! };
  }

  async function assembleSubscriptionBilling() {
    const stagingDir = path.join(os.tmpdir(), `flow-12-assembler-${randomUUID()}`);
    stagingDirs.push(stagingDir);

    const service = new FlowFileAssemblerService();
    const result = await service.assemble({
      flowId: 'FLOW-12',
      flowSlug: 'subscription-billing',
      stagingDir,
      tenantId: 'acme-corp',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeDefined();
    return { stagingDir, data: result.data! };
  }

  async function assembleEtlDataIntegration() {
    const stagingDir = path.join(os.tmpdir(), `flow-14-assembler-${randomUUID()}`);
    stagingDirs.push(stagingDir);

    const service = new FlowFileAssemblerService();
    const result = await service.assemble({
      flowId: 'FLOW-14',
      flowSlug: 'etl-data-integration',
      stagingDir,
      tenantId: 'acme-corp',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeDefined();
    return { stagingDir, data: result.data! };
  }

  async function assembleSaasMultiTenancy() {
    const stagingDir = path.join(os.tmpdir(), `flow-15-assembler-${randomUUID()}`);
    stagingDirs.push(stagingDir);

    const service = new FlowFileAssemblerService();
    const result = await service.assemble({
      flowId: 'FLOW-15',
      flowSlug: 'saas-multi-tenancy',
      stagingDir,
      tenantId: 'acme-corp',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeDefined();
    return { stagingDir, data: result.data! };
  }

  async function assembleBfaCrossFlowGovernance() {
    const stagingDir = path.join(os.tmpdir(), `flow-25-assembler-${randomUUID()}`);
    stagingDirs.push(stagingDir);

    const service = new FlowFileAssemblerService();
    const result = await service.assemble({
      flowId: 'FLOW-25',
      flowSlug: 'bfa-cross-flow-governance',
      stagingDir,
      tenantId: 'acme-corp',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeDefined();
    return { stagingDir, data: result.data! };
  }

  async function assembleRagQualityFeedback() {
    const stagingDir = path.join(os.tmpdir(), `flow-38-assembler-${randomUUID()}`);
    stagingDirs.push(stagingDir);

    const service = new FlowFileAssemblerService();
    const result = await service.assemble({
      flowId: 'FLOW-38',
      flowSlug: 'rag-quality-feedback',
      stagingDir,
      tenantId: 'acme-corp',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeDefined();
    return { stagingDir, data: result.data! };
  }

  it('assembles Flow 02 with runtime code, AI context, config, seeds, and build files', async () => {
    const { stagingDir, data } = await assembleProfileEnrichment();

    expect(data.includesCompleteModuleBundle).toBe(true);
    expect(data.includesFunctionalSpec).toBe(true);
    expect(data.includesStepOneInvariants).toBe(true);
    expect(data.includesAdaptationSurface).toBe(true);
    expect(data.includesFreedomDefaults).toBe(true);
    expect(data.includesTenantConfig).toBe(true);
    expect(data.includesRagSeeds).toBe(true);
    expect(data.includesStandalonePackage).toBe(true);

    const requiredFiles = [
      'package.json',
      'tsconfig.json',
      'jest.config.js',
      '.github/workflows/flow-ci.yml',
      'freedom-config.defaults.json',
      'tenant.config.json',
      'settings/module.settings.json',
      'BUNDLE-MANIFEST.json',
      'docs/adaptation-surface.json',
      'docs/STEP-1-INVARIANTS.md',
      'docs/FUNCTIONAL-SPEC.md',
      'docs/design-context/.impeccable.md',
      'docs/flow-coverage/P1-business-logic-inventory.md',
      'rag-seeds/profile-enrichment-design-corpus.json',
      'rag-seeds/seed_profile_enrichment_patterns.py',
      'server/src/engine/flows/profile-enrichment/business-profile.service.ts',
    ];

    for (const relPath of requiredFiles) {
      await expect(fs.access(path.join(stagingDir, relPath))).resolves.toBeUndefined();
      expect(data.manifest).toContain(relPath);
    }
  });

  it('initializes tenant config with empty adaptation history and Flow 02 defaults', async () => {
    const { stagingDir } = await assembleProfileEnrichment();

    const tenantConfig = JSON.parse(
      await fs.readFile(path.join(stagingDir, 'tenant.config.json'), 'utf-8'),
    ) as Record<string, unknown>;
    expect(tenantConfig['tenantId']).toBe('acme-corp');
    expect(tenantConfig['flowId']).toBe('FLOW-02');
    expect(tenantConfig['flowSlug']).toBe('profile-enrichment');
    expect(tenantConfig['adaptationHistory']).toEqual([]);

    const freedomDefaults = JSON.parse(
      await fs.readFile(path.join(stagingDir, 'freedom-config.defaults.json'), 'utf-8'),
    ) as Record<string, unknown>;
    const defaults = freedomDefaults['defaults'] as Record<string, unknown>;
    expect(defaults['flow02_debounce_window_seconds']).toBe(300);
    expect(defaults['flow02_match_timeout_seconds']).toBe(30);
    expect(defaults['flow02_match_weight_industry']).toBe(0.4);
  });

  it('assembles Flow 11 with shared DAG runtime dependencies', async () => {
    const { stagingDir, data } = await assembleSchemaRegistryDag();

    const requiredFiles = [
      'server/src/engine/dag/dag-node.types.ts',
      'server/src/engine/dag/dag-renderer.handler.ts',
      'server/src/engine/dag/mermaid-renderer.service.ts',
    ];

    for (const relPath of requiredFiles) {
      await expect(fs.access(path.join(stagingDir, relPath))).resolves.toBeUndefined();
      expect(data.manifest).toContain(relPath);
    }
  });

  it('carries FLOW-12 co-install declarations into the generated fork package', async () => {
    const { stagingDir } = await assembleSubscriptionBilling();

    const pkg = JSON.parse(
      await fs.readFile(path.join(stagingDir, 'package.json'), 'utf-8'),
    ) as Record<string, unknown>;
    const xiigen = pkg['xiigen'] as Record<string, unknown>;

    expect(pkg['requiredCoInstalls']).toEqual([
      '@xiigen/transactional-event-participation',
      '@xiigen/event-attendance',
      '@xiigen/event-management',
    ]);
    expect(xiigen['requiredCoInstalls']).toEqual(['FLOW-09', 'FLOW-04', 'FLOW-03']);
    expect(pkg['coInstallNotes']).toContain('FLOW-03');
    expect(pkg['coInstallNotes']).toContain('not bundled or double-installed');
  });

  it('assembles Flow 14 from the canonical functional-specs folder', async () => {
    const { stagingDir, data } = await assembleEtlDataIntegration();

    expect(data.includesCompleteModuleBundle).toBe(true);
    expect(data.includesFunctionalSpec).toBe(true);
    await expect(
      fs.access(path.join(stagingDir, 'docs', 'FUNCTIONAL-SPEC.md')),
    ).resolves.toBeUndefined();
    const functionalSpec = await fs.readFile(
      path.join(stagingDir, 'docs', 'FUNCTIONAL-SPEC.md'),
      'utf-8',
    );
    expect(functionalSpec).toContain('FLOW-14');
    expect(functionalSpec).toContain('ETL Data Integration');
  });

  it('assembles Flow 25 from its implementationSlug while preserving the canonical package slug', async () => {
    const { stagingDir, data } = await assembleBfaCrossFlowGovernance();

    expect(data.includesCompleteModuleBundle).toBe(true);
    expect(data.includesAdaptationSurface).toBe(true);
    expect(data.manifest).toContain(
      'server/src/engine/flows/bfa-cross-flow-governance/change-intake-parser.service.ts',
    );
    expect(data.manifest).not.toContain(
      'server/src/engine/flows/bfa-conflict-arbitration/change-intake-parser.service.ts',
    );

    const adaptationSurface = JSON.parse(
      await fs.readFile(path.join(stagingDir, 'docs', 'adaptation-surface.json'), 'utf-8'),
    ) as Record<string, unknown>;
    expect(adaptationSurface['implementationSlug']).toBe('bfa-conflict-arbitration');
  });

  it('assembles Flow 38 with the bootstrap constant imported by rag quality seeds', async () => {
    const { stagingDir, data } = await assembleRagQualityFeedback();
    const relPath = 'server/src/bootstrap/bootstrap-seeder.service.ts';

    await expect(fs.access(path.join(stagingDir, relPath))).resolves.toBeUndefined();
    expect(data.manifest).toContain(relPath);

    const seedsService = await fs.readFile(
      path.join(
        stagingDir,
        'server',
        'src',
        'engine',
        'flows',
        'rag-quality-feedback',
        'rag-quality-seeds.service.ts',
      ),
      'utf-8',
    );
    expect(seedsService).toContain("../../../bootstrap/bootstrap-seeder.service");
  });

  it('carries FLOW-15 lifecycle peer co-install declarations into the generated fork package', async () => {
    const { stagingDir } = await assembleSaasMultiTenancy();

    const pkg = JSON.parse(
      await fs.readFile(path.join(stagingDir, 'package.json'), 'utf-8'),
    ) as Record<string, unknown>;
    const xiigen = pkg['xiigen'] as Record<string, unknown>;

    expect(pkg['requiredCoInstalls']).toEqual([
      '@xiigen/subscription-billing',
      '@xiigen/data-warehouse-analytics',
      '@xiigen/schema-registry-dag',
      '@xiigen/transactional-event-participation',
      '@xiigen/event-attendance',
      '@xiigen/event-management',
      '@xiigen/reviews-reputation',
    ]);
    expect(xiigen['requiredCoInstalls']).toEqual([
      'FLOW-12',
      'FLOW-13',
      'FLOW-11',
      'FLOW-09',
      'FLOW-04',
      'FLOW-03',
      'FLOW-10',
    ]);
    expect(pkg['coInstallNotes']).toContain('FLOW-12');
    expect(pkg['coInstallNotes']).toContain('FLOW-13');
    expect(pkg['coInstallNotes']).toContain('bundling or double-installing source');

    const provisioningService = await fs.readFile(
      path.join(
        stagingDir,
        'server',
        'src',
        'engine',
        'flows',
        'saas-multi-tenancy',
        'tenant-provisioning-orchestrator.service.ts',
      ),
      'utf-8',
    );
    expect(provisioningService).not.toContain('../../../bootstrap/bootstrap-seeder.service');
  });

  describe('BUG-ENGINE-01: handler-based fork package smoke tests', () => {
    it('generates a smoke test that includes handler modules at unit level', async () => {
      const { stagingDir } = await assembleTransactionalEventParticipation();

      const smokeTest = await fs.readFile(
        path.join(stagingDir, '__tests__', 'transactional-event-participation-package.spec.ts'),
        'utf-8',
      );

      expect(smokeTest).toContain("entry.endsWith('.handler.ts')");
    });

    it('discovers the shipped Flow 09 handler modules in the assembled package', async () => {
      const { stagingDir } = await assembleTransactionalEventParticipation();
      const smokeTest = await fs.readFile(
        path.join(stagingDir, '__tests__', 'transactional-event-participation-package.spec.ts'),
        'utf-8',
      );
      const flowDir = path.join(
        stagingDir,
        'server',
        'src',
        'engine',
        'flows',
        'transactional-event-participation',
      );

      const handlerFiles = (await fs.readdir(flowDir))
        .filter((entry) => entry.endsWith('.handler.ts'))
        .sort();
      const generatedExtensions = [...smokeTest.matchAll(/entry\.endsWith\('([^']+)'\)/g)].map(
        (match) => match[1],
      );
      const smokeDiscoverableFiles = handlerFiles.filter((entry) =>
        generatedExtensions.some((extension) => entry.endsWith(extension)),
      );

      expect(handlerFiles.length).toBeGreaterThan(0);
      expect(smokeDiscoverableFiles).toEqual(handlerFiles);
    });

    it('loads Flow 09 handler modules through the generated package contract', async () => {
      const { stagingDir } = await assembleTransactionalEventParticipation();
      const smokeTest = await fs.readFile(
        path.join(stagingDir, '__tests__', 'transactional-event-participation-package.spec.ts'),
        'utf-8',
      );
      const flowDir = path.join(
        stagingDir,
        'server',
        'src',
        'engine',
        'flows',
        'transactional-event-participation',
      );
      const generatedExtensions = [...smokeTest.matchAll(/entry\.endsWith\('([^']+)'\)/g)].map(
        (match) => match[1],
      );
      const smokeFiles = (await fs.readdir(flowDir))
        .filter((entry) => generatedExtensions.some((extension) => entry.endsWith(extension)))
        .sort();

      expect(smokeFiles.length).toBeGreaterThan(0);

      for (const entry of smokeFiles) {
        const loaded = (await import(path.join(flowDir, entry))) as Record<string, unknown>;
        expect(Object.keys(loaded).length).toBeGreaterThan(0);
      }
    });
  });
});
