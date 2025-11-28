import { Module } from '@nestjs/common';
import { KnowledgeBaseModule } from '@app/knowledge-base';
import { ParentChildRetrieverService } from './services';

/**
 * RetrievalCommonModule
 *
 * Provides retrieval services that combine vector search with content fetching.
 * This module serves as a focused layer for retrieval operations.
 *
 * **Exported Services:**
 * - `ParentChildRetrieverService`: Retrieves full context by matching chunks and fetching parents
 *
 * **Dependencies:**
 * - KnowledgeBaseModule: For VectorStoreService and ContentStoreService
 *
 * **Design Pattern:**
 * - Separation of Concerns: Retrieval logic separated from general ingestion utilities
 * - Dependency Optimization: Only imports what's needed (stores), not the full feature modules
 * - Reusability: Can be used by any module needing retrieval capabilities
 *
 * **Usage:**
 * Import this module when you need retrieval services without pulling in heavy dependencies.
 * For simple text utilities (splitting), use IngestionCommonModule instead.
 */
@Module({
  imports: [KnowledgeBaseModule], // For VectorStore and ContentStore services
  providers: [ParentChildRetrieverService],
  exports: [ParentChildRetrieverService],
})
export class RetrievalCommonModule {}
