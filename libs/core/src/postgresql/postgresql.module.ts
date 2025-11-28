import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { DatabaseConfig } from '../config';
import { ContentBlobEntity, RepoStateEntity } from '@app/shared-entities';

export const POSTGRES_CONNECTION = 'POSTGRES_CONNECTION';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbConfig =
          configService.get<DatabaseConfig['postgres']>('database.postgres');

        if (!dbConfig) {
          throw new Error(
            'Database configuration not found. Ensure POSTGRES_* environment variables are set.',
          );
        }

        return {
          type: 'postgres' as const,
          host: dbConfig.host,
          port: dbConfig.port,
          username: dbConfig.username,
          password: dbConfig.password,
          database: dbConfig.database,
          entities: [RepoStateEntity, ContentBlobEntity],
          synchronize: dbConfig.synchronize,
          logging: dbConfig.logging,
          // Connection pool settings for production
          extra: {
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
          },
        };
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class CorePostgresModule {}
