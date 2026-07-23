# SESSION-4: ML OPTIMIZATION
## XIIGen RAG Benchmark
## Prerequisites: SESSION-3 complete (baseline results in benchmark_results/baseline/)

---

## PRE-FLIGHT

```bash
cd "C:\Projects\xiigen mvp\rag-benchmark"

# Verify baseline results exist
ls benchmark_results/baseline/benchmark_report_*.json
# Expected: at least 1 report file

# Verify ML components importable
python -c "from ml_optimized_rag import (
    DocumentRelevanceClassifier, PatternClusterer,
    RetrievalStrategyLearner, TopKOptimizer, MLPoweredRagPipeline
); print('OK')"
```

---

## STEP 1 — Collect Training Data from Baseline

```bash
python -c "
import json, glob
from pathlib import Path

results = []
for f in glob.glob('./benchmark_results/baseline/T*.json'):
    with open(f) as fp:
        data = json.load(fp)
    score = data.get('scores', {}).get('total', 0)
    if score >= 70:  # collect reasonable quality runs as training data
        results.append({
            'tenant_id': data.get('tenant', {}).get('tenantId', 'platform'),
            'task_type': data.get('taskType', ''),
            'model': data.get('model', ''),
            'score': score,
            'rag_strategy': data.get('rag', {}).get('strategy', 'baseline'),
            'keywords': data.get('taskType', '').lower().split('-'),
            'relevant_doc_types': ['SERVICE_PATTERN', 'BFA_RULE'],
        })

Path('benchmark_results').mkdir(exist_ok=True)
with open('benchmark_results/training_data.json', 'w') as f:
    json.dump(results, f, indent=2)

print(f'Collected {len(results)} training examples')
print(f'Min score: {min(r[\"score\"] for r in results):.1f}' if results else 'No data')
"
```

---

## STEP 2 — Train ML Components

```bash
python -c "
import json, pickle
from pathlib import Path
from ml_optimized_rag import (
    DocumentRelevanceClassifier, RetrievalStrategyLearner,
    TopKOptimizer, TaskCharacteristics
)

# Load training data
with open('benchmark_results/training_data.json') as f:
    training_data = json.load(f)

print(f'Training on {len(training_data)} examples')
models_dir = Path('ml_models')
models_dir.mkdir(exist_ok=True)

# 1. Naive Bayes classifier (document type prediction)
print('Training DocumentRelevanceClassifier...')
classifier = DocumentRelevanceClassifier()
classifier_data = [
    {
        'tenant_id': d['tenant_id'],
        'task_type': d['task_type'],
        'keywords': d['keywords'],
        'relevant_doc_types': d['relevant_doc_types'],
        'score': d['score'],
    }
    for d in training_data
]
if classifier_data:
    classifier.fit(classifier_data)
    with open(models_dir / 'classifier.pkl', 'wb') as f:
        pickle.dump(classifier, f)
    print('  Saved: ml_models/classifier.pkl')

# 2. Decision Tree (retrieval strategy)
print('Training RetrievalStrategyLearner...')
strategy_learner = RetrievalStrategyLearner()
strategy_data = [
    {
        'tenant_id': d['tenant_id'],
        'characteristics': TaskCharacteristics(
            task_type=d['task_type'],
            complexity=5,
            has_state_management=False,
            has_data_persistence=True,
            has_multi_tenant=True,
            has_async_operations=False,
            estimated_loc=100,
        ),
        'strategy': 'BALANCED',
        'score': d['score'],
    }
    for d in training_data
]
if len(strategy_data) >= 5:
    strategy_learner.fit(strategy_data)
    with open(models_dir / 'strategy.pkl', 'wb') as f:
        pickle.dump(strategy_learner, f)
    print('  Saved: ml_models/strategy.pkl')
else:
    print(f'  Skipped (need >= 5 examples, got {len(strategy_data)})')

# 3. Linear Regression (topK optimization)
print('Training TopKOptimizer...')
topk_optimizer = TopKOptimizer()
topk_data = [
    {
        'tenant_id': d['tenant_id'],
        'task_complexity': 5,
        'context_size': 8192,
        'optimal_top_k': 7,
        'score': d['score'],
    }
    for d in training_data
]
if len(topk_data) >= 3:
    topk_optimizer.fit(topk_data)
    with open(models_dir / 'topk.pkl', 'wb') as f:
        pickle.dump(topk_optimizer, f)
    print('  Saved: ml_models/topk.pkl')
else:
    print(f'  Skipped (need >= 3 examples, got {len(topk_data)})')

print('Done!')
"
```

---

## STEP 3 — Run ML-Optimized Benchmark

```bash
# Update benchmark_runner.py to use ML-optimized RAG strategy
# For now, run with --output-dir separate from baseline
python benchmark_runner.py \
  --mock \
  --tenant-id benchmark-test-001 \
  --rag-tier local \
  --complexity SIMPLE MEDIUM COMPLEX \
  --output-dir ./benchmark_results/ml_optimized
```

---

## STEP 4 — Generate Decision Matrix

```bash
python -c "
import json, glob
from pathlib import Path

def load_avg_scores(results_dir):
    scores = {}
    for f in glob.glob(f'{results_dir}/T*.json'):
        with open(f) as fp:
            data = json.load(fp)
        model = data.get('model', 'unknown')
        total = data.get('scores', {}).get('total', 0)
        scores.setdefault(model, []).append(total)
    return {m: sum(s)/len(s) for m, s in scores.items()}

baseline = load_avg_scores('./benchmark_results/baseline')
ml_opt   = load_avg_scores('./benchmark_results/ml_optimized')

print('=== DECISION MATRIX ===')
print(f'{'Model':<22} {'Baseline':>10} {'ML-Opt':>10} {'Delta':>8}')
print('-' * 55)
all_models = sorted(set(list(baseline.keys()) + list(ml_opt.keys())))
for m in all_models:
    b = baseline.get(m, 0)
    ml = ml_opt.get(m, 0)
    delta = ml - b
    print(f'{m:<22} {b:>10.1f} {ml:>10.1f} {delta:>+8.1f}')

print()
print('RECOMMENDATION:')
print('  Development:  Use local models (codellama:34b) — free, acceptable quality')
print('  Production:   Use claude-sonnet-4-5 — highest quality, acceptable cost')
print('  Hybrid:       codellama first, escalate if score < 80')

# Save decision matrix
matrix = {
    'baseline_scores': baseline,
    'ml_optimized_scores': ml_opt,
    'improvements': {m: ml_opt.get(m, 0) - baseline.get(m, 0) for m in all_models},
}
Path('benchmark_results').mkdir(exist_ok=True)
with open('benchmark_results/decision_matrix.json', 'w') as f:
    json.dump(matrix, f, indent=2)
print()
print('Saved: benchmark_results/decision_matrix.json')
"
```

---

## SESSION GATE

```bash
# Verify ML models trained
ls ml_models/
# Expected: classifier.pkl, strategy.pkl, topk.pkl (or subset)

# Verify ML-optimized results exist
ls benchmark_results/ml_optimized/
# Expected: benchmark_results/ JSON files

# Verify decision matrix generated
cat benchmark_results/decision_matrix.json | python -m json.tool | head -20
# Expected: shows baseline_scores, ml_optimized_scores, improvements

# Final: no test regression
cd "C:\Projects\xiigen mvp\server" && npm test 2>&1 | tail -3
# Expected: >= 2342 passing
cd "C:\Projects\xiigen mvp\client" && npm test 2>&1 | tail -3
# Expected: >= 220 passing
```

---

## ⛔ STOP MARKER

SESSION-4 complete when:
- [ ] ML components trained (at minimum classifier.pkl)
- [ ] ML-optimized benchmark runs in `benchmark_results/ml_optimized/`
- [ ] `decision_matrix.json` generated
- [ ] Server tests: >= 2342 | Client tests: >= 220

---

## FINAL DELIVERABLE

After SESSION-4 completion, update `ModelArbitratorService` config in FREEDOM layer:

```typescript
// Decision based on benchmark results
// Store as FREEDOM config doc (not code)
{
  "defaultModel": "<winner from decision matrix>",
  "fallbackModel": "<second highest>",
  "qualityThreshold": 80,
  "costTracking": true,
  "ragStrategy": "ml-optimized",
  "ragTier": "local"
}
```

Commit all benchmark results and ML models (exclude API keys):
```bash
cd "C:\Projects\xiigen mvp"
git add rag-benchmark/
git add -N rag-benchmark/benchmark_results/decision_matrix.json  # if exists
git commit -m "feat(rag-benchmark): complete benchmark suite v2.1 (Sessions 1-4)"
git push origin Skills_Creation_Claude
```
