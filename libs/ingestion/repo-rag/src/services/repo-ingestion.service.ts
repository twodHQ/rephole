import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

/**
 * Service for ingesting Git repositories into the document processing pipeline.
 * Supports repository cloning, incremental updates, and code analysis.
 */
@Injectable()
export class RepoIngestionService {
  private readonly logger = new Logger(RepoIngestionService.name);

  constructor(
    @InjectQueue('repo-ingestion') private readonly repoQueue: Queue,
  ) {}

  /**
   * Ingest a Git repository for processing
   *
   * @param params - Repository ingestion parameters
   * @param params.repoUrl - Git repository HTTPS URL
   * @param params.ref - Branch, tag, or commit SHA (defaults to 'main')
   * @param params.token - Personal access token for private repositories
   * @param params.userId - User ID who triggered the ingestion
   * @param params.repoId - Custom identifier for tracking
   * @returns Job status and ID
   * @throws {BadRequestException} When repository URL is invalid or queue operation fails
   */
  async ingestRepo(params: {
    repoUrl: string;
    ref?: string;
    token?: string;
    userId?: string;
    repoId?: string;
  }): Promise<{
    status: string;
    jobId: string;
    repoUrl: string;
    ref?: string;
  }> {
    const { repoUrl, ref = 'main', token, userId, repoId } = params;

    // Validate repository URL format
    if (!this.isValidGitUrl(repoUrl)) {
      this.logger.error(`Invalid repository URL: ${repoUrl}`);
      throw new BadRequestException(
        'Invalid repository URL. Must be a valid HTTPS Git URL.',
      );
    }

    this.logger.log(
      `Queueing repository for ingestion: ${repoUrl} (ref: ${ref})`,
    );

    try {
      // Add to Queue with repository metadata
      const job = await this.repoQueue.add(
        'process-repo',
        {
          repoUrl,
          ref,
          token,
          userId,
          repoId,
          queuedAt: new Date().toISOString(),
        },
        {
          attempts: 3, // Retry 3 times if it fails
          backoff: {
            type: 'exponential',
            delay: 5000, // Start with 5 second delay
          },
          removeOnComplete: {
            age: 3600, // Keep completed jobs for 1 hour
            count: 100, // Keep last 100 completed jobs
          },
          removeOnFail: {
            age: 86400, // Keep failed jobs for 24 hours
          },
        },
      );

      this.logger.log(
        `Repository queued successfully: ${repoUrl} (Job ID: ${job.id})`,
      );

      return {
        status: 'queued',
        jobId: job.id as string,
        repoUrl,
        ref,
      };
    } catch (error) {
      this.logger.error(
        `Failed to queue repository ingestion: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to queue repository ingestion: ${error.message}`,
      );
    }
  }

  /**
   * Get the status of a repository ingestion job
   */
  async getJobStatus(jobId: string): Promise<{
    id: string;
    state: string;
    progress: number;
    data?: any;
  }> {
    const job = await this.repoQueue.getJob(jobId);

    if (!job) {
      throw new BadRequestException(`Job ${jobId} not found`);
    }

    const state = await job.getState();
    let progress = 0;
    if (!job.progress) {
      progress = state === 'completed' ? 100 : 0;
    }

    return {
      id: job.id as string,
      state,
      progress,
      data: job.data,
    };
  }

  /**
   * Get all failed jobs from the repository ingestion queue
   */
  async getFailedJobs(): Promise<
    Array<{
      id: string;
      data: any;
      failedReason: string;
      attemptsMade: number;
      timestamp: number;
    }>
  > {
    const failedJobs = await this.repoQueue.getFailed();

    return failedJobs.map((job) => ({
      id: job.id as string,
      data: job.data,
      failedReason: job.failedReason || 'Unknown error',
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
    }));
  }

  /**
   * Retry a specific failed job by ID
   */
  async retryFailedJob(jobId: string): Promise<{
    status: string;
    jobId: string;
    message: string;
  }> {
    const job = await this.repoQueue.getJob(jobId);

    if (!job) {
      throw new BadRequestException(`Job ${jobId} not found`);
    }

    const state = await job.getState();
    if (state !== 'failed') {
      throw new BadRequestException(
        `Job ${jobId} is not in failed state. Current state: ${state}`,
      );
    }

    await job.retry();

    this.logger.log(`Retrying failed job: ${jobId}`);

    return {
      status: 'retrying',
      jobId: job.id as string,
      message: `Job ${jobId} has been queued for retry`,
    };
  }

  /**
   * Retry all failed jobs in the repository ingestion queue
   */
  async retryAllFailedJobs(): Promise<{
    status: string;
    retriedCount: number;
    message: string;
  }> {
    const failedJobs = await this.repoQueue.getFailed();

    let retriedCount = 0;
    for (const job of failedJobs) {
      try {
        await job.retry();
        retriedCount++;
      } catch (error) {
        this.logger.error(
          `Failed to retry job ${job.id}: ${error.message}`,
          error.stack,
        );
      }
    }

    this.logger.log(`Retried ${retriedCount} failed jobs`);

    return {
      status: 'completed',
      retriedCount,
      message: `Successfully queued ${retriedCount} failed jobs for retry`,
    };
  }

  /**
   * Get detailed information about a failed job
   */
  async getFailedJobDetails(jobId: string): Promise<{
    id: string;
    data: any;
    failedReason: string;
    stacktrace: string[];
    attemptsMade: number;
    timestamp: number;
    processedOn?: number;
    finishedOn?: number;
  }> {
    const job = await this.repoQueue.getJob(jobId);

    if (!job) {
      throw new BadRequestException(`Job ${jobId} not found`);
    }

    const state = await job.getState();
    if (state !== 'failed') {
      throw new BadRequestException(
        `Job ${jobId} is not in failed state. Current state: ${state}`,
      );
    }

    return {
      id: job.id as string,
      data: job.data,
      failedReason: job.failedReason || 'Unknown error',
      stacktrace: job.stacktrace || [],
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    };
  }

  /**
   * Validate if the URL is a valid Git repository URL
   */
  private isValidGitUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      // Check if it's HTTP/HTTPS and ends with .git or is a GitHub/GitLab/Bitbucket URL
      return (
        (parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:') &&
        (url.endsWith('.git') ||
          parsedUrl.hostname.includes('github.com') ||
          parsedUrl.hostname.includes('gitlab.com') ||
          parsedUrl.hostname.includes('bitbucket.org'))
      );
    } catch {
      return false;
    }
  }
}
