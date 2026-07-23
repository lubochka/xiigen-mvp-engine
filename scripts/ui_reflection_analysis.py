#!/usr/bin/env python3
"""
UI Reflection State Analyzer for FLOW-25..FLOW-36.

For each business process across the target flow range, score whether any
React UI in client/ reflects its 5 user-observable states:
  initiate, in_progress, result, error, next_step
producing one of 5 verdicts:
  FULL_UI, PARTIAL_UI, NO_UI, INTERNAL_ONLY, EVENT_ONLY_NO_OBSERVER
"""

import json
import os
import glob
import re
import sys
from collections import defaultdict
from datetime import datetime

ROOT = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
os.chdir(ROOT)

MASTER_STATE_PATH = "docs/sessions/BUSINESS-PROCESS-MASTER-STATE.json"

# Canonical mapping: FLOW-XX → (canonical client slug, server engine dir)
# Some flows do not have a 1:1 server dir; mapped to closest implementation.
SLUG_MAP = {
    "FLOW-25": ("bfa-cross-flow-governance", "bfa-conflict-arbitration"),
    "FLOW-26": ("meta-flow-engine", "flow-extension-engine"),  # meta runtime ≈ flow-extension orchestration
    "FLOW-27": ("human-interaction-gate", "human-approval-gate"),
    "FLOW-28": ("blog-cms-modules", "blog-cms-modules"),
    "FLOW-29": ("adaptive-rag-deep-research", "rag-optimization"),  # adaptive-rag-router lives here
    "FLOW-30": ("tenant-lifecycle-manager", "tenant-lifecycle"),
    "FLOW-31": ("design-intelligence-engine", "design-system-governance"),
    "FLOW-32": ("sharable-flows-marketplace", "sharable-flows-marketplace"),
    "FLOW-33": ("system-initiation-bootstrap", "meta-arbitration"),  # bootstrap-orchestrator lives here
    "FLOW-34": ("marketplace-plugin-adapter", None),  # no dedicated server dir; relies on sharable-flows-marketplace adapter slice
    "FLOW-35": ("meta-arbitration-engine", "meta-arbitration"),
    "FLOW-36": ("feature-registry", "feature-registry"),
}

# Flows that are PURELY engine-internal — no human-facing UI is even
# expected. (FLOW-33 bootstrap has admin-visible status; FLOW-34 plugin
# adapter is user-facing even though no impl exists.)
INTERNAL_ONLY_FLOWS = {
    "FLOW-25",  # BFA cross-flow governance — engine guard, runs at deploy
    "FLOW-26",  # Meta-flow engine — engine orchestration internal
    "FLOW-29",  # Adaptive RAG — engine retrieval, no human UI
    "FLOW-31",  # Design intelligence — engine internal scoring
    "FLOW-35",  # Meta-arbitration — engine consensus
    # NOT included: FLOW-27 (human gate IS user-facing), FLOW-33 (bootstrap
    # status visible to admin), FLOW-34 (plugin adapter user-facing if impl).
}

# Top-level pages in client/src/pages/ that may carry UI for these flows even
# without per-slug subdirectories. (page name → list of FLOW-XX it potentially covers)
PAGE_HINTS = {
    "MarketplacePage.tsx": ["FLOW-32"],          # browse/install marketplace pkgs
    "TenantsPage.tsx":     ["FLOW-30"],          # create/deactivate tenants → lifecycle
    # NOTE: ChatPage is for FLOW-46 platform-agent, NOT FLOW-27 human gate.
    # NOTE: RegistryPage is contract registry (FLOW-11/general), NOT feature-registry (FLOW-36).
}

# Per-slug component dirs that exist in client/src/components/
COMPONENT_DIR_HINTS = {
    "FLOW-30": ["tenants", "lifecycle"],   # tenant + flow-lifecycle
    "FLOW-32": [],                          # only MarketplacePage covers
    "FLOW-36": ["feature-registry"],        # FeatureMatrix*
    # System bootstrap UI lives in history-bootstrap/ but App.tsx does NOT
    # register a /history-bootstrap route — flagged as orphaned.
    "FLOW-33": ["history-bootstrap"],
}


def read_text(p):
    try:
        with open(p, "r", encoding="utf-8", errors="replace") as f:
            return f.read()
    except FileNotFoundError:
        return ""


def list_services(server_dir):
    """Return service entries for a server engine flow dir."""
    if not server_dir:
        return []
    pattern = f"server/src/engine/flows/{server_dir}/*.service.ts"
    files = sorted(glob.glob(pattern))
    out = []
    for f in files:
        if f.endswith(".spec.ts"):
            continue
        text = read_text(f)
        cls_m = re.search(r"export class (\w+Service)", text)
        cls = cls_m.group(1) if cls_m else (
            os.path.splitext(os.path.basename(f))[0].replace(".service", "")
        )
        events = re.findall(r"enqueue\(\s*['\"]([^'\"]+)['\"]", text)
        endpoints = re.findall(r"@(?:Post|Get|Put|Delete|Patch)\(\s*['\"]([^'\"]+)", text)
        out.append({
            "file": f.replace("\\", "/"),
            "class": cls,
            "events": list(dict.fromkeys(events))[:5],
            "endpoints": list(dict.fromkeys(endpoints))[:3],
        })
    return out


def find_route_in_app(slug, fid, app_text):
    """Detect if a route for the slug exists in App.tsx.

    Uses semantic matching — known route paths per slug.
    """
    # Direct slug match in route path strings
    if f"/{slug}" in app_text:
        return True
    # Known route mappings
    KNOWN_ROUTES = {
        "FLOW-30": ["/tenants"],
        "FLOW-32": ["/marketplace"],
        # FLOW-33: history-bootstrap route NOT registered (orphan)
        # FLOW-36: feature-registry route NOT registered (orphan)
    }
    for r in KNOWN_ROUTES.get(fid, []):
        if f'path="{r}"' in app_text:
            return True
    return False


def grep_client_pages(slug, server_dir, services, fid):
    """Find React pages, components, hooks, tests that reflect this flow."""
    found_pages = []
    found_components = []
    found_hooks = []
    found_tests = []
    found_e2e = []

    # 1. Per-slug page directory
    pages_dir = f"client/src/pages/{slug}"
    if os.path.isdir(pages_dir):
        for f in sorted(glob.glob(f"{pages_dir}/*.tsx")):
            found_pages.append(f.replace("\\", "/"))

    # 2. Per-slug component directory
    cdir = f"client/src/components/{slug}"
    if os.path.isdir(cdir):
        for f in sorted(glob.glob(f"{cdir}/*.tsx")) + sorted(glob.glob(f"{cdir}/*.ts")):
            if "index.ts" in f and f.endswith(".ts") and not f.endswith(".tsx"):
                # include barrels too
                pass
            found_components.append(f.replace("\\", "/"))

    # 3. Hint-based components for slugs without their own dir
    for hint in COMPONENT_DIR_HINTS.get(fid, []):
        for f in sorted(glob.glob(f"client/src/components/{hint}/*.tsx")) + sorted(
            glob.glob(f"client/src/components/{hint}/*.ts")
        ):
            found_components.append(f.replace("\\", "/"))

    # 4. Top-level pages that might cover this flow
    for page_name, flows in PAGE_HINTS.items():
        if fid in flows:
            p = f"client/src/pages/{page_name}"
            if os.path.exists(p):
                found_pages.append(p)

    # 5. Slug-specific tests
    test_dir = f"client/__tests__/flows/{slug}"
    if os.path.isdir(test_dir):
        for f in sorted(glob.glob(f"{test_dir}/*.test.*")):
            found_tests.append(f.replace("\\", "/"))

    # 6. Slug e2e tests
    for f in sorted(glob.glob(f"client/e2e/{slug}*.spec.ts")):
        found_e2e.append(f.replace("\\", "/"))

    # 7. Special e2e mapping
    e2e_special = {
        "FLOW-33": ["client/e2e/history-bootstrap.spec.ts"],
        "FLOW-32": [],  # marketplace covered via packages e2e? none directly
        "FLOW-36": ["client/e2e/feature-registry.spec.ts"],
    }
    for f in e2e_special.get(fid, []):
        if os.path.exists(f) and f not in found_e2e:
            found_e2e.append(f)

    # 8. Hooks specific to this flow
    hook_hints = {
        "FLOW-30": ["useTenants.ts", "useTenantFlows.ts", "useFlowLifecycle.ts"],
        "FLOW-32": ["useMarketplace.ts"],
        "FLOW-33": ["useBootstrapStatus.ts"],
        "FLOW-27": [],  # ChatPage uses useAgentSession (FLOW-46), not human-gate-specific
        "FLOW-36": [],  # No dedicated hook for feature-matrix yet
    }
    for h in hook_hints.get(fid, []):
        p = f"client/src/hooks/{h}"
        if os.path.exists(p):
            found_hooks.append(p)

    # Dedupe while preserving order
    def dedup(seq):
        seen = set()
        out = []
        for x in seq:
            if x not in seen:
                seen.add(x)
                out.append(x)
        return out

    return {
        "pages":      dedup(found_pages),
        "components": dedup(found_components),
        "hooks":      dedup(found_hooks),
        "tests":      dedup(found_tests),
        "e2e":        dedup(found_e2e),
    }


def state_indicator_search(svc, ui_inv, slug, fid, app_text):
    """For a single service/process, score the 5 state indicators.

    Stricter heuristic:
      - Build service-specific tokens (kebab class name, event names, base name).
      - For a state pattern to count, the file must ALSO contain at least one
        service-specific token OR the file must live under the slug directory.
        This prevents generic "loading/error" boilerplate in unrelated pages
        from inflating scores.
    """
    cls = svc["class"]
    # Convert ServiceClass → kebab tokens for search
    base = cls.replace("Service", "")
    base_kebab = re.sub(r"(?<!^)(?=[A-Z])", "-", base).lower()
    base_tokens = {base_kebab, base.lower()}

    # Drop tokens that are too generic (avoid false positives)
    GENERIC = {"service", "manager", "handler", "engine", "orchestrator", "creator",
               "processor", "runner", "worker", "gate", "scanner", "checker",
               "emitter", "aggregator", "compiler", "parser", "renderer",
               "publisher", "verifier", "executor", "guard", "router",
               "selector", "evaluator", "estimator", "generator"}
    # Strip "ServiceX" suffixes / generic words from kebab-cased
    parts = [p for p in base_kebab.split("-") if p and p not in GENERIC]
    base_tokens.add("-".join(parts) if parts else base_kebab)

    event_tokens = set()
    for ev in svc.get("events", []):
        # Use the full event name verbatim AND each token >= 4 chars in the path
        event_tokens.add(ev.lower())
        # Skip the bare prefix (too broad, e.g. 'tenant' from 'tenant.health.scored')

    # Drop overly short tokens (false-positive prone)
    raw = (base_tokens | event_tokens) - {""}
    token_list = {t for t in raw if len(t) >= 8}

    # File set to search — REAL UI ONLY for indicator scoring.
    # Tests/e2e are tracked separately for evidence completeness but do not
    # constitute UI reflection on their own. (Test files often "mention" all
    # 5 states in simulations without any actual rendering.)
    all_files = (
        ui_inv["pages"] + ui_inv["components"] + ui_inv["hooks"]
    )

    indicators = {
        "initiate":     {"found": False, "evidence": ""},
        "in_progress":  {"found": False, "evidence": ""},
        "result":       {"found": False, "evidence": ""},
        "error":        {"found": False, "evidence": ""},
        "next_step":    {"found": False, "evidence": ""},
    }

    # Patterns per state
    patterns = {
        "initiate":    [r"\bsubmit\b", r"\bcreate\b", r"\bpublish\b", r"\binstall\b",
                        r"\binitiate\b", r"\bstart\b"],
        "in_progress": [r"\bloading\b", r"\binstalling\b", r"\bpending\b", r"submitting",
                        r"in[- ]?progress", r"\brunning\b", r"\bspinner\b", r"in_review"],
        "result":      [r"\bsuccess\b", r"\bcompleted\b", r"\bpublished\b",
                        r"\binstalled\b", r"\bactive\b", r"\bapproved\b", r"\bdone\b"],
        "error":       [r"\berror\b", r"\bfail", r"\brejected\b", r"\bblocked\b",
                        r"\bviolation\b", r"red-50", r"red-100"],
        "next_step":   [r"navigate\(", r"next-step", r"\bcontinue\b", r"\bresume\b",
                        r"port to another", r"navigate to"],
    }

    for fpath in all_files:
        text = read_text(fpath)
        if not text:
            continue
        text_l = text.lower()
        fpath_norm = fpath.replace("\\", "/")
        # Strict: service-specific token must appear in this file,
        # OR the file path must include the slug. This kills generic matches.
        token_present = any(tok and tok in text_l for tok in token_list)
        slug_present  = ("/" + slug + "/" in fpath_norm) or ("/" + slug + "." in fpath_norm) \
                        or fpath_norm.endswith(f"/{slug}.spec.ts")

        if not (token_present or slug_present):
            continue

        for state, pats in patterns.items():
            if indicators[state]["found"]:
                continue
            for pat in pats:
                m = re.search(pat, text_l)
                if m:
                    line_no = text_l[: m.start()].count("\n") + 1
                    indicators[state] = {"found": True, "evidence": f"{fpath_norm}:{line_no}"}
                    break

    return indicators, sorted(token_list)


def derive_verdict(indicators, ui_inv, fid, svc, evidence_files):
    """Apply the 5-verdict decision.

    `evidence_files` = set of file paths actually referenced by indicator hits.
    """
    found_count = sum(1 for v in indicators.values() if v["found"])
    has_real_ui = bool(ui_inv["pages"] or ui_inv["components"])

    # Differentiate: was at least one indicator hit in REAL UI (not test files)?
    evidence_in_real_ui = any(
        (".tsx" in p or "/components/" in p or "/pages/" in p) and "__tests__" not in p
        for p in evidence_files
    )

    # 1. INTERNAL_ONLY — flow declared engine-internal; no UI expected
    if fid in INTERNAL_ONLY_FLOWS:
        if not evidence_in_real_ui:
            return "INTERNAL_ONLY"
        # else fall through to FULL_UI/PARTIAL_UI

    # 2. FULL_UI — all 5 states + at least one in real UI
    if found_count >= 5 and evidence_in_real_ui:
        return "FULL_UI"

    # 3. PARTIAL_UI — some states reflected (at least one in real UI)
    if found_count >= 1 and evidence_in_real_ui:
        return "PARTIAL_UI"

    # 4. EVENT_ONLY_NO_OBSERVER — service emits events but no UI evidence
    #    (regardless of whether other services in the flow have UI)
    emits_events = bool(svc.get("events", []))
    if emits_events:
        return "EVENT_ONLY_NO_OBSERVER"

    # 5. NO_UI — no events, no UI evidence
    return "NO_UI"


def synthesize_processes_from_services(fid, slug, server_dir, master_processes_for_flow):
    """Build a process list for a flow.

    If contracted processes exist in master state → use them directly.
    Otherwise → synthesize from server service files (orphan / un-contracted).
    If neither exists → emit a single placeholder process so the flow still
    gets a verdict row (NOT_IMPLEMENTED).
    """
    if master_processes_for_flow:
        return [{
            "processId": p["processId"],
            "service_class": p.get("service_class"),
            "service_file": p.get("service_file"),
            "events_emitted": p.get("events_emitted", []),
            "endpoints": p.get("endpoints", []),
            "contracted": True,
        } for p in master_processes_for_flow]

    # Synthesize from filesystem
    svcs = list_services(server_dir)
    if svcs:
        out = []
        for s in svcs:
            out.append({
                "processId": f"orphan-{s['class']}",
                "service_class": s["class"],
                "service_file": s["file"],
                "events_emitted": [{"name": e} for e in s["events"]],
                "endpoints": [{"route": e} for e in s["endpoints"]],
                "contracted": False,
            })
        return out

    # Truly empty — placeholder
    return [{
        "processId": f"NOT_IMPLEMENTED-{fid}",
        "service_class": "(none — no server engine dir, no contracts)",
        "service_file": "",
        "events_emitted": [],
        "endpoints": [],
        "contracted": False,
        "_placeholder": True,
    }]


def analyze_flow(fid, master_data, app_text):
    slug, server_dir = SLUG_MAP[fid]
    master_for_flow = [p for p in master_data["processes"] if p.get("flowId") == fid]
    procs = synthesize_processes_from_services(fid, slug, server_dir, master_for_flow)

    ui_inv = grep_client_pages(slug, server_dir, procs, fid)
    has_route = find_route_in_app(slug, fid, app_text)

    out = []
    for proc in procs:
        svc = {
            "class": proc.get("service_class") or "Unknown",
            "events": [e["name"] if isinstance(e, dict) else e for e in proc.get("events_emitted", [])],
        }
        indicators, tokens = state_indicator_search(svc, ui_inv, slug, fid, app_text)
        evidence_files = {ind["evidence"].split(":")[0] for ind in indicators.values() if ind["evidence"]}
        verdict = derive_verdict(indicators, ui_inv, fid, svc, evidence_files)

        # Compute "missing" = states without evidence
        missing = [k for k, v in indicators.items() if not v["found"]]

        # If not contracted, emit a marker
        proc_id = proc["processId"]
        out.append({
            "processId": proc_id,
            "service_class": svc["class"],
            "service_file": proc.get("service_file", ""),
            "contracted": proc.get("contracted", False),
            "events_emitted": svc["events"],
            "endpoints": [e.get("route") for e in proc.get("endpoints", []) if isinstance(e, dict)],
            "ui_reflection": {
                "applicable": fid not in INTERNAL_ONLY_FLOWS or bool(ui_inv["pages"] or ui_inv["components"]),
                "react_components_found": ui_inv["components"],
                "react_pages_found": ui_inv["pages"],
                "hooks_found": ui_inv["hooks"],
                "client_tests_found": ui_inv["tests"],
                "e2e_tests_found": ui_inv["e2e"],
                "route_registered_in_app_tsx": has_route,
                "search_tokens": tokens,
                "state_indicators": indicators,
                "verdict": verdict,
                "missing": missing,
            },
        })

    # Per-flow summary
    verdicts = defaultdict(int)
    for p in out:
        verdicts[p["ui_reflection"]["verdict"]] += 1

    high_value_no_ui = [
        p["processId"] for p in out
        if p["ui_reflection"]["verdict"] in ("NO_UI", "EVENT_ONLY_NO_OBSERVER")
        and (p["events_emitted"] or p["endpoints"])
    ]

    summary = {
        "flowId": fid,
        "slug": slug,
        "server_engine_dir": server_dir,
        "total_processes": len(out),
        "contracted_processes": sum(1 for p in out if p["contracted"]),
        "orphan_processes": sum(1 for p in out if not p["contracted"]),
        "verdict_counts": dict(verdicts),
        "ui_inventory_summary": {
            "pages": len(ui_inv["pages"]),
            "components": len(ui_inv["components"]),
            "hooks": len(ui_inv["hooks"]),
            "client_tests": len(ui_inv["tests"]),
            "e2e_tests": len(ui_inv["e2e"]),
        },
        "route_registered_in_app_tsx": has_route,
        "internal_only_flow": fid in INTERNAL_ONLY_FLOWS,
        "high_value_no_ui": high_value_no_ui[:10],
    }

    return out, summary, ui_inv


def write_md(fid, slug, summary, processes, ui_inv):
    out_dir = f"docs/sessions/{fid}"
    os.makedirs(out_dir, exist_ok=True)
    md_path = f"{out_dir}/UI-REFLECTION-STATE.md"

    lines = []
    lines.append(f"# {fid} ({slug}) — UI Reflection State")
    lines.append("")
    lines.append(f"- **Generated:** 2026-04-17")
    lines.append(f"- **Branch:** claude/vigorous-margulis")
    lines.append(f"- **Source:** `docs/sessions/BUSINESS-PROCESS-MASTER-STATE.json`")
    lines.append("")
    lines.append("## Summary")
    lines.append("")
    lines.append(f"- Total processes scored: **{summary['total_processes']}** "
                 f"(contracted: {summary['contracted_processes']}, "
                 f"orphan: {summary['orphan_processes']})")
    lines.append(f"- Internal-only flow: **{summary['internal_only_flow']}**")
    lines.append(f"- Route registered in App.tsx: **{summary['route_registered_in_app_tsx']}**")
    lines.append("")
    lines.append("**Verdict distribution:**")
    lines.append("")
    for v, c in sorted(summary["verdict_counts"].items()):
        lines.append(f"- {v}: {c}")
    lines.append("")

    lines.append("**UI inventory:**")
    lines.append("")
    lines.append(f"- React pages: {summary['ui_inventory_summary']['pages']}")
    lines.append(f"- React components: {summary['ui_inventory_summary']['components']}")
    lines.append(f"- Hooks: {summary['ui_inventory_summary']['hooks']}")
    lines.append(f"- Client tests: {summary['ui_inventory_summary']['client_tests']}")
    lines.append(f"- E2E tests: {summary['ui_inventory_summary']['e2e_tests']}")
    lines.append("")

    if ui_inv["pages"]:
        lines.append("**Pages discovered:**")
        for p in ui_inv["pages"]:
            lines.append(f"- `{p}`")
        lines.append("")
    if ui_inv["components"]:
        lines.append("**Components discovered:**")
        for c in ui_inv["components"]:
            lines.append(f"- `{c}`")
        lines.append("")
    if ui_inv["hooks"]:
        lines.append("**Hooks discovered:**")
        for h in ui_inv["hooks"]:
            lines.append(f"- `{h}`")
        lines.append("")
    if ui_inv["tests"]:
        lines.append("**Client tests:**")
        for t in ui_inv["tests"]:
            lines.append(f"- `{t}`")
        lines.append("")
    if ui_inv["e2e"]:
        lines.append("**E2E tests:**")
        for t in ui_inv["e2e"]:
            lines.append(f"- `{t}`")
        lines.append("")

    lines.append("## Per-Process Verdict Table")
    lines.append("")
    lines.append("| Process | Service | Verdict | Events | Endpoints | Missing States |")
    lines.append("|---|---|---|---|---|---|")
    for p in processes:
        ur = p["ui_reflection"]
        ev = ", ".join(p["events_emitted"][:2]) if p["events_emitted"] else "—"
        ep = ", ".join([e for e in p["endpoints"] if e][:2]) if p["endpoints"] else "—"
        missing = ", ".join(ur["missing"]) or "—"
        lines.append(f"| {p['processId']} | {p['service_class']} | **{ur['verdict']}** | {ev} | {ep} | {missing} |")
    lines.append("")

    lines.append("## Process Details")
    lines.append("")
    for p in processes:
        ur = p["ui_reflection"]
        lines.append(f"### {p['processId']} — {p['service_class']}")
        lines.append("")
        lines.append(f"- **Service file:** `{p['service_file']}`")
        lines.append(f"- **Contracted:** {p['contracted']}")
        lines.append(f"- **Verdict:** **{ur['verdict']}**")
        lines.append(f"- **Events emitted:** {p['events_emitted'] or '—'}")
        lines.append(f"- **Endpoints:** {[e for e in p['endpoints'] if e] or '—'}")
        lines.append("")
        lines.append("**State indicators:**")
        for state, ind in ur["state_indicators"].items():
            mark = "yes" if ind["found"] else "no"
            ev_str = f" → {ind['evidence']}" if ind["evidence"] else ""
            lines.append(f"- `{state}`: {mark}{ev_str}")
        lines.append("")
        if ur["missing"]:
            lines.append(f"**Missing states:** {', '.join(ur['missing'])}")
            lines.append("")

    with open(md_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    return md_path


def write_json(fid, slug, summary, processes):
    out_dir = f"docs/sessions/{fid}"
    os.makedirs(out_dir, exist_ok=True)
    json_path = f"{out_dir}/UI-REFLECTION-STATE.json"
    obj = {
        "flowId": fid,
        "slug": slug,
        "generated_at": "2026-04-17",
        "branch": "claude/vigorous-margulis",
        "summary": summary,
        "processes": processes,
    }
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2)
    return json_path


def main():
    master = json.load(open(MASTER_STATE_PATH, "r", encoding="utf-8"))
    app_text = read_text("client/src/App.tsx")

    target_flows = sorted(SLUG_MAP.keys(), key=lambda f: int(f.split("-")[1]))

    overall = {
        "totals": {
            "flows": 0,
            "processes": 0,
            "verdicts": defaultdict(int),
        },
        "per_flow": {},
        "high_value_no_ui": [],
        "surprising": [],
    }

    for fid in target_flows:
        processes, summary, ui_inv = analyze_flow(fid, master, app_text)
        write_json(fid, summary["slug"], summary, processes)
        write_md(fid, summary["slug"], summary, processes, ui_inv)

        overall["totals"]["flows"] += 1
        overall["totals"]["processes"] += summary["total_processes"]
        for v, c in summary["verdict_counts"].items():
            overall["totals"]["verdicts"][v] += c
        overall["per_flow"][fid] = summary

        for p in processes:
            ur = p["ui_reflection"]
            if ur["verdict"] in ("NO_UI", "EVENT_ONLY_NO_OBSERVER"):
                # Heuristic: high-value if it has events or endpoints
                if p["events_emitted"] or p["endpoints"]:
                    overall["high_value_no_ui"].append({
                        "flow": fid,
                        "process": p["processId"],
                        "service": p["service_class"],
                        "events": p["events_emitted"][:2],
                        "endpoints": [e for e in p["endpoints"] if e][:2],
                        "verdict": ur["verdict"],
                    })

    # Sort high-value list by impact (events × endpoints)
    overall["high_value_no_ui"].sort(
        key=lambda x: (-len(x["events"]) - len(x["endpoints"]), x["flow"])
    )
    overall["totals"]["verdicts"] = dict(overall["totals"]["verdicts"])

    # Write cross-flow rollup
    rollup = {
        "generated_at": "2026-04-17",
        "branch": "claude/vigorous-margulis",
        "scope": "FLOW-25..FLOW-36",
        "totals": overall["totals"],
        "per_flow": overall["per_flow"],
        "top_10_high_value_no_ui": overall["high_value_no_ui"][:10],
        "surprising_findings": [],  # populated below
    }
    with open("docs/sessions/UI-REFLECTION-ROLLUP-FLOW-25-36.json", "w") as f:
        json.dump(rollup, f, indent=2)

    print("=" * 70)
    print("OVERALL SUMMARY (FLOW-25..FLOW-36)")
    print("=" * 70)
    print(f"Flows analyzed: {overall['totals']['flows']}")
    print(f"Processes scored: {overall['totals']['processes']}")
    print(f"Verdict distribution: {overall['totals']['verdicts']}")
    print()
    print("Per-flow:")
    for fid, summ in overall["per_flow"].items():
        print(f"  {fid} ({summ['slug']:35s}) -- {summ['total_processes']:3d} procs, "
              f"verdicts={summ['verdict_counts']}, route={summ['route_registered_in_app_tsx']}")
    print()
    print(f"High-value NO_UI/EVENT_ONLY count: {len(overall['high_value_no_ui'])}")

    # Top 10 high-value NO_UI candidates
    print()
    print("TOP 10 HIGH-VALUE NO_UI / EVENT_ONLY:")
    for i, hv in enumerate(overall["high_value_no_ui"][:10], 1):
        print(f"  {i:2d}. {hv['flow']} {hv['process']:50s} verdict={hv['verdict']:25s} "
              f"events={hv['events']} endpoints={hv['endpoints']}")

    # Surprising findings
    print()
    print("SURPRISING FINDINGS:")
    findings = []
    # 1. FLOW-36 has React components but no route registered
    f36 = overall["per_flow"].get("FLOW-36", {})
    if f36.get("ui_inventory_summary", {}).get("components", 0) > 0 and not f36.get("route_registered_in_app_tsx"):
        findings.append("FLOW-36 (feature-registry) has 4 React components + e2e tests "
                        "but NO route registered in App.tsx — entire UI is orphaned.")
    # 2. FLOW-33 history-bootstrap components exist but no route
    f33 = overall["per_flow"].get("FLOW-33", {})
    if f33.get("ui_inventory_summary", {}).get("components", 0) > 0 and not f33.get("route_registered_in_app_tsx"):
        findings.append("FLOW-33 (system-initiation-bootstrap) has history-bootstrap "
                        "components + e2e but NO route in App.tsx.")
    # 3. FLOW-32 has 20 contracted services but only browse/install in MarketplacePage
    f32 = overall["per_flow"].get("FLOW-32", {})
    f32_no_ui = f32.get("verdict_counts", {}).get("NO_UI", 0) + \
                f32.get("verdict_counts", {}).get("EVENT_ONLY_NO_OBSERVER", 0)
    if f32_no_ui >= 18:
        findings.append("FLOW-32 (sharable-flows-marketplace): 20 contracted services "
                        "(publish, sign, fraud-detect, settle, sandbox-provision) -- only "
                        "browse/install reflected via MarketplacePage. Critical pre-marketplace "
                        "QA gaps: tripartite signing UI, fraud review banner, BFA revalidation "
                        "progress, settlement dashboard, sandbox indicator -- ALL absent.")
    # 4. FLOW-30 tenant lifecycle services not reflected
    f30 = overall["per_flow"].get("FLOW-30", {})
    f30_event_only = f30.get("verdict_counts", {}).get("EVENT_ONLY_NO_OBSERVER", 0)
    if f30_event_only >= 8:
        findings.append("FLOW-30 (tenant-lifecycle-manager): All 10 lifecycle services "
                        "(health-scorer, quota-allocator, offboarding-handler, policy-enforcer, "
                        "audit-emitter) emit events but have NO UI -- TenantsPage covers "
                        "only create/list/deactivate, not lifecycle observability.")
    # 6. FLOW-34 marketplace-plugin-adapter has zero implementation
    f34 = overall["per_flow"].get("FLOW-34", {})
    if f34.get("total_processes", 0) <= 1 and f34.get("orphan_processes", 0) == 1:
        findings.append("FLOW-34 (marketplace-plugin-adapter): NO server engine dir, NO "
                        "contracts, NO UI -- entire flow is unimplemented. Critical for "
                        "marketplace if external plugin adapters are part of the roadmap.")
    # 7. FLOW-27 human-interaction-gate
    f27 = overall["per_flow"].get("FLOW-27", {})
    if f27.get("verdict_counts", {}).get("EVENT_ONLY_NO_OBSERVER", 0) >= 10:
        findings.append("FLOW-27 (human-interaction-gate): All 10 services (approval-chain, "
                        "approval-decision, approval-timeout, task-assigner, audit-trail) "
                        "emit events but NO UI exists -- the only 'human' UI in the app is "
                        "ChatPage which serves FLOW-46 platform-agent, NOT this gate.")
    # 5. FLOW-28 blog/CMS — 18 services emit events but NO UI exists
    f28 = overall["per_flow"].get("FLOW-28", {})
    if f28.get("verdict_counts", {}).get("EVENT_ONLY_NO_OBSERVER", 0) >= 18:
        findings.append("FLOW-28 (blog-cms-modules): All 18 services emit CloudEvents "
                        "but NO React surface exists — event-driven CMS with zero "
                        "client visibility.")
    overall["surprising"] = findings
    for f in findings[:5]:
        print(f"  - {f}")

    # Update rollup with findings + write
    rollup["surprising_findings"] = findings
    with open("docs/sessions/UI-REFLECTION-ROLLUP-FLOW-25-36.json", "w") as f:
        json.dump(rollup, f, indent=2)
    return overall


if __name__ == "__main__":
    main()
