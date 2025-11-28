import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { RepoIngestionService } from '@app/ingestion/repo-rag-producer';

@Injectable()
export class JobService {
  private readonly logger = new Logger(JobService.name);

  constructor(private readonly repoIngestionService: RepoIngestionService) {}

  async getJobStatus(jobId: string) {
    this.logger.log(`Fetching status for job: ${jobId}`);

    try {
      // Try to get status from repo ingestion service
      // In a real implementation, you'd need to determine which service to query
      return this.repoIngestionService.getJobStatus(jobId);
    } catch (error) {
      this.logger.error(`Failed to get job status: ${error.message}`);
      throw error;
    }
  }

  async getFailedRepositoriesJobs() {
    this.logger.log('Fetching failed repository ingestion jobs');

    try {
      const jobs = await this.repoIngestionService.getFailedJobs();

      return {
        queueType: 'repository',
        totalFailed: jobs.length,
        jobs,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get failed repository jobs: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getFailedRepositoryJobDetails(jobId: string) {
    this.logger.log(`Fetching details for failed repository job: ${jobId}`);

    try {
      return await this.repoIngestionService.getFailedJobDetails(jobId);
    } catch (error) {
      this.logger.error(
        `Failed to get repository job details: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(error.message);
    }
  }

  async retryRepositoryJob(jobId: string) {
    this.logger.log(`Retrying failed repository job: ${jobId}`);

    try {
      return await this.repoIngestionService.retryFailedJob(jobId);
    } catch (error) {
      this.logger.error(
        `Failed to retry repository job: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(error.message);
    }
  }

  async retryAllFailedRepositoriesJobs() {
    this.logger.log('Retrying all failed repository jobs');

    try {
      return await this.repoIngestionService.retryAllFailedJobs();
    } catch (error) {
      this.logger.error(
        `Failed to retry all repository jobs: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
