#!/usr/bin/env python3
"""
Build the master business-process inventory for the XIIGen engine.

Walks code-only artifacts (no docs/sessions/ trust):
  - server/src/engine/flows/ (services)
  - server/src/engine-contracts/ (taskTypeId -> service mapping)
  - server/src/api/ (controllers/endpoints)
  - All server/src/ (events + indices)

Writes:
  - docs/sessions/BUSINESS-PROCESS-MASTER-STATE.json
  - docs/sessions/BUSINESS-PROCESS-MASTER-STATE.md
"""
import json
import os
import re
import sys
from pathlib import Path
from collections import defaultdict, OrderedDict

ROOT = Path(r"C:\Projects\xiigen mvp\.claude\worktrees\vigorous-margulis")
SERVER_SRC = ROOT / "server" / "src"
FLOWS_DIR = SERVER_SRC / "engine" / "flows"
CONTRACTS_DIR = SERVER_SRC / "engine-contracts"
API_DIR = SERVER_SRC / "api"
OUT_JSON = ROOT / "docs" / "sessions" / "BUSINESS-PROCESS-MASTER-STATE.json"
OUT_MD = ROOT / "docs" / "sessions" / "BUSINESS-PROCESS-MASTER-STATE.md"

# Slug ↔ FLOW-XX map from CLAUDE.md
SLUG_TO_FLOW = {
    "bundle-activation": "FLOW-00",
    "user-registration": "FLOW-01",
    "profile-enrichment": "FLOW-02",
    "event-management": "FLOW-03",
    "event-attendance": "FLOW-04",
    "completion-gamification": "FLOW-05",
    "user-groups-communities": "FLOW-06",
    "friend-request-social-feed": "FLOW-07",
    "marketplace": "FLOW-08",
    "transactional-event-participation": "FLOW-09",
    "reviews-reputation": "FLOW-10",
    "schema-registry-dag": "FLOW-11",
    "subscription-billing": "FLOW-12",
    "data-warehouse-analytics": "FLOW-13",
    "etl-data-integration": "FLOW-14",
    "saas-multi-tenancy": "FLOW-15",
    "marketplace-payments": "FLOW-16",
    "freelancer-marketplace": "FLOW-17",
    "visual-flow-engine": "FLOW-18",
    "durable-sagas-compliance": "FLOW-19",
    "ads-platform": "FLOW-20",
    "dynamic-forms-workflows": "FLOW-21",
    "cms-publishing": "FLOW-22",
    "form-builder-templates": "FLOW-23",
    "ai-safety-moderation": "FLOW-24",
    "bfa-cross-flow-governance": "FLOW-25",
    "meta-flow-engine": "FLOW-26",
    "human-interaction-gate": "FLOW-27",
    "blog-cms-modules": "FLOW-28",
    "adaptive-rag-deep-research": "FLOW-29",
    "tenant-lifecycle-manager": "FLOW-30",
    "design-intelligence-engine": "FLOW-31",
    "sharable-flows-marketplace": "FLOW-32",
    "system-initiation-bootstrap": "FLOW-33",
    "marketplace-plugin-adapter": "FLOW-34",
    "meta-arbitration-engine": "FLOW-35",
    "feature-registry": "FLOW-36",
    "design-system-governance": "FLOW-37",
    "rag-quality-feedback": "FLOW-38",
    "oss-curriculum": "FLOW-39",
    "client-push": "FLOW-40",
    "platform-agent": "FLOW-46",
}

# Code-flow-dir -> canonical slug mapping (alias resolution)
DIR_TO_SLUG = {
    "bundle-activation": "bundle-activation",
    "user-registration": "user-registration",
    "profile-enrichment": "profile-enrichment",
    "event-management": "event-management",
    "event-attendance": "event-attendance",
    "completion-gamification": "completion-gamification",
    "user-groups-communities": "user-groups-communities",
    "friend-request-social-feed": "friend-request-social-feed",
    "marketplace": "marketplace",
    "transactional-event-participation": "transactional-event-participation",
    "reviews-reputation": "reviews-reputation",
    "schema-registry-dag": "schema-registry-dag",
    "subscription-billing": "subscription-billing",
    "data-warehouse-analytics": "data-warehouse-analytics",
    "etl-data-integration": "etl-data-integration",
    "saas-multi-tenancy": "saas-multi-tenancy",
    "marketplace-payments": "marketplace-payments",
    "freelancer-marketplace": "freelancer-marketplace",
    "visual-flow-engine": "visual-flow-engine",
    "durable-sagas-compliance": "durable-sagas-compliance",
    "ads-platform": "ads-platform",
    "dynamic-forms-workflows": "dynamic-forms-workflows",
    "cms-publishing": "cms-publishing",
    "form-builder-templates": "form-builder-templates",
    "ai-safety-moderation": "ai-safety-moderation",
    "blog-cms-modules": "blog-cms-modules",
    "feature-registry": "feature-registry",
    "design-system-governance": "design-system-governance",
    "rag-quality-feedback": "rag-quality-feedback",
    "oss-curriculum": "oss-curriculum",
    "client-push": "client-push",
    "platform-agent": "platform-agent",
    # Aliases (engine-internal subdirectory names that map to canonical slugs)
    "bfa-conflict-arbitration": "bfa-cross-flow-governance",
    "engine-self-awareness": "system-initiation-bootstrap",
    "event-participation": "transactional-event-participation",
    "flow-extension-engine": "sharable-flows-marketplace",
    "generation-loop": "meta-flow-engine",
    "human-approval-gate": "human-interaction-gate",
    "membership-group-feed": "user-groups-communities",
    "meta-arbitration": "meta-arbitration-engine",
    "rag-optimization": "adaptive-rag-deep-research",
    "sharable-flows-marketplace": "sharable-flows-marketplace",
    "tenant-lifecycle": "tenant-lifecycle-manager",
}

FABRIC_TOKENS = [
    "DATABASE_SERVICE",
    "QUEUE_SERVICE",
    "AI_PROVIDER",
    "RAG_SERVICE",
    "SECRETS_SERVICE",
    "FLOW_ORCHESTRATOR",
]

# ---------- helpers ----------
def rel(p: Path) -> str:
    try:
        return str(p.relative_to(ROOT)).replace("\\", "/")
    except Exception:
        return str(p).replace("\\", "/")

def read(p: Path) -> str:
    try:
        return p.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return ""

def line_of(text: str, idx: int) -> int:
    return text.count("\n", 0, idx) + 1

# ---------- Step 1: Service inventory ----------
def extract_services():
    """Returns list of service dicts.  Walks engine/flows/ AND auxiliary engine dirs."""
    services = []
    # Primary: engine/flows
    for flow_dir in sorted(FLOWS_DIR.iterdir()):
        if flow_dir.is_dir():
            dir_slug = flow_dir.name
            for svc_file in sorted(flow_dir.rglob("*.service.ts")):
                if ".spec.ts" in svc_file.name:
                    continue
                if "__tests__" in svc_file.parts:
                    continue
                for s in _parse_service_file(svc_file, dir_slug=dir_slug):
                    services.append(s)
        elif flow_dir.suffix == ".ts" and ".service" in flow_dir.name:
            for s in _parse_service_file(flow_dir, dir_slug="<root-of-flows>"):
                services.append(s)
    return services

def _parse_service_file(p: Path, dir_slug: str):
    """Returns list of service dicts (one per exported class in the file)."""
    text = read(p)
    if not text:
        return []
    out = []
    # Find ALL exported classes in the file
    cls_pat = re.compile(r"export\s+(?:abstract\s+)?class\s+(\w+)", re.MULTILINE)
    for cm in cls_pat.finditer(text):
        class_name = cm.group(1)
        class_line = line_of(text, cm.start())
        # Skip pure interface/type-only exports (not relevant)
        if class_name.endswith("Module"):
            continue
        # Look for @Injectable declaration just above (within 200 chars)
        prefix = text[max(0, cm.start() - 200): cm.start()]
        injectable = "@Injectable" in prefix
        # Extract the class body (best-effort via brace matching)
        body_start = text.find("{", cm.end())
        if body_start < 0:
            continue
        depth = 1
        i = body_start + 1
        while i < len(text) and depth > 0:
            ch = text[i]
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
            i += 1
        body = text[body_start: i]
        # Public methods (best-effort): match method-like declarations
        # at indent 2 (typically inside class body)
        method_pat = re.compile(
            r"^\s{2,}(?:public\s+|async\s+)*(?!constructor|private\s|protected\s|readonly\s|static\s|@|return\s|throw\s|if\s|else\s|for\s|while\s|switch\s|do\s|try\s|catch\s|finally\s|case\s|break\s|continue\s|new\s|await\s|yield\s|delete\s|typeof\s|void\s|this\.|super\.|super\(|let\s|const\s|var\s|function\s|import\s|export\s|interface\s|class\s|type\s)([a-z_][A-Za-z0-9_]*)\s*(?:<[^>]+>)?\s*\(",
            re.MULTILINE,
        )
        methods = []
        seen = set()
        for mm in method_pat.finditer(body):
            name = mm.group(1)
            if name in {"if", "for", "while", "switch", "return", "throw", "await", "new",
                        "do", "typeof", "this", "super", "void", "delete", "yield",
                        "function", "let", "const", "var", "of", "in", "is", "as"}:
                continue
            if name in seen:
                continue
            seen.add(name)
            methods.append(name)
        # Constructor presence
        has_ctor = "constructor" in body
        # Code status
        body_no_comments = re.sub(r"//[^\n]*|/\*[\s\S]*?\*/", "", body)
        body_compact = re.sub(r"\s+", "", body_no_comments)
        if body_compact in ("{}", "") and not has_ctor:
            code_status = "STUB"
        elif len(methods) == 0 and not has_ctor:
            code_status = "STUB"
        else:
            code_status = "COMPILES"
        # Fabric injections
        fabric_deps = []
        for tok in FABRIC_TOKENS:
            if re.search(rf"@Inject\(\s*{tok}\s*\)", text):
                fabric_deps.append(tok)
        # Also: detect fabric usage by interface name even without @Inject
        # (constructor-injected without decorator)
        if not fabric_deps:
            iface_map = {
                "IDatabaseService": "DATABASE_SERVICE",
                "IQueueService": "QUEUE_SERVICE",
                "IAiProvider": "AI_PROVIDER",
                "IRagService": "RAG_SERVICE",
                "ISecretsService": "SECRETS_SERVICE",
                "IFlowOrchestrator": "FLOW_ORCHESTRATOR",
                "IFlowOrchestratorService": "FLOW_ORCHESTRATOR",
            }
            for iface, tok in iface_map.items():
                if iface in body:
                    if tok not in fabric_deps:
                        fabric_deps.append(tok)
        canonical_slug = DIR_TO_SLUG.get(dir_slug, dir_slug)
        out.append({
            "class_name": class_name,
            "file": rel(p),
            "line": class_line,
            "dir_slug": dir_slug,
            "canonical_slug": canonical_slug,
            "methods": methods,
            "fabric_deps": fabric_deps,
            "injectable": injectable,
            "has_constructor": has_ctor,
            "code_status": code_status,
        })
    return out

# ---------- Step 1b: Contract inventory ----------
def extract_contracts():
    out = []
    if not CONTRACTS_DIR.exists():
        return out, defaultdict(list)
    for f in sorted(CONTRACTS_DIR.glob("*.ts")):
        if f.name.endswith(".spec.ts"):
            continue
        text = read(f)
        if not text:
            continue
        contract_pat = re.compile(
            r"export\s+const\s+(T\d+(?:_[A-Z0-9_]+)?)\s*:\s*Record<string,\s*unknown>\s*=\s*\{",
            re.MULTILINE,
        )
        for cm in contract_pat.finditer(text):
            block_start = cm.end()
            depth = 1
            i = block_start
            while i < len(text) and depth > 0:
                ch = text[i]
                if ch == "{":
                    depth += 1
                elif ch == "}":
                    depth -= 1
                i += 1
            block = text[block_start:i]
            tid = re.search(r"taskTypeId:\s*['\"]([^'\"]+)['\"]", block)
            name = re.search(r"name:\s*['\"]([^'\"]+)['\"]", block)
            flow = re.search(r"flowId:\s*['\"]([^'\"]+)['\"]", block)
            arch = re.search(r"archetype:\s*['\"]([^'\"]+)['\"]", block)
            family = re.search(r"family:\s*(\d+)", block)
            slug = _slug_from_contract_filename(f.name)
            out.append({
                "taskTypeId": tid.group(1) if tid else None,
                "name": name.group(1) if name else None,
                "flowId": flow.group(1) if flow else None,
                "archetype": arch.group(1) if arch else None,
                "family": int(family.group(1)) if family else None,
                "file": rel(f),
                "line": line_of(text, cm.start()),
                "slug": slug,
            })
    per_slug = defaultdict(list)
    for c in out:
        if c.get("slug"):
            per_slug[c["slug"]].append(c)
    return out, per_slug

def _slug_from_contract_filename(name: str):
    stem = name[:-3] if name.endswith(".ts") else name
    suffixes = [
        "-contracts", "-bfa-rules", "-seed-prompts", "-named-checks",
        "-cdn-snapshot", "-css-build", "-durable-timer", "-publish-rollback",
        "-schema-validator", "-token-deferral-queue", "-binding-contracts",
        "-cloudevents-contracts", "-export-quality", "-idempotency-contracts",
        "-layout-contracts", "-permission-contracts", "-template-mode-contracts",
        "-ip-contracts", "-social-feed-contracts", "-matching-contracts",
        "-marketplace-contracts", "-event-participation-contracts",
        "-membership-group-feed-contracts", "-user-groups-contracts",
        "-transactional-event-contracts", "-visual-flow-contracts",
        "-learning-contracts", "-ads-contracts", "-arbitration-contracts",
    ]
    for suf in suffixes:
        if stem.endswith(suf):
            stem = stem[: -len(suf)]
            break
    if stem in SLUG_TO_FLOW:
        return stem
    parts = stem.split("-")
    for k in range(len(parts), 0, -1):
        cand = "-".join(parts[:k])
        if cand in SLUG_TO_FLOW:
            return cand
    return stem

# ---------- Step 2: Endpoint inventory ----------
def extract_endpoints():
    endpoints = []
    if not API_DIR.exists():
        return endpoints
    for ctl in sorted(API_DIR.glob("*.controller.ts")):
        if ctl.name.endswith(".spec.ts"):
            continue
        text = read(ctl)
        if not text:
            continue
        ctrl_pat = re.compile(r"@Controller\(\s*['\"]([^'\"]*)['\"]")
        cm = ctrl_pat.search(text)
        prefix = cm.group(1) if cm else ""
        cls = re.search(r"export\s+class\s+(\w+)", text)
        cls_name = cls.group(1) if cls else "<unknown>"
        http_pat = re.compile(
            r"@(Get|Post|Put|Patch|Delete|All|Head|Options)\(\s*(?:['\"]([^'\"]*)['\"])?\s*\)\s*[\s\S]{0,400}?(?:async\s+)?(\w+)\s*\(",
            re.MULTILINE,
        )
        for hm in http_pat.finditer(text):
            method = hm.group(1).upper()
            sub = hm.group(2) or ""
            handler = hm.group(3)
            line = line_of(text, hm.start())
            route = ("/" + prefix.strip("/") + ("/" + sub.strip("/") if sub else "")).rstrip("/")
            if not route:
                route = "/"
            endpoints.append({
                "method": method,
                "route": route,
                "controller_class": cls_name,
                "handler": handler,
                "controller_file": rel(ctl),
                "line": line,
            })
    return endpoints

# ---------- Step 3: Event inventory ----------
def extract_events():
    """Walk server/src for events emitted (createCloudEvent, queue.enqueue, queue.publish,
       eventEmitter.emit, eventEmitter2 emit, EventEmitter2.emit) and consumed."""
    emitted = []
    consumed = []

    EMIT_PATTERNS = [
        # queue.enqueue('topic', ...)
        (re.compile(r"\.enqueue\s*\(\s*['\"]([^'\"]+)['\"]"), "queue.enqueue"),
        # queue.publish('topic', ...)
        (re.compile(r"\.publish\s*\(\s*['\"]([^'\"]+)['\"]"), "queue.publish"),
        # eventEmitter.emit('event', ...)
        (re.compile(r"(?:eventEmitter|emitter|events|cloudEvents)\.emit\s*\(\s*['\"]([^'\"]+)['\"]"), "eventEmitter.emit"),
        # createCloudEvent({ eventType: 'X' ... })  /  createCloudEvent({ type: 'X' ... })
        (re.compile(r"createCloudEvent\s*\(\s*\{[\s\S]{0,800}?(?:eventType|type)\s*:\s*['\"]([^'\"]+)['\"]"), "createCloudEvent.type"),
        # createCloudEvent('eventName', ...)
        (re.compile(r"createCloudEvent\s*\(\s*['\"]([^'\"]+)['\"]"), "createCloudEvent.literal"),
    ]
    CONSUMER_PATTERNS = [
        re.compile(r"@EventPattern\s*\(\s*['\"]([^'\"]+)['\"]"),
        re.compile(r"@MessagePattern\s*\(\s*['\"]([^'\"]+)['\"]"),
        re.compile(r"@OnEvent\s*\(\s*['\"]([^'\"]+)['\"]"),
        re.compile(r"\.subscribe\s*\(\s*['\"]([^'\"]+)['\"]"),
        re.compile(r"(?:eventEmitter|emitter|events)\.on\s*\(\s*['\"]([^'\"]+)['\"]"),
        re.compile(r"registerConsumer\s*\(\s*['\"]([^'\"]+)['\"]"),
        re.compile(r"(?:queue|q)\.consume\s*\(\s*['\"]([^'\"]+)['\"]"),
    ]

    for ts in SERVER_SRC.rglob("*.ts"):
        if ts.name.endswith(".spec.ts"):
            continue
        if "__tests__" in ts.parts:
            continue
        text = read(ts)
        if not text:
            continue
        for pat, kind in EMIT_PATTERNS:
            for em in pat.finditer(text):
                ev = em.group(1)
                if "${" in ev or ev == "" or len(ev) > 80:
                    # Likely template literal or noise
                    continue
                emitted.append({
                    "name": ev,
                    "file": rel(ts),
                    "line": line_of(text, em.start()),
                    "kind": kind,
                })
        for pat in CONSUMER_PATTERNS:
            for cm in pat.finditer(text):
                ev = cm.group(1)
                if "${" in ev or ev == "" or len(ev) > 80:
                    continue
                consumed.append({
                    "name": ev,
                    "file": rel(ts),
                    "line": line_of(text, cm.start()),
                })
    return emitted, consumed

# ---------- Step 4: Index inventory ----------
INDEX_PAT = re.compile(r"['\"](xiigen-[a-z0-9][a-z0-9\-]*)['\"]")

def extract_indices():
    indices = defaultdict(list)
    for ts in SERVER_SRC.rglob("*.ts"):
        if ts.name.endswith(".spec.ts"):
            continue
        if "__tests__" in ts.parts:
            continue
        text = read(ts)
        if not text:
            continue
        for m in INDEX_PAT.finditer(text):
            idx = m.group(1)
            line = line_of(text, m.start())
            window = text[max(0, m.start() - 200): m.end() + 200]
            op = "unknown"
            if re.search(r"\.(storeDocument|indexDocument|update|upsert|create|insert|writeDocument)\s*\(", window):
                op = "write"
            elif re.search(r"\.(searchDocuments|search|getDocument|read|find|query)\s*\(", window):
                op = "read"
            elif re.search(r"\.(deleteDocument|deleteByQuery|remove)\s*\(", window):
                op = "delete"
            indices[idx].append({"file": rel(ts), "line": line, "op": op})
    return indices

# ---------- Step 1c: Match services to contracts ----------
def normalize_class(name: str) -> str:
    """Normalize class name for matching: lowercase, strip 'Service'/'Gate' suffixes."""
    n = name.lower()
    for suf in ["service"]:
        if n.endswith(suf):
            n = n[: -len(suf)]
    return n

def match_services_to_contracts(services, contracts):
    # Build alias index for service classes
    svc_by_norm = defaultdict(list)
    for s in services:
        norm = normalize_class(s["class_name"])
        svc_by_norm[norm].append(s)
        # also map exact lowercase
        svc_by_norm[s["class_name"].lower()].append(s)

    matched_service_keys = set()
    matched_contract_ids = set()
    processes = []
    for c in contracts:
        if not c.get("name") or not c.get("taskTypeId"):
            continue
        # candidates
        cname = c["name"]
        candidates = [
            cname.lower(),
            cname.lower() + "service",
            normalize_class(cname),
        ]
        match = None
        for cand in candidates:
            if cand in svc_by_norm:
                # Prefer one whose canonical_slug == contract slug
                hits = svc_by_norm[cand]
                slug_match = [s for s in hits if s["canonical_slug"] == c.get("slug")]
                match = slug_match[0] if slug_match else hits[0]
                break
        if match:
            matched_service_keys.add(match["file"] + "::" + match["class_name"])
            matched_contract_ids.add(c["taskTypeId"])
            processes.append({
                "processId": f"{c['taskTypeId']}-{c['name']}",
                "flowId": c.get("flowId"),
                "slug": c.get("slug"),
                "taskTypeId": c["taskTypeId"],
                "service_class": match["class_name"],
                "service_file": f"{match['file']}:{match['line']}",
                "public_methods": match["methods"],
                "fabric_dependencies": match["fabric_deps"],
                "injectable": match["injectable"],
                "code_status": match["code_status"],
                "archetype": c.get("archetype"),
                "contract_file": f"{c['file']}:{c['line']}",
                "_dir_slug": match["dir_slug"],
            })
        else:
            processes.append({
                "processId": f"{c['taskTypeId']}-{c['name']}",
                "flowId": c.get("flowId"),
                "slug": c.get("slug"),
                "taskTypeId": c["taskTypeId"],
                "service_class": None,
                "service_file": None,
                "public_methods": [],
                "fabric_dependencies": [],
                "injectable": False,
                "code_status": "MISSING",
                "archetype": c.get("archetype"),
                "contract_file": f"{c['file']}:{c['line']}",
            })
    orphan_services = [
        s for s in services
        if (s["file"] + "::" + s["class_name"]) not in matched_service_keys
    ]
    orphan_contracts = [
        c for c in contracts
        if c.get("taskTypeId") and c["taskTypeId"] not in matched_contract_ids
    ]
    return processes, orphan_services, orphan_contracts

# ---------- Step 2b: Match endpoints to services ----------
def match_endpoints_to_services(endpoints, services):
    controller_to_services = defaultdict(list)
    for ctl in sorted(API_DIR.glob("*.controller.ts")):
        if ctl.name.endswith(".spec.ts"):
            continue
        text = read(ctl)
        if not text:
            continue
        cls = re.search(r"export\s+class\s+(\w+)", text)
        cls_name = cls.group(1) if cls else "<unknown>"
        # Constructor arg pattern: private/readonly identifier: TypeName
        ctor_pat = re.compile(r"(?:private|protected|public|readonly)\s+(?:readonly\s+)?(\w+)\s*:\s*(\w+)")
        for cm in ctor_pat.finditer(text):
            controller_to_services[cls_name].append(cm.group(2))
    service_classes = {s["class_name"] for s in services}
    annotated = []
    orphan_endpoints = []
    for ep in endpoints:
        targets = controller_to_services.get(ep["controller_class"], [])
        svc_targets = [t for t in targets if t in service_classes]
        ep_out = dict(ep)
        ep_out["service_targets"] = svc_targets
        annotated.append(ep_out)
        if not svc_targets:
            orphan_endpoints.append(ep_out)
    return annotated, orphan_endpoints

# ---------- Build outputs ----------
def main():
    print("[1/5] Extracting services...", file=sys.stderr)
    services = extract_services()
    print(f"  -> {len(services)} services", file=sys.stderr)

    print("[2/5] Extracting contracts...", file=sys.stderr)
    contracts, per_slug = extract_contracts()
    print(f"  -> {len(contracts)} contracts", file=sys.stderr)

    print("[3/5] Extracting endpoints...", file=sys.stderr)
    endpoints = extract_endpoints()
    print(f"  -> {len(endpoints)} endpoints", file=sys.stderr)

    print("[4/5] Extracting events...", file=sys.stderr)
    emitted, consumed = extract_events()
    print(f"  -> {len(emitted)} emit-sites, {len(consumed)} consume-sites", file=sys.stderr)

    print("[5/5] Extracting indices...", file=sys.stderr)
    indices = extract_indices()
    print(f"  -> {len(indices)} unique indices", file=sys.stderr)

    print("Matching services <-> contracts...", file=sys.stderr)
    processes, orphan_services, orphan_contracts = match_services_to_contracts(services, contracts)

    print("Matching endpoints -> services...", file=sys.stderr)
    annotated_endpoints, orphan_endpoints = match_endpoints_to_services(endpoints, services)

    # File-level event/index annotation
    file_to_events_emitted = defaultdict(list)
    for e in emitted:
        file_to_events_emitted[e["file"]].append(e)
    file_to_events_consumed = defaultdict(list)
    for e in consumed:
        file_to_events_consumed[e["file"]].append(e)
    file_to_indices = defaultdict(list)
    for idx, locs in indices.items():
        for loc in locs:
            file_to_indices[loc["file"]].append({"index": idx, "op": loc["op"]})

    for p in processes:
        if not p.get("service_file"):
            p["events_emitted"] = []
            p["events_consumed"] = []
            p["indices_used"] = []
            p["endpoints"] = []
            continue
        sf = p["service_file"].split(":")[0]
        seen_e = set()
        ee = []
        for e in file_to_events_emitted.get(sf, []):
            key = (e["name"], e["kind"])
            if key in seen_e:
                continue
            seen_e.add(key)
            ee.append({"name": e["name"], "file": f"{e['file']}:{e['line']}", "kind": e["kind"]})
        p["events_emitted"] = ee
        seen_c = set()
        ec = []
        for e in file_to_events_consumed.get(sf, []):
            if e["name"] in seen_c:
                continue
            seen_c.add(e["name"])
            ec.append({"name": e["name"], "file": f"{e['file']}:{e['line']}"})
        p["events_consumed"] = ec
        seen_idx = set()
        idxs = []
        for i in file_to_indices.get(sf, []):
            if i["index"] not in seen_idx:
                seen_idx.add(i["index"])
                idxs.append(i["index"])
        p["indices_used"] = idxs
        eps = []
        for ep in annotated_endpoints:
            if p["service_class"] in ep["service_targets"]:
                eps.append({
                    "method": ep["method"],
                    "route": ep["route"],
                    "controller_file": f"{ep['controller_file']}:{ep['line']}",
                })
        p["endpoints"] = eps

    # Orphan-service event/index annotation as well — useful for finding hidden processes
    orphan_service_summaries = []
    for s in orphan_services:
        sf = s["file"]
        events = list({e["name"] for e in file_to_events_emitted.get(sf, [])})
        indices_used = list({i["index"] for i in file_to_indices.get(sf, [])})
        orphan_service_summaries.append({
            "class_name": s["class_name"],
            "file": f"{s['file']}:{s['line']}",
            "dir_slug": s["dir_slug"],
            "canonical_slug": s["canonical_slug"],
            "code_status": s["code_status"],
            "method_count": len(s["methods"]),
            "fabric_deps": s["fabric_deps"],
            "events_emitted": events[:5],
            "indices_used": indices_used[:5],
        })

    # Distinct events
    emitted_names = sorted({e["name"] for e in emitted})
    consumed_names = sorted({e["name"] for e in consumed})
    set_emit = set(emitted_names)
    set_cons = set(consumed_names)
    events_without_consumer = sorted(set_emit - set_cons)
    events_without_emitter = sorted(set_cons - set_emit)

    # by_flow
    by_flow = defaultdict(lambda: {"process_count": 0, "process_ids": [],
                                    "process_names": [], "implemented_count": 0})
    for p in processes:
        fid = p.get("flowId") or "UNKNOWN"
        by_flow[fid]["process_count"] += 1
        by_flow[fid]["process_ids"].append(p["taskTypeId"])
        by_flow[fid]["process_names"].append(p["service_class"] or f"<missing:{p['taskTypeId']}>")
        if p["code_status"] != "MISSING":
            by_flow[fid]["implemented_count"] += 1

    all_flow_ids = sorted(set(SLUG_TO_FLOW.values()))
    flows_with_no_code = sorted([
        fid for fid in all_flow_ids
        if by_flow[fid]["implemented_count"] == 0
    ])
    flows_with_services = sorted([
        fid for fid in all_flow_ids
        if by_flow[fid]["implemented_count"] > 0
    ])

    # Identify flows-with-code from orphan services (services that DON'T match any contract
    # but live in a flow directory)
    orphan_flow_coverage = defaultdict(int)
    for s in orphan_services:
        canon = s["canonical_slug"]
        fid = SLUG_TO_FLOW.get(canon)
        if fid:
            orphan_flow_coverage[fid] += 1
    flows_covered_by_orphan = sorted(orphan_flow_coverage.keys())
    flows_truly_empty = sorted(set(flows_with_no_code) - set(flows_covered_by_orphan))

    summary = {
        "total_processes": len(processes),
        "total_processes_with_code": sum(1 for p in processes if p.get("service_class")),
        "total_endpoints": len(annotated_endpoints),
        "total_events_emit_sites": len(emitted),
        "total_events_emitted_distinct": len(emitted_names),
        "total_events_consumed_distinct": len(consumed_names),
        "total_indices": len(indices),
        "service_files_total": len(services),
        "contracts_total": len(contracts),
        "stub_services": [s["class_name"] for s in services if s["code_status"] == "STUB"],
        "flows_with_services_via_contract": flows_with_services,
        "flows_with_no_contracted_service": flows_with_no_code,
        "flows_with_orphan_service_files": flows_covered_by_orphan,
        "flows_truly_empty": flows_truly_empty,
    }

    out = OrderedDict()
    out["generated_at"] = "2026-04-17"
    out["branch"] = "claude/vigorous-margulis"
    out["working_directory"] = str(ROOT).replace("\\", "/")
    out["derivation"] = "code-only (server/src/engine/flows, engine-contracts, api, full server/src for events/indices)"
    out["skepticism_notes"] = [
        "IMPL-STATE.json and PHASE-COMPLETE artifacts were NOT consulted.",
        "A process is COMPILES if its service file has a class with at least one method or constructor.",
        "A process is STUB if the class body is empty or has no methods + no constructor.",
        "A process is MISSING if the contract exists but no service class with the contract's name was found.",
        "Orphan services live under engine/flows/{slug}/ but their class name does not match any contract's name field.",
    ]
    out["summary"] = summary
    out["processes"] = sorted(
        processes,
        key=lambda p: (p.get("flowId") or "ZZZ", p["taskTypeId"]),
    )
    out["endpoints"] = annotated_endpoints
    out["events"] = {
        "all_emitted": emitted_names,
        "all_consumed": consumed_names,
        "events_without_consumer": events_without_consumer,
        "events_without_emitter": events_without_emitter,
    }
    out["indices"] = OrderedDict(
        sorted(
            ((k, [{"file": v["file"], "line": v["line"], "op": v["op"]} for v in vs])
             for k, vs in indices.items()),
            key=lambda x: x[0],
        )
    )
    out["orphans"] = {
        "services_without_taskTypeId": orphan_service_summaries,
        "contracts_without_service": [
            {"taskTypeId": c["taskTypeId"], "name": c["name"], "flowId": c.get("flowId"),
             "slug": c.get("slug"), "contract_file": f"{c['file']}:{c['line']}"}
            for c in sorted(orphan_contracts, key=lambda x: x["taskTypeId"] or "")
        ],
        "endpoints_without_service": [
            {"method": e["method"], "route": e["route"],
             "controller_class": e["controller_class"], "handler": e["handler"],
             "controller_file": f"{e['controller_file']}:{e['line']}"}
            for e in orphan_endpoints
        ],
        "events_without_consumer": events_without_consumer,
        "events_without_emitter": events_without_emitter,
    }
    out["by_flow"] = OrderedDict(
        sorted(
            ((k, {
                "process_count": v["process_count"],
                "implemented_count": v["implemented_count"],
                "process_ids": sorted(v["process_ids"]),
                "process_names": v["process_names"],
                "orphan_service_count_in_dir": orphan_flow_coverage.get(k, 0),
            }) for k, v in by_flow.items()),
            key=lambda x: x[0],
        )
    )
    out["flow_slug_map"] = OrderedDict(
        (flow, slug) for slug, flow in sorted(SLUG_TO_FLOW.items(), key=lambda x: x[1])
    )

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote: {OUT_JSON}", file=sys.stderr)

    # ---------- Build MD ----------
    md = []
    md.append("# Business Process Master State (XIIGen Engine)")
    md.append("")
    md.append(f"_Generated: {out['generated_at']} — branch `{out['branch']}` — derived from CODE only (no IMPL-STATE / docs/sessions trust)._")
    md.append("")
    md.append("## Executive Summary")
    md.append("")
    md.append("| Metric | Value |")
    md.append("|---|---|")
    md.append(f"| Total processes (contracts) | {summary['total_processes']} |")
    md.append(f"| Processes with matching service code | {summary['total_processes_with_code']} |")
    md.append(f"| Service classes total under `engine/flows/` | {summary['service_files_total']} |")
    md.append(f"| Contracts total in `engine-contracts/` | {summary['contracts_total']} |")
    md.append(f"| Total HTTP endpoints | {summary['total_endpoints']} |")
    md.append(f"| Distinct emitted event names | {summary['total_events_emitted_distinct']} |")
    md.append(f"| Distinct consumed event names | {summary['total_events_consumed_distinct']} |")
    md.append(f"| Distinct `xiigen-*` indices | {summary['total_indices']} |")
    md.append(f"| STUB services (no methods, no ctor) | {len(summary['stub_services'])} |")
    md.append("")
    md.append("### Flows with at least one CONTRACTED service (matched by name)")
    md.append("")
    md.append(", ".join(f"`{f}`" for f in summary["flows_with_services_via_contract"]) or "_(none)_")
    md.append("")
    md.append("### Flows with NO contracted service but contain orphan service files in their dir")
    md.append("")
    md.append(", ".join(f"`{f}`" for f in summary["flows_with_orphan_service_files"]
                        if f not in summary["flows_with_services_via_contract"]) or "_(none)_")
    md.append("")
    md.append("### Flows TRULY EMPTY (no contracted services AND no orphan files in dir)")
    md.append("")
    md.append(", ".join(f"`{f}`" for f in summary["flows_truly_empty"]) or "_(none)_")
    md.append("")

    md.append("## Per-Flow Process List")
    md.append("")
    declared_flow_ids = sorted(set(SLUG_TO_FLOW.values()))
    seen_flows = set()
    for fid in declared_flow_ids:
        slug = next((s for s, f in SLUG_TO_FLOW.items() if f == fid), "?")
        flow_procs = [p for p in processes if p.get("flowId") == fid]
        orphans_in_dir = [s for s in orphan_service_summaries if SLUG_TO_FLOW.get(s["canonical_slug"]) == fid]
        if not flow_procs and not orphans_in_dir:
            md.append(f"### {fid} — `{slug}` — _(no code)_")
            md.append("")
            continue
        seen_flows.add(fid)
        md.append(f"### {fid} — `{slug}`")
        md.append("")
        md.append(f"_Contracts: {len(flow_procs)} | Implemented: {sum(1 for p in flow_procs if p.get('service_class'))} | Orphan files in dir: {len(orphans_in_dir)}_")
        md.append("")
        if flow_procs:
            md.append("**Contracted processes:**")
            md.append("")
            md.append("| T# | Service Class | File | Methods | Fabrics | Status |")
            md.append("|---|---|---|---|---|---|")
            for p in sorted(flow_procs, key=lambda x: x["taskTypeId"]):
                svc = p.get("service_class") or "**(no service)**"
                sf = p.get("service_file") or "—"
                m = ", ".join(p["public_methods"][:5]) + (" ..." if len(p["public_methods"]) > 5 else "")
                fabrics = ", ".join(p["fabric_dependencies"]) or "—"
                md.append(f"| {p['taskTypeId']} | `{svc}` | `{sf}` | {m or '—'} | {fabrics} | {p['code_status']} |")
            md.append("")
        if orphans_in_dir:
            md.append(f"**Orphan service classes under `engine/flows/{slug}/` (no contract by name):** {len(orphans_in_dir)}")
            md.append("")
            md.append("| Class | File | Methods | Fabrics | Status |")
            md.append("|---|---|---|---|---|")
            for o in orphans_in_dir[:20]:
                md.append(f"| `{o['class_name']}` | `{o['file']}` | {o['method_count']} | {', '.join(o['fabric_deps']) or '—'} | {o['code_status']} |")
            if len(orphans_in_dir) > 20:
                md.append(f"| _+{len(orphans_in_dir) - 20} more_ |  |  |  |  |")
            md.append("")
        # Endpoints serving this flow (via matched contract services)
        flow_eps = []
        for p in flow_procs:
            for ep in p.get("endpoints", []):
                flow_eps.append((ep, p["service_class"]))
        if flow_eps:
            md.append("**Endpoints (via contracted service):**")
            md.append("")
            for ep, svc in flow_eps:
                md.append(f"- `{ep['method']} {ep['route']}` -> `{svc}` (`{ep['controller_file']}`)")
            md.append("")
        # Events emitted (across all services in this flow's dir, including orphans)
        flow_events_emit = set()
        flow_events_cons = set()
        flow_idxs = set()
        for p in flow_procs:
            for e in p.get("events_emitted", []):
                flow_events_emit.add(e["name"])
            for e in p.get("events_consumed", []):
                flow_events_cons.add(e["name"])
            for i in p.get("indices_used", []):
                flow_idxs.add(i)
        for o in orphans_in_dir:
            for e in o.get("events_emitted", []):
                flow_events_emit.add(e)
            for i in o.get("indices_used", []):
                flow_idxs.add(i)
        if flow_events_emit:
            md.append("**Events emitted (any service in flow dir):** " + ", ".join(f"`{e}`" for e in sorted(flow_events_emit)[:20])
                     + (f" _(+{len(flow_events_emit) - 20} more)_" if len(flow_events_emit) > 20 else ""))
            md.append("")
        if flow_events_cons:
            md.append("**Events consumed (contracted services only):** " + ", ".join(f"`{e}`" for e in sorted(flow_events_cons)[:20]))
            md.append("")
        if flow_idxs:
            md.append("**Indices referenced (any service in flow dir):** " + ", ".join(f"`{i}`" for i in sorted(flow_idxs)[:20])
                     + (f" _(+{len(flow_idxs) - 20} more)_" if len(flow_idxs) > 20 else ""))
            md.append("")
    # Contracts whose flowId is unknown
    unmapped_procs = [p for p in processes if p.get("flowId") not in declared_flow_ids]
    if unmapped_procs:
        md.append("### Contracts with non-canonical/unmapped flowId")
        md.append("")
        md.append("| T# | Name | FlowId | Contract File |")
        md.append("|---|---|---|---|")
        for p in unmapped_procs:
            md.append(f"| {p['taskTypeId']} | {p.get('service_class') or '?'} | {p.get('flowId') or '?'} | `{p['contract_file']}` |")
        md.append("")

    md.append("## Orphan Sections")
    md.append("")
    md.append(f"### A. Service classes in `engine/flows/` with no matching contract ({len(orphan_service_summaries)})")
    md.append("")
    md.append("These services live in flow directories but their class name does not match any T###_CONTRACT.name field. They may be (a) helper services, (b) renamed without contract update, (c) implementations of contracts whose name field uses a different word.")
    md.append("")
    md.append("| Class | Dir Slug | Canonical Slug | File | Methods | Status |")
    md.append("|---|---|---|---|---|---|")
    for s in sorted(orphan_service_summaries, key=lambda x: (x["dir_slug"], x["class_name"]))[:80]:
        md.append(f"| `{s['class_name']}` | `{s['dir_slug']}` | `{s['canonical_slug']}` | `{s['file']}` | {s['method_count']} | {s['code_status']} |")
    if len(orphan_service_summaries) > 80:
        md.append(f"| _... +{len(orphan_service_summaries) - 80} more_ |  |  |  |  |  |")
    md.append("")
    md.append(f"### B. Contracts with no service implementation ({len(out['orphans']['contracts_without_service'])})")
    md.append("")
    md.append("| T# | Name | FlowId | Contract File |")
    md.append("|---|---|---|---|")
    for c in out["orphans"]["contracts_without_service"][:80]:
        md.append(f"| {c['taskTypeId']} | {c['name']} | {c.get('flowId') or '?'} | `{c['contract_file']}` |")
    if len(out["orphans"]["contracts_without_service"]) > 80:
        md.append(f"| _... +{len(out['orphans']['contracts_without_service']) - 80} more_ |  |  |  |")
    md.append("")
    md.append(f"### C. HTTP endpoints not routing to any known engine service ({len(orphan_endpoints)})")
    md.append("")
    md.append("| Method | Route | Controller | Handler | File |")
    md.append("|---|---|---|---|---|")
    for e in orphan_endpoints[:60]:
        md.append(f"| `{e['method']}` | `{e['route']}` | `{e['controller_class']}` | `{e['handler']}` | `{e['controller_file']}` |")
    if len(orphan_endpoints) > 60:
        md.append(f"| _... +{len(orphan_endpoints) - 60} more_ |  |  |  |  |")
    md.append("")
    md.append(f"### D. Events emitted with no detected consumer ({len(events_without_consumer)})")
    md.append("")
    for e in events_without_consumer[:60]:
        md.append(f"- `{e}`")
    if len(events_without_consumer) > 60:
        md.append(f"- _... +{len(events_without_consumer) - 60} more_")
    md.append("")
    md.append(f"### E. Events consumed with no detected emitter ({len(events_without_emitter)})")
    md.append("")
    for e in events_without_emitter[:60]:
        md.append(f"- `{e}`")
    if len(events_without_emitter) > 60:
        md.append(f"- _... +{len(events_without_emitter) - 60} more_")
    md.append("")

    md.append("## Coverage Gap")
    md.append("")
    md.append(f"Of the {len(declared_flow_ids)} declared flows in CLAUDE.md slug map:")
    md.append("")
    md.append(f"- {len(summary['flows_with_services_via_contract'])} have at least one CONTRACTED service implemented")
    md.append(f"- {len(summary['flows_with_orphan_service_files']) - len(set(summary['flows_with_orphan_service_files']) & set(summary['flows_with_services_via_contract']))} additional flows have only orphan service files (no contract match)")
    md.append(f"- {len(summary['flows_truly_empty'])} flows have ZERO code (no contract impl AND no orphan files)")
    md.append("")
    if summary["flows_truly_empty"]:
        md.append("### Truly empty flows (no service files at all under their slug dir):")
        md.append("")
        for fid in summary["flows_truly_empty"]:
            slug = next((s for s, f in SLUG_TO_FLOW.items() if f == fid), "?")
            md.append(f"- `{fid}` — `{slug}`")
        md.append("")

    md.append("## Top 10 Surprising Findings")
    md.append("")
    findings = compute_surprising_findings(out, services, processes, contracts,
                                            annotated_endpoints, indices, emitted, consumed,
                                            events_without_consumer, orphan_service_summaries,
                                            orphan_endpoints)
    for i, f in enumerate(findings[:10], 1):
        md.append(f"{i}. {f}")
    md.append("")

    OUT_MD.parent.mkdir(parents=True, exist_ok=True)
    OUT_MD.write_text("\n".join(md), encoding="utf-8")
    print(f"Wrote: {OUT_MD}", file=sys.stderr)

    # Stdout summary
    print(json.dumps({
        "summary": summary,
        "out_json": str(OUT_JSON).replace("\\", "/"),
        "out_md": str(OUT_MD).replace("\\", "/"),
        "findings": findings[:10],
        "orphan_categories": {
            "services_without_taskTypeId": len(orphan_service_summaries),
            "contracts_without_service": len(out['orphans']['contracts_without_service']),
            "endpoints_without_service": len(orphan_endpoints),
            "events_without_consumer": len(events_without_consumer),
            "events_without_emitter": len(events_without_emitter),
        },
        "samples": {
            "orphan_services": [s["class_name"] for s in orphan_service_summaries[:5]],
            "orphan_contracts": [c["taskTypeId"] for c in out['orphans']['contracts_without_service'][:5]],
            "orphan_endpoints": [f"{e['method']} {e['route']}" for e in orphan_endpoints[:5]],
            "events_without_consumer": events_without_consumer[:5],
            "events_without_emitter": events_without_emitter[:5],
        }
    }, indent=2))

def compute_surprising_findings(out, services, processes, contracts, endpoints, indices,
                                 emitted, consumed, events_without_consumer,
                                 orphan_service_summaries, orphan_endpoints):
    findings = []
    summary = out["summary"]
    declared = set(SLUG_TO_FLOW.values())
    truly_empty = set(summary["flows_truly_empty"])
    contract_impl = set(summary["flows_with_services_via_contract"])
    only_orphan = set(summary["flows_with_orphan_service_files"]) - contract_impl
    if truly_empty:
        findings.append(
            f"**{len(truly_empty)} of {len(declared)} declared flows have ZERO code on disk** "
            f"(no service files in their slug dir): "
            + ", ".join(sorted(truly_empty)[:8]) + (f" (+{len(truly_empty)-8} more)" if len(truly_empty) > 8 else "")
        )
    if only_orphan:
        findings.append(
            f"**{len(only_orphan)} flows have service files on disk but ZERO matched contracts** "
            f"(implementations exist, but contract `name` field never matches the class name): "
            + ", ".join(sorted(only_orphan)[:8])
        )
    orph_svc = len(orphan_service_summaries)
    if orph_svc > 0:
        sample = [s["class_name"] for s in orphan_service_summaries[:5]]
        findings.append(
            f"**{orph_svc} service classes have NO matching taskTypeId contract** — "
            f"e.g. {', '.join('`'+x+'`' for x in sample)}. Either contract drift or helper services."
        )
    orph_c = len(out['orphans']['contracts_without_service'])
    if orph_c > 0:
        sample = [f"{c['taskTypeId']} `{c['name']}`" for c in out['orphans']['contracts_without_service'][:5]]
        findings.append(
            f"**{orph_c} contracts have NO service implementation** — declared but unimplemented: "
            + ", ".join(sample)
        )
    stub = summary["stub_services"]
    if stub:
        findings.append(
            f"**{len(stub)} services compile as STUBS** (no methods, no constructor): "
            + ", ".join('`'+s+'`' for s in stub[:8])
        )
    orph_ep = len(orphan_endpoints)
    if orph_ep > 0:
        sample_routes = [f"`{e['method']} {e['route']}`" for e in orphan_endpoints[:5]]
        findings.append(
            f"**{orph_ep} HTTP endpoints don't inject any known engine service** "
            f"(may route through fabric directly): " + ", ".join(sample_routes)
        )
    # Event distribution by directory
    flows_emit_count = defaultdict(int)
    for p in processes:
        flows_emit_count[p.get("slug") or "?"] += len(p.get("events_emitted", []))
    for o in orphan_service_summaries:
        flows_emit_count[o.get("canonical_slug") or "?"] += len(o.get("events_emitted", []))
    top = sorted(flows_emit_count.items(), key=lambda x: -x[1])[:5]
    top = [t for t in top if t[1] > 0]
    if top:
        findings.append(
            "**Top event-emitting slugs**: " + ", ".join(f"`{s}` ({n} sites)" for s, n in top)
        )
    idx_counts = sorted(((idx, len(locs)) for idx, locs in indices.items()), key=lambda x: -x[1])
    if idx_counts:
        findings.append(
            "**Most-referenced `xiigen-*` indices**: "
            + ", ".join(f"`{i}` ({n} hits)" for i, n in idx_counts[:5])
        )
    if events_without_consumer:
        findings.append(
            f"**{len(events_without_consumer)} distinct emitted event names have no detected consumer** "
            f"(may be terminal events, cross-flow listeners not yet wired, or string-literal mismatches): "
            + ", ".join(f"`{e}`" for e in events_without_consumer[:5])
        )
    findings.append(
        f"**{summary['total_indices']} `xiigen-*` indices referenced across "
        f"{summary['service_files_total']} service classes** "
        f"(avg {summary['total_indices'] / max(1, summary['service_files_total']):.1f} indices per service file)"
    )
    impl = sum(1 for p in processes if p.get("code_status") in ("COMPILES",))
    miss = sum(1 for p in processes if p.get("code_status") == "MISSING")
    if impl + miss > 0:
        pct = 100 * impl / (impl + miss)
        findings.append(
            f"**Implementation ratio**: {impl}/{impl+miss} contracts ({pct:.0f}%) have a matching "
            f"COMPILES service class; {miss} are MISSING."
        )
    # Inflated service counts
    findings.append(
        f"**Total exported classes under `engine/flows/`**: {summary['service_files_total']} — "
        f"vs {summary['contracts_total']} contracts and {summary['total_processes_with_code']} "
        f"contract-matched implementations. Engine has more code than its contract registry knows about."
    )
    return findings

if __name__ == "__main__":
    main()
