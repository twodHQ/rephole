import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RepoIngestionDto, RepoIngestionResponseDto } from '../dto';
import { CircuitBreakerInterceptor } from '@app/core';
import { IngestionService } from './ingestion.service';

/**
 * Controller for handling document and repository ingestion
 * Provides endpoints for file uploads and Git repository processing
 */
@ApiTags('Ingestions')
@UseInterceptors(CircuitBreakerInterceptor)
@Controller('/ingestions')
export class IngestionController {
  private readonly logger = new Logger(IngestionController.name);

  constructor(private readonly ingestionService: IngestionService) {}

  /**
   * Trigger repository ingestion
   * Clones and analyzes a Git repository
   */
  @Post('repository')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Ingest a Git repository',
    description:
      'Trigger ingestion of a Git repository for code analysis and vectorization. ' +
      'The repository will be cloned, analyzed, and processed asynchronously. ' +
      'Supports public and private repositories (with token). ' +
      'Returns a job ID for tracking the ingestion progress.',
  })
  @ApiBody({
    description: 'Repository ingestion configuration',
    type: RepoIngestionDto,
    examples: {
      publicRepo: {
        summary: 'Public repository',
        value: {
          repoUrl: 'https://github.com/twodHQ/rephole.git',
          ref: 'main',
        },
      },
      privateRepo: {
        summary: 'Private repository with token',
        value: {
          repoUrl: 'https://github.com/myorg/private-repo.git',
          ref: 'develop',
          token: 'ghp_xxxxxxxxxxxxxxxxxxxx',
          userId: 'user-123',
          repoId: 'my-private-repo',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Repository ingestion successfully queued',
    type: RepoIngestionResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid repository URL or configuration',
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid repository URL. Must be a valid HTTPS Git URL.',
        error: 'Bad Request',
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error during repository processing',
  })
  async ingestRepository(
    @Body() dto: RepoIngestionDto,
  ): Promise<RepoIngestionResponseDto> {
    this.logger.log(`Ingesting repository: ${dto.repoUrl}`);
    const result = await this.ingestionService.ingestRepo(dto);
    this.logger.log(`Repository ingestion completed: ${dto.repoUrl}`);
    return result;
  }
}
