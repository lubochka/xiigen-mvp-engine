/**
 * DockerEnvGeneratorService — concrete IDockerEnvGenerator.
 *
 * Generates docker-compose.tenant.yml (safe to commit) + .env.tenant (secrets,
 * NOT committed — returned via GenerateEnvResult.secretsToStore for the
 * orchestrator to push into ISecretsManager).
 *
 * Port allocation: random from the 20000-39999 window with 100 slots per
 * service offset by a hash of tenantId to reduce collision probability
 * across tenants running on the same host.
 *
 * XIIGEN-GAP-IMPLEMENTATION-PLAN-v1.1 GAP-26 step 4.
 */

import { Injectable, Inject } from '@nestjs/common';
import { promises as fs, existsSync } from 'fs';
import { createHash, randomBytes } from 'crypto';
import * as path from 'path';
import { ClsService } from 'nestjs-cls';
import { DataProcessResult } from '../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../kernel/microservice-base';
import { TENANT_CONTEXT_KEY, TenantContext } from '../../kernel/multi-tenant/tenant-context';
import {
  GenerateEnvParams,
  GenerateEnvResult,
  IDockerEnvGenerator,
} from '../interfaces/docker-env.fabric.interface';

/** Services in every tenant env. Ports allocated per service. */
const SERVICES = ['elasticsearch', 'redis', 'app', 'postgres'] as const;

/** Base of the port window. Service index × 100 + tenant offset. */
const PORT_WINDOW_BASE = 20000;
const PORT_WINDOW_SIZE = 20000;
const GENERATED_FORK_GITIGNORE_ENTRIES = [
  '.env.tenant',
  'node_modules/',
  'package-lock.json',
  'dist/',
  'coverage/',
] as const;

@Injectable()
export class DockerEnvGeneratorService
  extends MicroserviceBase
  implements IDockerEnvGenerator
{
  constructor(@Inject(ClsService) private readonly cls: ClsService) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'fabric.fork.docker-env',
        serviceName: 'DockerEnvGeneratorService',
        flowId: 'FLOW-47',
      }),
    });
  }

  async generate(params: GenerateEnvParams): Promise<DataProcessResult<GenerateEnvResult>> {
    // DNA-5: tenantId from AsyncLocalStorage; params.tenantId is deprecated
    // (kept on the interface for backward compat but now read from CLS).
    const tenantId = this.getTenantId();
    if (!tenantId) {
      return DataProcessResult.failure(
        'MISSING_TENANT',
        'tenantId required — AsyncLocalStorage context not set (DNA-5)',
      );
    }
    const { flowSlug, outputDir } = params;
    if (!flowSlug || !outputDir) {
      return DataProcessResult.failure(
        'VALIDATION_FAILURE',
        'flowSlug, outputDir are required',
      );
    }

    try {
      await fs.mkdir(outputDir, { recursive: true });

      const portMap = this.allocatePorts(tenantId);

      // Generate secrets (base64-random) — never written into composeFile
      const esPassword = this.randomSecret(32);
      const redisPassword = this.randomSecret(32);
      const appJwtSecret = this.randomSecret(48);
      const pgPassword = this.randomSecret(32);

      const composeContent = this.renderCompose(flowSlug, portMap);
      const envContent = this.renderEnv(flowSlug, portMap, {
        esPassword,
        redisPassword,
        appJwtSecret,
        pgPassword,
      });

      const composeFile = path.join(outputDir, 'docker-compose.tenant.yml');
      const envFile = path.join(outputDir, '.env.tenant');
      await fs.writeFile(composeFile, composeContent, 'utf8');
      await fs.writeFile(envFile, envContent, 'utf8');

      // Ensure .env.tenant is gitignored — safe-append
      const gitignore = path.join(outputDir, '.gitignore');
      await this.ensureGitignoreEntries(gitignore);

      const secretsKeyPrefix = `tenant_${tenantId}_${flowSlug}`;
      const secretsToStore: GenerateEnvResult['secretsToStore'] = [
        { key: `${secretsKeyPrefix}_es_password`, value: esPassword },
        { key: `${secretsKeyPrefix}_redis_password`, value: redisPassword },
        { key: `${secretsKeyPrefix}_app_jwt_secret`, value: appJwtSecret },
        { key: `${secretsKeyPrefix}_pg_password`, value: pgPassword },
      ];

      return DataProcessResult.success({ composeFile, envFile, portMap, secretsToStore });
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      return DataProcessResult.error('DOCKER_ENV_GEN_FAILED', e.message, e);
    }
  }

  /** Read tenant ID from AsyncLocalStorage via CLS (DNA-5). */
  private getTenantId(): string | null {
    try {
      const ctx = this.cls.get<TenantContext>(TENANT_CONTEXT_KEY);
      return ctx?.tenantId ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Deterministic-per-tenant port window with a small random jitter. Two
   * tenants forking different flows on the same host get different ports
   * (probability of collision ~ 1/20000 per service).
   */
  private allocatePorts(tenantId: string): Record<string, number> {
    const hash = parseInt(
      createHash('sha256').update(tenantId).digest('hex').slice(0, 8),
      16,
    );
    const baseOffset = hash % (PORT_WINDOW_SIZE - SERVICES.length * 100);
    const ports: Record<string, number> = {};
    SERVICES.forEach((svc, idx) => {
      ports[svc] = PORT_WINDOW_BASE + baseOffset + idx * 100;
    });
    return ports;
  }

  private randomSecret(bytes: number): string {
    return randomBytes(bytes).toString('base64').replace(/[+/=]/g, '').slice(0, bytes);
  }

  private async ensureGitignoreEntries(gitignore: string): Promise<void> {
    const current = existsSync(gitignore) ? await fs.readFile(gitignore, 'utf8') : '';
    const existing = new Set(
      current
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0),
    );
    const missing = GENERATED_FORK_GITIGNORE_ENTRIES.filter((entry) => !existing.has(entry));
    if (missing.length === 0) return;

    const prefix = current.length > 0 && !current.endsWith('\n') ? '\n' : '';
    await fs.writeFile(gitignore, `${current}${prefix}${missing.join('\n')}\n`, 'utf8');
  }

  private renderCompose(flowSlug: string, portMap: Record<string, number>): string {
    return `# Tenant-isolated Docker environment for ${flowSlug} fork.
# Generated by DockerEnvGeneratorService (GAP-26).
# Secrets are in .env.tenant — never commit that file.

services:
  elasticsearch:
    image: elasticsearch:8.13.0
    container_name: ${flowSlug}-es
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=true
      - ELASTIC_PASSWORD=\${ES_PASSWORD}
      - ES_JAVA_OPTS=-Xms512m -Xmx512m
    ports:
      - "${portMap['elasticsearch']}:9200"
    volumes:
      - ${flowSlug}-es-data:/usr/share/elasticsearch/data
    healthcheck:
      test: ["CMD-SHELL", "curl -sfu elastic:\${ES_PASSWORD} http://localhost:9200/_cluster/health || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 6

  redis:
    image: redis:7.2-alpine
    container_name: ${flowSlug}-redis
    command: ["redis-server", "--requirepass", "\${REDIS_PASSWORD}"]
    ports:
      - "${portMap['redis']}:6379"
    volumes:
      - ${flowSlug}-redis-data:/data

  postgres:
    image: postgres:16-alpine
    container_name: ${flowSlug}-pg
    environment:
      - POSTGRES_PASSWORD=\${PG_PASSWORD}
      - POSTGRES_DB=${flowSlug.replace(/-/g, '_')}
    ports:
      - "${portMap['postgres']}:5432"
    volumes:
      - ${flowSlug}-pg-data:/var/lib/postgresql/data

  app:
    build: .
    container_name: ${flowSlug}-app
    env_file: .env.tenant
    ports:
      - "${portMap['app']}:3000"
    depends_on:
      elasticsearch:
        condition: service_healthy
      redis:
        condition: service_started
      postgres:
        condition: service_started

volumes:
  ${flowSlug}-es-data:
  ${flowSlug}-redis-data:
  ${flowSlug}-pg-data:
`;
  }

  private renderEnv(
    flowSlug: string,
    portMap: Record<string, number>,
    secrets: { esPassword: string; redisPassword: string; appJwtSecret: string; pgPassword: string },
  ): string {
    return `# Tenant-local secrets + ports for ${flowSlug} fork.
# NEVER commit this file. .gitignore has been updated accordingly.
# Values are also stored in the tenant's secrets manager by the fork handler.

ES_PASSWORD=${secrets.esPassword}
REDIS_PASSWORD=${secrets.redisPassword}
APP_JWT_SECRET=${secrets.appJwtSecret}
PG_PASSWORD=${secrets.pgPassword}

ELASTICSEARCH_PORT=${portMap['elasticsearch']}
REDIS_PORT=${portMap['redis']}
APP_PORT=${portMap['app']}
POSTGRES_PORT=${portMap['postgres']}
`;
  }
}
