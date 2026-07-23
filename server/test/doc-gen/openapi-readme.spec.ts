/**
 * P11.3 Tests — OpenApiGenerator + ModuleReadmeGenerator
 */

import { DataProcessResult } from '../../src/kernel/data-process-result';
import {
  OpenApiGenerator,
  type RouteDefinition,
  type ServerInfo,
} from '../../src/doc-gen/openapi-generator';
import {
  ModuleReadmeGenerator,
  type ModuleMetadata,
  type ProviderInfo,
} from '../../src/doc-gen/module-readme-generator';

// ── Helpers ─────────────────────────────────────────

const SERVER_INFO: ServerInfo = {
  title: 'XIIGen Engine',
  version: '1.0.0',
  description: 'Self-building engine API',
  serverUrl: 'http://localhost:3000',
};

const SAMPLE_ROUTES: RouteDefinition[] = [
  { path: '/health/live', method: 'get', tag: 'health', summary: 'Liveness probe' },
  {
    path: '/health/ready',
    method: 'get',
    tag: 'health',
    summary: 'Readiness probe',
    parameters: [{ name: 'X-Tenant-Id', in: 'header', required: true, schema: { type: 'string' } }],
  },
  {
    path: '/tenants',
    method: 'post',
    tag: 'tenants',
    summary: 'Create tenant',
    requestBody: {
      description: 'Tenant data',
      schema: { type: 'object', properties: { name: { type: 'string' } } },
    },
  },
  { path: '/tenants', method: 'get', tag: 'tenants', summary: 'List tenants' },
  {
    path: '/tenants/{id}',
    method: 'get',
    tag: 'tenants',
    summary: 'Get tenant',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
  },
  {
    path: '/tenants/{id}',
    method: 'delete',
    tag: 'tenants',
    summary: 'Deactivate tenant',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
  },
  {
    path: '/engine/generate',
    method: 'post',
    tag: 'engine',
    summary: 'Trigger generation',
    requestBody: { schema: { type: 'object' } },
  },
  { path: '/engine/status', method: 'get', tag: 'engine', summary: 'Engine status' },
];

const SAMPLE_MODULE: ModuleMetadata = {
  name: 'KernelModule',
  description: 'Core kernel with DataProcessResult and multi-tenant context.',
  phase: 'P1–P3',
  providers: [
    { name: 'ClsModule', type: 'service', description: 'CLS for tenant context' },
    { name: 'ScopeGuard', type: 'guard', description: 'Validates tenant context' },
  ],
  exports: ['ClsModule', 'ScopeGuard'],
  imports: [],
  isGlobal: true,
  dnaCompliance: ['DNA-3: DataProcessResult on all operations', 'DNA-5: TenantContext in CLS'],
  testCount: 350,
};

// ══════════════════════════════════════════════════════
// OpenApiGenerator
// ══════════════════════════════════════════════════════

describe('OpenApiGenerator', () => {
  let gen: OpenApiGenerator;

  beforeEach(() => {
    gen = new OpenApiGenerator();
  });

  it('should generate valid OpenAPI 3.0 structure', () => {
    const result = gen.generate(SAMPLE_ROUTES, SERVER_INFO);
    expect(result.isSuccess).toBe(true);
    const spec = result.data!;
    expect(spec.openapi).toBe('3.0.0');
    expect(spec.info).toBeDefined();
    expect(spec.paths).toBeDefined();
    expect(spec.components).toBeDefined();
  });

  it('should include correct info section', () => {
    const result = gen.generate(SAMPLE_ROUTES, SERVER_INFO);
    const info = result.data!.info as Record<string, unknown>;
    expect(info.title).toBe('XIIGen Engine');
    expect(info.version).toBe('1.0.0');
    expect(info.description).toBe('Self-building engine API');
  });

  it('should include server URL', () => {
    const result = gen.generate(SAMPLE_ROUTES, SERVER_INFO);
    const servers = result.data!.servers as Array<Record<string, unknown>>;
    expect(servers).toHaveLength(1);
    expect(servers[0].url).toBe('http://localhost:3000');
  });

  it('should generate paths for all routes', () => {
    const result = gen.generate(SAMPLE_ROUTES, SERVER_INFO);
    const paths = result.data!.paths as Record<string, Record<string, unknown>>;
    expect(paths['/health/live']).toBeDefined();
    expect(paths['/health/live'].get).toBeDefined();
    expect(paths['/tenants']).toBeDefined();
    expect(paths['/tenants'].post).toBeDefined();
    expect(paths['/tenants'].get).toBeDefined();
    expect(paths['/engine/generate']).toBeDefined();
    expect(paths['/engine/generate'].post).toBeDefined();
  });

  it('should include GET, POST, PUT, DELETE methods', () => {
    const result = gen.generate(SAMPLE_ROUTES, SERVER_INFO);
    const paths = result.data!.paths as Record<string, Record<string, unknown>>;
    expect(paths['/health/live'].get).toBeDefined();
    expect(paths['/tenants'].post).toBeDefined();
    expect(paths['/tenants/{id}'].get).toBeDefined();
    expect(paths['/tenants/{id}'].delete).toBeDefined();
  });

  it('should include operation summary', () => {
    const result = gen.generate(SAMPLE_ROUTES, SERVER_INFO);
    const paths = result.data!.paths as Record<string, Record<string, unknown>>;
    const liveOp = paths['/health/live'].get as Record<string, unknown>;
    expect(liveOp.summary).toBe('Liveness probe');
  });

  it('should include parameters when defined', () => {
    const result = gen.generate(SAMPLE_ROUTES, SERVER_INFO);
    const paths = result.data!.paths as Record<string, Record<string, unknown>>;
    const readyOp = paths['/health/ready'].get as Record<string, unknown>;
    const params = readyOp.parameters as Array<Record<string, unknown>>;
    expect(params).toHaveLength(1);
    expect(params[0].name).toBe('X-Tenant-Id');
    expect(params[0].in).toBe('header');
  });

  it('should include requestBody when defined', () => {
    const result = gen.generate(SAMPLE_ROUTES, SERVER_INFO);
    const paths = result.data!.paths as Record<string, Record<string, unknown>>;
    const createOp = paths['/tenants'].post as Record<string, unknown>;
    expect(createOp.requestBody).toBeDefined();
  });

  it('should group routes by tag', () => {
    const result = gen.generate(SAMPLE_ROUTES, SERVER_INFO);
    const tags = result.data!.tags as Array<Record<string, unknown>>;
    const tagNames = tags.map((t) => t.name);
    expect(tagNames).toContain('health');
    expect(tagNames).toContain('tenants');
    expect(tagNames).toContain('engine');
  });

  it('should include DataProcessResult in components/schemas', () => {
    const result = gen.generate(SAMPLE_ROUTES, SERVER_INFO);
    const components = result.data!.components as Record<string, unknown>;
    const schemas = components.schemas as Record<string, unknown>;
    expect(schemas.DataProcessResult).toBeDefined();
  });

  it('should generate operationId for each operation', () => {
    const result = gen.generate(SAMPLE_ROUTES, SERVER_INFO);
    const paths = result.data!.paths as Record<string, Record<string, unknown>>;
    const liveOp = paths['/health/live'].get as Record<string, unknown>;
    expect(liveOp.operationId).toBeDefined();
    expect(typeof liveOp.operationId).toBe('string');
  });

  it('should handle empty routes', () => {
    const result = gen.generate([], SERVER_INFO);
    expect(result.isSuccess).toBe(true);
    const spec = result.data!;
    expect(spec.openapi).toBe('3.0.0');
    expect(spec.paths).toEqual({});
  });

  it('should return DataProcessResult (DNA-3)', () => {
    const result = gen.generate(SAMPLE_ROUTES, SERVER_INFO);
    expect(result).toBeInstanceOf(DataProcessResult);
  });

  // ── getEngineRoutes ─────────────────────────────

  describe('getEngineRoutes', () => {
    it('should return standard engine routes', () => {
      const routes = gen.getEngineRoutes();
      expect(routes.length).toBeGreaterThanOrEqual(15);
    });

    it('should include health, tenants, engine, freedom, flows tags', () => {
      const routes = gen.getEngineRoutes();
      const tags = new Set(routes.map((r) => r.tag));
      expect(tags.has('health')).toBe(true);
      expect(tags.has('tenants')).toBe(true);
      expect(tags.has('engine')).toBe(true);
      expect(tags.has('freedom')).toBe(true);
      expect(tags.has('flows')).toBe(true);
    });

    it('should include /engine/generate POST route', () => {
      const routes = gen.getEngineRoutes();
      const genRoute = routes.find((r) => r.path === '/engine/generate' && r.method === 'post');
      expect(genRoute).toBeDefined();
      expect(genRoute!.requestBody).toBeDefined();
    });

    it('should include X-Tenant-Id header on tenant-scoped routes', () => {
      const routes = gen.getEngineRoutes();
      const genRoute = routes.find((r) => r.path === '/engine/generate');
      const params = genRoute!.parameters ?? [];
      expect(params.some((p) => p.name === 'X-Tenant-Id')).toBe(true);
    });

    it('should produce valid OpenAPI when used with generate()', () => {
      const routes = gen.getEngineRoutes();
      const result = gen.generate(routes, SERVER_INFO);
      expect(result.isSuccess).toBe(true);
      const paths = result.data!.paths as Record<string, unknown>;
      expect(Object.keys(paths).length).toBeGreaterThanOrEqual(10);
    });
  });
});

// ══════════════════════════════════════════════════════
// ModuleReadmeGenerator
// ══════════════════════════════════════════════════════

describe('ModuleReadmeGenerator', () => {
  let gen: ModuleReadmeGenerator;

  beforeEach(() => {
    gen = new ModuleReadmeGenerator();
  });

  describe('generateForModule', () => {
    it('should generate markdown with module name as title', () => {
      const result = gen.generateForModule(SAMPLE_MODULE);
      expect(result.isSuccess).toBe(true);
      expect(result.data!).toContain('# KernelModule');
    });

    it('should include phase info', () => {
      const result = gen.generateForModule(SAMPLE_MODULE);
      expect(result.data!).toContain('**Phase:** P1–P3');
    });

    it('should include test count', () => {
      const result = gen.generateForModule(SAMPLE_MODULE);
      expect(result.data!).toContain('**Tests:** 350');
    });

    it('should include @Global flag', () => {
      const result = gen.generateForModule(SAMPLE_MODULE);
      expect(result.data!).toContain('@Global');
    });

    it('should include overview description', () => {
      const result = gen.generateForModule(SAMPLE_MODULE);
      expect(result.data!).toContain('Core kernel');
    });

    it('should include providers table', () => {
      const result = gen.generateForModule(SAMPLE_MODULE);
      expect(result.data!).toContain('## Providers');
      expect(result.data!).toContain('`ClsModule`');
      expect(result.data!).toContain('`ScopeGuard`');
    });

    it('should include exports list', () => {
      const result = gen.generateForModule(SAMPLE_MODULE);
      expect(result.data!).toContain('## Exports');
      expect(result.data!).toContain('`ClsModule`');
    });

    it('should include DNA compliance notes', () => {
      const result = gen.generateForModule(SAMPLE_MODULE);
      expect(result.data!).toContain('## DNA Compliance');
      expect(result.data!).toContain('DNA-3');
      expect(result.data!).toContain('DNA-5');
    });

    it('should handle module with no exports', () => {
      const meta: ModuleMetadata = {
        ...SAMPLE_MODULE,
        name: 'EmptyModule',
        exports: [],
        imports: [],
      };
      const result = gen.generateForModule(meta);
      expect(result.isSuccess).toBe(true);
      expect(result.data!).not.toContain('## Exports');
    });

    it('should include imports list when present', () => {
      const meta: ModuleMetadata = {
        ...SAMPLE_MODULE,
        imports: ['FabricsModule', 'KernelModule'],
      };
      const result = gen.generateForModule(meta);
      expect(result.data!).toContain('## Imports');
      expect(result.data!).toContain('`FabricsModule`');
    });

    it('should return DataProcessResult (DNA-3)', () => {
      const result = gen.generateForModule(SAMPLE_MODULE);
      expect(result).toBeInstanceOf(DataProcessResult);
    });
  });

  describe('generateAll', () => {
    it('should generate READMEs for multiple modules', () => {
      const modules: ModuleMetadata[] = [
        SAMPLE_MODULE,
        { ...SAMPLE_MODULE, name: 'FabricsModule', description: 'Fabric layers.' },
      ];
      const result = gen.generateAll(modules);
      expect(result.isSuccess).toBe(true);
      expect(result.data!.size).toBe(2);
      expect(result.data!.has('KernelModule')).toBe(true);
      expect(result.data!.has('FabricsModule')).toBe(true);
    });

    it('should handle empty module list', () => {
      const result = gen.generateAll([]);
      expect(result.isSuccess).toBe(true);
      expect(result.data!.size).toBe(0);
    });
  });

  describe('getEngineModuleMetadata', () => {
    it('should return metadata for all engine modules', () => {
      const modules = gen.getEngineModuleMetadata();
      expect(modules.length).toBeGreaterThanOrEqual(10);
    });

    it('should include KernelModule', () => {
      const modules = gen.getEngineModuleMetadata();
      const kernel = modules.find((m) => m.name === 'KernelModule');
      expect(kernel).toBeDefined();
      expect(kernel!.isGlobal).toBe(true);
    });

    it('should include all expected modules', () => {
      const modules = gen.getEngineModuleMetadata();
      const names = modules.map((m) => m.name);
      expect(names).toContain('KernelModule');
      expect(names).toContain('FabricsModule');
      expect(names).toContain('FactoriesModule');
      expect(names).toContain('GuardrailsModule');
      expect(names).toContain('AfStationsModule');
      expect(names).toContain('EngineModule');
      expect(names).toContain('BootstrapModule');
      expect(names).toContain('ApiModule');
    });

    it('every module should have dnaCompliance entries', () => {
      const modules = gen.getEngineModuleMetadata();
      for (const m of modules) {
        expect(m.dnaCompliance.length).toBeGreaterThan(0);
      }
    });

    it('should produce valid READMEs when used with generateAll', () => {
      const modules = gen.getEngineModuleMetadata();
      const result = gen.generateAll(modules);
      expect(result.isSuccess).toBe(true);
      expect(result.data!.size).toBe(modules.length);
      // Each README should have a title
      for (const [name, readme] of result.data!.entries()) {
        expect(readme).toContain(`# ${name}`);
      }
    });
  });
});
