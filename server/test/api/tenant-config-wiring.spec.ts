import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const apiModulePath = path.join(repoRoot, 'server', 'src', 'api', 'api.module.ts');

const apiModuleSource = () => fs.readFileSync(apiModulePath, 'utf-8');

describe('BUG-ENGINE-002: tenant config endpoint wires FreedomConfigManager', () => {
  it('imports FreedomModule into ApiModule source', () => {
    expect(apiModuleSource()).toContain("import { FreedomModule } from '../freedom/freedom.module';");
  });

  it('adds FreedomModule to ApiModule imports so TenantController can receive FreedomConfigManager', () => {
    expect(apiModuleSource()).toMatch(/imports:\s*\[[^\]]*FreedomModule/s);
  });

  it('keeps TenantController in ApiModule providers after the FreedomModule dependency is available', () => {
    const source = apiModuleSource();
    expect(source).toMatch(/providers:\s*\[[^\]]*TenantController/s);
    expect(source.indexOf('imports:')).toBeLessThan(source.indexOf('providers:'));
  });
});
