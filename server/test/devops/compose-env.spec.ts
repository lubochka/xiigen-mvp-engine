/**
 * P13.4 Tests — Docker Compose + Environment Config
 */

import * as fs from 'fs';
import * as path from 'path';
import { ComposeValidator } from '../../src/devops/compose-validator';

// ── Helpers ─────────────────────────────────────────

function readFile(filePath: string): string | null {
  const serverRoot = path.resolve(__dirname, '../../');
  const projectRoot = path.resolve(__dirname, '../../../');
  const candidates = [path.resolve(serverRoot, filePath), path.resolve(projectRoot, filePath)];
  for (const p of candidates) {
    try {
      return fs.readFileSync(p, 'utf-8');
    } catch {
      /* next */
    }
  }
  return null;
}

// ══════════════════════════════════════════════════════
// ComposeValidator — Unit Tests
// ══════════════════════════════════════════════════════

describe('ComposeValidator', () => {
  let validator: ComposeValidator;
  const sampleCompose = `
version: "3.9"
services:
  server:
    build: ./server
    ports:
      - "3000:3000"
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000"]
    environment:
      - NODE_ENV=production
  client:
    build: ./client
    ports:
      - "80:80"
    depends_on:
      - server
networks:
  app-net:
    driver: bridge
volumes:
  data:
`;

  beforeEach(() => {
    validator = new ComposeValidator();
  });

  it('should detect services', () => {
    expect(validator.hasService(sampleCompose, 'server')).toBe(true);
    expect(validator.hasService(sampleCompose, 'client')).toBe(true);
    expect(validator.hasService(sampleCompose, 'missing')).toBe(false);
  });

  it('should detect health checks', () => {
    expect(validator.hasHealthCheck(sampleCompose, 'server')).toBe(true);
    expect(validator.hasHealthCheck(sampleCompose, 'client')).toBe(false);
  });

  it('should detect depends_on', () => {
    expect(validator.hasDependsOn(sampleCompose, 'client', 'server')).toBe(true);
    expect(validator.hasDependsOn(sampleCompose, 'server', 'client')).toBe(false);
  });

  it('should detect port mappings', () => {
    expect(validator.hasPort(sampleCompose, 'server', 3000)).toBe(true);
    expect(validator.hasPort(sampleCompose, 'client', 80)).toBe(true);
    expect(validator.hasPort(sampleCompose, 'server', 8080)).toBe(false);
  });

  it('should detect defaulted environment port mappings', () => {
    const compose = sampleCompose.replace('"3000:3000"', '"${SERVER_PORT:-3000}:3000"');
    expect(validator.hasPort(compose, 'server', 3000)).toBe(true);
  });

  it('should detect networks', () => {
    expect(validator.hasNetwork(sampleCompose)).toBe(true);
    expect(validator.hasNetwork(sampleCompose, 'app-net')).toBe(true);
  });

  it('should detect environment config', () => {
    expect(validator.hasEnvironment(sampleCompose, 'server')).toBe(true);
  });

  it('should detect volumes section', () => {
    expect(validator.hasVolumes(sampleCompose)).toBe(true);
  });

  it('should validate env variables', () => {
    const env = 'NODE_ENV=production\nPORT=3000\nLOG_LEVEL=info';
    expect(validator.envHasVariable(env, 'NODE_ENV')).toBe(true);
    expect(validator.envHasVariable(env, 'MISSING')).toBe(false);
    expect(validator.envGetDefault(env, 'LOG_LEVEL')).toBe('info');
  });
});

// ══════════════════════════════════════════════════════
// docker-compose.yml
// ══════════════════════════════════════════════════════

describe('docker-compose.yml', () => {
  const content = readFile('docker-compose.yml');
  let validator: ComposeValidator;

  beforeAll(() => {
    validator = new ComposeValidator();
  });

  it('should exist and be non-empty', () => {
    expect(content).not.toBeNull();
    expect(content!.length).toBeGreaterThan(100);
  });

  it('should have server service', () => {
    expect(validator.hasService(content!, 'server')).toBe(true);
  });

  it('should have client service', () => {
    expect(validator.hasService(content!, 'client')).toBe(true);
  });

  it('should expose server on port 3000', () => {
    expect(validator.hasPort(content!, 'server', 3000)).toBe(true);
  });

  it('should expose client on port 80', () => {
    expect(validator.hasPort(content!, 'client', 80)).toBe(true);
  });

  it('should have client depend on server', () => {
    expect(validator.hasDependsOn(content!, 'client', 'server')).toBe(true);
  });

  it('should have server healthcheck', () => {
    expect(validator.hasHealthCheck(content!, 'server')).toBe(true);
  });

  it('should have client healthcheck', () => {
    expect(validator.hasHealthCheck(content!, 'client')).toBe(true);
  });

  it('should have network defined', () => {
    expect(validator.hasNetwork(content!)).toBe(true);
  });

  it('should have server environment config', () => {
    expect(validator.hasEnvironment(content!, 'server')).toBe(true);
  });

  it('should have elasticsearch in optional infra profile', () => {
    expect(validator.hasService(content!, 'elasticsearch')).toBe(true);
    expect(validator.hasProfile(content!, 'elasticsearch', 'infra')).toBe(true);
  });

  it('should have redis in optional infra profile', () => {
    expect(validator.hasService(content!, 'redis')).toBe(true);
    expect(validator.hasProfile(content!, 'redis', 'infra')).toBe(true);
  });

  it('should have elasticsearch healthcheck', () => {
    expect(validator.hasHealthCheck(content!, 'elasticsearch')).toBe(true);
  });

  it('should have redis healthcheck', () => {
    expect(validator.hasHealthCheck(content!, 'redis')).toBe(true);
  });

  it('should have volumes section', () => {
    expect(validator.hasVolumes(content!)).toBe(true);
  });

  it('should have server restart policy', () => {
    expect(validator.hasRestartPolicy(content!, 'server')).toBe(true);
  });
});

// ══════════════════════════════════════════════════════
// .env.example
// ══════════════════════════════════════════════════════

describe('.env.example', () => {
  const content = readFile('.env.example');
  let validator: ComposeValidator;

  beforeAll(() => {
    validator = new ComposeValidator();
  });

  it('should exist and be non-empty', () => {
    expect(content).not.toBeNull();
    expect(content!.length).toBeGreaterThan(50);
  });

  it('should have NODE_ENV', () => {
    expect(validator.envHasVariable(content!, 'NODE_ENV')).toBe(true);
  });

  it('should have PORT', () => {
    expect(validator.envHasVariable(content!, 'PORT')).toBe(true);
  });

  it('should have LOG_LEVEL defaulting to info', () => {
    expect(validator.envGetDefault(content!, 'LOG_LEVEL')).toBe('info');
  });

  it('should have DATABASE_PROVIDER defaulting to in_memory', () => {
    expect(validator.envGetDefault(content!, 'DATABASE_PROVIDER')).toBe('in_memory');
  });

  it('should have QUEUE_PROVIDER', () => {
    expect(validator.envHasVariable(content!, 'QUEUE_PROVIDER')).toBe(true);
  });

  it('should have AI_PROVIDER defaulting to mock', () => {
    expect(validator.envGetDefault(content!, 'AI_PROVIDER')).toBe('mock');
  });

  it('should have ELASTICSEARCH_URL', () => {
    expect(validator.envHasVariable(content!, 'ELASTICSEARCH_URL')).toBe(true);
  });

  it('should have REDIS_URL', () => {
    expect(validator.envHasVariable(content!, 'REDIS_URL')).toBe(true);
  });

  it('should have DEFAULT_TENANT_ID', () => {
    expect(validator.envHasVariable(content!, 'DEFAULT_TENANT_ID')).toBe(true);
  });
});
