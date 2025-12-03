import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { QuerySearchRequest, QuerySearchResponse } from '../dto';
import { QueryService } from './query.service';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

/**
 * Controller for semantic search queries.
 * Supports text-based search within a specific repository with optional metadata filtering.
 */
@Controller('queries')
@ApiTags('Queries')
export class QueryController {
  constructor(private readonly queryService: QueryService) {}

  /**
   * Search for documents using semantic similarity within a specific repository.
   * Optionally filter results by custom metadata.
   */
  @Post('search/:repoId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Semantic search within a repository',
    description:
      'Search for relevant documents using semantic similarity matching within a specific repository. ' +
      'The repoId path parameter is required and specifies which repository to search. ' +
      'The query text is converted to an embedding vector and compared against stored document chunks. ' +
      'Optionally filter results further by custom metadata fields that were set during ingestion. ' +
      'All filter conditions are combined with AND logic.',
  })
  @ApiParam({
    name: 'repoId',
    description:
      'Repository identifier to search within. ' +
      'This is auto-deduced from the repository URL during ingestion or provided explicitly.',
    example: 'my-backend-api',
    required: true,
  })
  @ApiBody({
    type: QuerySearchRequest,
    required: true,
    description: 'Search query with optional metadata filters',
    examples: {
      simpleSearch: {
        summary: 'Simple search',
        description: 'Basic semantic search within a repository',
        value: {
          prompt: 'How does the authentication service work?',
          k: 10,
        },
      },
      searchWithFilters: {
        summary: 'Search with additional filters',
        description: 'Combine repoId with custom metadata filters (AND logic)',
        value: {
          prompt: 'Database connection pooling configuration',
          k: 15,
          meta: {
            team: 'backend',
            category: 'repository',
          },
        },
      },
    },
  })
  @ApiOkResponse({
    type: QuerySearchResponse,
    description:
      'Array of matching document chunks sorted by relevance. ' +
      'Each chunk includes id (file path), content, repoId, and metadata.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid search parameters',
    schema: {
      example: {
        statusCode: 400,
        message:
          'Failed to generate embeddings for the query. Please try again.',
        error: 'Bad Request',
      },
    },
  })
  async search(
    @Param('repoId') repoId: string,
    @Body() params: QuerySearchRequest,
  ): Promise<QuerySearchResponse> {
    return this.queryService.search(repoId, params);
  }

  /**
   * Search for raw chunks using semantic similarity within a specific repository.
   * Returns chunk content directly instead of parent documents (full files).
   */
  @Post('search/:repoId/chunk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Semantic chunk search within a repository',
    description:
      'Search for relevant code chunks using semantic similarity matching within a specific repository. ' +
      'Unlike the standard search endpoint, this returns raw chunk content directly instead of parent documents (full files). ' +
      'Useful when you need precise code snippets rather than full file context. ' +
      'The repoId path parameter is required and specifies which repository to search. ' +
      'Optionally filter results further by custom metadata fields that were set during ingestion. ' +
      'All filter conditions are combined with AND logic.',
  })
  @ApiParam({
    name: 'repoId',
    description:
      'Repository identifier to search within. ' +
      'This is auto-deduced from the repository URL during ingestion or provided explicitly.',
    example: 'my-backend-api',
    required: true,
  })
  @ApiBody({
    type: QuerySearchRequest,
    required: true,
    description: 'Search query with optional metadata filters',
    examples: {
      simpleChunkSearch: {
        summary: 'Simple chunk search',
        description: 'Basic semantic search returning raw chunks',
        value: {
          prompt: 'How does the authentication service work?',
          k: 10,
        },
      },
      chunkSearchWithFilters: {
        summary: 'Chunk search with additional filters',
        description: 'Combine repoId with custom metadata filters (AND logic)',
        value: {
          prompt: 'Database connection pooling configuration',
          k: 15,
          meta: {
            team: 'backend',
            category: 'repository',
          },
        },
      },
    },
  })
  @ApiOkResponse({
    type: QuerySearchResponse,
    description:
      'Array of matching raw chunks sorted by relevance. ' +
      'Each chunk includes id (chunk identifier), content (raw chunk text), repoId, and metadata. ' +
      'Unlike the standard search, content contains the chunk itself, not the parent document.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid search parameters',
    schema: {
      example: {
        statusCode: 400,
        message:
          'Failed to generate embeddings for the query. Please try again.',
        error: 'Bad Request',
      },
    },
  })
  async searchChunks(
    @Param('repoId') repoId: string,
    @Body() params: QuerySearchRequest,
  ): Promise<QuerySearchResponse> {
    return await this.queryService.searchChunks(repoId, params);
  }
}
