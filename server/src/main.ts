import 'dotenv/config'; // Load .env before anything else (local dev; Docker sets vars directly)
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BootstrapSeeder, MASTER_TENANT_ID } from './bootstrap/bootstrap-seeder.service';
import { HealthController } from './api/health.controller';
import { TenantController } from './api/tenant.controller';
import { EngineController } from './api/engine.controller';
import { FlowGenerator } from './engine/flow-generator';
import { IntakePipelineService } from './engine/intake/intake-pipeline.service';
import { RequirementExtractorService } from './engine/requirement-extractor/requirement-extractor.service';
import { CrudGeneratorService } from './engine/crud-generator/crud-generator.service';
import { TestGeneratorService } from './engine/test-generator/test-generator.service';
import { DifficultyPredictorService } from './engine/difficulty-predictor/difficulty-predictor.service';
import { AI_PROVIDER, type IAiProvider } from './fabrics/interfaces/ai-provider.interface';
import type { ICodeRepositoryService } from './fabrics/interfaces/code-repository.interface';
import { DATABASE_SERVICE, type IDatabaseService } from './fabrics/interfaces/database.interface';
import { LearningSnapshotService } from './learning/learning-snapshot.service';
import { ModelTeachingMatrix } from './learning/model-teaching-matrix';
import {
  json as jsonParser,
  urlencoded as urlencodedParser,
  Router,
  type Request,
  type Response,
} from 'express';
import { ClsService } from 'nestjs-cls';
import { TenantRegistry } from './kernel/multi-tenant/tenant-registry.service';
import { TenantContext, TENANT_CONTEXT_KEY } from './kernel/multi-tenant/tenant-context';
// FLOW-48 i18n-translation — route wiring
import { TranslationResolverService } from './engine/flows/i18n-translation/translation-resolver.service';
import { UserPreferencesManagerService } from './engine/flows/i18n-translation/user-preferences-manager.service';

// ── Helper: translate DataProcessResult → HTTP response ─
function sendResult(
  res: Response,
  result: { isSuccess: boolean; data?: unknown; errorCode?: string; errorMessage?: string },
  successStatus = 200,
): void {
  if (result.isSuccess) {
    res.status(successStatus).json({ success: true, data: result.data });
  } else {
    const code = result.errorCode ?? 'INTERNAL_ERROR';
    const httpStatus =
      code === 'NOT_FOUND'
        ? 404
        : code === 'MISSING_TENANT' || code === 'INVALID_CONTRACT' || code === 'MISSING_ID'
          ? 400
          : code === 'BUDGET_EXCEEDED'
            ? 429
            : code === 'NOT_READY'
              ? 503
              : 500;
    res
      .status(httpStatus)
      .json({ success: false, error: code, message: result.errorMessage ?? 'Internal error' });
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS — allow client (vite dev + nginx) to reach the API
  app.enableCors({
    origin: '*',
    methods: 'GET,POST,PUT,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,X-Tenant-Id,Authorization',
  });

  // ── Pull controllers from DI container ───────────────
  const health = app.get(HealthController);
  const tenant = app.get(TenantController);
  const cls = app.get(ClsService);
  const tenantRegistry = app.get(TenantRegistry);

  // ── Manually wire FlowGenerator + EngineController ───
  // FlowGenerator is not registered in EngineModule — it's wired here
  // because it requires IAiProvider from FabricsModule.
  const aiProvider = app.get<IAiProvider>(AI_PROVIDER);
  // CODE_REPOSITORY_SERVICE is project-scoped — not globally registered (Z-2 note).
  // Intake endpoint is legacy; pass null stub to avoid startup crash.
  const codeRepoService: ICodeRepositoryService = null as unknown as ICodeRepositoryService;
  const dbService = app.get<IDatabaseService>(DATABASE_SERVICE);
  const flowGen = new FlowGenerator();
  const intakePipeline = new IntakePipelineService(codeRepoService, aiProvider, dbService);
  const requirementExtractor = new RequirementExtractorService(aiProvider, dbService);
  const crudGenerator = new CrudGeneratorService(aiProvider, dbService);
  const testGenerator = new TestGeneratorService(aiProvider, dbService);
  const difficultyPredictor = new DifficultyPredictorService(dbService);
  const engine = new EngineController(
    flowGen,
    intakePipeline,
    requirementExtractor,
    crudGenerator,
    testGenerator,
    difficultyPredictor,
  );
  const snapshotService = app.get(LearningSnapshotService);
  const matrix = app.get(ModelTeachingMatrix);

  // ── Register routes on the underlying Express instance ──
  // NestJS uses Express under the hood. Since no @Controller decorators exist,
  // the Express instance is clean — we register routes directly.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const server = app.getHttpAdapter().getInstance() as any;

  // Ensure JSON body parsing is available on all routes
  server.use(jsonParser());
  server.use(urlencodedParser({ extended: true }));

  // ── Build router (mounted at both '/' and '/api') ────
  // Client API calls go through nginx which proxies /api/* → server /api/*
  // Direct calls (global-setup, seed-data) hit server without prefix.
  const router = Router();

  // ── Health ───────────────────────────────────────────
  router.get('/health/live', async (_req: Request, res: Response) => {
    const result = await health.live();
    sendResult(res, result);
  });

  router.get('/health/ready', async (req: Request, res: Response) => {
    const hdr = req.headers['x-tenant-id'];
    const tenantId = (Array.isArray(hdr) ? hdr[0] : hdr) ?? 'system';
    const result = await health.ready(tenantId);
    sendResult(res, result, result.isSuccess ? 200 : 503);
  });

  router.get('/health/status', async (req: Request, res: Response) => {
    const hdr = req.headers['x-tenant-id'];
    const tenantId = (Array.isArray(hdr) ? hdr[0] : hdr) ?? 'system';
    const result = await health.status(tenantId);
    sendResult(res, result);
  });

  // ── Tenants ──────────────────────────────────────────
  router.post('/tenants', async (req: Request, res: Response) => {
    const result = await tenant.create(req.body);
    sendResult(res, result, 201);
  });

  router.get('/tenants', async (_req: Request, res: Response) => {
    const result = await tenant.list();
    sendResult(res, result);
  });

  router.get('/tenants/:id', async (req: Request, res: Response) => {
    const result = await tenant.getById(String(req.params['id']));
    sendResult(res, result);
  });

  router.put('/tenants/:id/config', async (req: Request, res: Response) => {
    const result = await tenant.updateConfig(String(req.params['id']), req.body);
    sendResult(res, result);
  });

  router.put('/tenants/:id/keys', async (req: Request, res: Response) => {
    const tenantId = String(req.params['id']);
    // Raw Express routes bypass NestJS middleware (ClsMiddleware + TenantContextMiddleware).
    // ByokKeyStoreService.writeKeys → db.storeDocument requires CLS context — set it up manually.
    const tenantResult = await tenantRegistry.findById(tenantId);
    if (!tenantResult.isSuccess || !tenantResult.data) {
      res.status(403).json({
        success: false,
        error: 'TENANT_NOT_FOUND',
        message: `Tenant '${tenantId}' not found`,
      });
      return;
    }
    const tenantCtx = new TenantContext(tenantResult.data);
    const result = await cls.runWith(
      { [TENANT_CONTEXT_KEY]: tenantCtx } as Record<string | symbol, unknown>,
      () => tenant.setKeys(tenantId, req.body as Record<string, string>),
    );
    sendResult(res, result);
  });

  router.put('/tenants/:id/quotas', async (req: Request, res: Response) => {
    const result = await tenant.setQuotas(String(req.params['id']), req.body);
    sendResult(res, result);
  });

  router.delete('/tenants/:id', async (req: Request, res: Response) => {
    const result = await tenant.deactivate(String(req.params['id']));
    sendResult(res, result);
  });

  // ── Engine ───────────────────────────────────────────
  router.post('/engine/generate', async (req: Request, res: Response) => {
    // tenantId: prefer body.tenant_id, fallback to X-Tenant-Id header
    const hdrTenant = req.headers['x-tenant-id'];
    const tenantId: string =
      req.body?.tenant_id ?? (Array.isArray(hdrTenant) ? hdrTenant[0] : hdrTenant) ?? '';
    const { tenant_id: _tid, ...contractParams } = req.body ?? {};
    const result = await engine.generate(tenantId, contractParams);
    sendResult(res, result);
  });

  router.get('/engine/history', async (_req: Request, res: Response) => {
    const result = await engine.history();
    sendResult(res, result);
  });

  router.get('/engine/status', async (_req: Request, res: Response) => {
    const result = await engine.status();
    sendResult(res, result);
  });

  router.get('/engine/contracts', async (_req: Request, res: Response) => {
    const result = await engine.listContracts();
    sendResult(res, result);
  });

  router.get('/engine/contracts/:id', async (req: Request, res: Response) => {
    const result = await engine.getContract(String(req.params['id']));
    sendResult(res, result);
  });

  router.post('/engine/intake', async (req: Request, res: Response) => {
    const { projectId, zipPath, repoUrl } = req.body as Record<string, string>;
    const result = await engine.intake({ projectId, zipPath, repoUrl });
    sendResult(res, result, result.isSuccess ? 201 : undefined);
  });

  router.post('/engine/extract-requirements', async (req: Request, res: Response) => {
    const { description, projectId } = req.body as Record<string, string>;
    const result = await engine.extractRequirements({ description, projectId });
    sendResult(res, result);
  });

  router.post('/engine/generate-crud', async (req: Request, res: Response) => {
    const { entity, projectId } = req.body as Record<string, string>;
    const attributes = (req.body as Record<string, unknown>)['attributes'] as string[] | undefined;
    const result = await engine.generateCrud({ entity, attributes: attributes ?? [], projectId });
    sendResult(res, result);
  });

  router.post('/engine/generate-tests', async (req: Request, res: Response) => {
    const { generatedCode, archetype, projectId } = req.body as Record<string, string>;
    const ironRules = (req.body as Record<string, unknown>)['ironRules'] as
      | Array<{ ruleId: string; text: string }>
      | undefined;
    const result = await engine.generateTests({
      generatedCode,
      archetype: archetype ?? 'UNKNOWN',
      ironRules: ironRules ?? [],
      projectId,
    });
    sendResult(res, result);
  });

  router.post('/engine/predict-difficulty', async (req: Request, res: Response) => {
    const { taskTypeId, archetype } = req.body as Record<string, string>;
    const ironRules = (req.body as Record<string, unknown>)['ironRules'] as
      | Array<{ ruleId: string; text: string }>
      | undefined;
    const result = await engine.predictDifficulty({
      taskTypeId,
      archetype,
      ironRules: ironRules ?? [],
    });
    sendResult(res, result);
  });

  // ── Learning Snapshot Routes ─────────────────────────

  router.post('/learning/snapshot', async (req: Request, res: Response) => {
    try {
      const { tenantId, phase, aiProvider, ragProvider, flowId, notes } = req.body;
      const result = snapshotService.createSnapshot(tenantId, {
        phase,
        aiProvider,
        ragProvider,
        flowId,
        notes,
      });
      res
        .status(result.isSuccess ? 201 : 400)
        .json(
          result.isSuccess
            ? result.data
            : { error: result.errorCode, message: result.errorMessage },
        );
    } catch (err: unknown) {
      res
        .status(500)
        .json({ error: 'INTERNAL', message: err instanceof Error ? err.message : String(err) });
    }
  });

  router.post('/learning/snapshot/restore', async (req: Request, res: Response) => {
    try {
      const { snapshotId } = req.body;
      const result = snapshotService.restoreSnapshot(snapshotId);
      res
        .status(result.isSuccess ? 200 : 404)
        .json(
          result.isSuccess
            ? { restored: true, snapshotId }
            : { error: result.errorCode, message: result.errorMessage },
        );
    } catch (err: unknown) {
      res
        .status(500)
        .json({ error: 'INTERNAL', message: err instanceof Error ? err.message : String(err) });
    }
  });

  router.get('/learning/snapshots', (_req: Request, res: Response) => {
    try {
      const result = snapshotService.listSnapshots();
      res.json(result.isSuccess ? result.data : []);
    } catch (err: unknown) {
      res
        .status(500)
        .json({ error: 'INTERNAL', message: err instanceof Error ? err.message : String(err) });
    }
  });

  router.get('/learning/snapshot/compare', (req: Request, res: Response) => {
    try {
      const a = req.query['a'] as string;
      const b = req.query['b'] as string;
      if (!a || !b) {
        return res
          .status(400)
          .json({ error: 'MISSING_PARAMS', message: 'Query params a and b required' });
      }
      const result = snapshotService.compareSnapshots(a, b);
      res
        .status(result.isSuccess ? 200 : 404)
        .json(
          result.isSuccess
            ? result.data
            : { error: result.errorCode, message: result.errorMessage },
        );
    } catch (err: unknown) {
      res
        .status(500)
        .json({ error: 'INTERNAL', message: err instanceof Error ? err.message : String(err) });
    }
  });

  // ── Learning Matrix Routes ────────────────────────────

  router.post('/learning/matrix/run', async (req: Request, res: Response) => {
    try {
      const { tenantId, taskType, combinations, baselineSnapshotId, scoreThreshold } = req.body;
      const result = await matrix.runMatrix(tenantId, taskType, {
        combinations,
        baselineSnapshotId,
        scoreThreshold,
      });
      res
        .status(result.isSuccess ? 200 : 400)
        .json(
          result.isSuccess
            ? result.data
            : { error: result.errorCode, message: result.errorMessage },
        );
    } catch (err: unknown) {
      res
        .status(500)
        .json({ error: 'INTERNAL', message: err instanceof Error ? err.message : String(err) });
    }
  });

  router.get('/learning/matrix/default', (_req: Request, res: Response) => {
    res.json(matrix.getDefaultMatrix());
  });

  // ── Dynamic CRUD (DNA-6, Rule 7) ────────────────────
  // Generic indexName CRUD. Tenant scope from X-Tenant-Id header;
  // defaults to MASTER_TENANT_ID for admin-panel callers.
  // Index names MUST start with 'xiigen-' to prevent cross-namespace leaks.
  const INDEX_PREFIX_RE = /^xiigen-[a-z0-9-]+$/;

  async function withTenantContext<T>(
    rawTenant: unknown,
    fn: () => Promise<T>,
  ): Promise<{ ok: true; value: T } | { ok: false; code: string; message: string }> {
    const tenantId =
      (Array.isArray(rawTenant) ? rawTenant[0] : (rawTenant as string | undefined)) ??
      MASTER_TENANT_ID;
    const tenantResult = await tenantRegistry.findById(tenantId);
    if (!tenantResult.isSuccess || !tenantResult.data) {
      return { ok: false, code: 'TENANT_NOT_FOUND', message: `Tenant '${tenantId}' not found` };
    }
    const ctx = new TenantContext(tenantResult.data);
    const value = await cls.runWith(
      { [TENANT_CONTEXT_KEY]: ctx } as Record<string | symbol, unknown>,
      fn,
    );
    return { ok: true, value };
  }

  function validateIndex(indexName: string): boolean {
    return INDEX_PREFIX_RE.test(indexName);
  }

  router.get('/dynamic/:indexName', async (req: Request, res: Response) => {
    const indexName = String(req.params['indexName']);
    if (!validateIndex(indexName)) {
      res.status(400).json({ success: false, error: 'INVALID_INDEX', message: 'Index must match xiigen-<slug>' });
      return;
    }
    const size = Math.min(Number(req.query['size'] ?? 50), 200);
    const from = Math.max(Number(req.query['from'] ?? 0), 0);
    const { size: _s, from: _f, ...filters } = req.query as Record<string, unknown>;
    const ctx = await withTenantContext(req.headers['x-tenant-id'], () =>
      dbService.searchDocuments(indexName, filters, size, from),
    );
    if (!ctx.ok) {
      res.status(404).json({ success: false, error: ctx.code, message: ctx.message });
      return;
    }
    sendResult(res, ctx.value);
  });

  router.get('/dynamic/:indexName/:docId', async (req: Request, res: Response) => {
    const indexName = String(req.params['indexName']);
    const docId = String(req.params['docId']);
    if (!validateIndex(indexName)) {
      res.status(400).json({ success: false, error: 'INVALID_INDEX', message: 'Index must match xiigen-<slug>' });
      return;
    }
    const ctx = await withTenantContext(req.headers['x-tenant-id'], () =>
      dbService.getDocument(indexName, docId),
    );
    if (!ctx.ok) {
      res.status(404).json({ success: false, error: ctx.code, message: ctx.message });
      return;
    }
    sendResult(res, ctx.value);
  });

  router.post('/dynamic/:indexName', async (req: Request, res: Response) => {
    const indexName = String(req.params['indexName']);
    if (!validateIndex(indexName)) {
      res.status(400).json({ success: false, error: 'INVALID_INDEX', message: 'Index must match xiigen-<slug>' });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const ctx = await withTenantContext(req.headers['x-tenant-id'], () =>
      dbService.storeDocument(indexName, body),
    );
    if (!ctx.ok) {
      res.status(404).json({ success: false, error: ctx.code, message: ctx.message });
      return;
    }
    sendResult(res, ctx.value, 201);
  });

  router.put('/dynamic/:indexName/:docId', async (req: Request, res: Response) => {
    const indexName = String(req.params['indexName']);
    const docId = String(req.params['docId']);
    if (!validateIndex(indexName)) {
      res.status(400).json({ success: false, error: 'INVALID_INDEX', message: 'Index must match xiigen-<slug>' });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const ctx = await withTenantContext(req.headers['x-tenant-id'], () =>
      dbService.storeDocument(indexName, body, docId),
    );
    if (!ctx.ok) {
      res.status(404).json({ success: false, error: ctx.code, message: ctx.message });
      return;
    }
    sendResult(res, ctx.value);
  });

  router.delete('/dynamic/:indexName/:docId', async (req: Request, res: Response) => {
    const indexName = String(req.params['indexName']);
    const docId = String(req.params['docId']);
    if (!validateIndex(indexName)) {
      res.status(400).json({ success: false, error: 'INVALID_INDEX', message: 'Index must match xiigen-<slug>' });
      return;
    }
    const ctx = await withTenantContext(req.headers['x-tenant-id'], () =>
      dbService.deleteDocument(indexName, docId),
    );
    if (!ctx.ok) {
      res.status(404).json({ success: false, error: ctx.code, message: ctx.message });
      return;
    }
    sendResult(res, ctx.value);
  });

  // ── FLOW-48 i18n-translation routes ───────────────────────────────────────
  const translationResolver = app.get(TranslationResolverService);
  const userPreferencesManager = app.get(UserPreferencesManagerService);

  // GET /api/translations/:moduleId/:locale — CF-812: always HTTP 200
  router.get('/translations/:moduleId/:locale', async (req: Request, res: Response) => {
    const { moduleId, locale } = req.params as { moduleId: string; locale: string };
    let sourceKeys: string[] = [];
    try {
      const raw = String(req.query['sourceKeys'] ?? '');
      if (raw) sourceKeys = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
      if (!Array.isArray(sourceKeys)) sourceKeys = [];
    } catch {
      sourceKeys = [];
    }
    try {
      const ctx = await withTenantContext(req.headers['x-tenant-id'], () =>
        translationResolver.resolve(moduleId, locale, sourceKeys),
      );
      // CF-812: any outcome → 200. The resolver already returns fallback on error paths.
      const body = ctx.ok && ctx.value && ctx.value.isSuccess
        ? ctx.value.data
        : { fallback: true, locale: 'en' };
      res.status(200).json({ success: true, data: body });
    } catch {
      // Belt-and-suspenders: unhandled throw → still 200 with fallback marker
      res.status(200).json({ success: true, data: { fallback: true, locale: 'en' } });
    }
  });

  // GET /api/users/:userId/preferences
  router.get('/users/:userId/preferences', async (req: Request, res: Response) => {
    const { userId } = req.params as { userId: string };
    const ctx = await withTenantContext(req.headers['x-tenant-id'], () =>
      userPreferencesManager.getPreferences(userId),
    );
    if (!ctx.ok) {
      res.status(404).json({ success: false, error: ctx.code, message: ctx.message });
      return;
    }
    sendResult(res, ctx.value);
  });

  // PUT /api/users/:userId/preferences — body: { locale, userOverride? }
  router.put('/users/:userId/preferences', async (req: Request, res: Response) => {
    const { userId } = req.params as { userId: string };
    const body = (req.body ?? {}) as { locale?: string; userOverride?: boolean };
    const ctx = await withTenantContext(req.headers['x-tenant-id'], () =>
      userPreferencesManager.setPreferences(userId, {
        locale: String(body.locale ?? ''),
        userOverride: body.userOverride,
      }),
    );
    if (!ctx.ok) {
      res.status(404).json({ success: false, error: ctx.code, message: ctx.message });
      return;
    }
    sendResult(res, ctx.value);
  });

  // Mount at root (for direct calls: global-setup, seed-data, E2E global-setup)
  server.use('/', router);
  // Mount at /api (for browser calls proxied through nginx: client API calls)
  server.use('/api', router);

  // CF-1 (Phase A-0): Seed default tenant provider pool from BOOTSTRAP_* env vars.
  // Idempotent — no-op on subsequent startups. BOOTSTRAP_* lines can be removed after first run.
  const seeder = app.get(BootstrapSeeder);
  await seeder.run(); // Platform master tenant — MASTER_TENANT_ID is fixed; no arg needed

  const port = process.env['PORT'] ?? 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[XIIGen] Engine running on port ${port}`);
}

bootstrap();
