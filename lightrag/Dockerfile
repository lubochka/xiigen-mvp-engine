FROM python:3.11-slim

# Install LightRAG with REST API support
RUN pip install "lightrag-hku[api]" --no-cache-dir

# Working directory for graph/vector storage
WORKDIR /app/data

EXPOSE 19100

CMD ["lightrag-server", "--host", "0.0.0.0", "--port", "19100"]
