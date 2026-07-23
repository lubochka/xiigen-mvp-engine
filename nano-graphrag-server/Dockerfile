FROM python:3.11-slim

WORKDIR /app

# Install C++ build tools required by hnswlib (nano-graphrag dependency)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    cmake \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py .

ENV WORKING_DIR=/data/graphrag_workspaces
ENV PORT=8080

RUN mkdir -p /data/graphrag_workspaces

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=30s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health')" || exit 1

CMD ["python", "server.py"]
