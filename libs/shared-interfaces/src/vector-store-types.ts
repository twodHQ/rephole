/**
 * Type definitions for vector store operations
 */

/**
 * Embedding vector type - array of numbers representing semantic meaning
 */
export type EmbeddingVector = number[];

/**
 * Metadata that can be stored with ChromaDB documents
 * ChromaDB supports string, number, boolean, and null values
 */
export interface ChromaMetadata {
  [key: string]: string | number | boolean | null;
}

/**
 * Enhanced metadata interface for our vector records
 * Extends ChromaMetadata with optional fields
 */
export interface VectorMetadata {
  id: string;
  text?: string;
  userId?: string;
  /**
   * @deprecated Use string (ISO 8601) format instead. Number format kept for backward compatibility.
   * New implementations should use BaseMetadata which enforces string timestamps.
   */
  timestamp?: number | string;
  [key: string]: string | number | boolean | null | undefined;
}

export interface ApplicationMetadata extends VectorMetadata {
  workspaceId: string;
  category: 'repository' | 'file_upload' | 'generated_doc' | 'jira_ticket';
}

/**
 * Base metadata interface for all vector store records.
 * Contains common fields that enable cross-category queries and consistent data structure.
 * All ingestion processors must populate these fields for proper querying and filtering.
 *
 * @remarks
 * This interface extends ApplicationMetadata and adds standardized fields for:
 * - User and workspace identification
 * - Temporal tracking (ingestion time)
 * - File context (path, type)
 * - Chunk organization (index, type, hierarchy)
 *
 * @example
 * ```typescript
 * const metadata: BaseMetadata = {
 *   id: 'chunk_01HXYZ',
 *   category: 'file_upload',
 *   workspaceId: 'ws_01HXYZ',
 *   userId: 'user_01HXYZ',
 *   timestamp: '2025-11-25T14:55:00.000Z',
 *   filePath: 'Q4-Report.pdf',
 *   fileType: '.pdf',
 *   chunkIndex: 0,
 *   chunkType: 'paragraph',
 *   parentId: 'doc_01HXYZ'
 * };
 * ```
 */
export interface BaseMetadata extends ApplicationMetadata {
  /**
   * User identifier who owns or created the content
   * Required for multi-user filtering and access control
   * Format: ULID or custom user identifier
   */
  userId: string;

  /**
   * ISO 8601 timestamp of when the chunk was ingested into the vector store
   * Format: YYYY-MM-DDTHH:mm:ss.sssZ (e.g., "2025-11-25T14:55:00.000Z")
   * Used for temporal queries, sorting, and data freshness tracking
   */
  timestamp: string;

  /**
   * Relative file path (for repositories) or original filename (for uploads)
   * Examples:
   * - Repository: "src/services/user.service.ts"
   * - Upload: "Q4-Report.pdf" or "documents/report.pdf"
   * Used for file-level queries and grouping chunks by source file
   */
  filePath: string;

  /**
   * File extension or MIME type identifier
   * Examples: ".ts", ".pdf", ".docx", "application/pdf"
   * Used for filtering by file type and determining parsing strategy
   */
  fileType: string;

  /**
   * Sequential index of the chunk within the parent document
   * Zero-based index that increments for each chunk in document order
   * Optional because some documents may be stored as single chunks
   */
  chunkIndex?: number;

  /**
   * Semantic type classification of the chunk content
   * Examples:
   * - Code: "function", "class", "method_definition", "interface", "type_alias"
   * - Documents: "paragraph", "table", "heading", "code_block", "list"
   * Optional because type may not always be determinable from content
   */
  chunkType?: string;

  /**
   * Identifier of the parent document or chunk for hierarchical relationships
   * Used for reconstructing document structure and parent-child queries
   * Examples:
   * - Repository: file path (e.g., "src/app.ts")
   * - Upload: document ID (e.g., "doc_01HXYZ")
   * - Nested chunk: parent chunk ID
   */
  parentId?: string;
}

/**
 * Metadata for code repository chunks
 * Extends BaseMetadata with repository-specific fields for code semantics
 *
 * @remarks
 * Used by the repository ingestion processor for code parsed via AST.
 * Includes line number tracking and code entity naming for precise code navigation.
 */
export interface RepositoryMetadata extends BaseMetadata {
  category: 'repository';

  /**
   * ULID of the repository entity in the database
   * Links the chunk back to the repository record for relationship tracking
   */
  repositoryId: string;

  /**
   * Name of the code entity (function, class, method, variable, etc.)
   * Extracted from AST parsing during code ingestion
   * Optional because some chunks may not have named entities (e.g., top-level code)
   */
  functionName?: string;

  /**
   * Starting line number in the source file (1-indexed)
   * Extracted from AST parser for precise code location
   */
  startLine?: number;

  /**
   * Ending line number in the source file (1-indexed)
   * Extracted from AST parser for precise code location
   */
  endLine?: number;
}

/**
 * Metadata for uploaded file chunks
 * Extends BaseMetadata with file upload-specific fields
 *
 * @remarks
 * Used by the file ingestion processor for documents uploaded by users.
 * Supports various file formats (PDF, DOCX, TXT, CSV, etc.)
 */
export interface FileUploadMetadata extends BaseMetadata {
  category: 'file_upload';

  /**
   * ULID of the uploaded document entity in the database
   * Links the chunk back to the document record for relationship tracking
   */
  documentId: string;

  /**
   * Original file format as detected by the parser
   * Examples: "pdf", "docx", "txt", "csv", "xlsx"
   * Different from fileType which may be extension or MIME type
   * Optional for backward compatibility with existing ingestion
   */
  sourceFormat?: string;

  /**
   * Page number for paginated documents (PDF, DOCX)
   * 1-indexed page number where the chunk originates
   * Optional for non-paginated formats (TXT, CSV, MD)
   */
  pageNumber?: number;
}

export interface GeneratedDocMetadata extends ApplicationMetadata {
  category: 'generated_doc';
  generatedDocId?: string;
}

export interface JiraTicketMetadata extends ApplicationMetadata {
  category: 'jira_ticket';
  jiraTicketId?: string;
}

/**
 * Complete vector record with embedding and metadata
 * Used for storing and retrieving semantic search data
 */
export interface VectorRecord {
  /** Unique identifier (typically ULID) */
  id: string;

  /** Similarity score (0-1, higher is more similar) */
  score?: number;

  /** Text content of the document */
  content?: string;

  /** Embedding vector (typically 1536 dimensions for OpenAI) */
  vector: EmbeddingVector;

  /** Metadata for filtering and retrieval */
  metadata: VectorMetadata;
}

/**
 * Filter for querying vector store by metadata
 */
export interface VectorFilter {
  userId?: string;
  type?: string;
  [key: string]: string | number | boolean | undefined;
}

/**
 * Options for similarity search
 */
export interface SimilaritySearchOptions {
  /** Number of results to return */
  topK?: number;

  /** Metadata filter */
  filter?: VectorFilter;

  /** Minimum similarity score threshold (0-1) */
  minScore?: number;
}

/**
 * Result from a similarity search
 */
export interface SimilaritySearchResult {
  /** Document ID */
  id: string;

  /** Text content */
  content: string;

  /** Similarity score (0-1) */
  score: number;

  /** Metadata */
  metadata: VectorMetadata;
}
