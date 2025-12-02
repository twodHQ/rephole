import {Module} from '@nestjs/common';
import {BullModule} from '@nestjs/bullmq';
import {AiFoundationModule} from '@app/ai-core';
import {GitModule} from '@app/git';
import {KnowledgeBaseModule} from '@app/knowledge-base';
import {SharedEntitiesModule} from '@app/shared-entities';
import {RepoIngestionService,} from '@app/ingestion/repo-rag';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';

/**
 * RepoRagProducerModule
 *
 * PRODUCER-ONLY module for API server.
 * Contains services that ADD jobs to BullMQ queues.
 * Does NOT contain any @Processor decorators.
 *
 * **Purpose:**
 * - Provide services to enqueue repository ingestion jobs
 * - NO job processing - that happens in the consumer module
 *
 * **Exported Services:**
 * - `RepoIngestionService`: Adds jobs to 'repo-ingestion' queue
 *
 * **Architecture Rule:**
 * This module should ONLY be imported by the API app, never by the worker.
 */
@Module({
    imports: [
        // Register queue for producers (allows @InjectQueue)
        BullModule.registerQueue({name: 'repo-ingestion'}),

        BullBoardModule.forFeature({
          name: 'repo-ingestion',
          adapter: BullMQAdapter
        }),

        // Dependencies for producer services
        SharedEntitiesModule, // Provides RepoStateEntity
        AiFoundationModule, // LLM and embeddings
        KnowledgeBaseModule, // Vector store and content store
        GitModule, // Git operations
    ],
    providers: [
        RepoIngestionService, // Producer: enqueues jobs
    ],
    exports: [RepoIngestionService],
})
export class RepoRagProducerModule {
}
