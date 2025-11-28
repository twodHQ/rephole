import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentBlobEntity, RepoStateEntity } from './entities';

/**
 * SharedEntitiesModule
 *
 * Provides TypeORM entities that are shared across multiple feature modules.
 * This module breaks circular dependencies by centralizing entity definitions.
 *
 * **Exported Entities:**
 * - ContentBlobEntity: Used by KnowledgeBase and Core modules
 * - RepoStateEntity: Used by RepoRag and Core modules
 *
 * **Design Pattern:**
 * - Entities are infrastructure concerns, not feature-specific
 * - Feature modules import this module to access entity repositories
 * - Prevents cross-feature dependencies through entity imports
 */
@Module({
  imports: [TypeOrmModule.forFeature([ContentBlobEntity, RepoStateEntity])],
  exports: [TypeOrmModule],
})
export class SharedEntitiesModule {}
