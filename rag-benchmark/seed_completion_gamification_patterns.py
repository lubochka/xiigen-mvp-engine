"""
FLOW-05 Pattern Seeder — seeds FLOW-05 design decisions into Elasticsearch and nano-graphrag.

Reads fixture files from:
  fixtures/rag-patterns/       — ARCH_PATTERN and PLAN_EXEMPLAR fixtures
  fixtures/design-reasoning/   — DESIGN_REASONING triples

Seeds to:
  Elasticsearch                — xiigen-rag-patterns and xiigen-planning-decisions indices
  nano-graphrag POST /insert   — GraphRAG knowledge graph for OSS LLM retrieval

Usage:
  python seed_flow05_patterns.py                                  # seed all, default endpoints
  python seed_flow05_patterns.py --dry-run                        # parse only, no writes
  python seed_flow05_patterns.py --es-endpoint http://localhost:19200
  python seed_flow05_patterns.py --graphrag-url http://localhost:8001
  python seed_flow05_patterns.py --skip-es                        # graphrag only
  python seed_flow05_patterns.py --skip-graphrag                  # ES only

What this seeds:
  ARCH_PATTERN fixtures (4):
    arch--server-side-calculation
    arch--timezone-aware-streak
    arch--privacy-gate-branch
    arch--ml-output-validation

  PLAN_EXEMPLAR fixture (1):
    plan-flow05-completion-gamification

  DESIGN_REASONING triples (6):
    DR-05-A through DR-05-F (from fixtures/design-reasoning/flow05-design-decisions.json)
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

PROJECT_ROOT        = Path(__file__).parent.parent
RAG_PATTERNS_DIR    = PROJECT_ROOT / 'fixtures' / 'rag-patterns'
DESIGN_REASONING_DIR = PROJECT_ROOT / 'fixtures' / 'design-reasoning'

# ── Elasticsearch ──────────────────────────────────────────────────────────────

ES_RAG_INDEX        = 'xiigen-rag-patterns'
ES_PLANNING_INDEX   = 'xiigen-planning-decisions'

FLOW05_FIXTURE_IDS = {
    'arch--server-side-calculation',
    'arch--timezone-aware-streak',
    'arch--privacy-gate-branch',
    'arch--ml-output-validation',
    'plan-flow05-completion-gamification',
}

DESIGN_REASONING_FILE = DESIGN_REASONING_DIR / 'flow05-design-decisions.json'

TENANT_ID = 'platform'  # platform-level patterns — not tenant-specific


# ── Elasticsearch helpers ──────────────────────────────────────────────────────

def _http(method: str, url: str, body: Optional[dict | str] = None, timeout: int = 10) -> dict:
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

def load_rag_fixtures() -> List[Dict[str, Any]]:
    """Load FLOW-05 ARCH_PATTERN and PLAN_EXEMPLAR fixtures."""
    docs = []
    for fixture_id in FLOW05_FIXTURE_IDS:
        path = RAG_PATTERNS_DIR / f'{fixture_id}.json'
        if not path.exists():
            print(f'  WARN: fixture not found: {path}')
            continue
        with open(path, encoding='utf-8') as f:
            doc = json.load(f)
        # Add tenantId for P1 compliance
        doc['tenantId'] = TENANT_ID
        docs.append(doc)
    return docs


def load_design_reasoning() -> List[Dict[str, Any]]:
    """Load FLOW-05 DESIGN_REASONING triples."""
    if not DESIGN_REASONING_FILE.exists():
        print(f'  WARN: design-reasoning file not found: {DESIGN_REASONING_FILE}')
        return []
    with open(DESIGN_REASONING_FILE, encoding='utf-8') as f:
        docs = json.load(f)
    for doc in docs:
        doc['tenantId'] = TENANT_ID
    return docs


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
    """
    Convert a fixture document to a rich text string for GraphRAG insertion.
    The LLM will extract entities and relations from this text.
    """
    pattern_id   = doc.get('patternId', '')
    pattern_type = doc.get('patternType', '')
    archetype    = doc.get('archetype', '')

    parts = []
    parts.append(f'Pattern: {pattern_id} | Type: {pattern_type} | Archetype: {archetype}')

    iron_rules = doc.get('ironRules', [])
    if iron_rules:
        parts.append(f'IronRules: {"; ".join(iron_rules)}')

    code_snippet = doc.get('codeSnippet', '')
    if code_snippet:
        parts.append(f'Code: {code_snippet[:200]}')

    tags = doc.get('tags', [])
    if tags:
        parts.append(f'Tags: {" ".join(tags)}')

    keywords = doc.get('keywords', '')
    if keywords:
        parts.append(f'Keywords: {keywords[:120]}')

    # DESIGN_REASONING fields
    if 'teachingPoint' in doc:
        parts.append(f'\nTeaching Point:\n{doc["teachingPoint"]}')
    if 'positiveExample' in doc:
        parts.append(f'\nPositive Example (CHOSEN):\n{doc["positiveExample"]}')
    if 'negativeExample' in doc:
        parts.append(f'\nNegative Example (REJECTED):\n{doc["negativeExample"]}')
    if 'discriminatingConstraint' in doc:
        parts.append(f'\nDiscriminating Constraint:\n{doc["discriminatingConstraint"]}')

    if 'appliesTo' in doc:
        parts.append(f'\nApplies To: {", ".join(doc["appliesTo"])}')

    return '\n'.join(parts)


def graphrag_insert(base_url: str, docs: List[Dict[str, Any]], workspace: str = 'flow05-design') -> Dict[str, Any]:
    """
    Insert documents into nano-graphrag via POST /insert.
    Each fixture becomes a document in the knowledge graph.
    """
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
                'patternType': doc.get('patternType', ''),
                'flowId':      doc.get('flowId', ''),
                'domainId':    doc.get('domainId', ''),
                'curriculumTier': doc.get('curriculumTier', 1),
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
    print('XIIGen FLOW-05 Pattern Seeder')
    print(f'  dry-run:   {dry_run}')
    print(f'  ES:        {es_endpoint} ({"skip" if skip_es else "enabled"})')
    print(f'  graphrag:  {graphrag_url} ({"skip" if skip_graphrag else "enabled"})')
    print(sep)

    # ── Load fixtures ──────────────────────────────────────────────────────────
    print('\n[1/4] Loading fixture files ...')
    rag_docs = load_rag_fixtures()
    dr_docs  = load_design_reasoning()
    print(f'  ARCH_PATTERN + PLAN_EXEMPLAR: {len(rag_docs)} fixtures')
    print(f'  DESIGN_REASONING triples:     {len(dr_docs)} records')
    total = len(rag_docs) + len(dr_docs)
    print(f'  Total: {total}')

    if dry_run:
        print('\n[DRY RUN] Would seed:')
        for doc in rag_docs + dr_docs:
            print(f'  {doc["patternId"]} ({doc["patternType"]})')
        print('\n[DRY RUN] Complete — no writes performed.')
        return 0

    # ── Elasticsearch ──────────────────────────────────────────────────────────
    es_ok = False
    if not skip_es:
        print(f'\n[2/4] Elasticsearch seeding ...')
        if not es_check(es_endpoint):
            print('  ES unreachable — skipping ES seeding (use --skip-es to suppress this warning)')
        else:
            es_ok = True
            es_ensure_index(es_endpoint, ES_RAG_INDEX)
            es_ensure_index(es_endpoint, ES_PLANNING_INDEX)

            # Seed ARCH_PATTERN + PLAN_EXEMPLAR → xiigen-rag-patterns
            if rag_docs:
                result = es_bulk_index(es_endpoint, ES_RAG_INDEX, rag_docs)
                print(f'  xiigen-rag-patterns: {result["indexed"]} indexed, {result["errors"]} errors')
                time.sleep(0.1)

            # Seed DESIGN_REASONING → xiigen-planning-decisions
            if dr_docs:
                result = es_bulk_index(es_endpoint, ES_PLANNING_INDEX, dr_docs)
                print(f'  xiigen-planning-decisions: {result["indexed"]} indexed, {result["errors"]} errors')
    else:
        print('\n[2/4] Elasticsearch seeding SKIPPED')

    # ── nano-graphrag ──────────────────────────────────────────────────────────
    graphrag_ok = False
    if not skip_graphrag:
        print(f'\n[3/4] nano-graphrag insertion ...')
        if not graphrag_check(graphrag_url):
            print('  nano-graphrag unreachable — skipping (use --skip-graphrag to suppress this warning)')
            print('  To start: cd nano-graphrag-server && docker-compose up')
        else:
            graphrag_ok = True
            all_docs = rag_docs + dr_docs
            print(f'  Inserting {len(all_docs)} documents into workspace flow05-design ...')
            result = graphrag_insert(graphrag_url, all_docs, workspace='flow05-design')
            inserted = result.get('inserted', 0)
            errors   = result.get('errors', [])
            print(f'  Inserted: {inserted}')
            if errors:
                print(f'  Errors: {errors}')
            else:
                print(f'  Workspaces updated: {result.get("workspaces", [])}')
    else:
        print('\n[3/4] nano-graphrag insertion SKIPPED')

    # ── Summary ────────────────────────────────────────────────────────────────
    print(f'\n[4/4] Summary')
    print(f'  Fixtures loaded:  {total}')
    print(f'  ES seeded:        {"yes" if es_ok else "no (unreachable or skipped)"}')
    print(f'  GraphRAG seeded:  {"yes" if graphrag_ok else "no (unreachable or skipped)"}')
    print()
    if not es_ok and not graphrag_ok and not skip_es and not skip_graphrag:
        print('  NOTE: Both systems unreachable. Fixture files are created and ready.')
        print('  Run again once Elasticsearch and nano-graphrag-server are running.')
        print()
        print('  Start services:')
        print('    cd nano-graphrag-server && docker-compose up -d')
        print('    cd .. && docker-compose -f docker-compose.test.yml up -d elasticsearch')
        print()
        print('  Then re-run:')
        print('    python rag-benchmark/seed_flow05_patterns.py')
    print(sep)
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description='Seed FLOW-05 design patterns into Elasticsearch and nano-graphrag',
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument('--dry-run',       action='store_true', default=False,
                        help='Parse and validate fixtures only — no writes')
    parser.add_argument('--es-endpoint',   default='http://localhost:19200',
                        help='Elasticsearch endpoint (default: http://localhost:19200)')
    parser.add_argument('--graphrag-url',  default='http://localhost:8001',
                        help='nano-graphrag server URL (default: http://localhost:8001)')
    parser.add_argument('--skip-es',       action='store_true', default=False,
                        help='Skip Elasticsearch seeding')
    parser.add_argument('--skip-graphrag', action='store_true', default=False,
                        help='Skip nano-graphrag insertion')
    return run(parser.parse_args())


if __name__ == '__main__':
    sys.exit(main())
