# SESSION-1: INFRASTRUCTURE SETUP
## XIIGen RAG Benchmark — Gate C Approved
## Status: READY TO EXECUTE

---

## PREREQUISITES CHECK

```bash
# Verify project root
ls docker-compose.test.yml  # must exist

# Check existing infrastructure
docker ps | grep xiigen
```

**Good news:** `docker-compose.test.yml` already has:
- ✅ Elasticsearch at `localhost:19200` (local RAG tier, profile: infra)
- ✅ Ollama at `localhost:11434` (local LLM, profile: local-llm)
- ✅ LightRAG at `localhost:19100` (profile: local-llm)
No new Docker services needed.

---

## STEP 1 — Start Local Infrastructure

```bash
cd "C:\Projects\xiigen mvp"

# Start Elasticsearch (local RAG tier)
docker compose -f docker-compose.yml -f docker-compose.test.yml --profile infra up -d elasticsearch

# Wait for ES to be healthy
curl -s http://localhost:19200 | python -m json.tool
# Expected: {"name": "...", "cluster_name": "docker-cluster", ...}
```

---

## STEP 2 — Start Ollama (optional — skip if no local GPU/CPU budget)

```bash
# Option A: Docker (add --profile local-llm)
docker compose -f docker-compose.yml -f docker-compose.test.yml --profile local-llm up -d ollama

# Option B: Native Ollama install
# Install: https://ollama.com/download
# Then pull models:
ollama pull llama3:8b
ollama pull codellama:34b

# Verify
ollama list
# Expected: shows pulled models
curl http://localhost:11434/api/tags
```

**Note:** Ollama is OPTIONAL. Benchmark runs with `--skip-local` when Ollama unavailable.

---

## STEP 3 — Python Environment

```bash
cd "C:\Projects\xiigen mvp\rag-benchmark"

# Install required packages
pip install numpy aiohttp

# Optional (for full ES SDK support — parse_xiigen_patterns.py uses urllib by default)
# pip install elasticsearch

# Verify
python -c "import numpy, aiohttp; print('OK')"
```

---

## STEP 4 — Verify RAG Benchmark Scripts

```bash
cd "C:\Projects\xiigen mvp\rag-benchmark"

# Parse canonical docs (dry run — no ES writes)
python parse_xiigen_patterns.py --dry-run
# Expected: shows pattern counts per doc, no errors

# Benchmark mock test (no API keys, no Ollama)
python benchmark_runner.py --mock --tenant-id session-1-test
# Expected: completes 3 tasks, saves results to benchmark_results/baseline/
```

---

## SESSION GATE

All must pass before proceeding to SESSION-2:

```bash
# ES health
curl -s http://localhost:19200/_cluster/health | python -m json.tool
# Expected: {"status": "yellow" or "green", ...}

# Pattern parser (dry run)
python parse_xiigen_patterns.py --dry-run --target local
# Expected: Parsed N patterns from ARCHITECTURE_GUIDE.md, KNOWLEDGE_DIGEST.md, CLAUDE.md

# Benchmark mock run
python benchmark_runner.py --mock --complexity SIMPLE
# Expected: benchmark_results/baseline/ contains JSON files
```

---

## ⛔ STOP MARKER

Do NOT proceed to SESSION-2 until:
- [ ] Elasticsearch responds at `localhost:19200`
- [ ] `parse_xiigen_patterns.py --dry-run` completes without errors
- [ ] `benchmark_runner.py --mock` completes and saves results

---

## NOTES

**I-2 Fix (from Gate B):** `--mock` and `--skip-local` CLI flags are now implemented in `benchmark_runner.py` v2.1.

**B-2 Note:** Actual skill count (SK count) will be verified in SESSION-2 via codebase scan. Current estimate: 430 (from CLAUDE.md). May differ from ARCHITECTURE_GUIDE table.

**B-3 Note:** This SESSION file was not pre-created (per honest FC-8). It is created now that Gate C is approved.
