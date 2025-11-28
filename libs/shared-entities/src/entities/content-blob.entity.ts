import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('content_blobs')
export class ContentBlobEntity {
  @PrimaryColumn()
  id: string; // "src/auth/auth.service.ts"

  @Column('text')
  content: string; // The FULL file content

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;
}
