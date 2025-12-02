import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { RepoUpdateProcessor } from '../repo-update.processor';
import { GitService } from '@app/git';
import { EmbeddingsService } from '@app/ai-core';
import { ContentStoreService, VectorStoreService } from '@app/knowledge-base';
import { AstSplitterService } from '@app/ingestion/ast-parser';
import { RepoStateEntity } from '../../entities';
import type { RepositoryMetadata } from '@app/shared-interfaces';

describe('RepoUpdateProcessor - Metadata Alignment', () => {
  let processor: RepoUpdateProcessor;

  const mockGitService = {
    getCurrentCommit: jest.fn(),
    getChangedFiles: jest.fn(),
    cloneRepo: jest.fn(),
  };

  const mockVectorStore = {
    upsert: jest.fn(),
    deleteDocuments: jest.fn(),
  };

  const mockEmbeddingsService = {
    embedDocuments: jest.fn(),
  };

  const mockContentStore = {
    saveParent: jest.fn(),
  };

  const mockAstSplitter = {
    split: jest.fn(),
  };

  const mockRepoStateRepo = {
    findOneBy: jest.fn(),
    save: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('repos'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RepoUpdateProcessor,
        { provide: GitService, useValue: mockGitService },
        { provide: EmbeddingsService, useValue: mockEmbeddingsService },
        { provide: VectorStoreService, useValue: mockVectorStore },
        {
          provide: getRepositoryToken(RepoStateEntity),
          useValue: mockRepoStateRepo,
        },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AstSplitterService, useValue: mockAstSplitter },
        { provide: ContentStoreService, useValue: mockContentStore },
      ],
    }).compile();

    processor = module.get<RepoUpdateProcessor>(RepoUpdateProcessor);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Metadata Construction', () => {
    it('should create RepositoryMetadata with all BaseMetadata fields', async () => {
      // Setup: Mock repository state
      const mockState: RepoStateEntity = {
        id: 'repo_01HXYZ',
        repoUrl: 'https://github.com/test/repo.git',
        localPath: '/path/to/repo',
        lastProcessedCommit: 'abc123',
        fileSignatures: {},
      };

      mockRepoStateRepo.findOneBy.mockResolvedValue(mockState);
      mockGitService.getCurrentCommit.mockResolvedValue('def456');
      mockGitService.getChangedFiles.mockResolvedValue({
        added: ['src/test.ts'],
        modified: [],
        deleted: [],
      });

      // Mock AST splitter to return a chunk
      mockAstSplitter.split.mockReturnValue([
        {
          id: 'src/test.ts:testFunction:function_declaration:L10',
          content: 'function testFunction() { return true; }',
          type: 'function_declaration',
          startLine: 10,
          endLine: 12,
        },
      ]);

      mockEmbeddingsService.embedDocuments.mockResolvedValue([
        new Array(1536).fill(0.1),
      ]);

      // Capture the metadata passed to vectorStore.upsert
      let capturedMetadata: RepositoryMetadata | undefined;
      mockVectorStore.upsert.mockImplementation((records) => {
        if (records.length > 0) {
          capturedMetadata = records[0].metadata as RepositoryMetadata;
        }
        return Promise.resolve();
      });

      // Mock file system
      const originalReadFileSync = require('fs').readFileSync;
      require('fs').readFileSync = jest.fn().mockReturnValue('file content');

      try {
        // Execute
        await processor.process({
          id: 'job_123',
          data: {
            repoUrl: 'https://github.com/test/repo.git',
            localPath: '/path/to/repo',
            repoId: 'repo_01HXYZ',
          },
        } as any);

        // Verify metadata was captured
        expect(capturedMetadata).toBeDefined();
        expect(mockVectorStore.upsert).toHaveBeenCalled();

        if (capturedMetadata) {
          // Verify BaseMetadata required fields
          expect(capturedMetadata.id).toBe(
            'src/test.ts:testFunction:function_declaration:L10',
          );
          expect(capturedMetadata.category).toBe('repository');
          expect(capturedMetadata.workspaceId).toBe('workspace');
          expect(capturedMetadata.userId).toBe('system');
          expect(capturedMetadata.timestamp).toBeDefined();
          expect(capturedMetadata.filePath).toBe('src/test.ts');
          expect(capturedMetadata.fileType).toBe('.ts');

          // Verify timestamp is ISO 8601 string
          expect(typeof capturedMetadata.timestamp).toBe('string');
          expect(capturedMetadata.timestamp).toMatch(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
          );
          expect(() => new Date(capturedMetadata!.timestamp)).not.toThrow();

          // Verify optional BaseMetadata fields
          expect(capturedMetadata.chunkIndex).toBe(0);
          expect(capturedMetadata.chunkType).toBe('function_declaration');
          expect(capturedMetadata.parentId).toBe('src/test.ts');

          // Verify repository-specific fields
          expect(capturedMetadata.repositoryId).toBe('repo_01HXYZ');
          expect(capturedMetadata.functionName).toBe('testFunction');
          expect(capturedMetadata.startLine).toBe(10);
          expect(capturedMetadata.endLine).toBe(12);
        }
      } finally {
        // Restore original fs.readFileSync
        require('fs').readFileSync = originalReadFileSync;
      }
    });

    it('should use ISO 8601 timestamp format (not Unix number)', async () => {
      const mockState: RepoStateEntity = {
        id: 'repo_01',
        repoUrl: 'https://github.com/test/repo.git',
        localPath: '/path/to/repo',
        lastProcessedCommit: 'abc123',
        fileSignatures: {},
      };

      mockRepoStateRepo.findOneBy.mockResolvedValue(mockState);
      mockGitService.getCurrentCommit.mockResolvedValue('def456');
      mockGitService.getChangedFiles.mockResolvedValue({
        added: ['src/app.ts'],
        modified: [],
        deleted: [],
      });

      mockAstSplitter.split.mockReturnValue([
        {
          id: 'src/app.ts:main:function:L1',
          content: 'function main() {}',
          type: 'function',
          startLine: 1,
          endLine: 3,
        },
      ]);

      mockEmbeddingsService.embedDocuments.mockResolvedValue([
        new Array(1536).fill(0.1),
      ]);

      let capturedTimestamp: string | undefined;
      mockVectorStore.upsert.mockImplementation((records) => {
        if (records.length > 0) {
          capturedTimestamp = records[0].metadata.timestamp;
        }
        return Promise.resolve();
      });

      const originalReadFileSync = require('fs').readFileSync;
      require('fs').readFileSync = jest.fn().mockReturnValue('file content');

      try {
        await processor.process({
          id: 'job_123',
          data: {
            repoUrl: 'https://github.com/test/repo.git',
            localPath: '/path/to/repo',
            repoId: 'repo_01',
          },
        } as any);

        expect(capturedTimestamp).toBeDefined();
        expect(typeof capturedTimestamp).toBe('string');

        // Verify it's not a number (old format)
        expect(typeof capturedTimestamp).not.toBe('number');

        // Verify it's valid ISO 8601
        const parsedDate = new Date(capturedTimestamp!);
        expect(parsedDate.toISOString()).toBe(capturedTimestamp);
      } finally {
        require('fs').readFileSync = originalReadFileSync;
      }
    });

    it('should populate chunkIndex sequentially for multiple chunks', async () => {
      const mockState: RepoStateEntity = {
        id: 'repo_01',
        repoUrl: 'https://github.com/test/repo.git',
        localPath: '/path/to/repo',
        lastProcessedCommit: 'abc123',
        fileSignatures: {},
      };

      mockRepoStateRepo.findOneBy.mockResolvedValue(mockState);
      mockGitService.getCurrentCommit.mockResolvedValue('def456');
      mockGitService.getChangedFiles.mockResolvedValue({
        added: ['src/multi.ts'],
        modified: [],
        deleted: [],
      });

      // Multiple chunks from same file
      mockAstSplitter.split.mockReturnValue([
        {
          id: 'src/multi.ts:funcA:function:L1',
          content: 'function funcA() {}',
          type: 'function',
          startLine: 1,
          endLine: 3,
        },
        {
          id: 'src/multi.ts:funcB:function:L5',
          content: 'function funcB() {}',
          type: 'function',
          startLine: 5,
          endLine: 7,
        },
        {
          id: 'src/multi.ts:funcC:function:L9',
          content: 'function funcC() {}',
          type: 'function',
          startLine: 9,
          endLine: 11,
        },
      ]);

      mockEmbeddingsService.embedDocuments.mockResolvedValue([
        new Array(1536).fill(0.1),
        new Array(1536).fill(0.2),
        new Array(1536).fill(0.3),
      ]);

      const capturedChunkIndices: number[] = [];
      mockVectorStore.upsert.mockImplementation((records) => {
        records.forEach((record: any) => {
          capturedChunkIndices.push(record.metadata.chunkIndex);
        });
        return Promise.resolve();
      });

      const originalReadFileSync = require('fs').readFileSync;
      require('fs').readFileSync = jest.fn().mockReturnValue('file content');

      try {
        await processor.process({
          id: 'job_123',
          data: {
            repoUrl: 'https://github.com/test/repo.git',
            localPath: '/path/to/repo',
            repoId: 'repo_01',
          },
        } as any);

        // Verify sequential chunk indices
        expect(capturedChunkIndices).toEqual([0, 1, 2]);
      } finally {
        require('fs').readFileSync = originalReadFileSync;
      }
    });
  });

  describe('Meta Sanitization and Merging', () => {
    it('should merge custom meta with chunk metadata', async () => {
      const mockState: RepoStateEntity = {
        id: 'repo_meta_test',
        repoUrl: 'https://github.com/test/repo.git',
        localPath: '/path/to/repo',
        lastProcessedCommit: 'abc123',
        fileSignatures: {},
      };

      mockRepoStateRepo.findOneBy.mockResolvedValue(mockState);
      mockGitService.getCurrentCommit.mockResolvedValue('def456');
      mockGitService.getChangedFiles.mockResolvedValue({
        added: ['src/test.ts'],
        modified: [],
        deleted: [],
      });

      mockAstSplitter.split.mockReturnValue([
        {
          id: 'src/test.ts:testFunc:function:L1',
          content: 'function testFunc() {}',
          type: 'function',
          startLine: 1,
          endLine: 3,
        },
      ]);

      mockEmbeddingsService.embedDocuments.mockResolvedValue([
        new Array(1536).fill(0.1),
      ]);

      let capturedMetadata: any;
      mockVectorStore.upsert.mockImplementation((records) => {
        if (records.length > 0) {
          capturedMetadata = records[0].metadata;
        }
        return Promise.resolve();
      });

      const originalReadFileSync = require('fs').readFileSync;
      require('fs').readFileSync = jest.fn().mockReturnValue('file content');

      try {
        await processor.process({
          id: 'job_123',
          data: {
            repoUrl: 'https://github.com/test/repo.git',
            repoId: 'repo_meta_test',
            meta: {
              team: 'backend',
              project: 'api',
              priority: 1,
            },
          },
        } as any);

        expect(capturedMetadata).toBeDefined();
        // Custom meta should be merged
        expect(capturedMetadata.team).toBe('backend');
        expect(capturedMetadata.project).toBe('api');
        expect(capturedMetadata.priority).toBe(1);
        // Base metadata should still exist
        expect(capturedMetadata.category).toBe('repository');
        expect(capturedMetadata.filePath).toBe('src/test.ts');
        expect(capturedMetadata.repoId).toBe('repo_meta_test');
      } finally {
        require('fs').readFileSync = originalReadFileSync;
      }
    });

    it('should filter out non-primitive meta values', async () => {
      const mockState: RepoStateEntity = {
        id: 'repo_filter_test',
        repoUrl: 'https://github.com/test/repo.git',
        localPath: '/path/to/repo',
        lastProcessedCommit: 'abc123',
        fileSignatures: {},
      };

      mockRepoStateRepo.findOneBy.mockResolvedValue(mockState);
      mockGitService.getCurrentCommit.mockResolvedValue('def456');
      mockGitService.getChangedFiles.mockResolvedValue({
        added: ['src/test.ts'],
        modified: [],
        deleted: [],
      });

      mockAstSplitter.split.mockReturnValue([
        {
          id: 'src/test.ts:testFunc:function:L1',
          content: 'function testFunc() {}',
          type: 'function',
          startLine: 1,
          endLine: 3,
        },
      ]);

      mockEmbeddingsService.embedDocuments.mockResolvedValue([
        new Array(1536).fill(0.1),
      ]);

      let capturedMetadata: any;
      mockVectorStore.upsert.mockImplementation((records) => {
        if (records.length > 0) {
          capturedMetadata = records[0].metadata;
        }
        return Promise.resolve();
      });

      const originalReadFileSync = require('fs').readFileSync;
      require('fs').readFileSync = jest.fn().mockReturnValue('file content');

      try {
        await processor.process({
          id: 'job_123',
          data: {
            repoUrl: 'https://github.com/test/repo.git',
            repoId: 'repo_filter_test',
            meta: {
              validString: 'value',
              validNumber: 42,
              validBoolean: true,
              invalidObject: { nested: 'value' }, // Should be filtered
              invalidArray: [1, 2, 3], // Should be filtered
            },
          },
        } as any);

        expect(capturedMetadata).toBeDefined();
        // Valid primitives should be included
        expect(capturedMetadata.validString).toBe('value');
        expect(capturedMetadata.validNumber).toBe(42);
        expect(capturedMetadata.validBoolean).toBe(true);
        // Non-primitives should be filtered out
        expect(capturedMetadata.invalidObject).toBeUndefined();
        expect(capturedMetadata.invalidArray).toBeUndefined();
      } finally {
        require('fs').readFileSync = originalReadFileSync;
      }
    });

    it('should not allow meta to override reserved fields', async () => {
      const mockState: RepoStateEntity = {
        id: 'repo_reserved_test',
        repoUrl: 'https://github.com/test/repo.git',
        localPath: '/path/to/repo',
        lastProcessedCommit: 'abc123',
        fileSignatures: {},
      };

      mockRepoStateRepo.findOneBy.mockResolvedValue(mockState);
      mockGitService.getCurrentCommit.mockResolvedValue('def456');
      mockGitService.getChangedFiles.mockResolvedValue({
        added: ['src/test.ts'],
        modified: [],
        deleted: [],
      });

      mockAstSplitter.split.mockReturnValue([
        {
          id: 'src/test.ts:testFunc:function:L1',
          content: 'function testFunc() {}',
          type: 'function',
          startLine: 1,
          endLine: 3,
        },
      ]);

      mockEmbeddingsService.embedDocuments.mockResolvedValue([
        new Array(1536).fill(0.1),
      ]);

      let capturedMetadata: any;
      mockVectorStore.upsert.mockImplementation((records) => {
        if (records.length > 0) {
          capturedMetadata = records[0].metadata;
        }
        return Promise.resolve();
      });

      const originalReadFileSync = require('fs').readFileSync;
      require('fs').readFileSync = jest.fn().mockReturnValue('file content');

      try {
        await processor.process({
          id: 'job_123',
          data: {
            repoUrl: 'https://github.com/test/repo.git',
            repoId: 'repo_reserved_test',
            meta: {
              // Try to override reserved fields
              category: 'hacked',
              id: 'hacked-id',
              repositoryId: 'hacked-repo',
              // Valid custom field
              customField: 'allowed',
            },
          },
        } as any);

        expect(capturedMetadata).toBeDefined();
        // Reserved fields should NOT be overwritten
        expect(capturedMetadata.category).toBe('repository');
        expect(capturedMetadata.id).toBe('src/test.ts:testFunc:function:L1');
        expect(capturedMetadata.repositoryId).toBe('repo_reserved_test');
        // Custom field should still work
        expect(capturedMetadata.customField).toBe('allowed');
      } finally {
        require('fs').readFileSync = originalReadFileSync;
      }
    });

    it('should use userId from job data', async () => {
      const mockState: RepoStateEntity = {
        id: 'repo_user_test',
        repoUrl: 'https://github.com/test/repo.git',
        localPath: '/path/to/repo',
        lastProcessedCommit: 'abc123',
        fileSignatures: {},
      };

      mockRepoStateRepo.findOneBy.mockResolvedValue(mockState);
      mockGitService.getCurrentCommit.mockResolvedValue('def456');
      mockGitService.getChangedFiles.mockResolvedValue({
        added: ['src/test.ts'],
        modified: [],
        deleted: [],
      });

      mockAstSplitter.split.mockReturnValue([
        {
          id: 'src/test.ts:testFunc:function:L1',
          content: 'function testFunc() {}',
          type: 'function',
          startLine: 1,
          endLine: 3,
        },
      ]);

      mockEmbeddingsService.embedDocuments.mockResolvedValue([
        new Array(1536).fill(0.1),
      ]);

      let capturedMetadata: any;
      mockVectorStore.upsert.mockImplementation((records) => {
        if (records.length > 0) {
          capturedMetadata = records[0].metadata;
        }
        return Promise.resolve();
      });

      const originalReadFileSync = require('fs').readFileSync;
      require('fs').readFileSync = jest.fn().mockReturnValue('file content');

      try {
        await processor.process({
          id: 'job_123',
          data: {
            repoUrl: 'https://github.com/test/repo.git',
            repoId: 'repo_user_test',
            userId: 'user-abc-123',
          },
        } as any);

        expect(capturedMetadata).toBeDefined();
        expect(capturedMetadata.userId).toBe('user-abc-123');
      } finally {
        require('fs').readFileSync = originalReadFileSync;
      }
    });
  });

  describe('Cross-Category Query Support', () => {
    it('should create metadata compatible with cross-category queries', async () => {
      const mockState: RepoStateEntity = {
        id: 'repo_shared',
        repoUrl: 'https://github.com/test/repo.git',
        localPath: '/path/to/repo',
        lastProcessedCommit: 'abc123',
        fileSignatures: {},
      };

      mockRepoStateRepo.findOneBy.mockResolvedValue(mockState);
      mockGitService.getCurrentCommit.mockResolvedValue('def456');
      mockGitService.getChangedFiles.mockResolvedValue({
        added: ['src/service.ts'],
        modified: [],
        deleted: [],
      });

      mockAstSplitter.split.mockReturnValue([
        {
          id: 'src/service.ts:UserService:class:L10',
          content: 'class UserService {}',
          type: 'class_declaration',
          startLine: 10,
          endLine: 50,
        },
      ]);

      mockEmbeddingsService.embedDocuments.mockResolvedValue([
        new Array(1536).fill(0.1),
      ]);

      let capturedMetadata: RepositoryMetadata | undefined;
      mockVectorStore.upsert.mockImplementation((records) => {
        if (records.length > 0) {
          capturedMetadata = records[0].metadata as RepositoryMetadata;
        }
        return Promise.resolve();
      });

      const originalReadFileSync = require('fs').readFileSync;
      require('fs').readFileSync = jest.fn().mockReturnValue('file content');

      try {
        await processor.process({
          id: 'job_123',
          data: {
            repoUrl: 'https://github.com/test/repo.git',
            localPath: '/path/to/repo',
            repoId: 'repo_shared',
          },
        } as any);

        expect(capturedMetadata).toBeDefined();

        if (capturedMetadata) {
          // These fields enable cross-category queries
          expect(capturedMetadata.workspaceId).toBeDefined();
          expect(capturedMetadata.userId).toBeDefined();
          expect(capturedMetadata.timestamp).toBeDefined();
          expect(capturedMetadata.category).toBe('repository');

          // Can be queried alongside file uploads with same workspaceId/userId
          expect(typeof capturedMetadata.workspaceId).toBe('string');
          expect(typeof capturedMetadata.userId).toBe('string');
        }
      } finally {
        require('fs').readFileSync = originalReadFileSync;
      }
    });
  });
});
