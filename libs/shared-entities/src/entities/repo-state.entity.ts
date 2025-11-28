import { Column, Entity, PrimaryColumn } from 'typeorm';
import { ulid } from 'ulid';

@Entity('repo_states')
export class RepoStateEntity {
  // Validate with ULID length
  @PrimaryColumn({ type: 'varchar', length: 26, default: ulid() })
  id: string;

  @Column()
  repoUrl: string;

  @Column()
  localPath: string;

  @Column({ type: 'varchar', nullable: true })
  lastProcessedCommit: string | null; // The SHA hash of the last sync

  @Column('jsonb', { default: {} })
  fileSignatures: Record<string, string>;
  // Map<FilePath, HashOfContent>
  // We use this to double-check if a file truly changed content-wise
}
