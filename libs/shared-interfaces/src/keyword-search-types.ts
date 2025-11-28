/**
 * Type definitions for keyword (full-text) search operations
 */

/**
 * Result from a keyword-based full-text search
 */
export interface KeywordSearchResult {
  /** Document chunk ID */
  id: string;

  /** Matched text content */
  text: string;

  /** Relevance rank from PostgreSQL ts_rank (higher is more relevant) */
  rank: number;
}

/**
 * Options for keyword search
 */
export interface KeywordSearchOptions {
  /** Maximum number of results to return */
  limit?: number;

  /** Minimum rank threshold */
  minRank?: number;

  /** Metadata filter */
  filter?: Record<string, unknown>;
}

/**
 * Document chunk for storage in PostgreSQL
 */
export interface DocumentChunk {
  /** Unique identifier */
  id: string;

  /** Text content */
  text: string;

  /** Metadata (stored as JSONB) */
  metadata: Record<string, unknown>;
}
