import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { RepoIngestionService } from '@app/ingestion/repo-rag-producer';
import { RepoIngestionDto, RepoIngestionResponseDto } from '../dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(private readonly repoIngestionService: RepoIngestionService) {}

  async ingestRepo(dto: RepoIngestionDto): Promise<RepoIngestionResponseDto> {
    this.logger.log(
      `Received repository ingestion request: ${dto.repoUrl} (ref: ${dto.ref || 'main'})`,
    );

    // Auto-deduce repoId from URL if not provided
    const repoId = dto.repoId || this.extractRepoId(dto.repoUrl);
    this.logger.debug(`Using repoId: ${repoId} (auto-deduced: ${!dto.repoId})`);

    try {
      const result = await this.repoIngestionService.ingestRepo({
        repoUrl: dto.repoUrl,
        ref: dto.ref,
        token: dto.token,
        userId: dto.userId || 'system',
        repoId,
        meta: dto.meta || {},
      });

      this.logger.log(
        `Repository ingestion queued: ${dto.repoUrl} (Job ID: ${result.jobId}, repoId: ${repoId})`,
      );

      const response = {
        status: result.status,
        jobId: result.jobId,
        repoUrl: result.repoUrl,
        ref: result.ref,
        repoId, // Include the (auto-deduced or provided) repoId
      };

      return plainToInstance(RepoIngestionResponseDto, response);
    } catch (error) {
      this.logger.error(
        `Repository ingestion failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Extracts the repository name from a Git URL.
   *
   * Supports various Git URL formats:
   * - HTTPS: https://github.com/org/repo-name.git → repo-name
   * - HTTPS without .git: https://github.com/org/repo-name → repo-name
   * - SSH: git@github.com:org/repo-name.git → repo-name
   * - GitLab/Bitbucket: https://gitlab.com/org/repo-name.git → repo-name
   *
   * @param url - Git repository URL
   * @returns Repository name extracted from URL
   * @throws BadRequestException if URL format is invalid or repo name cannot be extracted
   */
  private extractRepoId(url: string): string {
    try {
      // Remove trailing slashes
      const cleanUrl = url.replace(/\/+$/, '');

      // Try to extract from the path (works for both HTTPS and SSH URLs)
      // Regex matches the last segment before optional .git suffix
      const match = cleanUrl.match(/\/([^/]+?)(?:\.git)?$/);

      if (match && match[1]) {
        const repoName = match[1];

        // Validate the extracted name contains only safe characters
        if (!/^[a-zA-Z0-9._-]+$/.test(repoName)) {
          throw new Error('Repository name contains invalid characters');
        }

        this.logger.debug(`Extracted repoId "${repoName}" from URL: ${url}`);
        return repoName;
      }

      throw new Error('Could not parse repository name from URL path');
    } catch (error) {
      this.logger.error(
        `Failed to extract repoId from URL "${url}": ${error.message}`,
      );
      throw new BadRequestException(
        `Unable to extract repository name from URL: ${url}. ` +
          'Please provide a valid Git repository URL or specify repoId manually.',
      );
    }
  }
}
