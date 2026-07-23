import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

import { DockerEnvGeneratorService } from './docker-env-generator';
import { TenantContext, TenantRecord, TENANT_CONTEXT_KEY } from '../../kernel/multi-tenant/tenant-context';

jest.setTimeout(30_000);

class FakeClsService {
  private readonly tenant = new TenantContext({
    id: 'acme-corp',
    name: 'acme-corp',
    status: 'active',
    plan: {
      name: 'free',
      maxApiCallsPerMinute: 60,
      maxTokensPerDay: 100000,
      maxStorageMb: 500,
    },
    configOverrides: {},
    apiKeys: {},
    createdAt: '2026-05-03T00:00:00.000Z',
    updatedAt: '2026-05-03T00:00:00.000Z',
  } satisfies TenantRecord);

  get<T>(key: string): T | undefined {
    if (key === TENANT_CONTEXT_KEY) return this.tenant as T;
    return undefined;
  }
}

describe('DockerEnvGeneratorService', () => {
  let outputDir: string;

  beforeEach(async () => {
    outputDir = await mkdtemp(join(tmpdir(), 'xiigen-docker-env-generator-'));
  });

  afterEach(async () => {
    await rm(outputDir, { recursive: true, force: true });
  });

  it('gitignores tenant secrets and local fork install artifacts', async () => {
    const service = new DockerEnvGeneratorService(new FakeClsService() as never);

    const result = await service.generate({
      flowSlug: 'user-groups-communities',
      outputDir,
    });

    expect(result.isSuccess).toBe(true);
    const gitignore = await readFile(join(outputDir, '.gitignore'), 'utf8');
    expect(gitignore.split(/\r?\n/).filter(Boolean)).toEqual(
      expect.arrayContaining([
        '.env.tenant',
        'node_modules/',
        'package-lock.json',
        'dist/',
        'coverage/',
      ]),
    );
  });
});
