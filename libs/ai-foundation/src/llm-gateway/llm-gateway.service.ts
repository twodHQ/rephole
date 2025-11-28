import { Inject, Injectable, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { GenerateTextOptions, ILLMProvider } from './interfaces';
import { LLM_PROVIDERS } from './tokens';

@Injectable()
export class LLMGatewayService {
  private logger = new Logger(LLMGatewayService.name);

  constructor(
    @Inject(LLM_PROVIDERS) private readonly providers: ILLMProvider[],
  ) {}

  async callModel(
    prompt: string,
    options: GenerateTextOptions,
  ): Promise<string> {
    this.logger.debug(`Calling model ${options.model} with prompt: ${prompt}`);
    const provider = this.resolveProvider(options.model);
    this.logger.debug(`Using provider ${provider.constructor.name}`);
    return provider.generateText(prompt, options);
  }

  streamModel(modelKey: string, prompt: string): Observable<string> {
    this.logger.debug(`Streaming model ${modelKey} with prompt: ${prompt}`);
    const provider = this.resolveProvider(modelKey);
    this.logger.debug(`Using provider ${provider.constructor.name}`);
    return provider.generateStream(prompt);
  }

  private resolveProvider(modelKey: string): ILLMProvider {
    this.logger.debug(`Resolving provider for model ${modelKey}`);
    const provider = this.providers.find((p) => p.supportsModel(modelKey));
    if (!provider) throw new Error(`Model ${modelKey} not supported`);
    this.logger.debug(`Using provider ${provider.constructor.name}`);
    return provider;
  }
}
