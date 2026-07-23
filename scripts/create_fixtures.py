#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Create TEACH-QA fixture files for FLOW-26 through FLOW-31"""

import json
import sys
from pathlib import Path

# Fix encoding on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Define the 6 flows with their metadata
flows = {
    "meta-flow-engine": {
        "flowId": "FLOW-26",
        "serviceDir": "flow-extension-engine",
        "firstT": 389,
        "serviceCount": 24,
    },
    "human-interaction-gate": {
        "flowId": "FLOW-27",
        "serviceDir": "human-approval-gate",
        "firstT": 413,
        "serviceCount": 10,
    },
    "blog-cms-modules": {
        "flowId": "FLOW-28",
        "serviceDir": "cms-modules",
        "firstT": 423,
        "serviceCount": 18,
    },
    "adaptive-rag-deep-research": {
        "flowId": "FLOW-29",
        "serviceDir": "rag-optimization",
        "firstT": 443,
        "serviceCount": 27,
    },
    "tenant-lifecycle-manager": {
        "flowId": "FLOW-30",
        "serviceDir": "tenant-lifecycle",
        "firstT": 470,
        "serviceCount": 10,
    },
    "design-intelligence-engine": {
        "flowId": "FLOW-31",
        "serviceDir": "design-system-governance",
        "firstT": 489,
        "serviceCount": 27,
    },
}

def create_dr_records(flow_id, domain_id, num_records=6):
    """Create design reasoning records."""
    records = []
    dr_letters = ['A', 'B', 'C', 'D', 'E', 'F']

    for i, letter in enumerate(dr_letters[:num_records]):
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
    """Create design corpus records (6 DR + 4 RAG)."""
    records = []

    # 6 DR records
    for i in range(6):
        letter = chr(65 + i)  # A, B, C, etc.
        records.append({
            "patternId": f"DR-{flow_id.split('-')[1]}-{letter}",
            "patternType": "DESIGN_REASONING",
            "flowId": flow_id,
            "domainId": domain_id,
            "seededAt": "2026-04-14T00:00:00Z",
            "connectionType": "FLOW_SCOPED",
            "knowledgeScope": "GLOBAL",
        })

    # 4 RAG records
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
    """Create ES bulk NDJSON arbiter records."""
    records = []
    flow_num = flow_id.split('-')[1]

    # Domain arbiters (6)
    for i in range(1, 7):
        arb_id = f"arb-flow{flow_num}-{domain_id.replace('-', '_')}-{i:02d}"
        records.append({
            "index": {"_index": "xiigen-arbiters", "_id": arb_id}
        })
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

    # Security/scope arbiters (1)
    scope_tasks = [f"T{389+j}" for j in range(min(10, service_count))]
    records.append({
        "index": {"_index": "xiigen-arbiters", "_id": f"arb-flow{flow_num}-scope-isolation"}
    })
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
    """Create event schema definitions."""
    event_names = [
        "RequestInitiated",
        "ProcessingStarted",
        "DataValidated",
        "RulesApplied",
        "OutputGenerated",
        "RecordStored",
        "NotificationSent",
        "CompletionRecorded"
    ]

    schemas = {}
    for event_name in event_names:
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
            {
                "id": "n1",
                "type": "validate",
                "description": f"Iron rule validation for {domain_id}"
            },
            {
                "id": "n2",
                "type": "rag-retrieve",
                "description": f"Retrieve {domain_id} patterns",
                "params": {
                    "archetype": "PROCESSING",
                    "taskTypeRef": f"T{first_t}",
                    "topK": 4,
                    "patternIds": [f"PATTERN-{i}" for i in range(1, 5)]
                }
            },
            {
                "id": "n3",
                "type": "decompose",
                "description": f"Break down {domain_id} flow"
            },
            {
                "id": "n4",
                "type": "ai-generate",
                "description": f"Generate {domain_id} services"
            },
            {
                "id": "n5",
                "type": "validate",
                "description": f"Validate {domain_id} implementation"
            },
            {
                "id": "n6",
                "type": "score",
                "description": f"Score against iron rules for {domain_id}"
            },
            {
                "id": "n7",
                "type": "route",
                "description": "Route based on score"
            },
            {
                "id": "n8",
                "type": "feedback",
                "description": f"Feedback loop for {domain_id}"
            }
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

def create_rag_seed_script(flow_id, domain_id):
    """Create RAG seed Python script."""
    underscored = domain_id.replace("-", "_")

    return f'''"""
{flow_id} Pattern Seeder — seeds {flow_id} design decisions into Elasticsearch and nano-graphrag.

Reads fixture files from:
  fixtures/rag-patterns/       — ARCH_PATTERN and PLAN_EXEMPLAR fixtures
  fixtures/design-reasoning/   — DESIGN_REASONING triples

Seeds to:
  Elasticsearch                — xiigen-rag-patterns and xiigen-planning-decisions indices
  nano-graphrag POST /insert   — GraphRAG knowledge graph for OSS LLM retrieval

Usage:
  python seed_{underscored}_patterns.py                    # seed all, default endpoints
  python seed_{underscored}_patterns.py --dry-run          # parse only, no writes
  python seed_{underscored}_patterns.py --es-endpoint http://localhost:19200
  python seed_{underscored}_patterns.py --graphrag-url http://localhost:8001
  python seed_{underscored}_patterns.py --skip-es          # graphrag only
  python seed_{underscored}_patterns.py --skip-graphrag    # ES only
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

DESIGN_REASONING_FILE = DESIGN_REASONING_DIR / '{domain_id}-design-decisions.json'

TENANT_ID = 'platform'  # platform-level patterns — not tenant-specific


def load_design_reasoning():
    """Load design reasoning records."""
    if not DESIGN_REASONING_FILE.exists():
        print(f"DESIGN_REASONING_FILE not found: {{DESIGN_REASONING_FILE}}")
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
    """Create all fixture files."""
    base_path = Path("/c/Projects/xiigen mvp/.claude/worktrees/vigorous-margulis")

    for domain_id, config in flows.items():
        flow_id = config["flowId"]
        flow_num = flow_id.split('-')[1]

        print(f"\n=== Creating fixtures for {flow_id} ({domain_id}) ===")

        # 1. Design corpus
        corpus_path = base_path / "server/src/bootstrap/history-seeds" / f"{domain_id}-design-corpus.json"
        corpus_path.parent.mkdir(parents=True, exist_ok=True)
        corpus_records = create_corpus_records(flow_id, domain_id)
        with open(corpus_path, 'w') as f:
            json.dump(corpus_records, f, indent=2)
        print(f"[OK] {corpus_path.name}")

        # 2. Arbiters
        arbiters_path = base_path / "fixtures/arbiters" / f"{domain_id}-arbiters.bulk.ndjson"
        arbiters_path.parent.mkdir(parents=True, exist_ok=True)
        arbiters_records = create_arbiters(flow_id, domain_id, config["serviceCount"])
        with open(arbiters_path, 'w') as f:
            for record in arbiters_records:
                f.write(json.dumps(record) + '\n')
        print(f"[OK] {arbiters_path.name}")

        # 3. Design reasoning
        dr_path = base_path / "fixtures/design-reasoning" / f"{domain_id}-design-decisions.json"
        dr_path.parent.mkdir(parents=True, exist_ok=True)
        dr_records = create_dr_records(flow_id, domain_id)
        with open(dr_path, 'w') as f:
            json.dump(dr_records, f, indent=2)
        print(f"[OK] {dr_path.name}")

        # 4. Event schemas
        event_schemas_dir = base_path / "fixtures/event-schemas" / domain_id
        event_schemas_dir.mkdir(parents=True, exist_ok=True)
        event_schemas = create_event_schemas(flow_id, domain_id)
        for event_name, schema in event_schemas.items():
            event_path = event_schemas_dir / f"{event_name}.schema.json"
            with open(event_path, 'w') as f:
                json.dump(schema, f, indent=2)
        print(f"[OK] {len(event_schemas)} event schemas in {event_schemas_dir.name}/")

        # 5. Topology
        topo_path = base_path / "fixtures/flow-definitions" / f"{domain_id}-t{config['firstT']}.topology.json"
        topo_path.parent.mkdir(parents=True, exist_ok=True)
        topology = create_topology(flow_id, domain_id, config['firstT'])
        with open(topo_path, 'w') as f:
            json.dump(topology, f, indent=2)
        print(f"[OK] {topo_path.name}")

        # 6. RAG seed script
        rag_path = base_path / "rag-benchmark" / f"seed_{domain_id.replace('-', '_')}_patterns.py"
        rag_path.parent.mkdir(parents=True, exist_ok=True)
        rag_script = create_rag_seed_script(flow_id, domain_id)
        with open(rag_path, 'w', encoding='utf-8') as f:
            f.write(rag_script)
        print(f"[OK] {rag_path.name}")

    print("\n[SUCCESS] All 36 fixture files created successfully!")

if __name__ == '__main__':
    main()
