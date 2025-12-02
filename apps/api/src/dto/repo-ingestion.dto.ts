import { ApiProperty } from '@nestjs/swagger';
import {
  IsUrl,
  IsOptional,
  IsString,
  IsNotEmpty,
  Matches,
  MaxLength,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';

/**
 * Custom validator to ensure an object contains only flat primitive values.
 * ChromaDB metadata requires string, number, or boolean values only.
 * Nested objects and arrays are not allowed.
 *
 * @param validationOptions - Optional validation options
 * @returns PropertyDecorator
 */
function IsFlatObject(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isFlatObject',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (value === undefined || value === null) {
            return true; // Optional field, let @IsOptional handle it
          }

          if (typeof value !== 'object' || Array.isArray(value)) {
            return false;
          }

          // Check that all values are primitives (string, number, boolean)
          return Object.values(value).every(
            (v) =>
              typeof v === 'string' ||
              typeof v === 'number' ||
              typeof v === 'boolean',
          );
        },
        defaultMessage(): string {
          return 'Meta must be a flat object with only string, number, or boolean values. Nested objects and arrays are not allowed.';
        },
      },
    });
  };
}

/**
 * DTO for repository ingestion requests
 * Supports Git repositories via HTTPS URLs
 */
export class RepoIngestionDto {
  @ApiProperty({
    description: 'Git repository HTTPS URL',
    example: 'https://github.com/twodHQ/rephole.git',
    required: true,
  })
  @IsUrl({
    protocols: ['https', 'http'],
    require_protocol: true,
  })
  @IsNotEmpty()
  repoUrl: string;

  @ApiProperty({
    description: 'Git reference (branch, tag, or commit SHA)',
    example: 'main',
    default: 'main',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  ref?: string;

  @ApiProperty({
    description: 'Personal access token for private repositories',
    example: 'ghp_xxxxxxxxxxxxxxxxxxxx',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  token?: string;

  @ApiProperty({
    description: 'User ID who triggered the ingestion',
    example: 'user-123',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  userId?: string;

  @ApiProperty({
    description: 'Custom identifier for tracking this repository',
    example: 'my-project-repo',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Matches(/^[a-zA-Z0-9-_]+$/, {
    message:
      'Repository ID must contain only alphanumeric characters, hyphens, and underscores',
  })
  repoId?: string;

  @ApiProperty({
    description:
      'Optional key-value metadata for the repository. ' +
      'These metadata fields will be attached to all chunks generated during ingestion, ' +
      'enabling filtered searches by custom attributes (e.g., team, project, environment).',
    required: false,
    example: {
      team: 'frontend',
      project: 'rephole',
      environment: 'production',
    },
  })
  @IsOptional()
  @IsFlatObject({
    message:
      'Meta must be a flat object with only string, number, or boolean values',
  })
  meta?: Record<string, string | number | boolean>;
}

/**
 * Response DTO for repository ingestion
 */
export class RepoIngestionResponseDto {
  @ApiProperty({
    description: 'Status of the ingestion job',
    example: 'queued',
    enum: ['queued', 'processing', 'completed', 'failed'],
  })
  status: string;

  @ApiProperty({
    description: 'Unique job identifier for tracking',
    example: '01HQZX3Y4Z5A6B7C8D9E0F1G2H',
  })
  jobId: string;

  @ApiProperty({
    description: 'Repository URL being processed',
    example: 'https://github.com/twodHQ/rephole.git',
  })
  repoUrl: string;

  @ApiProperty({
    description: 'Git reference being processed',
    example: 'main',
    required: false,
  })
  ref?: string;

  @ApiProperty({
    description:
      'Repository identifier used for filtering. ' +
      'Auto-deduced from URL if not provided in the request.',
    example: 'rephole',
    required: false,
  })
  repoId?: string;
}
