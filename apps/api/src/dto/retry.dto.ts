import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO for failed job information
 */
export class FailedJobDto {
  @ApiProperty({
    description: 'Job ID',
    example: '01HQZX3Y4Z5A6B7C8D9E0F1G2H',
  })
  id: string;

  @ApiProperty({
    description: 'Job data/payload',
    example: { repoUrl: 'https://github.com/org/repo.git', ref: 'main' },
  })
  data: any;

  @ApiProperty({
    description: 'Reason for job failure',
    example: 'Failed to clone repository: Authentication failed',
  })
  failedReason: string;

  @ApiProperty({
    description: 'Number of retry attempts made',
    example: 3,
  })
  attemptsMade: number;

  @ApiProperty({
    description: 'Job creation timestamp',
    example: 1640995200000,
  })
  timestamp: number;
}

/**
 * Response DTO for detailed failed job information
 */
export class FailedJobDetailsDto extends FailedJobDto {
  @ApiProperty({
    description: 'Stack trace of the error',
    example: [
      'Error: Failed to clone repository',
      '    at GitService.cloneRepo (/app/libs/git/src/git.service.ts:45:13)',
    ],
  })
  stacktrace: string[];

  @ApiProperty({
    description: 'Timestamp when job processing started',
    example: 1640995210000,
    required: false,
  })
  processedOn?: number;

  @ApiProperty({
    description: 'Timestamp when job finished',
    example: 1640995220000,
    required: false,
  })
  finishedOn?: number;
}

/**
 * Response DTO for job retry operation
 */
export class RetryJobResponseDto {
  @ApiProperty({
    description: 'Retry status',
    example: 'retrying',
  })
  status: string;

  @ApiProperty({
    description: 'Job ID that was retried',
    example: '01HQZX3Y4Z5A6B7C8D9E0F1G2H',
  })
  jobId: string;

  @ApiProperty({
    description: 'Status message',
    example: 'Job 01HQZX3Y4Z5A6B7C8D9E0F1G2H has been queued for retry',
  })
  message: string;
}

/**
 * Response DTO for bulk retry operation
 */
export class RetryAllJobsResponseDto {
  @ApiProperty({
    description: 'Bulk retry status',
    example: 'completed',
  })
  status: string;

  @ApiProperty({
    description: 'Number of jobs that were retried',
    example: 5,
  })
  retriedCount: number;

  @ApiProperty({
    description: 'Status message',
    example: 'Successfully queued 5 failed jobs for retry',
  })
  message: string;
}

/**
 * Response DTO for failed jobs list
 */
export class FailedJobsResponseDto {
  @ApiProperty({
    description: 'Queue type',
    example: 'repository',
    enum: ['file', 'repository'],
  })
  queueType: string;

  @ApiProperty({
    description: 'Total number of failed jobs',
    example: 3,
  })
  totalFailed: number;

  @ApiProperty({
    description: 'List of failed jobs',
    type: [FailedJobDto],
  })
  jobs: FailedJobDto[];
}
