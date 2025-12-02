import { InjectRepository } from '@nestjs/typeorm';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { EmbeddingsService } from '@app/ai-core';
import * as fs from 'node:fs';
import { ContentStoreService, VectorStoreService } from '@app/knowledge-base';
import { GitService } from '@app/git';
import { AstSplitterService } from '@app/ingestion/ast-parser';
import { RepoStateEntity } from '../entities';
import { ulid } from 'ulid';
import path from 'node:path';
import { ConfigService } from '@nestjs/config';
import { RepositoryMetadata } from '@app/shared-interfaces';

/**
 * Payload structure for repository ingestion jobs in BullMQ.
 * This interface defines the data sent from the producer (API) to the consumer (worker).
 *
 * @remarks
 * - `repoId` is auto-deduced from the repository URL if not provided by the client
 * - `meta` contains custom key-value pairs that will be attached to all generated chunks
 * - All meta values must be primitives (string, number, boolean) for ChromaDB compatibility
 */
export interface RepoIngestionJobData {
  /** Git repository HTTPS URL */
  repoUrl: string;

  /** Git reference (branch, tag, or commit SHA). Defaults to 'main' */
  ref?: string;

  /** Personal access token for private repositories */
  token?: string;

  /** User ID who triggered the ingestion */
  userId?: string;

  /** Repository identifier (auto-deduced from URL or provided by client) */
  repoId: string;

  /**
   * Custom key-value metadata to attach to all chunks.
   * These fields enable filtered searches by custom attributes.
   * Values must be primitives only (string, number, boolean).
   *
   * @example { team: 'frontend', project: 'rephole', priority: 1 }
   */
  meta?: Record<string, string | number | boolean>;

  /** ISO 8601 timestamp when the job was queued */
  queuedAt?: string;
}

@Processor('repo-ingestion')
export class RepoUpdateProcessor extends WorkerHost {
  private readonly logger = new Logger(RepoUpdateProcessor.name);

  constructor(
    private gitService: GitService,
    @Inject(EmbeddingsService)
    private readonly embeddingsService: EmbeddingsService,
    @Inject(forwardRef(() => VectorStoreService))
    private vectorStore: VectorStoreService,
    @InjectRepository(RepoStateEntity)
    private repoStateRepo: Repository<RepoStateEntity>,
    private configService: ConfigService,
    private astSplitter: AstSplitterService,
    @Inject(forwardRef(() => ContentStoreService))
    private readonly contentStore: ContentStoreService,
  ) {
    super();
  }

  async process(job: Job<RepoIngestionJobData>) {
    const { repoUrl, repoId, meta, userId } = job.data;

    this.logger.debug(
      `Starting repo ingestion job ${job.id} for repo: ${repoUrl}`,
    );
    this.logger.debug(
      `Job data - repoId: ${repoId}, repoUrl: ${repoUrl}, userId: ${userId || 'system'}, meta keys: ${meta ? Object.keys(meta).join(', ') : 'none'}`,
    );

    // Sanitize meta to ensure only primitive values (ChromaDB requirement)
    const sanitizedMeta = this.sanitizeMeta(meta);

    // 1. Fetch State
    this.logger.debug(`Fetching repo state for repoUrl: ${repoUrl}`);
    const state = await this.getRepoState(repoUrl, repoId);

    this.logger.debug(`Getting current commit for repo at ${state.localPath}`);
    const currentCommit = await this.gitService.getCurrentCommit(
      state.localPath,
    );
    this.logger.debug(`Current commit: ${currentCommit}`);

    // 2. Get Incremental Changes
    this.logger.debug(
      `Detecting changes since commit: ${state.lastProcessedCommit || 'initial'}`,
    );
    const changes = await this.gitService.getChangedFiles(
      state.localPath,
      state.lastProcessedCommit || undefined,
    );
    this.logger.debug(
      `Changes detected - Added: ${changes.added.length}, Modified: ${changes.modified.length}, Deleted: ${changes.deleted.length}`,
    );

    if (changes.added.length === 0 && changes.modified.length === 0) {
      this.logger.debug(`No changes to process for repo ${repoUrl}`);
      return 'No changes detected';
    }

    // 3. Handle Deletions (Clean up Vector DB)
    if (changes.deleted.length > 0) {
      this.logger.debug(
        `Deleting ${changes.deleted.length} documents from vector store`,
      );
      await this.vectorStore.deleteDocuments(changes.deleted);
      this.logger.debug(`Deleted files: ${changes.deleted.join(', ')}`);
    }

    // 4. Process Added/Modified Files
    const filesToProcess = [...changes.added, ...changes.modified];
    this.logger.debug(
      `Processing ${filesToProcess.length} files (added + modified)`,
    );

    for (const file of filesToProcess) {
      this.logger.debug(`Processing file: ${file}`);

      // Skip binary and non-text files
      if (this.isBinaryFile(file)) {
        this.logger.debug(`Skipping binary file: ${file}`);
        continue;
      }

      // A. Read File
      const fullPath = `${state.localPath}/${file}`;
      let content: string;

      try {
        content = fs.readFileSync(fullPath, 'utf-8');
      } catch (error) {
        this.logger.warn(
          `Failed to read file ${file} as UTF-8, skipping: ${error.message}`,
        );
        continue;
      }

      this.logger.debug(`Read ${content.length} characters from ${file}`);

      // B. Save Parent (Full Context) to Cheap Storage
      // We use the filePath as the ID, repoId for filtering, and sanitized meta for custom attributes
      await this.contentStore.saveParent(file, content, repoId, sanitizedMeta);
      this.logger.debug(`Saved parent for ${file} (repoId: ${repoId})`);

      // C. Generate Children (Semantic Chunks)
      // AST-based Splitting: Extract semantic code chunks
      this.logger.debug(`Splitting ${file} using AST parser`);
      const allChunks = this.astSplitter.split(file, content);
      this.logger.debug(
        `Extracted ${allChunks.length} semantic chunks from ${file}`,
      );

      // Filter out chunks with empty or whitespace-only content
      const semanticChunks = allChunks.filter(
        (chunk) => chunk.content && chunk.content.trim().length > 0,
      );

      if (semanticChunks.length === 0) {
        this.logger.warn(
          `No valid chunks after filtering empty content for ${file}, skipping`,
        );
        continue;
      }

      if (semanticChunks.length < allChunks.length) {
        this.logger.debug(
          `Filtered out ${allChunks.length - semanticChunks.length} empty chunks from ${file}`,
        );
      }

      const batchTexts = semanticChunks.map((chunk) => chunk.content);
      const vectors = await this.embeddingsService.embedDocuments(batchTexts);

      // D. Map chunks to Vector Records
      const records = semanticChunks.map((chunk, idx) => {
        // chunk.id format: "filePath:name:nodeType:L{line}"
        // e.g., "libs/ui/src/lib/shared/abstract-mat-form-field.ts:controlType:get_accessor:L45"
        const idParts = chunk.id.split(':');
        const functionName = idParts[1] || 'anonymous';
        this.logger.debug(
          `[REPO-PROCESSOR] Mapping chunk ${idx + 1}/${semanticChunks.length}: ID="${chunk.id}" | Type=${chunk.type}`,
        );

        // Build base metadata with repository-specific fields
        const baseMetadata: RepositoryMetadata = {
          // BaseMetadata fields (required for cross-category queries)
          id: chunk.id, // Format: "filePath:name:nodeType:Lline"
          category: 'repository',
          workspaceId: 'workspace', // TODO: Get from job data when multi-workspace support is added
          userId: userId || 'system', // Use userId from job data
          timestamp: new Date().toISOString(), // ISO 8601 format for consistency
          filePath: file, // Relative path in repository
          fileType: path.extname(file), // e.g., ".ts", ".js", ".py"
          chunkIndex: idx, // Sequential index of chunk within file
          chunkType: chunk.type, // AST node type: "method_definition", "class_declaration", etc.
          parentId: file, // Parent is the source file
          // Repository-specific fields
          repositoryId: state.id,
          functionName, // Extracted from chunk ID
          startLine: chunk.startLine, // From AST parser
          endLine: chunk.endLine, // From AST parser
        };

        // Merge sanitized meta with base metadata
        // Meta fields are spread after base to allow overriding (except reserved fields)
        const metadata = {
          ...baseMetadata,
          ...sanitizedMeta,
          // Ensure critical fields cannot be overwritten by meta
          id: baseMetadata.id,
          category: baseMetadata.category,
          repositoryId: baseMetadata.repositoryId,
          repoId, // Add repoId for easy filtering
        };

        return {
          id: chunk.id, // Unique ID: "filePath:name:nodeType:L{line}"
          content: chunk.content, // Full function/class code with comments
          vector: vectors[idx], // Use generated embeddings from EmbeddingsService
          metadata,
        };
      });

      // D. Upsert all semantic chunks to Vector DB
      // Check for duplicate IDs before upserting
      const allIds = records.map((r) => r.id);
      const uniqueIds = new Set(allIds);
      if (allIds.length !== uniqueIds.size) {
        const duplicates = allIds.filter(
          (id, idx) => allIds.indexOf(id) !== idx,
        );
        this.logger.warn(
          `[DUPLICATE-DETECTION] Found ${allIds.length - uniqueIds.size} duplicate IDs in batch for ${file}: ${[...new Set(duplicates)].join(', ')}`,
        );
      }

      this.logger.debug(
        `Upserting ${records.length} semantic chunks from ${file} to vector store (${uniqueIds.size} unique IDs)`,
      );
      await this.vectorStore.upsert(records);
      this.logger.debug(`Successfully processed and stored ${file}`);
    }
    this.logger.debug(
      `Completed processing all ${filesToProcess.length} files`,
    );

    // 5. Documentation Strategy: On-Demand Generation
    // Changed from automatic per-file generation to on-demand for 99% cost savings
    // - Project overview: Generated once via API endpoint (best quality model)
    // - Module docs: Generated weekly or on-demand (balanced model)
    // - File docs: Generated only when requested via API (cheap model)
    // See: .artiforge/documentation-strategy.md for full details
    this.logger.debug(
      'Documentation is now generated on-demand via API endpoints for cost efficiency',
    );
    // TODO: Add API endpoints for on-demand doc generation:
    // - GET /docs/project/:repoId (project overview)
    // - GET /docs/file/:repoId/:filePath (file documentation)
    // - GET /docs/module/:repoId/:modulePath (module summary)

    // 6. Update State
    if (state) {
      this.logger.debug(`Updating repo state with commit: ${currentCommit}`);
      state.lastProcessedCommit = currentCommit;
      await this.repoStateRepo.save(state);
      this.logger.debug(
        `Successfully completed repo ingestion for ${repoUrl} at commit ${currentCommit}`,
      );
    }
  }

  /**
   * Check if a file is binary based on extension
   * Binary files should be skipped as they contain null bytes and non-text content
   */
  private isBinaryFile(filePath: string): boolean {
    const binaryExtensions = [
      // Images
      '.png',
      '.jpg',
      '.jpeg',
      '.gif',
      '.bmp',
      '.ico',
      '.svg',
      '.webp',
      '.tiff',
      // Videos
      '.mp4',
      '.avi',
      '.mov',
      '.wmv',
      '.flv',
      '.mkv',
      // Audio
      '.mp3',
      '.wav',
      '.ogg',
      '.flac',
      '.aac',
      // Archives
      '.zip',
      '.tar',
      '.gz',
      '.rar',
      '.7z',
      '.bz2',
      // Executables & Compiled
      '.exe',
      '.dll',
      '.so',
      '.dylib',
      '.bin',
      '.class',
      '.pyc',
      '.o',
      '.a',
      // Documents
      '.pdf',
      '.doc',
      '.docx',
      '.xls',
      '.xlsx',
      '.ppt',
      '.pptx',
      // Fonts
      '.ttf',
      '.otf',
      '.woff',
      '.woff2',
      '.eot',
      // Database
      '.db',
      '.sqlite',
      '.sqlite3',
      // Other
      '.wasm',
      '.lock',
    ];

    const ext = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
    return binaryExtensions.includes(ext);
  }

  private async getRepoState(
    repoUrl: string,
    repoId?: string,
  ): Promise<RepoStateEntity> {
    let state = await this.repoStateRepo.findOneBy({ repoUrl });

    if (!state) {
      this.logger.debug(
        `No existing state found for repo ${repoUrl}. Initializing new repository...`,
      );
      repoId = ulid();
      const localPath = path.join(
        process.cwd(),
        this.configService.get('LOCAL_STORAGE_PATH') as string,
        repoId,
      );
      this.logger.debug(`Generated repoId: ${repoId}, localPath: ${localPath}`);

      // New repo, clone it
      this.logger.debug(`Cloning repository ${repoUrl} to ${localPath}`);
      await this.gitService.cloneRepo(repoUrl, localPath);

      // Create state
      state = {
        id: repoId,
        repoUrl,
        localPath,
        lastProcessedCommit: null,
        fileSignatures: {},
      };

      await this.repoStateRepo.save(state);

      this.logger.debug(`Created new repo state with id: ${repoId}`);
    } else if (!state.lastProcessedCommit) {
      this.logger.debug(
        `Found existing state - lastProcessedCommit: ${state.lastProcessedCommit}`,
      );
      // Check if repo is already initialized
      const localPath = path.join(
        process.cwd(),
        this.configService.get('LOCAL_STORAGE_PATH') as string,
        state.id,
      );
      const exists = fs.existsSync(localPath);
      if (!exists) {
        this.logger.debug(
          `Repository ${repoUrl} is already initialized. Skipping ingestion...`,
        );
      }
      this.logger.debug(
        `Repository ${repoUrl} is already initialized. Skipping ingestion...`,
      );
    } else {
      this.logger.debug(
        `Found existing state - lastProcessedCommit: ${state.lastProcessedCommit}`,
      );
    }
    return state;
  }

  /**
   * Sanitizes metadata object to ensure all values are ChromaDB-compatible primitives.
   * ChromaDB only accepts string, number, or boolean values in metadata.
   *
   * @param meta - Raw metadata object from job payload
   * @returns Sanitized metadata with only primitive values
   *
   * @remarks
   * - Nested objects and arrays are filtered out with a warning log
   * - null and undefined values are filtered out
   * - Reserved field names are filtered out to prevent conflicts
   */
  private sanitizeMeta(
    meta?: Record<string, unknown>,
  ): Record<string, string | number | boolean> {
    if (!meta || typeof meta !== 'object') {
      return {};
    }

    // Reserved field names that cannot be overwritten by user meta
    const reservedFields = new Set([
      'id',
      'category',
      'repositoryId',
      'repoId',
      'workspaceId',
      'userId',
      'timestamp',
      'filePath',
      'fileType',
      'chunkIndex',
      'chunkType',
      'parentId',
      'functionName',
      'startLine',
      'endLine',
    ]);

    const sanitized: Record<string, string | number | boolean> = {};
    const skippedKeys: string[] = [];

    for (const [key, value] of Object.entries(meta)) {
      // Skip reserved fields
      if (reservedFields.has(key)) {
        this.logger.warn(
          `[META-SANITIZE] Skipping reserved field "${key}" in meta - this field is managed by the system`,
        );
        continue;
      }

      // Only allow primitive values
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        sanitized[key] = value;
      } else {
        skippedKeys.push(key);
      }
    }

    if (skippedKeys.length > 0) {
      this.logger.warn(
        `[META-SANITIZE] Skipped ${skippedKeys.length} non-primitive meta values: ${skippedKeys.join(', ')}. ` +
          'Only string, number, and boolean values are allowed for ChromaDB compatibility.',
      );
    }

    if (Object.keys(sanitized).length > 0) {
      this.logger.debug(
        `[META-SANITIZE] Applied ${Object.keys(sanitized).length} meta fields: ${Object.keys(sanitized).join(', ')}`,
      );
    }

    return sanitized;
  }
}
