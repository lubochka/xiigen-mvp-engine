"""
XIIGen RAG Pattern Parser & Seeder
Parses XIIGen canonical docs and seeds patterns into Elasticsearch.
P1-compliant: tenantId on every document.

Usage:
  python parse_xiigen_patterns.py                    # seed both local + global
  python parse_xiigen_patterns.py --target local     # seed local RAG only (port 19200)
  python parse_xiigen_patterns.py --target global    # seed global RAG (port 9200)
  python parse_xiigen_patterns.py --dry-run          # parse only, no ES writes
  python parse_xiigen_patterns.py --tenant-id acme  # seed as tenant-specific patterns

Corpus (from STATE.json):
  SERVICE_PATTERN:  ~1,338  (factories F1-F1338)
  TASK_CONTRACT:    ~515    (task types T1-T515)
  BFA_RULE:         ~714    (conflict rules CF-1-CF-714)
  SKILL_PATTERN:    ~430    (skills SK-1-SK-430, verify in SESSION-2)
  DESIGN_RECORD:    ~239    (design records DR-1-DR-239)
  STRESS_TEST:      ~430    (stress tests ST-1-ST-430)
  Total:            ~3,666 patterns
"""

import argparse
import json
import os
import re
import sys
import time
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any, Dict, Generator, List, Optional


# ============================================================================
# CONFIGURATION
# ============================================================================

PROJECT_ROOT = Path(__file__).parent.parent

# Canonical source documents (relative to project root)
CANONICAL_DOCS: Dict[str, Path] = {
    'architecture': PROJECT_ROOT / 'ARCHITECTURE_GUIDE.md',
    'knowledge':    PROJECT_ROOT / 'KNOWLEDGE_DIGEST.md',
    'developer':    PROJECT_ROOT / 'DEVELOPER_ONBOARDING.md',
    'claude_md':    PROJECT_ROOT / 'CLAUDE.md',
}

ES_INDEX = 'xiigen-rag-patterns'
ES_PROMPTS_INDEX = 'xiigen-prompts'
ES_BULK_BATCH_SIZE = 50       # Documents per bulk request
SEEDING_DELAY_MS = 100        # Delay between batches (ms)

ES_ENDPOINTS = {
    'local':  'http://localhost:19200',   # docker-compose.test.yml
    'global': 'http://localhost:9200',    # production ES
}

# ES index mapping for xiigen-rag-patterns
INDEX_MAPPING = {
    "mappings": {
        "properties": {
            "patternId":   {"type": "keyword"},
            "tenantId":    {"type": "keyword"},       # P1: required
            "patternType": {"type": "keyword"},
            "domainId":    {"type": "keyword"},
            "searchable": {
                "properties": {
                    "keywords":    {"type": "text", "analyzer": "english"},
                    "tags":        {"type": "keyword"},
                    "codeSnippet": {"type": "text"},
                }
            },
            "metadata": {
                "properties": {
                    "factoryId":      {"type": "keyword"},
                    "interfaceName":  {"type": "keyword"},
                    "archetype":      {"type": "keyword"},
                    "fabric":         {"type": "keyword"},
                    "familyId":       {"type": "integer"},
                    "seededAt":       {"type": "date"},
                }
            },
            "references": {
                "properties": {
                    "skillRefs":        {"type": "keyword"},
                    "taskTypeRefs":     {"type": "keyword"},
                    "bfaRuleRefs":      {"type": "keyword"},
                    "designRecordRefs": {"type": "keyword"},
                }
            }
        }
    },
    "settings": {
        "number_of_shards": 1,
        "number_of_replicas": 0,
    }
}


# ============================================================================
# DATA STRUCTURES
# ============================================================================

@dataclass
class RagPattern:
    """A RAG pattern as stored in Elasticsearch. P1: tenantId mandatory."""
    pattern_id: str
    tenant_id: str        # P1: "platform" or tenant-specific
    pattern_type: str     # SERVICE_PATTERN, TASK_CONTRACT, BFA_RULE, etc.
    domain_id: str
    keywords: str
    tags: List[str]
    code_snippet: Optional[str] = None
    factory_id: Optional[str] = None
    interface_name: Optional[str] = None
    archetype: Optional[str] = None
    fabric: Optional[str] = None
    family_id: Optional[int] = None
    skill_refs: List[str] = None
    task_type_refs: List[str] = None
    bfa_rule_refs: List[str] = None
    design_record_refs: List[str] = None

    def __post_init__(self):
        self.skill_refs = self.skill_refs or []
        self.task_type_refs = self.task_type_refs or []
        self.bfa_rule_refs = self.bfa_rule_refs or []
        self.design_record_refs = self.design_record_refs or []

    def to_es_doc(self) -> Dict[str, Any]:
        """Serialize to ES document format matching POSITIVE-NEGATIVE-EXAMPLES.md."""
        return {
            "patternId": self.pattern_id,
            "tenantId": self.tenant_id,              # P1 compliance
            "patternType": self.pattern_type,
            "domainId": self.domain_id,
            "searchable": {
                "keywords": self.keywords,
                "tags": self.tags,
                "codeSnippet": self.code_snippet,
            },
            "metadata": {
                "factoryId":     self.factory_id,
                "interfaceName": self.interface_name,
                "archetype":     self.archetype,
                "fabric":        self.fabric,
                "familyId":      self.family_id,
                "seededAt":      _now_iso(),
            },
            "references": {
                "skillRefs":        self.skill_refs,
                "taskTypeRefs":     self.task_type_refs,
                "bfaRuleRefs":      self.bfa_rule_refs,
                "designRecordRefs": self.design_record_refs,
            }
        }


# ============================================================================
# PARSERS
# ============================================================================

class ArchitectureGuideParser:
    """
    Parses ARCHITECTURE_GUIDE.md to extract:
    - Factory entries (SERVICE_PATTERN)
    - AF Station entries
    - Fabric interface entries
    """

    def __init__(self, tenant_id: str = 'platform'):
        self.tenant_id = tenant_id

    def parse(self, content: str) -> Generator[RagPattern, None, None]:
        """Parse ARCHITECTURE_GUIDE.md and yield RagPattern objects."""
        yield from self._parse_factory_sections(content)
        yield from self._parse_fabric_sections(content)

    def _parse_factory_sections(self, content: str) -> Generator[RagPattern, None, None]:
        """Extract factory definitions (F-XXXX patterns)."""
        # Match lines like: F1234 | IServiceName | ARCHETYPE | DATABASE | description
        factory_pattern = re.compile(
            r'\|\s*(F\d+)\s*\|\s*(\w+)\s*\|\s*(\w+)\s*\|\s*(\w+)\s*\|\s*([^|]+)',
            re.MULTILINE,
        )
        for match in factory_pattern.finditer(content):
            factory_id, interface_name, archetype, fabric, description = (
                m.strip() for m in match.groups()
            )
            if not factory_id.startswith('F'):
                continue

            desc_clean = description.strip().rstrip('|').strip()
            keywords = f"{interface_name} {archetype} {fabric} {desc_clean}"
            tags = [
                t.lower() for t in
                [interface_name, archetype, fabric, 'factory', 'service-pattern']
                if t
            ]

            yield RagPattern(
                pattern_id=f"{factory_id}-{interface_name}",
                tenant_id=self.tenant_id,
                pattern_type='SERVICE_PATTERN',
                domain_id=_infer_domain(interface_name),
                keywords=keywords,
                tags=tags,
                interface_name=interface_name,
                archetype=archetype,
                fabric=fabric,
                factory_id=factory_id,
            )

    def _parse_fabric_sections(self, content: str) -> Generator[RagPattern, None, None]:
        """Extract fabric interface definitions."""
        # Match fabric sections by header pattern
        fabric_header = re.compile(r'##\s+(\w+\s+Fabric)\s*\n', re.MULTILINE)
        for m in fabric_header.finditer(content):
            fabric_name = m.group(1).strip()
            yield RagPattern(
                pattern_id=f"FABRIC-{fabric_name.replace(' ', '-').upper()}",
                tenant_id=self.tenant_id,
                pattern_type='SERVICE_PATTERN',
                domain_id='fabrics',
                keywords=f"{fabric_name} fabric interface provider",
                tags=['fabric', fabric_name.lower().replace(' ', '-')],
                fabric=fabric_name,
            )


class KnowledgeDigestParser:
    """
    Parses KNOWLEDGE_DIGEST.md to extract:
    - Task type entries (TASK_CONTRACT)
    - BFA rule summaries (BFA_RULE)
    - Skill entries (SKILL_PATTERN)
    """

    def __init__(self, tenant_id: str = 'platform'):
        self.tenant_id = tenant_id

    def parse(self, content: str) -> Generator[RagPattern, None, None]:
        yield from self._parse_task_types(content)
        yield from self._parse_bfa_rules(content)
        yield from self._parse_skills(content)

    def _parse_task_types(self, content: str) -> Generator[RagPattern, None, None]:
        """Extract task type definitions (T-XXX)."""
        task_pattern = re.compile(
            r'\|\s*(T\d+)\s*\|\s*([^|]+)\|([^|]+)\|([^|]+)',
            re.MULTILINE,
        )
        for match in task_pattern.finditer(content):
            task_id, task_name, factory_ref, description = (
                m.strip() for m in match.groups()
            )
            if not task_id.startswith('T') or not task_id[1:].isdigit():
                continue

            factory_id = factory_ref.strip().split()[0] if factory_ref.strip() else None
            desc_clean = description.rstrip('|').strip()

            yield RagPattern(
                pattern_id=task_id,
                tenant_id=self.tenant_id,
                pattern_type='TASK_CONTRACT',
                domain_id=_infer_domain(task_name),
                keywords=f"{task_id} {task_name} {desc_clean} task type",
                tags=[task_id.lower(), 'task-contract', _infer_domain(task_name)],
                factory_id=factory_id,
            )

    def _parse_bfa_rules(self, content: str) -> Generator[RagPattern, None, None]:
        """Extract BFA rule entries (CF-XXX)."""
        bfa_pattern = re.compile(
            r'\|\s*(CF-\d+)\s*\|\s*([^|]+)\|([^|]*)',
            re.MULTILINE,
        )
        for match in bfa_pattern.finditer(content):
            rule_id, rule_name, description = (m.strip() for m in match.groups())
            if not rule_id.startswith('CF-'):
                continue

            desc_clean = description.rstrip('|').strip()
            yield RagPattern(
                pattern_id=rule_id,
                tenant_id=self.tenant_id,
                pattern_type='BFA_RULE',
                domain_id='guardrails',
                keywords=f"{rule_id} {rule_name} {desc_clean} BFA conflict rule",
                tags=[rule_id.lower(), 'bfa-rule', 'guardrails'],
            )

    def _parse_skills(self, content: str) -> Generator[RagPattern, None, None]:
        """Extract skill entries (SK-XXX)."""
        skill_pattern = re.compile(
            r'\|\s*(SK-\d+)\s*\|\s*([^|]+)\|([^|]*)',
            re.MULTILINE,
        )
        for match in skill_pattern.finditer(content):
            skill_id, skill_name, description = (m.strip() for m in match.groups())
            if not skill_id.startswith('SK-'):
                continue

            desc_clean = description.rstrip('|').strip()
            yield RagPattern(
                pattern_id=skill_id,
                tenant_id=self.tenant_id,
                pattern_type='SKILL_PATTERN',
                domain_id='skills',
                keywords=f"{skill_id} {skill_name} {desc_clean} skill pattern",
                tags=[skill_id.lower(), 'skill', _infer_domain(skill_name)],
            )


class ClaudeMdParser:
    """Parses CLAUDE.md to extract DNA patterns and quick-reference entries."""

    def __init__(self, tenant_id: str = 'platform'):
        self.tenant_id = tenant_id

    def parse(self, content: str) -> Generator[RagPattern, None, None]:
        yield from self._parse_dna_patterns(content)

    def _parse_dna_patterns(self, content: str) -> Generator[RagPattern, None, None]:
        """Extract DNA pattern definitions (DNA-1 through DNA-9)."""
        dna_pattern = re.compile(
            r'###\s+Rule\s+\d+\s+[—–-]+\s+[^\n]+\n(.*?)(?=###|\Z)',
            re.DOTALL | re.MULTILINE,
        )
        for i, match in enumerate(dna_pattern.finditer(content), start=1):
            body = match.group(0).strip()
            rule_num = i
            # Extract rule heading
            heading_match = re.search(r'###\s+Rule\s+\d+\s+[—–-]+\s+([^\n]+)', body)
            heading = heading_match.group(1).strip() if heading_match else f"DNA-{rule_num}"

            # Extract code example if present
            code_match = re.search(r'```typescript\n(.*?)```', body, re.DOTALL)
            code_snippet = code_match.group(1).strip() if code_match else None

            yield RagPattern(
                pattern_id=f"DNA-{rule_num}",
                tenant_id=self.tenant_id,
                pattern_type='SERVICE_PATTERN',
                domain_id='dna-patterns',
                keywords=f"DNA-{rule_num} {heading} architectural pattern rule",
                tags=[f'dna-{rule_num}', 'dna-pattern', 'architectural-rule'],
                code_snippet=code_snippet,
            )


# ============================================================================
# ELASTICSEARCH CLIENT
# ============================================================================

class ElasticsearchSeeder:
    """Seeds patterns into Elasticsearch with P1-compliant tenant scoping."""

    def __init__(self, endpoint: str, dry_run: bool = False):
        self.endpoint = endpoint.rstrip('/')
        self.dry_run = dry_run

        # Lazy import — not required for --dry-run
        if not dry_run:
            try:
                import urllib.request
                self._request = urllib.request.urlopen
            except ImportError:
                raise ImportError("urllib required for ES seeding")

    def check_connection(self) -> bool:
        """Verify ES is reachable."""
        try:
            import urllib.request
            with urllib.request.urlopen(f"{self.endpoint}/", timeout=5) as resp:
                return resp.status == 200
        except Exception as e:
            print(f"  ES connection failed: {e}")
            return False

    def create_index(self) -> bool:
        """Create index with mapping. Safe to re-run (returns OK if exists)."""
        if self.dry_run:
            print(f"  [DRY RUN] Would create index: {ES_INDEX}")
            return True

        try:
            import urllib.request, urllib.error
            data = json.dumps(INDEX_MAPPING).encode('utf-8')
            req = urllib.request.Request(
                f"{self.endpoint}/{ES_INDEX}",
                data=data,
                headers={"Content-Type": "application/json"},
                method='PUT',
            )
            try:
                with urllib.request.urlopen(req) as resp:
                    result = json.loads(resp.read())
                    print(f"  Index created: {result.get('acknowledged', False)}")
                    return True
            except urllib.error.HTTPError as e:
                if e.code == 400:
                    body = json.loads(e.read())
                    if 'resource_already_exists_exception' in str(body):
                        print(f"  Index already exists — skipping creation")
                        return True
                raise
        except Exception as e:
            print(f"  Index creation failed: {e}")
            return False

    def seed_batch(self, patterns: List[RagPattern]) -> Dict[str, int]:
        """Seed a batch of patterns using ES bulk API."""
        if self.dry_run:
            print(f"  [DRY RUN] Would seed {len(patterns)} patterns")
            return {'indexed': len(patterns), 'errors': 0}

        if not patterns:
            return {'indexed': 0, 'errors': 0}

        # Build NDJSON bulk body
        lines = []
        for p in patterns:
            action = {"index": {"_index": ES_INDEX, "_id": p.pattern_id}}
            doc = p.to_es_doc()
            lines.append(json.dumps(action))
            lines.append(json.dumps(doc))

        body = '\n'.join(lines) + '\n'

        try:
            import urllib.request
            req = urllib.request.Request(
                f"{self.endpoint}/_bulk",
                data=body.encode('utf-8'),
                headers={"Content-Type": "application/x-ndjson"},
                method='POST',
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                result = json.loads(resp.read())
                errors = sum(1 for item in result.get('items', []) if item.get('index', {}).get('error'))
                return {'indexed': len(patterns) - errors, 'errors': errors}
        except Exception as e:
            print(f"  Bulk seed failed: {e}")
            return {'indexed': 0, 'errors': len(patterns)}

    def count_patterns(self) -> int:
        """Return the current count of patterns in the index."""
        try:
            import urllib.request
            with urllib.request.urlopen(
                f"{self.endpoint}/{ES_INDEX}/_count", timeout=5
            ) as resp:
                result = json.loads(resp.read())
                return result.get('count', 0)
        except Exception:
            return -1

    def test_retrieval(self, tenant_id: str, query: str) -> bool:
        """Verify tenant-scoped retrieval works after seeding."""
        try:
            import urllib.request
            body = json.dumps({
                "query": {
                    "bool": {
                        "must": [
                            {"term": {"tenantId": tenant_id}},         # P1 filter
                            {"match": {"searchable.keywords": query}},
                        ]
                    }
                },
                "size": 5,
            })
            req = urllib.request.Request(
                f"{self.endpoint}/{ES_INDEX}/_search",
                data=body.encode('utf-8'),
                headers={"Content-Type": "application/json"},
                method='POST',
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                result = json.loads(resp.read())
                hits = result.get('hits', {}).get('total', {}).get('value', 0)
                return hits > 0
        except Exception as e:
            print(f"  Retrieval test failed: {e}")
            return False


# ============================================================================
# MAIN SEEDING PIPELINE
# ============================================================================

class SeedingPipeline:
    """Orchestrates parsing + seeding for a given target."""

    def __init__(self, tenant_id: str, seeder: ElasticsearchSeeder):
        self.tenant_id = tenant_id
        self.seeder = seeder
        self.stats = {
            'parsed': 0, 'indexed': 0, 'errors': 0,
            'by_type': {},
        }

    def run(self) -> Dict[str, Any]:
        print(f"\nPhase 1: Parsing canonical docs (tenant: {self.tenant_id})")
        patterns = list(self._collect_patterns())

        print(f"\nPhase 2: Creating ES index")
        if not self.seeder.create_index():
            print("  ⛔ Index creation failed — stopping")
            return self.stats

        print(f"\nPhase 3: Seeding {len(patterns)} patterns in batches of {ES_BULK_BATCH_SIZE}")
        total_indexed = 0
        total_errors = 0
        for i in range(0, len(patterns), ES_BULK_BATCH_SIZE):
            batch = patterns[i:i + ES_BULK_BATCH_SIZE]
            result = self.seeder.seed_batch(batch)
            total_indexed += result['indexed']
            total_errors += result['errors']

            pct = (i + len(batch)) / len(patterns) * 100
            print(f"  [{pct:5.1f}%] Seeded {total_indexed}/{len(patterns)} | errors: {total_errors}")

            if SEEDING_DELAY_MS > 0:
                time.sleep(SEEDING_DELAY_MS / 1000)

        self.stats['indexed'] = total_indexed
        self.stats['errors'] = total_errors

        print(f"\nPhase 4: Validation")
        count = self.seeder.count_patterns()
        print(f"  ES count: {count} patterns")

        retrieval_ok = self.seeder.test_retrieval(self.tenant_id, 'form schema validation')
        print(f"  Retrieval test: {'✓ PASS' if retrieval_ok else '✗ FAIL'}")

        return self.stats

    def _collect_patterns(self) -> Generator[RagPattern, None, None]:
        parsers = [
            ('ARCHITECTURE_GUIDE.md', CANONICAL_DOCS['architecture'], ArchitectureGuideParser(self.tenant_id)),
            ('KNOWLEDGE_DIGEST.md',   CANONICAL_DOCS['knowledge'],    KnowledgeDigestParser(self.tenant_id)),
            ('CLAUDE.md',             CANONICAL_DOCS['claude_md'],    ClaudeMdParser(self.tenant_id)),
        ]

        for name, path, parser in parsers:
            if not path.exists():
                print(f"  ⚠ {name} not found at {path} — skipping")
                continue

            content = path.read_text(encoding='utf-8')
            count = 0
            for pattern in parser.parse(content):
                self.stats['parsed'] += 1
                self.stats['by_type'].setdefault(pattern.pattern_type, 0)
                self.stats['by_type'][pattern.pattern_type] += 1
                count += 1
                yield pattern

            print(f"  Parsed {count} patterns from {name}")


# ============================================================================
# HELPERS
# ============================================================================

def _infer_domain(name: str) -> str:
    """Infer domain ID from name string."""
    name_lower = name.lower()
    domains = {
        'form': 'forms', 'schema': 'forms', 'user': 'user-management',
        'tenant': 'multi-tenant', 'auth': 'authentication',
        'flow': 'workflow', 'workflow': 'workflow', 'orchestrat': 'workflow',
        'queue': 'messaging', 'event': 'messaging',
        'rag': 'ai-rag', 'ai': 'ai-rag', 'model': 'ai-rag',
        'database': 'data-storage', 'store': 'data-storage', 'elastic': 'data-storage',
        'fabric': 'fabrics', 'provider': 'fabrics',
    }
    for keyword, domain in domains.items():
        if keyword in name_lower:
            return domain
    return 'general'


def _now_iso() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()


# ============================================================================
# ARGUMENT PARSING & ENTRY POINT
# ============================================================================

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description='XIIGen RAG Pattern Parser & Seeder',
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        '--target', choices=['local', 'global', 'both'], default='both',
        help='Which ES instance to seed (local=19200, global=9200, both=default)',
    )
    parser.add_argument(
        '--dry-run', action='store_true',
        help='Parse only — do not write to Elasticsearch',
    )
    parser.add_argument(
        '--tenant-id', default='platform',
        help='Tenant ID for seeded patterns (P1 compliance). Default: "platform"',
    )
    parser.add_argument(
        '--verify-only', action='store_true',
        help='Only run connection check and count — do not seed',
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    print("XIIGen RAG Pattern Seeder")
    print("=" * 60)
    print(f"Tenant: {args.tenant_id} | Target: {args.target} | Dry run: {args.dry_run}")

    # Verify canonical docs exist
    print("\nChecking canonical docs:")
    for name, path in CANONICAL_DOCS.items():
        status = "✓" if path.exists() else "✗ MISSING"
        print(f"  {status} {name}: {path}")

    targets = []
    if args.target in ('local', 'both'):
        targets.append(('local', ES_ENDPOINTS['local']))
    if args.target in ('global', 'both'):
        targets.append(('global', ES_ENDPOINTS['global']))

    for tier_name, endpoint in targets:
        print(f"\n{'=' * 60}")
        print(f"Target: {tier_name} ({endpoint})")
        print('=' * 60)

        seeder = ElasticsearchSeeder(endpoint, dry_run=args.dry_run)

        if not args.dry_run:
            print("Checking connection...")
            if not seeder.check_connection():
                print(f"  ⛔ Cannot reach {endpoint}")
                print(f"  Start ES with: docker compose -f docker-compose.yml -f docker-compose.test.yml --profile infra up -d")
                if tier_name == 'local':
                    continue
                else:
                    sys.exit(1)
            print("  ✓ Connected")

        if args.verify_only:
            count = seeder.count_patterns()
            print(f"  Patterns in {ES_INDEX}: {count}")
            continue

        pipeline = SeedingPipeline(args.tenant_id, seeder)
        stats = pipeline.run()

        print(f"\nSeeding complete ({tier_name}):")
        print(f"  Parsed:  {stats['parsed']}")
        print(f"  Indexed: {stats['indexed']}")
        print(f"  Errors:  {stats['errors']}")
        print(f"\n  By type:")
        for pattern_type, count in sorted(stats['by_type'].items()):
            print(f"    {pattern_type}: {count}")

    print("\n✓ Done")
    print("\nNext step: Run SESSION-3 to execute benchmarks")
    print("  python benchmark_runner.py --mock          # test without API keys")
    print("  python benchmark_runner.py --skip-local    # skip Ollama models")


if __name__ == '__main__':
    main()
