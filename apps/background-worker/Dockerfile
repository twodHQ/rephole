# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code and configuration files
COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY apps/background-worker ./apps/background-worker
COPY libs ./libs
COPY resources ./resources

# Build the worker application
RUN pnpm run build:worker

# Production stage
FROM node:20-alpine AS production

# Install pnpm (needed for production dependencies)
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy resources folder (needed for web-tree-sitter WASM files)
COPY resources ./resources

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3002

# Expose port
EXPOSE 3002

# Health check - verify the worker is listening on port 3002
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('net').createConnection(3002, 'localhost').on('connect', () => process.exit(0)).on('error', () => process.exit(1))"

# Run the worker
CMD ["node", "dist/apps/background-worker/main"]

