import { Injectable, Logger } from '@nestjs/common';
import { ContentStoreService, VectorStoreService } from '@app/knowledge-base';
import type { EmbeddingVector } from '@app/shared-interfaces';

/**
 * Represents a retrieved document chunk with its metadata.
 */
export interface RetrievedChunk {
  /** Unique identifier (typically the file path) */
  id: string;
  /** Full content of the document */
  content: string;
  /** Repository identifier this content belongs to */
  repoId?: string | null;
  /** Additional metadata (custom meta from ingestion) */
  metadata?: Record<string, unknown> | null;
}

/**
 * ParentChildRetrieverService
 *
 * Retrieves full document context by first matching small chunks (children),
 * then returning their parent documents.
 *
 * **Design Philosophy:**
 * - Only depends on stores (VectorStore, ContentStore)
 * - Accepts pre-computed embedding vectors
 * - Embedding logic is the caller's responsibility
 * - Extracted into RetrievalCommonModule for clean separation of concerns
 *
 * **Usage Example:**
 * ```typescript
 * // 1. Inject the service and embeddings service in your class
 * constructor(
 *   private retriever: ParentChildRetrieverService,
 *   private embeddings: EmbeddingsService,
 * ) {}
 *
 * // 2. Embed your query
 * const [queryVector] = await this.embeddings.embedDocuments(['your query']);
 *
 * // 3. Retrieve parent documents (optionally with filters)
 * const results = await this.retriever.retrieve(queryVector, 5);
 * const filtered = await this.retriever.retrieve(queryVector, 5, { repoId: 'my-repo' });
 * ```
 */
@Injectable()
export class ParentChildRetrieverService {
  private readonly logger = new Logger(ParentChildRetrieverService.name);

  constructor(
    private vectorStore: VectorStoreService,
    private contentStore: ContentStoreService,
  ) {}

  /**
   * Retrieves the FULL context for a query by matching small chunks first.
   *
   * @param queryVector - Pre-computed embedding vector for the query
   * @param k - Number of top results to return (default: 5)
   * @param metadataFilters - Optional metadata filters to narrow results (e.g., { repoId: 'my-repo', team: 'backend' })
   * @returns Array of retrieved chunks with id, content, repoId, and metadata
   *
   * @example
   * ```typescript
   * // Without filters
   * const results = await retriever.retrieve(queryVector, 5);
   * // Returns: [{ id: 'src/auth.ts', content: '...', repoId: 'my-repo', metadata: {...} }]
   *
   * // With filters (filter by repository and custom meta)
   * const filtered = await retriever.retrieve(queryVector, 5, {
   *   repoId: 'my-repo',
   *   team: 'backend'
   * });
   * ```
   */
  async retrieve(
    queryVector: EmbeddingVector,
    k: number = 5,
    metadataFilters?: Record<string, string | number | boolean>,
  ): Promise<RetrievedChunk[]> {
    const hasFilters =
      metadataFilters && Object.keys(metadataFilters).length > 0;

    if (hasFilters) {
      this.logger.debug(
        `Retrieving with filters: ${JSON.stringify(metadataFilters)}`,
      );
    }

    // 1. Search for CHILDREN (Small, precise chunks)
    // We fetch k * 3 because multiple children might point to the SAME parent.
    // We want to ensure we get enough unique parents.
    const childResults = await this.vectorStore.similaritySearch(
      queryVector,
      k * 3,
      metadataFilters,
    );

    // 2. Extract Unique Parent IDs
    const parentIds = new Set<string>();
    const orphanChunks: RetrievedChunk[] = [];

    for (const res of childResults) {
      const pid = res.metadata.parentId;
      if (pid) {
        parentIds.add(String(pid));
      } else {
        if (!res.content) {
          this.logger.warn(
            `Child ${res.id} has no parent or content. Skipping...`,
          );
          continue;
        }
        // Fallback: If no parent (maybe older data), use the child content
        orphanChunks.push({
          id: res.id,
          content: res.content,
          repoId: res.metadata.repoId as string | undefined,
          metadata: res.metadata as Record<string, unknown>,
        });
      }

      // Optimization: Stop if we have enough unique parents
      if (parentIds.size >= k) break;
    }

    // 3. Fetch PARENTS (Full Context)
    if (parentIds.size > 0) {
      const parents = await this.contentStore.getParents(Array.from(parentIds));

      this.logger.log(
        `Swapped ${childResults.length} chunks for ${parents.length} parent files.`,
      );

      return parents.map((p) => ({
        id: p.id,
        content: p.content,
        repoId: p.repoId,
        metadata: p.metadata,
      }));
    }

    return orphanChunks;
  }

  /**
   * Retrieves raw chunks directly from vector search without parent document lookup.
   *
   * Unlike `retrieve()` which returns parent documents (full files), this method
   * returns the actual chunks that matched the semantic search. Useful when you
   * need precise code snippets rather than full file context.
   *
   * @param queryVector - Pre-computed embedding vector for the query
   * @param k - Number of top results to return (default: 5)
   * @param metadataFilters - Optional metadata filters to narrow results (e.g., { repoId: 'my-repo', team: 'backend' })
   * @returns Array of raw chunks with id, content, repoId, and metadata
   *
   * @example
   * ```typescript
   * // Retrieve raw chunks without parent lookup
   * const chunks = await retriever.retrieveChunks(queryVector, 10);
   * // Returns: [{ id: 'chunk-id', content: 'function auth() {...}', repoId: 'my-repo', metadata: {...} }]
   *
   * // With filters
   * const filtered = await retriever.retrieveChunks(queryVector, 10, {
   *   repoId: 'my-repo',
   *   team: 'backend'
   * });
   * ```
   */
  async retrieveChunks(
    queryVector: EmbeddingVector,
    k: number = 5,
    metadataFilters?: Record<string, string | number | boolean>,
  ): Promise<RetrievedChunk[]> {
    const hasFilters =
      metadataFilters && Object.keys(metadataFilters).length > 0;

    if (hasFilters) {
      this.logger.debug(
        `Retrieving chunks with filters: ${JSON.stringify(metadataFilters)}`,
      );
    }

    // Search for chunks directly - no parent lookup needed
    const chunkResults = await this.vectorStore.similaritySearch(
      queryVector,
      k,
      metadataFilters,
    );

    this.logger.debug(
      `Retrieved ${chunkResults.length} raw chunks` +
        (hasFilters ? ` (filtered)` : ''),
    );

    // Map vector records to RetrievedChunk format, filtering out chunks without content
    return chunkResults
      .filter((chunk) => chunk.content)
      .map((chunk) => ({
        id: chunk.id,
        content: chunk.content!,
        repoId: chunk.metadata?.repoId as string | undefined,
        metadata: chunk.metadata as Record<string, unknown>,
      }));
  }
}
