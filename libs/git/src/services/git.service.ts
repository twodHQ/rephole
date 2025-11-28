import { Injectable, Logger } from '@nestjs/common';
import { simpleGit, SimpleGit } from 'simple-git';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface GitChangedFiles {
  added: string[];
  modified: string[];
  deleted: string[];
  renamed: string[];
}

@Injectable()
export class GitService {
  private readonly logger = new Logger(GitService.name);

  /**
   * Returns list of changed files between last commit and HEAD
   * @param repoPath - Absolute path to the git repository
   * @param lastCommit - Previous commit hash to compare against (optional)
   * @returns Object containing arrays of added, modified, deleted, and renamed files
   * @throws Error if repository is invalid or git operation fails
   */
  async getChangedFiles(
    repoPath: string,
    lastCommit?: string,
  ): Promise<GitChangedFiles> {
    this.logger.debug(
      `Getting changed files for repo: ${repoPath}, lastCommit: ${lastCommit || 'none'}`,
    );
    try {
      this.validateRepoPath(repoPath);
      const git: SimpleGit = simpleGit(repoPath);

      // Verify it's a valid git repository
      this.logger.debug(`Checking if ${repoPath} is a valid git repository`);
      const isRepo = await git.checkIsRepo();
      if (!isRepo) {
        throw new Error(`Path is not a git repository: ${repoPath}`);
      }

      // If no last commit (first run), return all tracked files as added
      if (!lastCommit) {
        this.logger.log(
          `No previous commit provided, listing all tracked files in ${repoPath}`,
        );
        const files = await git.raw(['ls-files']);
        const trackedFiles = files.split('\n').filter(Boolean);
        this.logger.log(`Found ${trackedFiles.length} tracked files`);

        return {
          added: trackedFiles,
          modified: [],
          deleted: [],
          renamed: [],
        };
      }

      // Validate commit hash exists
      this.logger.debug(`Validating commit hash: ${lastCommit}`);
      await this.validateCommit(git, lastCommit);

      // Get diff with name-status to get file changes
      this.logger.log(`Getting diff between ${lastCommit} and HEAD`);
      const diffOutput = await git.diff(['--name-status', lastCommit, 'HEAD']);
      this.logger.debug(
        `Diff output length: ${diffOutput?.length || 0} characters`,
      );

      if (!diffOutput || diffOutput.trim().length === 0) {
        this.logger.log('No changes detected');
        return {
          added: [],
          modified: [],
          deleted: [],
          renamed: [],
        };
      }

      // Parse the diff output
      const lines = diffOutput.trim().split('\n');
      this.logger.debug(`Parsing ${lines.length} diff lines`);
      const result: GitChangedFiles = {
        added: [],
        modified: [],
        deleted: [],
        renamed: [],
      };

      for (const line of lines) {
        const parts = line.split('\t');
        if (parts.length < 2) continue;

        const status = parts[0];
        const file = parts[1];

        if (status.startsWith('A')) {
          result.added.push(file);
        } else if (status.startsWith('M')) {
          result.modified.push(file);
        } else if (status.startsWith('D')) {
          result.deleted.push(file);
        } else if (status.startsWith('R')) {
          // For renamed files, use the new name (parts[2])
          result.renamed.push(parts[2] || file);
        }
      }

      this.logger.log(
        `Changes: ${result.added.length} added, ${result.modified.length} modified, ` +
          `${result.deleted.length} deleted, ${result.renamed.length} renamed`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to get changed files for ${repoPath}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Clones a git repository to a local path
   * @param repoUrl - URL of the git repository to clone
   * @param localPath - Absolute path where the repository should be cloned
   * @throws Error if clone operation fails or path is invalid
   */
  async cloneRepo(repoUrl: string, localPath: string): Promise<void> {
    this.logger.log(`Clone requested - URL: ${repoUrl}, Path: ${localPath}`);
    try {
      if (!repoUrl || typeof repoUrl !== 'string') {
        throw new Error('Repository URL must be a non-empty string');
      }

      if (!localPath || typeof localPath !== 'string') {
        throw new Error('Local path must be a non-empty string');
      }

      if (!path.isAbsolute(localPath)) {
        throw new Error(`Local path must be absolute: ${localPath}`);
      }

      this.logger.debug('Repository URL and path validation passed');

      // Check if path already exists
      this.logger.debug(`Checking if path exists: ${localPath}`);
      if (fs.existsSync(localPath)) {
        this.logger.debug(`Path exists, checking if it's a directory`);
        const stats = fs.statSync(localPath);
        if (stats.isDirectory()) {
          const files = fs.readdirSync(localPath);
          this.logger.debug(`Directory contains ${files.length} files`);
          if (files.length > 0) {
            throw new Error(
              `Local path already exists and is not empty: ${localPath}`,
            );
          }
          this.logger.debug('Directory is empty, proceeding with clone');
        } else {
          throw new Error(
            `Local path exists but is not a directory: ${localPath}`,
          );
        }
      } else {
        // Create parent directories if they don't exist
        this.logger.debug(`Creating directory: ${localPath}`);
        fs.mkdirSync(localPath, { recursive: true });
        this.logger.debug('Directory created successfully');
      }

      this.logger.log(`Starting git clone operation...`);
      const git = simpleGit();
      await git.clone(repoUrl, localPath);
      this.logger.log(`Successfully cloned repository to ${localPath}`);
      this.logger.debug('Verifying cloned repository...');
      const clonedGit = simpleGit(localPath);
      const isRepo = await clonedGit.checkIsRepo();
      this.logger.debug(
        `Clone verification: ${isRepo ? 'valid repository' : 'invalid repository'}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to clone repository ${repoUrl} to ${localPath}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Gets the current HEAD commit hash
   * @param repoPath - Absolute path to the git repository
   * @returns The current commit SHA
   * @throws Error if repository is invalid or git operation fails
   */
  async getCurrentCommit(repoPath: string): Promise<string> {
    this.logger.debug(`Getting current commit for repo: ${repoPath}`);
    try {
      this.validateRepoPath(repoPath);
      const git = simpleGit(repoPath);

      this.logger.debug('Verifying repository validity');
      const isRepo = await git.checkIsRepo();
      if (!isRepo) {
        throw new Error(`Path is not a git repository: ${repoPath}`);
      }

      this.logger.debug('Executing git rev-parse HEAD');
      const commit = await git.revparse(['HEAD']);
      this.logger.log(`Current commit for ${repoPath}: ${commit}`);
      return commit.trim();
    } catch (error) {
      this.logger.error(
        `Failed to get current commit for ${repoPath}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Validates that the repository path exists and is accessible
   * @param repoPath - Path to validate
   * @throws Error if path doesn't exist or is not accessible
   */
  private validateRepoPath(repoPath: string): void {
    this.logger.debug(`Validating repository path: ${repoPath}`);
    if (!repoPath || typeof repoPath !== 'string') {
      throw new Error('Repository path must be a non-empty string');
    }

    if (!path.isAbsolute(repoPath)) {
      throw new Error(`Repository path must be absolute: ${repoPath}`);
    }

    if (!fs.existsSync(repoPath)) {
      throw new Error(`Repository path does not exist: ${repoPath}`);
    }

    const stats = fs.statSync(repoPath);
    if (!stats.isDirectory()) {
      throw new Error(`Repository path is not a directory: ${repoPath}`);
    }
    this.logger.debug('Repository path validation passed');
  }

  /**
   * Validates that a commit hash exists in the repository
   * @param git - SimpleGit instance
   * @param commitHash - Commit hash to validate
   * @throws Error if commit doesn't exist
   */
  private async validateCommit(
    git: SimpleGit,
    commitHash: string,
  ): Promise<void> {
    this.logger.debug(`Validating commit hash: ${commitHash}`);
    try {
      await git.revparse([commitHash]);
      this.logger.debug(`Commit ${commitHash} is valid`);
    } catch (error) {
      this.logger.error(`Invalid commit hash: ${commitHash}`);
      throw new Error(`Invalid commit hash: ${commitHash}`);
    }
  }
}
