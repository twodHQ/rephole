import { Module } from '@nestjs/common';
import { CoreConfigModule } from './config';
import { CoreLoggingModule } from './logging';
import { CorePostgresModule } from './postgresql';
import { CoreRedisModule } from './redis';
import { CoreChromaModule } from './chromadb';

/**
 * CoreModule
 *
 * Provides all core infrastructure services.
 * Import this at the application root level.
 *
 * Provides:
 * - CoreConfigModule: Configuration service (ConfigService)
 * - CoreLoggingModule: Logging infrastructure
 * - CorePostgresModule: PostgreSQL connection and TypeORM
 * - CoreRedisModule: Redis client (REDIS_CLIENT token)
 * - CoreChromaModule: ChromaDB client (CHROMA_CLIENT token)
 */
@Module({
  imports: [
    CoreConfigModule,
    CoreLoggingModule,
    CorePostgresModule,
    CoreRedisModule,
    CoreChromaModule,
  ],
  exports: [
    CoreConfigModule,
    CoreLoggingModule,
    CorePostgresModule,
    CoreRedisModule,
    CoreChromaModule,
  ],
})
export class CoreModule {}
