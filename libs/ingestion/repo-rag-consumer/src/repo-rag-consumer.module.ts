import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AiFoundationModule } from '@app/ai-core';
import { GitModule } from '@app/git';
import { AstParserModule } from '@app/ingestion/ast-parser';
import { KnowledgeBaseModule } from '@app/knowledge-base';
import { SharedEntitiesModule } from '@app/shared-entities';
import { RepoUpdateProcessor } from '@app/ingestion/repo-rag';

/**
 * RepoRagConsumerModule
 *
 * CONSUMER-ONLY module for background worker.
 * Contains @Processor decorators that LISTEN to BullMQ queues.
 * Does NOT contain producer services.
 *
 * **Purpose:**
 * - Process repository ingestion jobs from the queue
 * - Execute long-running tasks (clone, parse, embed, store)
 * - NO job enqueueing - that happens in the producer module
 *
 * **Processors:**
 * - `RepoUpdateProcessor`: Consumes jobs from 'repo-ingestion' queue
 *
 * **Architecture Rule:**
 * This module should ONLY be imported by the background worker, never by the API.
 */
@Module({
  imports: [
    // Register queue for consumers (allows processor to connect)
    BullModule.registerQueue({ name: 'repo-ingestion' }),

    // Dependencies for processor
    SharedEntitiesModule, // Provides RepoStateEntity repository
    AiFoundationModule, // Embeddings service
    KnowledgeBaseModule, // Vector and content stores
    GitModule, // Git operations
    AstParserModule, // Code parsing
  ],
  providers: [
    RepoUpdateProcessor, // Consumer: processes jobs from queue
  ],
  exports: [
    RepoUpdateProcessor, // Exported for testing
  ],
})
export class RepoRagConsumerModule {}
