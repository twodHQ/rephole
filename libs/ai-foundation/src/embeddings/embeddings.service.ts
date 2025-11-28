import {Injectable, Logger} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class EmbeddingsService {
    private readonly openai: OpenAI;
    private readonly logger = new Logger(EmbeddingsService.name);

    constructor(private readonly configService: ConfigService) {
        this.openai = this.initializeClient();
    }

    async embedDocuments(texts: string[]): Promise<number[][]> {
        // Validate input
        if (!texts || texts.length === 0) {
            this.logger.warn('embedDocuments called with empty array');
            return [];
        }

        // text-embedding-3-small has max context of 8192 tokens
        // We use 8000 to leave some buffer for encoding overhead
        const MAX_TOKENS_PER_INPUT = 8000;

        // Single-pass processing: sanitize, validate, and truncate
        // This reduces memory allocations from 3 arrays to 1
        const processedTexts: string[] = [];

        for (let i = 0; i < texts.length; i++) {
            const text = texts[i];

            // Skip null/undefined early
            if (!text) continue;

            // Sanitize: replace newlines with spaces and trim in one operation
            // This single regex replaces: text.replace(/\n/g, ' ').trim()
            // Pattern: trim leading/trailing whitespace AND replace internal newlines
            let processed = text.replace(/^\s+|\s+$|\n/g, (match) =>
                match === '\n' ? ' ' : '',
            );

            // Skip empty strings after sanitization
            if (processed.length === 0) continue;

            // Check token limit and truncate if necessary
            const estimatedTokens = this.estimateTokens(processed);
            if (estimatedTokens > MAX_TOKENS_PER_INPUT) {
                this.logger.warn(
                    `Text ${i} exceeds token limit: ${estimatedTokens} tokens (max: ${MAX_TOKENS_PER_INPUT})`,
                );
                processed = this.truncateToTokenLimit(processed, MAX_TOKENS_PER_INPUT);
            }

            processedTexts.push(processed);
        }

        if (processedTexts.length === 0) {
            this.logger.warn('All texts were empty after sanitization');
            return [];
        }

        this.logger.debug(`Embedding ${processedTexts.length} texts`);

        try {
            const response = await this.openai.embeddings.create({
                model: 'text-embedding-3-small', // Cheaper and better than ada-002
                input: processedTexts,
            });

            // Pre-allocate result array for better performance
            const embeddings: number[][] = new Array(response.data.length);
            for (let i = 0; i < response.data.length; i++) {
                embeddings[i] = response.data[i].embedding;
            }

            this.logger.debug(`Embedding ${processedTexts.length} texts`);

            return embeddings;
        } catch (error) {
            this.logger.error(
                `Failed to create embeddings: ${error.message}`,
                error.stack,
            );
            throw error;
        }
    }

    /**
     * Rough estimate of token count (OpenAI uses ~4 characters per token)
     */
    private estimateTokens(text: string): number {
        return Math.ceil(text.length / 4);
    }

    /**
     * Truncate text to fit within token limit
     */
    private truncateToTokenLimit(text: string, maxTokens: number): string {
        const estimatedTokens = this.estimateTokens(text);
        if (estimatedTokens <= maxTokens) {
            return text;
        }

        // Calculate how many characters to keep
        const maxChars = maxTokens * 4;
        const truncated = text.substring(0, maxChars);

        this.logger.warn(
            `Truncated text from ${estimatedTokens} tokens (~${text.length} chars) to ${maxTokens} tokens (~${maxChars} chars)`,
        );

        return truncated;
    }

    private initializeClient(): OpenAI {
        const apiKey = this.configService.get<string>('OPENAI_API_KEY');
        const organizationId = this.configService.get<string>(
            'OPENAI_ORGANIZATION_ID',
        );
        const projectId = this.configService.get<string>('OPENAI_PROJECT_ID');

        if (!apiKey) {
            const errorMsg = 'OPENAI_API_KEY is not configured for EmbeddingsService';
            this.logger.error(errorMsg);
            throw new Error(errorMsg);
        }

        // Build config object - only include organization and project if they have valid values
        const config: any = {apiKey};

        if (organizationId && organizationId.trim().length > 0) {
            config.organization = organizationId;
        }

        if (projectId && projectId.trim().length > 0) {
            config.project = projectId;
        }

        this.logger.log('OpenAI embeddings client initialized');
        return new OpenAI(config);
    }
}
