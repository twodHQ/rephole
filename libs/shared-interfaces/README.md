# Shared Interfaces

Type definitions shared across the Rephole monorepo.

## Overview

This library provides TypeScript interfaces and types used by multiple modules in the application. All types are exported from the main index for easy importing.

## Usage

```typescript
import type {
  ChatMessage,
  MemorySearchResult,
  VectorRecord,
  KeywordSearchResult,
} from '@app/shared-interfaces';
```

## Type Categories

### Chat & Messaging (`chat-message.ts`)

**ChatMessage**: Represents a message in a conversation
```typescript
interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: number;
  metadata?: Record<string, any>;
}
```

### Memory (`memory-search-result.ts`)

**MemorySearchResult**: Result from searching long-term memory
```typescript
interface MemorySearchResult {
  content: string;    // The memory fragment
  score: number;      // Relevance score (0-1)
  timestamp: number;  // When the memory was created
}
```

### Vector Store (`vector-store-types.ts`)

Types for semantic search and vector database operations.

**EmbeddingVector**: Array of numbers representing semantic meaning
```typescript
type EmbeddingVector = number[];
```

**ChromaMetadata**: Metadata compatible with ChromaDB
```typescript
interface ChromaMetadata {
  [key: string]: string | number | boolean | null;
}
```

**VectorMetadata**: Enhanced metadata for our records
```typescript
interface VectorMetadata {
  id: string;
  text?: string;
  userId?: string;
  type?: string;
  timestamp?: number;
  [key: string]: string | number | boolean | null | undefined;
}
```

**VectorRecord**: Complete vector record with embedding
```typescript
interface VectorRecord {
  id: string;              // Unique identifier (ULID)
  score?: number;          // Similarity score (0-1)
  content?: string;        // Text content
  vector: EmbeddingVector; // Embedding vector
  metadata: VectorMetadata;// Metadata for filtering
}
```

**VectorFilter**: Filter for metadata queries
```typescript
interface VectorFilter {
  userId?: string;
  type?: string;
  [key: string]: string | number | boolean | undefined;
}
```

**SimilaritySearchOptions**: Options for similarity search
```typescript
interface SimilaritySearchOptions {
  topK?: number;        // Number of results
  filter?: VectorFilter;// Metadata filter
  minScore?: number;    // Minimum similarity threshold
}
```

**SimilaritySearchResult**: Result from similarity search
```typescript
interface SimilaritySearchResult {
  id: string;
  content: string;
  score: number;
  metadata: VectorMetadata;
}
```

### Keyword Search (`keyword-search-types.ts`)

Types for full-text search operations.

**KeywordSearchResult**: Result from PostgreSQL full-text search
```typescript
interface KeywordSearchResult {
  id: string;    // Document chunk ID
  text: string;  // Matched text content
  rank: number;  // Relevance rank (ts_rank)
}
```

**KeywordSearchOptions**: Options for keyword search
```typescript
interface KeywordSearchOptions {
  limit?: number;                    // Max results
  minRank?: number;                  // Minimum rank threshold
  filter?: Record<string, unknown>;  // Metadata filter
}
```

**DocumentChunk**: Document chunk for PostgreSQL storage
```typescript
interface DocumentChunk {
  id: string;
  text: string;
  metadata: Record<string, unknown>;
}
```

### Session (`session-types.ts`)

Types for session management and short-term memory.

**SessionConfig**: Session configuration
```typescript
interface SessionConfig {
  sessionId: string;
  userId: string;
  ttl?: number;           // Session TTL in seconds
  contextWindow?: number; // Max messages to keep
}
```

**SessionMetadata**: Session metadata
```typescript
interface SessionMetadata {
  createdAt: number;
  lastAccessedAt: number;
  messageCount: number;
  [key: string]: unknown;
}
```

**SessionData**: Complete session data
```typescript
interface SessionData {
  config: SessionConfig;
  metadata: SessionMetadata;
  [key: string]: unknown;
}
```

## Best Practices

### 1. Use `import type` for Type-Only Imports

```typescript
// ✅ Good - Type-only import
import type { VectorRecord } from '@app/shared-interfaces';

// ❌ Avoid - Value import for types
import { VectorRecord } from '@app/shared-interfaces';
```

### 2. Avoid `any` - Use `unknown` or Specific Types

```typescript
// ✅ Good
metadata: Record<string, unknown>

// ❌ Avoid
metadata: Record<string, any>
```

### 3. Document Complex Types with JSDoc

```typescript
/**
 * Represents a vector record with semantic embedding
 * @property id - Unique identifier (ULID format)
 * @property vector - 1536-dimensional embedding from OpenAI
 */
interface VectorRecord {
  id: string;
  vector: EmbeddingVector;
}
```

### 4. Use Branded Types for IDs

```typescript
// Consider using branded types for type safety
type ULID = string & { readonly __brand: 'ULID' };
type SessionId = string & { readonly __brand: 'SessionId' };
```

## Type Safety Guidelines

1. **Never use `any`** - Use `unknown` and type guards instead
2. **Use `Record<string, unknown>`** for generic objects
3. **Use optional properties** (`?`) instead of `| undefined`
4. **Export all types** from the main index
5. **Use `import type`** to avoid circular dependencies

## Adding New Types

1. Create a new file in `src/` with descriptive name
2. Add JSDoc comments for all interfaces
3. Export from `src/index.ts`
4. Update this README with examples
5. Run `pnpm build` to verify no errors

## Examples

### Vector Search
```typescript
import type { VectorRecord, SimilaritySearchOptions } from '@app/shared-interfaces';

const options: SimilaritySearchOptions = {
  topK: 5,
  filter: { userId: 'user123', type: 'long_term_memory' },
  minScore: 0.7,
};

const results: VectorRecord[] = await vectorStore.similaritySearch(
  queryVector,
  options,
);
```

### Keyword Search
```typescript
import type { KeywordSearchResult, KeywordSearchOptions } from '@app/shared-interfaces';

const options: KeywordSearchOptions = {
  limit: 10,
  minRank: 0.1,
};

const results: KeywordSearchResult[] = await keywordStore.search(
  'search term',
  options,
);
```

### Session Management
```typescript
import type { ChatMessage, SessionConfig } from '@app/shared-interfaces';

const config: SessionConfig = {
  sessionId: 'session_123',
  userId: 'user_456',
  ttl: 3600,
  contextWindow: 20,
};

const message: ChatMessage = {
  role: 'user',
  content: 'Hello!',
  timestamp: Date.now(),
};
```

## Related Modules

- **@app/knowledge-base** - Uses vector and keyword search types
- **@app/ai-foundation** - Uses embedding types
- **@app/ingestion/file-rag** - Uses document chunk types

## Maintenance

This library is maintained by the Rephole core team. When adding new types:

1. Ensure they are generic enough for reuse
2. Add comprehensive JSDoc comments
3. Update this README
4. Add examples in the Examples section
5. Run type checks: `pnpm build`
