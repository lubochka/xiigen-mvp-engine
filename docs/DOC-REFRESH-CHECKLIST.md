# Documentation Refresh Checklist (quarterly)

A short, repeatable pass to keep the public-facing docs honest as the codebase
moves. Run it once a quarter, or whenever `README.md` / `faq/*.md` change in a way
that touches paths or headline numbers.

The automated half of this checklist is a script:

```bash
bash scripts/verify-docs-claims.sh
```

It is read-only and needs no `node`/`npm` — only `bash`, `grep`, `find`, `test`.
CI runs it as the **Docs — Verify Claims** job, so drift breaks the build.

---

## 1. Re-verify the cited paths (automated)

`scripts/verify-docs-claims.sh` extracts every relative path in `README.md` and
`faq/*.md` — markdown links `](./...)` and inline-code paths like
`server/src/...` — and checks each one exists.

- [ ] Run the script. A `MISSING:` line means a doc points at a file or directory
      that no longer exists.
- [ ] Fix the **root cause**: repoint the reference to where the thing lives now,
      or remove the claim. Do **not** silence the check by deleting a code anchor
      whose point still holds — repoint it to a real path instead.

## 2. Re-verify the headline counters (automated)

The same script checks the numbers the docs promise:

| Counter | Canonical source | Expected |
|---------|------------------|----------|
| Flow directories under `server/src/engine/flows/` | the filesystem | **46** |
| `Live` verdicts in `docs/business-flows/FLOW-BY-FLOW-STATUS.md` | that file | **14** |
| `User intents live today` in `docs/business-flows/PRODUCT-STATE.md` | that file | must equal the `Live` count |

- [ ] Run the script; confirm the counters section is all `OK`.
- [ ] If a counter legitimately changed (a flow was added, a flow went Live),
      update it in **three** places so they stay in agreement:
      1. `EXPECT_FLOWS` / `EXPECT_LIVE` at the top of `scripts/verify-docs-claims.sh`
      2. the prose in `README.md` ("46 generated-flow directories", "Fourteen … live")
      3. both status docs (`FLOW-BY-FLOW-STATUS.md` and `PRODUCT-STATE.md`)

**Canonical count of Live flows lives in `docs/business-flows/FLOW-BY-FLOW-STATUS.md`**
(the reconciliation note at the bottom of that file), and `PRODUCT-STATE.md` must
match it. `README.md` quotes that reconciled figure — it is not a second source of
truth.

## 3. Run the tests (manual — NOT covered by the script)

The script does **not** run the test suite. Test counts change constantly, so the
docs deliberately do not print a number; verify the suite yourself:

```bash
cd server && npm test
cd client && npm test
```

- [ ] Confirm the suites pass locally (or in CI). This is a separate,
      manual step — a green `verify-docs-claims.sh` says nothing about tests.

## 4. Bump the "Last verified" dates

`Last verified: <date>` on `README.md` and every `faq/*.md` (the ten answers plus
`faq/README.md`) means: on that date, someone ran steps 1–2 above and they passed —
**the cited paths exist and the counters agree**. It does **not** claim the test
suite was run.

- [ ] Only after steps 1–2 pass, set the date to today, using the identical form
      everywhere: `_Last verified: YYYY-MM-DD_`.
- [ ] Keep the wording uniform across `README.md` and all eleven faq files. There
      should be exactly one date line per file and no leftover `Last updated`.

> Honesty rule: the date moves **only** together with a real re-verification. Never
> bump it "to look fresh" without having run the checks it stands for.

---

## Quick pass

```bash
# 1 + 2 (paths + counters)
bash scripts/verify-docs-claims.sh          # expect: Result: PASS, exit 0

# 3 (tests — separate, manual)
cd server && npm test && cd ../client && npm test

# 4 (dates) — only if all of the above passed
#   set  _Last verified: <today>_  in README.md and every faq/*.md
```
