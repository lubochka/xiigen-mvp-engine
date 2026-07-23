"""
nano-graphrag FastAPI Server — XIIGen fabric integration wrapper.

Exposes nano-graphrag via REST API for NanoGraphRagProvider.

Endpoints:
  POST /insert          — ingest documents into workspace knowledge graph
  POST /query           — GraphRAG search (naive/local/global modes)
  DELETE /documents     — delete documents by filter
  GET  /health          — health check

LLM backend (env vars):
  LLM_PROVIDER=ollama   (default) | openai
  OLLAMA_BASE_URL       (default: http://localhost:11434)
  OLLAMA_MODEL          (default: qwen2.5-coder:7b)
  OPENAI_API_KEY        (only needed if LLM_PROVIDER=openai)

Tenant isolation: workspace parameter maps to isolated working directory.
"""

import os
import json
import asyncio
import hashlib
import numpy as np
from pathlib import Path
from typing import Optional
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

WORKING_DIR   = os.environ.get("WORKING_DIR", "./graphrag_workspaces")
LLM_PROVIDER  = os.environ.get("LLM_PROVIDER", "ollama")   # ollama | openai | mock
OLLAMA_URL    = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL  = os.environ.get("OLLAMA_MODEL", "qwen2.5-coder:7b")
EMBED_DIM     = int(os.environ.get("EMBED_DIM", "768"))

# Cache of GraphRAG instances per workspace (lazy init)
_rag_instances: dict = {}
_rag_lock = asyncio.Lock()


# ── Ollama LLM + embedding functions ─────────────────────────────────────

async def ollama_llm(prompt: str, system_prompt: Optional[str] = None, **kwargs) -> str:
    """Call Ollama /api/chat and return the assistant's text."""
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    payload = {"model": OLLAMA_MODEL, "messages": messages, "stream": False}

    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(f"{OLLAMA_URL}/api/chat", json=payload)
        resp.raise_for_status()
        data = resp.json()
        return data.get("message", {}).get("content", "")


async def ollama_embed(texts: list[str]) -> np.ndarray:
    """Call Ollama /api/embeddings for a list of texts."""
    vectors = []
    async with httpx.AsyncClient(timeout=60.0) as client:
        for text in texts:
            try:
                resp = await client.post(
                    f"{OLLAMA_URL}/api/embeddings",
                    json={"model": OLLAMA_MODEL, "prompt": text},
                )
                if resp.status_code == 200:
                    vectors.append(resp.json().get("embedding", _hash_embed(text)))
                else:
                    vectors.append(_hash_embed(text))
            except Exception:
                vectors.append(_hash_embed(text))
    return np.array(vectors, dtype=np.float32)


def _hash_embed(text: str, dim: int = EMBED_DIM) -> list[float]:
    """Deterministic hash-based fallback embedding (no LLM needed)."""
    seed = int(hashlib.md5(text.encode()).hexdigest(), 16) % (2 ** 32)
    rng = np.random.default_rng(seed)
    vec = rng.standard_normal(dim).astype(np.float32)
    norm = np.linalg.norm(vec)
    return (vec / norm if norm > 0 else vec).tolist()


async def hash_embed_batch(texts: list[str]) -> np.ndarray:
    """Pure hash-based embedding — no external service required."""
    return np.array([_hash_embed(t) for t in texts], dtype=np.float32)

# nano-graphrag requires embedding_dim + max_token_size on the embedding function object
hash_embed_batch.embedding_dim = EMBED_DIM
hash_embed_batch.max_token_size = 8192


async def mock_llm(prompt: str, system_prompt: Optional[str] = None, **kwargs) -> str:
    """Fast no-op LLM for testing — returns minimal valid responses without external calls."""
    return json.dumps({"entities": [], "relationships": [], "summary": prompt[:100]})


# ── GraphRAG factory ──────────────────────────────────────────────────────

def _build_rag(working_dir: str):
    """Build a GraphRAG instance configured for the chosen LLM backend."""
    from nano_graphrag import GraphRAG

    if LLM_PROVIDER == "ollama":
        return GraphRAG(
            working_dir=working_dir,
            best_model_func=ollama_llm,
            cheap_model_func=ollama_llm,
            embedding_func_max_async=4,
            embedding_func=hash_embed_batch,   # use hash embed so Ollama embed model is optional
            enable_naive_rag=True,
        )
    elif LLM_PROVIDER == "mock":
        # Fast no-op mode for testing — no external services required
        return GraphRAG(
            working_dir=working_dir,
            best_model_func=mock_llm,
            cheap_model_func=mock_llm,
            embedding_func_max_async=4,
            embedding_func=hash_embed_batch,
            enable_naive_rag=True,
        )
    else:
        # Default: use OpenAI (requires OPENAI_API_KEY env var)
        return GraphRAG(working_dir=working_dir, enable_naive_rag=True)


def get_workspace_dir(workspace: str) -> str:
    safe = workspace.replace("/", "_").replace("..", "").strip("_")
    path = Path(WORKING_DIR) / safe
    path.mkdir(parents=True, exist_ok=True)
    return str(path)


async def get_rag(workspace: str):
    async with _rag_lock:
        if workspace not in _rag_instances:
            try:
                wd = get_workspace_dir(workspace)
                _rag_instances[workspace] = _build_rag(wd)
            except ImportError:
                raise HTTPException(status_code=500, detail="nano-graphrag not installed")
        return _rag_instances[workspace]


# ── FastAPI app ───────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    Path(WORKING_DIR).mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(title="nano-graphrag server", version="1.1.0", lifespan=lifespan)


class Document(BaseModel):
    doc_id: str
    content: str
    workspace: str
    metadata: Optional[dict] = None


class InsertRequest(BaseModel):
    documents: list[Document]


class QueryRequest(BaseModel):
    query: str
    mode: str = "local"
    workspace: str
    top_k: int = 10
    filters: Optional[dict] = None


class DeleteRequest(BaseModel):
    workspace: str
    filters: dict


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "provider": "nano-graphrag",
        "working_dir": WORKING_DIR,
        "llm_provider": LLM_PROVIDER,
        "ollama_model": OLLAMA_MODEL if LLM_PROVIDER == "ollama" else None,
    }


@app.post("/insert")
async def insert(req: InsertRequest):
    by_workspace: dict[str, list[str]] = {}
    for doc in req.documents:
        by_workspace.setdefault(doc.workspace, []).append(doc.content)

    total = 0
    errors = []
    for workspace, contents in by_workspace.items():
        try:
            rag = await get_rag(workspace)
            for content in contents:
                await rag.ainsert(content)
                total += 1
        except Exception as e:
            errors.append(str(e))

    if errors and total == 0:
        raise HTTPException(status_code=500, detail=f"All inserts failed: {errors}")

    return {"inserted": total, "workspaces": list(by_workspace.keys()), "errors": errors}


@app.post("/query")
async def query(req: QueryRequest):
    from nano_graphrag import QueryParam

    rag = await get_rag(req.workspace)

    mode_map = {"naive": "naive", "local": "local", "global": "global"}
    mode = mode_map.get(req.mode, "local")

    try:
        answer = await rag.aquery(req.query, param=QueryParam(mode=mode))
        results = [{"content": str(answer), "score": 1.0, "mode": mode, "workspace": req.workspace}]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {e}")

    return {"results": results, "query": req.query, "mode": mode}


@app.delete("/documents")
async def delete_documents(req: DeleteRequest):
    workspace_dir = get_workspace_dir(req.workspace)
    path = Path(workspace_dir)

    deleted = 0
    if not path.exists():
        return {"deleted": 0}

    for f in path.iterdir():
        if f.is_file():
            f.unlink()
            deleted += 1

    async with _rag_lock:
        _rag_instances.pop(req.workspace, None)

    return {"deleted": deleted, "workspace": req.workspace}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
