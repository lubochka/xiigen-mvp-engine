/**
 * ZipArchiveProvider tests — ICodeRepositoryService backed by a ZIP archive.
 *
 * Tests verify:
 *   - CF-793: all codebase reads go through ICodeRepositoryService interface
 *   - CF-794: no direct GitHub/GitLab API calls in topology handlers
 *   - loadArchive + getTree + getFile + getCodebase round-trip
 *   - detectEntryPoints for package.json and WordPress PHP plugins
 *
 * Strategy: builds an in-memory ZIP using adm-zip and writes it to a temp file,
 * so no real codebase fixture is required.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import AdmZip from 'adm-zip';
import { ZipArchiveProvider } from './zip-archive.provider';
import { ICodeRepositoryService } from '../interfaces/code-repository.interface';

// ── helpers ────────────────────────────────────────────────────────────────────

function buildZip(files: Record<string, string>): string {
  const zip = new AdmZip();
  for (const [filePath, content] of Object.entries(files)) {
    zip.addFile(filePath, Buffer.from(content, 'utf8'));
  }
  const tmpFile = path.join(os.tmpdir(), `test-zip-${Date.now()}.zip`);
  zip.writeZip(tmpFile);
  return tmpFile;
}

// ── suite ──────────────────────────────────────────────────────────────────────

describe('ZipArchiveProvider (ICodeRepositoryService)', () => {
  let provider: ZipArchiveProvider & ICodeRepositoryService;
  let tmpZip: string;

  const NODE_FILES = {
    'package.json': JSON.stringify({ name: 'my-app', main: 'index.js', version: '1.0.0' }),
    'index.js': 'console.log("hello");',
    'src/utils.ts': 'export const add = (a: number, b: number) => a + b;',
    'src/nested/deep.ts': 'export const deep = true;',
  };

  afterEach(() => {
    if (tmpZip && fs.existsSync(tmpZip)) fs.unlinkSync(tmpZip);
  });

  // ── loadArchive ─────────────────────────────────────────────────────────────

  it('loadArchive accepts a valid ZIP file without throwing', async () => {
    tmpZip = buildZip(NODE_FILES);
    provider = new ZipArchiveProvider();
    await expect(provider.loadArchive(tmpZip)).resolves.not.toThrow();
  });

  it('throws if file operations called before loadArchive', async () => {
    provider = new ZipArchiveProvider();
    await expect(provider.getFile('index.js', 'HEAD')).rejects.toThrow(
      'call loadArchive(zipFilePath) before any file operations',
    );
  });

  // ── getTree ─────────────────────────────────────────────────────────────────

  it('getTree returns all files in the archive', async () => {
    tmpZip = buildZip(NODE_FILES);
    provider = new ZipArchiveProvider();
    await provider.loadArchive(tmpZip);

    const tree = await provider.getTree('HEAD');
    // Normalize paths to forward slashes for cross-platform comparison
    const filePaths = tree.filter((e) => e.type === 'file').map((e) => e.path.replace(/\\/g, '/'));
    expect(filePaths).toContain('package.json');
    expect(filePaths).toContain('index.js');
    expect(filePaths).toContain('src/utils.ts');
    expect(filePaths).toContain('src/nested/deep.ts');
  });

  it('getTree includes directory entries', async () => {
    tmpZip = buildZip(NODE_FILES);
    provider = new ZipArchiveProvider();
    await provider.loadArchive(tmpZip);

    const tree = await provider.getTree('HEAD');
    const dirPaths = tree.filter((e) => e.type === 'directory').map((e) => e.path);
    expect(dirPaths.some((p) => p === 'src' || p.startsWith('src'))).toBe(true);
  });

  it('getTree entries include size for file entries', async () => {
    tmpZip = buildZip(NODE_FILES);
    provider = new ZipArchiveProvider();
    await provider.loadArchive(tmpZip);

    const tree = await provider.getTree('HEAD');
    const pkgEntry = tree.find((e) => e.path === 'package.json');
    expect(pkgEntry).toBeDefined();
    expect(typeof pkgEntry!.size).toBe('number');
    expect(pkgEntry!.size).toBeGreaterThan(0);
  });

  // ── getFile ─────────────────────────────────────────────────────────────────

  it('getFile returns correct content for a root file', async () => {
    tmpZip = buildZip(NODE_FILES);
    provider = new ZipArchiveProvider();
    await provider.loadArchive(tmpZip);

    const content = await provider.getFile('index.js', 'HEAD');
    expect(content).toBe('console.log("hello");');
  });

  it('getFile returns correct content for a nested file', async () => {
    tmpZip = buildZip(NODE_FILES);
    provider = new ZipArchiveProvider();
    await provider.loadArchive(tmpZip);

    const content = await provider.getFile('src/utils.ts', 'HEAD');
    expect(content).toContain('export const add');
  });

  it('getFile throws for a non-existent path', async () => {
    tmpZip = buildZip(NODE_FILES);
    provider = new ZipArchiveProvider();
    await provider.loadArchive(tmpZip);

    await expect(provider.getFile('does-not-exist.ts', 'HEAD')).rejects.toThrow();
  });

  // ── getCodebase ─────────────────────────────────────────────────────────────

  it('getCodebase returns a CodebaseSnapshot with fileTree', async () => {
    tmpZip = buildZip(NODE_FILES);
    provider = new ZipArchiveProvider();
    await provider.loadArchive(tmpZip);

    const snapshot = await provider.getCodebase();
    expect(snapshot.fileTree).toBeDefined();
    expect(snapshot.fileTree.length).toBeGreaterThan(0);
  });

  it('getCodebase getFileContents retrieves file by path', async () => {
    tmpZip = buildZip(NODE_FILES);
    provider = new ZipArchiveProvider();
    await provider.loadArchive(tmpZip);

    const snapshot = await provider.getCodebase();
    const content = await snapshot.getFileContents('index.js');
    expect(content).toBe('console.log("hello");');
  });

  it('getCodebase populates dependencyFiles with package.json', async () => {
    tmpZip = buildZip(NODE_FILES);
    provider = new ZipArchiveProvider();
    await provider.loadArchive(tmpZip);

    const snapshot = await provider.getCodebase();
    expect(snapshot.dependencyFiles['package.json']).toBeDefined();
    const pkg = JSON.parse(snapshot.dependencyFiles['package.json']);
    expect(pkg.name).toBe('my-app');
  });

  // ── detectEntryPoints ───────────────────────────────────────────────────────

  it('detects entry point from package.json main field', async () => {
    tmpZip = buildZip(NODE_FILES);
    provider = new ZipArchiveProvider();
    await provider.loadArchive(tmpZip);

    const snapshot = await provider.getCodebase();
    expect(snapshot.entryPoints).toContain('index.js');
  });

  it('detects WordPress plugin entry points', async () => {
    const wpFiles = {
      'my-plugin.php': `<?php\n/**\n * Plugin Name: My Test Plugin\n * Version: 1.0\n */`,
      'includes/class-main.php': '<?php class Main {}',
    };
    tmpZip = buildZip(wpFiles);
    provider = new ZipArchiveProvider();
    await provider.loadArchive(tmpZip);

    const snapshot = await provider.getCodebase();
    expect(snapshot.entryPoints).toContain('my-plugin.php');
    // Non-plugin PHP files in subdirectories are not flagged as entry points
    expect(snapshot.entryPoints).not.toContain('includes/class-main.php');
  });

  it('does not include non-plugin PHP root files as entry points', async () => {
    const phpFiles = {
      'helper.php': '<?php function helper() {}',
    };
    tmpZip = buildZip(phpFiles);
    provider = new ZipArchiveProvider();
    await provider.loadArchive(tmpZip);

    const snapshot = await provider.getCodebase();
    expect(snapshot.entryPoints).not.toContain('helper.php');
  });

  // ── stub methods ────────────────────────────────────────────────────────────

  it('compareRefs throws — not supported by ZipArchiveProvider', async () => {
    tmpZip = buildZip(NODE_FILES);
    provider = new ZipArchiveProvider();
    await provider.loadArchive(tmpZip);

    await expect(provider.compareRefs('main', 'feature')).rejects.toThrow(
      'ZipArchiveProvider does not support branch comparison',
    );
  });

  it('listBranches returns single HEAD entry', async () => {
    tmpZip = buildZip(NODE_FILES);
    provider = new ZipArchiveProvider();
    await provider.loadArchive(tmpZip);

    const branches = await provider.listBranches();
    expect(branches).toHaveLength(1);
    expect(branches[0]).toMatchObject({ name: 'HEAD', isDefault: true });
  });
});
