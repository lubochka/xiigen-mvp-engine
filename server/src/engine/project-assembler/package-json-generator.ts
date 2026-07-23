// server/src/engine/project-assembler/package-json-generator.ts
// Generates package.json including ALL transitive dependencies.
//
// DNA-3: returns DataProcessResult, never throws
// DNA-1: uses Record<string, unknown> for all data

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../kernel/data-process-result';
import { RepoDeps } from '../migration/dep-resolver.handler';

@Injectable()
export class PackageJsonGenerator {
  async generatePackageJson(
    repoId: string,
    repoDeps: RepoDeps,
    versionRegistry: Map<string, string>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const dependencies: Record<string, string> = {};
    // Include ALL deps (direct + transitive) in package.json
    for (const dep of repoDeps.allDeps) {
      dependencies[dep] = versionRegistry.get(dep) ?? 'latest';
    }
    return DataProcessResult.success({
      name: repoId,
      version: '1.0.0',
      dependencies,
      devDependencies: {},
      scripts: { build: 'tsc', start: 'node dist/main.js', test: 'jest' },
    });
  }
}
