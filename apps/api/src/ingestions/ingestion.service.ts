import { Injectable, Logger } from '@nestjs/common';
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

    try {
      const result = await this.repoIngestionService.ingestRepo({
        repoUrl: dto.repoUrl,
        ref: dto.ref,
        token: dto.token,
        userId: dto.userId || 'system',
        repoId: dto.repoId,
      });

      this.logger.log(
        `Repository ingestion queued: ${dto.repoUrl} (Job ID: ${result.jobId})`,
      );

      const response = {
        status: result.status,
        jobId: result.jobId,
        repoUrl: result.repoUrl,
        ref: result.ref,
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
}
