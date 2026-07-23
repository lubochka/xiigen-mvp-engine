#!/usr/bin/env python3
"""
P14 Part B: append TVQ-09 (golden screenshot) to 12 REAL topology specs,
and TVQ-10 (page-level Mermaid-free check) to the FLOW-11 spec.

Inserts before the final `});` that closes the outer describe block.
"""
from pathlib import Path

REAL_SPECS = [
    "completion-gamification",
    "event-attendance",
    "event-management",
    "friend-request-social-feed",
    "marketplace",
    "platform-agent",
    "profile-enrichment",
    "reviews-reputation",
    "schema-registry-dag",
    "transactional-event-participation",
    "user-groups-communities",
    "user-registration",
]

TVQ09_TMPL = """
  test('TVQ-09: golden screenshot — full topology visible', async ({ page }) => {
    try { await page.goto(TOPOLOGY_URL, { timeout: 10_000 }); }
    catch { test.skip(true, 'Dev server not running'); }
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('topology-graph')).toBeVisible();
    await page.waitForTimeout(800);
    const screenshotPath = `../docs/topology-snapshots/${SLUG}/tvq-09-topology-render.png`;
    await page.screenshot({
      path: screenshotPath,
      fullPage: false,
      clip: await page.getByTestId('topology-graph').boundingBox() ?? undefined,
    });
    const { statSync } = await import('fs');
    expect(statSync(screenshotPath).size).toBeGreaterThan(5_000);
  });
"""

TVQ10_SCHEMA_REGISTRY = """
  test('TVQ-10: DagVisualizationPage renders nodes (not Mermaid text)', async ({ page }) => {
    const dagUrl = `${BASE_URL}/dag-visualization`;
    try { await page.goto(dagUrl, { timeout: 10_000 }); }
    catch { test.skip(true, 'Dev server not running'); }
    await page.waitForLoadState('networkidle');
    const preCount = await page.locator('pre').count();
    if (preCount > 0) {
      await expect(page.locator('pre')).not.toContainText('graph TD');
      await expect(page.locator('pre')).not.toContainText('-->');
    }
    await expect(page.getByTestId('topology-graph')).toBeVisible();
    const screenshotPath = `../docs/topology-snapshots/${SLUG}/tvq-10-page-render.png`;
    await page.screenshot({ path: screenshotPath });
    const { statSync } = await import('fs');
    expect(statSync(screenshotPath).size).toBeGreaterThan(5_000);
  });
"""

def append_tests(spec_path: Path, slug: str, include_tvq10: bool):
    text = spec_path.read_text(encoding="utf-8")
    if "TVQ-09" in text:
        print(f"SKIP (already has TVQ-09): {spec_path.name}")
        return
    # Find the last `});` that closes the top-level describe block.
    # Pattern: the file ends with `});\n` optionally followed by trailing comments and `void` statements.
    # We search for the closing `});` at column 0 (end of describe).
    lines = text.splitlines(keepends=True)
    # Find the index of the LAST `});` at column 0
    close_idx = None
    for i in range(len(lines) - 1, -1, -1):
        if lines[i].startswith("});"):
            close_idx = i
            break
    if close_idx is None:
        raise RuntimeError(f"Could not locate describe() close in {spec_path}")
    insertion = TVQ09_TMPL
    if include_tvq10:
        insertion = TVQ09_TMPL + TVQ10_SCHEMA_REGISTRY
    new_lines = lines[:close_idx] + [insertion] + lines[close_idx:]
    spec_path.write_text("".join(new_lines), encoding="utf-8")
    count = "TVQ-09 + TVQ-10" if include_tvq10 else "TVQ-09"
    print(f"OK ({count}): {spec_path.name}")

def main():
    root = Path(__file__).resolve().parents[1]
    topology_dir = root / "client" / "e2e" / "topology"
    for slug in REAL_SPECS:
        spec = topology_dir / f"{slug}-topology-qa.spec.ts"
        if not spec.exists():
            print(f"MISSING: {spec}")
            continue
        append_tests(spec, slug, include_tvq10=(slug == "schema-registry-dag"))

if __name__ == "__main__":
    main()
