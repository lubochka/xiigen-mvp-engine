# FLOW-15 QA Run Report - Phase 13

**Flow:** SaaS Multi-Tenancy (`saas-multi-tenancy`)
**Classification:** ADMIN_FACING
**Status:** PENDING_RERUN
**Spec files:** 1 | **Test blocks:** 6 | **Screenshot calls:** 6
**PNGs on disk:** pending regeneration after governance scope correction

## Spec Files

- `client/e2e/saas-multi-tenancy.spec.ts`

## Snapshot Targets

| # | File | Status |
|--:|------|:-------|
| 1 | `01-t605-atomic-tenant-provisioning.png` | pending Phase 2 rerun |
| 2 | `02-t606-machine-locked-config-keys.png` | pending Phase 2 rerun |
| 3 | `03-t607-atomic-quota-materialization.png` | pending Phase 2 rerun |
| 4 | `04-t608-suspend-not-delete-lifecycle.png` | pending Phase 2 rerun |
| 5 | `05-tenant-identity-context-isolation.png` | pending Phase 2 rerun |
| 6 | `06-flow-15-governance-rules-seeded.png` | pending Phase 2 rerun |

## Arbiters

- **PNG count match:** pending Phase 2 Playwright rerun.
- **File size gate:** pending Phase 2 Playwright rerun.
- **Failure gate:** pending Phase 2 Playwright rerun.
- **Naming convention:** `{NN}-{kebab-state}.png` - current spec is aligned to shipped T605-T608 states.

## Execution Prompt

```bash
# 1) Start the stack
docker compose up --build -d

# 2) Run playwright for this flow
npx playwright test client/e2e/saas-multi-tenancy*.spec.ts --reporter=list

# 3) Verify PNGs
Get-ChildItem docs/e2e-snapshots/saas-multi-tenancy -Filter *.png
Get-ChildItem docs/e2e-snapshots/saas-multi-tenancy -Filter *.png | Where-Object { $_.Length -lt 1024 }

# 4) Regenerate this report
python scripts/gen-phase13-qa-run-report.py
```
