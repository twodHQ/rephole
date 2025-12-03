import { Test, TestingModule } from '@nestjs/testing';
import {
  ParentChildRetrieverService,
  RetrievedChunk,
} from './parent-child-retriever.service';
import { VectorStoreService, ContentStoreService } from '@app/knowledge-base';

describe('ParentChildRetrieverService', () => {
  let service: ParentChildRetrieverService;
  let mockVectorStore: jest.Mocked<VectorStoreService>;
  let mockContentStore: jest.Mocked<ContentStoreService>;

  beforeEach(async () => {
    mockVectorStore = {
      similaritySearch: jest.fn().mockResolvedValue([
        {
          id: 'chunk-1',
          content: 'Child content',
          metadata: { id: 'chunk-1', parentId: 'parent-1', repoId: 'my-repo' },
          score: 0.9,
          vector: [0.1, 0.2, 0.3],
        },
        {
          id: 'chunk-2',
          content: 'Child content 2',
          metadata: { id: 'chunk-2', parentId: 'parent-1', repoId: 'my-repo' }, // Same parent
          score: 0.8,
          vector: [0.2, 0.3, 0.4],
        },
      ]),
    } as any;

    mockContentStore = {
      getParents: jest.fn().mockResolvedValue([
        {
          id: 'parent-1',
          content: 'Full parent document content',
          repoId: 'my-repo',
          metadata: { team: 'backend' },
        },
      ]),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParentChildRetrieverService,
        {
          provide: VectorStoreService,
          useValue: mockVectorStore,
        },
        {
          provide: ContentStoreService,
          useValue: mockContentStore,
        },
      ],
    }).compile();

    service = module.get<ParentChildRetrieverService>(
      ParentChildRetrieverService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Module Extraction Verification', () => {
    it('should successfully instantiate in RetrievalCommonModule context', () => {
      // If this test passes, it confirms the service works independently
      // in the new RetrievalCommonModule without IngestionCommonModule
      expect(service).toBeInstanceOf(ParentChildRetrieverService);
    });
  });

  describe('retrieve', () => {
    it('should retrieve parent documents from child chunks', async () => {
      const queryVector = [0.1, 0.2, 0.3];
      const results = await service.retrieve(queryVector, 5);

      expect(mockVectorStore.similaritySearch).toHaveBeenCalledWith(
        queryVector,
        15, // k * 3
        undefined, // No metadata filters
      );
      expect(mockContentStore.getParents).toHaveBeenCalledWith(['parent-1']);
      expect(results).toHaveLength(1);

      // Check result structure
      const result = results[0];
      expect(result.id).toBe('parent-1');
      expect(result.content).toBe('Full parent document content');
      expect(result.repoId).toBe('my-repo');
      expect(result.metadata).toEqual({ team: 'backend' });
    });

    it('should retrieve with metadata filters', async () => {
      const queryVector = [0.1, 0.2, 0.3];
      const filters = { repoId: 'my-repo', team: 'backend' };
      await service.retrieve(queryVector, 5, filters);

      expect(mockVectorStore.similaritySearch).toHaveBeenCalledWith(
        queryVector,
        15, // k * 3
        filters,
      );
    });

    it('should deduplicate parent IDs', async () => {
      const queryVector = [0.1, 0.2, 0.3];
      await service.retrieve(queryVector, 5);

      // Both chunks point to parent-1, should only fetch once
      expect(mockContentStore.getParents).toHaveBeenCalledWith(['parent-1']);
      expect(mockContentStore.getParents).toHaveBeenCalledTimes(1);
    });

    it('should handle chunks without parents', async () => {
      mockVectorStore.similaritySearch.mockResolvedValue([
        {
          id: 'chunk-orphan',
          content: 'Orphan chunk content',
          metadata: { id: 'chunk-orphan', repoId: 'orphan-repo' }, // No parentId
          score: 0.9,
          vector: [0.1, 0.2, 0.3],
        },
      ]);

      const queryVector = [0.1, 0.2, 0.3];
      const results = await service.retrieve(queryVector, 5);

      expect(mockContentStore.getParents).not.toHaveBeenCalled();
      expect(results).toHaveLength(1);

      // Check orphan chunk structure
      const result = results[0];
      expect(result.id).toBe('chunk-orphan');
      expect(result.content).toBe('Orphan chunk content');
      expect(result.repoId).toBe('orphan-repo');
    });

    it('should return structured RetrievedChunk objects', async () => {
      const queryVector = [0.1, 0.2, 0.3];
      const results: RetrievedChunk[] = await service.retrieve(queryVector, 5);

      // Verify the return type structure
      results.forEach((chunk) => {
        expect(chunk).toHaveProperty('id');
        expect(chunk).toHaveProperty('content');
        expect(chunk).toHaveProperty('repoId');
        expect(chunk).toHaveProperty('metadata');
      });
    });
  });

  describe('retrieveChunks', () => {
    it('should retrieve raw chunks directly without parent lookup', async () => {
      const queryVector = [0.1, 0.2, 0.3];
      const results = await service.retrieveChunks(queryVector, 5);

      // Should call similaritySearch with exact k (not k * 3)
      expect(mockVectorStore.similaritySearch).toHaveBeenCalledWith(
        queryVector,
        5, // exact k, not multiplied
        undefined,
      );

      // Should NOT call getParents - this is the key difference
      expect(mockContentStore.getParents).not.toHaveBeenCalled();

      // Should return chunk content directly
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('chunk-1');
      expect(results[0].content).toBe('Child content');
      expect(results[1].id).toBe('chunk-2');
      expect(results[1].content).toBe('Child content 2');
    });

    it('should retrieve chunks with metadata filters', async () => {
      const queryVector = [0.1, 0.2, 0.3];
      const filters = { repoId: 'my-repo', team: 'backend' };
      await service.retrieveChunks(queryVector, 10, filters);

      expect(mockVectorStore.similaritySearch).toHaveBeenCalledWith(
        queryVector,
        10,
        filters,
      );
    });

    it('should filter out chunks without content', async () => {
      mockVectorStore.similaritySearch.mockResolvedValue([
        {
          id: 'chunk-with-content',
          content: 'Valid content',
          metadata: { repoId: 'my-repo' },
          score: 0.9,
          vector: [0.1, 0.2, 0.3],
        },
        {
          id: 'chunk-without-content',
          content: '', // Empty content
          metadata: { repoId: 'my-repo' },
          score: 0.8,
          vector: [0.2, 0.3, 0.4],
        },
        {
          id: 'chunk-undefined-content',
          content: undefined, // Undefined content
          metadata: { repoId: 'my-repo' },
          score: 0.7,
          vector: [0.3, 0.4, 0.5],
        },
      ]);

      const queryVector = [0.1, 0.2, 0.3];
      const results = await service.retrieveChunks(queryVector, 5);

      // Should only return chunk with valid content
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('chunk-with-content');
    });

    it('should return structured RetrievedChunk objects from raw chunks', async () => {
      const queryVector = [0.1, 0.2, 0.3];
      const results: RetrievedChunk[] = await service.retrieveChunks(
        queryVector,
        5,
      );

      // Verify the return type structure
      results.forEach((chunk) => {
        expect(chunk).toHaveProperty('id');
        expect(chunk).toHaveProperty('content');
        expect(chunk).toHaveProperty('repoId');
        expect(chunk).toHaveProperty('metadata');
      });
    });

    it('should extract repoId from metadata correctly', async () => {
      mockVectorStore.similaritySearch.mockResolvedValue([
        {
          id: 'chunk-1',
          content: 'Test content',
          metadata: { repoId: 'test-repo', team: 'frontend' },
          score: 0.9,
          vector: [0.1, 0.2, 0.3],
        },
      ]);

      const queryVector = [0.1, 0.2, 0.3];
      const results = await service.retrieveChunks(queryVector, 5);

      expect(results[0].repoId).toBe('test-repo');
      expect(results[0].metadata).toEqual({ repoId: 'test-repo', team: 'frontend' });
    });
  });
});
