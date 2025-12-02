import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Custom validator to ensure filter object contains only flat primitive values.
 * ChromaDB metadata filters require string, number, or boolean values only.
 */
function IsFlatFilterObject(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isFlatFilterObject',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (value === undefined || value === null) {
            return true;
          }

          if (typeof value !== 'object' || Array.isArray(value)) {
            return false;
          }

          return Object.values(value).every(
            (v) =>
              typeof v === 'string' ||
              typeof v === 'number' ||
              typeof v === 'boolean',
          );
        },
        defaultMessage(): string {
          return 'Filter must be a flat object with only string, number, or boolean values.';
        },
      },
    });
  };
}

/**
 * Request DTO for semantic search queries.
 * Supports text-based search with optional metadata filtering.
 */
export class QuerySearchRequest {
  @ApiProperty({
    description: 'Search query text for semantic similarity matching',
    example: 'How does the authentication service work?',
    required: true,
  })
  @IsString()
  prompt: string;

  @ApiProperty({
    description: 'Maximum number of results to return',
    example: 10,
    default: 5,
    required: false,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  k?: number;

  @ApiProperty({
    description:
      'Optional metadata filters to narrow search results further. ' +
      'Filter by custom metadata fields that were set during ingestion. ' +
      'All filter conditions are combined with AND logic. ' +
      'Note: repoId is specified in the URL path, not here.',
    required: false,
    example: {
      team: 'backend',
      environment: 'production',
    },
  })
  @IsOptional()
  @IsFlatFilterObject({
    message: 'Filter values must be string, number, or boolean only',
  })
  meta?: Record<string, string | number | boolean>;
}

/**
 * Represents a single search result chunk with its metadata.
 */
export class SearchResultChunk {
  @ApiProperty({
    description: 'Unique identifier of the chunk (typically the file path)',
    example: 'src/auth/auth.service.ts',
  })
  id: string;

  @ApiProperty({
    description: 'Full content of the matched document',
    example: 'export class AuthService {\n  constructor() {}\n  // ...\n}',
  })
  content: string;

  @ApiProperty({
    description: 'Repository identifier this chunk belongs to',
    example: 'my-backend-api',
    required: false,
    nullable: true,
  })
  repoId?: string | null;

  @ApiProperty({
    description: 'Additional metadata associated with the chunk',
    example: { team: 'backend', category: 'repository' },
    required: false,
    nullable: true,
  })
  metadata?: Record<string, unknown> | null;
}

/**
 * Response DTO for search results.
 */
export class QuerySearchResponse {
  @ApiProperty({
    description: 'Array of matching document chunks with metadata',
    type: [SearchResultChunk],
  })
  results: SearchResultChunk[];
}
