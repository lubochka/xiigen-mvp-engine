"""
FLOW-11 Pattern Seeder — seeds FLOW-11 (Schema Registry & DAG) design decisions into Elasticsearch and nano-graphrag.

Reads fixture files from:
  fixtures/rag-patterns/       — ARCH_PATTERN fixtures
  fixtures/design-reasoning/   — DESIGN_REASONING records (DR-11-A through DR-11-E)

Seeds to:
  Elasticsearch                — xiigen-rag-patterns and xiigen-planning-decisions indices
  nano-graphrag POST /insert   — GraphRAG knowledge graph for OSS LLM retrieval

Usage:
  python seed_schema_registry_dag_patterns.py                                  # seed all, default endpoints
  python seed_schema_registry_dag_patterns.py --dry-run                        # parse only, no writes
  python seed_schema_registry_dag_patterns.py --es-endpoint http://localhost:19200
  python seed_schema_registry_dag_patterns.py --graphrag-url http://localhost:8001
  python seed_schema_registry_dag_patterns.py --skip-es                        # graphrag only
  python seed_schema_registry_dag_patterns.py --skip-graphrag                  # ES only

What this seeds:
  ARCH_PATTERN fixtures (5):
    occ-publish-gate-001
    two-color-dfs-cycle-001
    breaking-change-gate-001
    dag-rebuild-async-001
    schema-version-pin-001

  DESIGN_REASONING records (5):
    DR-11-A through DR-11-E (from fixtures/design-reasoning/schema-registry-dag-design-decisions.json)
"""

import argparse
import json
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path
from typing import Any, Dict, List, Optional


# ── Paths ─────────────────────────────────────────────────────────────────────

PROJECT_ROOT         = Path(__file__).parent.parent
RAG_PATTERNS_DIR     = PROJECT_ROOT / 'fixtures' / 'rag-patterns'
DESIGN_REASONING_DIR = PROJECT_ROOT / 'fixtures' / 'design-reasoning'

# ── Elasticsearch ──────────────────────────────────────────────────────────────

ES_RAG_INDEX      = 'xiigen-rag-patterns'
ES_PLANNING_INDEX = 'xiigen-planning-decisions'

FLOW11_FIXTURE_IDS = {
    'occ-publish-gate-001',
    'two-color-dfs-cycle-001',
    'breaking-change-gate-001',
    'dag-rebuild-async-001',
    'schema-version-pin-001',
}

DESIGN_REASONING_FILE = DESIGN_REASONING_DIR / 'schema-registry-dag-design-decisions.json'

TENANT_ID = 'platform'  # platform-level patterns — not tenant-specific


# ── Elasticsearch helpers ──────────────────────────────────────────────────────

def _http(method: str, url: str, body: Optional[Any] = None, timeout: int = 10) -> dict:
    data = None
    headers = {'Content-Type': 'application/json'}
    if body is not None:
        data = (body if isinstance(body, bytes) else json.dumps(body).encode('utf-8'))
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read())


def es_check(endpoint: str) -> bool:
    try:
        _http('GET', f'{endpoint}/', timeout=5)
        return True
    except Exception:
        return False


def es_index_doc(endpoint: str, index: str, doc_id: str, doc: dict) -> None:
    _http('PUT', f'{endpoint}/{index}/_doc/{doc_id}', body=doc)


def es_bulk(endpoint: str, ndjson: str) -> dict:
    data = ndjson.encode('utf-8')
    headers = {'Content-Type': 'application/x-ndjson'}
    req = urllib.request.Request(
        f'{endpoint}/_bulk', data=data, headers=headers, method='POST'
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())


# ── GraphRAG helpers ───────────────────────────────────────────────────────────

def graphrag_check(url: str) -> bool:
    try:
        _http('GET', f'{url}/health', timeout=5)
        return True
    except Exception:
        return False


def graphrag_insert(url: str, records: List[dict]) -> None:
    for rec in records:
        _http('POST', f'{url}/insert', body=rec, timeout=15)
        time.sleep(0.05)  # gentle rate limit


# ── Fixture loaders ────────────────────────────────────────────────────────────

def load_rag_patterns() -> List[dict]:
    patterns = []
    for fixture_id in FLOW11_FIXTURE_IDS:
        path = RAG_PATTERNS_DIR / f'{fixture_id}.json'
        if not path.exists():
            print(f'  [WARN] RAG pattern fixture not found: {path}', file=sys.stderr)
            continue
        with open(path) as f:
            doc = json.load(f)
        doc.setdefault('tenantId', TENANT_ID)
        doc.setdefault('flowId', 'FLOW-11')
        patterns.append((fixture_id, doc))
    return patterns


def load_design_reasoning() -> List[dict]:
    if not DESIGN_REASONING_FILE.exists():
        print(f'  [WARN] Design reasoning file not found: {DESIGN_REASONING_FILE}', file=sys.stderr)
        return []
    with open(DESIGN_REASONING_FILE) as f:
        records = json.load(f)
    return records


# ── Seed routines ──────────────────────────────────────────────────────────────

def seed_es(endpoint: str, rag_patterns: list, design_reasoning: list, dry_run: bool) -> None:
    print(f'\n[ES] endpoint: {endpoint}')
    if not dry_run and not es_check(endpoint):
        print('  [SKIP] Elasticsearch not reachable', file=sys.stderr)
        return

    # Seed ARCH_PATTERN fixtures
    print(f'  Seeding {len(rag_patterns)} ARCH_PATTERN fixtures → {ES_RAG_INDEX}')
    for fixture_id, doc in rag_patterns:
        if dry_run:
            print(f'    [DRY] would index {fixture_id}')
        else:
            es_index_doc(endpoint, ES_RAG_INDEX, fixture_id, doc)
            print(f'    [OK] {fixture_id}')

    # Seed DESIGN_REASONING records
    print(f'  Seeding {len(design_reasoning)} DESIGN_REASONING records → {ES_PLANNING_INDEX}')
    for rec in design_reasoning:
        pid = rec.get('patternId', 'unknown')
        if dry_run:
            print(f'    [DRY] would index {pid}')
        else:
            es_index_doc(endpoint, ES_PLANNING_INDEX, pid, rec)
            print(f'    [OK] {pid}')


def seed_graphrag(url: str, rag_patterns: list, design_reasoning: list, dry_run: bool) -> None:
    print(f'\n[GraphRAG] url: {url}')
    if not dry_run and not graphrag_check(url):
        print('  [SKIP] nano-graphrag not reachable', file=sys.stderr)
        return

    all_records = [doc for _, doc in rag_patterns] + design_reasoning
    print(f'  Inserting {len(all_records)} records into GraphRAG')
    if dry_run:
        for rec in all_records:
            print(f'    [DRY] would insert {rec.get("patternId", rec.get("patternType", "?"))}')
    else:
        graphrag_insert(url, all_records)
        print(f'  [OK] {len(all_records)} records inserted')


# ── CLI ────────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description='Seed FLOW-11 RAG patterns')
    parser.add_argument('--es-endpoint', default='http://localhost:19200')
    parser.add_argument('--graphrag-url', default='http://localhost:8001')
    parser.add_argument('--skip-es', action='store_true')
    parser.add_argument('--skip-graphrag', action='store_true')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()

    print('=== FLOW-11 Schema Registry & DAG — RAG Pattern Seeder ===')

    rag_patterns = load_rag_patterns()
    design_reasoning = load_design_reasoning()

    print(f'\nLoaded: {len(rag_patterns)} ARCH_PATTERN fixtures, {len(design_reasoning)} DESIGN_REASONING records')

    if not args.skip_es:
        seed_es(args.es_endpoint, rag_patterns, design_reasoning, args.dry_run)

    if not args.skip_graphrag:
        seed_graphrag(args.graphrag_url, rag_patterns, design_reasoning, args.dry_run)

    print('\n=== Done ===')


if __name__ == '__main__':
    main()
