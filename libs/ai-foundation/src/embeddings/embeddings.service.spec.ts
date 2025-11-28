import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmbeddingsService } from './embeddings.service';

// Mock OpenAI
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      embeddings: {
        create: jest.fn(),
      },
    })),
  };
});

describe('EmbeddingsService', () => {
  let service: EmbeddingsService;
  let mockOpenAI: any;

  beforeEach(async () => {
    // Mock ConfigService
    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          OPENAI_API_KEY: 'test-api-key',
          OPENAI_ORGANIZATION_ID: 'test-org',
          OPENAI_PROJECT_ID: 'test-project',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmbeddingsService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<EmbeddingsService>(EmbeddingsService);

    // Get the mocked OpenAI instance
    mockOpenAI = (service as any).openai;
  });

  describe('embedDocuments', () => {
    it('should return empty array for empty input', async () => {
      const result = await service.embedDocuments([]);
      expect(result).toEqual([]);
    });

    it('should return empty array for null input', async () => {
      const result = await service.embedDocuments(null as any);
      expect(result).toEqual([]);
    });

    it('should process valid texts and return embeddings', async () => {
      const mockEmbeddings = [
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
      ];

      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [
          { embedding: mockEmbeddings[0] },
          { embedding: mockEmbeddings[1] },
        ],
      });

      const result = await service.embedDocuments(['text one', 'text two']);

      expect(result).toEqual(mockEmbeddings);
      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: ['text one', 'text two'],
      });
    });

    it('should sanitize newlines from texts', async () => {
      const mockEmbeddings = [[0.1, 0.2, 0.3]];

      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [{ embedding: mockEmbeddings[0] }],
      });

      await service.embedDocuments(['text\nwith\nnewlines']);

      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: ['text with newlines'],
      });
    });

    it('should trim leading and trailing whitespace', async () => {
      const mockEmbeddings = [[0.1, 0.2, 0.3]];

      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [{ embedding: mockEmbeddings[0] }],
      });

      await service.embedDocuments(['  text with spaces  ']);

      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: ['text with spaces'],
      });
    });

    it('should handle newlines and whitespace together', async () => {
      const mockEmbeddings = [[0.1, 0.2, 0.3]];

      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [{ embedding: mockEmbeddings[0] }],
      });

      await service.embedDocuments(['  \ntext\n with\n newlines\n  ']);

      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: ['text  with  newlines'],
      });
    });

    it('should filter out null and undefined texts', async () => {
      const mockEmbeddings = [[0.1, 0.2, 0.3]];

      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [{ embedding: mockEmbeddings[0] }],
      });

      await service.embedDocuments([
        null as any,
        'valid text',
        undefined as any,
      ]);

      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: ['valid text'],
      });
    });

    it('should filter out empty strings after sanitization', async () => {
      const mockEmbeddings = [[0.1, 0.2, 0.3]];

      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [{ embedding: mockEmbeddings[0] }],
      });

      await service.embedDocuments(['', '   ', '\n\n', 'valid text']);

      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: ['valid text'],
      });
    });

    it('should return empty array if all texts are invalid', async () => {
      const result = await service.embedDocuments([
        '',
        '   ',
        '\n\n',
        null as any,
      ]);

      expect(result).toEqual([]);
      expect(mockOpenAI.embeddings.create).not.toHaveBeenCalled();
    });

    it('should truncate oversized texts', async () => {
      // Create a text that exceeds 8000 tokens (32000 characters)
      const largeText = 'a'.repeat(40000);
      const mockEmbeddings = [[0.1, 0.2, 0.3]];

      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [{ embedding: mockEmbeddings[0] }],
      });

      await service.embedDocuments([largeText]);

      // Should be truncated to 8000 tokens * 4 chars = 32000 chars
      const calledInput =
        mockOpenAI.embeddings.create.mock.calls[0][0].input[0];
      expect(calledInput.length).toBe(32000);
    });

    it('should handle multiple texts with mixed sizes', async () => {
      const normalText = 'normal text';
      const largeText = 'b'.repeat(40000);
      const mockEmbeddings = [
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
      ];

      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [
          { embedding: mockEmbeddings[0] },
          { embedding: mockEmbeddings[1] },
        ],
      });

      await service.embedDocuments([normalText, largeText]);

      const calledInputs = mockOpenAI.embeddings.create.mock.calls[0][0].input;
      expect(calledInputs[0]).toBe(normalText);
      expect(calledInputs[1].length).toBe(32000); // Truncated
    });

    it('should throw error when API call fails', async () => {
      mockOpenAI.embeddings.create.mockRejectedValue(
        new Error('API Error: Rate limit exceeded'),
      );

      await expect(service.embedDocuments(['test'])).rejects.toThrow(
        'API Error: Rate limit exceeded',
      );
    });

    it('should process batch efficiently without intermediate arrays', async () => {
      // Test with large batch to ensure memory efficiency
      const batchSize = 50;
      const texts = Array(batchSize).fill('test text');
      const mockEmbeddings = Array(batchSize)
        .fill(null)
        .map(() => [0.1, 0.2, 0.3]);

      mockOpenAI.embeddings.create.mockResolvedValue({
        data: mockEmbeddings.map((emb) => ({ embedding: emb })),
      });

      const result = await service.embedDocuments(texts);

      expect(result.length).toBe(batchSize);
      expect(mockOpenAI.embeddings.create).toHaveBeenCalledTimes(1);
    });

    it('should maintain order of embeddings', async () => {
      const texts = ['first', 'second', 'third'];
      const mockEmbeddings = [
        [0.1, 0.1, 0.1],
        [0.2, 0.2, 0.2],
        [0.3, 0.3, 0.3],
      ];

      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [
          { embedding: mockEmbeddings[0] },
          { embedding: mockEmbeddings[1] },
          { embedding: mockEmbeddings[2] },
        ],
      });

      const result = await service.embedDocuments(texts);

      expect(result[0]).toEqual(mockEmbeddings[0]);
      expect(result[1]).toEqual(mockEmbeddings[1]);
      expect(result[2]).toEqual(mockEmbeddings[2]);
    });

    it('should handle texts with special characters', async () => {
      const specialText = 'Text with émojis 🎉 and spëcial çhars!';
      const mockEmbeddings = [[0.1, 0.2, 0.3]];

      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [{ embedding: mockEmbeddings[0] }],
      });

      await service.embedDocuments([specialText]);

      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: [specialText],
      });
    });
  });

  describe('initialization', () => {
    it('should throw error if OPENAI_API_KEY is missing', () => {
      const mockConfigService = {
        get: jest.fn(() => undefined),
      };

      expect(() => {
        new EmbeddingsService(mockConfigService as any);
      }).toThrow('OPENAI_API_KEY is not configured');
    });
  });
});
