# Multi-stage Dockerfile for building and running the `background-worker` NestJS app in this monorepo

# ============================================
# Stage 1: Build
# ============================================

FROM node:22-bookworm-slim AS builder
WORKDIR /usr/src/app

# Set CI mode for pnpm (avoids TTY prompts)
ENV CI=true

# Install pnpm
RUN npm install -g pnpm

# Enable corepack and activate pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files first for better layer caching
COPY package.json pnpm-lock.yaml ./

# Install all dependencies without running lifecycle scripts
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy source code and config files
COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY apps/background-worker ./apps/background-worker
COPY libs ./libs
COPY resources ./resources

RUN pnpm build:worker && pnpm cache delete

# ============================================
# Stage 2: Production deps (node_modules with native bindings)
# ============================================

FROM node:22-bookworm-slim AS deps

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install ONLY production dependencies (compiles native modules here)
RUN pnpm install --frozen-lockfile --prod --ignore-scripts && pnpm cache delete

# ============================================
# Stage 3: Production Runtime
# ============================================

## Runtime image
FROM node:22-bookworm-slim AS runner

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Create app directory with correct ownership and lock down permissions early
RUN groupadd -g 1001 app \
  && useradd -m -u 1001 -g app app \
  && mkdir -p /usr/src/app \
  && chown -R app:app /usr/src/app

# Enable pnpm in runtime (so npm scripts using pnpm work reliably)
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy production dependencies built in deps stage
COPY --chown=app:app --from=deps /usr/src/app/node_modules ./node_modules
COPY --chown=app:app package.json pnpm-lock.yaml ./

# Copy built application from builder stage
COPY --chown=app:app --from=builder /usr/src/app/dist ./dist

USER app

# Run the built API app
CMD ["node", "dist/apps/background-worker/main.js"]