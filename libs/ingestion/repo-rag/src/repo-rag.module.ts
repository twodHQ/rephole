import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AiFoundationModule } from '@app/ai-core';
import { GitModule } from '@app/git';
import { AstParserModule } from '@app/ingestion/ast-parser';
import { KnowledgeBaseModule } from '@app/knowledge-base';
import { SharedEntitiesModule } from '@app/shared-entities';
import { RepoIngestionService } from './services';
import { RepoUpdateProcessor } from './processors';

/**
 * RepoRagModule
 *
 * Provides repository ingestion and RAG (Retrieval-Augmented Generation) capabilities.
 *
 * **Features:**
 * - BullMQ queue `repo-ingestion` for asynchronous repository processing
 * - Incremental code analysis using Git change detection
 * - Vector storage of code summaries for efficient retrieval
 *
 * **Exported Services:**
 * - `RepoIngestionService`: Producer service to trigger repository sync jobs
 * - `RepoUpdateProcessor`: Consumer that processes repository changes
 *
 * **Dependencies:**
 * - AiFoundationModule: LLM gateway and summarization services
 * - KnowledgeBaseModule: Vector store for code embeddings
 * - GitModule: Git operations and change detection
 * - TypeORM: Repository state persistence
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: 'repo-ingestion' }),
    SharedEntitiesModule, // Provides RepoStateEntity repository
    AiFoundationModule,
    KnowledgeBaseModule, // No forwardRef needed after refactoring!
    GitModule,
    AstParserModule,
  ],
  providers: [
    RepoIngestionService, // Producer: Triggers a repo sync
    RepoUpdateProcessor, // Consumer: Clones git, summarizes code
  ],
  exports: [RepoIngestionService, RepoUpdateProcessor],
})
export class RepoRagModule {}
