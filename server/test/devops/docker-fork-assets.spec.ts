import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const dockerComposePath = path.join(repoRoot, 'docker-compose.yml');
const dockerfilePath = path.join(repoRoot, 'server', 'Dockerfile');

const read = (filePath: string) => fs.readFileSync(filePath, 'utf-8');

describe('BUG-ENGINE-001: Docker fork runtime includes FlowFileAssembler assets', () => {
  it('uses the repository root as the server Docker build context', () => {
    const compose = read(dockerComposePath);

    expect(compose).toContain('context: .');
    expect(compose).toContain('dockerfile: server/Dockerfile');
  });

  it('copies server source assets into the production image layout expected by FlowFileAssembler', () => {
    const dockerfile = read(dockerfilePath);

    expect(dockerfile).toMatch(/COPY\s+server\/src\/\s+\.\/server\/src\//);
  });

  it('copies business, portability, and session docs into the production image for real fork assembly', () => {
    const dockerfile = read(dockerfilePath);

    expect(dockerfile).toMatch(/COPY\s+docs\/business-flows\/\s+\.\/docs\/business-flows\//);
    expect(dockerfile).toMatch(/COPY\s+docs\/portability\/\s+\.\/docs\/portability\//);
    expect(dockerfile).toMatch(/COPY\s+docs\/sessions\/\s+\.\/docs\/sessions\//);
  });
});
