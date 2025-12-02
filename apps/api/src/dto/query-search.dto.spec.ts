import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { QuerySearchRequest } from './query-search.dto';

describe('QuerySearchRequest', () => {
  describe('prompt validation', () => {
    it('should accept valid prompt', async () => {
      const dto = plainToInstance(QuerySearchRequest, {
        prompt: 'How does authentication work?',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept empty prompt (IsString passes)', async () => {
      const dto = plainToInstance(QuerySearchRequest, {
        prompt: '',
      });

      // Empty string passes IsString validation
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.prompt).toBe('');
    });

    it('should reject missing prompt', async () => {
      const dto = plainToInstance(QuerySearchRequest, {});

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('k validation', () => {
    it('should accept valid k value', async () => {
      const dto = plainToInstance(QuerySearchRequest, {
        prompt: 'test query',
        k: 10,
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept undefined k (optional)', async () => {
      const dto = plainToInstance(QuerySearchRequest, {
        prompt: 'test query',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject k less than 1', async () => {
      const dto = plainToInstance(QuerySearchRequest, {
        prompt: 'test query',
        k: 0,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject k greater than 100', async () => {
      const dto = plainToInstance(QuerySearchRequest, {
        prompt: 'test query',
        k: 101,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject non-integer k', async () => {
      const dto = plainToInstance(QuerySearchRequest, {
        prompt: 'test query',
        k: 5.5,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('meta filter validation', () => {
    it('should accept valid meta with string values', async () => {
      const dto = plainToInstance(QuerySearchRequest, {
        prompt: 'test query',
        meta: {
          team: 'backend',
          environment: 'production',
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept valid meta with number values', async () => {
      const dto = plainToInstance(QuerySearchRequest, {
        prompt: 'test query',
        meta: {
          priority: 1,
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept valid meta with boolean values', async () => {
      const dto = plainToInstance(QuerySearchRequest, {
        prompt: 'test query',
        meta: {
          active: true,
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept undefined meta (optional)', async () => {
      const dto = plainToInstance(QuerySearchRequest, {
        prompt: 'test query',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept empty meta object', async () => {
      const dto = plainToInstance(QuerySearchRequest, {
        prompt: 'test query',
        meta: {},
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject meta with nested objects', async () => {
      const dto = plainToInstance(QuerySearchRequest, {
        prompt: 'test query',
        meta: {
          config: { nested: 'value' },
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isFlatFilterObject');
    });

    it('should reject meta with arrays', async () => {
      const dto = plainToInstance(QuerySearchRequest, {
        prompt: 'test query',
        meta: {
          tags: ['tag1', 'tag2'],
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isFlatFilterObject');
    });
  });

  describe('combined validations', () => {
    it('should accept complete valid request', async () => {
      // Note: repoId is now a URL path parameter, not in meta
      const dto = plainToInstance(QuerySearchRequest, {
        prompt: 'How does the auth service handle JWT tokens?',
        k: 15,
        meta: {
          team: 'backend',
          category: 'repository',
          environment: 'production',
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept minimal valid request', async () => {
      const dto = plainToInstance(QuerySearchRequest, {
        prompt: 'test',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});
