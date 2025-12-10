# Multi-stage Dockerfile for building and running the `api` NestJS app in this monorepo
FROM node:20-slim AS builder
WORKDIR /usr/src/app

# Set CI mode for pnpm (avoids TTY prompts)
ENV CI=true

# Enable corepack and activate pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files first for better layer caching
COPY package.json pnpm-lock.yaml ./

# Install all dependencies without running lifecycle scripts
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy remaining project files
COPY . .
RUN pnpm build:api

## Runtime image
FROM node:20-slim AS runner
WORKDIR /usr/src/app
ENV NODE_ENV=production

# Enable pnpm in runtime (so npm scripts using pnpm work reliably)
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy built assets and production dependencies from builder
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/package.json ./package.json
COPY --from=builder /usr/src/app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Expose default Nest port
EXPOSE 3000

# Run the built API app
CMD ["node", "dist/apps/api/main.js"]
