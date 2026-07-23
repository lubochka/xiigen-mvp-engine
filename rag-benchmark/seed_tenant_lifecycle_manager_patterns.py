"""
FLOW-30 Pattern Seeder — seeds FLOW-30 design decisions into Elasticsearch and nano-graphrag.
"""

import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
DESIGN_REASONING_DIR = PROJECT_ROOT / 'fixtures' / 'design-reasoning'
DESIGN_REASONING_FILE = DESIGN_REASONING_DIR / 'tenant-lifecycle-manager-design-decisions.json'

TENANT_ID = 'platform'

def load_design_reasoning():
    """Load design reasoning records."""
    if not DESIGN_REASONING_FILE.exists():
        print(f"File not found: {DESIGN_REASONING_FILE}")
        return []
    with open(DESIGN_REASONING_FILE) as f:
        return json.load(f)

def seed_patterns():
    """Seed FLOW-30 patterns."""
    records = load_design_reasoning()
    print(f"Loaded {len(records)} records from {DESIGN_REASONING_FILE}")
    return records

if __name__ == '__main__':
    seed_patterns()
