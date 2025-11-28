import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChromaClient } from 'chromadb';
import type { DatabaseConfig } from '../config';

export const CHROMA_CLIENT = 'CHROMA_CLIENT';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: CHROMA_CLIENT,
      useFactory: async (configService: ConfigService) => {
        const chromaConfig =
          configService.get<DatabaseConfig['chroma']>('database.chroma');

        if (!chromaConfig) {
          throw new Error(
            'ChromaDB configuration not found. Ensure CHROMA_HOST and CHROMA_PORT are set.',
          );
        }

        try {
          // Create ChromaDB client
          const client = new ChromaClient({
            host: chromaConfig.host,
            port: Number(chromaConfig.port),
            ssl: Boolean(chromaConfig.ssl),
          });

          // Test connection by attempting to heartbeat
          await client.heartbeat().catch((error) => {
            throw new Error(
              `Failed to connect to ChromaDB at ${chromaConfig.host}:${chromaConfig.port}. ` +
                `Ensure ChromaDB is running. Error: ${error.message}`,
            );
          });

          return client;
        } catch (error) {
          if (error instanceof Error) {
            throw new Error(
              `ChromaDB initialization failed: ${error.message}. ` +
                `Check that ChromaDB is running at ${chromaConfig.host}:${chromaConfig.port}`,
            );
          }
          throw error;
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: [CHROMA_CLIENT],
})
export class CoreChromaModule {}
