"""
FLOW-44 Framer Text Elements Adapter Pattern Seeder

Seeds FLOW-44 design decisions and RAG patterns into Elasticsearch and nano-graphrag.

Reads fixture files from:
  server/src/bootstrap/history-seeds/ — Design corpus (4 RAG + 4 DR = 8 records)

Usage:
  python seed_framer_text_adapter_patterns.py                                   # seed all
  python seed_framer_text_adapter_patterns.py --dry-run                         # parse only
"""

import argparse
import json
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path
from typing import Any, Dict, List, Optional


PROJECT_ROOT      = Path(__file__).parent.parent
HISTORY_SEEDS_DIR = PROJECT_ROOT / 'server' / 'src' / 'bootstrap' / 'history-seeds'
ES_PLANNING_INDEX = 'xiigen-planning-decisions'
FLOW44_CORPUS_FILE = 'framer-text-adapter-design-corpus.json'


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
        print(f'  [DRY-RUN] POST {url} — {doc.get("patternId", "?")}')
        return
    try:
        result = _request('POST', url, doc)
        print(f'  GraphRAG inserted: {result}')
    except RuntimeError as exc:
        print(f'  GraphRAG WARNING (non-fatal): {exc}', file=sys.stderr)


def seed_design_corpus(es_url: str, graphrag_url: str, skip_es: bool, skip_graphrag: bool, dry_run: bool) -> int:
    seeded = 0
    print('\n── FLOW-44 Design Corpus ──────────────────────────────────────')
    corpus_path = HISTORY_SEEDS_DIR / FLOW44_CORPUS_FILE
    if not corpus_path.exists():
        print(f'  MISSING: {corpus_path}', file=sys.stderr)
        return 0
    records: List[Dict] = json.loads(corpus_path.read_text(encoding='utf-8'))
    for record in records:
        pattern_id = record.get('patternId', 'unknown')
        print(f'  Seeding {pattern_id} ...')
        if not skip_es:
            es_index(es_url, ES_PLANNING_INDEX, pattern_id, record, dry_run)
        if not skip_graphrag:
            graphrag_insert(graphrag_url, record, dry_run)
        seeded += 1
    return seeded


def main() -> None:
    parser = argparse.ArgumentParser(description='Seed FLOW-44 Framer Text Adapter RAG patterns.')
    parser.add_argument('--es-endpoint', default='http://localhost:9200', help='Elasticsearch endpoint')
    parser.add_argument('--graphrag-url', default='http://localhost:8080', help='nano-graphrag endpoint')
    parser.add_argument('--skip-es', action='store_true', help='Skip Elasticsearch seeding')
    parser.add_argument('--skip-graphrag', action='store_true', help='Skip nano-graphrag seeding')
    parser.add_argument('--dry-run', action='store_true', help='Parse files and print actions without writing')
    args = parser.parse_args()

    print('FLOW-44 Framer Text Adapter Pattern Seeder')
    print(f'  ES endpoint:      {args.es_endpoint}')
    print(f'  GraphRAG URL:     {args.graphrag_url}')

    start = time.time()
    total = seed_design_corpus(args.es_endpoint, args.graphrag_url, args.skip_es, args.skip_graphrag, args.dry_run)
    elapsed = time.time() - start
    print(f'\n✓ Done: {total} documents seeded in {elapsed:.2f}s')


if __name__ == '__main__':
    main()
