/**
 * ZipArchiveProvider — ICodeRepositoryService backed by an uploaded ZIP file.
 *
 * ZipArchiveProvider is the MINIMUM implementation that unblocks Phase One
 * (system intake pipeline). Enables intake of any uploaded codebase without
 * remote credentials or API tokens.
 *
 * CF-793: All codebase reads go through ICodeRepositoryService — not direct file access.
 * CF-794: No direct GitHub/GitLab API calls in topology handlers.
 *
 * Z-2: Minimum viable ICodeRepositoryService for intake pipeline.
 */
import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import AdmZip from 'adm-zip';
import {
  ICodeRepositoryService,
  FileTreeEntry,
  CodebaseSnapshot,
  CodeDiff,
} from '../interfaces/code-repository.interface';

@Injectable()
export class ZipArchiveProvider implements ICodeRepositoryService {
  private extractPath: string | null = null;

  /**
   * Load and extract a ZIP archive before using other methods.
   * Call this once after injecting the provider, before any file operations.
   */
  async loadArchive(zipFilePath: string): Promise<void> {
    this.extractPath = fs.mkdtempSync(path.join(os.tmpdir(), 'xiigen-repo-'));
    const zip = new AdmZip(zipFilePath);
    zip.extractAllTo(this.extractPath, true);
  }

  private ensureLoaded(): void {
    if (!this.extractPath) {
      throw new Error(
        'ZipArchiveProvider: call loadArchive(zipFilePath) before any file operations',
      );
    }
  }

  async getFile(filePath: string, _ref: string): Promise<string> {
    this.ensureLoaded();
    const fullPath = path.join(this.extractPath!, filePath);
    return fs.readFileSync(fullPath, 'utf8');
  }

  async getTree(_ref: string, recursive = true): Promise<FileTreeEntry[]> {
    this.ensureLoaded();
    const entries: FileTreeEntry[] = [];

    const walk = (dir: string, base: string) => {
      const dirEntries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of dirEntries) {
        const rel = base ? path.join(base, entry.name) : entry.name;
        if (entry.isDirectory()) {
          entries.push({ path: rel, type: 'directory' });
          if (recursive) walk(path.join(dir, entry.name), rel);
        } else {
          const stat = fs.statSync(path.join(dir, entry.name));
          entries.push({ path: rel, type: 'file', size: stat.size });
        }
      }
    };

    walk(this.extractPath!, '');
    return entries;
  }

  async getCodebase(_ref?: string): Promise<CodebaseSnapshot> {
    this.ensureLoaded();
    const fileTree = await this.getTree('HEAD', true);

    // Well-known dependency config filenames
    const DEPENDENCY_FILE_NAMES = [
      'package.json',
      'package-lock.json',
      'composer.json',
      'composer.lock',
      'requirements.txt',
      'pyproject.toml',
      'setup.py',
      'Gemfile',
      'Gemfile.lock',
      'go.mod',
      'go.sum',
      'pom.xml',
      'build.gradle',
      'build.gradle.kts',
      'Cargo.toml',
      '.csproj',
    ];

    const dependencyFiles: Record<string, string> = {};
    for (const depName of DEPENDENCY_FILE_NAMES) {
      const match = fileTree.find(
        (f) =>
          f.type === 'file' &&
          (f.path.endsWith(`/${depName}`) || f.path === depName || f.path.endsWith(`.csproj`)),
      );
      if (match) {
        try {
          dependencyFiles[depName] = await this.getFile(match.path, 'HEAD');
        } catch {
          // File unreadable — skip silently
        }
      }
    }

    return {
      fileTree,
      getFileContents: (p) => this.getFile(p, 'HEAD'),
      dependencyFiles,
      entryPoints: this.detectEntryPoints(fileTree, dependencyFiles),
    };
  }

  private detectEntryPoints(tree: FileTreeEntry[], depFiles: Record<string, string>): string[] {
    const entries: string[] = [];

    // package.json main / module fields
    if (depFiles['package.json']) {
      try {
        const pkg = JSON.parse(depFiles['package.json']);
        if (pkg.main) entries.push(String(pkg.main));
        if (pkg.module) entries.push(String(pkg.module));
      } catch {
        /* skip */
      }
    }

    // WordPress plugin: root-level PHP files with Plugin Name header
    const phpRoots = tree.filter((f) => f.type === 'file' && /^[^/\\]+\.php$/.test(f.path));
    for (const php of phpRoots) {
      try {
        const fullPath = path.join(this.extractPath!, php.path);
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('Plugin Name:')) entries.push(php.path);
      } catch {
        /* skip */
      }
    }

    // composer.json autoload
    if (depFiles['composer.json']) {
      try {
        const composer = JSON.parse(depFiles['composer.json']);
        if (composer.autoload?.['psr-4']) {
          entries.push(...Object.values<string>(composer.autoload['psr-4']));
        }
      } catch {
        /* skip */
      }
    }

    return [...new Set(entries)];
  }

  // ── Stub methods — not needed for intake use case ──────────────────────────

  async compareRefs(_base: string, _head: string): Promise<CodeDiff> {
    throw new Error('ZipArchiveProvider does not support branch comparison — use GitHubProvider');
  }

  async listBranches(): Promise<Array<{ name: string; isDefault: boolean }>> {
    return [{ name: 'HEAD', isDefault: true }];
  }
}
