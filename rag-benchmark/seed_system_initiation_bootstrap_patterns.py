"""
FLOW-33 Pattern Seeder — seeds FLOW-33 (System Initiation Bootstrap) design decisions
into Elasticsearch and nano-graphrag.

Reads fixture files from:
  fixtures/rag-patterns/       — ARCH_PATTERN fixtures
  fixtures/design-reasoning/   — DESIGN_REASONING records (DR-33-A through DR-33-F)

Seeds to:
  Elasticsearch                — xiigen-rag-patterns and xiigen-planning-decisions indices
  nano-graphrag POST /insert   — GraphRAG knowledge graph for OSS LLM retrieval

Usage:
  python seed_system_initiation_bootstrap_patterns.py                                  # seed all, default endpoints
  python seed_system_initiation_bootstrap_patterns.py --dry-run                        # parse only, no writes
  python seed_system_initiation_bootstrap_patterns.py --es-endpoint http://localhost:19200
  python seed_system_initiation_bootstrap_patterns.py --graphrag-url http://localhost:8001
  python seed_system_initiation_bootstrap_patterns.py --skip-es                        # graphrag only
  python seed_system_initiation_bootstrap_patterns.py --skip-graphrag                  # ES only
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

DESIGN_REASONING_FILE = DESIGN_REASONING_DIR / 'system-initiation-bootstrap-design-decisions.json'

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
    except Exception as e:
        print(f'  ES not reachable at {endpoint}: {e}')
        return False


def es_ensure_index(endpoint: str, index_name: str) -> bool:
    """Create index if it does not exist. Safe to re-run."""
    try:
        _http('GET', f'{endpoint}/{index_name}', timeout=5)
        print(f'  Index {index_name} already exists')
        return True
    except urllib.error.HTTPError as e:
        if e.code == 404:
            try:
                _http('PUT', f'{endpoint}/{index_name}', {
                    'settings': {'number_of_shards': 1, 'number_of_replicas': 0}
                })
                print(f'  Created index {index_name}')
                return True
            except Exception as create_err:
                print(f'  Failed to create index {index_name}: {create_err}')
                return False
        print(f'  ES error checking {index_name}: {e}')
        return False


def es_bulk_index(endpoint: str, index_name: str, docs: List[Dict[str, Any]]) -> Dict[str, int]:
    """Bulk index documents. Returns {indexed, errors}."""
    if not docs:
        return {'indexed': 0, 'errors': 0}

    lines = []
    for doc in docs:
        doc_id = doc.get('patternId', doc.get('id', 'unknown'))
        lines.append(json.dumps({'index': {'_index': index_name, '_id': doc_id}}))
        lines.append(json.dumps(doc))
    body = ('\n'.join(lines) + '\n').encode('utf-8')

    try:
        req = urllib.request.Request(
            f'{endpoint}/_bulk',
            data=body,
            headers={'Content-Type': 'application/x-ndjson'},
            method='POST',
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read())
            errors = sum(1 for item in result.get('items', []) if item.get('index', {}).get('error'))
            indexed = len(result.get('items', [])) - errors
            return {'indexed': indexed, 'errors': errors}
    except Exception as e:
        print(f'  Bulk index error: {e}')
        return {'indexed': 0, 'errors': len(docs)}


# ── Fixture loaders ────────────────────────────────────────────────────────────

def load_design_reasoning() -> List[Dict[str, Any]]:
    """Load FLOW-33 DESIGN_REASONING records (DR-33-A through DR-33-F)."""
    if not DESIGN_REASONING_FILE.exists():
        print(f'  WARN: design-reasoning file not found: {DESIGN_REASONING_FILE}')
        return []
    with open(DESIGN_REASONING_FILE, encoding='utf-8') as f:
        data = json.load(f)
    records = data.get('records', data) if isinstance(data, dict) else data
    for doc in records:
        doc['tenantId'] = TENANT_ID
        doc['patternId'] = doc.get('patternId', doc.get('id', 'unknown'))
    return records


# ── nano-graphrag helpers ──────────────────────────────────────────────────────

def graphrag_check(base_url: str) -> bool:
    try:
        req = urllib.request.Request(f'{base_url}/health', method='GET')
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status == 200
    except Exception as e:
        print(f'  nano-graphrag not reachable at {base_url}: {e}')
        return False


def fixture_to_graphrag_content(doc: Dict[str, Any]) -> str:
    """Convert a fixture document to rich text for GraphRAG insertion."""
    pattern_id   = doc.get('patternId', '')
    pattern_type = doc.get('patternType', '')
    tags         = doc.get('tags', [])
    keywords     = doc.get('keywords', '')

    content = (
        f'Pattern: {pattern_id} | Type: {pattern_type}\n'
        f'Tags: {" ".join(tags)} | Keywords: {keywords[:120]}'
    )

    if 'teachingPoint' in doc:
        content += f'\nTeachingPoint: {doc["teachingPoint"]}'
    if 'problem' in doc:
        content += f'\nProblem: {doc["problem"]}'
    if 'solution' in doc:
        content += f'\nSolution: {doc["solution"]}'

    return content


def graphrag_insert(base_url: str, docs: List[Dict[str, Any]], workspace: str = 'flow33-design') -> Dict[str, Any]:
    """Insert documents into nano-graphrag via POST /insert."""
    if not docs:
        return {'inserted': 0, 'workspaces': [], 'errors': []}

    graphrag_docs = []
    for doc in docs:
        pattern_id = doc.get('patternId', 'unknown')
        content = fixture_to_graphrag_content(doc)
        graphrag_docs.append({
            'doc_id':    pattern_id,
            'content':   content,
            'workspace': workspace,
            'metadata': {
                'patternType':    doc.get('patternType', ''),
                'flowId':         doc.get('flowId', ''),
                'curriculumTier': doc.get('curriculumTier', 2),
            }
        })

    payload = json.dumps({'documents': graphrag_docs}).encode('utf-8')
    try:
        req = urllib.request.Request(
            f'{base_url}/insert',
            data=payload,
            headers={'Content-Type': 'application/json'},
            method='POST',
        )
        with urllib.request.urlopen(req, timeout=120) as resp:
            return json.loads(resp.read())
    except Exception as e:
        return {'inserted': 0, 'workspaces': [], 'errors': [str(e)]}


# ── Main pipeline ──────────────────────────────────────────────────────────────

def run(args: argparse.Namespace) -> int:
    dry_run       = args.dry_run
    es_endpoint   = args.es_endpoint.rstrip('/')
    graphrag_url  = args.graphrag_url.rstrip('/')
    skip_es       = args.skip_es
    skip_graphrag = args.skip_graphrag

    sep = '-' * 60
    print(sep)
    print('XIIGen FLOW-33 System Initiation Bootstrap Pattern Seeder')
    print(f'  dry-run:   {dry_run}')
    print(f'  ES:        {es_endpoint} ({"skip" if skip_es else "enabled"})')
    print(f'  graphrag:  {graphrag_url} ({"skip" if skip_graphrag else "enabled"})')
    print(sep)

    print('\n[1/4] Loading fixture files ...')
    dr_docs  = load_design_reasoning()
    print(f'  DESIGN_REASONING records (DR-33-A..F): {len(dr_docs)}')
    total = len(dr_docs)
    print(f'  Total: {total}')

    if dry_run:
        print('\n[DRY RUN] Would seed:')
        for doc in dr_docs:
            print(f'  {doc.get("patternId", doc.get("id"))} ({doc.get("patternType", "DR")})')
        print('\n[DRY RUN] Complete — no writes performed.')
        return 0

    es_ok = False
    if not skip_es:
        print(f'\n[2/4] Elasticsearch seeding ...')
        if not es_check(es_endpoint):
            print('  ES unreachable — skipping ES seeding')
        else:
            es_ok = True
            es_ensure_index(es_endpoint, ES_PLANNING_INDEX)

            if dr_docs:
                result = es_bulk_index(es_endpoint, ES_PLANNING_INDEX, dr_docs)
                print(f'  xiigen-planning-decisions: {result["indexed"]} indexed, {result["errors"]} errors')
    else:
        print('\n[2/4] Elasticsearch seeding SKIPPED')

    graphrag_ok = False
    if not skip_graphrag:
        print(f'\n[3/4] nano-graphrag insertion ...')
        if not graphrag_check(graphrag_url):
            print('  nano-graphrag unreachable — skipping')
        else:
            graphrag_ok = True
            all_docs = dr_docs
            result = graphrag_insert(graphrag_url, all_docs, workspace='flow33-design')
            print(f'  Inserted: {result.get("inserted", 0)}')
            if result.get('errors'):
                print(f'  Errors: {result["errors"]}')
    else:
        print('\n[3/4] nano-graphrag insertion SKIPPED')

    print(f'\n[4/4] Summary')
    print(f'  Fixtures loaded:  {total}')
    print(f'  ES seeded:        {"yes" if es_ok else "no (unreachable or skipped)"}')
    print(f'  GraphRAG seeded:  {"yes" if graphrag_ok else "no (unreachable or skipped)"}')
    print(sep)
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description='Seed FLOW-33 System Initiation Bootstrap design patterns into Elasticsearch and nano-graphrag',
    )
    parser.add_argument('--dry-run',       action='store_true', default=False)
    parser.add_argument('--es-endpoint',   default='http://localhost:19200')
    parser.add_argument('--graphrag-url',  default='http://localhost:8001')
    parser.add_argument('--skip-es',       action='store_true', default=False)
    parser.add_argument('--skip-graphrag', action='store_true', default=False)
    return run(parser.parse_args())


if __name__ == '__main__':
    sys.exit(main())
