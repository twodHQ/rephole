import { ApiProperty } from '@nestjs/swagger';
import {
  IsUrl,
  IsOptional,
  IsString,
  IsNotEmpty,
  Matches,
  MaxLength,
} from 'class-validator';

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
}
