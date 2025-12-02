import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { DatabaseConfig } from '../config';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        const redisConfig =
          configService.get<DatabaseConfig['redis']>('database.redis');

        if (!redisConfig) {
          throw new Error(
            'Redis configuration not found. Ensure REDIS_HOST and REDIS_PORT are set.',
          );
        }

        try {
          const client = new Redis({
            host: redisConfig.host,
            port: redisConfig.port,
            password: redisConfig.password,
            retryStrategy: (times: number) => {
              return Math.min(times * 50, 2000);
            },
            maxRetriesPerRequest: 3,
          });

          // Handle connection errors
          client.on('error', (error) => {
            console.error('Redis connection error:', error.message);
          });

          client.on('connect', () => {
            console.log(
              `Redis connected to ${redisConfig.host}:${redisConfig.port}`,
            );
          });

          return client;
        } catch (error) {
          if (error instanceof Error) {
            throw new Error(
              `Redis initialization failed: ${error.message}. ` +
                `Check that Redis is running at ${redisConfig.host}:${redisConfig.port}`,
            );
          }
          throw error;
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class CoreRedisModule {}
