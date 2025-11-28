import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import type { GenerateTextOptions, ILLMProvider } from '../interfaces';
import OpenAI from 'openai';

/**
 * OpenAI LLM Provider
 *
 * Implements the ILLMProvider interface for OpenAI's chat completion API.
 * Requires the following environment variables:
 * - OPENAI_API_KEY: Your OpenAI API key
 * - OPENAI_ORGANIZATION_ID: Your OpenAI organization ID
 * - OPENAI_PROJECT_ID: Your OpenAI project ID
 */
@Injectable()
export class OpenAIProvider implements ILLMProvider {
  private readonly client: OpenAI;
  private readonly logger = new Logger(OpenAIProvider.name);

  constructor(private readonly configService: ConfigService) {
    this.client = this.initializeClient();
  }

  /**
   * Initializes the OpenAI client with authentication from environment variables
   * @throws Error if required environment variables are missing
   */
  private initializeClient(): OpenAI {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    const organizationId = this.configService.get<string>(
      'OPENAI_ORGANIZATION_ID',
    );
    const projectId = this.configService.get<string>('OPENAI_PROJECT_ID');

    // Validate required configuration
    if (!apiKey) {
      const errorMsg =
        'OPENAI_API_KEY is not configured. Please set it in your environment variables.';
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    if (!organizationId) {
      this.logger.warn(
        'OPENAI_ORGANIZATION_ID is not configured. Proceeding without organization context.',
      );
    }

    if (!projectId) {
      this.logger.warn(
        'OPENAI_PROJECT_ID is not configured. Proceeding without project context.',
      );
    }

    try {
      this.logger.log('Initializing OpenAI client...');

      // Build config object - only include organization and project if they have valid values
      const config: any = { apiKey };

      if (organizationId && organizationId.trim().length > 0) {
        config.organization = organizationId;
        this.logger.log(`Using organization: ${organizationId}`);
      }

      if (projectId && projectId.trim().length > 0) {
        config.project = projectId;
        this.logger.log(`Using project: ${projectId}`);
      }

      const client = new OpenAI(config);
      this.logger.log('OpenAI client initialized successfully');
      return client;
    } catch (error) {
      const errorMsg = `Failed to initialize OpenAI client: ${error.message}`;
      this.logger.error(errorMsg, error.stack);
      throw new Error(errorMsg);
    }
  }

  supportsModel(model: string): boolean {
    return /^gpt/i.test(model);
  }

  /**
   * Generates text using OpenAI's chat completion API
   * @param prompt The user prompt/input text
   * @param options Configuration options including model, instructions, temperature, etc.
   * @returns Generated text content
   * @throws Error if required options are missing or API call fails
   */
  async generateText(
    prompt: string,
    options: GenerateTextOptions,
  ): Promise<string> {
    // Validate required parameters
    if (!prompt || prompt.trim().length === 0) {
      const errorMsg = 'Prompt cannot be empty';
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    if (!options?.model) {
      const errorMsg = 'Model is required in GenerateTextOptions';
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      this.logger.debug(
        `Generating text with model ${options.model} for prompt: ${prompt.substring(0, 100)}...`,
      );

      // Build messages array
      const messages: Array<{ role: 'system' | 'user'; content: string }> = [];

      // Add system instruction if provided
      if (options.instructions) {
        messages.push({
          role: 'system',
          content: options.instructions,
        });
      }

      // Add user prompt
      messages.push({
        role: 'user',
        content: prompt,
      });

      // Build request parameters, omitting undefined values
      const requestParams: any = {
        model: options.model,
        messages,
      };

      // Add optional parameters if provided
      if (options.temperature !== undefined) {
        requestParams.temperature = options.temperature;
      }

      if (options.maxTokens !== undefined) {
        requestParams.max_tokens = options.maxTokens;
      }

      // Handle JSON mode if requested
      if (options.jsonMode === true) {
        requestParams.response_format = { type: 'json_object' };
      }

      this.logger.debug(
        `Request params: ${JSON.stringify({ ...requestParams, messages: `${messages.length} messages` })}`,
      );

      // Call OpenAI API
      const response = await this.client.chat.completions.create(requestParams);

      // Extract generated content
      const generated = response.choices?.[0]?.message?.content;

      if (!generated) {
        const errorMsg = 'OpenAI API returned empty response or no choices';
        this.logger.error(errorMsg, { response });
        throw new Error(errorMsg);
      }

      this.logger.debug(
        `Generated text (${generated.length} chars): ${generated.substring(0, 100)}...`,
      );

      return generated;
    } catch (error) {
      this.logger.error(
        `Failed to generate text with OpenAI: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  generateStream(prompt: string): Observable<string> {
    // const stream = await this.client.responses.create({
    //   model: 'gpt-4o',
    //   input: prompt,
    //   stream: true,
    // });
    throw new NotImplementedException(
      `[OpenAI Provider] - GenerateStream - Not implemented`,
    );
  }
}
