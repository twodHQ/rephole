import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * Entity for storing full file content (parent documents).
 * Used by the parent-child retrieval strategy where chunks point back to full files.
 *
 * @remarks
 * - `id` is typically the file path (e.g., "src/auth/auth.service.ts")
 * - `repoId` enables filtering content by repository
 * - `metadata` stores additional key-value pairs (repoId, custom meta, etc.)
 */
@Entity('content_blobs')
@Index('IDX_content_blobs_repoId', ['repoId'])
export class ContentBlobEntity {
  /**
   * Unique identifier - typically the relative file path within the repository.
   * @example "src/auth/auth.service.ts"
   */
  @PrimaryColumn()
  id: string;

  /**
   * Repository identifier this content belongs to.
   * Auto-deduced from repository URL or provided by client during ingestion.
   * Indexed for efficient filtering queries.
   *
   * @example "rephole" (from https://github.com/twodHQ/rephole.git)
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  repoId: string | null;

  /**
   * The full file content stored as text.
   * Used to retrieve complete context when chunks match during search.
   */
  @Column('text')
  content: string;

  /**
   * Additional metadata as JSON.
   * May contain custom key-value pairs from ingestion meta parameter.
   */
  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;
}
