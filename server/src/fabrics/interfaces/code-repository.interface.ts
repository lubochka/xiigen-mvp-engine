/**
 * ICodeRepositoryService — read codebases and compare repository state without
 * knowing or caring which hosting platform the user's project lives on.
 *
 * Named for CAPABILITY (code-repository access), not provider (GitHub/GitLab).
 * ZipArchiveProvider is the minimum — enables intake of any uploaded codebase
 * without requiring remote credentials.
 *
 * Providers: ZipArchiveProvider, GitHubProvider, GitLabProvider,
 *            AzureDevOpsProvider, GiteaProvider, LocalGitProvider
 * FREEDOM config key: code_repo_provider (default: zip_archive)
 *
 * CF-793: All codebase reads go through ICodeRepositoryService.
 * CF-794: No direct GitHub/GitLab API calls in topology handlers.
 *
 * Z-2: New fabric interface — enables system intake pipeline (Phase One).
 */
export const CODE_REPOSITORY_SERVICE = 'CODE_REPOSITORY_SERVICE';

export interface FileTreeEntry {
  path: string;
  type: 'file' | 'directory';
  size?: number;
}

export interface CodebaseSnapshot {
  /** Full file tree of the codebase */
  fileTree: FileTreeEntry[];
  /** Get full contents of a specific file */
  getFileContents(path: string): Promise<string>;
  /**
   * Key dependency config files: package.json, composer.json, requirements.txt, etc.
   * Populated eagerly for ARCHITECTURE_SCAN + CONVENTION_EXTRACT prompts.
   */
  dependencyFiles: Record<string, string>;
  /** Entry point files detected from dependency config */
  entryPoints: string[];
}

export interface CodeDiff {
  filesAdded: string[];
  filesRemoved: string[];
  filesModified: string[];
  /** Unified diff per modified file */
  patches: Record<string, string>;
}

export interface ICodeRepositoryService {
  /** Read a single file at a given ref/branch/commit */
  getFile(path: string, ref: string): Promise<string>;

  /** List all files (optionally recursive) */
  getTree(ref: string, recursive?: boolean): Promise<FileTreeEntry[]>;

  /** Compare two refs — returns what changed */
  compareRefs(base: string, head: string): Promise<CodeDiff>;

  /** List available branches/tags */
  listBranches(): Promise<Array<{ name: string; isDefault: boolean }>>;

  /**
   * Full codebase snapshot for system intake pipeline.
   * Returns everything ARCHITECTURE_SCAN + CONVENTION_EXTRACT need.
   * ref defaults to HEAD/default branch.
   */
  getCodebase(ref?: string): Promise<CodebaseSnapshot>;
}
