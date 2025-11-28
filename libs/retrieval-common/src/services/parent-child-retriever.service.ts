import {Injectable, Logger} from '@nestjs/common';
import {ContentStoreService, VectorStoreService} from '@app/knowledge-base';
import type {EmbeddingVector} from '@app/shared-interfaces';

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
 * // 3. Retrieve parent documents
 * const results = await this.retriever.retrieve(queryVector, 5);
 * ```
 */
@Injectable()
export class ParentChildRetrieverService {
    private readonly logger = new Logger(ParentChildRetrieverService.name);

    constructor(
        private vectorStore: VectorStoreService,
        private contentStore: ContentStoreService,
    ) {
    }

    /**
     * Retrieves the FULL context for a query by matching small chunks first.
     *
     * @param queryVector - Pre-computed embedding vector for the query
     * @param k - Number of top results to return (default: 5)
     * @returns Array of parent document contents
     */
    async retrieve(
        queryVector: EmbeddingVector,
        k: number = 5,
    ): Promise<string[]> {
        // 1. Use provided query vector

        // 2. Search for CHILDREN (Small, precise chunks)
        // We fetch k * 3 because multiple children might point to the SAME parent.
        // We want to ensure we get enough unique parents.
        const childResults = await this.vectorStore.similaritySearch(
            queryVector,
            k * 3,
        );

        // 3. Extract Unique Parent IDs
        const parentIds = new Set<string>();
        const childMatches: string[] = [];

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
                // Fallback: If no parent (maybe older data), just use the child content
                childMatches.push(res.content);
            }

            // Optimization: Stop if we have enough unique parents
            if (parentIds.size >= k) break;
        }

        // 4. Fetch PARENTS (Full Context)
        if (parentIds.size > 0) {
            const parents = await this.contentStore.getParents(Array.from(parentIds));

            this.logger.log(
                `Swapped ${childResults.length} chunks for ${parents.length} parent files.`,
            );

            return parents.map(
                (p) => `
        === FILE: ${p.id} ===
        ${p.content}
        =====================
      `,
            );
        }

        return childMatches;
    }
}
