---
name: blast-radius-tagger
version: "1.0.0"
sk_number: SK-425
priority: MANDATORY
load_order: 25
---

# Blast Radius Tagger Skill

Categorizes every planned deliverable file before writing it. Files with higher blast radius get additional validation gates. Prevents treating a CI workflow and a test spec as equivalent deliverables.

## When to Invoke

- At G0 (Infrastructure Discovery) — tag every planned deliverable before writing
- At session end — verify PRODUCTION-CI files have syntax validation and rollback documented
- In any session that mixes GOVERNANCE + TEST-ONLY or PRODUCTION-CI + TEST-ONLY deliverables

## Blast Radius Categories

| Tag | Definition | Examples | Additional Gates Required |
|-----|-----------|---------|--------------------------|
| TEST-ONLY | Only affects test suite | `*.spec.ts`, `*.test.tsx` | Standard gates only |
| GOVERNANCE | Affects agent/CI behavior | `.agents/` & `.Codex/` skill files, `SESSION-*.md` | Separate commit BEFORE code files |
| PRODUCTION-CI | Affects build/deploy pipeline | `ci.yml`, `docker-compose.yml` | YAML validation + rollback command + scope guard |
| INTERFACE | Public contract reused by others | a public TS `interface`, a NestJS DI token, an exported DTO / `zod` schema crossing a module boundary | **MUST trigger the blast-radius ASSESSOR** (the `blast-radius-assessor` skill) before any edit — interface changes are CRITICAL by default |
| SOURCE | Affects runtime code (non-interface) | `server/src/**`, `client/src/**` impl files | `npx tsc --noEmit` per file |

**INTERFACE is a stronger tag than SOURCE and takes priority.** A file that
declares a public `interface`, a DI token, or an exported DTO/`zod` contract used
outside its own module is tagged INTERFACE, not SOURCE — even though it also lives
under `server/src/**`. Changing it can break every consumer in the repo, so the
tagger must hand it to the **Assessor** (CRITICAL/HIGH/MEDIUM/LOW + find-all-callers
+ before/after gates) rather than treat it as an ordinary source edit. The split is
deliberate: this tagger only *categorizes files before writing*; the Assessor
*measures how far a contract change propagates*. Tagger → INTERFACE → Assessor.

## Rules

1. **Tag first** — assign blast radius to every deliverable before writing any file
2. **PRODUCTION-CI** files MUST document: (a) syntax validation command, (b) git rollback command, (c) scope guard ("only on push to X branch" verified in the file)
3. **GOVERNANCE** files in mixed sessions MUST be committed separately BEFORE code files (prevents mixed uncommitted state if session fails mid-way)
4. **SOURCE** files MUST pass `npx tsc --noEmit` before session is declared done
5. **INTERFACE** files MUST NOT be edited until the blast-radius Assessor has run
   (the `blast-radius-assessor` skill): classify CRITICAL/HIGH/MEDIUM/LOW,
   grep every implementer and caller, and record before/after protection gates. A
   public contract change tagged only SOURCE is a tagging defect.
6. **Never mix** TEST-ONLY and PRODUCTION-CI in the same commit

## PRODUCTION-CI Validation Template

```bash
# After editing ci.yml:
# 1. YAML syntax validation
python3 -c "import yaml, sys; yaml.safe_load(open(sys.argv[1]))" .github/workflows/ci.yml
# OR: node -e "require('js-yaml').load(require('fs').readFileSync('.github/workflows/ci.yml','utf8'))"

# 2. Rollback command (document before editing)
git revert HEAD -- .github/workflows/ci.yml  # if committed
# OR: git checkout -- .github/workflows/ci.yml  # if not yet committed

# 3. Scope guard — verify the job has an 'if:' condition limiting when it runs
grep "if: github" .github/workflows/ci.yml
```

## Session 4 Tagging

| File | Tag | Extra Gates |
|------|-----|-------------|
| `flow-generator-contract.spec.ts` | TEST-ONLY | None |
| `ci-docker-integration.spec.ts` | TEST-ONLY | None |
| `.github/workflows/ci.yml` | PRODUCTION-CI | YAML validation (WF-7) + rollback command (WF-8) |
| 6 governance skill files | GOVERNANCE | Commit separately first (WF-6) |

## Anti-Pattern

Session 4 edits `ci.yml` (PRODUCTION-CI) alongside 8 test files (TEST-ONLY) and 6 skill files (GOVERNANCE). Without tagging, all 15 files would be treated identically — the ci.yml edit would have no YAML validation gate and no documented rollback.
