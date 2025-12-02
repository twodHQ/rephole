import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import { RepoIngestionService } from '@app/ingestion/repo-rag-producer';

describe('IngestionService', () => {
  let service: IngestionService;

  const mockRepoIngestionService = {
    ingestRepo: jest.fn().mockResolvedValue({
      status: 'queued',
      jobId: 'job-123',
      repoUrl: 'https://github.com/test/repo.git',
      ref: 'main',
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestionService,
        {
          provide: RepoIngestionService,
          useValue: mockRepoIngestionService,
        },
      ],
    }).compile();

    service = module.get<IngestionService>(IngestionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('extractRepoId', () => {
    // Helper to access private method for testing
    function callExtractRepoId(svc: IngestionService, url: string): string {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
      return (svc as any).extractRepoId(url);
    }

    describe('GitHub URLs', () => {
      it('should extract repo name from GitHub HTTPS URL with .git suffix', () => {
        const result = callExtractRepoId(
          service,
          'https://github.com/twodHQ/rephole.git',
        );
        expect(result).toBe('rephole');
      });

      it('should extract repo name from GitHub HTTPS URL without .git suffix', () => {
        const result = callExtractRepoId(
          service,
          'https://github.com/twodHQ/rephole',
        );
        expect(result).toBe('rephole');
      });

      it('should extract repo name with hyphens', () => {
        const result = callExtractRepoId(
          service,
          'https://github.com/org/my-awesome-repo.git',
        );
        expect(result).toBe('my-awesome-repo');
      });

      it('should extract repo name with underscores', () => {
        const result = callExtractRepoId(
          service,
          'https://github.com/org/my_repo_name.git',
        );
        expect(result).toBe('my_repo_name');
      });

      it('should extract repo name with dots', () => {
        const result = callExtractRepoId(
          service,
          'https://github.com/org/repo.name.git',
        );
        expect(result).toBe('repo.name');
      });
    });

    describe('GitLab URLs', () => {
      it('should extract repo name from GitLab HTTPS URL', () => {
        const result = callExtractRepoId(
          service,
          'https://gitlab.com/group/project.git',
        );
        expect(result).toBe('project');
      });

      it('should extract repo name from GitLab subgroup URL', () => {
        const result = callExtractRepoId(
          service,
          'https://gitlab.com/group/subgroup/project.git',
        );
        expect(result).toBe('project');
      });
    });

    describe('Bitbucket URLs', () => {
      it('should extract repo name from Bitbucket HTTPS URL', () => {
        const result = callExtractRepoId(
          service,
          'https://bitbucket.org/team/repo-name.git',
        );
        expect(result).toBe('repo-name');
      });
    });

    describe('Edge cases', () => {
      it('should handle trailing slashes', () => {
        const result = callExtractRepoId(
          service,
          'https://github.com/org/repo/',
        );
        expect(result).toBe('repo');
      });

      it('should handle multiple trailing slashes', () => {
        const result = callExtractRepoId(
          service,
          'https://github.com/org/repo///',
        );
        expect(result).toBe('repo');
      });

      it('should throw BadRequestException for invalid URL format', () => {
        expect(() => callExtractRepoId(service, 'not-a-valid-url')).toThrow(
          BadRequestException,
        );
      });

      it('should throw BadRequestException for URL with special characters in repo name', () => {
        // Characters not allowed in repo names
        expect(() =>
          callExtractRepoId(service, 'https://github.com/org/repo<name>.git'),
        ).toThrow(BadRequestException);
      });
    });
  });

  describe('ingestRepo', () => {
    it('should auto-deduce repoId from URL when not provided', async () => {
      await service.ingestRepo({
        repoUrl: 'https://github.com/twodHQ/rephole.git',
        ref: 'main',
      });

      expect(mockRepoIngestionService.ingestRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          repoId: 'rephole',
        }),
      );
    });

    it('should use provided repoId when available', async () => {
      await service.ingestRepo({
        repoUrl: 'https://github.com/twodHQ/rephole.git',
        ref: 'main',
        repoId: 'custom-repo-id',
      });

      expect(mockRepoIngestionService.ingestRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          repoId: 'custom-repo-id',
        }),
      );
    });

    it('should pass meta to the ingestion service', async () => {
      const meta = { team: 'backend', project: 'api' };

      await service.ingestRepo({
        repoUrl: 'https://github.com/twodHQ/rephole.git',
        ref: 'main',
        meta,
      });

      expect(mockRepoIngestionService.ingestRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          meta,
        }),
      );
    });

    it('should use empty object for meta when not provided', async () => {
      await service.ingestRepo({
        repoUrl: 'https://github.com/twodHQ/rephole.git',
        ref: 'main',
      });

      expect(mockRepoIngestionService.ingestRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: {},
        }),
      );
    });

    it('should use default userId when not provided', async () => {
      await service.ingestRepo({
        repoUrl: 'https://github.com/twodHQ/rephole.git',
        ref: 'main',
      });

      expect(mockRepoIngestionService.ingestRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'system',
        }),
      );
    });

    it('should use provided userId', async () => {
      await service.ingestRepo({
        repoUrl: 'https://github.com/twodHQ/rephole.git',
        ref: 'main',
        userId: 'user-123',
      });

      expect(mockRepoIngestionService.ingestRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
        }),
      );
    });
  });
});
