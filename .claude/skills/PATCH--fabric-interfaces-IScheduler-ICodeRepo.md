# PATCH: fabric-interfaces.md — ISchedulerService + ICodeRepositoryService
## Applies to: reference--fabric-interfaces.md
## Version: v1.0.3 | Date: 2026-03-24
## Source: XIIGEN-SKILLS-GAP-DOCUMENT.md — EDIT 9

---

## HOW TO APPLY

Add both interfaces to the fabric interfaces reference document.

---

## NEW INTERFACE: ISchedulerService

Introduced to resolve T48 (EmailVerificationWait) INCOMPATIBLE verdict for WordPress.
Replaces direct Bull/BullMQ import with a fabric-mediated scheduler.

FREEDOM config key: `scheduler_provider` — values: `bull` | `action_scheduler` | `laravel_queue`

```typescript
export const SCHEDULER_SERVICE = 'SCHEDULER_SERVICE';

export interface ISchedulerService {
  /**
   * Schedule a one-time action after a delay.
   *
   * Providers:
   *   bull (NestJS):             Bull/BullMQ delayed job
   *   action_scheduler (WordPress): as_schedule_single_action(time() + delayMs/1000, ...)
   *   laravel_queue (Laravel):   Queue::later(Carbon::now()->addMilliseconds(delayMs), ...)
   *
   * Selection: FREEDOM config key `scheduler_provider`.
   * DNA-8: scheduleDelayed() must be called AFTER the record is stored (outbox first).
   */
  scheduleDelayed(
    action: string,
    delayMs: number,
    payload: Record<string, unknown>,
    idempotencyKey?: string,    // prevents duplicate scheduling on retry
  ): Promise<{ jobId: string }>;

  /**
   * Cancel a previously scheduled action.
   * Idempotent — no error if jobId not found (already fired or already cancelled).
   */
  cancelScheduled(jobId: string): Promise<void>;

  /**
   * Check if a scheduled action is still pending.
   */
  isScheduled(jobId: string): Promise<boolean>;
}
```

**Reclassification this enables:**

```typescript
// BEFORE (T48 php-wordpress):
'php-wordpress': { tier: 'INCOMPATIBLE', degradedReason: 'No native scheduler' }

// AFTER (T48 php-wordpress):
'php-wordpress': {
  tier: 'IMPL_VARIES_WITH_PROVIDER',
  incompatibilityLevel: 'mechanism',  // mechanism, not design
  fabricInterface: 'ISchedulerService',
  implementationNotes: 'Use Action Scheduler plugin provider. scheduleDelayed maps to as_schedule_single_action(time() + delayMs/1000, action, payload). Accept eventual enforcement (within 60s).',
  neutralConcepts: ['24h TTL enforcement', 'token expiry triggering'],
  degraded: true,
  degradedReason: 'Action Scheduler has eventual enforcement — not real-time like Bull'
}
```

---

## NEW INTERFACE: ICodeRepositoryService

Introduced for analysis workflows that require cross-branch file access.
Primary provider: GitHub MCP (ADAPTATION scope — not new infrastructure).

FREEDOM config keys: `code_repo_provider` (`github_mcp` | `github_https` | `local_git`),
`github_owner`, `github_repo`

```typescript
export const CODE_REPOSITORY_SERVICE = 'CODE_REPOSITORY_SERVICE';

export interface CodeDiff {
  filesAdded:    string[];
  filesRemoved:  string[];
  filesModified: string[];
  patches:       Record<string, string>;  // filename → unified diff
}

export interface ICodeRepositoryService {
  /**
   * Compare two refs (branches, tags, commits).
   * Primary use: merge analysis, finding missing files between branches.
   * Provider: GitHub MCP compare_branches, or GitHub API /compare endpoint.
   */
  compareRefs(base: string, head: string): Promise<CodeDiff>;

  /**
   * Read a file at a specific ref without checkout.
   * Primary use: reading contract files from another branch during analysis.
   */
  getFile(path: string, ref: string): Promise<string>;

  /**
   * Get full recursive file tree for a ref.
   * Primary use: structural branch comparison.
   */
  getTree(ref: string): Promise<string[]>;

  /**
   * Extract artifact numbers from a contract file at a given ref.
   * Primary use: INFRA-AUDIT step 1.5 — verify number consistency across branches.
   * Returns highest assigned T, F, Family numbers found in the file.
   */
  getArtifactNumbers(
    contractFilePath: string,
    ref: string,
  ): Promise<{
    taskTypes:  string[];
    factories:  string[];
    families:   string[];
    bfaRules:   string[];
  }>;
}
```

**Note:** This interface is defined for completeness. In practice, use the
`code-execution--github-lab-SKILL.md` with direct GitHub MCP calls or HTTPS
for analysis work. Wrapping in the fabric layer is only necessary when analysis
is invoked from within an AF pipeline topology (where fabric injection is required).
For Claude Code analysis sessions: use the skill directly.

---

## FREEDOM CONFIG ADDITIONS

```json
{
  "scheduler_provider": "bull",
  "code_repo_provider": "github_mcp",
  "github_owner": "${GITHUB_OWNER}",
  "github_repo": "${GITHUB_REPO}",
  "github_pat": "${secrets.GITHUB_PAT}"
}
```
