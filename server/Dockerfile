# ═══════════════════════════════════════════════════════
# XIIGen Server — Multi-Stage Docker Build
# ═══════════════════════════════════════════════════════
# Stage 1: Build TypeScript → JavaScript
# Stage 2: Production image with dist only

# ── Stage 1: Builder ─────────────────────────────────
FROM node:20-alpine AS builder

LABEL maintainer="XIIGen Team"
LABEL description="XIIGen Self-Building Engine — Server (builder stage)"

WORKDIR /app

# Copy package files first (cache layer)
COPY server/package.json server/package-lock.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source and config
COPY server/tsconfig.json ./
COPY server/src/ ./src/

# Build TypeScript
RUN npm run build

# ── Stage 2: Production ─────────────────────────────
FROM node:20-alpine AS production

LABEL maintainer="XIIGen Team"
LABEL description="XIIGen Self-Building Engine — Server"
LABEL version="1.0.0"

WORKDIR /app

# Copy package files
COPY server/package.json server/package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Runtime fork assets for FlowFileAssemblerService.
# The assembler resolves repo-root paths from /app and needs these assets when
# marketplace fork requests run inside the production Docker server.
COPY server/src/ ./server/src/
COPY docs/business-flows/ ./docs/business-flows/
COPY docs/portability/ ./docs/portability/
COPY docs/sessions/ ./docs/sessions/
COPY docs/design-context/ ./docs/design-context/
COPY docs/flow-coverage/ ./docs/flow-coverage/
COPY rag-benchmark/ ./rag-benchmark/

# Create non-root user
RUN addgroup -g 1001 -S xiigen && \
    adduser -S xiigen -u 1001 -G xiigen && \
    mkdir -p /app/snapshots && \
    chown -R xiigen:xiigen /app/snapshots
USER xiigen

# Expose server port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health/live || exit 1

# Start server
CMD ["node", "dist/main.js"]
