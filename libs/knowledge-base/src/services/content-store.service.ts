import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ContentBlobEntity } from '../entities';

@Injectable()
export class ContentStoreService {
  private readonly logger = new Logger(ContentStoreService.name);

  constructor(
    @InjectRepository(ContentBlobEntity)
    private repo: Repository<ContentBlobEntity>,
  ) {}

  async saveParent(id: string, content: string, metadata: any) {
    try {
      // Sanitize content before saving to PostgreSQL
      const sanitizedContent = this.sanitizeContent(content, id);

      await this.repo.save({ id, content: sanitizedContent, metadata });
    } catch (error) {
      this.logger.error(
        `Failed to save parent content for ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getParent(id: string): Promise<ContentBlobEntity | null> {
    return this.repo.findOneBy({ id });
  }

  async getParents(ids: string[]): Promise<ContentBlobEntity[]> {
    return this.repo.findBy({ id: In(ids) });
  }

  /**
   * Sanitize content to remove null bytes and invalid UTF8 sequences
   * PostgreSQL does not allow 0x00 (null bytes) in UTF8 text fields
   */
  private sanitizeContent(content: string, fileId: string): string {
    // Check if content contains null bytes
    if (content.includes('\u0000')) {
      this.logger.warn(`Removing null bytes from content for file: ${fileId}`);
      // Remove all null bytes
      content = content.replace(/\u0000/g, '');
    }

    // Remove other potentially problematic control characters (optional)
    // Keep common ones like \n, \r, \t but remove others
    const sanitized = content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    if (sanitized.length !== content.length) {
      this.logger.debug(
        `Sanitized ${content.length - sanitized.length} invalid characters from ${fileId}`,
      );
    }

    return sanitized;
  }
}
