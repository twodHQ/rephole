import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CoreModule } from '@app/core';
import { RepoRagProducerModule } from '@app/ingestion/repo-rag-producer';
import { AiFoundationModule } from '@app/ai-core';
import { RetrievalCommonModule } from '@app/retrieval-common';
import { IngestionController, IngestionService } from './ingestions';
import { JobController, JobService } from './jobs';
import { HealthController } from './health.controller';
import { QueryController, QueryService } from './queries';
import { BullBoardModule } from "@bull-board/nestjs";
import { ExpressAdapter } from "@bull-board/express";
/**
 * ApiServerModule
 *
 * Root module for the API server application.
 * This is a PRODUCER-ONLY module that adds jobs to queues but does not process them.
 * Job processing happens in the background-worker application.
 *
 * **Architecture:**
 * - Core Infrastructure: Config, Logging, Database, Redis, Job Queues
 * - Feature Modules: File & Repository ingestion (producer services only)
 * - Controllers: REST API endpoints for ingestion and job management
 *
 * **Note:** After refactoring Step 2, the API now imports RepoRagProducerModule only.
 * This ensures the API NEVER processes jobs - only the background worker does.
 */
@Module({
  imports: [
    // 1. Core Infrastructure (provides all core services globally)
    CoreModule, // Config, Logging, Postgres, Redis, ChromaDB

    // 2. Job Queue Infrastructure
    BullModule.forRoot({
      connection: {
        host: 'localhost',
        port: 6379,
      },
    }),

    BullBoardModule.forRoot({
      route: '/queues',
      adapter: ExpressAdapter // Or FastifyAdapter from `@bull-board/fastify`
    }),

    // 3. Feature Modules (PRODUCER ONLY - no processors!)
    RepoRagProducerModule, // Provides RepoIngestionService, DocGeneratorService (PRODUCER ONLY)
    AiFoundationModule, // Provides EmbeddingsService for QueryService
    RetrievalCommonModule, // Provides ParentChildRetrieverService for QueryService
  ],
  controllers: [
    HealthController,
    IngestionController, // Handles repository ingestion
    JobController, // Handles job status queries
    QueryController, // Handles search queries
  ],
  providers: [IngestionService, JobService, QueryService],
})
export class ApiServerModule {}
