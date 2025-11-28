import {BadRequestException, Inject, Injectable, Logger,} from '@nestjs/common';
import {ParentChildRetrieverService} from '@app/retrieval-common';
import {EmbeddingsService} from '@app/ai-core';
import {QuerySearchRequest, QuerySearchResponse} from '../dto';

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
    ) {
    }

    /**
     * Searches for relevant documents using semantic search.
     *
     * @param params - Search parameters including prompt and optional k (number of results)
     * @returns Promise<QuerySearchResponse> - Search results with relevant document contents
     * @throws BadRequestException if embeddings generation fails or returns empty array
     *
     * @example
     * ```typescript
     * const results = await queryService.search({
     *   prompt: 'How does authentication work?',
     *   k: 10
     * });
     * ```
     */
    async search(params: QuerySearchRequest): Promise<QuerySearchResponse> {
        // Validate and normalize k parameter
        const k = this.normalizeK(params.k);

        this.logger.debug(`Searching for: "${params.prompt}" with k=${k}`);

        // Generate embeddings for the query
        const embeddings = await this.embeddingsService.embedDocuments([
            params.prompt,
        ]);

        console.log('embeddings', embeddings)

        // Guard: Ensure embeddings were generated
        if (!embeddings || embeddings.length === 0) {
            this.logger.error('EmbeddingsService returned an empty array');
            throw new BadRequestException(
                'Failed to generate embeddings for the query. Please try again.',
            );
        }

        // Extract the first (and only) embedding vector
        const [queryVector] = embeddings;

        console.log('queryVector', queryVector)

        // Retrieve relevant documents using the embedding vector
        const results = await this.retrieverService.retrieve(queryVector, k);

        console.log('results', results)

        this.logger.debug(`Found ${results.length} results for query`);

        return {results};
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
