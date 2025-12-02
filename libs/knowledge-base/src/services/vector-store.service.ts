import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ChromaClient,
  Collection,
  Metadata,
  QueryResult,
  Where,
} from 'chromadb';
import { CHROMA_CLIENT } from '@app/core';
import type {
  ChromaMetadata,
  EmbeddingVector,
  VectorMetadata,
  VectorRecord,
} from '@app/shared-interfaces';

@Injectable()
export class VectorStoreService {
  private readonly logger = new Logger(VectorStoreService.name);
  private collection: Collection | null = null;
  private readonly collectionName: string;
  private readonly batchSize: number;

  constructor(
    @Inject(CHROMA_CLIENT)
    private readonly client: ChromaClient,
    private readonly configService: ConfigService,
  ) {
    this.collectionName = this.configService.get<string>(
      'CHROMA_COLLECTION_NAME',
      'rephole-collection',
    );
    // Parse to integer since env vars are strings
    this.batchSize = parseInt(
      this.configService.get<string>('VECTOR_STORE_BATCH_SIZE', '1000'),
      10,
    );

    this.logger.log(
      `VectorStoreService initialized - ` +
        `Collection: ${this.collectionName}, ` +
        `Batch size: ${this.batchSize}`,
    );
  }

  async getDocument(id: string): Promise<{
    id: string;
    text: string;
    metadata: ChromaMetadata;
  } | null> {
    const collection = await this.ensureCollection();
    const result = await collection.get({
      ids: [id],
      include: ['metadatas', 'documents'],
    });

    if (!result.ids || result.ids.length === 0) {
      return null;
    }

    return {
      id: result.ids[0],
      text: (result.documents?.[0] as string) || '',
      metadata: (result.metadatas?.[0] as ChromaMetadata) || {},
    };
  }

  async getDocuments(ids: string[]): Promise<
    Array<{
      id: string;
      text: string;
      metadata: ChromaMetadata;
    }>
  > {
    const collection = await this.ensureCollection();
    const result = await collection.get({
      ids,
      include: ['metadatas', 'documents'],
    });

    if (!result.ids || result.ids.length === 0) {
      return [];
    }

    return result.ids.map((id, index) => ({
      id,
      text: (result.documents?.[index] as string) || '',
      metadata: (result.metadatas?.[index] as ChromaMetadata) || {},
    }));
  }

  /**
   * Batch upsert vectors to database
   * Uses pre-allocated arrays to minimize memory allocations
   */
  async upsert(records: VectorRecord[]) {
    const collection = await this.ensureCollection();

    // Validate IDs are unique before attempting upsert
    this.validateUniqueIds(records);

    // Process in batches to avoid overwhelming ChromaDB
    for (let i = 0; i < records.length; i += this.batchSize) {
      const batch = records.slice(i, i + this.batchSize);
      const batchLength = batch.length;

      // Pre-allocate arrays to avoid multiple .map() calls
      // This reduces array allocations from 4 to 1 per batch
      const ids: string[] = new Array(batchLength);
      const embeddings: number[][] = new Array(batchLength);
      const metadatas: ChromaMetadata[] = new Array(batchLength);
      const documents: string[] = new Array(batchLength);

      for (let j = 0; j < batchLength; j++) {
        const record = batch[j];
        ids[j] = record.id;
        embeddings[j] = record.vector;
        metadatas[j] = record.metadata as ChromaMetadata;
        documents[j] = record.content ?? '';
      }

      await collection.upsert({
        ids,
        embeddings,
        metadatas,
        documents,
      });
    }

    this.logger.debug(
      `Successfully upserted ${records.length} records to ChromaDB in ${Math.ceil(records.length / this.batchSize)} batch(es)`,
    );
  }

  /**
   * Search for similar vectors with optional metadata filtering.
   *
   * @param vector - Query embedding vector
   * @param topK - Maximum number of results to return (default: 5)
   * @param filter - Optional metadata filters to narrow results.
   *                 Filters are combined with AND logic.
   *                 Values must be primitives (string, number, boolean).
   * @returns Array of matching vector records sorted by similarity
   *
   * @example
   * ```typescript
   * // Search without filters
   * const results = await vectorStore.similaritySearch(queryVector, 10);
   *
   * // Search with single filter
   * const repoResults = await vectorStore.similaritySearch(queryVector, 10, {
   *   repoId: 'my-repo'
   * });
   *
   * // Search with multiple filters (AND logic)
   * const filtered = await vectorStore.similaritySearch(queryVector, 10, {
   *   repoId: 'my-repo',
   *   team: 'backend',
   *   category: 'repository'
   * });
   * ```
   */
  async similaritySearch(
    vector: EmbeddingVector,
    topK: number = 5,
    filter?: Record<string, string | number | boolean>,
  ): Promise<VectorRecord[]> {
    const collection = await this.ensureCollection();

    const hasFilter = filter && Object.keys(filter).length > 0;

    this.logger.debug(
      `[similaritySearch] Searching with topK=${topK}` +
        (hasFilter ? `, filters: ${JSON.stringify(filter)}` : ''),
    );

    // Build ChromaDB where clause from filter
    let where: Where | undefined = undefined;
    if (hasFilter) {
      const filterKeys = Object.keys(filter);
      if (filterKeys.length > 1) {
        // Multiple filters: use $and operator
        where = {
          $and: Object.entries(filter).map(([key, value]) => ({
            [key]: value,
          })),
        };
      } else {
        // Single filter: pass directly
        where = filter;
      }
    }

    let result: QueryResult<Metadata>;
    try {
      result = await collection.query({
        queryEmbeddings: [vector],
        nResults: topK,
        include: ['metadatas', 'distances', 'documents'],
        ...(where ? { where } : {}),
      });
    } catch (error) {
      this.logger.error(
        `[similaritySearch] Error searching for similar vectors: ${error.message}`,
      );
      throw error;
    }

    const resultCount = result.ids[0]?.length || 0;
    this.logger.debug(
      `[similaritySearch] Found ${resultCount} results` +
        (hasFilter ? ` (filtered)` : ''),
    );

    // ChromaDB returns arrays for batch queries, we take the first result
    const ids = result.ids[0] || [];
    const distances = result.distances[0] || [];
    const metadatas = result.metadatas[0] || [];
    const documents = result.documents[0] || [];

    return ids.map((id, index) => {
      const distance = distances[index];
      if (distance === undefined || distance === null) {
        throw new Error(`No distance found for result at index ${index}`);
      }

      const metadata = (metadatas[index] ?? {}) as ChromaMetadata;
      const content =
        (documents[index] as string) || (metadata.text as string) || '';

      return {
        id,
        score: 1 - distance, // Convert distance to similarity score
        content,
        metadata: {
          ...metadata,
          id, // Ensure id is always available in metadata
        } as VectorMetadata,
        vector: (result.embeddings?.[0]?.[index] as EmbeddingVector) || [],
      } as VectorRecord;
    });
  }

  /**
   * Get all chunks for a specific file path.
   * Useful for retrieving all code chunks belonging to a single file.
   *
   * @param repoId - Repository ID
   * @param filePath - Relative file path to query (e.g., "libs/auth/auth.service.ts")
   * @returns Array of vector records for all chunks in the file
   */
  async getChunksByFilePath(
    repoId: string,
    filePath: string,
  ): Promise<VectorRecord[]> {
    const collection = await this.ensureCollection();

    try {
      const result = await collection.get({
        where: { filePath },
        include: ['metadatas', 'documents', 'embeddings'],
      });

      if (!result.ids || result.ids.length === 0) {
        this.logger.debug(`No chunks found for file path: ${filePath}`);
        return [];
      }

      this.logger.debug(
        `Found ${result.ids.length} chunks for file path: ${filePath}`,
      );

      return result.ids.map((id, index) => ({
        id,
        content: (result.documents?.[index] as string) || '',
        metadata: (result.metadatas?.[index] as VectorMetadata) || {},
        vector: (result.embeddings?.[index] as EmbeddingVector) || [],
      }));
    } catch (error) {
      this.logger.error(
        `Failed to get chunks by file path ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Delete documents by IDs
   */
  async deleteDocuments(ids: string[]) {
    const collection = await this.ensureCollection();
    if (ids.length === 0) {
      return;
    }
    await collection.delete({ ids });
  }

  /**
   * Delete documents by metadata filter
   * Used by LongTermService to delete by userId and type
   */
  async deleteByFilter(filter: Record<string, string | number | boolean>) {
    const collection = await this.ensureCollection();

    if (Object.keys(filter).length === 0) {
      this.logger.warn('deleteByFilter called with empty filter, skipping');
      return;
    }

    try {
      await collection.delete({ where: filter });
      this.logger.log(
        `Deleted documents matching filter: ${JSON.stringify(filter)}`,
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Failed to delete documents by filter: ${error.message}`,
          error.stack,
        );
        throw error;
      }
      throw error;
    }
  }

  /**
   * Validate that all record IDs are unique within the batch.
   * ChromaDB requires unique IDs and will fail with a cryptic error if duplicates exist.
   * This validation provides a clear, actionable error message before attempting the upsert.
   *
   * @param records - Array of vector records to validate
   * @throws Error if duplicate IDs are found
   */
  private validateUniqueIds(records: VectorRecord[]): void {
    const ids = records.map((r) => r.id);
    const uniqueIds = new Set(ids);

    if (ids.length !== uniqueIds.size) {
      // Find the actual duplicates
      const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
      const uniqueDuplicates = [...new Set(duplicates)];

      const errorMessage = [
        `Duplicate IDs detected in batch before ChromaDB upsert.`,
        `Found ${ids.length - uniqueIds.size} duplicate(s) out of ${ids.length} total records.`,
        `Duplicate IDs: ${uniqueDuplicates.join(', ')}`,
        `This indicates a bug in ID generation logic. All chunk IDs must be unique.`,
      ].join('\n');

      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    this.logger.debug(
      `Validated ${records.length} records: all IDs are unique`,
    );
  }

  /**
   * Lazy initialization of collection
   */
  private async ensureCollection(): Promise<Collection> {
    if (this.collection) {
      return this.collection;
    }

    try {
      this.collection = await this.client.getCollection({
        name: this.collectionName,
      });
      this.logger.log(
        `Connected to existing collection: ${this.collectionName}`,
      );
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.warn(
          `Collection ${this.collectionName} not found, creating new one`,
        );
      }
      this.collection = await this.client.createCollection({
        name: this.collectionName,
      });
      this.logger.log(`Created new collection: ${this.collectionName}`);
    }

    return this.collection;
  }
}
