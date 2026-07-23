/**
 * CI Docker Integration Job — Structural Tests
 *
 * Validates that .github/workflows/ci.yml contains the docker-integration
 * job with the correct structure. Companion to ci-e2e.spec.ts.
 *
 * WF-1 applied: CI_PATH uses 3 levels up (not 4) from server/test/p13_5/
 *   server/test/p13_5/ → server/test/ → server/ → project root
 */

import * as fs from 'fs';
import * as path from 'path';

// Path from server/test/p13_5/ → 3 levels up to project root → .github/workflows/
const CI_PATH = path.resolve(__dirname, '../../../.github/workflows/ci.yml');

describe('CI — docker-integration job', () => {
  let content: string;

  beforeAll(() => {
    expect(fs.existsSync(CI_PATH)).toBe(true);
    content = fs.readFileSync(CI_PATH, 'utf-8');
  });

  it('ci.yml should exist', () => {
    expect(fs.existsSync(CI_PATH)).toBe(true);
  });

  it('should have a docker-integration job', () => {
    expect(content).toContain('docker-integration:');
  });

  it('docker-integration should need server-ci', () => {
    const jobStart = content.indexOf('docker-integration:');
    expect(jobStart).toBeGreaterThan(-1);
    const jobSegment = content.slice(jobStart, jobStart + 500);
    expect(jobSegment).toContain('server-ci');
  });

  it('docker-integration should run npm run test:docker', () => {
    expect(content).toContain('test:docker');
  });

  it('docker-integration should set SKIP_DOCKER_TESTS to 0', () => {
    expect(content).toContain('SKIP_DOCKER_TESTS');
    const skipIdx = content.indexOf('SKIP_DOCKER_TESTS');
    const vicinity = content.slice(skipIdx, skipIdx + 30);
    expect(vicinity).toContain('0');
  });

  it('docker-integration should declare an Elasticsearch service', () => {
    expect(content).toContain('elasticsearch:8.12.0');
    expect(content).toContain('19200:9200');
  });

  it('docker-build should depend on docker-integration', () => {
    const buildStart = content.indexOf('docker-build:');
    expect(buildStart).toBeGreaterThan(-1);
    const buildSegment = content.slice(buildStart, buildStart + 300);
    expect(buildSegment).toContain('docker-integration');
  });

  it('docker-integration should run on ubuntu-latest', () => {
    const jobStart = content.indexOf('docker-integration:');
    const jobSegment = content.slice(jobStart, jobStart + 300);
    expect(jobSegment).toContain('ubuntu-latest');
  });
});
