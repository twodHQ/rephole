# 🕳️ Rephole

> **RAG-powered code search via simple REST API**

---

## 🎯 What is Rephole?

Rephole is an open-source REST API that ingests your codebase and creates a specialized RAG (Retrieval-Augmented Generation) system for intelligent code search, and retrievial.

Unlike traditional code search tools, Rephole understands **semantic relationships** in your code, enabling you to:

- 🔍 Search code by intent, not just keywords
- 💬 Ask natural language questions about your codebase
- 🔗 Integrate AI coding assistants into your own products

---

## ✨ Features

- **🚀 Simple REST API** - Integrate in minutes with any tech stack
- **📦 Multi-Repository Support** - Index and query across multiple codebases
- **🎨 OpenAI Embedding Models** - Full supports for OpenAI embedder
- **💾 Local Vector Database** - ChromaDB is in!
- **🐳 One-Click Deployment** - Docker Compose setup in under 5 minutes
- **🔒 Self-Hostable** - Keep your code private with on-premise deployment
- **⚡ Fast Indexing** - Incremental updates via Git webhooks

---

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Git
- An OpenAI API key

### Installation

**Option 1: Docker Compose**

```bash
# Clone the repository
git clone https://github.com/twodHQ/rephole.git
cd rephole

# Configure your environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Start Rephole
docker-compose up -d

# Rephole is now running at http://localhost:8000
```

---

### Your First Query (60 seconds)

```bash
# 1. Ingest a repository
curl -X POST http://localhost:8000/api/v1/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/fastapi/fastapi",
    "branch": "master"
  }'

# 2. Wait for indexing (check status)
curl http://localhost:8000/api/v1/status/fastapi

# 3. Ask a question
curl -X POST http://localhost:8000/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{
    "repo": "fastapi",
    "question": "How do I add request validation middleware?"
  }'
```

**Response:**
```json
{
  "sources": [
    {
      "file": "fastapi/middleware/validators.py",
      "line": 45,
      "content": "class RequestValidationMiddleware..."
    },
    ...
  ],
  "confidence": 0.92
}
```

---

---

## 📖 Core Concepts

### Ingestion Pipeline

```
Repository → Clone → Parse → Chunk → Embed → Store → Index
```

Rephole automatically:
- Clones your repository
- Parses code files (supports 20+ languages)
- Chunks code intelligently (function/class level)
- Generates embeddings
- Stores vectors
- Indexes for fast retrieval

### Query Flow

```
Question → Embed → Search → Retrieve → Return
```

When you query:
- Your question is embedded using the same model
- Semantic search finds relevant code chunks
- Return top matches chunks

---

## 🔧 API Reference

### TODO

---

## 🏗️ Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ HTTP REST API
┌──────▼──────────────────────┐
│    Rephole API Server       │
│  ┌──────────────────────┐   │
│  │  Ingestion Service   │   │
│  └──────────┬───────────┘   │
│             │               │
│  ┌──────────▼───────────┐   │
│  │   Vector Database    │   │
│  │     (ChromaDB)       │   │
│  └──────────┬───────────┘   │
│             │               │
│  ┌──────────▼───────────┐   │
│  │   Query Service      │   │
│  └──────────────────────┘   │
└─────────────────────────────┘

```

---

## 🛠️ Configuration

### Environment Variables

TODO
