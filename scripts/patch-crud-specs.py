#!/usr/bin/env python3
"""
Patch existing client/e2e/{slug}-crud.spec.ts C-03 test to wait for the
UI POST response (and form to disappear) instead of relying on
networkidle. The original networkidle approach races with the fetch
and causes consistent failures under load.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SPECS = list((ROOT / "client" / "e2e").glob("*-crud.spec.ts"))

OLD = re.compile(
    r"""    await page\.getByTestId\('([a-z0-9-]+)-form-submit'\)\.click\(\);
    await page\.waitForLoadState\('networkidle'\);
    await page\.screenshot\(\{ path: SNAP\('crud-after-create\.png'\), fullPage: true \}\);""",
    re.MULTILINE,
)

def new_block(slug: str) -> str:
    return (
        f"    const postResponse = page.waitForResponse(\n"
        f"      (r) => r.url().includes(`/api/dynamic/${{INDEX}}`) && r.request().method() === 'POST',\n"
        f"    );\n"
        f"    await page.getByTestId('{slug}-form-submit').click();\n"
        f"    const resp = await postResponse;\n"
        f"    expect(resp.ok()).toBeTruthy();\n\n"
        f"    await expect(page.getByTestId('{slug}-form')).toBeHidden();\n"
        f"    await page.screenshot({{ path: SNAP('crud-after-create.png'), fullPage: true }});"
    )


def patch_feature_registry(path: Path) -> bool:
    """Feature-registry is hand-crafted and uses different field names."""
    text = path.read_text(encoding="utf-8")
    old = (
        "    await page.getByTestId('feature-registry-form-submit').click();\n"
        "    await page.waitForLoadState('networkidle');\n"
        "    await page.screenshot({ path: SNAP('crud-after-create.png'), fullPage: true });"
    )
    if old not in text:
        return False
    new = (
        "    const postResponse = page.waitForResponse(\n"
        "      (r) => r.url().includes(`/api/dynamic/${INDEX}`) && r.request().method() === 'POST',\n"
        "    );\n"
        "    await page.getByTestId('feature-registry-form-submit').click();\n"
        "    const resp = await postResponse;\n"
        "    expect(resp.ok()).toBeTruthy();\n\n"
        "    await expect(page.getByTestId('feature-registry-form')).toBeHidden();\n"
        "    await page.screenshot({ path: SNAP('crud-after-create.png'), fullPage: true });"
    )
    path.write_text(text.replace(old, new), encoding="utf-8")
    return True


def main() -> int:
    patched = []
    skipped = []
    for spec in SPECS:
        if spec.name == "feature-registry-crud.spec.ts":
            if patch_feature_registry(spec):
                patched.append(spec.name)
            else:
                skipped.append((spec.name, "no match"))
            continue
        text = spec.read_text(encoding="utf-8")
        m = OLD.search(text)
        if not m:
            skipped.append((spec.name, "no match"))
            continue
        slug = m.group(1)
        text = text[:m.start()] + new_block(slug) + text[m.end():]
        spec.write_text(text, encoding="utf-8")
        patched.append(spec.name)
    print(f"Patched {len(patched)} specs")
    for s in patched:
        print(f"  ✓ {s}")
    if skipped:
        print(f"\nSkipped {len(skipped)}:")
        for s, reason in skipped:
            print(f"  - {s}: {reason}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
