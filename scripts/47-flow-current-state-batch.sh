#!/usr/bin/env bash
# 47-flow-current-state-batch.sh
# Produces docs/sessions/47-FLOW-RAW-INPUTS.jsonl with one row per FLOW-XX (02..47).
# Each row carries D1/D2/D3/D5 inventory + Track A/B/C raw signals.
# Written to be idempotent and fast (~1 min for 46 flows).
#
# Source of truth for FLOW-XX → slug: CLAUDE.md "Naming Convention — Domain Slug Map"
set -uo pipefail

WORK="${WORK:-/c/Projects/xiigen mvp/.claude/worktrees/vigorous-margulis}"
cd "$WORK"

OUT="docs/sessions/47-FLOW-RAW-INPUTS.jsonl"
> "$OUT"

PUBLISHER_TENANT="00000000-0000-0000-0000-000000000001"
PKG_INDEX="xiigen-master-${PUBLISHER_TENANT}_xiigen-marketplace-packages"
RAG_INDEX="xiigen-master-${PUBLISHER_TENANT}_xiigen-rag-patterns"

# FLOW-XX → slug map (from CLAUDE.md)
declare -A SLUG=(
  [00]="bundle-activation"
  [01]="user-registration"
  [02]="profile-enrichment"
  [03]="event-management"
  [04]="event-attendance"
  [05]="completion-gamification"
  [06]="user-groups-communities"
  [07]="friend-request-social-feed"
  [08]="marketplace"
  [09]="transactional-event-participation"
  [10]="reviews-reputation"
  [11]="schema-registry-dag"
  [12]="subscription-billing"
  [13]="data-warehouse-analytics"
  [14]="etl-data-integration"
  [15]="saas-multi-tenancy"
  [16]="marketplace-payments"
  [17]="freelancer-marketplace"
  [18]="visual-flow-engine"
  [19]="durable-sagas-compliance"
  [20]="ads-platform"
  [21]="dynamic-forms-workflows"
  [22]="cms-publishing"
  [23]="form-builder-templates"
  [24]="ai-safety-moderation"
  [25]="bfa-cross-flow-governance"
  [26]="meta-flow-engine"
  [27]="human-interaction-gate"
  [28]="blog-cms-modules"
  [29]="adaptive-rag-deep-research"
  [30]="tenant-lifecycle-manager"
  [31]="design-intelligence-engine"
  [32]="sharable-flows-marketplace"
  [33]="system-initiation-bootstrap"
  [34]="marketplace-plugin-adapter"
  [35]="meta-arbitration-engine"
  [36]="feature-registry"
  [37]="design-system-governance"
  [38]="rag-quality-feedback"
  [39]="oss-curriculum"
  [40]="client-push"
  [41]="platform-agent-instrumentation"
  [42]="rag-quality-graph"
  [43]="meta-flow-orchestration"
  [44]="ai-self-modification"
  [45]="cycle-chain-extension"
  [46]="platform-agent"
  [47]="module-lifecycle"
)

emit_row() {
  python -c "
import json, sys, os, subprocess, re

flow_num = sys.argv[1]
slug = sys.argv[2]
flow_id = f'FLOW-{flow_num}'
combined = f'{flow_id}-{slug}'

def ls(p):
    try: return sorted(os.listdir(p))
    except (FileNotFoundError, NotADirectoryError): return []

def exists(p): return os.path.exists(p)

def es_get(url, body=None):
    try:
        if body:
            r = subprocess.run(['curl','-s','-X','POST',url,'-H','Content-Type: application/json','-d',body],
                               capture_output=True, text=True, timeout=10)
        else:
            r = subprocess.run(['curl','-s',url], capture_output=True, text=True, timeout=10)
        return json.loads(r.stdout) if r.stdout else {}
    except Exception as e:
        return {'_err': str(e)}

# D1
session_dir = f'docs/sessions/{flow_id}'
d1_files = ls(session_dir)

# D2
src_dir = f'server/src/engine/flows/{slug}'
d2_services = [f for f in ls(src_dir) if f.endswith('.service.ts')]
unit_tests = ls(f'server/test/{slug}')
e2e_tests = ls(f'server/test/e2e/{slug}')
client_tests = ls(f'client/__tests__/flows/{slug}')

# D3
qa_path = f'docs/sessions/{flow_id}/{flow_id}-QA-COVERAGE-STATE.json'
qa_state = None
if exists(qa_path):
    try:
        with open(qa_path, encoding='utf-8') as f: qa_state = json.load(f)
    except Exception: pass

# D5 — module lifecycle / scope portability touch points
sp_dir = ls('server/test/e2e/scope-portability')
ml_dir = ls('server/test/e2e/module-lifecycle')

# Track A
topo_path = f'contracts/topologies/{slug}.topology.json'
topo_data = None
if exists(topo_path):
    try:
        with open(topo_path, encoding='utf-8') as f: topo_data = json.load(f)
    except Exception: pass

# Track B applicability
spec_path = f'client/e2e/topology/{slug}-topology-qa.spec.ts'
spec_exists = exists(spec_path)

# Track C — live ES
pkg_index = 'xiigen-master-00000000-0000-0000-0000-000000000001_xiigen-marketplace-packages'
rag_index = 'xiigen-master-00000000-0000-0000-0000-000000000001_xiigen-rag-patterns'
pkg_q = json.dumps({'query':{'term':{'sourceFlowId':combined}}, '_source':['packageId','designBundleRefs']})
pkg_res = es_get(f'http://localhost:9200/{pkg_index}/_search?size=5', pkg_q)
hits = pkg_res.get('hits',{}).get('hits',[])

a1_total = 0; a1_match = 0
a2_embedded = []; a3_arbiters = 0
package_id = None
if hits:
    src = hits[0]['_source']
    package_id = src.get('packageId')
    bundle = src.get('designBundleRefs',{}) or {}
    pids = bundle.get('patternIds',[]) or []
    a1_total = len(pids)
    if pids:
        rag_q = json.dumps({'query':{'ids':{'values':pids}}})
        rag_res = es_get(f'http://localhost:9200/{rag_index}/_search?size={len(pids)}', rag_q)
        rag_hits = rag_res.get('hits',{}).get('hits',[])
        a1_match = sum(1 for h in rag_hits if h.get('_source',{}).get('flowId') == flow_id)
    a2_embedded = sorted(set(r.get('ruleId') for r in (bundle.get('ironRules',[]) or []) if r.get('ruleId','').startswith('CF-')))
    a3_arbiters = len(bundle.get('arbiterConfigIds',[]) or [])

# CFs from bfa-rules.ts (via grep)
bfa_path = f'server/src/engine-contracts/{slug}-bfa-rules.ts'
expected_cfs = []
if exists(bfa_path):
    try:
        with open(bfa_path, encoding='utf-8') as f: txt = f.read()
        expected_cfs = sorted(set(re.findall(r\"ruleId:\\s*['\\\"](CF-[^'\\\"]+)['\\\"]\", txt)))
    except Exception: pass

# Arbiter NDJSON record count
ndjson_path = f'fixtures/arbiters/{slug}-arbiters.bulk.ndjson'
arbiter_record_count = 0
if exists(ndjson_path):
    try:
        with open(ndjson_path, encoding='utf-8') as f: lines = sum(1 for _ in f)
        arbiter_record_count = lines // 2
    except Exception: pass

row = {
    'flowId': flow_id, 'slug': slug, 'combined_id': combined,
    'd1': {
        'session_dir': session_dir,
        'session_dir_exists': exists(session_dir),
        'file_count': len(d1_files),
        'files': d1_files[:50],
    },
    'd2': {
        'src_dir': src_dir,
        'src_dir_exists': exists(src_dir),
        'service_files': d2_services,
        'unit_tests': unit_tests,
        'e2e_tests': e2e_tests,
        'client_tests': client_tests,
    },
    'd3': {
        'qa_path': qa_path,
        'qa_present': qa_state is not None,
        'topology_node_count': (qa_state.get('Q3_topology_view',{}).get('topology_node_count') if qa_state else None) or (qa_state.get('topology_node_count') if qa_state else None),
        'applicability_to_marketplace': (qa_state.get('Q4_marketplace_ui',{}).get('applicabilityToMarketplace') if qa_state else None),
        'scope_isolation_arbiter_present': (qa_state.get('Q5_cross_tenant_install',{}).get('scope_isolation_arbiter_present') if qa_state else None),
    },
    'd5': {
        'scope_portability_dir_files': sum(1 for f in sp_dir if slug in f),
        'module_lifecycle_dir_files': sum(1 for f in ml_dir if slug in f),
    },
    'track_a': {
        'topology_path': topo_path,
        'topology_exists': topo_data is not None,
        'node_count': len((topo_data or {}).get('nodes',[])) if topo_data else 0,
        'edge_count': len((topo_data or {}).get('edges',[])) if topo_data else 0,
        'terminal_marker_count': sum(1 for e in (topo_data or {}).get('edges',[]) if isinstance(e, dict) and e.get('to') is None) if topo_data else 0,
        'node_ids': [(n.get('id') if isinstance(n, dict) else str(n)) for n in (topo_data or {}).get('nodes',[])] if topo_data else [],
    },
    'track_b': {
        'spec_path': spec_path,
        'spec_exists': spec_exists,
        'replace_applicable': spec_exists and (topo_data is not None),
    },
    'track_c': {
        'es_index': pkg_index,
        'package_count': len(hits),
        'package_id': package_id,
        'a1_patterns_total': a1_total,
        'a1_patterns_with_flow_match': a1_match,
        'a2_expected_cfs': expected_cfs,
        'a2_embedded_cfs': a2_embedded,
        'a2_missing': sorted(set(expected_cfs) - set(a2_embedded)),
        'a3_arbiter_config_ids': a3_arbiters,
        'a3_ndjson_record_count': arbiter_record_count,
        'bfa_rules_path': bfa_path if exists(bfa_path) else 'MISSING',
        'ndjson_path': ndjson_path if exists(ndjson_path) else 'MISSING',
    },
}
print(json.dumps(row))
" "$1" "$2"
}

for n in 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47; do
  s="${SLUG[$n]}"
  if [ -z "$s" ]; then echo "SKIP FLOW-$n (no slug)" >&2; continue; fi
  emit_row "$n" "$s" >> "$OUT"
done

echo "Wrote $(wc -l < "$OUT") rows to $OUT"
