import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ParentChildRetrieverService } from '@app/retrieval-common';
import { EmbeddingsService } from '@app/ai-core';
import {
  QuerySearchRequest,
  QuerySearchResponse,
  SearchResultChunk,
} from '../dto';

// Constants for search parameters
const DEFAULT_K = 5;
const MAX_K = 100;

@Injectable()
export class QueryService {
  private readonly logger = new Logger(QueryService.name);

  constructor(
    @Inject(EmbeddingsService)
    private readonly embeddingsService: EmbeddingsService,
    @Inject(ParentChildRetrieverService)
    private readonly retrieverService: ParentChildRetrieverService,
  ) {}

  /**
   * Searches for relevant documents using semantic search within a specific repository.
   *
   * @param repoId - Required repository identifier to search within
   * @param params - Search parameters including prompt, k (number of results), and optional meta filters
   * @returns Promise<QuerySearchResponse> - Search results with relevant document contents
   * @throws BadRequestException if embeddings generation fails or returns empty array
   *
   * @example
   * ```typescript
   * // Search within a repository
   * const results = await queryService.search('my-repo', {
   *   prompt: 'How does authentication work?',
   *   k: 10
   * });
   *
   * // Search with additional metadata filters
   * const filteredResults = await queryService.search('my-repo', {
   *   prompt: 'How does authentication work?',
   *   k: 10,
   *   meta: { team: 'backend' }
   * });
   * ```
   */
  async search(
    repoId: string,
    params: QuerySearchRequest,
  ): Promise<QuerySearchResponse> {
    // Validate and normalize k parameter
    const k = this.normalizeK(params.k);

    // Build filters: repoId is always required, merge with optional meta filters
    const metaFilters: Record<string, string | number | boolean> = {
      repoId,
      ...(params.meta || {}),
    };

    const additionalFilters = Object.keys(params.meta || {});
    const hasAdditionalFilters = additionalFilters.length > 0;

    this.logger.debug(
      `Searching in repo "${repoId}" for: "${params.prompt}" with k=${k}` +
        (hasAdditionalFilters
          ? `, additional filters: ${JSON.stringify(params.meta)}`
          : ''),
    );

    // Generate embeddings for the query
    const embeddings = await this.embeddingsService.embedDocuments([
      params.prompt,
    ]);

    // Guard: Ensure embeddings were generated
    if (!embeddings || embeddings.length === 0) {
      this.logger.error('EmbeddingsService returned an empty array');
      throw new BadRequestException(
        'Failed to generate embeddings for the query. Please try again.',
      );
    }

    // Extract the first (and only) embedding vector
    const [queryVector] = embeddings;

    // Retrieve relevant documents using the embedding vector with repoId filter
    const retrievedChunks = await this.retrieverService.retrieve(
      queryVector,
      k,
      metaFilters,
    );

    // Map to response DTO
    const results: SearchResultChunk[] = retrievedChunks.map((chunk) => ({
      id: chunk.id,
      content: chunk.content,
      repoId: chunk.repoId,
      metadata: chunk.metadata,
    }));

    this.logger.debug(
      `Found ${results.length} results in repo "${repoId}"` +
        (hasAdditionalFilters
          ? ` (filtered by: ${additionalFilters.join(', ')})`
          : ''),
    );

    return { results };
  }

  /**
   * Searches for relevant chunks using semantic search within a specific repository.
   * Unlike `search()`, this method returns raw chunks directly instead of parent documents.
   *
   * @param repoId - Required repository identifier to search within
   * @param params - Search parameters including prompt, k (number of results), and optional meta filters
   * @returns Promise<QuerySearchResponse> - Search results with raw chunk contents
   * @throws BadRequestException if embeddings generation fails or returns empty array
   *
   * @example
   * ```typescript
   * // Search for chunks within a repository
   * const results = await queryService.searchChunks('my-repo', {
   *   prompt: 'How does authentication work?',
   *   k: 10
   * });
   *
   * // Search with additional metadata filters
   * const filteredResults = await queryService.searchChunks('my-repo', {
   *   prompt: 'How does authentication work?',
   *   k: 10,
   *   meta: { team: 'backend' }
   * });
   * ```
   */
  async searchChunks(
    repoId: string,
    params: QuerySearchRequest,
  ): Promise<QuerySearchResponse> {
    // Validate and normalize k parameter
    const k = this.normalizeK(params.k);

    // Build filters: repoId is always required, merge with optional meta filters
    const metaFilters: Record<string, string | number | boolean> = {
      repoId,
      ...(params.meta || {}),
    };

    const additionalFilters = Object.keys(params.meta || {});
    const hasAdditionalFilters = additionalFilters.length > 0;

    this.logger.debug(
      `Searching chunks in repo "${repoId}" for: "${params.prompt}" with k=${k}` +
        (hasAdditionalFilters
          ? `, additional filters: ${JSON.stringify(params.meta)}`
          : ''),
    );

    // Generate embeddings for the query
    const embeddings = await this.embeddingsService.embedDocuments([
      params.prompt,
    ]);

    // Guard: Ensure embeddings were generated
    if (!embeddings || embeddings.length === 0) {
      this.logger.error('EmbeddingsService returned an empty array');
      throw new BadRequestException(
        'Failed to generate embeddings for the query. Please try again.',
      );
    }

    // Extract the first (and only) embedding vector
    const [queryVector] = embeddings;

    // Retrieve raw chunks directly (no parent lookup)
    const retrievedChunks = await this.retrieverService.retrieveChunks(
      queryVector,
      k,
      metaFilters,
    );

    // Map to response DTO
    const results: SearchResultChunk[] = retrievedChunks.map((chunk) => ({
      id: chunk.id,
      content: chunk.content,
      repoId: chunk.repoId,
      metadata: chunk.metadata,
    }));

    this.logger.debug(
      `Found ${results.length} chunks in repo "${repoId}"` +
        (hasAdditionalFilters
          ? ` (filtered by: ${additionalFilters.join(', ')})`
          : ''),
    );

    return { results };
  }

  /**
   * Normalizes the k parameter to ensure it's within valid bounds
   * @private
   */
  private normalizeK(k?: number): number {
    if (k === undefined || k === null) {
      return DEFAULT_K;
    }

    // Ensure k is a positive integer within bounds
    if (!Number.isInteger(k) || k < 1) {
      return DEFAULT_K;
    }

    // Clamp to maximum allowed value
    return Math.min(k, MAX_K);
  }
}
