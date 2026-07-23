#!/bin/bash
# ═══════════════════════════════════════════════════════
# pull-ollama-models.sh — Pull Ollama models for local LLM testing
# ═══════════════════════════════════════════════════════
#
# Run ONCE after:
#   docker compose -f docker-compose.yml -f docker-compose.test.yml \
#     --profile local-llm up -d
#
# Models pulled:
#   qwen2.5-coder:7b   — ~4.7 GB — coding-focused instruct model
#   nomic-embed-text   — ~274 MB — text embeddings for LightRAG
#
# Usage:
#   bash scripts/pull-ollama-models.sh
#
# Verify after pull:
#   docker exec ollama ollama list
# ═══════════════════════════════════════════════════════

set -e

CONTAINER="${OLLAMA_CONTAINER:-ollama}"

echo "Pulling Ollama models into container: $CONTAINER"
echo ""

echo "→ Pulling qwen2.5-coder:7b (~4.7 GB, coding-focused)..."
docker exec "$CONTAINER" ollama pull qwen2.5-coder:7b

echo ""
echo "→ Pulling nomic-embed-text (~274 MB, text embeddings)..."
docker exec "$CONTAINER" ollama pull nomic-embed-text

echo ""
echo "✓ Models ready. Verify with:"
echo "  docker exec $CONTAINER ollama list"
