import { RepoRagConsumerModule } from '@app/ingestion/repo-rag-consumer';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { CoreModule } from '@app/core';

@Module({
  imports: [
    CoreModule,

    // BULLMQ CONFIGURATION FOR WORKER
    BullModule.forRoot({
      connection: { host: process.env.REDIS_HOST, port: 6379 },
    }),

    // CONSUMER MODULES ONLY - process queue jobs
    // These contain the WorkerHost processors that consume from queues
    RepoRagConsumerModule, // Processes repo ingestion jobs (CONSUMER ONLY)
  ],
  // No Controllers here!
})
export class WorkerAppModule {}
