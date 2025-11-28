import { Module } from '@nestjs/common';
import { AiFoundationModule } from '@app/ai-core';
import { CoreModule } from '@app/core';
import { SharedEntitiesModule } from '@app/shared-entities';
import { VectorStoreService, ContentStoreService } from './services';

/**
 * KnowledgeBaseModule
 *
 * Provides vector storage, content storage, and memory services.
 *
 * Dependencies:
 * - CoreModule: Provides CHROMA_CLIENT, REDIS_CLIENT, ConfigService
 * - SharedEntitiesModule: Provides DocumentChunkEntity and ContentBlobEntity
 * - AiFoundationModule: Provides EmbeddingsService
 */
@Module({
  imports: [
    CoreModule, // Provides CHROMA_CLIENT, REDIS_CLIENT, ConfigService
    AiFoundationModule,
    SharedEntitiesModule, // Provides ContentBlobEntity repository
  ],
  providers: [VectorStoreService, ContentStoreService],
  exports: [VectorStoreService, ContentStoreService],
})
export class KnowledgeBaseModule {}
