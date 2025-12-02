import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RepoIngestionDto } from './repo-ingestion.dto';

describe('RepoIngestionDto', () => {
  describe('meta validation', () => {
    it('should accept valid meta with string values', async () => {
      const dto = plainToInstance(RepoIngestionDto, {
        repoUrl: 'https://github.com/org/repo.git',
        meta: {
          team: 'backend',
          project: 'api',
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept valid meta with number values', async () => {
      const dto = plainToInstance(RepoIngestionDto, {
        repoUrl: 'https://github.com/org/repo.git',
        meta: {
          priority: 1,
          version: 2.5,
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept valid meta with boolean values', async () => {
      const dto = plainToInstance(RepoIngestionDto, {
        repoUrl: 'https://github.com/org/repo.git',
        meta: {
          active: true,
          deprecated: false,
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept valid meta with mixed primitive values', async () => {
      const dto = plainToInstance(RepoIngestionDto, {
        repoUrl: 'https://github.com/org/repo.git',
        meta: {
          team: 'backend',
          priority: 1,
          active: true,
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept undefined meta', async () => {
      const dto = plainToInstance(RepoIngestionDto, {
        repoUrl: 'https://github.com/org/repo.git',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept empty meta object', async () => {
      const dto = plainToInstance(RepoIngestionDto, {
        repoUrl: 'https://github.com/org/repo.git',
        meta: {},
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject meta with nested objects', async () => {
      const dto = plainToInstance(RepoIngestionDto, {
        repoUrl: 'https://github.com/org/repo.git',
        meta: {
          config: { nested: 'value' },
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isFlatObject');
    });

    it('should reject meta with arrays', async () => {
      const dto = plainToInstance(RepoIngestionDto, {
        repoUrl: 'https://github.com/org/repo.git',
        meta: {
          tags: ['tag1', 'tag2'],
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isFlatObject');
    });

    it('should reject meta that is an array itself', async () => {
      const dto = plainToInstance(RepoIngestionDto, {
        repoUrl: 'https://github.com/org/repo.git',
        meta: ['not', 'an', 'object'],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('repoUrl validation', () => {
    it('should accept valid HTTPS GitHub URL', async () => {
      const dto = plainToInstance(RepoIngestionDto, {
        repoUrl: 'https://github.com/org/repo.git',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept valid HTTPS GitLab URL', async () => {
      const dto = plainToInstance(RepoIngestionDto, {
        repoUrl: 'https://gitlab.com/org/repo.git',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject invalid URL', async () => {
      const dto = plainToInstance(RepoIngestionDto, {
        repoUrl: 'not-a-url',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject empty repoUrl', async () => {
      const dto = plainToInstance(RepoIngestionDto, {
        repoUrl: '',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('repoId validation', () => {
    it('should accept valid repoId with alphanumeric characters', async () => {
      const dto = plainToInstance(RepoIngestionDto, {
        repoUrl: 'https://github.com/org/repo.git',
        repoId: 'my-repo-123',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept repoId with underscores', async () => {
      const dto = plainToInstance(RepoIngestionDto, {
        repoUrl: 'https://github.com/org/repo.git',
        repoId: 'my_repo_name',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject repoId with special characters', async () => {
      const dto = plainToInstance(RepoIngestionDto, {
        repoUrl: 'https://github.com/org/repo.git',
        repoId: 'my repo!@#',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
