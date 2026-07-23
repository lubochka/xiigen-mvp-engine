# SESSION-3: BASELINE BENCHMARK
## XIIGen RAG Benchmark
## Prerequisites: SESSION-2 complete (RAG seeded, >3000 patterns)

---

## PRE-FLIGHT

```bash
cd "C:\Projects\xiigen mvp\rag-benchmark"

# Verify RAG is seeded
curl -s http://localhost:19200/xiigen-rag-patterns/_count
# Expected: count > 3000

# Verify mock mode works
python benchmark_runner.py --mock --complexity SIMPLE --tenant-id preflight-test
# Expected: creates benchmark_results/baseline/ with JSON files
```

---

## STEP 1 — Run Mock Baseline (no API keys needed)

Run mock mode first to verify the pipeline end-to-end:

```bash
python benchmark_runner.py \
  --mock \
  --tenant-id benchmark-test-001 \
  --rag-tier local \
  --complexity SIMPLE MEDIUM COMPLEX \
  --output-dir ./benchmark_results/mock

# Review output
ls benchmark_results/mock/
cat benchmark_results/mock/benchmark_report_*.json | python -m json.tool | head -50
```

Verify the output matches POSITIVE-NEGATIVE-EXAMPLES.md (all 5 score components, tenantId, promptAssetId present).

---

## STEP 2 — Run Local Model Benchmark (if Ollama available)

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags 2>/dev/null | python -m json.tool
# If empty/error → skip to STEP 3 (use --skip-local)

# If Ollama is running, pull models
ollama pull llama3:8b
ollama pull codellama:34b
# llama3:70b optional (requires ~40GB RAM)

# Run local model benchmark
python benchmark_runner.py \
  --tenant-id benchmark-test-001 \
  --rag-tier local \
  --models llama-3-8b codellama-34b \
  --complexity SIMPLE MEDIUM COMPLEX \
  --output-dir ./benchmark_results/baseline
```

---

## STEP 3 — Run Paid Model Benchmark

**Security note:** API keys must NOT be committed to git.
Use environment variables only:

```bash
# Option A: Set env vars in shell (not in files)
export OPENAI_API_KEY="your-key-here"
export ANTHROPIC_API_KEY="your-key-here"

# Option B: Use .env file (already in .gitignore)
# cp secrets/.env.example secrets/.env
# Add keys to secrets/.env
# source secrets/.env

# Run paid models
python benchmark_runner.py \
  --tenant-id benchmark-test-001 \
  --rag-tier local \
  --models gpt-4o-mini claude-sonnet-4-5 \
  --complexity SIMPLE MEDIUM COMPLEX \
  --output-dir ./benchmark_results/baseline

# Skip paid models if no API keys:
python benchmark_runner.py \
  --skip-local \
  --mock \
  --tenant-id benchmark-test-001 \
  --output-dir ./benchmark_results/baseline
```

---

## STEP 4 — Analyze Results

```bash
python -c "
import json, glob

results_dir = './benchmark_results/baseline'
report_files = glob.glob(f'{results_dir}/benchmark_report_*.json')
if not report_files:
    print('No report found — check output-dir')
    exit(1)

with open(sorted(report_files)[-1]) as f:
    report = json.load(f)

print('=== BASELINE RESULTS ===')
print(f'Tenant: {report[\"summary\"][\"tenant_id\"]}')
print(f'Total runs: {report[\"summary\"][\"total_runs\"]}')
print()
print(f'{'Model':<20} {'Tier':<14} {'Score':>6} {'Correct':>8} {'Comply':>8} {'Cost':>10} {'Time':>8}')
print('-' * 80)
for model_id, stats in sorted(report['model_statistics'].items(), key=lambda x: -x[1]['avg_total_score']):
    print(
        f'{model_id:<20} {stats[\"tier\"]:<14} '
        f'{stats[\"avg_total_score\"]:>6.1f} '
        f'{stats[\"avg_correctness\"]:>8.1f} '
        f'{stats[\"avg_compliance\"]:>8.1f} '
        f'\${stats[\"total_cost_usd\"]:>9.4f} '
        f'{stats[\"avg_generation_time_ms\"]:>7.0f}ms'
    )
"
```

---

## SESSION GATE

```bash
# Count result files
ls benchmark_results/baseline/*.json | wc -l
# Expected: >= 3 (at least SIMPLE × mock + report)

# Verify P1/P3/P8 compliance in output
python -c "
import json, glob
files = glob.glob('./benchmark_results/baseline/T*.json')[:3]
for f in files:
    with open(f) as fp:
        data = json.load(fp)
    checks = [
        ('tenantId', 'tenant' in data and 'tenantId' in data['tenant']),
        ('promptAssetId', 'prompt' in data and 'promptAssetId' in data['prompt']),
        ('ragStrategy', 'rag' in data and 'strategy' in data['rag']),
        ('5 scores', 'scores' in data and 'total' in data['scores']),
        ('trainingSignal', 'trainingSignal' in data),
    ]
    print(f'{f}:')
    for name, ok in checks:
        print(f'  {\"✓\" if ok else \"✗\"} {name}')
"
# Expected: all ✓

# No test regression
cd "C:\Projects\xiigen mvp\server" && npm test 2>&1 | tail -3
# Expected: >= 2342 passing
```

---

## ⛔ STOP MARKER

Do NOT proceed to SESSION-4 until:
- [ ] At least 1 complete benchmark run (mock or real) in `benchmark_results/baseline/`
- [ ] Output format matches POSITIVE-NEGATIVE-EXAMPLES.md (tenantId, promptAssetId, ragStrategy, 5 scores, trainingSignal)
- [ ] Server tests: >= 2342 passing
- [ ] Baseline report generated with `model_statistics` section
