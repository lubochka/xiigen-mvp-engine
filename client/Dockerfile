# ═══════════════════════════════════════════════════════
# XIIGen Client — Multi-Stage Docker Build
# ═══════════════════════════════════════════════════════
# Stage 1: Build React app with Vite
# Stage 2: Serve static files via nginx

# ── Stage 1: Builder ─────────────────────────────────
FROM node:20-alpine AS builder

LABEL maintainer="XIIGen Team"
LABEL description="XIIGen Engine Client — React.js (builder stage)"

WORKDIR /app

# Copy package files first (cache layer)
COPY package.json package-lock.json ./

# Install all dependencies
RUN npm ci

# Copy source and config
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY index.html ./
COPY src/ ./src/
COPY public/ ./public/

# Build with Vite
RUN npm run build

# ── Stage 2: Serve via nginx ────────────────────────
FROM nginx:alpine AS production

LABEL maintainer="XIIGen Team"
LABEL description="XIIGen Engine Client — React.js"
LABEL version="1.0.0"

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

# nginx runs as PID 1
CMD ["nginx", "-g", "daemon off;"]
