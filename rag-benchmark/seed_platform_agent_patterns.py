#!/usr/bin/env python3
"""
FLOW-46 Platform Agent — pattern seeding script.

Reads:
  fixtures/design-reasoning/platform-agent-design-decisions.json
    (12 DR records + 3 ARCH_PATTERN records from Phase 1)
  fixtures/arbiters/platform-agent-arbiters.bulk.ndjson
    (8 arbiter panels + scope_isolation last = 9 records total)

Writes to Elasticsearch:
  xiigen-rag-patterns        - DR + ARCH patterns
  xiigen-planning-decisions  - DR triples (teachingPoint + discriminatingConstraint pairs)
  xiigen-arbiter-configs     - arbiter panels

Idempotent: upserts by patternId / arbiterId.
"""
import json
import os
import sys
from urllib.request import Request, urlopen

ES_HOST = os.environ.get('ES_HOST', 'http://localhost:19200')
DR_FILE = 'fixtures/design-reasoning/platform-agent-design-decisions.json'
ARB_FILE = 'fixtures/arbiters/platform-agent-arbiters.bulk.ndjson'


def upsert(index: str, doc_id: str, body: dict) -> None:
    url = f"{ES_HOST}/{index}/_doc/{doc_id}"
    req = Request(
        url,
        method='PUT',
        headers={'Content-Type': 'application/json'},
        data=json.dumps(body).encode('utf-8'),
    )
    try:
        with urlopen(req, timeout=15) as r:
            r.read()
    except Exception as e:
        print(f"  FAIL {index}/{doc_id}: {e}")
        raise


def main() -> int:
    patterns = json.load(open(DR_FILE))
    dr_count = arch_count = 0
    for rec in patterns:
        pid = rec['patternId']
        if rec['patternType'] == 'DESIGN_REASONING':
            upsert('xiigen-rag-patterns', pid, rec)
            upsert('xiigen-planning-decisions', pid, rec)
            dr_count += 1
        elif rec['patternType'] == 'ARCH_PATTERN':
            upsert('xiigen-rag-patterns', pid, rec)
            arch_count += 1
    print(f"Seeded DR: {dr_count}, ARCH: {arch_count}")

    arb_count = 0
    with open(ARB_FILE) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            rec = json.loads(line)
            upsert('xiigen-arbiter-configs', rec['arbiterId'], rec)
            arb_count += 1
    print(f"Seeded arbiters: {arb_count}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
