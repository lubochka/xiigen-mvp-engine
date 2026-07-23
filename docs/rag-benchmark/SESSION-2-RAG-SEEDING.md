# SESSION-2: RAG SEEDING
## XIIGen RAG Benchmark
## Prerequisites: SESSION-1 complete (ES running at localhost:19200)

---

## PRE-FLIGHT VERIFICATION

```bash
# Verify SESSION-1 gate passed
curl -s http://localhost:19200/_cluster/health

# Verify we are in rag-benchmark dir
cd "C:\Projects\xiigen mvp\rag-benchmark"
ls parse_xiigen_patterns.py benchmark_runner.py
```

---

## STEP 1 — Verify Canonical Doc Count (B-2 Resolution)

```bash
# Verify actual skill count in codebase (B-2 fix: CLAUDE.md says 430, ENGINE table says 329)
cd "C:\Projects\xiigen mvp\server\src"
grep -ro "SK-[0-9]*" . | grep -oP "SK-\d+" | sort -u | wc -l
# Record actual count as ACTUAL_SK_COUNT

# Verify factory count
grep -ro "F[0-9][0-9][0-9][0-9]" . | grep -oP "F\d+" | sort -u | wc -l
# Expected: ~1338

# Check DR vs DD distinction (I-3 fix)
cd "C:\Projects\xiigen mvp"
grep -n "Design Record\|Design Decision\|DR-\|DD-" ARCHITECTURE_GUIDE.md | head -20
# Record: are DR and DD separate artifact types?
```

---

## STEP 2 — Seed Local RAG (localhost:19200)

```bash
cd "C:\Projects\xiigen mvp\rag-benchmark"

# Seed local RAG first (validation before touching global)
python parse_xiigen_patterns.py --target local --tenant-id platform
# Expected output:
#   Phase 1: Parsing canonical docs
#   Phase 2: Creating ES index
#   Phase 3: Seeding N patterns in batches
#   Phase 4: Validation — ES count: N patterns
```

### Verify Local RAG Count

```bash
curl -s http://localhost:19200/xiigen-rag-patterns/_count
# Expected: {"count": >3000, ...}

# Verify tenant-scoped retrieval (P1 compliance)
curl -s -X POST "http://localhost:19200/xiigen-rag-patterns/_search" \
  -H "Content-Type: application/json" \
  -d '{"query":{"bool":{"must":[{"term":{"tenantId":"platform"}},{"match":{"searchable.keywords":"form schema validation"}}]}},"size":5}'
# Expected: hits.total.value > 0
```

**⛔ STOP — review local RAG schema before proceeding to global:**

```bash
curl -s http://localhost:19200/xiigen-rag-patterns/_mapping | python -m json.tool | head -50
# Verify: tenantId, patternId, patternType all present with correct types
```

---

## STEP 3 — Seed Global RAG (localhost:9200)

**Only proceed after local RAG validation passes.**

```bash
python parse_xiigen_patterns.py --target global --tenant-id platform
# Same expected output as local seeding

# Verify global count
curl -s http://localhost:9200/xiigen-rag-patterns/_count
# Expected: same count as local RAG
```

---

## STEP 4 — Verify Corpus Counts (I-5, I-6, I-7 resolutions)

```bash
# Count by pattern type
curl -s -X POST "http://localhost:19200/xiigen-rag-patterns/_search" \
  -H "Content-Type: application/json" \
  -d '{"size":0,"aggs":{"by_type":{"terms":{"field":"patternType","size":20}}}}'

# Record:
# SERVICE_PATTERN count: ___
# TASK_CONTRACT count:   ___
# BFA_RULE count:        ___
# SKILL_PATTERN count:   ___
# DESIGN_RECORD count:   ___
# STRESS_TEST count:     ___
# Total:                 ___

# Compare with STATE.json estimates:
# Expected: ~3,666 (or adjusted per B-2 actual SK count)
```

---

## STEP 5 — Create Design Records DR-240, DR-241, DR-242

After resolving I-3 (DR vs DD distinction from Step 1), create the design records:

**DR-240: ML Algorithm Selection for RAG Optimization**
```markdown
Decision: Use Naive Bayes (document type), K-Means (clustering),
Decision Tree (strategy), Linear Regression (topK).
Rationale: Low training data requirements, interpretable decisions,
fast inference, no external ML framework dependencies.
```

**DR-241: Tenant-Scoped RAG Architecture**
```markdown
Decision: tenantId mandatory on all RAG patterns, all ES queries filter by tenantId.
Platform patterns use tenantId="platform", tenant-specific patterns use tenantId="{id}".
Rationale: P1 compliance, prevents cross-tenant data leakage (CF-214).
```

**DR-242: 5-Component Benchmark Scoring System**
```markdown
Decision: Total = 0.40×Correctness + 0.25×Quality + 0.20×Compliance + 0.10×Performance + 0.05×Cost
Rationale: Correctness is paramount (40%), quality matters more than cost for production use.
Threshold: 80.0 minimum for training data capture (P8 compliance).
```

Document these as markdown files or FREEDOM config docs as appropriate for your DR format.

---

## SESSION GATE

```bash
# Count check
curl -s http://localhost:19200/xiigen-rag-patterns/_count
# Expected: count > 3000

# Retrieval test (5/5 test queries must return results)
python -c "
import urllib.request, json
tests = ['form schema validation', 'workflow orchestration tenant',
         'BFA conflict rule', 'DataProcessResult pattern', 'DNA-3 throw']
for q in tests:
    body = json.dumps({'query':{'bool':{'must':[
        {'term':{'tenantId':'platform'}},
        {'match':{'searchable.keywords':q}}
    ]}},'size':3}).encode()
    req = urllib.request.Request(
        'http://localhost:19200/xiigen-rag-patterns/_search',
        data=body, headers={'Content-Type':'application/json'}, method='POST'
    )
    with urllib.request.urlopen(req) as r:
        data = json.loads(r.read())
        hits = data['hits']['total']['value']
        print(f'{\"PASS\" if hits>0 else \"FAIL\"} ({hits} hits): {q}')
"
# Expected: PASS for all 5 queries

# Test regression — server tests must still pass
cd "C:\Projects\xiigen mvp\server" && npm test -- --passWithNoTests 2>&1 | tail -5
# Expected: >= 2342 passing
```

---

## ⛔ STOP MARKER

Do NOT proceed to SESSION-3 until:
- [ ] Local RAG count > 3000
- [ ] Global RAG count matches local RAG count
- [ ] All 5 retrieval test queries return hits
- [ ] Server tests: >= 2342 passing
- [ ] DR-240, DR-241, DR-242 documented
- [ ] B-2 resolved: actual SK count recorded, corpus estimate updated if needed
