"""
FLOW-16 Marketplace Payments Pattern Seeder

Seeds FLOW-16 design decisions and RAG patterns into Elasticsearch and nano-graphrag.

Reads fixture files from:
  fixtures/rag-patterns/       — ARCH_PATTERN fixtures (4 patterns)
  fixtures/design-reasoning/   — DESIGN_REASONING triples (6 records)

Seeds to:
  Elasticsearch                — xiigen-rag-patterns and xiigen-planning-decisions indices
  nano-graphrag POST /insert   — GraphRAG knowledge graph for OSS LLM retrieval

Usage:
  python seed_marketplace_payments_patterns.py                                   # seed all
  python seed_marketplace_payments_patterns.py --dry-run                         # parse only
  python seed_marketplace_payments_patterns.py --es-endpoint http://localhost:19200
  python seed_marketplace_payments_patterns.py --graphrag-url http://localhost:8001
  python seed_marketplace_payments_patterns.py --skip-es                         # graphrag only
  python seed_marketplace_payments_patterns.py --skip-graphrag                   # ES only

What this seeds:
  ARCH_PATTERN fixtures (4):
    cart-lock-setnx-001
    payment-split-idempotency-001
    lifo-saga-compensation-001
    non-repudiation-audit-001

  DESIGN_REASONING triples (6):
    DR-16-A through DR-16-F (from fixtures/design-reasoning/marketplace-payments-design-decisions.json)
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

FLOW16_FIXTURE_IDS = {
    'cart-lock-setnx-001',
    'payment-split-idempotency-001',
    'lifo-saga-compensation-001',
    'non-repudiation-audit-001',
}

FLOW16_DR_FILE = 'marketplace-payments-design-decisions.json'


# ── HTTP helpers ───────────────────────────────────────────────────────────────

def _request(method: str, url: str, body: Optional[Dict] = None) -> Dict[str, Any]:
    data = json.dumps(body).encode('utf-8') if body else None
    headers = {'Content-Type': 'application/json'}
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as exc:
        msg = exc.read().decode('utf-8') if exc.fp else str(exc)
        raise RuntimeError(f'HTTP {exc.code} {method} {url}: {msg}') from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f'Connection failed {method} {url}: {exc.reason}') from exc


def es_index(es_url: str, index: str, doc_id: str, doc: Dict, dry_run: bool) -> None:
    url = f'{es_url}/{index}/_doc/{doc_id}'
    if dry_run:
        print(f'  [DRY-RUN] PUT {url}')
        return
    result = _request('PUT', url, doc)
    status = result.get('result', '?')
    print(f'  ES {status}: {index}/{doc_id}')


def graphrag_insert(graphrag_url: str, doc: Dict, dry_run: bool) -> None:
    url = f'{graphrag_url}/insert'
    if dry_run:
        print(f'  [DRY-RUN] POST {url} — {doc.get("patternId", doc.get("patternType", "?"))}')
        return
    try:
        result = _request('POST', url, doc)
        print(f'  GraphRAG inserted: {result}')
    except RuntimeError as exc:
        print(f'  GraphRAG WARNING (non-fatal): {exc}', file=sys.stderr)


# ── Seed functions ─────────────────────────────────────────────────────────────

def seed_rag_patterns(
    es_url: str,
    graphrag_url: str,
    skip_es: bool,
    skip_graphrag: bool,
    dry_run: bool,
) -> int:
    seeded = 0
    print('\n── FLOW-16 RAG Patterns ──────────────────────────────────────────')
    for fixture_id in sorted(FLOW16_FIXTURE_IDS):
        fixture_path = RAG_PATTERNS_DIR / f'{fixture_id}.json'
        if not fixture_path.exists():
            print(f'  MISSING: {fixture_path}', file=sys.stderr)
            continue
        doc = json.loads(fixture_path.read_text(encoding='utf-8'))
        print(f'  Seeding {fixture_id} ...')
        if not skip_es:
            es_index(es_url, ES_RAG_INDEX, fixture_id, doc, dry_run)
        if not skip_graphrag:
            graphrag_insert(graphrag_url, doc, dry_run)
        seeded += 1
    return seeded


def seed_design_reasoning(
    es_url: str,
    graphrag_url: str,
    skip_es: bool,
    skip_graphrag: bool,
    dry_run: bool,
) -> int:
    seeded = 0
    print('\n── FLOW-16 Design Reasoning Triples ─────────────────────────────')
    dr_path = DESIGN_REASONING_DIR / FLOW16_DR_FILE
    if not dr_path.exists():
        print(f'  MISSING: {dr_path}', file=sys.stderr)
        return 0
    records: List[Dict] = json.loads(dr_path.read_text(encoding='utf-8'))
    for record in records:
        pattern_id = record.get('patternId', 'unknown')
        print(f'  Seeding {pattern_id} ...')
        if not skip_es:
            es_index(es_url, ES_PLANNING_INDEX, pattern_id, record, dry_run)
        if not skip_graphrag:
            graphrag_insert(graphrag_url, record, dry_run)
        seeded += 1
    return seeded


# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description='Seed FLOW-16 marketplace payments RAG patterns into Elasticsearch and nano-graphrag.'
    )
    parser.add_argument('--es-endpoint', default='http://localhost:9200', help='Elasticsearch endpoint')
    parser.add_argument('--graphrag-url', default='http://localhost:8080', help='nano-graphrag endpoint')
    parser.add_argument('--skip-es', action='store_true', help='Skip Elasticsearch seeding')
    parser.add_argument('--skip-graphrag', action='store_true', help='Skip nano-graphrag seeding')
    parser.add_argument('--dry-run', action='store_true', help='Parse files and print actions without writing')
    args = parser.parse_args()

    print('FLOW-16 Marketplace Payments Pattern Seeder')
    print(f'  ES endpoint:      {args.es_endpoint}')
    print(f'  GraphRAG URL:     {args.graphrag_url}')
    print(f'  Skip ES:          {args.skip_es}')
    print(f'  Skip GraphRAG:    {args.skip_graphrag}')
    print(f'  Dry run:          {args.dry_run}')

    start = time.time()
    total = 0

    total += seed_rag_patterns(
        es_url=args.es_endpoint,
        graphrag_url=args.graphrag_url,
        skip_es=args.skip_es,
        skip_graphrag=args.skip_graphrag,
        dry_run=args.dry_run,
    )

    total += seed_design_reasoning(
        es_url=args.es_endpoint,
        graphrag_url=args.graphrag_url,
        skip_es=args.skip_es,
        skip_graphrag=args.skip_graphrag,
        dry_run=args.dry_run,
    )

    elapsed = time.time() - start
    print(f'\n✓ Done: {total} documents seeded in {elapsed:.2f}s')


if __name__ == '__main__':
    main()
