/**
 * P13.3 Tests — Dockerfiles (Multi-Stage Builds)
 */

import * as fs from 'fs';
import * as path from 'path';
import { DockerfileValidator } from '../../src/devops/dockerfile-validator';

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
// DockerfileValidator — Unit Tests
// ══════════════════════════════════════════════════════

describe('DockerfileValidator', () => {
  let validator: DockerfileValidator;

  beforeEach(() => {
    validator = new DockerfileValidator();
  });

  it('should detect multi-stage builds', () => {
    const content =
      'FROM node:20-alpine AS builder\nRUN npm ci\nFROM node:20-alpine AS production\nCMD ["node"]';
    expect(validator.hasMultiStageBuilds(content)).toBe(true);
  });

  it('should reject single-stage builds', () => {
    const content = 'FROM node:20\nRUN npm ci\nCMD ["node"]';
    expect(validator.hasMultiStageBuilds(content)).toBe(false);
  });

  it('should detect HEALTHCHECK', () => {
    expect(validator.hasHealthCheck('HEALTHCHECK CMD wget -qO- http://localhost:3000')).toBe(true);
    expect(validator.hasHealthCheck('FROM node\nCMD ["node"]')).toBe(false);
  });

  it('should detect EXPOSE port', () => {
    expect(validator.hasExposePort('EXPOSE 3000', 3000)).toBe(true);
    expect(validator.hasExposePort('EXPOSE 80', 3000)).toBe(false);
  });

  it('should detect CMD or ENTRYPOINT', () => {
    expect(validator.hasCmdOrEntrypoint('CMD ["node", "main.js"]')).toBe(true);
    expect(validator.hasCmdOrEntrypoint('ENTRYPOINT ["node"]')).toBe(true);
    expect(validator.hasCmdOrEntrypoint('FROM node\nRUN npm ci')).toBe(false);
  });

  it('should detect alpine images', () => {
    expect(
      validator.usesAlpine('FROM node:20-alpine AS builder\nFROM node:20-alpine AS prod'),
    ).toBe(true);
    expect(validator.usesAlpine('FROM node:20 AS builder\nFROM node:20')).toBe(false);
  });

  it('should detect COPY --from for multi-stage', () => {
    expect(validator.hasCopyFromStage('COPY --from=builder /app/dist ./dist')).toBe(true);
    expect(validator.hasCopyFromStage('COPY --from=builder /app/dist ./dist', 'builder')).toBe(
      true,
    );
    expect(validator.hasCopyFromStage('COPY src/ ./src/')).toBe(false);
  });
});

// ══════════════════════════════════════════════════════
// Server Dockerfile
// ══════════════════════════════════════════════════════

describe('Server Dockerfile', () => {
  const content = readFile('server/Dockerfile') ?? readFile('Dockerfile');
  let validator: DockerfileValidator;

  beforeAll(() => {
    validator = new DockerfileValidator();
  });

  it('should exist and be non-empty', () => {
    expect(content).not.toBeNull();
    expect(content!.length).toBeGreaterThan(100);
  });

  it('should have multi-stage builds', () => {
    expect(validator.hasMultiStageBuilds(content!)).toBe(true);
  });

  it('should use alpine base images', () => {
    expect(validator.usesAlpine(content!)).toBe(true);
  });

  it('should have HEALTHCHECK', () => {
    expect(validator.hasHealthCheck(content!)).toBe(true);
  });

  it('should expose port 3000', () => {
    expect(validator.hasExposePort(content!, 3000)).toBe(true);
  });

  it('should have CMD instruction', () => {
    expect(validator.hasCmdOrEntrypoint(content!)).toBe(true);
  });

  it('should copy dist from builder stage', () => {
    expect(validator.hasCopyFromStage(content!, 'builder')).toBe(true);
  });

  it('should have version label', () => {
    expect(validator.hasLabel(content!, 'version')).toBe(true);
  });

  it('should run npm ci in builder', () => {
    expect(content!).toContain('npm ci');
  });

  it('should run npm run build in builder', () => {
    expect(content!).toContain('npm run build');
  });
});

// ══════════════════════════════════════════════════════
// Server .dockerignore
// ══════════════════════════════════════════════════════

describe('Server .dockerignore', () => {
  const content = readFile('server/.dockerignore') ?? readFile('.dockerignore');
  let validator: DockerfileValidator;

  beforeAll(() => {
    validator = new DockerfileValidator();
  });

  it('should exist', () => {
    expect(content).not.toBeNull();
  });

  it('should ignore node_modules', () => {
    expect(validator.dockerignoreHasPattern(content!, 'node_modules')).toBe(true);
  });

  it('should ignore dist', () => {
    expect(validator.dockerignoreHasPattern(content!, 'dist')).toBe(true);
  });

  it('should ignore coverage', () => {
    expect(validator.dockerignoreHasPattern(content!, 'coverage')).toBe(true);
  });

  it('should ignore .git', () => {
    expect(validator.dockerignoreHasPattern(content!, '.git')).toBe(true);
  });
});

// ══════════════════════════════════════════════════════
// Client Dockerfile
// ══════════════════════════════════════════════════════

describe('Client Dockerfile', () => {
  const content = readFile('client/Dockerfile');
  let validator: DockerfileValidator;

  beforeAll(() => {
    validator = new DockerfileValidator();
  });

  it('should exist and be non-empty', () => {
    expect(content).not.toBeNull();
    expect(content!.length).toBeGreaterThan(100);
  });

  it('should have multi-stage builds', () => {
    expect(validator.hasMultiStageBuilds(content!)).toBe(true);
  });

  it('should use alpine base images', () => {
    expect(validator.usesAlpine(content!)).toBe(true);
  });

  it('should expose port 80', () => {
    expect(validator.hasExposePort(content!, 80)).toBe(true);
  });

  it('should serve via nginx', () => {
    expect(content!).toContain('nginx');
  });

  it('should copy dist from builder to nginx html dir', () => {
    expect(content!).toContain('/usr/share/nginx/html');
  });

  it('should have CMD instruction', () => {
    expect(validator.hasCmdOrEntrypoint(content!)).toBe(true);
  });
});

// ══════════════════════════════════════════════════════
// Client nginx.conf
// ══════════════════════════════════════════════════════

describe('Client nginx.conf', () => {
  const content = readFile('client/nginx.conf');
  let validator: DockerfileValidator;

  beforeAll(() => {
    validator = new DockerfileValidator();
  });

  it('should exist and be non-empty', () => {
    expect(content).not.toBeNull();
    expect(content!.length).toBeGreaterThan(50);
  });

  it('should have SPA try_files routing', () => {
    expect(validator.nginxHasSpaRouting(content!)).toBe(true);
  });

  it('should have gzip enabled', () => {
    expect(validator.nginxHasGzip(content!)).toBe(true);
  });

  it('should have cache headers for static assets', () => {
    expect(validator.nginxHasCacheHeaders(content!)).toBe(true);
  });

  it('should listen on port 80', () => {
    expect(validator.nginxListensOn(content!, 80)).toBe(true);
  });
});
