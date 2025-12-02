import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  FailedJobDetailsDto,
  FailedJobsResponseDto,
  RetryAllJobsResponseDto,
  RetryJobResponseDto,
} from '../dto';
import { JobService } from './job.service';

@ApiTags('Jobs')
@Controller('jobs')
export class JobController {
  constructor(private readonly jobService: JobService) {}

  /**
   * Get the status of an ingestion job
   */
  @Get('job/:jobId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get ingestion job status',
    description:
      'Retrieve the current status and progress of a file or repository ingestion job. ' +
      'Use the job ID returned from the ingestion endpoints.',
  })
  @ApiParam({
    name: 'jobId',
    description: 'Unique job identifier',
    example: '01HQZX3Y4Z5A6B7C8D9E0F1G2H',
  })
  @ApiOkResponse({
    description: 'Job status retrieved successfully',
    schema: {
      example: {
        id: '01HQZX3Y4Z5A6B7C8D9E0F1G2H',
        state: 'completed',
        progress: 100,
        data: {
          repoUrl: 'https://github.com/twodHQ/rephole.git',
          ref: 'main',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Job not found',
    schema: {
      example: {
        statusCode: 400,
        message: 'Job 01HQZX3Y4Z5A6B7C8D9E0F1G2H not found',
        error: 'Bad Request',
      },
    },
  })
  async getJobStatus(@Param('jobId') jobId: string) {
    return this.jobService.getJobStatus(jobId);
  }

  /**
   * Get all failed repository ingestion jobs
   */
  @Get('failed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get failed repository ingestion jobs',
    description:
      'Retrieve a list of all failed repository ingestion jobs with error details.',
  })
  @ApiOkResponse({
    description: 'List of failed repository ingestion jobs',
    type: FailedJobsResponseDto,
  })
  async getFailedRepositoriesJobs(): Promise<FailedJobsResponseDto> {
    return this.jobService.getFailedRepositoriesJobs();
  }

  /**
   * Get detailed information about a failed repository ingestion job
   */
  @Get('failed/:jobId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get failed repository job details',
    description:
      'Retrieve detailed information about a specific failed repository ingestion job, including error stack trace.',
  })
  @ApiParam({
    type: Number,
    name: 'jobId',
    description: 'Unique job identifier',
    example: '1',
  })
  @ApiOkResponse({
    description: 'Failed job details',
    type: FailedJobDetailsDto,
  })
  @ApiBadRequestResponse({
    description: 'Job not found or not in failed state',
  })
  async getFailedRepositoryJobDetails(
    @Param('jobId') jobId: string,
  ): Promise<FailedJobDetailsDto> {
    return this.jobService.getFailedRepositoryJobDetails(jobId);
  }

  /**
   * Retry a specific failed repository ingestion job
   */
  @Post('retry/:jobId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Retry a failed repository ingestion job',
    description:
      'Manually retry a specific failed repository ingestion job. The job will be re-queued for processing.',
  })
  @ApiParam({
    name: 'jobId',
    description: 'Unique job identifier',
    example: '01HQZX3Y4Z5A6B7C8D9E0F1G2H',
  })
  @ApiOkResponse({
    description: 'Job successfully queued for retry',
    type: RetryJobResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Job not found or not in failed state',
  })
  async retryRepositoryJob(
    @Param('jobId') jobId: string,
  ): Promise<RetryJobResponseDto> {
    return this.jobService.retryRepositoryJob(jobId);
  }

  /**
   * Retry all failed repository ingestion jobs
   */
  @Post('retry/all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Retry all failed repository ingestion jobs',
    description:
      'Manually retry all failed repository ingestion jobs. All failed jobs will be re-queued for processing.',
  })
  @ApiOkResponse({
    description: 'All failed jobs successfully queued for retry',
    type: RetryAllJobsResponseDto,
  })
  async retryAllRepositoryJobs(): Promise<RetryAllJobsResponseDto> {
    return this.jobService.retryAllFailedRepositoriesJobs();
  }
}
