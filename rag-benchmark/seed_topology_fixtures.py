#!/usr/bin/env python3
"""
seed_topology_fixtures.py — seeds fixtures/flow-definitions/ into xiigen-flow-definitions.
Usage:
  python seed_topology_fixtures.py                         # seed all
  python seed_topology_fixtures.py --flow FLOW-03          # seed one flow
  python seed_topology_fixtures.py --dry-run               # parse only
  python seed_topology_fixtures.py --es-endpoint http://...
"""
import json, glob, sys, argparse
from pathlib import Path

FIXTURES_DIR = Path(__file__).parent.parent / 'fixtures' / 'flow-definitions'
ES_INDEX     = 'xiigen-flow-definitions'

def get_args():
    p = argparse.ArgumentParser()
    p.add_argument('--dry-run',      action='store_true')
    p.add_argument('--flow',         default=None, help='Seed only this flowId')
    p.add_argument('--es-endpoint',  default='http://localhost:9200')
    return p.parse_args()

def seed(args):
    import urllib.request
    pattern = str(FIXTURES_DIR / '*.json')
    files   = sorted(glob.glob(pattern))
    seeded  = skipped = errors = 0

    for f in files:
        d = json.load(open(f))
        if args.flow and d.get('flowId') != args.flow:
            continue
        # Prefix flowId to prevent collision when different flows share taskTypeId range
        # e.g. FLOW-06-T99-T100::1.0 vs FLOW-09-T99-T101::1.0 — unambiguous
        doc_id   = f'{d["flowId"]}-{d["taskTypeId"]}::1.0'
        doc      = {**d, 'version': '1.0'}
        if args.dry_run:
            print(f'[dry-run] {d["flowId"]} {d["taskTypeId"]} — {doc_id}')
            seeded += 1
            continue
        url  = f'{args.es_endpoint}/{ES_INDEX}/_doc/{doc_id}'
        body = json.dumps(doc).encode()
        req  = urllib.request.Request(url, data=body, method='PUT',
                                      headers={'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(req) as resp:
                result = json.loads(resp.read())
                print(f'OK {d["flowId"]} {d["taskTypeId"]} -> {result.get("result","??")}')
                seeded += 1
        except Exception as e:
            print(f'ERR {d["flowId"]} {d["taskTypeId"]}: {e}', file=sys.stderr)
            errors += 1

    print(f'\nSeeded: {seeded}  Skipped: {skipped}  Errors: {errors}')
    if errors: sys.exit(1)

if __name__ == '__main__':
    seed(get_args())
