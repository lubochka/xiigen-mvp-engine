# FLOW-01 fork-and-install evidence (Phase C11 — DEV-115, 2026-04-26)

This directory contains the captured evidence transcript for the
**real R2 (Fork-with-code) + R4 (Independent test) proof** — the harness
that copies the FLOW-01 module to a fresh temporary directory and proves
`npm install + tsc --noEmit + jest` all run green against the copy.

> **Why this matters**: V-14 instances A/B/C originally invoked the
> "synthetic-evidence transparency clause" (3 in-repo scaffold directories
> + 6 GitHub-style PNGs), with external GitHub provisioning *deferred to
> TIER-B promotion*. Phase C11 replaces that deferment with a real,
> in-process test that proves the module is genuinely fork-portable —
> independent of any GitHub-side infrastructure.

## What the harness does

`scripts/portability/flow-01-fork-and-install-test.py`:

1. **Copies** the engine boundary (kernel + fabrics/interfaces + freedom)
   plus the FLOW-01 services into a fresh temporary directory, preserving
   the `server/src/...` directory depth so relative imports resolve.
2. **Generates** a self-contained `package.json` (with all kernel + fabric
   dependencies pinned), `tsconfig.json`, and `jest.config.js`.
3. **Runs** `npm install` against the generated package.json — proves the
   declared dependencies actually resolve from npm's public registry.
4. **Runs** `npx tsc --noEmit` against the fork tree — proves the import
   graph closes inside the copied directory, with no leaks back to the
   source tree.
5. **Runs** `npx jest` against an embedded smoke spec that verifies all 3
   FLOW-01 service classes are importable, the DI tokens (`DATABASE_SERVICE`,
   `QUEUE_SERVICE`, `PASSWORD_HASHER_SERVICE`) are exposed, `DataProcessResult`
   constructors work, and `TENANT_CONTEXT_KEY` is exported.

If any step fails, the harness exits non-zero and the temporary fork
directory is preserved at `${TMPDIR}/xiigen-flow-01-fork-*/` for inspection.

## Evidence files in this directory

- `RUN-2026-04-26.txt` — captured transcript from the latest harness run.
  Each subsequent commit that touches the FLOW-01 module or its kernel/
  fabric/freedom dependencies should append (or replace) this transcript
  via the harness's stdout.

## CI/CD enforcement

The same harness is wired into GitHub Actions as
`.github/workflows/flow-01-portability-fork-ci.yml`. It runs on every
push to `main` and `claude/**` branches whenever any of the following
paths change:

- `server/src/engine/flows/user-registration/**`
- `server/src/kernel/**`
- `server/src/fabrics/interfaces/**`
- `server/src/freedom/**`
- `scripts/portability/flow-01-fork-and-install-test.py`
- `.github/workflows/flow-01-portability-fork-ci.yml`

That workflow is the **CI/CD really works** half of the proof. It
demonstrates that an external CI environment (Ubuntu runner, Node 24,
Python 3.12) can take a fresh checkout of this repo, run the harness,
and have it pass — exactly what a tenant's own CI would do against their
forked repository.

## Engine-side production fix (Phase C11)

The harness proves the *destination invariant*: a properly-assembled fork
compiles and tests. The engine's *production* fork pipeline
(`FlowFileAssemblerService`, `ForkFlowHandlerService`) was also updated
in this commit to produce equivalent output:

- `flow-file-assembler.ts` — added 3 directory-copy steps (kernel,
  fabric-interfaces, freedom) and 3 generated-file steps (package.json,
  tsconfig.json, jest.config.js). Services are now copied at full
  `server/src/engine/flows/{slug}/` depth instead of being flattened to
  a `server/` directory, so relative imports work.
- `fork-flow.handler.ts:121` — replaced
  `xiigen-${flowSlug}-${tenantId}` with `${tenantId}--${flowSlug}` to
  match the `{tenantId}--{moduleName}` double-dash convention from
  FLOW-PORTABILITY-TEST-PROTOCOL-v2.0 line 744.

Together these changes mean the engine's `ForkFlowHandlerService` now
produces a staging directory that the harness would accept as a valid
input — closing the source-side gap.

## Phase C12 (DEV-115, 2026-04-26) — architectural fix per `TENANT-CICD-CONNECTION-GUIDANCE-v1.0`

The harness in this directory proves the *destination invariant* — a copied
module compiles, installs, and runs `jest`. **It does not prove tenant
CI/CD works**, because the tenant connection (GitHub + Docker) is treated
as a precondition that the engine's fork pipeline must verify first.

Phase C12 ships the source-side architectural fix that closes that gap:

- **`ForkFlowHandlerService` Step 0 preflight** — both GitHub
  (`checkConnection({token, orgName})` → `{reachable, login, hasRepoScope,
  rateLimit}`) and Docker (`/v2/` ping) are checked **before** any
  destructive action. On failure: `rollbackState='PREFLIGHT'`,
  `failedStep='CONNECTION_PREFLIGHT'`, no repo created, no cleanup needed.
- **`IDockerRegistryService` fabric** (new) — `server/src/fabrics/interfaces/
  docker-registry.fabric.interface.ts` + impl with `WWW-Authenticate`
  challenge handling.
- **`IForkProvisioner` extensions** — `renameRepo` (post-AI-adaptation
  module-name change) + `setRepoSecrets` (encrypted GitHub Actions secrets;
  per Rule F-5 returns `SET_SECRETS_DEFERRED` until libsodium-wrappers
  ships — non-fatal so the fork-completion event still fires).
- **Tenant profile schema** — every `docs/portability/{flow-id}/tenant-
  profile-{tenantId}.json` now carries a canonical `connections` block
  with `{github, docker, ci}` sub-sections, each with
  `connectionVerified=false + lastVerifiedAt=null` initial state.
- **`flow-ci.yml`** — `FlowFileAssemblerService` injects this workflow into
  every assembled fork at `.github/workflows/flow-ci.yml` (renamed from
  `portability-fork-ci.yml`). It uses the tenant's own GitHub Actions
  secrets (`XIIGEN_TENANT_ID`, `DOCKER_REGISTRY_TOKEN`) which `setRepoSecrets`
  injects after `pushInitialCommit`.
- **`ciEvidence` schema on phase entries** — `STATE.json` phase entries
  for fork operations now carry a `ciEvidence` block with
  `{tenantId, repoUrl, workflowRunUrl, workflowConclusion, workflowRunAt,
  connectionVerifiedAt}`. `workflowRunUrl=null` means "not yet a real
  CI run" — the phase is at most `FORK_PUSHED` until a green tenant CI
  run is recorded.

## Carry-forward (per Rule F-7 — GENUINE EXTERNAL BLOCKERS)

These are infrastructural blockers — they do not need a decision from
the operator. The next session that has the credentials proceeds without
re-deciding anything.

1. **Set Vault keys for the 3 synthetic test tenants**:
   ```
   xiigen/tenants/acme-pro-members/github_token
   xiigen/tenants/acme-pro-members/github_org_name
   xiigen/tenants/acme-pro-members/docker_registry_url
   xiigen/tenants/acme-pro-members/docker_registry_token

   xiigen/tenants/northwind-guild/github_token
   xiigen/tenants/northwind-guild/github_org_name
   xiigen/tenants/northwind-guild/docker_registry_url
   xiigen/tenants/northwind-guild/docker_registry_token

   xiigen/tenants/tessera-collective/github_token
   xiigen/tenants/tessera-collective/github_org_name
   xiigen/tenants/tessera-collective/docker_registry_url
   xiigen/tenants/tessera-collective/docker_registry_token
   ```

2. **Wire `libsodium-wrappers`** into
   `GitHubProvisionerService.setRepoSecrets` to elevate
   `SET_SECRETS_DEFERRED` to a real success. The per-secret PUT to
   `/repos/{owner}/{repo}/actions/secrets/{name}` requires sealed-box
   encryption with the repo's public key.

3. **Run `fork-flow.integration.spec.ts`** under `INTEGRATION_TEST=true`
   with live Vault + a real GitHub PAT for at least one tenant. Per the
   guidance's 10-step chain, **step 9** —
   `workflowConclusion === 'success'` in the tenant's GitHub Actions
   tab — is the only step that closes the V-17 PROOF-7 R6 isolation
   certificate.

When (1) lands, the engine's fork pipeline proceeds end-to-end without
session intervention. The harness here continues to be the cheap,
in-monolith smoke test for the package boundary; the integration test
is the expensive, real-world test for the production pipeline.

## What this is NOT

This evidence does **not** prove a real tenant CI workflow ran green in
a real GitHub org. That requires steps 1–3 of the carry-forward to
land. Per Rule F-7, the session does not ask the operator for
credentials — it documents the gap and stops.
