# Docker Setup for Rephole

This guide explains how to build and run the Rephole API using Docker.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (v20.10+)
- [Docker Compose](https://docs.docker.com/compose/install/) (v2.0+)

## Quick Start

The easiest way to run the entire stack is with Docker Compose:

```bash
# Set your OpenAI API key
export OPENAI_API_KEY=your-api-key-here

# Start all services (postgres, redis, chromadb, api)
docker compose up -d

# Check service status
docker compose ps

# View API logs
docker compose logs -f api
```

The API will be available at:

- **API**: http://localhost:3000
- **Swagger docs**: http://localhost:3000/api-docs

## Building the API Image Manually

If you prefer to build and run the API image separately:

```bash
# Build the image
docker build -f apps/api/Dockerfile -t rephole-api:dev .

# Start infrastructure services
docker compose up -d postgres redis chromadb

# Run the API container
docker run --rm \
  --network rephole-network \
  -p 3000:3000 \
  -e POSTGRES_HOST=postgres \
  -e POSTGRES_PORT=5432 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=postgres \
  -e REDIS_HOST=redis \
  -e REDIS_PORT=6379 \
  -e CHROMA_HOST=chromadb \
  -e CHROMA_PORT=8000 \
  -e OPENAI_API_KEY=your-api-key \
  rephole-api:dev
```

## Environment Variables

The API container accepts the following environment variables:

| Variable            | Description              | Default     |
| ------------------- | ------------------------ | ----------- |
| `POSTGRES_HOST`     | PostgreSQL hostname      | `localhost` |
| `POSTGRES_PORT`     | PostgreSQL port          | `5432`      |
| `POSTGRES_USER`     | PostgreSQL username      | `postgres`  |
| `POSTGRES_PASSWORD` | PostgreSQL password      | `postgres`  |
| `POSTGRES_DB`       | PostgreSQL database name | `postgres`  |
| `REDIS_HOST`        | Redis hostname           | `localhost` |
| `REDIS_PORT`        | Redis port               | `6379`      |
| `CHROMA_HOST`       | ChromaDB hostname        | `localhost` |
| `CHROMA_PORT`       | ChromaDB port            | `8000`      |
| `OPENAI_API_KEY`    | OpenAI API key           | (required)  |
| `LOG_LEVEL`         | Logging level            | `info`      |

## Docker Compose Services

The `docker-compose.yml` includes the following services:

| Service    | Port | Description           |
| ---------- | ---- | --------------------- |
| `api`      | 3000 | Rephole API server    |
| `postgres` | 5432 | PostgreSQL database   |
| `redis`    | 6379 | Redis cache and queue |
| `chromadb` | 8000 | ChromaDB vector store |

## Useful Commands

```bash
# Stop all services
docker compose down

# Stop and remove volumes (reset data)
docker compose down -v

# Rebuild the API image
docker compose build api

# View logs for a specific service
docker compose logs -f api

# Execute command in running container
docker compose exec api sh
```

## Troubleshooting

### API fails to connect to services

Ensure all infrastructure services are healthy before starting the API:

```bash
docker compose ps
```

All services should show `healthy` status.

### Build fails with pnpm error

The Dockerfile uses `CI=true` to avoid interactive prompts. If you see TTY-related errors, ensure you're building with:

```bash
docker build -f apps/api/Dockerfile -t rephole-api:dev .
```

### Large build context

The `.dockerignore` file excludes `node_modules`, `.git`, and `repos/` directories. If builds are slow, verify these exclusions are in place.
