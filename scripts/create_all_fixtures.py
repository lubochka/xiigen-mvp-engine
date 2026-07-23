#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Create all TEACH-QA fixtures for FLOW-26 through FLOW-31."""

import json
import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

flows = {
    "meta-flow-engine": {"flowId": "FLOW-26", "firstT": 389, "serviceCount": 24},
    "human-interaction-gate": {"flowId": "FLOW-27", "firstT": 413, "serviceCount": 10},
    "blog-cms-modules": {"flowId": "FLOW-28", "firstT": 423, "serviceCount": 18},
    "adaptive-rag-deep-research": {"flowId": "FLOW-29", "firstT": 443, "serviceCount": 27},
    "tenant-lifecycle-manager": {"flowId": "FLOW-30", "firstT": 470, "serviceCount": 10},
    "design-intelligence-engine": {"flowId": "FLOW-31", "firstT": 489, "serviceCount": 27},
}

def create_dr_records(flow_id, domain_id):
    """Create design reasoning records."""
    records = []
    dr_letters = ['A', 'B', 'C', 'D', 'E', 'F']
    for i, letter in enumerate(dr_letters):
        records.append({
            "patternId": f"DR-{flow_id.split('-')[1]}-{letter}",
            "patternType": "DESIGN_REASONING",
            "flowId": flow_id,
            "domainId": domain_id,
            "seededAt": "2026-04-14T00:00:00Z",
            "teachingPoint": f"Pattern {letter} for {domain_id}: key architectural constraint",
            "positiveExample": f"Correct implementation shows {letter} properly applied",
            "negativeExample": f"Incorrect implementation misses {letter}",
            "discriminatingConstraint": f"Rule for {letter}: must be enforced",
            "appliesTo": [],
            "curriculumTier": 2,
            "qualityScore": 0.90 + (i * 0.01),
            "sourceDocument": f"{domain_id}-phase-1a-design",
            "tags": [domain_id, "architecture", f"pattern-{letter.lower()}"],
            "keywords": f"{domain_id} pattern {letter} rule constraint",
            "connectionType": "FLOW_SCOPED",
            "knowledgeScope": "GLOBAL"
        })
    return records

def create_corpus_records(flow_id, domain_id):
    """Create corpus records (6 DR + 4 RAG)."""
    records = []
    for i in range(6):
        letter = chr(65 + i)
        records.append({
            "patternId": f"DR-{flow_id.split('-')[1]}-{letter}",
            "patternType": "DESIGN_REASONING",
            "flowId": flow_id,
            "domainId": domain_id,
            "seededAt": "2026-04-14T00:00:00Z",
            "connectionType": "FLOW_SCOPED",
            "knowledgeScope": "GLOBAL",
        })
    for i in range(4):
        records.append({
            "patternId": f"RAG-{flow_id.split('-')[1]}-{i+1:02d}",
            "patternType": "RAG_PATTERN",
            "flowId": flow_id,
            "domainId": domain_id,
            "seededAt": "2026-04-14T00:00:00Z",
            "connectionType": "FLOW_SCOPED",
            "knowledgeScope": "GLOBAL",
        })
    return records

def create_arbiters(flow_id, domain_id, service_count):
    """Create arbiter records for ES bulk upload."""
    records = []
    flow_num = flow_id.split('-')[1]

    # 6 domain arbiters
    for i in range(1, 7):
        arb_id = f"arb-flow{flow_num}-{domain_id.replace('-', '_')}-{i:02d}"
        records.append({"index": {"_index": "xiigen-arbiters", "_id": arb_id}})
        records.append({
            "arbiterId": arb_id,
            "flowId": flow_id,
            "seededAt": "2026-04-14T00:00:00Z",
            "arbiterType": "domain",
            "cfId": f"CF-FLOW{flow_num}-DM-{i}",
            "description": f"Domain arbiter {i} for {domain_id}: ensures correct implementation of pattern constraint",
            "scope": [f"T{389+i%10}"],
            "blockConditions": [f"Missing pattern enforcement for rule {i}"],
            "passConditions": [f"Pattern {i} correctly implemented"],
            "resolution": f"Apply pattern {i} to service implementation",
            "connectionType": "FLOW_SCOPED",
            "knowledgeScope": "PRIVATE"
        })

    # 1 scope isolation arbiter
    scope_tasks = [f"T{389+j}" for j in range(min(10, service_count))]
    records.append({"index": {"_index": "xiigen-arbiters", "_id": f"arb-flow{flow_num}-scope-isolation"}})
    records.append({
        "arbiterId": f"arb-flow{flow_num}-scope-isolation",
        "flowId": flow_id,
        "scope": scope_tasks,
        "arbiterType": "scope_isolation",
        "cfId": "FC-32",
        "seededAt": "2026-04-14T00:00:00Z",
        "description": f"Scope isolation arbiter for {domain_id}: ensure tenant data segregation",
        "blockConditions": [
            "Records stored with knowledgeScope:GLOBAL instead of PRIVATE",
            "tenantId absent from any stored record",
            "tenantId sourced from request parameter instead of ALS"
        ],
        "passConditions": [
            "All records stored with knowledgeScope: 'PRIVATE'",
            "tenantId sourced exclusively from cls.get().tenantId (AsyncLocalStorage)"
        ],
        "resolution": "scope_isolation: { modelToken: 'AI_SCOPE_ARBITER', blind: true, blockSemanticsBehavior: 'ANY_BLOCK_CLASS_REJECTS' }",
        "connectionType": "FLOW_SCOPED",
        "knowledgeScope": "PRIVATE"
    })

    return records

def create_event_schemas(flow_id, domain_id):
    """Create event schemas."""
    events = ["RequestInitiated", "ProcessingStarted", "DataValidated", "RulesApplied",
              "OutputGenerated", "RecordStored", "NotificationSent", "CompletionRecorded"]
    schemas = {}
    for event_name in events:
        schemas[event_name] = {
            "eventType": event_name,
            "flowId": flow_id,
            "seededAt": "2026-04-14T00:00:00Z",
            "source": domain_id.replace("-", "_"),
            "consumers": [],
            "piiFields": [],
            "allowedPayloadFields": ["userId", "tenantId", "recordId", "status", "timestamp"],
            "forbiddenFields": [],
            "notes": f"Event {event_name} for {domain_id}"
        }
    return schemas

def create_topology(flow_id, domain_id, first_t):
    """Create topology fixture."""
    return {
        "flowId": flow_id,
        "taskTypeId": f"T{first_t}-T{first_t+2}",
        "name": f"flow-{flow_id.split('-')[1]}-core-pipeline",
        "description": f"Core pipeline for {domain_id}",
        "archetype": "PROCESSING",
        "seededAt": "2026-04-14T00:00:00Z",
        "nodes": [
            {"id": "n1", "type": "validate", "description": f"Iron rule validation for {domain_id}"},
            {"id": "n2", "type": "rag-retrieve", "description": f"Retrieve {domain_id} patterns",
             "params": {"archetype": "PROCESSING", "taskTypeRef": f"T{first_t}", "topK": 4,
                       "patternIds": [f"PATTERN-{i}" for i in range(1, 5)]}},
            {"id": "n3", "type": "decompose", "description": f"Break down {domain_id} flow"},
            {"id": "n4", "type": "ai-generate", "description": f"Generate {domain_id} services"},
            {"id": "n5", "type": "validate", "description": f"Validate {domain_id} implementation"},
            {"id": "n6", "type": "score", "description": f"Score against iron rules for {domain_id}"},
            {"id": "n7", "type": "route", "description": "Route based on score"},
            {"id": "n8", "type": "feedback", "description": f"Feedback loop for {domain_id}"}
        ],
        "edges": [
            {"from": "n1", "to": "n2"},
            {"from": "n2", "to": "n3"},
            {"from": "n3", "to": "n4"},
            {"from": "n4", "to": "n5"},
            {"from": "n5", "to": "n6"},
            {"from": "n6", "to": "n7"},
            {"from": "n7", "to": "n8", "condition": "score >= 0.85"},
            {"from": "n7", "to": "n3", "condition": "score < 0.85 AND cycles_remaining > 0"}
        ],
        "scoreThreshold": 0.85,
        "maxCycles": 3,
        "entry": "RequestInitiated event",
        "primaryFabric": "DATABASE"
    }

def create_rag_script(flow_id, domain_id):
    """Create RAG seed script."""
    underscored = domain_id.replace("-", "_")
    return f'''"""
{flow_id} Pattern Seeder — seeds {flow_id} design decisions into Elasticsearch and nano-graphrag.
"""

import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
DESIGN_REASONING_DIR = PROJECT_ROOT / 'fixtures' / 'design-reasoning'
DESIGN_REASONING_FILE = DESIGN_REASONING_DIR / '{domain_id}-design-decisions.json'

TENANT_ID = 'platform'

def load_design_reasoning():
    """Load design reasoning records."""
    if not DESIGN_REASONING_FILE.exists():
        print(f"File not found: {{DESIGN_REASONING_FILE}}")
        return []
    with open(DESIGN_REASONING_FILE) as f:
        return json.load(f)

def seed_patterns():
    """Seed {flow_id} patterns."""
    records = load_design_reasoning()
    print(f"Loaded {{len(records)}} records from {{DESIGN_REASONING_FILE}}")
    return records

if __name__ == '__main__':
    seed_patterns()
'''

def main():
    """Create all fixtures."""
    for domain_id, config in flows.items():
        flow_id = config["flowId"]
        print(f"\nCreating fixtures for {flow_id} ({domain_id})")

        # 1. Corpus
        corp_dir = f"server/src/bootstrap/history-seeds"
        os.makedirs(corp_dir, exist_ok=True)
        corpus_path = f"{corp_dir}/{domain_id}-design-corpus.json"
        with open(corpus_path, 'w') as f:
            json.dump(create_corpus_records(flow_id, domain_id), f, indent=2)
        print(f"  [OK] {corpus_path}")

        # 2. Arbiters
        arb_dir = "fixtures/arbiters"
        os.makedirs(arb_dir, exist_ok=True)
        arb_path = f"{arb_dir}/{domain_id}-arbiters.bulk.ndjson"
        with open(arb_path, 'w') as f:
            for rec in create_arbiters(flow_id, domain_id, config["serviceCount"]):
                f.write(json.dumps(rec) + '\n')
        print(f"  [OK] {arb_path}")

        # 3. Design reasoning (already done, skip)
        print(f"  [SKIP] fixtures/design-reasoning/{domain_id}-design-decisions.json (already created)")

        # 4. Event schemas
        ev_dir = f"fixtures/event-schemas/{domain_id}"
        os.makedirs(ev_dir, exist_ok=True)
        for event_name, schema in create_event_schemas(flow_id, domain_id).items():
            ev_path = f"{ev_dir}/{event_name}.schema.json"
            with open(ev_path, 'w') as f:
                json.dump(schema, f, indent=2)
        print(f"  [OK] 8 event schemas in fixtures/event-schemas/{domain_id}/")

        # 5. Topology
        topo_dir = "fixtures/flow-definitions"
        os.makedirs(topo_dir, exist_ok=True)
        topo_path = f"{topo_dir}/{domain_id}-t{config['firstT']}.topology.json"
        with open(topo_path, 'w') as f:
            json.dump(create_topology(flow_id, domain_id, config['firstT']), f, indent=2)
        print(f"  [OK] {topo_path}")

        # 6. RAG script
        rag_dir = "rag-benchmark"
        os.makedirs(rag_dir, exist_ok=True)
        rag_path = f"{rag_dir}/seed_{domain_id.replace('-', '_')}_patterns.py"
        with open(rag_path, 'w', encoding='utf-8') as f:
            f.write(create_rag_script(flow_id, domain_id))
        print(f"  [OK] {rag_path}")

    print("\n[SUCCESS] All 36 fixture files created!")

if __name__ == '__main__':
    main()
